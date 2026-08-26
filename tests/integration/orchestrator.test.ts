import { expect, it } from "vitest";

const ADDRESS = "0xintegration0000000000000000000000000000001";

it(
  "processTransaction persists a ThreatReport linked to a real honeypot (DB)",
  async (ctx) => {
    if (!process.env.DATABASE_URL) return ctx.skip();

    const { db } = await import("@/lib/db");
    const { processTransaction } = await import("@/services/orchestrator");

    let reachable = true;
    try {
      await db.config.count();
    } catch {
      reachable = false;
    }
    if (!reachable) return ctx.skip();

    const honeypot = await db.honeypot.create({
      data: { address: ADDRESS, network: "local", type: "Reentrancy", status: "ACTIVE" },
    });

    try {
      const result = await processTransaction({
        txHash: "0xintegrationtx",
        fetchTx: async () => ({
          txHash: "0xintegrationtx",
          from: "0xattacker",
          to: ADDRESS,
          value: "0",
          input: "0x",
          methodId: "0x",
          blockNumber: 1,
          logs: [],
          status: 1,
        }),
        model: {
          invoke: async () => ({
            content: JSON.stringify({
              summary: "Integration reentrancy probe",
              severity: "HIGH",
              vector: "Reentrancy",
            }),
          }),
        },
      });

      expect(result.honeypotId).toBe(honeypot.id);

      const stored = await db.threatReport.findFirst({
        where: { event: { honeypotId: honeypot.id } },
        include: { event: true },
      });
      expect(stored).not.toBeNull();
      expect(stored!.severity).toBe("HIGH");

      const updated = await db.honeypot.findUnique({ where: { id: honeypot.id } });
      expect(updated!.status).toBe("COMPROMISED");
    } finally {
      await db.threatReport.deleteMany({ where: { event: { honeypotId: honeypot.id } } });
      await db.event.deleteMany({ where: { honeypotId: honeypot.id } });
      await db.honeypot.deleteMany({ where: { id: honeypot.id } });
      await db.$disconnect();
    }
  },
  15_000,
);
