/**
 * Deterministic incident clustering.
 *
 * Individual anomaly signals become *incidents* by grouping: alerts that share
 * the anomaly type **and** at least one of — supplier, location, time window,
 * or batch relationship — are merged into one incident cluster. So 18,400
 * duplicate-scan alerts from one supplier in one morning become a single case
 * instead of 18,400 cases.
 *
 * The algorithm is a sorted union-find, which makes it fully deterministic:
 * the same alert set always yields the same clusters, in the same order, with
 * the same ids — no randomness, no learned embeddings, nothing to calibrate.
 */

import {
  ANOMALY_SIGNALS,
  type AnomalySignalId,
  type EvidenceItem,
} from "./signals";
import { scoreCluster, type RiskScore } from "./risk";

/** One anomaly observation, normalised for clustering. */
export interface ClusterAlert {
  id: string;
  signal: AnomalySignalId;
  batchId: string;
  publicCode: string;
  honeyType?: string;
  supplierId: string;
  supplierName: string;
  location: string;
  /** Milliseconds since epoch. */
  observedAt: number;
  /**
   * Batch ids considered the same family (lineage-linked batches, e.g. a blend
   * and its source batches). Alerts touching the same family join up.
   */
  batchFamily: string[];
  evidence?: EvidenceItem[];
}

export interface CommonFactor {
  dimension: "anomaly type" | "supplier" | "location" | "time window" | "batch relationship";
  value: string;
  /** Fraction of the cluster's alerts sharing this factor, 0-1. */
  coverage: number;
}

export interface TimelineEntry {
  at: number;
  label: string;
}

export interface IncidentCluster {
  id: string;
  title: string;
  signal: AnomalySignalId;
  signalLabel: string;
  alerts: ClusterAlert[];
  alertCount: number;
  affectedBatches: Array<{ batchId: string; publicCode: string; honeyType?: string }>;
  commonFactors: CommonFactor[];
  timeline: { start: number; end: number; entries: TimelineEntry[]; truncated: boolean };
  probableRootContext: string;
  /** Clusters are born OPEN; the case store owns every later transition. */
  investigationStatus: "OPEN";
  risk: RiskScore;
}

/** Alerts within this span join on the time dimension (same signal). */
export const CLUSTER_TIME_WINDOW_MS = 72 * 60 * 60 * 1000;

/** Cap on timeline entries rendered per cluster; the rest are aggregated. */
const TIMELINE_ENTRY_LIMIT = 8;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Locale-independent UTC date stamp: "2 Sep 2026". */
export function formatDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Locale-independent UTC time stamp: "06:00". */
function formatTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** "2 Sep 2026, 06:00–12:40 UTC" — deterministic across environments. */
export function formatWindow(start: number, end: number): string {
  const day = formatDay(start);
  if (formatDay(end) === day) return `${day}, ${formatTime(start)}–${formatTime(end)} UTC`;
  return `${day} ${formatTime(start)} UTC – ${formatDay(end)} ${formatTime(end)} UTC`;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

/**
 * Deterministic cluster id from the dominant signal, the top supplier, and
 * the month of the earliest alert. Stable across re-runs of the same data so
 * investigation state can be keyed on it.
 */
export function clusterIdFor(
  signal: AnomalySignalId,
  supplierName: string,
  earliestObservedAt: number,
): string {
  const d = new Date(earliestObservedAt);
  const month = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return `inc_${signal.toLowerCase()}_${slug(supplierName)}_${month}`;
}

/** Human title for a cluster, derived the same way everywhere. */
export function clusterTitleFor(signal: AnomalySignalId, supplierName: string): string {
  return `${ANOMALY_SIGNALS[signal].label} — ${supplierName}`;
}

/* ── Union-find over sorted alerts ─────────────────────────────────── */

function clusterAlertsInternal(alerts: ClusterAlert[]): ClusterAlert[][] {
  // Sort first: every later decision (representatives, chaining, ids) then
  // depends only on content, never on input order.
  const sorted = [...alerts].sort(
    (a, b) => a.observedAt - b.observedAt || a.id.localeCompare(b.id),
  );
  const parent = sorted.map((_, i) => i);
  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) root = parent[root];
    // Path compression along the way back.
    let cursor = i;
    while (parent[cursor] !== root) {
      const next = parent[cursor];
      parent[cursor] = root;
      cursor = next;
    }
    return root;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    // Lower index wins so the representative is the earliest alert —
    // deterministic and human-meaningful.
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
  };

  // Join-key indexes: each maps to the earliest alert index seen with that key.
  const bySupplier = new Map<string, number>();
  const byLocation = new Map<string, number>();
  const byFamily = new Map<string, number>();
  const lastSeenBySignal = new Map<AnomalySignalId, number>();

  sorted.forEach((alert, i) => {
    const join = (map: Map<string, number>, key: string) => {
      const rep = map.get(key);
      if (rep !== undefined) union(i, rep);
      else map.set(key, i);
    };

    // Same signal is required for every join below: an anomaly type never
    // merges with a different anomaly type.
    join(bySupplier, `${alert.signal}|${alert.supplierId}`);
    join(byLocation, `${alert.signal}|${alert.location}`);
    for (const member of new Set(alert.batchFamily)) {
      join(byFamily, `${alert.signal}|${member}`);
    }

    // Time dimension: within the window of the previous same-signal alert.
    // Sorted order makes this the transitive closure of the 72h relation.
    const prev = lastSeenBySignal.get(alert.signal);
    if (prev !== undefined && alert.observedAt - sorted[prev].observedAt <= CLUSTER_TIME_WINDOW_MS) {
      union(i, prev);
    }
    lastSeenBySignal.set(alert.signal, i);
  });

  const groups = new Map<number, ClusterAlert[]>();
  sorted.forEach((alert, i) => {
    const root = find(i);
    const group = groups.get(root);
    if (group) group.push(alert);
    else groups.set(root, [alert]);
  });

  return [...groups.values()];
}

