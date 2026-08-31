import { db } from "@/lib/db";
import type { RiskBreakdown } from "@/lib/types";

/**
 * Rule-based risk scoring (plan §8).
 *
 * Deliberately transparent rather than learned: every point of the score traces
 * to a named rule with a human-readable reason, because the output feeds an
 * investigation queue where someone has to justify acting on it.
 */

// Plan §8 weights. Components are each 0-100 and the weights sum to 1.
export const WEIGHTS = {
  labRisk: 0.4,
  traceabilityRisk: 0.2,
  supplierHistoryRisk: 0.15,
  geoTemporalRisk: 0.15,
  processSensorRisk: 0.1,
} as const;

/** Plan §8 bands. Demo defaults — calibrate against field data before relying on them. */
export const RISK_BANDS = { medium: 30, high: 60 } as const;

export type RiskState = "LOW" | "MEDIUM" | "HIGH";
export type Severity = "LOW" | "MEDIUM" | "HIGH";

/** Alert type each rule maps to, per the Alert.type comment in the schema. */
const RULE_ALERT_TYPE: Record<string, string> = {
  LAB_FAILURE: "LAB_FAILURE",
  NO_LAB_TESTS: "LAB_FAILURE",
  CUSTODY_GAP: "CUSTODY_GAP",
  CUSTODY_CHAIN_BROKEN: "CUSTODY_GAP",
  TIMELINE_ANOMALY: "TIMELINE_IMPOSSIBLE",
  HARVEST_AFTER_TEST: "TIMELINE_IMPOSSIBLE",
  DUPLICATE_QR: "DUPLICATE_QR",
  ABNORMAL_YIELD: "ABNORMAL_YIELD",
  SUPPLIER_HISTORY: "SUPPLIER_ISSUE",
  MISSING_PROCESS_EVENTS: "ABNORMAL_YIELD",
};

interface RuleInput {
  rule: string;
  description: string;
  severity: Severity;
  weight: number;
  score: number;
}

export function riskStateFor(overall: number): RiskState {
  if (overall >= RISK_BANDS.high) return "HIGH";
  if (overall >= RISK_BANDS.medium) return "MEDIUM";
  return "LOW";
}

export interface RiskAssessment {
  overall: number;
  state: RiskState;
  breakdown: RiskBreakdown;
}

