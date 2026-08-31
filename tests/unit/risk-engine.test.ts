import { describe, expect, it } from "vitest";
import { RISK_BANDS, WEIGHTS, riskStateFor } from "@/lib/services/risk-engine";
import { STAGE_ORDER } from "@/lib/types";

describe("risk engine scoring model", () => {
  it("uses the plan §8 component weights", () => {
    expect(WEIGHTS).toEqual({
      labRisk: 0.4,
      traceabilityRisk: 0.2,
      supplierHistoryRisk: 0.15,
      geoTemporalRisk: 0.15,
      processSensorRisk: 0.1,
    });
  });

  it("keeps the weights summing to exactly 1", () => {
    const total = Object.values(WEIGHTS).reduce((sum, weight) => sum + weight, 0);
    // Guards against a future weight tweak that silently rescales every score.
    expect(total).toBeCloseTo(1, 10);
  });

  it("maps scores onto the plan §8 bands", () => {
    expect(riskStateFor(0)).toBe("LOW");
    expect(riskStateFor(29)).toBe("LOW");
    expect(riskStateFor(30)).toBe("MEDIUM");
    expect(riskStateFor(59)).toBe("MEDIUM");
    expect(riskStateFor(60)).toBe("HIGH");
    expect(riskStateFor(100)).toBe("HIGH");
  });

  it("has no gap or overlap at the band boundaries", () => {
    expect(riskStateFor(RISK_BANDS.medium - 1)).toBe("LOW");
    expect(riskStateFor(RISK_BANDS.medium)).toBe("MEDIUM");
    expect(riskStateFor(RISK_BANDS.high - 1)).toBe("MEDIUM");
    expect(riskStateFor(RISK_BANDS.high)).toBe("HIGH");
  });

  it("exposes calculateRiskScore and persistRiskScore", async () => {
    const engine = await import("@/lib/services/risk-engine");
    expect(typeof engine.calculateRiskScore).toBe("function");
    expect(typeof engine.persistRiskScore).toBe("function");
  });
});

describe("batch stages", () => {
  it("orders stages from hive to retail", () => {
    expect(STAGE_ORDER).toEqual([
      "HARVEST",
      "COLLECTION",
      "LAB",
      "PROCESSING",
      "PACKAGING",
      "DISTRIBUTION",
      "RETAIL",
    ]);
  });
});
