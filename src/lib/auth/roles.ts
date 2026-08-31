import { USER_ROLES } from "@/lib/types";

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

/**
 * Which roles may perform each protected capability (plan §13). Kept as one
 * table so the access model is reviewable in a single place rather than
 * scattered across route handlers.
 *
 * ADMIN is listed explicitly per capability rather than granted a blanket
 * bypass, so widening admin reach is always a visible diff.
 */
export const CAPABILITIES = {
  "farm:write": ["BEEKEEPER", "ADMIN"],
  "hive:write": ["BEEKEEPER", "ADMIN"],
  "batch:write": ["BEEKEEPER", "COLLECTOR", "PROCESSOR", "ADMIN"],
  "batch:read": ["BEEKEEPER", "COLLECTOR", "LAB", "PROCESSOR", "DISTRIBUTOR", "INVESTIGATOR", "ADMIN"],
  "custody:transfer": ["BEEKEEPER", "COLLECTOR", "PROCESSOR", "DISTRIBUTOR", "ADMIN"],
  // Publishing lab evidence is a critical action (plan §13) — labs only.
  "quality:write": ["LAB", "ADMIN"],
  "risk:recalculate": ["INVESTIGATOR", "LAB", "ADMIN"],
  "alert:read": ["INVESTIGATOR", "LAB", "ADMIN"],
  "incident:read": ["INVESTIGATOR", "LAB", "ADMIN"],
  "incident:write": ["INVESTIGATOR", "ADMIN"],
  // Recording a human resolution carries legal weight — investigators only.
  "investigation:resolve": ["INVESTIGATOR", "ADMIN"],
  "anchor:write": ["ADMIN"],
  "organisation:write": ["ADMIN"],
  "qr:issue": ["BEEKEEPER", "PROCESSOR", "DISTRIBUTOR", "ADMIN"],
  "ai:query": ["INVESTIGATOR", "LAB", "BEEKEEPER", "ADMIN"],
} as const satisfies Record<string, readonly UserRole[]>;

export type Capability = keyof typeof CAPABILITIES;

export function roleHasCapability(role: string, capability: Capability): boolean {
  return (CAPABILITIES[capability] as readonly string[]).includes(role);
}

/** Route prefixes that require a session. Everything else is public. */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/keeper",
  "/analyst",
  "/processor",
  "/distributor",
  "/trace",
  "/batches",
  "/hives",
  "/harvests",
  "/quality",
  "/risk",
  "/risk-center",
  "/incidents",
  "/genealogy",
  "/traceability",
  "/supply-chain",
  "/custody",
  "/blockchain",
  "/reports",
  "/settings",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
