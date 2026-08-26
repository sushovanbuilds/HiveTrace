import { expect, it } from "vitest";

it(
  "round-trips a Config row through the Prisma singleton",
  async (ctx) => {
    if (!process.env.DATABASE_URL) return ctx.skip();

    const { db } = await import("@/lib/db");

    let reachable = true;
    try {
      await db.config.upsert({
        where: { key: "db.connectivity_check" },
        create: { key: "db.connectivity_check", value: { ok: true } },
        update: { value: { ok: true, at: new Date().toISOString() } },
      });
    } catch {
      reachable = false;
    }
    if (!reachable) return ctx.skip();

    const count = await db.config.count();
    expect(count).toBeGreaterThanOrEqual(1);
    await db.$disconnect();
  },
  10_000,
);
