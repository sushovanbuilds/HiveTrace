"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { logoutDemoUser } from "@/lib/demo/auth";
import { useDemoSession } from "@/lib/demo/hooks";
import { DEMO_MOBILE_NAV, DEMO_NAV, type DemoNavItem } from "@/lib/demo/nav";
import { ROLE_LABEL } from "@/lib/demo/config";
import type { DemoRole } from "@/lib/demo/types";
import { DemoBadge } from "@/components/demo/demo-badge";
import { RoleSwitcher } from "@/components/demo/role-switcher";

type Capability = string;

type NavItem = {
  href: string;
  label: string;
  icon: string;
  cap: Capability;
  match?: (p: string) => boolean;
};

const ROLE_LABELS: Record<string, string> = {
  BEEKEEPER: "Beekeeper",
  COLLECTOR: "Collector",
  LAB: "Quality Lab",
  PROCESSOR: "Processor",
  DISTRIBUTOR: "Distributor",
  INVESTIGATOR: "Investigator",
  ADMIN: "Admin",
};

const NAV_GROUPS: Array<{ section: string; items: NavItem[] }> = [
  {
    section: "Operations",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard", cap: "batch:read", match: (p) => p === "/dashboard" },
      { href: "/batches", label: "Batches", icon: "inventory_2", cap: "batch:read", match: (p) => p.startsWith("/batches") },
      { href: "/traceability", label: "Traceability", icon: "timeline", cap: "batch:read", match: (p) => p.startsWith("/traceability") },
      { href: "/hives", label: "Hive Fleet", icon: "hive", cap: "farm:write", match: (p) => p.startsWith("/hives") },
      { href: "/quality", label: "Quality Lab", icon: "science", cap: "quality:write", match: (p) => p.startsWith("/quality") },
    ],
  },
  {
    section: "Integrity",
    items: [
      { href: "/risk", label: "Risk Center", icon: "shield", cap: "risk:recalculate", match: (p) => p.startsWith("/risk") },
      { href: "/incidents", label: "Investigations", icon: "policy", cap: "incident:read", match: (p) => p.startsWith("/incidents") },
      { href: "/genealogy", label: "Genealogy", icon: "account_tree", cap: "batch:read", match: (p) => p.startsWith("/genealogy") },
      { href: "/blockchain", label: "Blockchain Proofs", icon: "link", cap: "batch:read", match: (p) => p.startsWith("/blockchain") },
      { href: "/supply-chain", label: "Supply Chain", icon: "local_shipping", cap: "custody:transfer", match: (p) => p.startsWith("/supply-chain") },
      { href: "/custody", label: "Custody", icon: "handshake", cap: "custody:transfer", match: (p) => p.startsWith("/custody") },
    ],
  },
  {
    section: "System",
    items: [
      { href: "/settings", label: "Settings", icon: "settings", cap: "organisation:write", match: (p) => p.startsWith("/settings") },
    ],
  },
];

const MOBILE_DOCK: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "dashboard", cap: "batch:read", match: (p) => p === "/dashboard" },
  { href: "/batches", label: "Batches", icon: "inventory_2", cap: "batch:read", match: (p) => p.startsWith("/batches") },
  { href: "/traceability", label: "Trace", icon: "timeline", cap: "batch:read", match: (p) => p.startsWith("/traceability") },
  { href: "/quality", label: "Lab", icon: "science", cap: "quality:write", match: (p) => p.startsWith("/quality") },
  { href: "/risk", label: "Risk", icon: "shield", cap: "risk:recalculate", match: (p) => p.startsWith("/risk") },
];

function isActive(item: NavItem, pathname: string) {
  return item.match ? item.match(pathname) : pathname === item.href;
}

