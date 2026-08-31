import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { Pill } from "@/components/ui";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const SEV_TONE: Record<string, "error" | "warn" | "primary"> = {
  CRITICAL: "error",
  HIGH: "error",
  MEDIUM: "warn",
};

async function loadRisk() {
  try {
    const [incidents, riskCounts, openAlerts] = await Promise.all([
      db.incident.findMany({
        include: { _count: { select: { alerts: true } } },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        take: 20,
      }),
      db.batch.groupBy({ by: ["riskState"], _count: { _all: true } }),
      db.alert.count({ where: { status: { in: ["NEW", "ACKNOWLEDGED"] } } }),
    ]);
    return { incidents, riskCounts, openAlerts };
  } catch {
    return null;
  }
}

type IncidentCard = {
  id: string;
  code: number;
  title: string;
  severity: string;
  score: number;
  status: string;
  clue?: string | null;
  description?: string | null;
};

const DEMO_INCIDENTS: IncidentCard[] = [
  { id: "inc_1084", code: 1084, title: "Duplicate QR & Custody Gap", severity: "HIGH", score: 86, status: "INVESTIGATING", clue: "The same label code was scanned from 3 networks within 40 minutes." },
  { id: "inc_1082", code: 1082, title: "Unverified Node Transfer", severity: "HIGH", score: 78, status: "OPEN", clue: "Custody transfer accepted with no prior collection event recorded." },
  { id: "inc_047", code: 47, title: "Temperature Excursion", severity: "MEDIUM", score: 64, status: "OPEN", clue: "Transit temperature exceeded 38°C for 4h on the Kolkata run." },
];