/* ── Cluster description ───────────────────────────────────────────── */

function topShare<T>(values: T[]): { value: T; share: number } {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T = values[0];
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return { value: best, share: bestCount / values.length };
}

function buildCommonFactors(alerts: ClusterAlert[], start: number, end: number): CommonFactor[] {
  const factors: CommonFactor[] = [
    {
      dimension: "anomaly type",
      value: ANOMALY_SIGNALS[alerts[0].signal].label,
      coverage: 1,
    },
  ];

  const supplier = topShare(alerts.map((a) => a.supplierName));
  if (supplier.share >= 0.6) {
    factors.push({ dimension: "supplier", value: supplier.value, coverage: supplier.share });
  }

  const location = topShare(alerts.map((a) => a.location));
  if (location.share >= 0.6) {
    factors.push({ dimension: "location", value: location.value, coverage: location.share });
  }

  factors.push({
    dimension: "time window",
    value: formatWindow(start, end),
    coverage: 1,
  });

  const batchIds = new Set(alerts.map((a) => a.batchId));
  const families = new Set(alerts.flatMap((a) => a.batchFamily));
  factors.push({
    dimension: "batch relationship",
    value:
      families.size <= 1
        ? `${batchIds.size} batch${batchIds.size === 1 ? "" : "es"} in a single batch family`
        : `${batchIds.size} batches across ${families.size} related batch families`,
    coverage: 1,
  });

  return factors;
}

/**
 * Probable root context: the most consistent innocent-or-not explanations the
 * investigator should check first, derived from the dominant signal and the
 * common factors. Worded as investigative context throughout — it never
 * declares fraud, because a pattern is a reason to look, not a finding.
 */
