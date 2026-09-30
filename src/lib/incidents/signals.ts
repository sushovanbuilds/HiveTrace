/**
 * Canonical anomaly signals for the Risk / Incident Center.
 *
 * An *anomaly signal* is one suspicious observation about a batch — an
 * impossible timestamp, a second QR scan, a custody record that does not line
 * up. Signals are the raw material: the risk scorer turns them into a
 * triage order, and the clusterer groups related signals into incidents.
 *
 * Everything here is deterministic and rule-based. There is no trained model
 * behind these definitions, and a signal firing is never, by itself, a claim
 * of fraud — it is a reason to look.
 */

export type AnomalySignalId =
  | "IMPOSSIBLE_TIMELINE"
  | "DUPLICATE_QR_SCAN"
  | "CUSTODY_GAP"
  | "GPS_MISMATCH"
  | "MISSING_EVIDENCE"
  | "ABNORMAL_YIELD"
  | "FAILED_QUALITY_RESULT"
  | "REPEATED_SUPPLIER_ISSUE";

export interface AnomalySignal {
  id: AnomalySignalId;
  /** Short label shown in the UI. */
  label: string;
  /** What the signal means, in plain language. */
  description: string;
  /** The first thing a human investigator should check. */
  investigatorPrompt: string;
  /**
   * Deterministic risk contribution (0-100) when this is the only signal on a
   * batch. Calibrated by judgement for the demo — these are triage weights,
   * not measured probabilities.
   */
  basePoints: number;
}

export const ANOMALY_SIGNALS: Record<AnomalySignalId, AnomalySignal> = {
  IMPOSSIBLE_TIMELINE: {
    id: "IMPOSSIBLE_TIMELINE",
    label: "Impossible timeline",
    description:
      "Events are dated in an order that cannot have happened — e.g. a lab result dated before the harvest, or an event timestamped in the future.",
    investigatorPrompt:
      "Check the source system clocks and whether the record was backfilled by hand. A single typo'd date is common; a pattern of them is not.",
    basePoints: 70,
  },
  DUPLICATE_QR_SCAN: {
    id: "DUPLICATE_QR_SCAN",
    label: "Duplicate QR scan",
    description:
      "The same QR label code was scanned in ways one physical jar cannot explain — too many scans, or scans from far-apart places in too short a time.",
    investigatorPrompt:
      "Audit the label stock: was the code printed twice, applied to the wrong jar, or is a copied label circulating downstream?",
    basePoints: 75,
  },
  CUSTODY_GAP: {
    id: "CUSTODY_GAP",
    label: "Custody gap",
    description:
      "The chain of custody has a hole — a transfer from someone who never held the batch, a missing hand-off, or a holder that does not match the last transfer.",
    investigatorPrompt:
      "Ask the two custodians on either side of the gap what happened. Most gaps are late paperwork; some are undocumented hand-offs.",
    basePoints: 55,
  },
  GPS_MISMATCH: {
    id: "GPS_MISMATCH",
    label: "GPS mismatch",
    description:
      "The recorded location disagrees with where the batch was declared to be — a harvest logged kilometres from its registered apiary, for example.",
    investigatorPrompt:
      "Verify the apiary pin on the map and check the harvest device's GPS trail. Mis-registered pins and phone GPS drift are the usual causes.",
    basePoints: 50,
  },
  MISSING_EVIDENCE: {
    id: "MISSING_EVIDENCE",
    label: "Missing evidence",
    description:
      "Evidence the stage should have produced is absent — no lab test for a batch past the lab stage, or expected process events that never got recorded.",
    investigatorPrompt:
      "Check whether the step actually happened and the record is just late, or whether the step was skipped.",
    basePoints: 35,
  },
  ABNORMAL_YIELD: {
    id: "ABNORMAL_YIELD",
    label: "Abnormal yield",
    description:
      "The quantity does not add up — more honey packed than was harvested with no recorded blend, or a yield far outside the hive's normal range.",
    investigatorPrompt:
      "Reconcile harvest weights against packed weights. Unrecorded blending or dilution is the question to settle, not to assume.",
    basePoints: 60,
  },
  FAILED_QUALITY_RESULT: {
    id: "FAILED_QUALITY_RESULT",
    label: "Failed / out-of-range quality result",
    description:
      "A lab test failed or came back outside the acceptable range for its parameter — moisture, HMF, antibiotics, or similar.",
    investigatorPrompt:
      "Request a re-test from a second sample before acting. One failed result is a lab question; repeated failures across batches are a supply question.",
    basePoints: 65,
  },
  REPEATED_SUPPLIER_ISSUE: {
    id: "REPEATED_SUPPLIER_ISSUE",
    label: "Repeated supplier issue",
    description:
      "The same supplier keeps appearing against anomalies. One incident is an event; a pattern is a supplier relationship to review.",
    investigatorPrompt:
      "Pull the supplier's full alert history and look for the common step — same collection route, same equipment, same paperwork shortcut.",
    basePoints: 55,
  },
};

