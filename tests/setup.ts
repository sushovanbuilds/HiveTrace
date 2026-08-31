import "dotenv/config";

// Deterministic, test-only secrets. Set here rather than relying on a developer
// .env so the suite behaves the same in CI, and distinct from each other so a
// test can catch code that reaches for the wrong one.
process.env.AUTH_SECRET ||= "test-auth-secret-do-not-use-in-production";
process.env.QR_SECRET ||= "test-qr-secret-do-not-use-in-production";
