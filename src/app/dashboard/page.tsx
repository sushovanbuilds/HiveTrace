import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { ChartCard, RingGauge, TrendChart } from "@/components/charts";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const FALLBACK = {
  activeHives: 156,
  harvestQty: 4.2,
  harvestK: null as string | null,
  healthy: 142,
  attention: 14,
  healthPct: 91,
  alerts: [] as Array<{
    id: string;
    type: string;
    severity: string;
    message: string;
    createdAt: Date;
    batch: { id: string; publicCode: string; honeyType: string; originRegion: string } | null;
  }>,
};

async function loadMetrics() {
  try {
    const [hiveCounts, harvestAgg, alerts] = await Promise.all([
      db.hive.groupBy({ by: ["status"], _count: { _all: true } }),
      db.harvest.aggregate({ _sum: { quantity: true } }),
      db.alert.findMany({
        where: { status: { in: ["NEW", "ACKNOWLEDGED"] } },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          batch: {
            select: { id: true, publicCode: true, honeyType: true, originRegion: true },
          },
        },
      }),
    ]);
    const active =
      hiveCounts.find((h) => h.status === "ACTIVE")?._count._all ?? 0;
    const healthy = active;
    const attention =
      (hiveCounts.find((h) => h.status === "INSPECTION")?._count._all ?? 0) +
      (hiveCounts.find((h) => h.status === "COLONY_LOSS")?._count._all ?? 0) +
      alerts.filter((a) => a.severity === "HIGH" || a.severity === "CRITICAL").length;
    return {
      activeHives: active,
      harvestQty: Math.round((harvestAgg._sum.quantity ?? 0) * 10) / 10,
      harvestK: harvestAgg._sum.quantity ? (harvestAgg._sum.quantity / 1000).toFixed(1) : null,
      healthy,
      attention,
      healthPct: 91,
      alerts,
    };
  } catch {
    return null;
  }
}

