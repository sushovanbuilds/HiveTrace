import type { DemoRole, DemoUser } from "@/lib/demo/types";

/**
 * Single source of truth for the four demo workspaces a presenter can step
 * through. Every role is bound to one of the existing hardcoded demo accounts
 * (see `/api/auth/login` and `src/app/login/page.tsx`) — the emails below are
 * NOT invented here, they are the same values the existing demo login accepts.
 *
 * The demo workspace role is separated from the domain `USER_ROLE`: e.g. the
 * LAB account maps onto the ANALYST workspace so the role names line up with
 * the routes a judge navigates (/analyst, /processor, ...). Do not add new
 * demo identities in two places — extend this table (and the matching login
 * demo account) together.
 */
export const DEMO_USERS: Record<DemoRole, DemoUser> = {
  BEEKEEPER: {
    email: "ravi@greenvalley.in",
    name: "Ravi Kumar",
    role: "BEEKEEPER",
    organization: "Green Valley Apiaries",
    initials: "RK",
  },
  ANALYST: {
    email: "dr.anand@nbb.gov.in",
    name: "Dr. Anand Mehta",
    role: "ANALYST",
    organization: "National Bee Board Lab",
    initials: "AM",
  },
  PROCESSOR: {
    email: "suresh@amrit.in",
    name: "Suresh Patel",
    role: "PROCESSOR",
    organization: "Amrit Honey Processors",
    initials: "SP",
  },
  DISTRIBUTOR: {
    email: "meera@honeyline.in",
    name: "Meera Reddy",
    role: "DISTRIBUTOR",
    organization: "HoneyLine Distributors",
    initials: "MR",
  },
};

/** The demo role a demo account email belongs to, if it is a known demo account. */
export const DEMO_EMAIL_TO_ROLE: Record<string, DemoRole> = {
  [DEMO_USERS.BEEKEEPER.email]: "BEEKEEPER",
  [DEMO_USERS.ANALYST.email]: "ANALYST",
  [DEMO_USERS.PROCESSOR.email]: "PROCESSOR",
  [DEMO_USERS.DISTRIBUTOR.email]: "DISTRIBUTOR",
};

export const DEMO_ROLES: DemoRole[] = ["BEEKEEPER", "ANALYST", "PROCESSOR", "DISTRIBUTOR"];

/**
 * Maps a real domain `USER_ROLE` (from the server session) onto a demo
 * workspace role. Only the four demo workspaces are reachable; anything else
 * falls back to the closest workspace. Used when we only know the server role.
 */
const DOMAIN_ROLE_TO_DEMO: Record<string, DemoRole> = {
  BEEKEEPER: "BEEKEEPER",
  LAB: "ANALYST",
  ANALYST: "ANALYST",
  PROCESSOR: "PROCESSOR",
  DISTRIBUTOR: "DISTRIBUTOR",
};

export function demoRoleFromDomain(role: string): DemoRole | null {
  return DOMAIN_ROLE_TO_DEMO[role] ?? null;
}

/** Route a demo role lands on after sign-in. */
export const ROLE_HOME: Record<DemoRole, string> = {
  BEEKEEPER: "/keeper",
  ANALYST: "/analyst",
  PROCESSOR: "/processor",
  DISTRIBUTOR: "/distributor",
};

export function homeForRole(role: DemoRole | null | undefined): string {
  return role ? ROLE_HOME[role] : "/login";
}

/** Every role-home route, for the guard. */
export const ROLE_HOME_ROUTES: string[] = Object.values(ROLE_HOME);

export const ROLE_LABEL: Record<DemoRole, string> = {
  BEEKEEPER: "Honey Keeper",
  ANALYST: "Analyst / Laboratory",
  PROCESSOR: "Processor",
  DISTRIBUTOR: "Distributor",
};

/**
 * Public codes of the deterministic demo batches. Server-safe (no localStorage)
 * so it can be used on server or client to decide whether a requested batch
 * should be resolved through the shared demo dataset rather than the database.
 */
export const DEMO_BATCH_CODES: string[] = ["HC-2026-00124", "HC-2026-00281"];

/** True when `code` refers to one of the deterministic demo batches. */
export function isDemoBatchCode(code: string): boolean {
  return DEMO_BATCH_CODES.includes(code.toUpperCase());
}
