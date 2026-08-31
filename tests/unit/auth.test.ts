import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, verifySessionToken } from "@/lib/auth/jwt";
import { CAPABILITIES, isProtectedPath, isUserRole, roleHasCapability } from "@/lib/auth/roles";
import { USER_ROLES } from "@/lib/types";

describe("password hashing", () => {
  it("round-trips a correct password", async () => {
    const digest = await hashPassword("correct-horse-battery");
    expect(await verifyPassword("correct-horse-battery", digest)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const digest = await hashPassword("correct-horse-battery");
    expect(await verifyPassword("correct-horse-batteru", digest)).toBe(false);
  });

  it("salts, so the same password hashes differently each time", async () => {
    const a = await hashPassword("correct-horse-battery");
    const b = await hashPassword("correct-horse-battery");
    expect(a).not.toBe(b);
    // Both must still validate — a per-hash salt that broke verification would
    // pass the inequality check above.
    expect(await verifyPassword("correct-horse-battery", a)).toBe(true);
    expect(await verifyPassword("correct-horse-battery", b)).toBe(true);
  });

  it("records its parameters in the digest so they can be rotated later", async () => {
    const digest = await hashPassword("correct-horse-battery");
    expect(digest.startsWith("scrypt$32768$8$1$")).toBe(true);
    expect(digest.split("$")).toHaveLength(6);
  });

  it("returns false rather than throwing for absent or malformed digests", async () => {
    expect(await verifyPassword("whatever", null)).toBe(false);
    expect(await verifyPassword("whatever", undefined)).toBe(false);
    expect(await verifyPassword("whatever", "")).toBe(false);
    expect(await verifyPassword("whatever", "not-a-digest")).toBe(false);
    expect(await verifyPassword("whatever", "bcrypt$1$2$3$4$5")).toBe(false);
    expect(await verifyPassword("whatever", "scrypt$0$8$1$c2FsdA$aGFzaA")).toBe(false);
  });

  it("refuses absurd scrypt parameters from a tampered row", async () => {
    // A crafted digest must not turn one login into a memory-exhaustion vector.
    const hostile = `scrypt$${1 << 21}$8$1$c2FsdA$aGFzaA`;
    expect(await verifyPassword("whatever", hostile)).toBe(false);
  });

  it("enforces a minimum length at hash time", async () => {
    await expect(hashPassword("a".repeat(MIN_PASSWORD_LENGTH - 1))).rejects.toThrow(
      /at least/i,
    );
    await expect(hashPassword("a".repeat(513))).rejects.toThrow(/at most/i);
  });

  it("normalises unicode so a canonically equivalent password still matches", async () => {
    // Same text, two encodings: precomposed "\u00f6"/"\u00e9" vs. a base letter
    // followed by a combining accent. Different keyboards and IMEs emit
    // different forms, so comparing raw bytes would lock a user out of their
    // own account. Written as escapes because the two literals are visually
    // identical in an editor.
    const precomposed = "passw\u00f6rd-caf\u00e9";
    const decomposed = "passwo\u0308rd-cafe\u0301";
    expect(decomposed).not.toBe(precomposed);
    expect(decomposed.normalize("NFKC")).toBe(precomposed);

    const digest = await hashPassword(precomposed);
    expect(await verifyPassword(decomposed, digest)).toBe(true);
  });
});

describe("session tokens", () => {
  const claims = {
    sub: "usr_1",
    email: "ravi@greenvalley.in",
    name: "Ravi Kumar",
    role: "BEEKEEPER" as const,
    org: "org_1",
  };

  it("round-trips claims", () => {
    const verified = verifySessionToken(createSessionToken(claims, 60));
    expect(verified).toMatchObject(claims);
    expect(verified!.exp).toBeGreaterThan(verified!.iat);
  });

  it("rejects a tampered payload", () => {
    const token = createSessionToken(claims, 60);
    const [header, payload, signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...claims, role: "ADMIN", iat: 1, exp: 9_999_999_999 }),
    ).toString("base64url");
    expect(verifySessionToken(`${header}.${forged}.${signature}`)).toBeNull();
    // Sanity: the untampered token does verify, so the null above is the edit.
    expect(verifySessionToken(`${header}.${payload}.${signature}`)).not.toBeNull();
  });

  it("rejects an expired token", () => {
    expect(verifySessionToken(createSessionToken(claims, -1))).toBeNull();
  });

  it("rejects alg:none and algorithm substitution", () => {
    const payload = Buffer.from(
      JSON.stringify({ ...claims, iat: 1, exp: 9_999_999_999 }),
    ).toString("base64url");
    for (const alg of ["none", "HS512", "RS256"]) {
      const header = Buffer.from(JSON.stringify({ alg, typ: "JWT" })).toString("base64url");
      expect(verifySessionToken(`${header}.${payload}.`), alg).toBeNull();
    }
  });

  it("rejects structurally invalid tokens", () => {
    for (const bad of ["", "a", "a.b", "a.b.c.d", "...", "a.b.c"]) {
      expect(verifySessionToken(bad), JSON.stringify(bad)).toBeNull();
    }
    expect(verifySessionToken(null)).toBeNull();
    expect(verifySessionToken(undefined)).toBeNull();
  });

  it("rejects a correctly signed token whose claims are incomplete", () => {
    // Signed with the real secret, so this exercises the claim check rather than
    // falling out early on a bad signature.
    const mint = (payload: unknown) => {
      const body = [{ alg: "HS256", typ: "JWT" }, payload]
        .map((part) => Buffer.from(JSON.stringify(part)).toString("base64url"))
        .join(".");
      const signature = createHmac("sha256", process.env.AUTH_SECRET!)
        .update(body)
        .digest("base64url");
      return `${body}.${signature}`;
    };

    const future = Math.floor(Date.now() / 1000) + 600;
    const complete = { ...claims, iat: future - 600, exp: future };

    // Control: the minting helper really does produce a token this code accepts.
    expect(verifySessionToken(mint(complete))).not.toBeNull();

    for (const missing of ["sub", "email", "name", "role", "org", "iat", "exp"] as const) {
      const partial: Record<string, unknown> = { ...complete };
      delete partial[missing];
      expect(verifySessionToken(mint(partial)), `missing ${missing}`).toBeNull();
    }

    // An empty subject is structurally a string but identifies nobody.
    expect(verifySessionToken(mint({ ...complete, sub: "" }))).toBeNull();
  });
});

