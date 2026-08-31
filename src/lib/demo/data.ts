"use client";

import type {
  DemoBatch,
  DemoBatchEvent,
  DemoQualityResult,
  DemoRole,
  DemoStage,
} from "@/lib/demo/types";

/**
 * Shared demo data service.
 *
 * All four workspaces read and write the SAME dataset, so a batch can travel
 * Beekeeper → Analyst → Processor → Distributor while preserving one identity
 * and one traceability history. Persisted in localStorage for the demo session;
 * the shape is intentionally small and mirror-able behind a `DemoDataService`
 * so a real API can replace it without touching the pages.
 *
 * The dataset is deterministic: no random anomalies. HC-2026-00124 is the happy
 * path; HC-2026-00281 is a fixed GPS-mismatch incident used to demo risk/alert.
 */

const STORAGE_KEY = "hivetrace_demo_data";

export interface DemoIncident {
  id: string;
  batchId: string;
  publicCode: string;
  title: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED";
  description: string;
  createdAt: string;
}

export interface DemoData {
  batches: DemoBatch[];
  incidents: DemoIncident[];
}

type Listener = (data: DemoData) => void;

const listeners = new Set<Listener>();

function now(): string {
  return new Date().toISOString();
}

/* ── Initial deterministic dataset ─────────────────────────────────── */

function makeEvent(
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

function seed(): DemoData {
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

  return { batches: [happyBatch, riskyBatch], incidents: [incident] };
}

/* ── Load / save / subscribe ───────────────────────────────────────── */

export function loadDemoData(): DemoData {
  if (typeof window === "undefined") return seed();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DemoData;
      if (parsed && Array.isArray(parsed.batches) && Array.isArray(parsed.incidents)) {
        return parsed;
      }
    } catch {
      /* fall through to seed */
    }
  }
  const seeded = seed();
  saveDemoData(seeded);
  return seeded;
}

export function saveDemoData(data: DemoData): void {
  cached = data;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota/serialization errors */
  }
  listeners.forEach((l) => l(data));
}

