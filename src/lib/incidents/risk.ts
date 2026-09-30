/**
 * Deterministic incident risk scoring.
 *
 * Purpose, stated plainly: a risk score decides **what gets investigated
 * first**. It is a triage aid, not a verdict. A HIGH score never declares
 * fraud, non-compliance, or guilt — it only says "a human should look at this
 * before the others".
 *
 * The model is deliberately boring: each anomaly signal contributes its fixed
 * base points, an extra distinct signal on the same scope adds a fixed bump,
 * and volume adds a small fixed bump. No training data, no learned weights,
 * no probabilities. The same inputs always produce the same score, which is
 * what makes the demo — and an audit — reproducible.
 */

import {
  ANOMALY_SIGNALS,
  type AnomalySignalId,
  type EvidenceItem,
} from "./signals";

export type RiskBand = "LOW" | "MEDIUM" | "HIGH";

/** Bands shared with the batch risk engine so the two never disagree. */
export const RISK_BANDS = { medium: 30, high: 60 } as const;

export function riskBandFor(points: number): RiskBand {
  if (points >= RISK_BANDS.high) return "HIGH";
  if (points >= RISK_BANDS.medium) return "MEDIUM";
  return "LOW";
}

/**
 * What a risk score means. Rendered wherever a score is shown, so nobody can
 * mistake triage order for a finding.
 */
export const RISK_MEANING =
  "Risk scores decide investigation order only. A HIGH score does not declare fraud, " +
  "non-compliance, or guilt — it means a human investigator should look at this case first.";

export const NO_ML_NOTICE =
  "Scores come from fixed, published rules (see the contributing evidence below). " +
  "No machine learning is used, and no accuracy is claimed.";

/** One signal's contribution to a score, with the evidence behind it. */
export interface RiskContribution {
  kind: "signal" | "volume";
  signalId: AnomalySignalId | null;
  signalLabel: string;
  points: number;
  evidence: EvidenceItem[];
}

export interface RiskScore {
  points: number;
  band: RiskBand;
  contributions: RiskContribution[];
}

/**
 * Score one scope (an alert, a batch, or a cluster) from its distinct
 * signals. Deterministic: sorted by signal id, so contribution order is
 * stable regardless of input order.
 *
 * points = max(signal base points) + 10 per additional distinct signal,
 * capped at 100. The strongest signal sets the floor; corroborating signals
 * raise urgency, never dilute it.
 */
export function scoreSignals(
  signals: Array<{ signalId: AnomalySignalId; evidence?: EvidenceItem[] }>,
): RiskScore {
  // Strongest signal first (base points descending), signal id breaks ties so
  // the order is stable regardless of how the inputs arrived.
  const unique = [...new Map(signals.map((s) => [s.signalId, s])).values()].sort(
    (a, b) =>
      ANOMALY_SIGNALS[b.signalId].basePoints - ANOMALY_SIGNALS[a.signalId].basePoints ||
      a.signalId.localeCompare(b.signalId),
  );

  const contributions: RiskContribution[] = unique.map((s, index) => ({
    kind: "signal",
    signalId: s.signalId,
    signalLabel: ANOMALY_SIGNALS[s.signalId].label,
    points: index === 0 ? ANOMALY_SIGNALS[s.signalId].basePoints : 10,
    evidence: s.evidence ?? [],
  }));

  const points = Math.min(
    100,
    contributions.reduce((sum, c) => sum + c.points, 0),
  );

  return { points, band: riskBandFor(points), contributions };
}

/**
 * Volume bump for a cluster: many alerts about the same thing deserve
 * attention sooner, but volume alone can never push a LOW signal to HIGH.
 * Fixed steps, no curve-fitting.
 */
export function volumeBonus(alertCount: number): number {
  if (alertCount >= 1000) return 15;
  if (alertCount >= 100) return 10;
  if (alertCount >= 10) return 5;
  return 0;
}

/** Score a whole cluster: its distinct signals plus the volume bump. */
export function scoreCluster(
  signals: Array<{ signalId: AnomalySignalId; evidence?: EvidenceItem[] }>,
  alertCount: number,
): RiskScore {
  const base = scoreSignals(signals);
  const bonus = volumeBonus(alertCount);
  const points = Math.min(100, base.points + bonus);
  return {
    points,
    band: riskBandFor(points),
    contributions:
      bonus > 0
        ? [
            ...base.contributions,
            {
              kind: "volume",
              signalId: null,
              signalLabel: "Alert volume",
              points: bonus,
              evidence: [
                {
                  label: "Related alerts",
                  value: String(alertCount),
                  detail: `Volume bump: +${bonus} points for ${alertCount} related alerts`,
                },
              ],
            },
          ]
        : base.contributions,
  };
}
