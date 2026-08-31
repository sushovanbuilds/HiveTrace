import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { ChartCard, TrendChart, RingGauge } from "@/components/charts";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function loadStats() {
  try {
    const [batches, byRegion] = await Promise.all([
      db.batch.findMany({
        select: { id: true, honeyType: true, originRegion: true, quantity: true },
      }),
      db.batch.groupBy({ by: ["originRegion"], _count: { _all: true } }),
    ]);
    return { batches, byRegion };
  } catch {
    return null;
  }
}

export default async function ReportsPage() {
  const data = await loadStats();
  const batches = data?.batches ?? [];
  const total = batches.length;

  const weeks = [
    { week: "W1", q: 34, pass: 95 },
    { week: "W2", q: 41, pass: 96 },
    { week: "W3", q: 38, pass: 93 },
    { week: "W4", q: 47, pass: 97 },
    { week: "W5", q: 52, pass: 96 },
    { week: "W6", q: 49, pass: 94 },
    { week: "W7", q: 57, pass: 97 },
  ];

  const regions = data?.byRegion?.length
    ? data.byRegion.map((r) => ({ label: r.originRegion, v: r._count._all }))
    : [
        { label: "West Bengal", v: 340 },
        { label: "Himachal Pradesh", v: 210 },
        { label: "Uttarakhand", v: 180 },
        { label: "Sundarbans", v: 120 },
      ];
  const regionMax = Math.max(...regions.map((r) => r.v), 1);

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-headline-lg tracking-tight text-on-surface">Season Reports</h1>
        <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">
          Grand Honey Flow 2026 — production volume, quality pass rates and traceability coverage across the network.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {[
          { icon: "inventory_2", label: "Batches This Season", value: total || "1,248", sub: "▲ 18% vs prev season" },
          { icon: "scale", label: "Honey Produced", value: "12,480 kg", sub: "▲ 9.2% MoM" },
          { icon: "verified", label: "Fully Traceable", value: "97.4%", sub: "+2.1 pts since May" },
          { icon: "campaign", label: "Verifications", value: "84.2k", sub: "▲ 1.4× YoY" },
        ].map((m) => (
          <div key={m.label} className="metric-card rounded-xl p-5 transition-shadow hover:shadow-md">
            <p className="mb-4 flex items-center gap-2 text-label-caps uppercase tracking-wider text-on-surface-variant">
              <Icon name={m.icon} className="text-[18px]" />
              {m.label}
            </p>
            <p className="text-headline-md tracking-tight text-on-surface">{m.value}</p>
            <p className="mt-1 text-metadata-sm text-tertiary">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Weekly Harvest Volume (kg)" icon="assessment" className="lg:col-span-2">
          <div className="flex h-64 items-end justify-between gap-2 pt-2">
            {weeks.map((w) => (
              <div key={w.week} className="flex flex-1 flex-col items-center gap-2">
                <div className="relative flex w-full flex-1 items-end">
                  <div
                    className="group relative w-full rounded-t-md"
                    style={{ height: `${(w.q / 60) * 100}%`, background: "linear-gradient(180deg,#FFB800,#E39000)" }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[11px] tabular-nums text-on-surface opacity-0 transition-opacity group-hover:opacity-100">
                      {w.q}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-on-surface-variant">{w.week}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Overall Pass Rate" icon="check_circle">
          <div className="flex h-full flex-col items-center justify-center">
            <RingGauge value={0.962} label="96.2%" sub="all quality panels" tone="#3b6934" />
            <div className="mt-8 w-full space-y-3 text-metadata-sm">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Rejected lots</span>
                <span className="tabular-nums text-on-surface">6</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">On-hold / retest</span>
                <span className="tabular-nums text-on-surface">13</span>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Volume by Region" icon="location_on">
          <div className="space-y-4 pt-2">
            {regions.map((r) => (
              <div key={r.label} className="flex items-center gap-4">
                <span className="w-32 shrink-0 truncate text-metadata-sm text-on-surface-variant">{r.label}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-variant">
                  <div className="h-full rounded-full bg-primary-container" style={{ width: `${(r.v / regionMax) * 100}%` }} />
                </div>
                <span className="w-14 text-right text-metadata-sm tabular-nums text-on-surface">{r.v}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Quality KPI Trends (7 weeks)" icon="monitoring">
          <TrendChart
            labels={weeks.map((w) => w.week)}
            values={weeks.map((w) => w.pass)}
            tone="#3b6934"
            height="h-28"
          />
        </ChartCard>
      </div>
    </AppShell>
  );
}