const SEASON = [
  { m: "APR", v: 82 },
  { m: "MAY", v: 91 },
  { m: "JUN", v: 74 },
  { m: "JUL", v: 88 },
  { m: "AUG", v: 96 },
  { m: "SEP", v: 84 },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

type QuickAction = { href: string; icon: string; label: string; tone: string };

const ALL_ACTIONS: QuickAction[] = [
  { href: "/harvests/new", icon: "add_circle", label: "Log Harvest", tone: "bg-primary-container text-on-primary-container" },
  { href: "/batches", icon: "inventory_2", label: "Register Batch", tone: "bg-secondary-container text-on-secondary-container" },
  { href: "/verify", icon: "qr_code_2", label: "Issue Labels", tone: "bg-tertiary-container/50 text-on-tertiary-container" },
  { href: "/quality", icon: "science", label: "Lab Results", tone: "bg-surface-container text-on-surface-variant" },
];

const ROLE_ACTIONS: Record<string, QuickAction[]> = {
  BEEKEEPER: [
    { href: "/harvests/new", icon: "add_circle", label: "Log Harvest", tone: "bg-primary-container text-on-primary-container" },
    { href: "/batches", icon: "inventory_2", label: "Register Batch", tone: "bg-secondary-container text-on-secondary-container" },
    { href: "/hives", icon: "hive", label: "Hive Fleet", tone: "bg-tertiary-container/50 text-on-tertiary-container" },
    { href: "/verify", icon: "qr_code_2", label: "Issue Labels", tone: "bg-surface-container text-on-surface-variant" },
  ],
  COLLECTOR: [
    { href: "/custody", icon: "handshake", label: "Transfer Custody", tone: "bg-primary-container text-on-primary-container" },
    { href: "/batches", icon: "inventory_2", label: "Register Batch", tone: "bg-secondary-container text-on-secondary-container" },
    { href: "/supply-chain", icon: "local_shipping", label: "Supply Chain", tone: "bg-tertiary-container/50 text-on-tertiary-container" },
    { href: "/traceability", icon: "timeline", label: "Traceability", tone: "bg-surface-container text-on-surface-variant" },
  ],
  LAB: [
    { href: "/quality", icon: "science", label: "Upload Lab Results", tone: "bg-primary-container text-on-primary-container" },
    { href: "/batches", icon: "inventory_2", label: "View Batches", tone: "bg-secondary-container text-on-secondary-container" },
    { href: "/risk", icon: "shield", label: "Risk Center", tone: "bg-tertiary-container/50 text-on-tertiary-container" },
    { href: "/incidents", icon: "policy", label: "Investigations", tone: "bg-surface-container text-on-surface-variant" },
  ],
  PROCESSOR: [
    { href: "/custody", icon: "handshake", label: "Transfer Custody", tone: "bg-primary-container text-on-primary-container" },
    { href: "/batches", icon: "inventory_2", label: "Process Batch", tone: "bg-secondary-container text-on-secondary-container" },
    { href: "/verify", icon: "qr_code_2", label: "Issue Labels", tone: "bg-tertiary-container/50 text-on-tertiary-container" },
    { href: "/supply-chain", icon: "local_shipping", label: "Supply Chain", tone: "bg-surface-container text-on-surface-variant" },
  ],
  DISTRIBUTOR: [
    { href: "/custody", icon: "handshake", label: "Transfer Custody", tone: "bg-primary-container text-on-primary-container" },
    { href: "/verify", icon: "qr_code_2", label: "Issue Labels", tone: "bg-secondary-container text-on-secondary-container" },
    { href: "/supply-chain", icon: "local_shipping", label: "Supply Chain", tone: "bg-tertiary-container/50 text-on-tertiary-container" },
    { href: "/traceability", icon: "timeline", label: "Traceability", tone: "bg-surface-container text-on-surface-variant" },
  ],
  INVESTIGATOR: [
    { href: "/risk", icon: "shield", label: "Risk Center", tone: "bg-primary-container text-on-primary-container" },
    { href: "/incidents", icon: "policy", label: "Investigations", tone: "bg-secondary-container text-on-secondary-container" },
    { href: "/traceability", icon: "timeline", label: "Traceability", tone: "bg-tertiary-container/50 text-on-tertiary-container" },
    { href: "/genealogy", icon: "account_tree", label: "Genealogy", tone: "bg-surface-container text-on-surface-variant" },
  ],
  ADMIN: ALL_ACTIONS,
};

export default async function DashboardPage() {
  const sessionUser = await getSession();
  const role = sessionUser?.role ?? "ADMIN";
  const firstName = sessionUser?.name?.trim().split(/\s+/)[0] ?? "Rahul";
  const actions = ROLE_ACTIONS[role] ?? ALL_ACTIONS;

  const metrics = await loadMetrics();
  const m = metrics ?? FALLBACK;

  const harvestDisplay =
    metrics?.harvestK && metrics.harvestQty >= 1000
      ? `${metrics.harvestK}k`
      : String(metrics?.harvestQty ?? m.harvestQty);

  const healthPct =
    m.activeHives > 0
      ? Math.round(((m.activeHives - m.attention) / m.activeHives) * 100)
      : FALLBACK.healthPct;

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-headline-lg tracking-tight text-on-surface">
          {greeting()}, {firstName}.
        </h1>
        <p className="mt-1 text-body-lg text-on-surface-variant/80">
          Here&apos;s what&apos;s happening across the HiveTrace network.
        </p>
      </div>

      {/* Top metrics */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        <div className="metric-card flex h-32 flex-col justify-between p-6 transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center gap-2 text-on-surface-variant">
            <Icon name="hive" className="text-[18px]" />
            <span className="text-[10px] font-medium uppercase tracking-widest">Active Hives</span>
          </div>
          <p className="text-headline-md tabular-nums tracking-tight text-on-surface">
            {m.activeHives || FALLBACK.activeHives}
          </p>
        </div>
        <div className="metric-card flex h-32 flex-col justify-between p-6 transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center gap-2 text-on-surface-variant">
            <Icon name="water_drop" className="text-[18px]" />
            <span className="text-[10px] font-medium uppercase tracking-widest">Harvested (kg)</span>
          </div>
          <p className="text-headline-md tabular-nums tracking-tight text-on-surface">
            {metrics?.harvestQty ? `${harvestDisplay}` : "4.2k"}
          </p>
        </div>
        <div className="metric-card flex h-32 flex-col justify-between p-6 transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center gap-2 text-tertiary">
            <Icon name="health_and_safety" className="text-[18px]" />
            <span className="text-[10px] font-medium uppercase tracking-widest">Healthy</span>
          </div>
          <p className="text-headline-md tabular-nums tracking-tight text-on-surface">
            {m.healthy || FALLBACK.healthy}
          </p>
        </div>
        <div className="metric-card flex h-32 flex-col justify-between border-error/20 bg-error-container/10 p-6 transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center gap-2 text-error">
            <Icon name="warning" className="text-[18px]" />
            <span className="text-[10px] font-medium uppercase tracking-widest">Attention Needed</span>
          </div>
          <p className="text-headline-md tabular-nums tracking-tight text-error">
            {m.attention || FALLBACK.attention}
          </p>
        </div>
      </div>

      {/* Bento charts */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
        <ChartCard
          className="md:col-span-8"
          title="Honey Production Trend"
          action={
            <Link
              href="/reports"
              className="flex items-center gap-1 rounded-md border border-outline-variant/20 bg-white/50 px-3 py-1 text-metadata-sm uppercase tracking-widest text-on-surface-variant transition-colors hover:text-primary"
            >
              This Season
              <Icon name="expand_more" className="text-[16px]" />
            </Link>
          }
        >
          <TrendChart labels={SEASON.map((s) => s.m)} values={SEASON.map((s) => s.v)} />
        </ChartCard>

        <ChartCard className="md:col-span-4" title="Hive Health">
          <div className="flex h-full flex-col items-center justify-center">
            <RingGauge value={healthPct / 100} label={`${healthPct}%`} sub="Optimal" />
            <div className="mt-8 flex w-full justify-center gap-6">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary-container" />
                <span className="text-[11px] tracking-wide text-on-surface-variant">Healthy ({m.healthy || FALLBACK.healthy})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full border border-outline-variant/20 bg-surface-container-highest" />
                <span className="text-[11px] tracking-wide text-on-surface-variant">Action ({m.attention || FALLBACK.attention})</span>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Attention required */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <div className="glass-card p-6">
          <h3 className="mb-4 border-b border-outline-variant/10 pb-3 font-medium uppercase tracking-widest text-on-surface-variant">
            Attention Required
          </h3>
          {m.alerts && m.alerts.length > 0 ? (
            <ul className="space-y-4">
              {m.alerts.map((a) => {
                const critical = a.severity === "HIGH" || a.severity === "CRITICAL";
                return (
                  <li
                    key={a.id}
                    className="flex items-start gap-4 rounded-lg border border-outline-variant/10 bg-white p-4 shadow-sm transition-colors hover:border-outline-variant/30"
                  >
                    <span
                      className={`mt-0.5 rounded-md p-1.5 text-[20px] ${
                        critical ? "bg-error/10 text-error" : "bg-primary/10 text-primary"
                      }`}
                    >
                      <Icon name={critical ? "warning" : "info"} />
                    </span>
                    <div>
                      <p className="text-body-md font-semibold tracking-tight text-on-surface">
                        {a.batch ? `${a.batch.publicCode} · ` : ""}
                        {a.type.replace(/_/g, " ")}
                      </p>
                      <p className="mt-1 text-[13px] leading-relaxed text-on-surface-variant">{a.message}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex items-center gap-2 py-6 text-on-surface-variant">
              <Icon name="task_alt" className="text-[22px] text-tertiary" />
              All clear — no open alerts across your network.
            </div>
          )}
          <div className="mt-4 flex items-center gap-1 text-[13px] font-medium text-on-surface-variant">
            <Link href="/incidents" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              View all alerts
              <Icon name="arrow_forward" className="text-[16px]" />
            </Link>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="mb-4 border-b border-outline-variant/10 pb-3 font-medium uppercase tracking-widest text-on-surface-variant">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {actions.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className={`flex flex-col items-start gap-3 rounded-xl p-5 transition-all hover:shadow-md active:scale-[0.98] ${a.tone}`}
              >
                <Icon name={a.icon} className="text-[24px]" />
                <span className="text-body-md font-semibold">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}