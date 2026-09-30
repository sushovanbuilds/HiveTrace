/**
 * HIVETRACE HIVEOS — data loading.
 *
 * Follows the existing /hives pattern: try the database first, fall back to
 * the synthetic demo dataset when it is unreachable. Hive identity and
 * harvest→batch links are real whenever the DB answers; the intelligence
 * layer (observations, inspections, interventions) is synthetic demo data.
 */
import { db } from "@/lib/db";
import {
  DEMO_HIVE_METAS,
  demoCodeFor,
  demoMetaFor,
  getHiveOSData,
} from "./demo";
import {
  apiaryIntelligence,
  classifyHealth,
  deriveSignals,
  explainWhy,
  recommendActions,
  summarizeHive,
  trustFromEvidence,
} from "./engine";
import type {
  ActionRecommendation,
  ApiaryIntelligence,
  ConfidenceLabel,
  Evidence,
  HealthAssessment,
  HealthEvent,
  HealthSignals,
  HiveHealthState,
  HiveInspection,
  HiveObservation,
  HivePassport,
  Intervention,
  TraceHarvestLink,
  WhyExplanation,
} from "./types";

export interface HiveOSView {
  passport: HivePassport;
  assessment: HealthAssessment;
  /** Raw signals the rules reasoned over — feeds the what-if simulator. */
  signals: HealthSignals;
  why: WhyExplanation;
  actions: ActionRecommendation[];
  evidence: Evidence[];
  confidence: ConfidenceLabel;
  observations: HiveObservation[];
  inspections: HiveInspection[];
  interventions: Intervention[];
  healthEvents: HealthEvent[];
  ambientNote: string | null;
  trace: TraceHarvestLink[];
  isDemo: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  LANGSTROTH: "Langstroth",
  TOP_BAR: "Top-Bar",
  WARRE: "Warré",
  OTHER: "Other",
};

/* ── traceability bridge ────────────────────────────────────────────── */

function demoTraceFor(hiveId: string): TraceHarvestLink[] {
  // Deterministic synthetic harvest→batch links; batch codes use the HC-DEMO-
  // prefix so they resolve in the existing demo verify flow.
  const code = demoCodeFor(hiveId).replace("-", "");
  const h = [...hiveId].reduce((a, c) => a + c.charCodeAt(0), 0);
  const honeyTypes = ["MUSTARD", "MULTIFLORAL", "LITCHI", "EUCALYPTUS"];
  const qtys = [12, 11.2, 10.5, 13.1, 9.5, 7.8];
  const months = [7, 6, 5, 4];
  return [0, 1, 2].map((i) => {
    const batchCode = `HC-DEMO-2026-${code}${(h % 7) + 2}${i + 2}B`;
    return {
      id: `demo-harvest-${hiveId}-${i}`,
      date: new Date(2026, months[i], 12 - i * 9, 6, 30).toISOString(),
      quantity: qtys[(h + i) % qtys.length],
      honeyType: honeyTypes[(h + i) % honeyTypes.length],
      batches: [
        {
          id: `demo-batch-${hiveId}-${i}`,
          publicCode: batchCode,
          qualityStatus: i === 0 ? "PENDING_LAB" : "APPROVED",
          riskState: i === 0 ? "MEDIUM" : "LOW",
          currentStage: i === 0 ? "LAB_TESTING" : "DISTRIBUTION",
          demo: true,
        },
      ],
    };
  });
}

async function traceFromDb(hiveId: string): Promise<TraceHarvestLink[] | null> {
  try {
    const hive = await db.hive.findUnique({
      where: { id: hiveId },
      include: {
        harvests: {
          orderBy: { date: "desc" },
          take: 12,
          include: {
            batches: {
              select: { id: true, publicCode: true, qualityStatus: true, riskState: true, currentStage: true },
            },
          },
        },
      },
    });
    if (!hive) return null;
    return hive.harvests.map((hv) => ({
      id: hv.id,
      date: hv.date.toISOString(),
      quantity: hv.quantity,
      honeyType: hv.honeyType,
      batches: hv.batches.map((b) => ({
        id: b.id,
        publicCode: b.publicCode,
        qualityStatus: b.qualityStatus,
        riskState: b.riskState,
        currentStage: b.currentStage,
        demo: false,
      })),
    }));
  } catch {
    return null;
  }
}

/* ── hive OS view ───────────────────────────────────────────────────── */

