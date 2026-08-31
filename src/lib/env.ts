// Environment validation (plan P0.06).
//
// Secrets are read lazily through these helpers rather than inlined at module
// scope so that importing a module does not crash the process at build time —
// Next.js evaluates route modules during `next build`, where runtime secrets
// may legitimately be absent.

function required(name: string, hint: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `${name} is not set. Copy .env.example to .env and configure it. ${hint}`,
    );
  }
  return value;
}

/** HMAC key for session JWTs. */
export function authSecret(): string {
  return required(
    "AUTH_SECRET",
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64url\'))"',
  );
}

/** HMAC key for consumer QR tokens. Must differ from AUTH_SECRET. */
export function qrSecret(): string {
  const secret = required(
    "QR_SECRET",
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64url\'))"',
  );
  if (secret === process.env.AUTH_SECRET) {
    throw new Error(
      "QR_SECRET must differ from AUTH_SECRET so a leaked QR key cannot forge sessions.",
    );
  }
  return secret;
}

/** Session lifetime in seconds. Defaults to 7 days. */
export function sessionTtlSeconds(): number {
  const raw = process.env.AUTH_SESSION_TTL;
  if (!raw) return 604_800;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("AUTH_SESSION_TTL must be a positive integer (seconds).");
  }
  return parsed;
}

/**
 * Absolute origin embedded in QR codes. Falls back to localhost in
 * development; a QR printed with the wrong origin is unscannable in the field,
 * so this is worth setting explicitly before generating labels.
 */
export function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * Chain label recorded on anchors. The MVP computes a genuine event-bundle
 * hash but does not write to any ledger, so the honest default is SIMULATED
 * (plan §23: never present a simulated integration as real).
 */
export function blockchainChain(): string {
  return process.env.BLOCKCHAIN_CHAIN ?? "SIMULATED";
}

/** True when a real ledger is configured. Always false for the MVP default. */
export function isSimulatedChain(): boolean {
  return blockchainChain() === "SIMULATED";
}

/** Whether the AI layer is configured. The platform must work without it. */
export function aiEnabled(): boolean {
  const provider = (process.env.LLM_PROVIDER ?? "openai").toLowerCase();
  return provider === "gemini" || provider === "google"
    ? Boolean(process.env.GOOGLE_API_KEY)
    : Boolean(process.env.OPENAI_API_KEY);
}
