/**
 * HIVETRACE — canonical trace chain.
 *
 * The single relationship every traceability view renders:
 *
 *   HIVE → HARVEST → HONEY BATCH → LAB → PROCESSING → PACKAGING →
 *   DISTRIBUTION → CONSUMER QR
 *
 * This module holds the pure stage-mapping builders (unit-tested, no I/O) and
 * the database loaders that resolve the chain in both directions:
 * batch → harvest → hive ("where did this jar come from") and
 * hive → harvests → batches ("what did this hive produce").
 *
 * Consumer safety: the journey builders only ever accept event types and
 * timestamps plus explicitly passed consumer-safe notes. Actor names, internal
 * notes, inspection/intervention detail and telemetry never flow through here,
 * so consumer pages cannot leak them. Operational data stays off-chain —
 * nothing in this module writes to any ledger.
 */

import { db } from "@/lib/db";

export type CanonicalStageKey =
  | "HIVE"
  | "HARVEST"
  | "BATCH"
  | "LAB"
  | "PROCESSING"
  | "PACKAGING"
  | "DISTRIBUTION"
  | "CONSUMER_QR";

export type StageStatus = "done" | "active" | "pending";

export interface JourneyStage {
  key: CanonicalStageKey;
  label: string;
  icon: string;
  status: StageStatus;
  /** ISO date when this stage was reached, if known. */
  date: string | null;
  /** Consumer-safe one-line summary. Must never contain internal data. */
  note: string | null;
  href: string | null;
}

export const CANONICAL_STAGES: Array<{ key: CanonicalStageKey; label: string; icon: string }> = [
  { key: "HIVE", label: "Hive", icon: "hive" },
  { key: "HARVEST", label: "Harvest", icon: "agriculture" },
  { key: "BATCH", label: "Honey Batch", icon: "inventory_2" },
  { key: "LAB", label: "Lab", icon: "science" },
  { key: "PROCESSING", label: "Processing", icon: "factory" },
  { key: "PACKAGING", label: "Packaging", icon: "package" },
  { key: "DISTRIBUTION", label: "Distribution", icon: "local_shipping" },
  { key: "CONSUMER_QR", label: "Consumer QR", icon: "qr_code_2" },
];

/**
 * Map a batch event type onto the canonical stage it evidences.
 * Returns null for events that are supporting evidence rather than a stage
 * milestone (custody transfers, notes, anchors, documents).
 */
export function eventTypeToStage(type: string): CanonicalStageKey | null {
  switch (type) {
    case "HARVEST":
      return "HARVEST";
    case "QUALITY_TEST":
    case "LAB_RESULT":
      return "LAB";
    case "PROCESSING":
      return "PROCESSING";
    case "PACKAGING":
      return "PACKAGING";
    case "SHIPMENT":
      return "DISTRIBUTION";
    case "QR_ISSUED":
    case "RETAIL_LISTING":
      return "CONSUMER_QR";
    default:
      return null;
  }
}

/** Where the batch's currentStage points on the canonical chain. */
export function currentStageToCanonical(stage: string | null | undefined): CanonicalStageKey | null {
  switch (stage) {
    case "HARVEST":
      return "HARVEST";
    case "COLLECTION":
      return "DISTRIBUTION";
    case "LAB":
      return "LAB";
    case "PROCESSING":
      return "PROCESSING";
    case "PACKAGING":
      return "PACKAGING";
    case "DISTRIBUTION":
      return "DISTRIBUTION";
    case "RETAIL":
      return "CONSUMER_QR";
    default:
      return null;
  }
}

export interface JourneyInput {
  events: Array<{ type: string; timestamp: string | Date }>;
  /** BatchStage string (HARVEST…RETAIL) or null when unknown. */
  currentStage?: string | null;
  hasHive: boolean;
  hasHarvest: boolean;
  /** Defaults to true — callers building a batch journey always have one. */
  hasBatch?: boolean;
  harvestDate?: string | null;
  /** Extra completed-lab signal when quality tests exist without LAB events. */
  labCompleted?: boolean;
  /** Consumer-safe per-stage summaries; never pass internal detail here. */
  notes?: Partial<Record<CanonicalStageKey, string | null>>;
  hrefs?: Partial<Record<CanonicalStageKey, string | null>>;
}

function toISODate(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * Build the eight canonical stages from raw events + batch state.
 * Pure: no I/O, no internal data — safe to unit test and to render for
 * consumers.
 */
export function buildJourneyStages(input: JourneyInput): JourneyStage[] {
  const hasBatch = input.hasBatch ?? true;
  const evidenced = new Map<CanonicalStageKey, string>();
  for (const ev of input.events) {
    const stage = eventTypeToStage(ev.type);
    if (!stage) continue;
    const iso = toISODate(ev.timestamp);
    const prev = evidenced.get(stage);
    if (!prev || iso > prev) evidenced.set(stage, iso);
  }
  const activeKey = currentStageToCanonical(input.currentStage ?? null);

  const statusFor = (key: CanonicalStageKey, known: boolean): StageStatus => {
    if (evidenced.has(key) || (known && (key === "HIVE" || key === "HARVEST" || key === "BATCH"))) return "done";
    if (key === "LAB" && input.labCompleted) return "done";
    if (activeKey === key) return "active";
    return "pending";
  };

  return CANONICAL_STAGES.map(({ key, label, icon }) => {
    const known = key === "HIVE" ? input.hasHive : key === "HARVEST" ? input.hasHarvest : key === "BATCH" ? hasBatch : false;
    let date = evidenced.get(key) ?? null;
    if (!date && (key === "HIVE" || key === "HARVEST") && input.harvestDate) date = input.harvestDate;
    return {
      key,
      label,
      icon,
      status: statusFor(key, known),
      date,
      note: input.notes?.[key] ?? null,
      href: input.hrefs?.[key] ?? null,
    };
  });
}

/* ── database loaders ─────────────────────────────────────────────── */

export interface HarvestDetail {
  id: string;
  date: string;
  quantity: number;
  honeyType: string;
  hive: { id: string; name: string; farmName: string; region: string } | null;
  batches: Array<{
    id: string;
    publicCode: string;
    currentStage: string;
    qualityStatus: string;
    riskState: string;
  }>;
}

/** The harvest as the bridge node: which hive it came from, which batches it fed. */
export async function getHarvestDetail(harvestId: string): Promise<HarvestDetail | null> {
  try {
    const harvest = await db.harvest.findUnique({
      where: { id: harvestId },
      include: {
        hive: { include: { farm: { select: { name: true, region: true } } } },
        batches: {
          orderBy: { createdAt: "asc" },
          select: { id: true, publicCode: true, currentStage: true, qualityStatus: true, riskState: true },
        },
      },
    });
    if (!harvest) return null;
    return {
      id: harvest.id,
      date: harvest.date.toISOString(),
      quantity: harvest.quantity,
      honeyType: harvest.honeyType,
      hive: harvest.hive
        ? {
            id: harvest.hive.id,
            name: harvest.hive.name,
            farmName: harvest.hive.farm?.name ?? "Unassigned",
            region: harvest.hive.farm?.region ?? "—",
          }
        : null,
      batches: harvest.batches.map((b) => ({
        id: b.id,
        publicCode: b.publicCode,
        currentStage: b.currentStage,
        qualityStatus: b.qualityStatus,
        riskState: b.riskState,
      })),
    };
  } catch {
    return null;
  }
}