export const SIGNAL_IDS = Object.keys(ANOMALY_SIGNALS) as AnomalySignalId[];

/**
 * Maps the alert `type` values already stored in the database (see the Alert
 * model comment) and the risk-engine rule ids onto canonical signals.
 * Unknown values map to null and are reported, never silently dropped.
 */
const ALERT_TYPE_TO_SIGNAL: Record<string, AnomalySignalId> = {
  TIMELINE_IMPOSSIBLE: "IMPOSSIBLE_TIMELINE",
  DUPLICATE_QR: "DUPLICATE_QR_SCAN",
  CUSTODY_GAP: "CUSTODY_GAP",
  GEO_MISMATCH: "GPS_MISMATCH",
  LAB_FAILURE: "FAILED_QUALITY_RESULT",
  ABNORMAL_YIELD: "ABNORMAL_YIELD",
  SUPPLIER_ISSUE: "REPEATED_SUPPLIER_ISSUE",
};

const RISK_RULE_TO_SIGNAL: Record<string, AnomalySignalId> = {
  TIMELINE_ANOMALY: "IMPOSSIBLE_TIMELINE",
  HARVEST_AFTER_TEST: "IMPOSSIBLE_TIMELINE",
  DUPLICATE_QR: "DUPLICATE_QR_SCAN",
  CUSTODY_CHAIN_BROKEN: "CUSTODY_GAP",
  CUSTODY_GAP: "CUSTODY_GAP",
  NO_LAB_TESTS: "MISSING_EVIDENCE",
  MISSING_PROCESS_EVENTS: "MISSING_EVIDENCE",
  ABNORMAL_YIELD: "ABNORMAL_YIELD",
  LAB_FAILURE: "FAILED_QUALITY_RESULT",
  SUPPLIER_HISTORY: "REPEATED_SUPPLIER_ISSUE",
};

export function signalForAlertType(alertType: string): AnomalySignalId | null {
  return ALERT_TYPE_TO_SIGNAL[alertType] ?? null;
}

export function signalForRiskRule(rule: string): AnomalySignalId | null {
  return RISK_RULE_TO_SIGNAL[rule] ?? null;
}

export interface EvidenceItem {
  /** Short field label, e.g. "Expected location". */
  label: string;
  /** The observed value, kept consumer-safe by the caller. */
  value: string;
  /** Optional one-line context, e.g. how far off the value is. */
  detail?: string;
}

/**
 * Builds evidence rows for a signal from a free-form facts record. Only facts
 * the caller supplies are shown; nothing is invented. Keys are matched
 * case-sensitively against the signal's known evidence keys.
 */
const SIGNAL_EVIDENCE_KEYS: Record<AnomalySignalId, Array<{ key: string; label: string }>> = {
  IMPOSSIBLE_TIMELINE: [
    { key: "earlierEvent", label: "Earlier event" },
    { key: "laterEvent", label: "Later event" },
    { key: "skew", label: "Time skew" },
  ],
  DUPLICATE_QR_SCAN: [
    { key: "scanCount", label: "Scan count" },
    { key: "scanLocations", label: "Scan locations" },
    { key: "timeSpan", label: "Time span" },
  ],
  CUSTODY_GAP: [
    { key: "expectedHolder", label: "Expected holder" },
    { key: "recordedHolder", label: "Recorded holder" },
    { key: "missingStep", label: "Missing step" },
  ],
  GPS_MISMATCH: [
    { key: "expectedLocation", label: "Expected location" },
    { key: "detectedLocation", label: "Detected location" },
    { key: "distance", label: "Distance" },
  ],
  MISSING_EVIDENCE: [
    { key: "expectedEvidence", label: "Expected evidence" },
    { key: "stage", label: "Batch stage" },
  ],
  ABNORMAL_YIELD: [
    { key: "harvestedKg", label: "Harvested" },
    { key: "packedKg", label: "Packed" },
    { key: "expectedRange", label: "Expected range" },
  ],
  FAILED_QUALITY_RESULT: [
    { key: "testType", label: "Test" },
    { key: "result", label: "Result" },
    { key: "acceptableRange", label: "Acceptable range" },
  ],
  REPEATED_SUPPLIER_ISSUE: [
    { key: "supplier", label: "Supplier" },
    { key: "priorAlerts", label: "Prior alerts" },
    { key: "pattern", label: "Pattern" },
  ],
};

export function evidenceForSignal(
  signalId: AnomalySignalId,
  facts: Record<string, string | undefined>,
  detail?: string,
): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  for (const { key, label } of SIGNAL_EVIDENCE_KEYS[signalId]) {
    const value = facts[key];
    if (value !== undefined && value !== "") {
      items.push({ label, value });
    }
  }
  if (detail) items.push({ label: "Note", value: detail });
  return items;
}
