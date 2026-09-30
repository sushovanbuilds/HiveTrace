import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildJourneyStages,
  CANONICAL_STAGES,
  currentStageToCanonical,
  eventTypeToStage,
  getHarvestDetail,
} from "@/lib/trace/chain";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    harvest: { findUnique: vi.fn() },
  },
}));

const mockedHarvestFind = vi.mocked(db.harvest.findUnique);

beforeEach(() => {
  mockedHarvestFind.mockReset();
});

describe("eventTypeToStage", () => {
  it("maps milestone events onto the canonical chain", () => {
    expect(eventTypeToStage("HARVEST")).toBe("HARVEST");
    expect(eventTypeToStage("QUALITY_TEST")).toBe("LAB");
    expect(eventTypeToStage("LAB_RESULT")).toBe("LAB");
    expect(eventTypeToStage("PROCESSING")).toBe("PROCESSING");
    expect(eventTypeToStage("PACKAGING")).toBe("PACKAGING");
    expect(eventTypeToStage("SHIPMENT")).toBe("DISTRIBUTION");
    expect(eventTypeToStage("QR_ISSUED")).toBe("CONSUMER_QR");
    expect(eventTypeToStage("RETAIL_LISTING")).toBe("CONSUMER_QR");
  });

  it("ignores supporting-evidence events that are not stage milestones", () => {
    expect(eventTypeToStage("CUSTODY_TRANSFER")).toBeNull();
    expect(eventTypeToStage("NOTE")).toBeNull();
    expect(eventTypeToStage("ANCHOR_CREATED")).toBeNull();
    expect(eventTypeToStage("DOCUMENT_ATTACHED")).toBeNull();
    expect(eventTypeToStage("BATCH_UPDATED")).toBeNull();
    expect(eventTypeToStage("WHATEVER")).toBeNull();
  });
});

describe("currentStageToCanonical", () => {
  it("maps every batch stage onto the chain", () => {
    expect(currentStageToCanonical("HARVEST")).toBe("HARVEST");
    expect(currentStageToCanonical("COLLECTION")).toBe("DISTRIBUTION");
    expect(currentStageToCanonical("LAB")).toBe("LAB");
    expect(currentStageToCanonical("PROCESSING")).toBe("PROCESSING");
    expect(currentStageToCanonical("PACKAGING")).toBe("PACKAGING");
    expect(currentStageToCanonical("DISTRIBUTION")).toBe("DISTRIBUTION");
    expect(currentStageToCanonical("RETAIL")).toBe("CONSUMER_QR");
  });

  it("returns null for unknown or missing stages", () => {
    expect(currentStageToCanonical("UNKNOWN")).toBeNull();
    expect(currentStageToCanonical(null)).toBeNull();
    expect(currentStageToCanonical(undefined)).toBeNull();
  });
});