function buildRootContext(
  signal: AnomalySignalId,
  alertCount: number,
  factors: CommonFactor[],
): string {
  const supplier = factors.find((f) => f.dimension === "supplier")?.value ?? "the involved suppliers";
  const location = factors.find((f) => f.dimension === "location")?.value ?? "the involved locations";
  const window = factors.find((f) => f.dimension === "time window")?.value ?? "the observed period";
  const count = alertCount.toLocaleString("en-US");

  const templates: Record<AnomalySignalId, string> = {
    IMPOSSIBLE_TIMELINE: `${count} timeline ${alertCount === 1 ? "anomaly shares" : "anomalies share"} ${supplier} and ${window}. The most consistent context to check first is a data-entry or device-clock problem — backfilled records and misconfigured clocks produce exactly this pattern. Confirm against the source paperwork before treating any record as fabricated.`,
    DUPLICATE_QR_SCAN: `${count} duplicate QR scans share ${supplier}, ${location}, and ${window}. The pattern is consistent with a label problem at the supplier — a printer re-issuing codes, or labels applied to the wrong jars. It is also the pattern a copied label would produce. Only a label-stock and print-log audit can distinguish the two.`,
    CUSTODY_GAP: `${count} custody ${alertCount === 1 ? "gap shares" : "gaps share"} ${supplier} and ${window}. The most consistent context to check first is late or missed paperwork on those hand-offs. Undocumented hand-offs are the alternative to rule out — ask the custodians on both sides of each gap.`,
    GPS_MISMATCH: `${count} GPS ${alertCount === 1 ? "mismatch shares" : "mismatches share"} ${supplier}, ${location}, and ${window}. The most consistent context to check first is a mis-registered apiary pin or GPS drift on the harvest device. Verify the pin on a map and re-walk the harvest trail.`,
    MISSING_EVIDENCE: `${count} missing-evidence ${alertCount === 1 ? "flag shares" : "flags share"} ${supplier} and ${window}. The most consistent context to check first is work that happened but was never recorded, versus steps that were skipped. Ask the responsible team whether the records are merely late.`,
    ABNORMAL_YIELD: `${count} abnormal-yield ${alertCount === 1 ? "flag shares" : "flags share"} ${supplier} and ${window}. The most consistent context to check first is unrecorded blending or dilution — or harvest weights that were estimated rather than weighed. Reconcile against the weighbridge records.`,
    FAILED_QUALITY_RESULT: `${count} failed or out-of-range quality ${alertCount === 1 ? "result shares" : "results share"} ${supplier} and ${window}. The most consistent context to check first is a process or storage problem affecting these batches — or a lab issue. Re-test from a second sample before any wider action.`,
    REPEATED_SUPPLIER_ISSUE: `${count} supplier-issue ${alertCount === 1 ? "flag shares" : "flags share"} ${supplier} and ${window}. One incident is an event; a pattern is a supplier relationship to review. Pull the supplier's full alert history and look for the common step — same route, same equipment, same paperwork shortcut.`,
  };

  return (
    templates[signal] +
    " This context is a starting point for the investigator, not a finding."
  );
}

function describeCluster(alerts: ClusterAlert[]): IncidentCluster {
  const signal = alerts[0].signal;
  const start = alerts[0].observedAt; // sorted ascending
  const end = alerts[alerts.length - 1].observedAt;

  const batchMap = new Map<string, { batchId: string; publicCode: string; honeyType?: string }>();
  for (const a of alerts) {
    if (!batchMap.has(a.batchId)) {
      batchMap.set(a.batchId, { batchId: a.batchId, publicCode: a.publicCode, honeyType: a.honeyType });
    }
  }

  const commonFactors = buildCommonFactors(alerts, start, end);

  const entries: TimelineEntry[] = alerts.slice(0, TIMELINE_ENTRY_LIMIT).map((a) => ({
    at: a.observedAt,
    label: `${a.publicCode} — ${ANOMALY_SIGNALS[a.signal].label}`,
  }));

  const topSupplier = topShare(alerts.map((a) => a.supplierName)).value;
  const distinctSignals = [...new Set(alerts.map((a) => a.signal))].map((signalId) => ({
    signalId,
    // Representative evidence: the earliest alert's, labelled as such.
    evidence: alerts[0].evidence ?? [],
  }));

  return {
    id: clusterIdFor(signal, topSupplier, start),
    title: clusterTitleFor(signal, topSupplier),
    signal,
    signalLabel: ANOMALY_SIGNALS[signal].label,
    alerts,
    alertCount: alerts.length,
    affectedBatches: [...batchMap.values()].sort((a, b) => a.publicCode.localeCompare(b.publicCode)),
    commonFactors,
    timeline: { start, end, entries, truncated: alerts.length > TIMELINE_ENTRY_LIMIT },
    probableRootContext: buildRootContext(signal, alerts.length, commonFactors),
    investigationStatus: "OPEN",
    risk: scoreCluster(distinctSignals, alerts.length),
  };
}

/**
 * Group anomaly alerts into incident clusters. Deterministic: identical input
 * always produces identical clusters, ordered by risk (highest first), then
 * alert count, then id.
 */
export function clusterAlerts(alerts: ClusterAlert[]): IncidentCluster[] {
  const groups = clusterAlertsInternal(alerts);
  return groups
    .map(describeCluster)
    .sort(
      (a, b) =>
        b.risk.points - a.risk.points ||
        b.alertCount - a.alertCount ||
        a.id.localeCompare(b.id),
    );
}
