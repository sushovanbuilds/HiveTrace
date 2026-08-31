import { beforeEach, describe, expect, it } from "vitest";
import {
  getActiveDemoRole,
  getCurrentDemoUser,
  isAuthenticated,
  loginDemoUser,
  logoutDemoUser,
  requireRole,
  routeForRole,
  setActiveDemoRole,
} from "@/lib/demo/auth";
import { DEMO_EMAIL_TO_ROLE, DEMO_USERS, ROLE_HOME } from "@/lib/demo/config";

/**
 * Vitest runs in the Node environment where `window` is absent. The demo auth
 * module guards every storage access with `typeof window`, so we install a tiny
 * in-memory localStorage shim to observe persistence behaviour.
 */
function installLocalStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, "window", {
    value: { localStorage },
    configurable: true,
    writable: true,
  });
  return store;
}

beforeEach(() => {
  installLocalStorage();
});

describe("demo login", () => {
  it("validates the four real demo emails and assigns the correct role", () => {
    expect(loginDemoUser("ravi@greenvalley.in")?.role).toBe("BEEKEEPER");
    expect(loginDemoUser("dr.anand@nbb.gov.in")?.role).toBe("ANALYST");
    expect(loginDemoUser("suresh@amrit.in")?.role).toBe("PROCESSOR");
    expect(loginDemoUser("meera@honeyline.in")?.role).toBe("DISTRIBUTOR");
  });

  it("normalises case and whitespace in the email", () => {
    expect(loginDemoUser("  RAVI@GREENVALLEY.IN ")).not.toBeNull();
  });

  it("rejects an unknown email", () => {
    expect(loginDemoUser("doesnotexist@example.com")).toBeNull();
    expect(loginDemoUser("")).toBeNull();
  });

  it("persists identity (email, role, name, organization) — never credentials", () => {
    loginDemoUser("dr.anand@nbb.gov.in");
    const user = getCurrentDemoUser();
    expect(user?.email).toBe("dr.anand@nbb.gov.in");
    expect(user?.role).toBe("ANALYST");
    expect(user?.name).toBe("Dr. Anand Mehta");
    expect(user?.organization).toBe("National Bee Board Lab");
    expect(isAuthenticated()).toBe(true);
  });
});

describe("demo config mapping", () => {
  it("maps each demo email to its workspace", () => {
    expect(DEMO_EMAIL_TO_ROLE["ravi@greenvalley.in"]).toBe("BEEKEEPER");
    expect(DEMO_EMAIL_TO_ROLE["dr.anand@nbb.gov.in"]).toBe("ANALYST");
    expect(DEMO_EMAIL_TO_ROLE["suresh@amrit.in"]).toBe("PROCESSOR");
    expect(DEMO_EMAIL_TO_ROLE["meera@honeyline.in"]).toBe("DISTRIBUTOR");
  });

  it("maps each role to the correct dashboard route", () => {
    expect(ROLE_HOME.BEEKEEPER).toBe("/keeper");
    expect(ROLE_HOME.ANALYST).toBe("/analyst");
    expect(ROLE_HOME.PROCESSOR).toBe("/processor");
    expect(ROLE_HOME.DISTRIBUTOR).toBe("/distributor");
    expect(routeForRole("ANALYST")).toBe("/analyst");
  });

  it("holds one user per role with initials", () => {
    for (const role of ["BEEKEEPER", "ANALYST", "PROCESSOR", "DISTRIBUTOR"] as const) {
      expect(DEMO_USERS[role].initials.length).toBeGreaterThan(0);
    }
  });
});

describe("demo role guard", () => {
  it("admits the matching role", () => {
    loginDemoUser("suresh@amrit.in");
    expect(requireRole("PROCESSOR")?.email).toBe("suresh@amrit.in");
  });

  it("blocks a mismatched role", () => {
    loginDemoUser("suresh@amrit.in");
    expect(requireRole("BEEKEEPER")).toBeNull();
  });

  it("blocks an unauthenticated caller", () => {
    expect(requireRole("BEEKEEPER")).toBeNull();
  });
});

describe("logout & role switching", () => {
  it("clears the demo session on logout", () => {
    loginDemoUser("meera@honeyline.in");
    expect(isAuthenticated()).toBe(true);
    logoutDemoUser();
    expect(getCurrentDemoUser()).toBeNull();
    expect(isAuthenticated()).toBe(false);
    expect(getActiveDemoRole()).toBeNull();
  });

  it("switches the active workspace while the underlying session stays", () => {
    loginDemoUser("ravi@greenvalley.in");
    setActiveDemoRole("DISTRIBUTOR");
    expect(getActiveDemoRole()).toBe("DISTRIBUTOR");
  });
});
