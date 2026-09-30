import { describe, expect, it } from "vitest";
import {
  RISK_BANDS,
  RISK_MEANING,
  NO_ML_NOTICE,
  riskBandFor,
  scoreSignals,
  scoreCluster,
  volumeBonus,
} from "@/lib/incidents/risk";
import { ANOMALY_SIGNALS } from "@/lib/incidents/signals";

describe("risk bands", () => {
  it("uses the same 30/60 bands as the batch risk engine", () => {
    expect(RISK_BANDS).toEqual({ medium: 30, high: 60 });
  });

  it("maps points onto LOW / MEDIUM / HIGH with no gaps", () => {
    expect(riskBandFor(0)).toBe("LOW");
    expect(riskBandFor(29)).toBe("LOW");
    expect(riskBandFor(30)).toBe("MEDIUM");
    expect(riskBandFor(59)).toBe("MEDIUM");
    expect(riskBandFor(60)).toBe("HIGH");
    expect(riskBandFor(100)).toBe("HIGH");
  });
});

describe("honest framing", () => {
  it("states that risk orders investigation and never declares fraud", () => {
    expect(RISK_MEANING).toMatch(/investigation/i);
    expect(RISK_MEANING).toMatch(/does not declare fraud/i);
  });

  it("discloses that no machine learning is used", () => {
    expect(NO_ML_NOTICE).toMatch(/no machine learning/i);
  });
});

describe("scoreSignals", () => {
  it("scores a lone signal at its base points with its evidence attached", () => {
    const evidence = [{ label: "Distance", value: "~11 km" }];
    const score = scoreSignals([{ signalId: "GPS_MISMATCH", evidence }]);
    expect(score.points).toBe(ANOMALY_SIGNALS.GPS_MISMATCH.basePoints);
    expect(score.band).toBe("MEDIUM");
    expect(score.contributions).toHaveLength(1);
    expect(score.contributions[0]).toMatchObject({
      kind: "signal",
      signalId: "GPS_MISMATCH",
      points: ANOMALY_SIGNALS.GPS_MISMATCH.basePoints,
      evidence,
    });
  });

  it("puts the strongest signal first and adds a fixed bump per extra signal", () => {
    const score = scoreSignals([
      { signalId: "MISSING_EVIDENCE" },
      { signalId: "DUPLICATE_QR_SCAN" },
    ]);
    expect(score.contributions[0].signalId).toBe("DUPLICATE_QR_SCAN");
    expect(score.contributions[0].points).toBe(75);
    expect(score.contributions[1].points).toBe(10);
    expect(score.points).toBe(85);
    expect(score.band).toBe("HIGH");
  });

  it("dedupes repeated signals and caps the total at 100", () => {
    const score = scoreSignals([
      { signalId: "DUPLICATE_QR_SCAN" },
      { signalId: "DUPLICATE_QR_SCAN" },
      { signalId: "IMPOSSIBLE_TIMELINE" },
      { signalId: "FAILED_QUALITY_RESULT" },
      { signalId: "ABNORMAL_YIELD" },
    ]);
    expect(score.contributions).toHaveLength(4);
    expect(score.points).toBeLessThanOrEqual(100);
    expect(score.points).toBe(100); // 75 + 10 + 10 + 10, capped
  });

  it("is order-independent: same signals in any order score identically", () => {
    const a = scoreSignals([{ signalId: "CUSTODY_GAP" }, { signalId: "GPS_MISMATCH" }]);
    const b = scoreSignals([{ signalId: "GPS_MISMATCH" }, { signalId: "CUSTODY_GAP" }]);
    expect(a).toEqual(b);
  });
});

describe("volumeBonus", () => {
  it("uses fixed steps and can never promote a lone LOW signal to HIGH", () => {
    expect(volumeBonus(1)).toBe(0);
    expect(volumeBonus(9)).toBe(0);
    expect(volumeBonus(10)).toBe(5);
    expect(volumeBonus(100)).toBe(10);
    expect(volumeBonus(1000)).toBe(15);
    expect(volumeBonus(18_400)).toBe(15);
  });
});

describe("scoreCluster", () => {
  it("adds the volume bump as its own contribution, capped at 100", () => {
    const score = scoreCluster([{ signalId: "DUPLICATE_QR_SCAN" }], 18_400);
    expect(score.points).toBe(90); // 75 + 15
    expect(score.band).toBe("HIGH");
    expect(score.contributions).toHaveLength(2);
    expect(score.contributions[1]).toMatchObject({ kind: "volume", points: 15 });
  });

  it("adds no volume contribution for small clusters", () => {
    const score = scoreCluster([{ signalId: "GPS_MISMATCH" }], 1);
    expect(score.contributions).toHaveLength(1);
    expect(score.points).toBe(50);
  });

  it("never exceeds 100 even with many signals and huge volume", () => {
    const score = scoreCluster(
      [
        { signalId: "DUPLICATE_QR_SCAN" },
        { signalId: "IMPOSSIBLE_TIMELINE" },
        { signalId: "FAILED_QUALITY_RESULT" },
      ],
      50_000,
    );
    expect(score.points).toBe(100);
  });
});
