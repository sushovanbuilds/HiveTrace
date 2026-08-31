import { db } from "@/lib/db";
import { aiEnabled, blockchainChain } from "@/lib/env";

// Real healthcheck (plan P0.06): probes every dependency the app needs, so a
// reachable /api/health means the API can actually serve requests. The previous
// version returned {status:"ok"} unconditionally and reported healthy while
// every database-backed route was failing.
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string; latencyMs?: number }> = {};

  const started = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = { ok: true, latencyMs: Date.now() - started };
  } catch (err) {
    checks.database = {
      ok: false,
      latencyMs: Date.now() - started,
      detail:
        err instanceof Error
          ? // Surface the failure class, never the connection string.
            err.message.split("\n")[0].slice(0, 200)
          : "unknown error",
    };
  }

  for (const name of ["AUTH_SECRET", "QR_SECRET"] as const) {
    checks[name.toLowerCase()] = { ok: Boolean(process.env[name]) };
  }

  const healthy = Object.values(checks).every((c) => c.ok);

  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "hivetrace",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      checks,
      // Advertised so operators and the UI can tell simulated subsystems apart
      // from real ones without reading the source.
      subsystems: {
        blockchain: blockchainChain(),
        ai: aiEnabled() ? "configured" : "disabled",
      },
    },
    { status: healthy ? 200 : 503 },
  );
}
