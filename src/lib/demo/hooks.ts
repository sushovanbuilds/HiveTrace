"use client";

import {
  useCallback,
  useEffect,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import {
  logoutDemoUser,
  requireRole,
  subscribeDemoSession,
  getDemoSessionSnapshot,
  DEMO_SESSION_SERVER_SNAPSHOT,
} from "@/lib/demo/auth";
import {
  subscribeDemoData,
  getDemoDataSnapshot,
  DEMO_DATA_SERVER_SNAPSHOT,
  saveDemoData,
  resetDemoData,
  type DemoData,
} from "@/lib/demo/data";
import { ROLE_HOME } from "@/lib/demo/config";
import type { DemoRole, DemoUser } from "@/lib/demo/types";

/**
 * Reactive access to the shared demo dataset. Backed by `useSyncExternalStore`:
 * during SSR/hydration React renders the deterministic server snapshot, and only
 * after mount swaps to the live localStorage dataset — so the demo pages never
 * trigger a hydration mismatch even though localStorage is client-only. The
 * data service's pub/sub keeps this hook in sync with mutations.
 */
export function useDemoData(): DemoData {
  return useSyncExternalStore(
    subscribeDemoData,
    getDemoDataSnapshot,
    () => DEMO_DATA_SERVER_SNAPSHOT,
  );
}

/**
 * Reactive access to the active demo session (identity + current workspace role).
 * Server snapshot is always "no session", which keeps SSR identical to the
 * client's first render; overhead is swapped in after hydration on login/switch.
 */
export function useDemoSession(): {
  user: DemoUser | null;
  role: DemoRole | null;
} {
  return useSyncExternalStore(
    subscribeDemoSession,
    getDemoSessionSnapshot,
    () => DEMO_SESSION_SERVER_SNAPSHOT,
  );
}

/**
 * Client-side demo workspace hook for the role dashboards (/keeper, /analyst,
 * ...). A guard effect bounces a signed-in user on the wrong workspace back to
 * their own home and sends unauthenticated visitors to /login (the server guard
 * would normally have handled that already). The dataset stays reactive through
 * the data service's pub/sub.
 */
export function useDemoWorkspace(role: DemoRole) {
  const router = useRouter();
  const { user } = useDemoSession();
  const data = useDemoData();

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== role) {
      router.replace(ROLE_HOME[user.role]);
    }
  }, [user, role, router]);

  const ready = !!user && user.role === role;

  /** Persist a mutation produced by one of the data-service functions. */
  const mutate = useCallback((next: DemoData) => {
    saveDemoData(next);
  }, []);

  const reset = useCallback(() => {
    resetDemoData();
  }, []);

  const logout = useCallback(() => {
    logoutDemoUser();
    router.replace("/login");
  }, [router]);

  return {
    user,
    data,
    ready,
    mutate,
    reset,
    logout,
  };
}

/** Convenience: the demo user for a page that only needs identity. */
export function useDemoUser(): DemoUser | null {
  return useDemoSession().user;
}

/** Re-exported for callers that need the shared data service type. */
export type { DemoData };
export { requireRole };