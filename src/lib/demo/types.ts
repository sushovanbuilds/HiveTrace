/**
 * Demo workspace roles. These mirror the four supply-chain nodes a judge can
 * step through during a demo. They are intentionally distinct from the raw
 * `USER_ROLES` in the domain model — a single domain role maps onto one demo
 * workspace (e.g. the LAB role becomes the ANALYST workspace).
 *
 * DEMO ONLY: this type is a presentation mapping over the real session. It is
 * not an access-control boundary by itself; the underlying server session + the
 * capability tables in `@/lib/auth/roles` remain the authoritative, production
 * path. See `config.ts` for the mapping from real users to these workspaces.
 */
export type DemoRole = "BEEKEEPER" | "ANALYST" | "PROCESSOR" | "DISTRIBUTOR";

export type DemoStage =
  | "HARVEST"
  | "LAB"
  | "PROCESSING"
  | "PACKAGING"
  | "DISTRIBUTION"
  | "DELIVERED";

export type DemoQuality = "PENDING" | "PASSED" | "FAILED";

export type DemoRisk = "LOW" | "MEDIUM" | "HIGH";

/** A single node in a batch's shared traceability timeline. */
export interface DemoBatchEvent {
  batchId: string;
  type: string;
  stage: DemoStage;
  actor: string;
  actorName: string;
  role: DemoRole;
  note: string;
  timestamp: string;
  quality?: DemoQuality;
  risk?: DemoRisk;
  incidentId?: string;
}

export interface DemoQualityResult {
  batchId: string;
  testType: string;
  result: number;
  unit: string;
  passed: boolean;
  lab: string;
  timestamp: string;
}

export interface DemoBatch {
  id: string;
  publicCode: string;
  honeyType: string;
  floralSource: string;
  originRegion: string;
  quantityKg: number;
  currentStage: DemoStage;
  quality: DemoQuality;
  risk: DemoRisk;
  /** Known deterministic anomaly scenarios (GPS mismatch / duplicate QR). */
  anomaly: "NONE" | "GPS_MISMATCH" | "DUPLICATE_QR";
  events: DemoBatchEvent[];
  qualityResults: DemoQualityResult[];
  createdAt: string;
}

/** A user as seen through the demo workspace lens. */
export interface DemoUser {
  email: string;
  name: string;
  role: DemoRole;
  organization: string;
  initials: string;
}
