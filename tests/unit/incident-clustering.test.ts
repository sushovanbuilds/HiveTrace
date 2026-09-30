import { describe, expect, it } from "vitest";
import {
  clusterAlerts,
  clusterIdFor,
  formatWindow,
  formatDay,
  CLUSTER_TIME_WINDOW_MS,
  type ClusterAlert,
} from "@/lib/incidents/clustering";
import { buildDemoFeed } from "@/lib/incidents/demo-feed";

let counter = 0;

function makeAlert(overrides: Partial<ClusterAlert> = {}): ClusterAlert {
  counter += 1;
  return {
    id: `alert_${counter}`,
    signal: "DUPLICATE_QR_SCAN",
    batchId: `batch_${counter}`,
    publicCode: `HC-TEST-${counter}`,
    supplierId: "org_a",
    supplierName: "Supplier A",
    location: "Nashik, Maharashtra",
    observedAt: Date.parse("2026-09-02T06:00:00.000Z"),
    batchFamily: [`batch_${counter}`],
    ...overrides,
  };
}

describe("clusterAlerts grouping", () => {
  it("groups alerts sharing anomaly type and supplier into one incident", () => {
    const clusters = clusterAlerts([makeAlert(), makeAlert(), makeAlert()]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].alertCount).toBe(3);
  });

  it("never merges different anomaly types", () => {
    const clusters = clusterAlerts([
      makeAlert({ signal: "DUPLICATE_QR_SCAN" }),
      makeAlert({ signal: "GPS_MISMATCH" }),
    ]);
    expect(clusters).toHaveLength(2);
  });

  it("keeps same-signal alerts apart when supplier, location, time, and family all differ", () => {
    const far = CLUSTER_TIME_WINDOW_MS * 2;
    const clusters = clusterAlerts([
      makeAlert({ supplierId: "org_a", supplierName: "Supplier A", location: "Nashik" }),
      makeAlert({
        supplierId: "org_b",
        supplierName: "Supplier B",
        location: "Pune",
        observedAt: Date.parse("2026-09-02T06:00:00.000Z") + far,
        batchFamily: ["other_family"],
      }),
    ]);
    expect(clusters).toHaveLength(2);
  });

  it("joins on the time window when nothing else is shared", () => {
    const clusters = clusterAlerts([
      makeAlert({ supplierId: "org_a", supplierName: "Supplier A", location: "Nashik" }),
      makeAlert({
        supplierId: "org_b",
        supplierName: "Supplier B",
        location: "Pune",
        observedAt: Date.parse("2026-09-02T06:00:00.000Z") + 60 * 60 * 1000,
        batchFamily: ["other_family"],
      }),
    ]);
    expect(clusters).toHaveLength(1);
  });

  it("joins on a shared batch family (lineage relationship)", () => {
    const far = CLUSTER_TIME_WINDOW_MS * 3;
    const clusters = clusterAlerts([
      makeAlert({
        supplierId: "org_a",
        supplierName: "Supplier A",
        location: "Nashik",
        batchFamily: ["blend_1", "source_9"],
      }),
      makeAlert({
        supplierId: "org_b",
        supplierName: "Supplier B",
        location: "Pune",
        observedAt: Date.parse("2026-09-02T06:00:00.000Z") + far,
        batchFamily: ["source_9"],
      }),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].commonFactors.find((f) => f.dimension === "batch relationship")).toBeDefined();
  });

  it("is deterministic: shuffled input yields identical clusters", () => {
    const alerts = [
      makeAlert({ supplierId: "org_a", supplierName: "Supplier A" }),
      makeAlert({ supplierId: "org_a", supplierName: "Supplier A" }),
      makeAlert({ supplierId: "org_b", supplierName: "Supplier B", location: "Pune", observedAt: Date.parse("2026-10-01T00:00:00.000Z") }),
    ];
    const summarize = (input: ClusterAlert[]) =>
      clusterAlerts(input).map((c) => ({
        id: c.id,
        alertCount: c.alertCount,
        alertIds: c.alerts.map((a) => a.id),
      }));
    expect(summarize([...alerts].reverse())).toEqual(summarize(alerts));
  });

  it("orders clusters by risk, then alert count", () => {
    const clusters = clusterAlerts([
      makeAlert({ signal: "MISSING_EVIDENCE" }),
      makeAlert({ signal: "DUPLICATE_QR_SCAN" }),
    ]);
    expect(clusters[0].signal).toBe("DUPLICATE_QR_SCAN");
  });
});