export async function getHiveOS(hiveId: string): Promise<HiveOSView | null> {
  let passport: HivePassport | null = null;
  let isDemo = false;

  try {
    const hive = await db.hive.findUnique({
      where: { id: hiveId },
      include: { farm: { select: { name: true, region: true, location: true } } },
    });
    if (hive) {
      const trace = (await traceFromDb(hiveId)) ?? [];
      const totalKg = trace.reduce((t, h) => t + h.quantity, 0);
      passport = {
        id: hive.id,
        name: hive.name,
        code: demoCodeFor(hive.id),
        type: TYPE_LABEL[hive.type] ?? hive.type,
        status: hive.status,
        farm: hive.farm?.name ?? "Unassigned",
        region: hive.farm?.region ?? "—",
        location: hive.farm?.location ?? null,
        installedAt: hive.createdAt.toISOString().slice(0, 10),
        queenStatus: "Unknown — see inspections",
        inspectionCount: 0,
        lastInspectionAt: null,
        harvestCount: trace.length,
        totalHarvestedKg: Math.round(totalKg * 10) / 10,
      };
      return assemble(hive.name, passport, trace, false, hive.type);
    }
  } catch {
    // fall through to demo
  }

  const meta = demoMetaFor(hiveId);
  if (!meta) return null;
  isDemo = true;
  const trace = demoTraceFor(hiveId);
  const totalKg = trace.reduce((t, h) => t + h.quantity, 0);
  const os = getHiveOSData(hiveId);
  const lastInsp = os.inspections[0] ?? null;
  passport = {
    id: meta.id,
    name: meta.name,
    code: meta.code,
    type: TYPE_LABEL[meta.type] ?? meta.type,
    status: meta.status,
    farm: meta.farm,
    region: meta.region,
    location: meta.location,
    installedAt: meta.installedAt,
    queenStatus: os.colonyLost
      ? "No queen — colony loss"
      : lastInsp
        ? lastInsp.queenSeen
          ? `Laying queen confirmed (${lastInsp.date})`
          : `Queen not seen at last inspection (${lastInsp.date})`
        : "Unknown — see inspections",
    inspectionCount: os.inspections.length,
    lastInspectionAt: lastInsp?.date ?? null,
    harvestCount: trace.length,
    totalHarvestedKg: Math.round(totalKg * 10) / 10,
  };
  return assemble(meta.name, passport, trace, isDemo, meta.type, os);
}

function assemble(
  name: string,
  passport: HivePassport,
  trace: TraceHarvestLink[],
  isDemo: boolean,
  hiveType: string,
  os = getHiveOSData(passport.id),
): HiveOSView {
  const signals = deriveSignals(os.observations, os.inspections, os.colonyLost, hiveType);
  const assessment = classifyHealth(signals);
  const { confidence } = trustFromEvidence(os.evidence);
  const contextual = os.ambientNote ? [os.ambientNote] : [];
  return {
    passport,
    assessment,
    signals,
    why: explainWhy(name, assessment, signals, contextual, confidence),
    actions: recommendActions(assessment),
    evidence: os.evidence,
    confidence,
    observations: os.observations,
    inspections: os.inspections,
    interventions: os.interventions,
    healthEvents: os.healthEvents,
    ambientNote: os.ambientNote,
    trace,
    isDemo,
  };
}

/* ── apiary intelligence ────────────────────────────────────────────── */

export async function getApiaryOS(): Promise<{ intelligence: ApiaryIntelligence; isDemo: boolean }> {
  const summaries = [];
  let isDemo = false;

  try {
    const hives = await db.hive.findMany({
      include: { farm: { select: { name: true } } },
      orderBy: { name: "asc" },
    });
    if (hives.length) {
      for (const h of hives) {
        const os = getHiveOSData(h.id);
        const signals = deriveSignals(os.observations, os.inspections, os.colonyLost, h.type);
        summaries.push(summarizeHive(h.id, h.name, h.farm?.name ?? "Unassigned", classifyHealth(signals)));
      }
      return { intelligence: apiaryIntelligence(summaries, demoCodeFor), isDemo: false };
    }
  } catch {
    // fall through to demo
  }

  isDemo = true;
  for (const meta of DEMO_HIVE_METAS) {
    const os = getHiveOSData(meta.id);
    const signals = deriveSignals(os.observations, os.inspections, os.colonyLost, meta.type);
    summaries.push(summarizeHive(meta.id, meta.name, meta.farm, classifyHealth(signals)));
  }
  return { intelligence: apiaryIntelligence(summaries, demoCodeFor), isDemo };
}

/** Lightweight hive list for the fleet cards (DB first, demo fallback). */
export async function getHiveFleet(): Promise<
  Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    farm: string;
    region: string;
    harvestCount: number;
    state: HiveHealthState;
    score: number;
  }>
> {
  const assess = (id: string, type: string) => {
    const os = getHiveOSData(id);
    const signals = deriveSignals(os.observations, os.inspections, os.colonyLost, type);
    const a = classifyHealth(signals);
    return { state: a.state, score: a.score };
  };
  try {
    const hives = await db.hive.findMany({
      include: { farm: { select: { name: true, region: true } }, _count: { select: { harvests: true } } },
      orderBy: { name: "asc" },
    });
    if (hives.length) {
      return hives.map((h) => ({
        id: h.id,
        name: h.name,
        type: h.type,
        status: h.status,
        farm: h.farm?.name ?? "Unassigned",
        region: h.farm?.region ?? "—",
        harvestCount: h._count.harvests,
        ...assess(h.id, h.type),
      }));
    }
  } catch {
    // fall through
  }
  return DEMO_HIVE_METAS.map((m) => ({
    id: m.id,
    name: m.name,
    type: m.type,
    status: m.status,
    farm: m.farm,
    region: m.region,
    harvestCount: 3,
    ...assess(m.id, m.type),
  }));
}
