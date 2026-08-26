import { describe, expect, it, vi } from "vitest";

const REENTRANCY_TX = {
  txHash: "0xabc123",
  from: "0xattacker",
  to: "0xhoneypot",
  value: "0",
  input: "0xd0e30db0",
  methodId: "0xd0e30db0",
  blockNumber: 42,
  logs: [
    { address: "0xhoneypot", topics: ["0xattack"], data: "0x00" },
  ],
  status: 1,
};

describe("analysis agent", () => {
  it("returns structured threat intelligence from a mocked tx + model", async () => {
    const { analyzeTransaction } = await import("@/agents/analysisAgent");

    const fetchTx = vi.fn(async () => REENTRANCY_TX);
    const model = {
      invoke: vi.fn(async () => ({
        content: JSON.stringify({
          summary: "Reentrant call loop detected against the honeypot fallback.",
          severity: "HIGH",
          vector: "Reentrancy",
        }),
      })),
    };

    const report = await analyzeTransaction({
      txHash: REENTRANCY_TX.txHash,
      fetchTx,
      model,
    });

    expect(fetchTx).toHaveBeenCalledOnce();
    expect(model.invoke).toHaveBeenCalledOnce();
    expect(report).toEqual({
      summary: "Reentrant call loop detected against the honeypot fallback.",
      severity: "HIGH",
      vector: "Reentrancy",
    });
  });

  it("strips markdown code fences from model output", async () => {
    const { analyzeTransaction } = await import("@/agents/analysisAgent");

    const model = {
      invoke: vi.fn(async () => ({
        content:
          "```json\n{ \"summary\": \"benign\", \"severity\": \"LOW\", \"vector\": \"Benign\" }\n```",
      })),
    };

    const report = await analyzeTransaction({
      txHash: "0x1",
      fetchTx: async () => REENTRANCY_TX,
      model,
    });

    expect(report.vector).toBe("Benign");
    expect(report.severity).toBe("LOW");
  });

  it("rejects output that fails schema validation", async () => {
    const { analyzeTransaction } = await import("@/agents/analysisAgent");

    const model = {
      invoke: vi.fn(async () => ({
        content: JSON.stringify({ summary: "no severity field" }),
      })),
    };

    await expect(
      analyzeTransaction({ txHash: "0x1", fetchTx: async () => REENTRANCY_TX, model }),
    ).rejects.toThrow(/validation/i);
  });
});
