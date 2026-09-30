/**
 * Server-safe deterministic demo seed.
 *
 * Extracted from the client-side demo data service (`./data.ts`, which
 * persists the live dataset in localStorage and therefore carries
 * `"use client"`). This module is pure and dependency-free apart from the
 * deterministic incident feed/clusterer, so server components — e.g. the
 * public verification certificate — can read the seed without touching
 * browser state.
 */

import type {
  DemoBatch,
  DemoBatchEvent,
  DemoClusterCase,
  DemoData,
  DemoIncident,
  DemoRole,
  DemoStage,
} from "@/lib/demo/types";
import { buildDemoFeed } from "@/lib/incidents/demo-feed";
import { clusterAlerts } from "@/lib/incidents/clustering";

/* ── Initial deterministic dataset ─────────────────────────────────── */

function now(): string {
  return new Date().toISOString();
}

export function makeEvent(
  batchId: string,
  stage: DemoStage,
  role: DemoRole,
  actor: string,
  actorName: string,
  note: string,
  type: string = stage,
  timestamp: string = now(),
): DemoBatchEvent {
  return { batchId, type, stage, actor, actorName, role, note, timestamp };
}

export function seedDemoData(): DemoData {
  const happy = "HC-2026-00124";
  const risky = "HC-2026-00281";

  // Fixed timestamps keep the deterministic seed identical across server render
  // and client hydration (a `now()`-derived seed would diverge and fail
  // hydration). Mutations that happen during the demo still use real time.
  const harvestEvent = makeEvent(
    happy,
    "HARVEST",
    "BEEKEEPER",
    "ravi@greenvalley.in",
    "Ravi Kumar",
    "Harvested 420 kg of Mustard honey at Valley Heights apiary, Purulia.",
    "HARVEST_CREATED",
    "2026-08-21T06:30:00.000Z",
  );

  const happyBatch: DemoBatch = {
    id: happy,
    publicCode: happy,
    honeyType: "Mustard Honey",
    floralSource: "Brassica juncea",
    originRegion: "Purulia, West Bengal",
    quantityKg: 420,
    currentStage: "HARVEST",
    quality: "PENDING",
    risk: "LOW",
    anomaly: "NONE",
    events: [harvestEvent],
    qualityResults: [],
    createdAt: harvestEvent.timestamp,
  };

  const gpsEvent = makeEvent(
    risky,
    "HARVEST",
    "BEEKEEPER",
    "ravi@greenvalley.in",
    "Ravi Kumar",
    "Harvest recorded, but GPS trail drifts 11 km from declared apiary.",
    "HARVEST_CREATED",
    "2026-08-22T08:45:00.000Z",
  );

  const riskyBatch: DemoBatch = {
    id: risky,
    publicCode: risky,
    honeyType: "Wildflower Honey",
    floralSource: "Mixed wild flora",
    originRegion: "Nashik, Maharashtra",
    quantityKg: 260,
    currentStage: "HARVEST",
    quality: "PENDING",
    risk: "HIGH",
    anomaly: "GPS_MISMATCH",
    events: [gpsEvent],
    qualityResults: [],
    createdAt: gpsEvent.timestamp,
  };

  const incident: DemoIncident = {
    id: "inc_2026_00281",
    batchId: risky,
    publicCode: risky,
    title: "GPS mismatch on harvest origin",
    severity: "HIGH",
    status: "OPEN",
    description:
      "The registered apiary coordinates for HC-2026-00281 drift more than the allowed radius from the declared harvest location. Flagged for review.",
    createdAt: gpsEvent.timestamp,
  };

  return { batches: [happyBatch, riskyBatch], incidents: [incident], clusterCases: seedClusterCases() };
}

/**
 * One investigation case per deterministic incident cluster. Computed from
 * the same feed + clusterer the Risk Center renders, so case ids always line
 * up with what the page shows.
 */
export function seedClusterCases(): DemoClusterCase[] {
  const clusters = clusterAlerts(buildDemoFeed());
  return clusters.map((cluster) => ({
    clusterId: cluster.id,
    title: cluster.title,
    status: "OPEN" as const,
    outcome: null,
    notes: [],
    // Fixed seed timestamp — real actions stamp real time via now().
    updatedAt: "2026-09-04T00:00:00.000Z",
  }));
}


/* ── Snapshot + selectors ──────────────────────────────────────────── */

/**
 * Deterministic snapshot used during SSR/hydration. The seed uses fixed
 * timestamps, so this is byte-identical across the server and the client.
 */
export const DEMO_DATA_SERVER_SNAPSHOT: DemoData = seedDemoData();

export function getBatch(data: DemoData, batchId: string): DemoBatch | undefined {
  return data.batches.find((b) => b.id === batchId || b.publicCode === batchId);
}

export function getBatchByCode(data: DemoData, code: string): DemoBatch | undefined {
  return data.batches.find((b) => b.publicCode === code);
}
