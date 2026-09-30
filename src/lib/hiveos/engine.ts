/**
 * HIVETRACE HIVEOS — transparent prototype rules.
 *
 * Every function here is pure and deterministic: same signals in, same
 * assessment out. The rules are intentionally simple and documented inline so a
 * beekeeper (or a test) can audit exactly why a hive was classified the way it
 * was. This is NOT trained ML and NOT a scientifically validated model — the
 * UI must say so wherever these outputs appear.
 */
import type {
  ActionRecommendation,
  AnomalyGroup,
  ApiaryHiveSummary,
  ApiaryIntelligence,
  ConfidenceLabel,
  Evidence,
  EvidenceTier,
  FactorSeverity,
  HealthAssessment,
  HealthFactor,
  HealthSignals,
  HiveHealthState,
  HiveInspection,
  HiveObservation,
  WhatIfAdjustment,
  WhatIfResult,
  WhyExplanation,
} from "./types";

export const RULE_VERSION = "hiveos-proto-v1" as const;

/** Center of the brood-nest band (°C) the prototype rules reason about. */
const BROOD_TEMP_C = 35;
/** Band the rules treat as "within normal variation". */
const BROOD_BAND = "34–36°C";

/* ── health classification ──────────────────────────────────────────── */

function f(
  key: string,
  label: string,
  detail: string,
  contribution: number,
  severity: FactorSeverity,
): HealthFactor {
  return { key, label, detail, contribution, severity };
}

function tempFactor(tempC: number | null): HealthFactor | null {
  if (tempC == null) return null;
  const dev = Math.abs(tempC - BROOD_TEMP_C);
  const devS = dev.toFixed(1);
  if (dev > 6)
    return f("temp-elevated", "Severe temperature deviation",
      `${tempC.toFixed(1)}°C, ${devS}° above the ${BROOD_BAND} brood band`, 28, "bad");
  if (dev > 3)
    return f("temp-elevated", "High temperature deviation",
      `${tempC.toFixed(1)}°C, ${devS}° above the ${BROOD_BAND} brood band`, 18, "bad");
  if (dev > 1.5)
    return f("temp-elevated", "Elevated temperature",
      `${tempC.toFixed(1)}°C, ${devS}° above the ${BROOD_BAND} brood band`, 8, "watch");
  if (dev > 0.8)
    return f("temp-elevated", "Temperature slightly above band",
      `${tempC.toFixed(1)}°C — just above the ${BROOD_BAND} band, within normal variation`, 0, "info");
  return f("temp-ok", "Temperature within brood-nest band",
    `${tempC.toFixed(1)}°C, inside ${BROOD_BAND}`, 0, "info");
}

function weightFactor(trend: number | null): HealthFactor | null {
  if (trend == null) return null;
  if (trend < -1.5)
    return f("weight-decline", "Rapid weight loss",
      `${trend.toFixed(2)} kg/day over the trailing 7 days`, 22, "bad");
  if (trend < -0.5)
    return f("weight-decline", "Weight declining",
      `${trend.toFixed(2)} kg/day over the trailing 7 days`, 14, "bad");
  if (trend < -0.15)
    return f("weight-decline", "Weight gain slowing",
      `${trend.toFixed(2)} kg/day over the trailing 7 days`, 7, "watch");
  if (trend > 0.15)
    return f("weight-gaining", "Weight gaining steadily",
      `+${trend.toFixed(2)} kg/day over the trailing 7 days`, 0, "info");
  return null;
}

function activityFactor(index: number | null, delta: number | null): HealthFactor | null {
  if (index != null && index < 15)
    return f("activity-drop", "Activity near zero",
      `foraging activity index ${index}/100 against the seasonal baseline`, 25, "bad");
  if (delta == null) return null;
  if (delta < -25)
    return f("activity-drop", "Foraging activity sharply down",
      `${delta.toFixed(0)} points vs the trailing baseline`, 14, "bad");
  if (delta < -12)
    return f("activity-drop", "Foraging activity softening",
      `${delta.toFixed(0)} points vs the trailing baseline`, 7, "watch");
  if (delta > -5)
    return f("activity-ok", "Activity near baseline",
      `${delta >= 0 ? "+" : ""}${delta.toFixed(0)} points vs the trailing baseline`, 0, "info");
  return null;
}

function varroaFactor(v: HealthSignals["varroaIndex"]): HealthFactor | null {
  if (v == null) return null;
  if (v >= 3) return f("varroa-high", "Varroa pressure high", "index 3/3 at the last inspection", 16, "bad");
  if (v === 2) return f("varroa-moderate", "Varroa pressure moderate", "index 2/3 at the last inspection", 8, "watch");
  if (v === 1) return f("varroa-ok", "Varroa pressure low", "index 1/3 at the last inspection", 0, "info");
  return f("varroa-ok", "No varroa signs", "index 0/3 at the last inspection", 0, "info");
}

