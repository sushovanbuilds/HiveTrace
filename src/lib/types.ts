export type BatchStage =
  | "HARVEST"
  | "COLLECTION"
  | "LAB"
  | "PROCESSING"
  | "PACKAGING"
  | "DISTRIBUTION"
  | "RETAIL";

export type RiskState = "LOW" | "MEDIUM" | "HIGH";
export type QualityStatus = "PENDING" | "PASSED" | "FAILED" | "QUARANTINE";
export type VerificationState = "UNVERIFIED" | "VERIFIED" | "DISPUTED";

export const STAGE_ORDER: BatchStage[] = [
  "HARVEST",
  "COLLECTION",
  "LAB",
  "PROCESSING",
  "PACKAGING",
  "DISTRIBUTION",
  "RETAIL",
];

export interface BatchWithRelations {
  id: string;
  publicCode: string;
  honeyType: string;
  floralSource: string | null;
  originRegion: string;
  quantity: number;
  currentStage: BatchStage;
  qualityStatus: QualityStatus;
  riskScore: number;
  riskState: RiskState;
  verificationState: VerificationState;
  createdAt: Date;
  updatedAt: Date;
  organisation?: { id: string; name: string; type: string } | null;
  harvest?: {
    id: string;
    date: Date;
    hive?: { name: string; farm?: { name: string; region: string } | null } | null;
  } | null;
  events?: Array<{
    id: string;
    type: string;
    data: unknown;
    timestamp: Date;
  }>;
  qualityTests?: Array<{
    id: string;
    testType: string;
    result: number;
    unit: string;
    passed: boolean;
    labName: string | null;
    testedAt: Date;
  }>;
  riskScores?: Array<{
    id: string;
    overall: number;
    state: string;
    labRisk: number;
    traceabilityRisk: number;
    supplierHistoryRisk: number;
    geoTemporalRisk: number;
    processSensorRisk: number;
    reasons: unknown;
    calculatedAt: Date;
  }>;
  alerts?: Array<{
    id: string;
    type: string;
    severity: string;
    message: string;
    status: string;
    createdAt: Date;
  }>;
}

export interface RiskBreakdown {
  labRisk: number;
  traceabilityRisk: number;
  supplierHistoryRisk: number;
  geoTemporalRisk: number;
  processSensorRisk: number;
  reasons: Array<{
    rule: string;
    description: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
    weight: number;
    score: number;
  }>;
}

export interface LineagePath {
  batchId: string;
  publicCode: string;
  currentStage: BatchStage;
  riskState: RiskState;
  path: Array<{
    batchId: string;
    publicCode: string;
    relationship: string;
    ratio: number | null;
    timestamp: Date;
  }>;
}

export interface VerifyResult {
  batchId: string;
  publicCode: string;
  organisation: string;
  currentStage: BatchStage;
  qualityStatus: QualityStatus;
  riskState: RiskState;
  verificationState: VerificationState;
  harvestDate: Date | null;
  originRegion: string;
  honeyType: string;
  quantity: number;
  lineageDepth: number;
  qualityTestCount: number;
  lastEventDate: Date | null;
}

export const HONEY_TYPES = [
  "MULTIFLORAL",
  "ACACIA",
  "MANUKA",
  "EUCALYPTUS",
  "WILDFLOWER",
  "MANGROVE",
  "MUSTARD",
  "LITCHI",
  "JAMUN",
  "OTHER",
] as const;

export const TEST_TYPES = [
  "MOISTURE",
  "HMF",
  "PROLINE",
  "DIASTASE",
  "ELECTRICAL_CONDUCTIVITY",
  "C4_SUGAR",
  // Pollen/DNA varietal authentication. (Was "PALEN", a typo for "POLLEN".)
  "POLLEN_DNA",
  "HEAVY_METALS",
  "ANTIBIOTIC_RESIDUE",
  "SUGAR_SYRUP_SMR",
] as const;

/** Hive construction, per the `type` comment on the Hive model. */
export const HIVE_TYPES = ["LANGSTROTH", "TOP_BAR", "WARRE", "OTHER"] as const;

/**
 * Hive operational state. INSPECTION is a distinct state from INACTIVE: a hive
 * under inspection is expected to resume producing, and hiding it behind
 * INACTIVE would make a temporarily-paused apiary look permanently retired in
 * the production figures.
 */
export const HIVE_STATUSES = ["ACTIVE", "INSPECTION", "INACTIVE", "COLONY_LOSS"] as const;

export type HoneyType = (typeof HONEY_TYPES)[number];
export type TestType = (typeof TEST_TYPES)[number];
export type HiveType = (typeof HIVE_TYPES)[number];
export type HiveStatus = (typeof HIVE_STATUSES)[number];

/**
 * Event types the append-only batch log accepts. Closed on purpose: the risk
 * engine matches on these strings, so a free-text `type` would let a producer
 * write events that look legitimate to a human reader but are invisible to every
 * rule that checks for a missing stage event.
 */
export const BATCH_EVENT_TYPES = [
  "HARVEST",
  "COLLECTION",
  "CUSTODY_TRANSFER",
  "QUALITY_TEST",
  "LAB_RESULT",
  "PROCESSING",
  "PACKAGING",
  "SHIPMENT",
  "RETAIL_LISTING",
  "STAGE_CHANGE",
  "BATCH_UPDATED",
  "QR_ISSUED",
  "QR_REVOKED",
  "ANCHOR_CREATED",
  "DOCUMENT_ATTACHED",
  "NOTE",
] as const;

export type BatchEventType = (typeof BATCH_EVENT_TYPES)[number];

/**
 * Events that record an action a custodian took, as opposed to bookkeeping the
 * server writes for itself. Only these may be submitted through the public
 * events endpoint.
 */
export const CLIENT_SUBMITTABLE_EVENT_TYPES = [
  "COLLECTION",
  "PROCESSING",
  "PACKAGING",
  "SHIPMENT",
  "RETAIL_LISTING",
  "DOCUMENT_ATTACHED",
  "NOTE",
] as const;

export const ORGANISATION_TYPES = [
  "BEEKEEPER",
  "COLLECTOR",
  "LAB",
  "PROCESSOR",
  "DISTRIBUTOR",
  "ADMIN",
] as const;

export const USER_ROLES = [
  "BEEKEEPER",
  "COLLECTOR",
  "LAB",
  "PROCESSOR",
  "DISTRIBUTOR",
  "INVESTIGATOR",
  "ADMIN",
  "CONSUMER",
] as const;

export interface ApiResponse<T = unknown> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
  };
}
