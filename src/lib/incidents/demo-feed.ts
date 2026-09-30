/**
 * Deterministic demo alert feed for the Risk / Incident Center.
 *
 * Produces the individual anomaly signals the demo is built around:
 *
 * - 1 GPS-mismatch signal on HC-2026-00281 (the seeded demo anomaly),
 * - 1 missing-evidence signal on HC-2026-00124 (no lab test recorded yet),
 * - 3 custody-gap signals from one processor inside one time window,
 * - 18,400 duplicate-QR-scan signals from one supplier in one morning —
 *   the "many alerts → one incident cluster" story.
 *
 * Every timestamp, code, and count is a fixed constant. No randomness, no
 * clock reads: re-running this yields byte-identical output, which is what
 * makes the clustering demo reproducible for a judge.
 */

import { evidenceForSignal } from "./signals";
import type { ClusterAlert } from "./clustering";

const GREEN_VALLEY = { id: "org_green_valley", name: "Green Valley Apiaries" };
const AMRIT = { id: "org_amrit", name: "Amrit Honey Processors" };

function buildDuplicateScanFeed(): ClusterAlert[] {
  // 18,400 scans, 64 batch families, one 6-hour window. Values cycle
  // deterministically off the index — no RNG anywhere.
  const start = Date.parse("2026-09-02T06:00:00.000Z");
  const spanMs = 6 * 60 * 60 * 1000;
  const cities = ["Mumbai, Maharashtra", "Pune, Maharashtra", "Nagpur, Maharashtra"];
  const alerts: ClusterAlert[] = [];

  // A handful of shared evidence objects, reused across alerts — the facts
  // are identical for alerts in the same cycle position.
  const evidenceVariants = [0, 1, 2, 3, 4].map((variant) =>
    evidenceForSignal("DUPLICATE_QR_SCAN", {
      scanCount: String(3 + variant),
      scanLocations: `${cities[variant % 3]} + ${cities[(variant + 1) % 3]}`,
      timeSpan: "under 40 minutes",
    }),
  );

  for (let i = 0; i < 18_400; i++) {
    const family = `HC-2026-GV-${String((i % 64) + 1).padStart(4, "0")}`;
    alerts.push({
      id: `syn_dupqr_${String(i).padStart(5, "0")}`,
      signal: "DUPLICATE_QR_SCAN",
      batchId: family,
      publicCode: family,
      honeyType: "Wildflower Honey",
      supplierId: GREEN_VALLEY.id,
      supplierName: GREEN_VALLEY.name,
      location: "Nashik, Maharashtra",
      // Evenly spread across the window, deterministic to the millisecond.
      observedAt: start + Math.floor((i * spanMs) / 18_400),
      batchFamily: [family],
      evidence: evidenceVariants[i % 5],
    });
  }
  return alerts;
}

/** The full deterministic feed: individual signals plus the volume story. */
export function buildDemoFeed(): ClusterAlert[] {
  const feed: ClusterAlert[] = [
    {
      id: "demo_gps_00281",
      signal: "GPS_MISMATCH",
      batchId: "HC-2026-00281",
      publicCode: "HC-2026-00281",
      honeyType: "Wildflower Honey",
      supplierId: GREEN_VALLEY.id,
      supplierName: GREEN_VALLEY.name,
      location: "Nashik, Maharashtra",
      observedAt: Date.parse("2026-08-22T08:45:00.000Z"),
      batchFamily: ["HC-2026-00281"],
      evidence: evidenceForSignal("GPS_MISMATCH", {
        expectedLocation: "Valley Heights apiary, Nashik, Maharashtra",
        detectedLocation: "GPS trail ~11 km east of declared apiary",
        distance: "~11 km",
      }),
    },
    {
      id: "demo_missing_00124",
      signal: "MISSING_EVIDENCE",
      batchId: "HC-2026-00124",
      publicCode: "HC-2026-00124",
      honeyType: "Mustard Honey",
      supplierId: GREEN_VALLEY.id,
      supplierName: GREEN_VALLEY.name,
      location: "Purulia, West Bengal",
      observedAt: Date.parse("2026-08-21T06:30:00.000Z"),
      batchFamily: ["HC-2026-00124"],
      evidence: evidenceForSignal("MISSING_EVIDENCE", {
        expectedEvidence: "Quality test (moisture / HMF)",
        stage: "HARVEST",
      }),
    },
    // Three custody gaps from one processor inside one afternoon: they share
    // the supplier, the location, and the time window, so they cluster.
    ...[0, 1, 2].map((n): ClusterAlert => {
      const code = `HC-2026-AP-${110 + n}`;
      return {
        id: `demo_custody_${n}`,
        signal: "CUSTODY_GAP",
        batchId: code,
        publicCode: code,
        honeyType: "Eucalyptus Honey",
        supplierId: AMRIT.id,
        supplierName: AMRIT.name,
        location: "Pune, Maharashtra",
        observedAt: Date.parse("2026-09-03T14:00:00.000Z") + n * 47 * 60 * 1000,
        batchFamily: [code, "HC-2026-AP-110"],
        evidence: evidenceForSignal("CUSTODY_GAP", {
          expectedHolder: "Amrit Honey Processors",
          recordedHolder: "Unregistered transporter",
          missingStep: "Collection hand-off record",
        }),
      };
    }),
    ...buildDuplicateScanFeed(),
  ];
  return feed;
}