export async function calculateRiskScore(batchId: string): Promise<RiskAssessment> {
  const batch = await db.batch.findUnique({
    where: { id: batchId },
    include: {
      qualityTests: true,
      // Ascending: every rule below reasons about forward chronology, and
      // reading these newest-first silently inverts the comparisons.
      events: { orderBy: { timestamp: "asc" } },
      custodyTransfers: { orderBy: { timestamp: "asc" } },
      qrTokens: { select: { id: true, revoked: true, scanCount: true } },
      lineage: true,
      childLineage: true,
      harvest: { select: { date: true, quantity: true } },
    },
  });

  if (!batch) throw new Error(`Batch not found: ${batchId}`);

  const rules: RuleInput[] = [];
  const add = (rule: Omit<RuleInput, "weight">, weight: number) =>
    rules.push({ ...rule, weight });

  // ── Lab risk ─────────────────────────────────────────────────────────────
  const failedTests = batch.qualityTests.filter((t) => !t.passed);
  let labScore = 0;

  if (batch.qualityTests.length === 0) {
    labScore = 40;
    add({
      rule: "NO_LAB_TESTS",
      description: "No quality tests recorded for this batch",
      severity: "MEDIUM",
      score: labScore,
    }, WEIGHTS.labRisk);
  } else if (failedTests.length > 0) {
    labScore = Math.min(100, failedTests.length * 35);
    add({
      rule: "LAB_FAILURE",
      description:
        `${failedTests.length} of ${batch.qualityTests.length} quality test(s) failed: ` +
        failedTests.map((t) => `${t.testType} ${t.result}${t.unit}`).join(", "),
      severity: failedTests.length >= 2 ? "HIGH" : "MEDIUM",
      score: labScore,
    }, WEIGHTS.labRisk);
  }

  // ── Traceability risk ────────────────────────────────────────────────────
  const transfers = batch.custodyTransfers;
  let traceScore = 0;

  // A broken chain means custody was recorded as passing from someone who did
  // not hold the batch — the strongest tampering signal in the custody data.
  const brokenLinks = transfers.filter(
    (transfer, i) => i > 0 && transfer.fromCustodianId !== transfers[i - 1].toCustodianId,
  );
  if (brokenLinks.length > 0) {
    traceScore += Math.min(60, brokenLinks.length * 30);
    add({
      rule: "CUSTODY_CHAIN_BROKEN",
      description:
        `${brokenLinks.length} custody transfer(s) start from a custodian who did not hold the batch`,
      severity: brokenLinks.length > 1 ? "HIGH" : "MEDIUM",
      score: Math.min(60, brokenLinks.length * 30),
    }, WEIGHTS.traceabilityRisk);
  }

  // A batch past the harvest stage with no custody record at all has an
  // undocumented hand-off somewhere.
  if (transfers.length === 0 && batch.currentStage !== "HARVEST") {
    traceScore += 40;
    add({
      rule: "CUSTODY_GAP",
      description: `Batch is at stage ${batch.currentStage} with no custody transfer recorded`,
      severity: "MEDIUM",
      score: 40,
    }, WEIGHTS.traceabilityRisk);
  }

  if (batch.currentCustodianId && transfers.length > 0) {
    const lastHolder = transfers[transfers.length - 1].toCustodianId;
    if (lastHolder !== batch.currentCustodianId) {
      traceScore += 30;
      add({
        rule: "CUSTODY_GAP",
        description: "Current custodian does not match the last recorded transfer",
        severity: "MEDIUM",
        score: 30,
      }, WEIGHTS.traceabilityRisk);
    }
  }
  traceScore = Math.min(100, traceScore);

  // ── Supplier history ─────────────────────────────────────────────────────
  // Real prior-behaviour signal: confirmed incidents against this organisation's
  // other batches. Absent history is treated as low, not zero, risk.
  const priorAlerts = await db.alert.count({
    where: {
      batch: { organisationId: batch.organisationId },
      batchId: { not: batch.id },
      severity: { in: ["HIGH", "CRITICAL"] },
      status: { in: ["NEW", "ACKNOWLEDGED", "RESOLVED"] },
    },
  });
  const supplierScore = priorAlerts === 0 ? 10 : Math.min(100, 20 + priorAlerts * 15);
  add(
    priorAlerts === 0
      ? {
          rule: "SUPPLIER_HISTORY",
          description: "No prior high-severity alerts for this organisation",
          severity: "LOW",
          score: supplierScore,
        }
      : {
          rule: "SUPPLIER_HISTORY",
          description: `${priorAlerts} prior high-severity alert(s) against this organisation`,
          severity: priorAlerts >= 3 ? "HIGH" : "MEDIUM",
          score: supplierScore,
        },
    WEIGHTS.supplierHistoryRisk,
  );

  // ── Geo-temporal anomalies ───────────────────────────────────────────────
  const events = batch.events;
  let geoScore = 0;

  // Events arrive ascending, so a *later* index holding an *earlier* timestamp
  // is a genuine ordering violation.
  const outOfOrder = events.filter(
    (event, i) => i > 0 && event.timestamp.getTime() < events[i - 1].timestamp.getTime(),
  );
  if (outOfOrder.length > 0) {
    geoScore += Math.min(70, outOfOrder.length * 35);
    add({
      rule: "TIMELINE_ANOMALY",
      description: `${outOfOrder.length} event(s) are timestamped before the event preceding them`,
      severity: "HIGH",
      score: Math.min(70, outOfOrder.length * 35),
    }, WEIGHTS.geoTemporalRisk);
  }

  // Physically impossible: honey tested before it was harvested.
  const harvestDate = batch.harvest?.date;
  const earliestTest = batch.qualityTests.reduce<Date | null>(
    (earliest, test) => (!earliest || test.testedAt < earliest ? test.testedAt : earliest),
    null,
  );
  if (harvestDate && earliestTest && earliestTest < harvestDate) {
    geoScore += 40;
    add({
      rule: "HARVEST_AFTER_TEST",
      description: `Quality test dated ${earliestTest.toISOString().slice(0, 10)} precedes the harvest on ${harvestDate.toISOString().slice(0, 10)}`,
      severity: "HIGH",
      score: 40,
    }, WEIGHTS.geoTemporalRisk);
  }

  if (geoScore === 0) {
    geoScore = 5;
    add({
      rule: "GEO_TEMPORAL_DEFAULT",
      description: "No timeline or location anomalies detected",
      severity: "LOW",
      score: geoScore,
    }, WEIGHTS.geoTemporalRisk);
  }
  geoScore = Math.min(100, geoScore);

  // ── Process and label integrity ──────────────────────────────────────────
  let processScore = 0;

  // Only events that the batch's current stage should already have produced are
  // treated as missing; a freshly harvested batch is not suspicious for lacking
  // a lab result.
  const missingEvents = expectedEventsFor(batch.currentStage).filter(
    (type) => !events.some((event) => event.type === type),
  );
  if (missingEvents.length > 0) {
    processScore += Math.min(60, missingEvents.length * 20);
    add({
      rule: "MISSING_PROCESS_EVENTS",
      description: `Stage ${batch.currentStage} expects events not present: ${missingEvents.join(", ")}`,
      severity: missingEvents.length >= 3 ? "HIGH" : "MEDIUM",
      score: Math.min(60, missingEvents.length * 20),
    }, WEIGHTS.processSensorRisk);
  }

  // Multiple live labels for one batch is the counterfeit-refill signature: two
  // jars scanning to the same provenance record.
  const activeTokens = batch.qrTokens.filter((token) => !token.revoked);
  if (activeTokens.length > 1) {
    processScore += 40;
    add({
      rule: "DUPLICATE_QR",
      description: `${activeTokens.length} active QR labels are issued for this batch`,
      severity: "HIGH",
      score: 40,
    }, WEIGHTS.processSensorRisk);
  }

  // Packed quantity exceeding what was harvested implies dilution or blending
  // that was never recorded as a lineage relationship.
  const harvestQuantity = batch.harvest?.quantity;
  if (harvestQuantity && batch.lineage.length === 0 && batch.quantity > harvestQuantity * 1.05) {
    processScore += 45;
    add({
      rule: "ABNORMAL_YIELD",
      description: `Batch quantity ${batch.quantity}kg exceeds the harvested ${harvestQuantity}kg with no recorded blend`,
      severity: "HIGH",
      score: 45,
    }, WEIGHTS.processSensorRisk);
  }
  processScore = Math.min(100, processScore);

  const overall = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        labScore * WEIGHTS.labRisk +
          traceScore * WEIGHTS.traceabilityRisk +
          supplierScore * WEIGHTS.supplierHistoryRisk +
          geoScore * WEIGHTS.geoTemporalRisk +
          processScore * WEIGHTS.processSensorRisk,
      ),
    ),
  );

  return {
    overall,
    state: riskStateFor(overall),
    breakdown: {
      labRisk: labScore,
      traceabilityRisk: traceScore,
      supplierHistoryRisk: supplierScore,
      geoTemporalRisk: geoScore,
      processSensorRisk: processScore,
      reasons: rules,
    },
  };
}