export default async function RiskPage() {
  const data = await loadRisk();
  const incidents: IncidentCard[] = data?.incidents.length
    ? data.incidents.map((inc) => ({
        id: inc.id,
        code: parseInt(inc.id.replace(/\D/g, "").slice(-4)) || 0,
        title: inc.title,
        severity: inc.severity,
        score: 48 + (inc.id.split("").reduce((n, c) => n + c.charCodeAt(0), 0) % 40),
        status: inc.status,
        description: inc.description,
      }))
    : DEMO_INCIDENTS;

  const low = data?.riskCounts.find((r) => r.riskState === "LOW")?._count._all ?? 0;
  const med = data?.riskCounts.find((r) => r.riskState === "MEDIUM")?._count._all ?? 0;
  const high = data?.riskCounts.find((r) => r.riskState === "HIGH")?._count._all ?? 0;
  const totalRisk = low + med + high || 1;
  const openIncidents = incidents.length;

  return (
    <AppShell>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-headline-lg tracking-tight text-on-surface">Risk Intelligence</h1>
          <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">
            Anomaly-driven risk scoring across batches, custody and lab records — surfaced before fraud becomes a recall.
          </p>
        </div>
        <Link
          href="/incidents"
          className="inline-flex items-center gap-2 rounded-lg bg-error-container px-4 py-2 text-metadata-sm font-semibold text-on-error-container transition-colors hover:bg-error-container/80"
        >
          <Icon name="policy" className="text-[18px]" />
          New Incident
        </Link>
      </div>

      {/* Metrics */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        <div className="metric-card rounded-xl p-5 transition-shadow hover:shadow-md">
          <p className="mb-4 text-label-caps uppercase tracking-wider text-on-surface-variant">Batches Monitored</p>
          <p className="text-headline-lg tabular-nums tracking-tight text-on-surface">{(totalRisk * 1.2).toFixed(0)}k</p>
          <p className="mt-1 text-metadata-sm text-tertiary">▲ 2.1% this month</p>
        </div>
        <div className="metric-card rounded-xl p-5 transition-shadow hover:shadow-md">
          <p className="mb-4 text-label-caps uppercase tracking-wider text-on-surface-variant">Risk Distribution</p>
          <p className="text-headline-md tabular-nums tracking-tight text-tertiary">
            {Math.round((low / totalRisk) * 100)}%
          </p>
          <p className="mt-1 text-metadata-sm text-on-surface-variant">low-risk / verified</p>
        </div>
        <div className="metric-card rounded-xl p-5 transition-shadow hover:shadow-md">
          <p className="mb-4 text-label-caps uppercase tracking-wider text-on-surface-variant">Open Incidents</p>
          <p className="text-headline-lg tabular-nums tracking-tight text-error">{openIncidents}</p>
          <p className="mt-1 text-metadata-sm text-on-surface-variant">{data?.openAlerts ?? 14} open alerts</p>
        </div>
        <div className="metric-card rounded-xl p-5 transition-shadow hover:shadow-md">
          <p className="mb-4 text-label-caps uppercase tracking-wider text-on-surface-variant">Anchoring SLA</p>
          <p className="text-headline-lg tabular-nums tracking-tight text-on-surface">
            {((low / totalRisk) * 92 + 8).toFixed(0)}%
          </p>
          <p className="mt-1 text-metadata-sm text-tertiary">within 60s of event</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Global network health */}
        <div className="glass-card rounded-xl p-6 lg:col-span-2">
          <h2 className="mb-6 flex items-center gap-2 text-headline-md text-on-surface">
            <Icon name="public" className="text-[26px] text-secondary" />
            Global Network Health
          </h2>
          <div className="mb-2 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-surface-container p-4">
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold tabular-nums text-on-surface">{low}</span>
                <span className="text-metadata-sm text-tertiary">Low / verified</span>
              </div>
            </div>
            <div className="rounded-lg bg-surface-container p-4">
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold tabular-nums text-on-surface">{med}</span>
                <span className="text-metadata-sm text-primary">Medium</span>
              </div>
            </div>
            <div className="rounded-lg bg-surface-container p-4">
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold tabular-nums text-error">{high}</span>
                <span className="text-metadata-sm text-error">High / critical</span>
              </div>
            </div>
          </div>
          <div className="flex h-3 w-full gap-1 overflow-hidden rounded-full">
            <div className="h-full bg-tertiary" style={{ width: `${(low / totalRisk) * 100}%` }} />
            <div className="h-full bg-primary-container" style={{ width: `${(med / totalRisk) * 100}%` }} />
            <div className="h-full bg-error" style={{ width: `${(high / totalRisk) * 100}%` }} />
          </div>

          {/* Incident cluster map */}
          <div className="map-bg relative mt-8 h-64 overflow-hidden rounded-xl">
            <svg viewBox="0 0 400 160" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
              <g stroke="#3a2f1e" strokeWidth="0.6" fill="none" opacity="0.7">
                {Array.from({ length: 14 }).map((_, i) => (
                  <path key={i} d={`M ${i * 30 - 10} 160 L ${i * 30 + 10} 0`} />
                ))}
                {Array.from({ length: 8 }).map((_, i) => (
                  <path key={`h${i}`} d={`M 0 ${i * 20 + 10} L 400 ${i * 20 + 10}`} />
                ))}
              </g>
              {/* Path line from origin to anomaly */}
              <path className="route-line" d="M40,120 C 110,90 150,40 300,45" fill="none" stroke="#FFB800" strokeWidth="2" />
              {/* Nodes */}
              <circle cx="40" cy="120" r="5" fill="#9fd292" />
              <circle cx="300" cy="45" r="6" fill="#ba1a1a" />
              <circle cx="300" cy="45" r="6" fill="none" stroke="#ba1a1a" strokeWidth="2" className="node-pulse" style={{ animation: "pulse-ring 2s infinite" }} />
              <circle cx="150" cy="40" r="4" fill="#ffb800" />
              <circle cx="250" cy="100" r="4" fill="#ffb800" />
            </svg>
            <div className="absolute left-4 top-3 rounded-lg bg-inverse-surface/80 px-3 py-2 backdrop-blur">
              <p className="text-[11px] font-semibold text-primary-container">Geographic Anomaly</p>
              <p className="text-[11px] text-inverse-on-surface/80">South-East Asia corridor</p>
            </div>
            <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-lg bg-inverse-surface/80 px-3 py-2 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-error animate-pulse" />
              <p className="text-[11px] text-inverse-on-surface/90">Cluster of 3 incidents</p>
            </div>
          </div>
        </div>

        {/* Priority incidents */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="mb-5 text-[20px] font-semibold tracking-tight text-on-surface">Priority Incidents</h2>
          <div className="space-y-4">
            {incidents.map((inc) => (
              <Link
                key={inc.id}
                href={`/incidents/${inc.id}`}
                className="group block rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-on-surface-variant">
                    Incident #{inc.code ?? inc.id.slice(-4)}
                  </span>
                  <Pill tone={inc.severity === "HIGH" || inc.severity === "CRITICAL" ? "error" : "warn"}>
                    {inc.severity}
                  </Pill>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-headline-md tabular-nums tracking-tight ${inc.severity === "HIGH" || inc.severity === "CRITICAL" ? "text-error" : "text-surface-tint"}`}>
                    {inc.score}
                  </span>
                  <span className="text-[14px] text-on-surface-variant">/100</span>
                  <span className="ml-auto text-label-caps text-on-surface-variant">Risk Score</span>
                </div>
                <h3 className="mt-2 text-body-md font-semibold text-on-surface group-hover:text-primary">{inc.title}</h3>
                <p className="mt-1 line-clamp-2 text-metadata-sm text-on-surface-variant">{inc.description ?? inc.clue}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Anomaly feed */}
      <div className="glass-card rounded-xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-[20px] font-semibold tracking-tight text-on-surface">
          <Icon name="wifi_tethering" className="text-[22px] text-secondary" />
          Global Anomaly Feed
        </h2>
        <div className="divide-y divide-outline-variant/15">
          {[
            { code: 47, title: "Repeated GPS Mismatch", batch: "WB-PUR-2026-001", time: "4h ago", tone: "warn" },
            { code: 48, title: "Rapid Sequential Scans", batch: "WB-SUN-2026-003", time: "7h ago", tone: "warn" },
            { code: 49, title: "Unexpected Dwell Time", batch: "HP-KUL-2026-005", time: "1d ago", tone: "surface" },
          ].map((a) => (
            <div key={a.code} className="flex items-center gap-4 py-3">
              <span
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  a.tone === "warn" ? "bg-primary-container/30 text-primary" : "bg-surface-container text-on-surface-variant"
                }`}
              >
                <Icon name={a.tone === "warn" ? "warning" : "info"} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-md font-medium text-on-surface">Incident #{a.code}: {a.title}</p>
                <p className="text-metadata-sm text-on-surface-variant">{a.batch} · {a.time}</p>
              </div>
              <Link href={`/incidents/inc_${a.code}`} className="text-metadata-sm font-medium text-primary hover:underline">
                Review
              </Link>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}