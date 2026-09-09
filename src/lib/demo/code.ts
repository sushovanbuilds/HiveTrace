const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Creates a readable, collision-resistant code for browser-only demo batches.
 * The DEMO segment keeps these local labels distinct from production codes,
 * which are allocated and protected by the database's unique constraint.
 */
export function generateDemoBatchCode(now: Date = new Date()): string {
  const values = new Uint8Array(6);
  crypto.getRandomValues(values);
  const suffix = Array.from(values, (value) => CODE_ALPHABET[value % CODE_ALPHABET.length]).join("");
  return `HC-DEMO-${now.getUTCFullYear()}-${suffix}`;
}

/** Generate a code that is not already present in the shared demo dataset. */
export function generateUniqueDemoBatchCode(existingCodes: Iterable<string>): string {
  const existing = new Set(existingCodes);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateDemoBatchCode();
    if (!existing.has(code)) return code;
  }
  throw new Error("Unable to generate a unique demo batch code. Please try again.");
}
