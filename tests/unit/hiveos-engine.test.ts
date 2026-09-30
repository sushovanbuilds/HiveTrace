import { describe, expect, it } from "vitest";
import {
  apiaryIntelligence,
  classifyHealth,
  deriveSignals,
  explainWhy,
  recommendActions,
  simulateWhatIf,
  summarizeHive,
  trustFromEvidence,
} from "@/lib/hiveos/engine";
import { getHiveOSData } from "@/lib/hiveos/demo";
import type { HealthSignals } from "@/lib/hiveos/types";

const NOMINAL: HealthSignals = {
  tempC: 35.0,
  humidityPct: 60,
  weightTrendKgPerDay: 0.25,
  activityIndex: 90,
  activityDelta: 0,
  broodPattern: "SOLID",
  varroaIndex: 1,
  daysSinceInspection: 6,
  colonyLost: false,
  hiveType: "LANGSTROTH",
};

describe("classifyHealth — transparent prototype rules", () => {
  it("scores a nominal hive STABLE at 100", () => {
    const a = classifyHealth(NOMINAL);
    expect(a.state).toBe("STABLE");
    expect(a.score).toBe(100);
    expect(a.ruleVersion).toBe("hiveos-proto-v1");
  });

  it("moves to WATCH on a single elevated-temperature watch factor", () => {
    const a = classifyHealth({ ...NOMINAL, tempC: 37.0 });
    expect(a.state).toBe("WATCH");
    expect(a.factors.some((f) => f.key === "temp-elevated" && f.severity === "watch")).toBe(true);
  });

  it("moves to STRESSED when a bad factor appears", () => {
    const a = classifyHealth({ ...NOMINAL, tempC: 37.5, weightTrendKgPerDay: -0.7 });
    expect(a.state).toBe("STRESSED");
    expect(a.factors.some((f) => f.severity === "bad")).toBe(true);
  });

  it("moves to CRITICAL when two or more bad factors appear", () => {
    const a = classifyHealth({ ...NOMINAL, tempC: 38.5, weightTrendKgPerDay: -0.7 });
    expect(a.state).toBe("CRITICAL");
  });

  it("moves to CRITICAL on colony loss regardless of other signals", () => {
    const a = classifyHealth({ ...NOMINAL, colonyLost: true });
    expect(a.state).toBe("CRITICAL");
    expect(a.score).toBeLessThan(40);
  });

  it("stays cautious (WATCH) when there are no usable signals", () => {
    const a = classifyHealth({
      tempC: null, humidityPct: null, weightTrendKgPerDay: null,
      activityIndex: null, activityDelta: null, broodPattern: null,
      varroaIndex: null, daysSinceInspection: null, colonyLost: false, hiveType: null,
    });
    expect(a.state).toBe("WATCH");
    expect(a.factors[0].key).toBe("insufficient-data");
  });

  it("computes score as 100 minus summed contributions", () => {
    // temp dev 2.0 → watch 8; varroa 2 → watch 8; inspection 30d → watch 5
    const a = classifyHealth({ ...NOMINAL, tempC: 37.0, varroaIndex: 2, daysSinceInspection: 30 });
    expect(a.score).toBe(100 - 8 - 8 - 5);
  });

  it("orders factors worst-severity first", () => {
    const a = classifyHealth({ ...NOMINAL, tempC: 38.5, varroaIndex: 2 });
    expect(a.factors[0].severity).toBe("bad");
  });
});

describe("explainWhy", () => {
  it("names the highest-contribution factor as primary", () => {
    const a = classifyHealth({ ...NOMINAL, tempC: 38.5, weightTrendKgPerDay: -0.7 });
    const why = explainWhy("Hive B-220", a, { ...NOMINAL, tempC: 38.5 }, [], "MEDIUM DATA CONFIDENCE");
    const max = Math.max(...a.factors.filter((f) => f.severity !== "info").map((f) => f.contribution));
    expect(why.primaryFactor?.contribution).toBe(max);
    expect(why.confidence).toBe("MEDIUM DATA CONFIDENCE");
  });

  it("never claims proven causality", () => {
    const a = classifyHealth({ ...NOMINAL, tempC: 38.5 });
    const why = explainWhy("Hive B-220", a, { ...NOMINAL, tempC: 38.5 }, [], "LOW DATA CONFIDENCE");
    expect(why.explanation).toMatch(/not a (proven cause|diagnosis)/);
    expect(why.explanation).not.toMatch(/caused by/i);
  });

  it("describes STABLE hives without inventing problems", () => {
    const a = classifyHealth(NOMINAL);
    const why = explainWhy("Hive A-105", a, NOMINAL, [], "HIGH DATA CONFIDENCE");
    expect(why.primaryFactor?.severity).toBe("info");
    expect(why.contributingFactors).toHaveLength(0);
  });
});