function broodFactor(b: HealthSignals["broodPattern"]): HealthFactor | null {
  if (b == null) return null;
  if (b === "SPARSE") return f("brood-sparse", "Sparse brood pattern", "recorded at the last inspection", 14, "bad");
  if (b === "PATCHY") return f("brood-patchy", "Patchy brood pattern", "recorded at the last inspection", 7, "watch");
  return f("brood-ok", "Brood pattern solid", "recorded at the last inspection", 0, "info");
}

function inspectionFactor(days: number | null): HealthFactor | null {
  if (days == null) return null;
  if (days > 21)
    return f("inspection-overdue", "Inspection overdue",
      `last full inspection ${days} days ago`, 5, "watch");
  return null;
}

function humidityFactor(h: number | null): HealthFactor | null {
  if (h == null) return null;
  if (h > 80) return f("humidity-high", "High humidity", `${h}% sustained — watch for condensation stress`, 6, "watch");
  if (h < 35) return f("humidity-low", "Low humidity", `${h}% — dry conditions inside the hive`, 6, "watch");
  return null;
}

/**
 * Classify a hive into STABLE / WATCH / STRESSED / CRITICAL.
 * Score = 100 − Σ factor contributions, clamped to 0–100.
 */
export function classifyHealth(s: HealthSignals): HealthAssessment {
  if (s.colonyLost) {
    return {
      state: "CRITICAL",
      score: 5,
      factors: [f("colony-lost", "Colony loss recorded", "inspection confirmed no brood pattern and no queen", 95, "bad")],
      observedAt: new Date().toISOString(),
      ruleVersion: RULE_VERSION,
    };
  }

  const factors = [
    tempFactor(s.tempC),
    weightFactor(s.weightTrendKgPerDay),
    activityFactor(s.activityIndex, s.activityDelta),
    varroaFactor(s.varroaIndex),
    broodFactor(s.broodPattern),
    inspectionFactor(s.daysSinceInspection),
    humidityFactor(s.humidityPct),
  ].filter((x): x is HealthFactor => x !== null);

  if (factors.length === 0) {
    // No usable signals at all: say so, and stay cautious.
    return {
      state: "WATCH",
      score: 95,
      factors: [f("insufficient-data", "Insufficient data", "no usable observations in the current window", 5, "watch")],
      observedAt: new Date().toISOString(),
      ruleVersion: RULE_VERSION,
    };
  }

  const score = Math.max(0, Math.min(100, 100 - factors.reduce((t, x) => t + x.contribution, 0)));
  const bad = factors.filter((x) => x.severity === "bad").length;
  const watch = factors.filter((x) => x.severity === "watch").length;

  let state: HiveHealthState = "STABLE";
  if (bad >= 2 || score < 40) state = "CRITICAL";
  else if (bad >= 1 || score < 60) state = "STRESSED";
  else if (watch >= 1 || score < 80) state = "WATCH";

  // Deterministic order: worst severity first, then biggest contribution.
  const rank: Record<FactorSeverity, number> = { bad: 0, watch: 1, info: 2 };
  factors.sort((a, b) => rank[a.severity] - rank[b.severity] || b.contribution - a.contribution);

  return { state, score, factors, observedAt: new Date().toISOString(), ruleVersion: RULE_VERSION };
}

/* ── signal derivation ──────────────────────────────────────────────── */

function slope(values: number[]): number | null {
  if (values.length < 2) return null;
  const n = values.length;
  const xs = Array.from({ length: n }, (_, i) => i);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = values.reduce((a, b) => a + b, 0) / n;
  const denom = xs.reduce((t, x) => t + (x - mx) ** 2, 0);
  if (denom === 0) return null;
  return xs.reduce((t, x, i) => t + (x - mx) * (values[i] - my), 0) / denom;
}

