/**
 * HIVETRACE HIVEOS — domain types.
 *
 * A hive digital twin built from transparent prototype rules over synthetic
 * demo observations. Nothing here is trained ML and nothing is a scientifically
 * validated prediction: every assessment carries its contributing factors and
 * a data-confidence label so a beekeeper can see exactly what the rules saw.
 */

export type HiveHealthState = "STABLE" | "WATCH" | "STRESSED" | "CRITICAL";

export type ConfidenceLabel =
  | "LOW DATA CONFIDENCE"
  | "MEDIUM DATA CONFIDENCE"
  | "HIGH DATA CONFIDENCE";

export type EvidenceTier =
  | "MANUAL" // keeper's written observations only
  | "BASIC_SENSOR" // one sensor stream (e.g. temperature)
  | "MULTI_SENSOR" // several sensor streams (temp + humidity + weight)
  | "SENSOR_VERIFIED"; // sensors + a verified inspection cross-check

export interface HiveObservation {
  /** ISO date, one entry per day. */
  date: string;
  tempC: number | null;
  humidityPct: number | null;
  weightKg: number | null;
  /** 0–100 against the seasonal baseline for this apiary. */
  activityIndex: number | null;
  source: "SENSOR" | "MANUAL";
}

export interface HiveInspection {
  id: string;
  date: string;
  broodPattern: "SOLID" | "PATCHY" | "SPARSE";
  queenSeen: boolean;
  /** 0 none · 1 low · 2 moderate · 3 high */
  varroaIndex: 0 | 1 | 2 | 3;
  notes: string;
  inspector: string;
}

export interface HealthEvent {
  id: string;
  date: string;
  kind: "STATE_CHANGE" | "ANOMALY" | "COLONY_LOSS" | "RECOVERY" | "NOTE";
  title: string;
  detail: string;
}

export interface Intervention {
  id: string;
  date: string;
  detectedProblem: string;
  recommendedAction: string;
  actionTaken: string;
  outcome: "RESOLVED" | "IMPROVED" | "NO_CHANGE" | "WORSENED" | "PENDING";
  notes?: string;
}

export type FactorSeverity = "info" | "watch" | "bad";

export interface HealthFactor {
  /** Stable key, e.g. "temp-deviation". Used for grouping + action triggers. */
  key: string;
  label: string;
  /** Human-readable reading, e.g. "38.4°C, +3.4° above the 34–36°C brood band". */
  detail: string;
  /** Points subtracted from the 100-point health score. */
  contribution: number;
  severity: FactorSeverity;
}

export interface HealthAssessment {
  state: HiveHealthState;
  /** 0–100, transparent: 100 minus the summed factor contributions. */
  score: number;
  factors: HealthFactor[];
  observedAt: string;
  ruleVersion: "hiveos-proto-v1";
}

export interface WhyExplanation {
  state: HiveHealthState;
  primaryFactor: HealthFactor | null;
  contributingFactors: HealthFactor[];
  /** Non-sensor context the rules considered: overdue inspections, hive type, weather. */
  contextualFactors: string[];
  confidence: ConfidenceLabel;
  /** Plain-language reading of the factors. Association, never a causal claim. */
  explanation: string;
}

export interface ActionRecommendation {
  id: string;
  title: string;
  detail: string;
  priority: "NOW" | "SOON" | "ROUTINE";
  /** Every recommendation names the factors that triggered it. */
  why: string[];
  triggerFactors: string[];
}

export interface Evidence {
  tier: EvidenceTier;
  label: string;
  detail: string;
}

export interface AnomalyGroup {
  id: string;
  hiveIds: string[];
  hiveNames: string[];
  farm: string;
  sharedFactorKeys: string[];
  sharedFactorLabels: string[];
  headline: string;
}

export interface ApiaryHiveSummary {
  hiveId: string;
  name: string;
  farm: string;
  state: HiveHealthState;
  score: number;
  /** Factor keys with severity watch/bad — the anomaly signature. */
  anomalyKeys: string[];
}

export interface ApiaryIntelligence {
  total: number;
  byState: Record<HiveHealthState, number>;
  avgScore: number;
  groups: AnomalyGroup[];
  heatmap: ApiaryHiveSummary[];
}

/** Inputs the classifier reasons over — derived from observations + inspections. */
export interface HealthSignals {
  tempC: number | null;
  humidityPct: number | null;
  /** kg/day slope over the trailing 7 days. */
  weightTrendKgPerDay: number | null;
  /** Latest activity index. */
  activityIndex: number | null;
  /** Points vs the trailing baseline (negative = decline). */
  activityDelta: number | null;
  broodPattern: "SOLID" | "PATCHY" | "SPARSE" | null;
  varroaIndex: 0 | 1 | 2 | 3 | null;
  daysSinceInspection: number | null;
  colonyLost: boolean;
  hiveType: string | null;
}

export interface WhatIfAdjustment {
  ventilationFixed?: boolean;
  waterProvided?: boolean;
  inspectionDone?: boolean;
  varroaTreated?: boolean;
  feedProvided?: boolean;
}

export interface WhatIfResult {
  state: HiveHealthState;
  score: number;
  factors: HealthFactor[];
  appliedChanges: string[];
  /** Always true — the UI must label the output as simulated decision support. */
  simulated: true;
}

export interface TraceBatchLink {
  id: string;
  publicCode: string;
  qualityStatus: string;
  riskState: string;
  currentStage: string;
  demo: boolean;
}

export interface TraceHarvestLink {
  id: string;
  date: string;
  quantity: number;
  honeyType: string;
  batches: TraceBatchLink[];
}

export interface HivePassport {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  farm: string;
  region: string;
  location: string | null;
  installedAt: string;
  queenStatus: string;
  inspectionCount: number;
  lastInspectionAt: string | null;
  harvestCount: number;
  totalHarvestedKg: number;
}