describe("recommendActions", () => {
  it("gives every action a non-empty WHY", () => {
    const a = classifyHealth({ ...NOMINAL, tempC: 38.5, weightTrendKgPerDay: -0.7, varroaIndex: 2 });
    for (const action of recommendActions(a)) {
      expect(action.why.length).toBeGreaterThan(0);
      expect(action.why.every((w) => w.trim().length > 0)).toBe(true);
    }
  });

  it("recommends ventilation work for temperature deviation, with the reason attached", () => {
    const a = classifyHealth({ ...NOMINAL, tempC: 38.5 });
    const actions = recommendActions(a);
    const vent = actions.find((x) => x.id === "ventilation");
    expect(vent).toBeDefined();
    expect(vent!.priority).toBe("NOW");
    expect(vent!.why.join(" ")).toMatch(/temperature/i);
  });

  it("orders NOW before SOON before ROUTINE", () => {
    const a = classifyHealth({ ...NOMINAL, tempC: 38.5, daysSinceInspection: 40 });
    const order = recommendActions(a).map((x) => x.priority);
    const rank = { NOW: 0, SOON: 1, ROUTINE: 2 } as const;
    expect([...order].sort((x, y) => rank[x] - rank[y])).toEqual(order);
  });

  it("falls back to routine monitoring for stable hives", () => {
    const actions = recommendActions(classifyHealth(NOMINAL));
    expect(actions).toHaveLength(1);
    expect(actions[0].id).toBe("routine-monitoring");
  });
});

describe("trustFromEvidence", () => {
  it("maps the evidence ladder to qualitative confidence labels", () => {
    const e = (tier: "MANUAL" | "BASIC_SENSOR" | "MULTI_SENSOR" | "SENSOR_VERIFIED") => [{ tier, label: tier, detail: "" }];
    expect(trustFromEvidence(e("MANUAL")).confidence).toBe("LOW DATA CONFIDENCE");
    expect(trustFromEvidence(e("BASIC_SENSOR")).confidence).toBe("MEDIUM DATA CONFIDENCE");
    expect(trustFromEvidence(e("MULTI_SENSOR")).confidence).toBe("MEDIUM DATA CONFIDENCE");
    expect(trustFromEvidence(e("SENSOR_VERIFIED")).confidence).toBe("HIGH DATA CONFIDENCE");
  });

  it("uses the best available tier", () => {
    const { confidence, bestTier } = trustFromEvidence([
      { tier: "MANUAL", label: "m", detail: "" },
      { tier: "MULTI_SENSOR", label: "s", detail: "" },
    ]);
    expect(bestTier).toBe("MULTI_SENSOR");
    expect(confidence).toBe("MEDIUM DATA CONFIDENCE");
  });
});