function mean(v: number[]): number | null {
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/** Fold raw observations + inspections into the signals the rules reason over. */
export function deriveSignals(
  observations: HiveObservation[],
  inspections: HiveInspection[],
  colonyLost: boolean,
  hiveType: string | null,
): HealthSignals {
  const latest = observations[observations.length - 1] ?? null;
  const weights = observations.slice(-7).map((o) => o.weightKg).filter((v): v is number => v != null);
  const baseAct = observations.slice(0, 7).map((o) => o.activityIndex).filter((v): v is number => v != null);
  const curAct = observations.slice(-3).map((o) => o.activityIndex).filter((v): v is number => v != null);
  const b = mean(baseAct);
  const c = mean(curAct);
  const lastInsp = inspections[0] ?? null;
  const daysSinceInspection = lastInsp
    ? Math.max(0, Math.round((Date.now() - new Date(lastInsp.date).getTime()) / 86_400_000))
    : null;

  return {
    tempC: latest?.tempC ?? null,
    humidityPct: latest?.humidityPct ?? null,
    weightTrendKgPerDay: slope(weights),
    activityIndex: latest?.activityIndex ?? null,
    activityDelta: b != null && c != null ? c - b : null,
    broodPattern: lastInsp?.broodPattern ?? null,
    varroaIndex: lastInsp?.varroaIndex ?? null,
    daysSinceInspection,
    colonyLost,
    hiveType,
  };
}

/* ── why engine ─────────────────────────────────────────────────────── */

const PATTERN_LABEL: Record<string, string> = {
  "temp-elevated": "possible heat stress",
  "weight-decline": "possible nutritional stress",
  "activity-drop": "possible colony stress",
  "humidity-high": "possible humidity stress",
  "humidity-low": "possible dryness stress",
  "varroa-high": "a varroa pressure pattern",
  "varroa-moderate": "a varroa pressure pattern",
  "brood-sparse": "a brood health pattern",
  "brood-patchy": "a brood health pattern",
  "inspection-overdue": "a monitoring gap",
  "colony-lost": "colony loss",
};

const STATE_READING: Record<HiveHealthState, string> = {
  STABLE: "looks stable",
  WATCH: "is worth watching",
  STRESSED: "shows signs of stress",
  CRITICAL: "needs urgent attention",
};

export function explainWhy(
  hiveName: string,
  assessment: HealthAssessment,
  signals: HealthSignals,
  contextual: string[],
  confidence: ConfidenceLabel,
): WhyExplanation {
  const concerning = assessment.factors.filter((x) => x.severity !== "info");
  const primaryFactor = concerning.length ? concerning[0] : assessment.factors[0] ?? null;
  const contributingFactors = concerning.filter((x) => x !== primaryFactor);

  const contextualFactors = [...contextual];
  if (signals.daysSinceInspection != null) {
    contextualFactors.push(
      signals.daysSinceInspection === 0
        ? "Inspected today."
        : `Last full inspection ${signals.daysSinceInspection} days ago.`,
    );
  }
  if (signals.hiveType === "TOP_BAR") {
    contextualFactors.push("Top-Bar hives can run warmer in still air — relevant context, not a diagnosis.");
  }

  const pattern = primaryFactor ? PATTERN_LABEL[primaryFactor.key] ?? "an unusual pattern" : "no unusual pattern";
  const contribText = contributingFactors.length
    ? ` Contributing signals: ${contributingFactors.map((x) => `${x.label.toLowerCase()} (${x.detail})`).join("; ")}.`
    : "";
  const contextText = contextualFactors.length ? ` Context: ${contextualFactors.join(" ")}` : "";
  const explanation =
    assessment.state === "STABLE"
      ? `${hiveName} ${STATE_READING[assessment.state]} under the prototype rules (score ${assessment.score}/100). ` +
        `No concerning factors in the current window.${contribText}${contextText} ` +
        `This is a rule-based reading of recent observations, not a validated prediction.`
      : `${hiveName} ${STATE_READING[assessment.state]} under the prototype rules (score ${assessment.score}/100). ` +
        `Primary factor: ${primaryFactor?.label ?? "unknown"} — ${primaryFactor?.detail ?? "no detail"}.${contribText}${contextText} ` +
        `Together these readings are consistent with ${pattern}. ` +
        `That is an association the rules noticed, not a proven cause — treat it as a prompt to inspect, not a diagnosis.`;

  return { state: assessment.state, primaryFactor, contributingFactors, contextualFactors, confidence, explanation };
}

/* ── action engine ──────────────────────────────────────────────────── */

interface ActionSpec {
  id: string;
  title: string;
  detail: string;
  priority: "NOW" | "SOON" | "ROUTINE";
  factorKeys: string[];
}

const ACTION_SPECS: ActionSpec[] = [
  { id: "ventilation", title: "Inspect ventilation", detail: "Check entrances and add a ventilation shim or shade board so the colony can regulate brood-nest temperature.", priority: "NOW", factorKeys: ["temp-elevated"] },
  { id: "water", title: "Check water availability", detail: "Bees use water for evaporative cooling. Refill nearby water sources.", priority: "SOON", factorKeys: ["temp-elevated"] },
  { id: "recheck-temp", title: "Recheck in 24 hours", detail: "Confirm whether the temperature deviation persists before taking further action.", priority: "ROUTINE", factorKeys: ["temp-elevated"] },
  { id: "robbing", title: "Inspect for robbing and disease", detail: "Falling weight with no harvest recorded can mean robbing or a health issue — look at entrance behavior and frames.", priority: "NOW", factorKeys: ["weight-decline"] },
  { id: "stores", title: "Check food stores", detail: "Verify the colony has enough stores to sustain itself through the current trend.", priority: "SOON", factorKeys: ["weight-decline"] },
  { id: "entrance", title: "Observe entrance at midday", detail: "A short midday watch confirms whether foraging has truly dropped or just shifted timing.", priority: "SOON", factorKeys: ["activity-drop"] },
  { id: "drone-brood", title: "Drone-brood inspection", detail: "Pull a drone frame to re-check the varroa index before it climbs further.", priority: "SOON", factorKeys: ["varroa-moderate", "varroa-high"] },
  { id: "treatment-window", title: "Plan a treatment window", detail: "Discuss timing with your mentor — treat before the pressure index reaches high.", priority: "ROUTINE", factorKeys: ["varroa-moderate", "varroa-high"] },
  { id: "brood-frame", title: "Brood-frame inspection", detail: "Look frame by frame for brood pattern gaps, and confirm the queen is laying.", priority: "SOON", factorKeys: ["brood-patchy", "brood-sparse"] },
  { id: "schedule-inspection", title: "Schedule a full inspection", detail: "The monitoring gap is growing — a hands-on inspection resets the evidence.", priority: "SOON", factorKeys: ["inspection-overdue"] },
  { id: "vent-humidity", title: "Improve airflow / tilt the cover", detail: "Sustained high humidity risks condensation stress; improve airflow and check the inner cover.", priority: "SOON", factorKeys: ["humidity-high"] },
  { id: "close-hive", title: "Close and sanitize equipment", detail: "Seal the hive to prevent disease spread and clean equipment before reuse.", priority: "NOW", factorKeys: ["colony-lost"] },
  { id: "review-records", title: "Review records for a cause pattern", detail: "Look back at inspections and interventions for what preceded the loss.", priority: "ROUTINE", factorKeys: ["colony-lost"] },
];

const PRIORITY_RANK = { NOW: 0, SOON: 1, ROUTINE: 2 } as const;

/** Convert detected factors into recommended actions. Every action names its why. */
export function recommendActions(assessment: HealthAssessment): ActionRecommendation[] {
  const byKey = new Map(assessment.factors.map((x) => [x.key, x]));
  const out: ActionRecommendation[] = [];

  for (const spec of ACTION_SPECS) {
    const hit = spec.factorKeys.map((k) => byKey.get(k)).find(Boolean);
    if (!hit) continue;
    const matched = spec.factorKeys.map((k) => byKey.get(k)).filter((x): x is HealthFactor => !!x);
    out.push({
      id: spec.id,
      title: spec.title,
      detail: spec.detail,
      priority: spec.priority,
      why: matched.map((m) => `${m.label}: ${m.detail}`),
      triggerFactors: matched.map((m) => m.key),
    });
  }

  if (out.length === 0) {
    out.push({
      id: "routine-monitoring",
      title: "Continue routine monitoring",
      detail: "No concerning factors in the current observation window. Keep the regular inspection rhythm.",
      priority: "ROUTINE",
      why: ["No concerning factors in the current observation window."],
      triggerFactors: [],
    });
  }

  out.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  return out;
}

/* ── trust ladder ───────────────────────────────────────────────────── */

const TIER_RANK: Record<EvidenceTier, number> = {
  MANUAL: 1,
  BASIC_SENSOR: 2,
  MULTI_SENSOR: 3,
  SENSOR_VERIFIED: 4,
};

export function trustFromEvidence(evidence: Evidence[]): { confidence: ConfidenceLabel; bestTier: EvidenceTier } {
  const bestTier = evidence.reduce<EvidenceTier>(
    (best, e) => (TIER_RANK[e.tier] > TIER_RANK[best] ? e.tier : best),
    "MANUAL",
  );
  const rank = TIER_RANK[bestTier];
  const confidence: ConfidenceLabel =
    rank >= 4 ? "HIGH DATA CONFIDENCE" : rank >= 2 ? "MEDIUM DATA CONFIDENCE" : "LOW DATA CONFIDENCE";
  return { confidence, bestTier };
}

/* ── apiary intelligence ────────────────────────────────────────────── */

/** Factor keys that count as an "anomaly signature" for grouping (excludes healthy signals). */
function anomalyKeysOf(factors: HealthFactor[]): string[] {
  return factors.filter((x) => !x.key.endsWith("-ok")).map((x) => x.key);
}

export function summarizeHive(
  hiveId: string,
  name: string,
  farm: string,
  assessment: HealthAssessment,
): ApiaryHiveSummary {
  return {
    hiveId,
    name,
    farm,
    state: assessment.state,
    score: assessment.score,
    anomalyKeys: anomalyKeysOf(assessment.factors),
  };
}

function groupAnomalies(summaries: ApiaryHiveSummary[], codeFor: (id: string) => string): AnomalyGroup[] {
  const byFarm = new Map<string, ApiaryHiveSummary[]>();
  for (const s of summaries) {
    const list = byFarm.get(s.farm) ?? [];
    list.push(s);
    byFarm.set(s.farm, list);
  }
  const groups: AnomalyGroup[] = [];
  for (const [farm, hives] of byFarm) {
    if (hives.length < 2) continue;
    const keyCount = new Map<string, number>();
    for (const h of hives) for (const k of new Set(h.anomalyKeys)) keyCount.set(k, (keyCount.get(k) ?? 0) + 1);
    const shared = [...keyCount.entries()].filter(([, n]) => n >= 2).map(([k]) => k);
    if (!shared.length) continue;
    const members = hives.filter((h) => shared.some((k) => h.anomalyKeys.includes(k)));
    if (members.length < 2) continue;
    const labels = shared.map((k) => {
      if (k === "temp-elevated") return "temperature elevation pattern";
      return k.replace(/-/g, " ");
    });
    groups.push({
      id: `grp-${farm}`,
      hiveIds: members.map((m) => m.hiveId),
      hiveNames: members.map((m) => codeFor(m.hiveId)),
      farm,
      sharedFactorKeys: shared,
      sharedFactorLabels: labels,
      headline: `${members.map((m) => codeFor(m.hiveId)).join(" + ")} show a similar ${labels.join(" and ")} — possible localized environmental stress at ${farm}.`,
    });
  }
  return groups;
}

export function apiaryIntelligence(
  summaries: ApiaryHiveSummary[],
  codeFor: (id: string) => string,
): ApiaryIntelligence {
  const byState: Record<HiveHealthState, number> = { STABLE: 0, WATCH: 0, STRESSED: 0, CRITICAL: 0 };
  for (const s of summaries) byState[s.state] += 1;
  const avgScore = summaries.length
    ? Math.round(summaries.reduce((t, s) => t + s.score, 0) / summaries.length)
    : 0;
  return {
    total: summaries.length,
    byState,
    avgScore,
    groups: groupAnomalies(summaries, codeFor),
    heatmap: [...summaries].sort((a, b) => b.score - a.score),
  };
}

/* ── what-if simulator ──────────────────────────────────────────────── */

/**
 * Lightweight prototype simulator: apply a hypothetical management action to a
 * copy of the signals and re-run the rules. Output is simulated
 * decision-support, never a validated prediction.
 */
export function simulateWhatIf(base: HealthSignals, adj: WhatIfAdjustment): WhatIfResult {
  const s: HealthSignals = { ...base };
  const appliedChanges: string[] = [];

  if (adj.ventilationFixed && s.tempC != null) {
    s.tempC = BROOD_TEMP_C + (s.tempC - BROOD_TEMP_C) * 0.3;
    appliedChanges.push("Ventilation improved — internal temperature moved 70% of the way toward the 34–36°C brood band.");
  }
  if (adj.waterProvided && s.tempC != null) {
    s.tempC = s.tempC - 0.8;
    appliedChanges.push("Water provided nearby — evaporative cooling support lowers internal temperature.");
  }
  if (adj.inspectionDone) {
    s.daysSinceInspection = 0;
    appliedChanges.push("Full inspection completed — the monitoring gap is closed.");
  }
  if (adj.varroaTreated) {
    s.varroaIndex = 0;
    appliedChanges.push("Varroa treatment applied — pressure index reset to 0.");
  }
  if (adj.feedProvided && s.weightTrendKgPerDay != null) {
    s.weightTrendKgPerDay = s.weightTrendKgPerDay + 0.35;
    appliedChanges.push("Feed provided — weight trend supported by +0.35 kg/day.");
  }

  const assessment = classifyHealth(s);
  return {
    state: assessment.state,
    score: assessment.score,
    factors: assessment.factors,
    appliedChanges,
    simulated: true,
  };
}
