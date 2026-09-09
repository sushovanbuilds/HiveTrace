import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { appUrl, qrSecret } from "@/lib/env";

import {
  generateBatchNumber,
  generateBatchQrCode,
  downloadBatchQrCode,
  createBatchWithQr,
  type BatchNumberOptions,
  type BatchQrOptions,
  type DownloadBatchQrOptions,
  type GeneratedBatchQr,
} from "@/lib/batch-qr";

export {
  generateBatchNumber,
  generateBatchQrCode,
  downloadBatchQrCode,
  createBatchWithQr,
  type BatchNumberOptions,
  type BatchQrOptions,
  type DownloadBatchQrOptions,
  type GeneratedBatchQr,
};

// ── Public batch codes ─────────────────────────────────────────────────────
//
// Random rather than sequential. A sequential code (`count() + 1`) both races
// against the unique constraint under concurrent writes and lets anyone read
// production volume off a jar label.

export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 — misread on print

export function generatePublicCode(now: Date = new Date()): string {
  return generateBatchNumber({ date: now });
}

// ── Consumer QR tokens ─────────────────────────────────────────────────────

const TOKEN_VERSION = "v1";
/** Truncating the MAC would trade forgery resistance for a smaller QR; 32 bytes is cheap enough. */
const NONCE_BYTES = 16;

export interface QRTokenPayload {
  batchId: string;
  publicCode: string;
  /** Per-token randomness, so two tokens for one batch are distinguishable and independently revocable. */
  nonce: string;
  /** Issue time, epoch seconds. */
  issuedAt: number;
}

function macQrPayload(encoded: string): Buffer {
  return createHmac("sha256", qrSecret()).update(`${TOKEN_VERSION}.${encoded}`).digest();
}

/**
 * Mints a signed token of the form `v1.<payload>.<mac>`.
 *
 * The token is self-verifying (a forged code fails the MAC without a database
 * round-trip) *and* recorded in QRToken, so a printed label can still be
 * revoked. Both checks are required: the signature alone cannot be withdrawn.
 */
export function issueQRToken(batchId: string, publicCode: string, now: Date = new Date()): string {
  const payload: QRTokenPayload = {
    batchId,
    publicCode,
    nonce: randomBytes(NONCE_BYTES).toString("base64url"),
    issuedAt: Math.floor(now.getTime() / 1000),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${TOKEN_VERSION}.${encoded}.${macQrPayload(encoded).toString("base64url")}`;
}

/** Returns the payload, or null for any malformed or mis-signed token. */
export function verifyQRToken(token: string | null | undefined): QRTokenPayload | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [version, encoded, mac] = parts;
  if (version !== TOKEN_VERSION) return null;

  let provided: Buffer;
  try {
    provided = Buffer.from(mac, "base64url");
  } catch {
    return null;
  }
  const expected = macQrPayload(encoded);
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!isQRTokenPayload(payload)) return null;
  return payload;
}

function isQRTokenPayload(value: unknown): value is QRTokenPayload {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.batchId === "string" &&
    p.batchId.length > 0 &&
    typeof p.publicCode === "string" &&
    p.publicCode.length > 0 &&
    typeof p.nonce === "string" &&
    typeof p.issuedAt === "number"
  );
}

/** Absolute URL encoded into the printed QR. */
export function qrVerificationUrl(publicCode: string, token: string): string {
  const url = new URL(`/verify/${encodeURIComponent(publicCode)}`, `${appUrl()}/`);
  url.searchParams.set("t", token);
  return url.toString();
}

/** Salted hash of a scanner IP. Raw addresses are never persisted (plan §14). */
export function hashScannerIp(ip: string): string {
  return createHmac("sha256", qrSecret()).update(`scan-ip:${ip}`).digest("hex").slice(0, 32);
}

// ── Event-bundle integrity ─────────────────────────────────────────────────

/**
 * Recursively key-sorted JSON. Event `data` is a JSONB column, so the key order
 * returned by the driver is not something we control; without canonicalisation
 * the same logical event could hash two different ways and a valid batch would
 * read as tampered.
 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(",")}}`;
}

export interface HashableEvent {
  type: string;
  data: unknown;
  timestamp: Date;
}

/** Leaf hash for one event. Domain-separated from internal nodes. */
export function hashEvent(event: HashableEvent): string {
  return createHash("sha256")
    .update("hivetrace:leaf:")
    .update(canonicalize({
      type: event.type,
      data: event.data,
      timestamp: event.timestamp.toISOString(),
    }))
    .digest("hex");
}

/**
 * Merkle root over ordered leaf hashes. Interior nodes carry a distinct prefix
 * from leaves so a leaf digest can never be replayed as an internal node
 * (second-preimage attack on unprefixed Merkle trees).
 */
export function merkleRoot(leaves: string[]): string {
  if (leaves.length === 0) {
    return createHash("sha256").update("hivetrace:empty").digest("hex");
  }

  let level = leaves;
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      // Odd node out is promoted rather than duplicated; duplicating the last
      // leaf makes two different trees share a root (CVE-2012-2459 class bug).
      const left = level[i];
      const right = level[i + 1];
      next.push(
        right === undefined
          ? left
          : createHash("sha256").update("hivetrace:node:").update(left).update(right).digest("hex"),
      );
    }
    level = next;
  }
  return level[0];
}

/** Merkle root of a batch's event history, ordered by timestamp then type. */
export function hashBatchEvents(events: HashableEvent[]): string {
  const sorted = [...events].sort((a, b) => {
    const delta = a.timestamp.getTime() - b.timestamp.getTime();
    // Timestamps can collide (same-second writes); the type tiebreak keeps the
    // ordering total so the root is reproducible.
    return delta !== 0 ? delta : a.type < b.type ? -1 : a.type > b.type ? 1 : 0;
  });
  return merkleRoot(sorted.map(hashEvent));
}