describe("role capabilities", () => {
  it("only references roles that exist", () => {
    for (const [capability, roles] of Object.entries(CAPABILITIES)) {
      for (const role of roles) {
        expect(isUserRole(role), `${capability} → ${role}`).toBe(true);
      }
    }
  });

  it("never grants a capability to CONSUMER", () => {
    // Consumers are unauthenticated jar-scanners; no write path should reach them.
    for (const capability of Object.keys(CAPABILITIES) as Array<keyof typeof CAPABILITIES>) {
      expect(roleHasCapability("CONSUMER", capability), capability).toBe(false);
    }
  });

  it("restricts lab evidence to labs and admins", () => {
    expect(roleHasCapability("LAB", "quality:write")).toBe(true);
    expect(roleHasCapability("ADMIN", "quality:write")).toBe(true);
    expect(roleHasCapability("BEEKEEPER", "quality:write")).toBe(false);
    expect(roleHasCapability("PROCESSOR", "quality:write")).toBe(false);
  });

  it("restricts investigation resolution and anchoring", () => {
    expect(roleHasCapability("INVESTIGATOR", "investigation:resolve")).toBe(true);
    expect(roleHasCapability("LAB", "investigation:resolve")).toBe(false);
    expect(roleHasCapability("ADMIN", "anchor:write")).toBe(true);
    expect(roleHasCapability("INVESTIGATOR", "anchor:write")).toBe(false);
  });

  it("recognises every declared role", () => {
    for (const role of USER_ROLES) expect(isUserRole(role)).toBe(true);
    expect(isUserRole("SUPERUSER")).toBe(false);
    expect(isUserRole("")).toBe(false);
    expect(isUserRole(null)).toBe(false);
  });
});

describe("protected paths", () => {
  it("protects workspace routes and their children", () => {
    expect(isProtectedPath("/batches")).toBe(true);
    expect(isProtectedPath("/batches/batch_1")).toBe(true);
    expect(isProtectedPath("/quality")).toBe(true);
    expect(isProtectedPath("/quality/result_1")).toBe(true);
    expect(isProtectedPath("/risk")).toBe(true);
    expect(isProtectedPath("/risk/incident_1")).toBe(true);
  });

  it("does not treat a sibling dash-prefixed path as a child", () => {
    // Only a real child (slash boundary) counts — "/quality-lab" is not "/quality/…".
    expect(isProtectedPath("/quality-lab")).toBe(false);
    expect(isProtectedPath("/risk-incidents")).toBe(false);
  });

  it("leaves the consumer surface public", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/verify")).toBe(false);
    expect(isProtectedPath("/verify/HC-2026-ABCDEF")).toBe(false);
  });

  it("does not match on a shared prefix", () => {
    // "/batches-public" must not be protected just because "/batches" is.
    expect(isProtectedPath("/batches-public")).toBe(false);
    expect(isProtectedPath("/hivestuff")).toBe(false);
  });
});