const STAGE_ORDER = [
  "HARVEST", "COLLECTION", "LAB", "PROCESSING", "PACKAGING", "DISTRIBUTION", "RETAIL",
] as const;

/** Events a batch should have accumulated by the time it reaches a given stage. */
function expectedEventsFor(stage: string): string[] {
  const index = STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]);
  const expected = ["HARVEST"];
  if (index >= STAGE_ORDER.indexOf("COLLECTION")) expected.push("CUSTODY_TRANSFER");
  if (index >= STAGE_ORDER.indexOf("PROCESSING")) expected.push("QUALITY_TEST", "LAB_RESULT");
  return expected;
}

/** Highest-severity rule that actually contributed, used to type the alert. */
function dominantRule(reasons: RuleInput[]): RuleInput | null {
  const rank: Record<Severity, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  return reasons
    .filter((reason) => reason.score > 0 && RULE_ALERT_TYPE[reason.rule])
    .sort(
      (a, b) =>
        rank[b.severity] - rank[a.severity] || b.score * b.weight - a.score * a.weight,
    )[0] ?? null;
}

export async function persistRiskScore(batchId: string) {
  const { overall, state, breakdown } = await calculateRiskScore(batchId);

  const riskScore = await db.riskScore.create({
    data: {
      batchId,
      overall,
      state,
      labRisk: breakdown.labRisk,
      traceabilityRisk: breakdown.traceabilityRisk,
      supplierHistoryRisk: breakdown.supplierHistoryRisk,
      geoTemporalRisk: breakdown.geoTemporalRisk,
      processSensorRisk: breakdown.processSensorRisk,
      reasons: breakdown.reasons,
      modelVersion: "rule_v1",
    },
  });

  await db.batch.update({
    where: { id: batchId },
    data: { riskScore: overall, riskState: state },
  });

  if (state === "HIGH") {
    const dominant = dominantRule(breakdown.reasons as RuleInput[]);
    // Type the alert from the rule that drove the score, rather than filing
    // every escalation under one label — the triage queue groups on this field.
    const type = dominant ? RULE_ALERT_TYPE[dominant.rule] : "ABNORMAL_YIELD";

    // Dedup (plan §9): re-scoring a batch that is already flagged for the same
    // reason must not spawn a second open alert.
    const existing = await db.alert.findFirst({
      where: { batchId, type, status: { in: ["NEW", "ACKNOWLEDGED"] } },
    });

    const message =
      `Risk ${overall}/100 (${state}). ` +
      breakdown.reasons
        .filter((reason) => reason.score > 0 && reason.severity !== "LOW")
        .map((reason) => reason.description)
        .join("; ");

    if (existing) {
      await db.alert.update({
        where: { id: existing.id },
        data: { severity: "HIGH", message, metadata: { riskScoreId: riskScore.id, overall } },
      });
    } else {
      await db.alert.create({
        data: {
          batchId,
          type,
          severity: "HIGH",
          message,
          status: "NEW",
          metadata: { riskScoreId: riskScore.id, overall },
        },
      });
    }
  }

  return riskScore;
}
