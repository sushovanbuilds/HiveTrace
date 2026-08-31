"use client";

import { ROLE_HOME, homeForRole } from "@/lib/demo/config";
import type { DemoRole } from "@/lib/demo/types";
import { getActiveDemoRole, getCurrentDemoUser } from "@/lib/demo/auth";

/**
 * Demo route guard. A role attempting to reach another role's workspace is sent
 * back to their own home; an authenticated user browsing around is untouched;
 * nobody gets a confusing dead end.
 *
 * Usage from a client page:
 *   const redirectTo = demoPageGuard("/keeper");
 *   if (redirectTo) { router.replace(redirectTo); return; }
 */

export function demoPageGuard(pathname: string): string | null {
  const user = getCurrentDemoUser();
  if (!user) {
    // Could not read a demo session — the server session will already have
    // handled redirects to /login for protected routes; here we defer to it.
    return null;
  }

  const home = ROLE_HOME[user.role];
  if (home === pathname) return null;

  // A known demo role-home that does not match the signed-in role → bounce home.
  if ((Object.values(ROLE_HOME) as string[]).includes(pathname)) {
    return home;
  }

  return null;
}

/** Same as demoPageGuard but honours the active (switched) role rather than the signed-in one. */
export function demoSwitchGuard(pathname: string): string | null {
  const active = getActiveDemoRole();
  if (!active) return null;
  const home = homeForRole(active);
  return home === pathname ? null : home;
}

/** Convenience: the home route a role should be on. */
export function homeRouteFor(role: DemoRole): string {
  return homeForRole(role);
}

export { ROLE_HOME };
