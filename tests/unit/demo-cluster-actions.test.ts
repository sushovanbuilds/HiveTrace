import { describe, expect, it } from "vitest";
import {
  loadDemoData,
  reviewClusterCase,
  confirmClusterCase,
  dismissClusterCase,
  resolveClusterCase,
  addClusterCaseNote,
  confirmAnomaly,
} from "@/lib/demo/data";

const DUP_CLUSTER = "inc_duplicate_qr_scan_green_valley_apiaries_202609";

describe("demo cluster cases", () => {
  it("seeds one investigation case per deterministic incident cluster", () => {
    const data = loadDemoData();
    const ids = data.clusterCases.map((c) => c.clusterId).sort();
    expect(ids).toEqual([
      "inc_custody_gap_amrit_honey_processors_202609",
      "inc_duplicate_qr_scan_green_valley_apiaries_202609",
      "inc_gps_mismatch_green_valley_apiaries_202608",
      "inc_missing_evidence_green_valley_apiaries_202608",
    ]);
    for (const c of data.clusterCases) {
      expect(c.status).toBe("OPEN");
      expect(c.notes).toEqual([]);
      expect(c.outcome).toBeNull();
    }
  });

  it("keeps the legacy per-batch incidents seeded alongside cluster cases", () => {
    const data = loadDemoData();
    expect(data.incidents.some((i) => i.batchId === "HC-2026-00281")).toBe(true);
  });
});

describe("human investigation actions", () => {
  it("review moves OPEN → UNDER_REVIEW and records who started", () => {
    const data = reviewClusterCase(loadDemoData(), DUP_CLUSTER, "Dr. Anand Mehta");
    const c = data.clusterCases.find((x) => x.clusterId === DUP_CLUSTER)!;
    expect(c.status).toBe("UNDER_REVIEW");
    expect(c.notes).toHaveLength(1);
    expect(c.notes[0].kind).toBe("STATUS");
    expect(c.notes[0].text).toMatch(/Dr\. Anand Mehta started reviewing/);
  });

  it("review is a no-op once the case is already under review", () => {
    let data = reviewClusterCase(loadDemoData(), DUP_CLUSTER, "A");
    data = reviewClusterCase(data, DUP_CLUSTER, "A");
    expect(data.clusterCases.find((x) => x.clusterId === DUP_CLUSTER)!.notes).toHaveLength(1);
  });

  it("confirm records a confirmation note without closing the case", () => {
    const data = confirmClusterCase(loadDemoData(), DUP_CLUSTER, "A", "Print logs show the re-issue.");
    const c = data.clusterCases.find((x) => x.clusterId === DUP_CLUSTER)!;
    expect(c.status).toBe("UNDER_REVIEW");
    expect(c.notes[0].kind).toBe("CONFIRMATION");
    expect(c.notes[0].text).toBe("Print logs show the re-issue.");
  });

  it("dismiss requires a reason and records the outcome", () => {
    const unchanged = dismissClusterCase(loadDemoData(), DUP_CLUSTER, "A", "   ");
    expect(unchanged.clusterCases.find((x) => x.clusterId === DUP_CLUSTER)!.status).toBe("OPEN");

    const data = dismissClusterCase(loadDemoData(), DUP_CLUSTER, "A", "Printer re-issued the codes; supplier confirmed.");
    const c = data.clusterCases.find((x) => x.clusterId === DUP_CLUSTER)!;
    expect(c.status).toBe("DISMISSED");
    expect(c.outcome).toBe("Printer re-issued the codes; supplier confirmed.");
  });

  it("resolve requires a resolution and stores the decision with it", () => {
    const unchanged = resolveClusterCase(loadDemoData(), DUP_CLUSTER, "A", "  ", "FALSE_POSITIVE");
    expect(unchanged.clusterCases.find((x) => x.clusterId === DUP_CLUSTER)!.status).toBe("OPEN");

    const data = resolveClusterCase(
      loadDemoData(),
      DUP_CLUSTER,
      "A",
      "Label stock audited; duplicate codes revoked.",
      "SUPPLIER_ERROR",
    );
    const c = data.clusterCases.find((x) => x.clusterId === DUP_CLUSTER)!;
    expect(c.status).toBe("RESOLVED");
    expect(c.outcome).toBe("SUPPLIER_ERROR — Label stock audited; duplicate codes revoked.");
  });

  it("adding a note never changes the status", () => {
    let data = reviewClusterCase(loadDemoData(), DUP_CLUSTER, "A");
    data = addClusterCaseNote(data, DUP_CLUSTER, "A", "Called the supplier; awaiting print logs.");
    const c = data.clusterCases.find((x) => x.clusterId === DUP_CLUSTER)!;
    expect(c.status).toBe("UNDER_REVIEW");
    expect(c.notes.at(-1)).toMatchObject({ kind: "NOTE", text: "Called the supplier; awaiting print logs." });
  });

  it("ignores unknown cluster ids", () => {
    const before = loadDemoData();
    const after = reviewClusterCase(before, "inc_nope", "A");
    expect(after).toBe(before);
  });

  it("keeps the legacy confirmAnomaly flow working", () => {
    const data = confirmAnomaly(loadDemoData(), "HC-2026-00281");
    expect(data.incidents.some((i) => i.batchId === "HC-2026-00281")).toBe(true);
  });
});
