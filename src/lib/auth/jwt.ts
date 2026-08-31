import { createHmac, timingSafeEqual } from "node:crypto";
import { authSecret, sessionTtlSeconds } from "@/lib/env";
import type { UserRole } from "@/lib/auth/roles";

// Minimal HS256 JWT on node:crypto. Only the algorithm this app issues is
// accepted — `alg` from the token header is never used to select the verifier,
// which is the classic JWT confusion bug (alg:none / RS256→HS256).

export interface SessionClaims {
  /** user id */
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  /** organisation id — tenant isolation key */
  org: string;
  /** issued at (seconds) */
  iat: number;
  /** expires at (seconds) */
  exp: number;
}

const HEADER = { alg: "HS256", typ: "JWT" } as const;

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", authSecret()).update(data).digest("base64url");
}

export function createSessionToken(
  claims: Omit<SessionClaims, "iat" | "exp">,
  ttlSeconds: number = sessionTtlSeconds(),
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionClaims = {
    ...claims,
    iat: now,
    exp: now + ttlSeconds,
  };
  const body = `${b64url(JSON.stringify(HEADER))}.${b64url(JSON.stringify(payload))}`;
  return `${body}.${sign(body)}`;
}

/** Returns the claims, or null for any malformed, mis-signed or expired token. */
export function verifySessionToken(token: string | undefined | null): SessionClaims | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, signaturePart] = parts;

  const expected = Buffer.from(sign(`${headerPart}.${payloadPart}`), "base64url");
  let provided: Buffer;
  try {
    provided = Buffer.from(signaturePart, "base64url");
  } catch {
    return null;
  }
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  let header: unknown;
  let payload: unknown;
  try {
    header = JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8"));
    payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  // Signature already proves we issued it; this rejects tokens minted by an
  // older/other version of this code with a different algorithm.
  if (
    typeof header !== "object" ||
    header === null ||
    (header as Record<string, unknown>).alg !== "HS256"
  ) {
    return null;
  }

  if (!isSessionClaims(payload)) return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;

  return payload;
}

function isSessionClaims(value: unknown): value is SessionClaims {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.sub === "string" &&
    c.sub.length > 0 &&
    typeof c.email === "string" &&
    typeof c.name === "string" &&
    typeof c.role === "string" &&
    typeof c.org === "string" &&
    typeof c.iat === "number" &&
    typeof c.exp === "number"
  );
}
