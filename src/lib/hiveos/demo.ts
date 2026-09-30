/**
 * HIVETRACE HIVEOS — synthetic demo dataset.
 *
 * Deterministic (seeded PRNG): the same hive id always yields the same
 * observations, so server renders are stable. These scenarios are illustrative
 * fixtures for the prototype rules, not field data.
 */
import type {
  Evidence,
  HealthEvent,
  HiveInspection,
  HiveObservation,
  Intervention,
} from "./types";

/* ── deterministic PRNG ─────────────────────────────────────────────── */

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function daysAgoIso(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

/* ── demo hive identity (mirrors the /hives demo fallback) ───────────── */

export interface DemoHiveMeta {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  farm: string;
  region: string;
  location: string;
  installedAt: string;
}

export const DEMO_HIVE_METAS: DemoHiveMeta[] = [
  { id: "hive_a105", name: "Hive A-105", code: "H05", type: "LANGSTROTH", status: "ACTIVE", farm: "Purulia Apiary", region: "Sector 4", location: "23.33°N, 86.36°E", installedAt: "2024-03-14" },
  { id: "hive_a106", name: "Hive A-106", code: "H06", type: "LANGSTROTH", status: "ACTIVE", farm: "Purulia Apiary", region: "Sector 4", location: "23.34°N, 86.37°E", installedAt: "2024-03-14" },
  { id: "hive_b220", name: "Hive B-220", code: "H09", type: "TOP_BAR", status: "INSPECTION", farm: "Kashmir Valley", region: "Kullu", location: "31.96°N, 77.11°E", installedAt: "2023-11-02" },
  { id: "hive_c340", name: "Hive C-340", code: "H12", type: "LANGSTROTH", status: "ACTIVE", farm: "Sundarbans Reserve", region: "Gosaba", location: "22.16°N, 88.81°E", installedAt: "2024-01-20" },
  { id: "hive_d105", name: "Hive D-105", code: "H14", type: "WARRE", status: "COLONY_LOSS", farm: "Murshidabad Co-op", region: "Suti", location: "24.62°N, 88.04°E", installedAt: "2023-09-08" },
  { id: "hive_e880", name: "Hive E-880", code: "H18", type: "LANGSTROTH", status: "ACTIVE", farm: "Ghats Apiaries", region: "Nilgiris", location: "11.41°N, 76.70°E", installedAt: "2024-02-11" },
];

export function demoMetaFor(hiveId: string): DemoHiveMeta | null {
  return DEMO_HIVE_METAS.find((m) => m.id === hiveId) ?? null;
}

export function demoCodeFor(hiveId: string): string {
  const meta = demoMetaFor(hiveId);
  if (meta) return meta.code;
  return `H${10 + (hashSeed(hiveId) % 89)}`;
}

/* ── observation series builder ───────────────────────────────────────── */

interface SeriesSpec {
  temp: (day: number, r: () => number) => number | null;
  humidity: (day: number, r: () => number) => number | null;
  weight: (day: number, r: () => number) => number | null;
  activity: (day: number, r: () => number) => number | null;
  source: "SENSOR" | "MANUAL";
}

const DAYS = 14;

function buildSeries(seed: string, spec: SeriesSpec): HiveObservation[] {
  const rand = mulberry32(hashSeed(seed));
  const out: HiveObservation[] = [];
  for (let day = 0; day < DAYS; day++) {
    const r = mulberry32(hashSeed(`${seed}:${day}`));
    void rand;
    out.push({
      date: daysAgoIso(DAYS - 1 - day),
      tempC: spec.temp(day, r),
      humidityPct: spec.humidity(day, r),
      weightKg: spec.weight(day, r),
      activityIndex: spec.activity(day, r),
      source: spec.source,
    });
  }
  return out;
}

const nz = (v: number, r: () => number, amt: number) => v + (r() - 0.5) * 2 * amt;

/* ── per-hive scenarios ───────────────────────────────────────────────── */

export interface HiveOSData {
  observations: HiveObservation[];
  inspections: HiveInspection[];
  interventions: Intervention[];
  healthEvents: HealthEvent[];
  evidence: Evidence[];
  ambientNote: string | null;
  colonyLost: boolean;
}

function scenarioA105(): HiveOSData {
  return {
    observations: buildSeries("hive_a105", {
      // Stable colony; mild temperature elevation in the last few days.
      temp: (d, r) => +nz(d < 10 ? 35.1 : 36.2, r, 0.35).toFixed(1),
      humidity: (d, r) => Math.round(nz(61, r, 3)),
      weight: (d, r) => +(41 + d * 0.25 + nz(0, r, 0.2)).toFixed(1),
      activity: (d, r) => Math.round(nz(90, r, 4)),
      source: "SENSOR",
    }),
    inspections: [
      { id: "insp_a105_2", date: daysAgoIso(6), broodPattern: "SOLID", queenSeen: true, varroaIndex: 1, notes: "Laying queen confirmed; super added.", inspector: "Ravi Kumar" },
      { id: "insp_a105_1", date: daysAgoIso(30), broodPattern: "SOLID", queenSeen: true, varroaIndex: 1, notes: "Routine check, all nominal.", inspector: "Ravi Kumar" },
    ],
    interventions: [
      { id: "int_a105_1", date: daysAgoIso(30), detectedProblem: "Weight plateau for 10 days", recommendedAction: "Check for queen issues; inspect brood pattern", actionTaken: "Inspection confirmed laying queen; super added", outcome: "RESOLVED", notes: "Weight gain resumed within a week." },
    ],
    healthEvents: [
      { id: "ev_a105_1", date: daysAgoIso(6), kind: "NOTE", title: "Super added after inspection", detail: "Second super fitted; colony has room to expand." },
    ],
    evidence: [
      { tier: "SENSOR_VERIFIED", label: "Sensor + verified evidence", detail: "Temperature, humidity and hive-scale sensors; readings cross-checked at the last inspection." },
    ],
    ambientNote: "Daytime highs near 39°C across Purulia this week (regional advisory).",
    colonyLost: false,
  };
}

function scenarioA106(): HiveOSData {
  return {
    observations: buildSeries("hive_a106", {
      // Watch: rising temperature trend, flattening weight, softening activity.
      temp: (d, r) => +nz(35.2 + d * 0.13, r, 0.3).toFixed(1),
      humidity: (d, r) => Math.round(nz(63, r, 3)),
      weight: (d, r) => +(38 + d * 0.05 + nz(0, r, 0.15)).toFixed(1),
      activity: (d, r) => Math.round(nz(82 - d * 1.6, r, 4)),
      source: "SENSOR",
    }),
    inspections: [
      { id: "insp_a106_2", date: daysAgoIso(18), broodPattern: "PATCHY", queenSeen: true, varroaIndex: 2, notes: "Moderate varroa; drone-brood removal done.", inspector: "Ravi Kumar" },
      { id: "insp_a106_1", date: daysAgoIso(44), broodPattern: "SOLID", queenSeen: true, varroaIndex: 1, notes: "Routine check.", inspector: "Ravi Kumar" },
    ],
    interventions: [
      { id: "int_a106_1", date: daysAgoIso(18), detectedProblem: "Varroa index 2 (moderate) at inspection", recommendedAction: "Drone-brood removal at next inspection", actionTaken: "Two drone frames removed", outcome: "NO_CHANGE", notes: "Index unchanged at follow-up look; recheck due." },
    ],
    healthEvents: [
      { id: "ev_a106_2", date: daysAgoIso(3), kind: "ANOMALY", title: "Temperature trend rising for 5 days", detail: "Internal temperature climbing ~0.13°C per day." },
      { id: "ev_a106_1", date: daysAgoIso(3), kind: "STATE_CHANGE", title: "STABLE → WATCH", detail: "Prototype rules moved the hive to WATCH on temperature trend and softening activity." },
    ],
    evidence: [
      { tier: "MULTI_SENSOR", label: "Multiple sensor data", detail: "Temperature, humidity and hive-scale sensors; no verified cross-check yet." },
    ],
    ambientNote: "Daytime highs near 39°C across Purulia this week (regional advisory).",
    colonyLost: false,
  };
}

function scenarioB220(): HiveOSData {
  return {
    observations: buildSeries("hive_b220", {
      // Stressed: heat deviation + weight loss + activity decline.
      temp: (d, r) => +nz(37.0 + d * 0.06, r, 0.4).toFixed(1),
      humidity: (d, r) => Math.round(nz(57, r, 3)),
      weight: (d, r) => +(36 - d * 0.7 + nz(0, r, 0.25)).toFixed(1),
      activity: (d, r) => Math.round(Math.max(8, nz(72 - d * 2, r, 5))),
      source: "SENSOR",
    }),
    inspections: [
      { id: "insp_b220_2", date: daysAgoIso(26), broodPattern: "PATCHY", queenSeen: false, varroaIndex: 2, notes: "Queen not seen; patchy brood. Inspection overdue.", inspector: "Arjun Nair" },
      { id: "insp_b220_1", date: daysAgoIso(58), broodPattern: "SOLID", queenSeen: true, varroaIndex: 1, notes: "Routine check.", inspector: "Arjun Nair" },
    ],
    interventions: [
      { id: "int_b220_1", date: daysAgoIso(12), detectedProblem: "Internal temperature above 37.5°C for 3 consecutive days", recommendedAction: "Fit shade board and check water availability", actionTaken: "Shade board fitted; water tray refilled", outcome: "IMPROVED", notes: "Temperature fell 1.1°C within 48 hours, then climbed again during the heatwave." },
    ],
    healthEvents: [
      { id: "ev_b220_3", date: daysAgoIso(6), kind: "NOTE", title: "Heatwave advisory for Kullu region", detail: "Regional advisory: sustained daytime highs." },
      { id: "ev_b220_2", date: daysAgoIso(5), kind: "ANOMALY", title: "Temperature crossed 37.5°C", detail: "Brood-nest band is 34–36°C; deviation above 2.5°." },
      { id: "ev_b220_1", date: daysAgoIso(4), kind: "STATE_CHANGE", title: "WATCH → STRESSED", detail: "Prototype rules moved the hive to STRESSED on heat deviation, weight loss and activity decline." },
    ],
    evidence: [
      { tier: "BASIC_SENSOR", label: "Basic sensor data", detail: "Temperature sensor only; weight and activity are keeper estimates." },
      { tier: "MANUAL", label: "Manual observation", detail: "Entrance activity logged by the keeper." },
    ],
    ambientNote: "Heatwave advisory for the Kullu region — sustained daytime highs.",
    colonyLost: false,
  };
}

function scenarioC340(): HiveOSData {
  return {
    observations: buildSeries("hive_c340", {
      // Watch: persistent high humidity, softening activity.
      temp: (d, r) => +nz(35.3, r, 0.35).toFixed(1),
      humidity: (d, r) => Math.round(nz(83, r, 2.5)),
      weight: (d, r) => +(44 + d * 0.08 + nz(0, r, 0.2)).toFixed(1),
      activity: (d, r) => Math.round(nz(86 - d * 1.4, r, 4)),
      source: "SENSOR",
    }),
    inspections: [
      { id: "insp_c340_2", date: daysAgoIso(12), broodPattern: "SOLID", queenSeen: true, varroaIndex: 1, notes: "Solid brood; moisture on inner cover noted.", inspector: "Ravi Kumar" },
      { id: "insp_c340_1", date: daysAgoIso(40), broodPattern: "SOLID", queenSeen: true, varroaIndex: 0, notes: "Routine check.", inspector: "Ravi Kumar" },
    ],
    interventions: [],
    healthEvents: [
      { id: "ev_c340_2", date: daysAgoIso(4), kind: "ANOMALY", title: "Humidity above 80% for 4 days", detail: "Sustained high humidity; watch for condensation stress." },
      { id: "ev_c340_1", date: daysAgoIso(4), kind: "STATE_CHANGE", title: "STABLE → WATCH", detail: "Prototype rules moved the hive to WATCH on humidity and softening activity." },
    ],
    evidence: [
      { tier: "MULTI_SENSOR", label: "Multiple sensor data", detail: "Temperature, humidity and hive-scale sensors; no verified cross-check yet." },
    ],
    ambientNote: "Monsoon humidity elevated across the Sundarbans delta.",
    colonyLost: false,
  };
}

function scenarioD105(): HiveOSData {
  // Critical: colony loss. Manual observations only, sparse series.
  const rand = mulberry32(hashSeed("hive_d105"));
  const observations: HiveObservation[] = [];
  for (let day = 0; day < DAYS; day++) {
    const r = mulberry32(hashSeed(`hive_d105:${day}`));
    void rand;
    observations.push({
      date: daysAgoIso(DAYS - 1 - day),
      tempC: null,
      humidityPct: null,
      weightKg: day < 5 ? +(30 - day * 2.4).toFixed(1) : 18,
      activityIndex: Math.round(Math.max(0, 42 - day * 3.4 + (r() - 0.5) * 6)),
      source: "MANUAL",
    });
  }
  return {
    observations,
    inspections: [
      { id: "insp_d105_2", date: daysAgoIso(9), broodPattern: "SPARSE", queenSeen: false, varroaIndex: 3, notes: "No brood pattern; no queen; heavy varroa signs. Colony loss confirmed.", inspector: "Arjun Nair" },
      { id: "insp_d105_1", date: daysAgoIso(47), broodPattern: "PATCHY", queenSeen: false, varroaIndex: 2, notes: "Queen not seen; supersedure cells present.", inspector: "Arjun Nair" },
    ],
    interventions: [
      { id: "int_d105_1", date: daysAgoIso(9), detectedProblem: "Colony loss confirmed — no brood, no queen, activity near zero", recommendedAction: "Close hive, sanitize equipment, review records for a cause pattern", actionTaken: "Hive closed and equipment sealed", outcome: "PENDING", notes: "Cause under review; varroa pressure was high at the last two inspections." },
    ],
    healthEvents: [
      { id: "ev_d105_3", date: daysAgoIso(14), kind: "ANOMALY", title: "Activity dropped below 20", detail: "Foraging activity collapsed over several days." },
      { id: "ev_d105_2", date: daysAgoIso(9), kind: "COLONY_LOSS", title: "Colony loss confirmed", detail: "Inspection found no brood pattern and no queen." },
      { id: "ev_d105_1", date: daysAgoIso(9), kind: "STATE_CHANGE", title: "STRESSED → CRITICAL", detail: "Prototype rules moved the hive to CRITICAL on colony loss." },
    ],
    evidence: [
      { tier: "MANUAL", label: "Manual observation", detail: "Keeper observations only; sensors were removed after the loss." },
    ],
    ambientNote: null,
    colonyLost: true,
  };
}

function scenarioE880(): HiveOSData {
  return {
    observations: buildSeries("hive_e880", {
      temp: (d, r) => +nz(34.9, r, 0.35).toFixed(1),
      humidity: (d, r) => Math.round(nz(62, r, 3)),
      weight: (d, r) => +(40 + d * 0.27 + nz(0, r, 0.2)).toFixed(1),
      activity: (d, r) => Math.round(nz(91, r, 4)),
      source: "SENSOR",
    }),
    inspections: [
      { id: "insp_e880_2", date: daysAgoIso(9), broodPattern: "SOLID", queenSeen: true, varroaIndex: 0, notes: "Routine check — all nominal.", inspector: "Ravi Kumar" },
      { id: "insp_e880_1", date: daysAgoIso(37), broodPattern: "SOLID", queenSeen: true, varroaIndex: 1, notes: "Routine check.", inspector: "Ravi Kumar" },
    ],
    interventions: [],
    healthEvents: [
      { id: "ev_e880_1", date: daysAgoIso(9), kind: "NOTE", title: "Routine check — all nominal", detail: "No anomalies detected by the prototype rules." },
    ],
    evidence: [
      { tier: "BASIC_SENSOR", label: "Basic sensor data", detail: "Temperature sensor; weight and activity are keeper estimates." },
    ],
    ambientNote: null,
    colonyLost: false,
  };
}

/** Generic scenario for hives without a scripted fixture (e.g. real DB hives). */
function genericScenario(hiveId: string): HiveOSData {
  const h = hashSeed(hiveId);
  const warmShift = (h % 5 === 0) ? 1.6 : 0; // ~1 in 5 runs a little warm
  return {
    observations: buildSeries(`generic:${hiveId}`, {
      temp: (d, r) => +nz(35 + warmShift, r, 0.4).toFixed(1),
      humidity: (d, r) => Math.round(nz(62, r, 4)),
      weight: (d, r) => +(40 + d * 0.18 + nz(0, r, 0.25)).toFixed(1),
      activity: (d, r) => Math.round(nz(88, r, 5)),
      source: "SENSOR",
    }),
    inspections: [
      { id: `insp_${hiveId}_1`, date: daysAgoIso(8 + (h % 10)), broodPattern: "SOLID", queenSeen: true, varroaIndex: 1, notes: "Routine check.", inspector: "Apiary keeper" },
    ],
    interventions: [],
    healthEvents: [],
    evidence: [
      { tier: "BASIC_SENSOR", label: "Basic sensor data", detail: "Temperature sensor; other readings are keeper estimates." },
    ],
    ambientNote: null,
    colonyLost: false,
  };
}

const SCENARIOS: Record<string, () => HiveOSData> = {
  hive_a105: scenarioA105,
  hive_a106: scenarioA106,
  hive_b220: scenarioB220,
  hive_c340: scenarioC340,
  hive_d105: scenarioD105,
  hive_e880: scenarioE880,
};

export function getHiveOSData(hiveId: string): HiveOSData {
  const scenario = SCENARIOS[hiveId];
  return scenario ? scenario() : genericScenario(hiveId);
}