describe("apiaryIntelligence — anomaly grouping", () => {
  const codeFor = (id: string) => ({ h1: "H05", h2: "H06", h3: "H09" })[id] ?? id;

  it("groups hives in one apiary that share an anomaly signature", () => {
    const mk = (id: string, farm: string, signals: HealthSignals) =>
      summarizeHive(id, id, farm, classifyHealth(signals));
    const intel = apiaryIntelligence(
      [
        mk("h1", "Purulia Apiary", { ...NOMINAL, tempC: 36.5 }),
        mk("h2", "Purulia Apiary", { ...NOMINAL, tempC: 37.2 }),
        mk("h3", "Kashmir Valley", { ...NOMINAL, tempC: 37.2 }),
      ],
      codeFor,
    );
    expect(intel.groups).toHaveLength(1);
    expect(intel.groups[0].hiveNames).toEqual(["H05", "H06"]);
    expect(intel.groups[0].headline).toMatch(/H05 \+ H06/);
    expect(intel.groups[0].headline).toMatch(/possible localized environmental stress/);
  });

  it("does not group hives from different apiaries", () => {
    const mk = (id: string, farm: string) =>
      summarizeHive(id, id, farm, classifyHealth({ ...NOMINAL, tempC: 37.2 }));
    const intel = apiaryIntelligence([mk("h1", "Farm A"), mk("h2", "Farm B")], codeFor);
    expect(intel.groups).toHaveLength(0);
  });

  it("counts states and averages scores", () => {
    const mk = (id: string, signals: HealthSignals) =>
      summarizeHive(id, id, "Farm", classifyHealth(signals));
    const intel = apiaryIntelligence(
      [mk("h1", NOMINAL), mk("h2", { ...NOMINAL, tempC: 37.0 }), mk("h3", { ...NOMINAL, colonyLost: true })],
      codeFor,
    );
    expect(intel.byState).toEqual({ STABLE: 1, WATCH: 1, STRESSED: 0, CRITICAL: 1 });
    expect(intel.total).toBe(3);
    expect(intel.avgScore).toBe(Math.round((100 + 92 + 5) / 3));
  });
});

describe("simulateWhatIf", () => {
  it("is always flagged as simulated", () => {
    const r = simulateWhatIf({ ...NOMINAL, tempC: 38.5 }, { ventilationFixed: true });
    expect(r.simulated).toBe(true);
    expect(r.appliedChanges.length).toBeGreaterThan(0);
  });

  it("improves the classification when ventilation is fixed", () => {
    const before = classifyHealth({ ...NOMINAL, tempC: 38.5 });
    const after = simulateWhatIf({ ...NOMINAL, tempC: 38.5 }, { ventilationFixed: true });
    expect(after.score).toBeGreaterThan(before.score);
  });

  it("does not mutate the base signals", () => {
    const base = { ...NOMINAL, tempC: 38.5 };
    simulateWhatIf(base, { ventilationFixed: true, waterProvided: true });
    expect(base.tempC).toBe(38.5);
  });

  it("combines multiple adjustments", () => {
    const r = simulateWhatIf(
      { ...NOMINAL, varroaIndex: 3, daysSinceInspection: 40 },
      { varroaTreated: true, inspectionDone: true },
    );
    expect(r.appliedChanges).toHaveLength(2);
    expect(r.state).toBe("STABLE");
  });
});

describe("deriveSignals", () => {
  it("derives a negative weight slope and activity delta from the demo series", () => {
    const os = getHiveOSData("hive_b220");
    const s = deriveSignals(os.observations, os.inspections, os.colonyLost, "TOP_BAR");
    expect(s.weightTrendKgPerDay).toBeLessThan(0);
    expect(s.activityDelta).toBeLessThan(-10);
    expect(s.tempC).toBeGreaterThan(37);
    expect(s.hiveType).toBe("TOP_BAR");
  });

  it("computes days since inspection from the latest inspection", () => {
    const os = getHiveOSData("hive_a105");
    const s = deriveSignals(os.observations, os.inspections, os.colonyLost, "LANGSTROTH");
    expect(s.daysSinceInspection).toBeGreaterThanOrEqual(5);
    expect(s.daysSinceInspection).toBeLessThanOrEqual(8);
  });
});

describe("demo scenarios land on their intended states", () => {
  const cases: Array<[string, "STABLE" | "WATCH" | "STRESSED" | "CRITICAL", string]> = [
    ["hive_a105", "STABLE", "LANGSTROTH"],
    ["hive_a106", "WATCH", "LANGSTROTH"],
    ["hive_b220", "STRESSED", "TOP_BAR"],
    ["hive_c340", "WATCH", "LANGSTROTH"],
    ["hive_d105", "CRITICAL", "WARRE"],
    ["hive_e880", "STABLE", "LANGSTROTH"],
  ];
  for (const [id, expected, type] of cases) {
    it(`${id} classifies as ${expected}`, () => {
      const os = getHiveOSData(id);
      const s = deriveSignals(os.observations, os.inspections, os.colonyLost, type);
      expect(classifyHealth(s).state).toBe(expected);
    });
  }
});
