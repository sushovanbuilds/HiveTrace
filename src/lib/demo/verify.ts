import type { DemoBatch, DemoRole, DemoStage } from "@/lib/demo/types";
import { ROLE_LABEL } from "@/lib/demo/config";

/**
 * Pure consumer-verification logic for demo batches. Lives apart from the
 * React component so the golden-path journey is unit-testable and the UI stays
 * a thin renderer. Mirrors exactly the steps a judge is expected to see.
 */

export const STAGE_ORDER: DemoStage[] = [
  "HARVEST",
  "LAB",
  "PROCESSING",
  "PACKAGING",
  "DISTRIBUTION",
  "DELIVERED",
];

export interface ConsumerCheck {
  label: string;
  done: boolean;
}

export interface ConsumerVerdict {
  origin: boolean;
  quality: boolean;
  processing: boolean;
  distribution: boolean;
  /** True when every step above is verified. */
  complete: boolean;
  checks: ConsumerCheck[];
}

export function hasStage(batch: DemoBatch, stage: DemoStage): boolean {
  return batch.events.some((e) => e.stage === stage);
}

export function consumerVerdict(batch: DemoBatch): ConsumerVerdict {
  const origin = hasStage(batch, "HARVEST");
  const quality = batch.quality === "PASSED";
  const processing = hasStage(batch, "PROCESSING");
  const distribution = batch.currentStage === "DISTRIBUTION" || batch.currentStage === "DELIVERED";

  const checks: ConsumerCheck[] = [
    { label: "Origin verified", done: origin },
    { label: "Quality verified", done: quality },
    { label: "Processing verified", done: processing },
    { label: "Distribution verified", done: distribution },
    { label: "Complete traceability", done: origin && quality && processing && distribution },
  ];

  return { origin, quality, processing, distribution, complete: checks.every((c) => c.done), checks };
}

/**
 * The milestone a stage maps to for the provenance journey display. Returns the
 * latest event of the stage so the UI can show date + actor.
 */
export interface JourneyMilestone {
  stage: DemoStage;
  title: string;
  sub: string;
  actor: string;
  role: DemoRole;
  note: string;
  timestamp: string;
}

export function journeyFor(batch: DemoBatch): JourneyMilestone[] {
  return STAGE_ORDER.map((stage) => {
    const evs = batch.events.filter((e) => e.stage === stage);
    const last = evs[evs.length - 1];
    if (!last) return null;
    return {
      stage,
      title: STAGE_TITLE[stage],
      sub: STAGE_SUB[stage],
      actor: last.actorName,
      role: last.role,
      note: last.note,
      timestamp: last.timestamp,
    };
  }).filter((m): m is JourneyMilestone => m !== null);
}

const STAGE_TITLE: Record<DemoStage, string> = {
  HARVEST: "Origin verified",
  LAB: "Quality verified",
  PROCESSING: "Processing verified",
  PACKAGING: "Packaging verified",
  DISTRIBUTION: "Distribution verified",
  DELIVERED: "Delivered to retail",
};

const STAGE_SUB: Record<DemoStage, string> = {
  HARVEST: "Hive & harvest",
  LAB: "Laboratory analysis",
  PROCESSING: "Processing & filtration",
  PACKAGING: "Lot sealed, QR labels",
  DISTRIBUTION: "In transit to retail",
  DELIVERED: "Delivered to retail",
};

export const ROLE_ICON_MAP: Record<string, string> = {
  BEEKEEPER: "hive",
  ANALYST: "science",
  PROCESSOR: "factory",
  DISTRIBUTOR: "local_shipping",
};

export function roleLabel(role: DemoRole): string {
  return ROLE_LABEL[role] ?? role;
}