export function subscribeDemoData(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let cached: DemoData | null = null;

/**
 * Client snapshot for `useSyncExternalStore`. Returns a referentially stable
 * value so React can detect changes (localStorage itself is re-read only when
 * the cache has not been populated yet).
 */
export function getDemoDataSnapshot(): DemoData {
  if (!cached) cached = loadDemoData();
  return cached;
}

/**
 * Deterministic snapshot used during SSR/hydration. The seed uses fixed
 * timestamps, so this is byte-identical across the server and the client —
 * React hydrates against it and only then swaps to the live localStorage data.
 */
export const DEMO_DATA_SERVER_SNAPSHOT: DemoData = seed();

/** Reset the shared demo dataset to the deterministic seed (demo control only). */
export function resetDemoData(): void {
  saveDemoData(seed());
}

/* ── Selectors ─────────────────────────────────────────────────────── */

export function getBatch(data: DemoData, batchId: string): DemoBatch | undefined {
  return data.batches.find((b) => b.id === batchId || b.publicCode === batchId);
}

export function getBatchByCode(data: DemoData, code: string): DemoBatch | undefined {
  return data.batches.find((b) => b.publicCode === code);
}

/* ── Mutations (idempotent, deterministic) ─────────────────────────── */

function patchBatch(data: DemoData, batchId: string, fn: (b: DemoBatch) => DemoBatch): DemoData {
  return {
    ...data,
    batches: data.batches.map((b) => (b.id === batchId ? fn(b) : b)),
  };
}

function appendEvent(batch: DemoBatch, event: DemoBatchEvent): DemoBatch {
  return { ...batch, events: [...batch.events, event] };
}

/** KEEPER: create a new harvest batch (or update an existing one to HARVEST). */
export function addHarvestBatch(
  data: DemoData,
  input: Pick<DemoBatch, "publicCode" | "honeyType" | "floralSource" | "originRegion" | "quantityKg">,
  actor: { email: string; name: string },
): DemoData {
  const existing = getBatch(data, input.publicCode);
  if (existing) {
    const ev = makeEvent(existing.id, "HARVEST", "BEEKEEPER", actor.email, actor.name, "Harvest quantity updated.", "HARVEST_CREATED");
    return patchBatch(data, existing.id, (b) =>
      appendEvent({ ...b, quantityKg: input.quantityKg, currentStage: "HARVEST" }, ev),
    );
  }
  const id = input.publicCode;
  const ev = makeEvent(id, "HARVEST", "BEEKEEPER", actor.email, actor.name, `Harvested ${input.quantityKg} kg of ${input.honeyType} at ${input.originRegion}.`, "HARVEST_CREATED");
  const batch: DemoBatch = {
    id,
    publicCode: id,
    honeyType: input.honeyType,
    floralSource: input.floralSource,
    originRegion: input.originRegion,
    quantityKg: input.quantityKg,
    currentStage: "HARVEST",
    quality: "PENDING",
    risk: "LOW",
    anomaly: "NONE",
    events: [ev],
    qualityResults: [],
    createdAt: ev.timestamp,
  };
  return { ...data, batches: [...data.batches, batch] };
}

/** ANALYST: record a quality result; sets batch quality and moves it to LAB. */
export function addQualityResult(
  data: DemoData,
  batchId: string,
  result: Pick<DemoQualityResult, "testType" | "result" | "unit">,
  actor: { email: string; name: string; lab: string },
  passed: boolean,
): DemoData {
  return patchBatch(data, batchId, (b) => {
    const qr: DemoQualityResult = {
      ...result,
      batchId: b.id,
      lab: actor.lab,
      passed,
      timestamp: now(),
    };
    const quality = passed ? "PASSED" : "FAILED";
    const ev = makeEvent(
      b.id,
      "LAB",
      "ANALYST",
      actor.email,
      actor.name,
      `${result.testType} ${passed ? "within" : "outside"} specification (${result.result} ${result.unit}).`,
      "LAB_RESULT",
    );
    return appendEvent(
      { ...b, qualityResults: [...b.qualityResults, qr], quality, currentStage: "LAB" },
      { ...ev, quality },
    );
  });
}

/** PROCESSOR: start processing a batch. */
export function startProcessing(
  data: DemoData,
  batchId: string,
  actor: { email: string; name: string },
): DemoData {
  return patchBatch(data, batchId, (b) =>
    appendEvent(b, makeEvent(b.id, "PROCESSING", "PROCESSOR", actor.email, actor.name, "Processing started — creaming and filtration underway.", "PROCESSING")),
  );
}

/** PROCESSOR: complete processing. */
export function completeProcessing(
  data: DemoData,
  batchId: string,
  actor: { email: string; name: string },
): DemoData {
  return patchBatch(data, batchId, (b) =>
    appendEvent({ ...b, currentStage: "PROCESSING" }, makeEvent(b.id, "PROCESSING", "PROCESSOR", actor.email, actor.name, "Processing complete. Retained and ready for packaging.", "PROCESSING")),
  );
}

/** PROCESSOR: create a packaging lot. */
export function createPackagingLot(
  data: DemoData,
  batchId: string,
  actor: { email: string; name: string },
  lotLabel: string,
): DemoData {
  return patchBatch(data, batchId, (b) =>
    appendEvent({ ...b, currentStage: "PACKAGING" }, makeEvent(b.id, "PACKAGING", "PROCESSOR", actor.email, actor.name, `Packaging lot ${lotLabel} sealed with QR-bearing labels.`, "PACKAGING")),
  );
}

/** DISTRIBUTOR: dispatch a shipment. */
export function dispatchShipment(
  data: DemoData,
  batchId: string,
  actor: { email: string; name: string },
): DemoData {
  return patchBatch(data, batchId, (b) =>
    appendEvent({ ...b, currentStage: "DISTRIBUTION" }, makeEvent(b.id, "DISTRIBUTION", "DISTRIBUTOR", actor.email, actor.name, "Shipment dispatched to regional hub.", "SHIPMENT")),
  );
}

/** DISTRIBUTOR: update shipment location (deterministic GPS waypoints). */
export function updateLocation(
  data: DemoData,
  batchId: string,
  actor: { email: string; name: string },
  waypoint: string,
): DemoData {
  return patchBatch(data, batchId, (b) =>
    appendEvent(b, makeEvent(b.id, "DISTRIBUTION", "DISTRIBUTOR", actor.email, actor.name, `Location update: ${waypoint}.`, "SHIPMENT")),
  );
}

/** DISTRIBUTOR: confirm delivery — the batch reaches its terminal stage. */
export function confirmDelivery(
  data: DemoData,
  batchId: string,
  actor: { email: string; name: string },
): DemoData {
  return patchBatch(data, batchId, (b) =>
    appendEvent({ ...b, currentStage: "DELIVERED" }, makeEvent(b.id, "DELIVERED", "DISTRIBUTOR", actor.email, actor.name, "Delivery confirmed. Batch is now in the hands of the retailer.", "SHIPMENT")),
  );
}

/* ── Deterministic anomaly detection ───────────────────────────────── */

/**
 * Re-raises the fixed GPS-mismatch incident for a batch. Deterministic by
 * design: HC-2026-00281 carries the anomaly flag, so "Detect anomaly → assign
 * risk → create incident" always reproduces the same, presentable story.
 *
 * Calling it twice is the analyst's "confirm" step: the incident is already
 * raised, so the second call records the confirmation, resolves the incident
 * and re-pins risk HIGH — giving a live status transition in the Risk Center.
 */
export function confirmAnomaly(data: DemoData, batchId: string): DemoData {
  const batch = getBatch(data, batchId);
  if (!batch || batch.anomaly === "NONE") return data;

  const flagged = data.incidents.some((i) => i.batchId === batchId);
  if (flagged) {
    // Analyst confirmation: resolve the open incident and record it.
    const incidents = data.incidents.map((i) =>
      i.batchId === batchId ? { ...i, status: "RESOLVED" as const } : i,
    );
    return {
      ...patchBatch(data, batchId, (b) =>
        appendEvent({ ...b, risk: "HIGH" }, makeEvent(b.id, "HARVEST", "ANALYST", "system", "HiveTrace Risk Engine", "Anomaly confirmed by analyst — incident resolved.", "NOTE")),
      ),
      incidents,
    };
  }

  const incident: DemoIncident = {
    id: `inc_${batchId}`,
    batchId,
    publicCode: batch.publicCode,
    title: "GPS mismatch on harvest origin",
    severity: "HIGH",
    status: "OPEN",
    description:
      "The registered apiary coordinates drift outside the allowed radius from the declared harvest location.",
    createdAt: now(),
  };

  const next = patchBatch(data, batchId, (b) =>
    appendEvent({ ...b, risk: "HIGH" }, makeEvent(b.id, "HARVEST", "BEEKEEPER", "system", "HiveTrace Risk Engine", "GPS mismatch detected → incident raised.", "NOTE")),
  );
  return { ...next, incidents: [incident, ...data.incidents] };
}
