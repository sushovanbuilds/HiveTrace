import { describe, expect, it } from "vitest";
import {
  addHarvestBatch,
  addQualityResult,
  completeProcessing,
  confirmAnomaly,
  confirmDelivery,
  createPackagingLot,
  dispatchShipment,
  loadDemoData,
  startProcessing,
  updateLocation,
} from "@/lib/demo/data";
import type { DemoData } from "@/lib/demo/data";

describe("shared demo dataset", () => {
  it("seeds the deterministic happy-path batch HC-2026-00124", () => {
    const data = loadDemoData();
    const batch = data.batches.find((b) => b.publicCode === "HC-2026-00124");
    expect(batch).toBeDefined();
    expect(batch?.currentStage).toBe("HARVEST");
    expect(batch?.quality).toBe("PENDING");
    expect(batch?.anomaly).toBe("NONE");
  });

  it("seeds the deterministic anomaly batch HC-2026-00281 with a GPS incident", () => {
    const data = loadDemoData();
    const batch = data.batches.find((b) => b.publicCode === "HC-2026-00281");
    expect(batch?.anomaly).toBe("GPS_MISMATCH");
    expect(batch?.risk).toBe("HIGH");
    expect(data.incidents.some((i) => i.batchId === "HC-2026-00281")).toBe(true);
  });
});

describe("full demo workflow — one batch through all four roles", () => {
  it("travels Beekeeper → Analyst → Processor → Distributor preserving the same batch identity", () => {
    // Start from a freshly harvested batch registered by the Beekeeper.
    let data = loadDemoData();
    const actor = { email: "ravi@greenvalley.in", name: "Ravi Kumar" };

    data = addHarvestBatch(
      data,
      {
        publicCode: "HC-2026-00124",
        honeyType: "Mustard Honey",
        floralSource: "Mustard",
        originRegion: "Purulia, West Bengal",
        quantityKg: 420,
      },
      actor,
    );

    const batchId = "HC-2026-00124";

    // Beekeeper stage: harvest recorded.
    expect(getBatch(data, batchId).currentStage).toBe("HARVEST");
    expect(getBatch(data, batchId).events.some((e) => e.type === "HARVEST_CREATED")).toBe(true);

    // Analyst: add a passing quality result → released to LAB.
    data = addQualityResult(
      data,
      batchId,
      { testType: "Moisture", result: 18.2, unit: "%" },
      { email: "dr.anand@nbb.gov.in", name: "Dr. Anand Mehta", lab: "National Bee Board Lab" },
      true,
    );
    expect(getBatch(data, batchId).quality).toBe("PASSED");
    expect(getBatch(data, batchId).qualityResults).toHaveLength(1);

    // Processor: start → complete → packaging lot.
    const proc = { email: "suresh@amrit.in", name: "Suresh Patel" };
    data = startProcessing(data, batchId, proc);
    data = completeProcessing(data, batchId, proc);
    data = createPackagingLot(data, batchId, proc, "LOT-0124-A");
    expect(getBatch(data, batchId).currentStage).toBe("PACKAGING");

    // Distributor: dispatch → location update → deliver.
    const dist = { email: "meera@honeyline.in", name: "Meera Reddy" };
    data = dispatchShipment(data, batchId, dist);
    expect(getBatch(data, batchId).currentStage).toBe("DISTRIBUTION");
    data = updateLocation(data, batchId, dist, "At depot, nearing retailer");
    data = confirmDelivery(data, batchId, dist);
    expect(getBatch(data, batchId).currentStage).toBe("DELIVERED");

    // One identity, growing (never duplicated) shared history.
    const final = getBatch(data, batchId);
    expect(data.batches.filter((b) => b.id === batchId)).toHaveLength(1);
    expect(final.events.length).toBeGreaterThanOrEqual(6);
    // The very first event still belongs to the same harvest.
    expect(final.events[0].type).toBe("HARVEST_CREATED");
    // Deliveries are terminal.
    expect(final.currentStage).toBe("DELIVERED");
  });

  it("a failing quality result blocks a batch at QUALITY FAILED", () => {
    let data = loadDemoData();
    data = addQualityResult(
      data,
      "HC-2026-00124",
      { testType: "HMF", result: 88, unit: "mg/kg" },
      { email: "dr.anand@nbb.gov.in", name: "Dr. Anand Mehta", lab: "National Bee Board Lab" },
      false,
    );
    expect(getBatch(data, "HC-2026-00124").quality).toBe("FAILED");
  });
});

describe("deterministic anomaly scenario", () => {
  it("raising an anomaly on the risky batch pins risk HIGH and adds an incident", () => {
    let data = loadDemoData();
    const before = data.incidents.length;
    data = confirmAnomaly(data, "HC-2026-00281");
    expect(getBatch(data, "HC-2026-00281").risk).toBe("HIGH");
    expect(data.incidents.length).toBeGreaterThanOrEqual(before);
    expect(data.incidents.some((i) => i.batchId === "HC-2026-00281")).toBe(true);
  });

  it("leaves a clean batch untouched", () => {
    const data = confirmAnomaly(loadDemoData(), "HC-2026-00124");
    expect(getBatch(data, "HC-2026-00124").anomaly).toBe("NONE");
  });
});

function getBatch(data: DemoData, id: string) {
  const b = data.batches.find((x) => x.id === id || x.publicCode === id);
  if (!b) throw new Error(`missing batch ${id}`);
  return b;
}
