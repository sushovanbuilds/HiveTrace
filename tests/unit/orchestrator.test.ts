import { describe, expect, it, vi } from "vitest";

describe("listener: tx matching", () => {
  it("returns hashes whose `to` is a monitored address (case-insensitive)", async () => {
    const { txsTargetingAddresses } = await import("@/services/listener");
    const block = {
      transactions: [
        { to: "0xAAA", hash: "0x1" },
        { to: "0xbbb", hash: "0x2" },
        { to: null, hash: "0x3" },
        "0xrawstring",
      ],
    };
    const hits = txsTargetingAddresses(
      block,
      new Set(["0xaaa", "0xbbb"]),
    );
    expect(hits.sort()).toEqual(["0x1", "0x2"]);
  });

  it("returns empty for a null block", async () => {
    const { txsTargetingAddresses } = await import("@/services/listener");
    expect(txsTargetingAddresses(null, new Set(["0xaaa"]))).toEqual([]);
  });
});

const ADDRESS = "0xhoneypot0000000000000000000000000000000001";

function fakePersistence() {
  const events: { id: string; honeypotId: string }[] = [];
  const reports: { id: string; eventId: string; severity: string }[] = [];
  const updates: { id: string; status: string }[] = [];
  const honeypots = [{ id: "hp-1", address: ADDRESS, status: "ACTIVE" }];

  const persistence: {
    honeypot: {
      findUnique: (args: {
        where: { address: string };
      }) => Promise<{ id: string; address: string; status: string } | null>;
      update: (args: {
        where: { id: string };
        data: { status: string };
      }) => Promise<unknown>;
    };
    event: {
      create: (args: {
        data: { txHash: string; honeypotId: string; rawData: unknown };
      }) => Promise<{ id: string }>;
    };
    threatReport: {
      create: (args: {
        data: {
          eventId: string;
          summary: string;
          severity: string;
          vector: string;
        };
      }) => Promise<{ id: string }>;
    };
  } = {
    honeypot: {
      findUnique: vi.fn(async ({ where }) => {
        const h = honeypots.find(
          (x) => x.address === where.address.toLowerCase(),
        );
        return h ? { ...h } : null;
      }),
      update: vi.fn(async ({ where, data }) => {
        updates.push({ id: where.id, status: data.status });
        return {};
      }),
    },
    event: {
      create: vi.fn(async ({ data }) => {
        const row = {
          id: `ev-${events.length + 1}`,
          honeypotId: data.honeypotId,
        };
        events.push(row);
        return row;
      }),
    },
    threatReport: {
      create: vi.fn(async ({ data }) => {
        const row = {
          id: `rep-${reports.length + 1}`,
          eventId: data.eventId,
          severity: data.severity,
        };
        reports.push(row);
        return row;
      }),
    },
  };

  return { events, reports, updates, persistence };
}

describe("orchestrator: processTransaction", () => {
  it("persists an Event + ThreatReport and links to the honeypot", async () => {
    const { processTransaction } = await import("@/services/orchestrator");
    const fake = fakePersistence();

    const result = await processTransaction({
      txHash: "0xtx1",
      fetchTx: async () => ({
        txHash: "0xtx1",
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
        invoke: vi.fn(async () => ({
          content: JSON.stringify({
            summary: "Reentrancy attempt",
            severity: "MEDIUM",
            vector: "Reentrancy",
          }),
        })),
      },
      db: fake.persistence,
    });

    expect(result.report.vector).toBe("Reentrancy");
    expect(fake.events).toHaveLength(1);
    expect(fake.events[0].honeypotId).toBe("hp-1");
    expect(fake.reports).toHaveLength(1);
    expect(fake.reports[0].eventId).toBe(fake.events[0].id);
    // MEDIUM is not severe -> no status change
    expect(fake.updates).toHaveLength(0);
  });

  it("marks the honeypot COMPROMISED for HIGH/CRITICAL severity", async () => {
    const { processTransaction } = await import("@/services/orchestrator");
    const fake = fakePersistence();

    await processTransaction({
      txHash: "0xtx2",
      fetchTx: async () => ({
        txHash: "0xtx2",
        from: "0xattacker",
        to: ADDRESS,
        value: "0",
        input: "0x",
        methodId: "0x",
        blockNumber: 2,
        logs: [],
        status: 1,
      }),
      model: {
        invoke: vi.fn(async () => ({
          content: JSON.stringify({
            summary: "Critical drain attempt",
            severity: "CRITICAL",
            vector: "Reentrancy",
          }),
        })),
      },
      db: fake.persistence,
    });

    expect(fake.updates).toEqual([{ id: "hp-1", status: "COMPROMISED" }]);
  });

  it("throws when the tx does not target a known honeypot", async () => {
    const { processTransaction } = await import("@/services/orchestrator");
    const fake = fakePersistence();

    await expect(
      processTransaction({
        txHash: "0xtx3",
        fetchTx: async () => ({
          txHash: "0xtx3",
          from: "0xattacker",
          to: "0xunknown",
          value: "0",
          input: "0x",
          methodId: "0x",
          blockNumber: 3,
          logs: [],
          status: 1,
        }),
        model: {
          invoke: vi.fn(async () => ({
            content: JSON.stringify({
              summary: "x",
              severity: "LOW",
              vector: "Benign",
            }),
          })),
        },
        db: fake.persistence,
      }),
    ).rejects.toThrow(/not a known honeypot/);
  });
});
