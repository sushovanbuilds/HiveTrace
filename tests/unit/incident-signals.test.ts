import { describe, expect, it } from "vitest";
import {
  ANOMALY_SIGNALS,
  SIGNAL_IDS,
  signalForAlertType,
  signalForRiskRule,
  evidenceForSignal,
  type AnomalySignalId,
} from "@/lib/incidents/signals";

describe("anomaly signal catalog", () => {
  it("defines exactly the eight required signals", () => {
    expect(SIGNAL_IDS).toEqual([
      "IMPOSSIBLE_TIMELINE",
      "DUPLICATE_QR_SCAN",
      "CUSTODY_GAP",
      "GPS_MISMATCH",
      "MISSING_EVIDENCE",
      "ABNORMAL_YIELD",
      "FAILED_QUALITY_RESULT",
      "REPEATED_SUPPLIER_ISSUE",
    ]);
  });

  it("gives every signal a label, description, investigator prompt, and base points", () => {
    for (const id of SIGNAL_IDS) {
      const signal = ANOMALY_SIGNALS[id];
      expect(signal.label.length).toBeGreaterThan(0);
      expect(signal.description.length).toBeGreaterThan(0);
      expect(signal.investigatorPrompt.length).toBeGreaterThan(0);
      expect(signal.basePoints).toBeGreaterThan(0);
      expect(signal.basePoints).toBeLessThanOrEqual(100);
    }
  });

  it("never describes a signal as proof of fraud", () => {
    for (const id of SIGNAL_IDS) {
      const text = `${ANOMALY_SIGNALS[id].description} ${ANOMALY_SIGNALS[id].investigatorPrompt}`.toLowerCase();
      expect(text).not.toMatch(/fraud/);
      expect(text).not.toMatch(/guilt/);
    }
  });
});

describe("alert type mapping", () => {
  it("maps every stored alert type onto a canonical signal", () => {
    const cases: Array<[string, AnomalySignalId]> = [
      ["TIMELINE_IMPOSSIBLE", "IMPOSSIBLE_TIMELINE"],
      ["DUPLICATE_QR", "DUPLICATE_QR_SCAN"],
      ["CUSTODY_GAP", "CUSTODY_GAP"],
      ["GEO_MISMATCH", "GPS_MISMATCH"],
      ["LAB_FAILURE", "FAILED_QUALITY_RESULT"],
      ["ABNORMAL_YIELD", "ABNORMAL_YIELD"],
      ["SUPPLIER_ISSUE", "REPEATED_SUPPLIER_ISSUE"],
    ];
    for (const [alertType, signal] of cases) {
      expect(signalForAlertType(alertType)).toBe(signal);
    }
  });

  it("returns null for unknown alert types instead of guessing", () => {
    expect(signalForAlertType("SOMETHING_NEW")).toBeNull();
    expect(signalForAlertType("")).toBeNull();
  });

  it("maps the risk-engine rule ids onto signals", () => {
    expect(signalForRiskRule("TIMELINE_ANOMALY")).toBe("IMPOSSIBLE_TIMELINE");
    expect(signalForRiskRule("HARVEST_AFTER_TEST")).toBe("IMPOSSIBLE_TIMELINE");
    expect(signalForRiskRule("CUSTODY_CHAIN_BROKEN")).toBe("CUSTODY_GAP");
    expect(signalForRiskRule("NO_LAB_TESTS")).toBe("MISSING_EVIDENCE");
    expect(signalForRiskRule("MISSING_PROCESS_EVENTS")).toBe("MISSING_EVIDENCE");
    expect(signalForRiskRule("LAB_FAILURE")).toBe("FAILED_QUALITY_RESULT");
    expect(signalForRiskRule("SUPPLIER_HISTORY")).toBe("REPEATED_SUPPLIER_ISSUE");
    expect(signalForRiskRule("GEO_TEMPORAL_DEFAULT")).toBeNull();
  });
});

describe("evidence extraction", () => {
  it("picks the signal's known evidence keys and ignores unknown facts", () => {
    const items = evidenceForSignal("GPS_MISMATCH", {
      expectedLocation: "Valley Heights apiary",
      detectedLocation: "11 km east",
      distance: "~11 km",
      internalTicketId: "T-999",
    });
    expect(items).toEqual([
      { label: "Expected location", value: "Valley Heights apiary" },
      { label: "Detected location", value: "11 km east" },
      { label: "Distance", value: "~11 km" },
    ]);
  });

  it("skips empty values and appends the detail as a note", () => {
    const items = evidenceForSignal(
      "DUPLICATE_QR_SCAN",
      { scanCount: "5", scanLocations: "", timeSpan: "under 40 minutes" },
      "Both scans hit the same retail till",
    );
    expect(items).toEqual([
      { label: "Scan count", value: "5" },
      { label: "Time span", value: "under 40 minutes" },
      { label: "Note", value: "Both scans hit the same retail till" },
    ]);
  });

  it("returns no rows when no known facts are supplied", () => {
    expect(evidenceForSignal("CUSTODY_GAP", {})).toEqual([]);
  });
});