describe("buildJourneyStages", () => {
  it("always yields the eight canonical stages in order", () => {
    const stages = buildJourneyStages({ events: [], hasHive: false, hasHarvest: false });
    expect(stages.map((s) => s.key)).toEqual(CANONICAL_STAGES.map((s) => s.key));
    expect(stages).toHaveLength(8);
  });

  it("marks a complete farm-to-shelf chain done (batch_4 shape)", () => {
    const stages = buildJourneyStages({
      events: [
        { type: "HARVEST", timestamp: "2026-06-02T06:15:00Z" },
        { type: "CUSTODY_TRANSFER", timestamp: "2026-06-04T09:30:00Z" },
        { type: "QUALITY_TEST", timestamp: "2026-06-08T13:00:00Z" },
        { type: "LAB_RESULT", timestamp: "2026-06-10T09:00:00Z" },
        { type: "PROCESSING", timestamp: "2026-06-14T11:00:00Z" },
        { type: "PACKAGING", timestamp: "2026-06-16T10:00:00Z" },
        { type: "SHIPMENT", timestamp: "2026-06-19T06:00:00Z" },
        { type: "RETAIL_LISTING", timestamp: "2026-06-22T09:00:00Z" },
      ],
      currentStage: "RETAIL",
      hasHive: true,
      hasHarvest: true,
      harvestDate: "2026-06-02T06:15:00.000Z",
    });
    for (const s of stages) expect(s.status).toBe("done");
    const harvest = stages.find((s) => s.key === "HARVEST")!;
    expect(harvest.date).toBe("2026-06-02T06:15:00.000Z");
  });

  it("marks the in-progress stage active and later stages pending (batch_2 shape)", () => {
    const stages = buildJourneyStages({
      events: [
        { type: "HARVEST", timestamp: "2026-04-10T07:00:00Z" },
        { type: "CUSTODY_TRANSFER", timestamp: "2026-04-15T11:00:00Z" },
      ],
      currentStage: "LAB",
      hasHive: true,
      hasHarvest: true,
    });
    const byKey = Object.fromEntries(stages.map((s) => [s.key, s.status]));
    expect(byKey).toMatchObject({
      HIVE: "done",
      HARVEST: "done",
      BATCH: "done",
      LAB: "active",
      PROCESSING: "pending",
      PACKAGING: "pending",
      DISTRIBUTION: "pending",
      CONSUMER_QR: "pending",
    });
  });

  it("treats quality tests without LAB events as lab-complete", () => {
    const stages = buildJourneyStages({
      events: [{ type: "HARVEST", timestamp: "2026-05-01T06:30:00Z" }],
      currentStage: "HARVEST",
      hasHive: true,
      hasHarvest: true,
      labCompleted: true,
    });
    expect(stages.find((s) => s.key === "LAB")!.status).toBe("done");
  });

  it("leaves hive and harvest pending when no origin is known", () => {
    const stages = buildJourneyStages({ events: [], hasHive: false, hasHarvest: false });
    expect(stages.find((s) => s.key === "HIVE")!.status).toBe("pending");
    expect(stages.find((s) => s.key === "HARVEST")!.status).toBe("pending");
    expect(stages.find((s) => s.key === "BATCH")!.status).toBe("done");
  });

  it("passes consumer-safe notes and hrefs through untouched", () => {
    const stages = buildJourneyStages({
      events: [],
      hasHive: true,
      hasHarvest: true,
      notes: { HIVE: "Hive A1 · Valley Heights" },
      hrefs: { HIVE: "/hives/hive_1" },
    });
    const hive = stages.find((s) => s.key === "HIVE")!;
    expect(hive.note).toBe("Hive A1 · Valley Heights");
    expect(hive.href).toBe("/hives/hive_1");
    // The builder never invents internal fields.
    for (const s of stages) {
      expect(Object.keys(s).sort()).toEqual(
        ["date", "href", "icon", "key", "label", "note", "status"].sort(),
      );
    }
  });
});

describe("getHarvestDetail — database loader", () => {
  const harvestRow = {
    id: "harv_1",
    date: new Date("2026-03-15T06:00:00Z"),
    quantity: 45,
    honeyType: "MUSTARD",
    hive: {
      id: "hive_1",
      name: "Hive A1",
      farm: { name: "Valley Heights", region: "Himachal Pradesh" },
      harvests: [{ id: "harv_1", date: new Date("2026-03-15T06:00:00Z"), quantity: 45, honeyType: "MUSTARD" }],
    },
    batches: [
      {
        id: "batch_1",
        publicCode: "HC-2026-K7QM2X",
        currentStage: "PROCESSING",
        qualityStatus: "PASSED",
        riskState: "LOW",
        events: [{ type: "HARVEST", timestamp: new Date("2026-03-15T06:00:00Z") }],
      },
    ],
  };

  it("resolves harvest → hive and resulting batches", async () => {
    mockedHarvestFind.mockResolvedValue(harvestRow as never);
    const detail = await getHarvestDetail("harv_1");
    expect(detail).not.toBeNull();
    expect(detail!.hive?.id).toBe("hive_1");
    expect(detail!.hive?.name).toBe("Hive A1");
    expect(detail!.hive?.farmName).toBe("Valley Heights");
    expect(detail!.batches).toHaveLength(1);
    expect(detail!.batches[0]!.publicCode).toBe("HC-2026-K7QM2X");
    expect(detail!.batches[0]!.currentStage).toBe("PROCESSING");
  });

  it("returns null for an unknown harvest", async () => {
    mockedHarvestFind.mockResolvedValue(null);
    expect(await getHarvestDetail("nope")).toBeNull();
  });

  it("returns null — never throws — when the database is unreachable", async () => {
    mockedHarvestFind.mockRejectedValue(new Error("connect ECONNREFUSED"));
    expect(await getHarvestDetail("harv_1")).toBeNull();
  });
});
