export type HoneypotStatus = "ACTIVE" | "COMPROMISED" | "RETIRED";

export interface Honeypot {
  id: string;
  address: string;
  network: string;
  type: string;
  status: HoneypotStatus;
  createdAt: string;
}

export type ThreatSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ThreatReport {
  id: string;
  eventId: string;
  summary: string;
  severity: ThreatSeverity;
  vector: string;
  createdAt: string;
}

const SEVERITY_ORDER: Record<ThreatSeverity, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

export function severityRank(severity: ThreatSeverity): number {
  return SEVERITY_ORDER[severity] ?? -1;
}