function SidebarNav({ caps, demoItems }: { caps: string[] | null; demoItems: DemoNavItem[] | null }) {
  const pathname = usePathname();
  if (demoItems) {
    return (
      <nav className="flex-1 space-y-7 overflow-y-auto hide-scrollbar px-4 py-6">
        <div>
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-on-surface-variant/80">
            Workspace
          </p>
          <ul className="space-y-1">
            {demoItems.map((item) => {
              const active = item.match(pathname);
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-body-md transition-all duration-150 ${
                      active
                        ? "bg-primary-container font-bold text-on-primary-container scale-[0.98]"
                        : "font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                    }`}
                  >
                    <Icon
                      name={item.icon}
                      fill={active}
                      className={`text-[22px] ${active ? "" : "text-on-surface-variant/90 group-hover:text-on-surface"}`}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    );
  }
  const visible = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => caps === null || caps.includes(item.cap)),
  })).filter((group) => group.items.length > 0);
  return (
    <nav className="flex-1 space-y-7 overflow-y-auto hide-scrollbar px-4 py-6">
      {visible.map((group) => (
        <div key={group.section}>
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-on-surface-variant/80">
            {group.section}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = isActive(item, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-body-md transition-all duration-150 ${
                      active
                        ? "bg-primary-container font-bold text-on-primary-container scale-[0.98]"
                        : "font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                    }`}
                  >
                    <Icon
                      name={item.icon}
                      fill={active}
                      className={`text-[22px] ${active ? "" : "text-on-surface-variant/90 group-hover:text-on-surface"}`}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3 px-5 pt-6 pb-2">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary-container shadow-sm">
        <Icon name="hive" fill className="text-[24px]" />
      </span>
      <div>
        <p className="text-body-lg font-bold tracking-tight text-on-surface leading-tight">HiveTrace</p>
        <p className="text-[11px] font-medium tracking-[0.08em] text-on-surface-variant uppercase">Tracing the journey</p>
      </div>
    </Link>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function Topbar({
  user,
  onLogout,
  demoRole,
}: {
  user: { name: string; role: string } | null;
  onLogout: () => void;
  demoRole: DemoRole | null;
}) {
  const pathname = usePathname();
  const demoNav = demoRole ? DEMO_NAV[demoRole] : null;
  const current =
    (demoNav ? demoNav.find((i) => i.match(pathname)) : undefined) ??
    NAV_GROUPS.flatMap((g) => g.items).find((i) => isActive(i, pathname));
  const roleLabel = demoRole
    ? ROLE_LABEL[demoRole]
    : user
      ? (ROLE_LABELS[user.role] ?? user.role)
      : null;
  return (
    <header className="sticky top-0 z-20 border-b border-outline-variant/40 bg-surface/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-4 px-5 md:px-8">
        <div className="flex items-center gap-3">
          <span className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-container text-on-primary-container">
            <Icon name="hive" fill className="text-[20px]" />
          </span>
          <p className="hidden md:block font-headline-md text-headline-md text-on-surface">
            {current?.label ?? "HiveTrace"}
          </p>
          <p className="md:hidden font-body-md font-semibold text-body-md text-on-surface">
            {current?.label ?? "HiveTrace"}
          </p>
          {roleLabel ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-tertiary-container/50 px-3 py-1 text-label-caps font-semibold uppercase tracking-widest text-on-tertiary-container">
              <Icon name="verified_user" className="text-[14px]" />
              {roleLabel}
            </span>
          ) : null}
          {demoRole ? <DemoBadge compact /> : null}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onLogout}
            title="Sign out"
            aria-label="Sign out"
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-error transition-colors"
          >
            <Icon name="logout" className="text-[22px]" />
          </button>
          <button
            type="button"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            aria-label="Notifications"
          >
            <Icon name="notifications" />
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-error" />
            </span>
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <Icon name="sync" className="text-[20px]" />
            <span className="hidden sm:inline text-body-md font-medium">Synced 2m ago</span>
          </button>
          <div
            className="hidden md:flex h-10 w-10 items-center justify-center rounded-lg bg-tertiary-container/60 text-on-tertiary-container font-semibold text-body-md ring-1 ring-tertiary-container"
            title={user ? `${user.name} · ${ROLE_LABELS[user.role] ?? user.role}` : undefined}
          >
            {user ? initials(user.name) : "HT"}
          </div>
        </div>
      </div>
    </header>
  );
}

function MobileDock({ caps, demoRole }: { caps: string[] | null; demoRole: DemoRole | null }) {
  const pathname = usePathname();
  const items = demoRole
    ? DEMO_MOBILE_NAV[demoRole]
    : MOBILE_DOCK.filter((item) => caps === null || caps.includes(item.cap));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 md:hidden">
      <div className="mx-4 mb-[calc(1rem+env(safe-area-inset-bottom))] rounded-2xl border border-outline-variant/60 bg-surface-container-low/95 shadow-lg shadow-black/5 backdrop-blur-xl">
        <div className="flex items-stretch justify-between px-2 py-2">
          {items.map((item) => {
            const active = item.match ? item.match(pathname) : item.href === pathname;
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 transition-all duration-150 ${
                  active
                    ? "bg primary-container bg-primary-container text-on-primary-container font-semibold"
                    : "text-on-surface-variant"
                }`}
              >
                <Icon name={item.icon} fill={active} className="text-[22px]" />
                <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

type MeState =
  | { status: "loading" }
  | { status: "anon"; user: null; caps: null }
  | { status: "signed-in"; user: { name: string; email: string; role: string }; caps: string[] };

export function AppShell({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeState>({ status: "loading" });
  const [loggingOut, setLoggingOut] = useState(false);
  const demoSession = useDemoSession();

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/auth/me", { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { data: null }))
      .then((d) => {
        const data = d?.data;
        if (data?.user) {
          setMe({ status: "signed-in", user: data.user, caps: data.capabilities ?? [] });
        } else {
          setMe({ status: "anon", user: null, caps: null });
        }
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setMe({ status: "anon", user: null, caps: null });
      });
    return () => ctrl.abort();
  }, []);

  // A demo user is present when a recognized demo email is active. Prefer the
  // live demo session when available, otherwise fall back to the server user.
  // The demo session comes from `useSyncExternalStore`: during SSR/hydration it
  // resolves to "no session" (matching the server render), and the real
  // localStorage session is swapped in after mount without a mismatch.
  const demoRole = useMemo<DemoRole | null>(() => {
    const live = demoSession.user;
    if (live) return demoSession.role ?? live.role;
    if (me.status === "signed-in") {
      const fromDomain = me.user.role === "LAB" ? "ANALYST" : me.user.role;
      return fromDomain === "BEEKEEPER" || fromDomain === "ANALYST" || fromDomain === "PROCESSOR" || fromDomain === "DISTRIBUTOR"
        ? (fromDomain as DemoRole)
        : null;
    }
    return null;
  }, [demoSession, me]);

  const user = me.status === "signed-in" ? me.user : null;
  const caps = me.status === "signed-in" ? me.caps : null;
  const demoNav = demoRole ? DEMO_NAV[demoRole] : null;
  const demoUser = demoSession.user;

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Surface the button state back to idle even if the network fails.
    }
    logoutDemoUser();
    setMe({ status: "anon", user: null, caps: null });
    setLoggingOut(false);
    window.location.href = "/login";
  };

  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden md:flex w-64 flex-col border-r border-outline-variant/60 bg-surface-container-low">
        <Brand />
        <SidebarNav caps={caps} demoItems={demoNav} />
        <div className="border-t border-outline-variant/40 p-4">
          {demoUser && demoRole ? (
            <div className="mb-2 rounded-lg bg-surface-container/70 p-1">
              <RoleSwitcher currentRole={demoRole} />
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-container transition-colors"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tertiary-container/60 text-on-tertiary-container text-body-md font-semibold">
                {demoUser ? initials(demoUser.name) : user ? initials(user.name) : "HT"}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-body-md font-semibold text-on-surface">
                  {demoUser ? demoUser.name : user ? user.name : "HiveTrace Network"}
                </span>
                <span className="block truncate text-metadata-sm text-on-surface-variant">
                  {demoRole
                    ? ROLE_LABEL[demoRole]
                    : user
                      ? (ROLE_LABELS[user.role] ?? user.role)
                      : "Signed out · demo"}
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-error transition-colors"
            >
              <Icon name={loggingOut ? "sync" : "logout"} className="text-[22px]" />
            </button>
          </div>
        </div>
      </aside>
      <div className="md:pl-64">
        <Topbar user={user} onLogout={logout} demoRole={demoRole} />
        <main className="mx-auto max-w-[1440px] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 md:px-8 md:pb-12 md:pt-8">
          {children}
        </main>
      </div>
      <MobileDock caps={caps} demoRole={demoRole} />
    </div>
  );
}
