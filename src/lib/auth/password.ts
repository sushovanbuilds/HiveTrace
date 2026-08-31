import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

// scrypt is used rather than bcrypt/argon2 because it ships with Node — no
// native build step, and one less dependency to keep patched.
//
// N=2^15, r=8, p=1 is the interactive-login parameter set from the scrypt
// paper; it costs ~32 MiB and ~100 ms per hash. maxmem must be raised above
// Node's 32 MiB default or the call throws for these parameters.
const PARAMS = { N: 32_768, r: 8, p: 1 } as const;
const MAXMEM = 64 * 1024 * 1024;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

/** Produces `scrypt$N$r$p$salt$hash`, all binary fields base64url. */
export async function hashPassword(password: string): Promise<string> {
  assertPasswordShape(password);
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, {
    ...PARAMS,
    maxmem: MAXMEM,
  });
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

/**
 * Constant-time credential check. Returns false for malformed or absent
 * digests rather than throwing, so callers cannot distinguish "no such user"
 * from "wrong password" by observing an exception.
 */
export async function verifyPassword(
  password: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false;

  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const N = Number.parseInt(parts[1], 10);
  const r = Number.parseInt(parts[2], 10);
  const p = Number.parseInt(parts[3], 10);
  if (![N, r, p].every((n) => Number.isInteger(n) && n > 0)) return false;
  // Refuse absurd parameters from a tampered row — otherwise a crafted digest
  // could turn one login attempt into a memory-exhaustion vector.
  if (N > 1 << 20 || r > 32 || p > 16) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4], "base64url");
    expected = Buffer.from(parts[5], "base64url");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  let derived: Buffer;
  try {
    derived = await scrypt(password.normalize("NFKC"), salt, expected.length, {
      N,
      r,
      p,
      maxmem: MAXMEM,
    });
  } catch {
    return false;
  }

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export const MIN_PASSWORD_LENGTH = 10;

function assertPasswordShape(password: string): void {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }
  // scrypt itself has no length ceiling, but an unbounded input is free CPU for
  // an attacker.
  if (password.length > 512) {
    throw new Error("Password must be at most 512 characters.");
  }
}