describe("cluster description", () => {
  it("reports affected batches, common factors, timeline, and root context", () => {
    const [cluster] = clusterAlerts([makeAlert(), makeAlert()]);
    expect(cluster.affectedBatches).toHaveLength(2);
    expect(cluster.commonFactors.find((f) => f.dimension === "anomaly type")?.coverage).toBe(1);
    expect(cluster.commonFactors.find((f) => f.dimension === "supplier")?.value).toBe("Supplier A");
    expect(cluster.timeline.start).toBeLessThanOrEqual(cluster.timeline.end);
    expect(cluster.timeline.entries.length).toBeGreaterThan(0);
    expect(cluster.investigationStatus).toBe("OPEN");
  });

  it("words the root context as investigative context, never a finding", () => {
    const [cluster] = clusterAlerts([makeAlert()]);
    expect(cluster.probableRootContext).toMatch(/not a finding/);
    expect(cluster.probableRootContext.toLowerCase()).not.toMatch(/fraud/);
  });

  it("truncates long timelines instead of rendering every entry", () => {
    const alerts = Array.from({ length: 20 }, (_, i) =>
      makeAlert({ observedAt: Date.parse("2026-09-02T06:00:00.000Z") + i * 1000 }),
    );
    const [cluster] = clusterAlerts(alerts);
    expect(cluster.timeline.truncated).toBe(true);
    expect(cluster.timeline.entries).toHaveLength(8);
  });
});

describe("cluster ids and formatting", () => {
  it("builds deterministic, human-readable cluster ids", () => {
    const id = clusterIdFor("DUPLICATE_QR_SCAN", "Green Valley Apiaries", Date.parse("2026-09-02T06:00:00.000Z"));
    expect(id).toBe("inc_duplicate_qr_scan_green_valley_apiaries_202609");
    expect(clusterIdFor("DUPLICATE_QR_SCAN", "Green Valley Apiaries", Date.parse("2026-09-02T06:00:00.000Z"))).toBe(id);
  });

  it("formats windows deterministically in UTC", () => {
    expect(formatDay(Date.parse("2026-09-02T06:00:00.000Z"))).toBe("2 Sep 2026");
    expect(
      formatWindow(
        Date.parse("2026-09-02T06:00:00.000Z"),
        Date.parse("2026-09-02T12:40:00.000Z"),
      ),
    ).toBe("2 Sep 2026, 06:00–12:40 UTC");
  });
});

describe("demo feed clustering", () => {
  it("groups 18,400 duplicate scans into exactly one incident cluster", () => {
    const clusters = clusterAlerts(buildDemoFeed());
    const dup = clusters.find((c) => c.signal === "DUPLICATE_QR_SCAN");
    expect(dup).toBeDefined();
    expect(dup!.alertCount).toBe(18_400);
    expect(dup!.affectedBatches).toHaveLength(64);
    expect(dup!.risk.band).toBe("HIGH");
    expect(dup!.risk.points).toBe(90);
    expect(
      dup!.commonFactors.find((f) => f.dimension === "supplier"),
    ).toMatchObject({ value: "Green Valley Apiaries", coverage: 1 });
  });

  it("produces four deterministic clusters in total", () => {
    const clusters = clusterAlerts(buildDemoFeed());
    expect(clusters.map((c) => c.id)).toEqual([
      "inc_duplicate_qr_scan_green_valley_apiaries_202609",
      "inc_custody_gap_amrit_honey_processors_202609",
      "inc_gps_mismatch_green_valley_apiaries_202608",
      "inc_missing_evidence_green_valley_apiaries_202608",
    ]);
  });

  it("clusters the three custody gaps via their shared batch family", () => {
    const clusters = clusterAlerts(buildDemoFeed());
    const custody = clusters.find((c) => c.signal === "CUSTODY_GAP")!;
    expect(custody.alertCount).toBe(3);
    expect(custody.affectedBatches).toHaveLength(3);
  });

  it("keeps the GPS mismatch as its own single-alert incident", () => {
    const clusters = clusterAlerts(buildDemoFeed());
    const gps = clusters.find((c) => c.signal === "GPS_MISMATCH")!;
    expect(gps.alertCount).toBe(1);
    expect(gps.affectedBatches[0].publicCode).toBe("HC-2026-00281");
    expect(gps.risk.contributions[0].evidence.length).toBeGreaterThan(0);
  });

  it("builds the identical feed on every run", () => {
    const a = buildDemoFeed();
    const b = buildDemoFeed();
    expect(a).toEqual(b);
    expect(a).toHaveLength(18_405);
  });
});
