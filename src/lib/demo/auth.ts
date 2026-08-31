"use client";

import {
  DEMO_EMAIL_TO_ROLE,
  DEMO_USERS,
  ROLE_HOME,
  homeForRole,
} from "@/lib/demo/config";
import type { DemoRole, DemoUser } from "@/lib/demo/types";

/**
 * Lightweight client-side demo session.
 *
 * This is a DEMO layer. It persists only the identity fields needed to render
 * the correct workspace after sign-in (email, role, display name, organisation)
 * — never passwords, tokens, private keys or any credential. The authoritative
 * authentication decision belongs to the server session (`/api/auth/me` + the
 * httpOnly cookie + the capability tables in `@/lib/auth/roles`); this module
 * is the *workspace* routing companion to it.
 *
 * To swap in real auth later, replace the `loginDemoUser` / `getCurrentDemoUser`
 * internals with calls to a real AuthService while keeping these signatures.
 */

const SESSION_KEY = "hivetrace_demo_session";
const ROLE_KEY = "hivetrace_demo_role";

export interface DemoSession {
  email: string;
  name: string;
  role: DemoRole;
  organization: string;
}

function safeGetItem(key: string): string | null {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — demo still works within the session */
  }
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function fromSession(
  s: Partial<DemoSession> | null | undefined,
): DemoUser | null {
  if (!s) return null;
  if (!s.email || !s.role || !(s.role in DEMO_USERS)) return null;
  const base = DEMO_USERS[s.role as DemoRole];
  return {
    email: s.email,
    name: s.name ?? base.name,
    role: s.role as DemoRole,
    organization: s.organization ?? base.organization,
    initials: base.initials,
  };
}

/** The demo user currently saved in local storage, or null when logged out. */
export function getCurrentDemoUser(): DemoUser | null {
  const raw = safeGetItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return fromSession(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getCurrentDemoUser() !== null;
}

/**
 * Validate an email against the known demo accounts and open a demo session for
 * its workspace. Returns the demo user on success, null when the email is not a
 * recognized demo account (the caller shows "Demo account not recognized.").
 */
export function loginDemoUser(email: string): DemoUser | null {
  const normalized = email.trim().toLowerCase();
  const role = DEMO_EMAIL_TO_ROLE[normalized];
  if (!role) return null;

  const user = DEMO_USERS[role];
  const session: DemoSession = {
    email: user.email,
    name: user.name,
    role,
    organization: user.organization,
  };
  safeSetItem(SESSION_KEY, JSON.stringify(session));
  refreshSessionCache();
  return fromSession(session);
}

/** The role whose workspace is currently active (may differ from the session's own role after switching). */
export function getActiveDemoRole(): DemoRole | null {
  const raw = safeGetItem(ROLE_KEY);
  if (raw && raw in DEMO_USERS) return raw as DemoRole;
  return getCurrentDemoUser()?.role ?? null;
}

/**
 * Switch the active workspace. Persists the chosen role so the role switcher
 * and the guards agree on which dashboard is "yours" even though the underlying
 * server session stays unchanged (a presenter can hop between nodes).
 */
export function setActiveDemoRole(role: DemoRole): void {
  safeSetItem(ROLE_KEY, role);
  refreshSessionCache();
}

export function clearActiveDemoRole(): void {
  safeRemoveItem(ROLE_KEY);
  refreshSessionCache();
}

/**
 * Close the demo session and forget transient role state. Persistent demo
 * datasets are intentionally left alone (see the data service).
 */
export function logoutDemoUser(): void {
  safeRemoveItem(SESSION_KEY);
  clearActiveDemoRole();
}

/* ── Reactive session store (for useSyncExternalStore) ───────────────── */

const sessionListeners = new Set<() => void>();

function emitSession(): void {
  sessionListeners.forEach((l) => l());
}

function readSession(): { user: DemoUser | null; role: DemoRole | null } {
  const user = getCurrentDemoUser();
  return { user, role: user ? getActiveDemoRole() ?? user.role : null };
}

let cachedSession: { user: DemoUser | null; role: DemoRole | null } | null = null;

function refreshSessionCache(): void {
  cachedSession = readSession();
  emitSession();
}

/**
 * Client snapshot for `useSyncExternalStore`, referentially stable so React can
 * detect demo-session changes after login / role switch / logout.
 */
export function getDemoSessionSnapshot(): { user: DemoUser | null; role: DemoRole | null } {
  if (!cachedSession) refreshSessionCache();
  return cachedSession!;
}

export function subscribeDemoSession(listener: () => void): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

/** Deterministic SSR/hydration snapshot — there is never a demo session on the server. */
export const DEMO_SESSION_SERVER_SNAPSHOT: { user: null; role: null } = {
  user: null,
  role: null,
};

/** Redirect target for a demo role. */
export function routeForRole(role: DemoRole | null | undefined): string {
  return homeForRole(role);
}

/**
 * Route guard helper: returns the demo user if they are authenticated AND the
 * active/requested role matches `role`; otherwise returns null so the calling
 * page can redirect to the correct home. Never throws the user into a login
 * loop — an unauthenticated caller simply gets no user back.
 */
export function requireRole(role: DemoRole): DemoUser | null {
  const user = getCurrentDemoUser();
  if (!user) return null;
  if (user.role !== role) return null;
  return user;
}

/** True when `pathname` is one of the demo role-home routes. */
export function isDemoHomeRoute(pathname: string): boolean {
  return (Object.values(ROLE_HOME) as string[]).includes(pathname);
}
