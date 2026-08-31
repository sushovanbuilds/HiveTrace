import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { Pill, ProgressBar, EmptyState } from "@/components/ui";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Incident ${id}` };
}

type IncidentDetail = {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  batchCount: number;
  createdAt: Date;
  investigation: { id: string; status: string; findings: string | null; decision: string | null; openedAt: Date } | null;
  alerts: Array<{ id: string; severity: string; message: string; createdAt: Date }>;
};

async function loadIncident(id: string): Promise<IncidentDetail | null> {
  try {
    const inc = await db.incident.findUnique({
      where: { id },
      include: {
        investigation: true,
        alerts: {
          orderBy: { createdAt: "desc" },
          take: 25,
          select: { id: true, severity: true, message: true, createdAt: true },
        },
      },
    });
    if (!inc) return null;
    return {
      id: inc.id,
      title: inc.title,
      description: inc.description,
      severity: inc.severity,
      status: inc.status,
      batchCount: inc.batchCount,
      createdAt: inc.createdAt,
      investigation: inc.investigation as IncidentDetail["investigation"],
      alerts: (inc.alerts ?? []) as IncidentDetail["alerts"],
    };
  } catch {
    return null;
  }
}

const DEMO_DETAIL: IncidentDetail = {
  id: "inc_047",
  title: "Temperature Excursion During Transit",
  description:
    "Batch WB-PUR-2026-001 recorded a storage temperature above 38°C for 4 consecutive hours during the Purulia → Kolkata cold-chain leg. Sensory analysis flagged caramelisation risk; re-verification requested by downstream lab.",
  severity: "MEDIUM",
  status: "INVESTIGATING",
  batchCount: 1,
  createdAt: new Date("2026-08-27T06:15:00"),
  investigation: {
    id: "inv_047",
    status: "IN_PROGRESS",
    findings: "Temperature logger timestamp gap of 7 minutes detected at node BLR-JN3. Physical unit shows no damage; likely logger sleep timeout.",
    decision: null,
    openedAt: new Date("2026-08-27T06:20:00"),
  },
  alerts: [
    { id: "al_1", severity: "HIGH", message: "Storage temp > 38°C sustained for 4h", createdAt: new Date("2026-08-27T06:10:00") },
    { id: "al_2", severity: "HIGH", message: "Sensor heartbeat gap detected (7m)", createdAt: new Date("2026-08-27T06:12:00") },
    { id: "al_3", severity: "MEDIUM", message: "Reroute suggested — alternate cold-chain node", createdAt: new Date("2026-08-27T06:14:00") },
    { id: "al_4", severity: "LOW", message: "Downstream lab requested re-verification", createdAt: new Date("2026-08-28T09:00:00") },
  ],
};

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let inc: IncidentDetail | null = await loadIncident(id);
  if (!inc) inc = id === "inc_047" ? DEMO_DETAIL : null;
  if (!inc) notFound();

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-8">
        <Link href="/incidents" className="mb-3 inline-flex items-center gap-1 text-metadata-sm font-medium uppercase tracking-wider text-on-surface-variant hover:text-primary">
          <Icon name="chevron_left" className="text-[16px]" />
          Investigations
        </Link>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="rounded-full bg-surface-container px-3 py-1 text-[11px] font-semibold tracking-wide text-on-surface-variant">
                INCIDENT #{inc.id.replace(/\D/g, "").slice(0, 5) || "NEW"}
              </span>
              <Pill tone={inc.severity === "CRITICAL" || inc.severity === "HIGH" ? "error" : "warn"}>{inc.severity}</Pill>
              <Pill tone="surface">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  {inc.status.replace(/_/g, " ")}
                </span>
              </Pill>
            </div>
            <h1 className="max-w-3xl text-headline-lg tracking-tight text-on-surface">{inc.title}</h1>
            <p className="mt-2 max-w-3xl text-body-md text-on-surface-variant">{inc.description}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main evidence panel */}
        <div className="space-y-6 lg:col-span-2">
          <div className="glass-card rounded-xl p-6">
            <h2 className="mb-5 text-headline-md tracking-tight text-on-surface">Related Batches</h2>
            <div className="space-y-3">
              {[
                { code: "WB-PUR-2026-001", label: "Mustard · Purulia", risk: 72, riskLabel: "High", stage: "Cold Chain / Transit" },
                { code: "WB-PUR-2026-002", label: "Mustard · Purulia", risk: 21, riskLabel: "Low", stage: "Extraction" },
                { code: "WB-PUR-2026-014", label: "Mustard · Purulia", risk: 45, riskLabel: "Medium", stage: "Packaging" },
              ].slice(0, inc.batchCount || 3).map((b) => (
                <Link key={b.code} href={`/batches/${encodeURIComponent(b.code)}`} className="group block rounded-xl border border-outline-variant/25 bg-surface-container-lowest p-4 transition-all hover:border-outline-variant/60 hover:shadow-md">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-headline-md font-medium tracking-wide text-on-surface">{b.code}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      b.risk >= 60 ? "bg-error-container text-on-error-container" : b.risk >= 40 ? "bg-primary-container/50 text-on-primary-container" : "bg-tertiary-container/50 text-tertiary"
                    }`}>
                      {b.risk} · {b.riskLabel}
                    </span>
                  </div>
                  <p className="mb-3 flex items-center gap-2 text-metadata-sm text-on-surface-variant">
                    <Icon name="water_drop" className="text-[16px]" />
                    {b.label} · {b.stage}
                  </p>
                  <ProgressBar value={b.risk} tone={b.risk >= 60 ? "error" : b.risk >= 40 ? "primary" : "tertiary"} />
                </Link>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <h2 className="mb-5 text-headline-md tracking-tight text-on-surface">Anomaly Evidence</h2>
            <div className="mb-5 h-44 overflow-y-auto no-scrollbar rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
              <div className="flex h-full items-center">
                <svg viewBox="0 0 480 130" className="w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF5A5A" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#FF5A5A" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[25, 30, 34, 38, 42].map((t, i) => (
                    <g key={t}>
                      <line x1="0" x2="480" y1={130 - i * 26} y2={130 - i * 26} stroke="#d5c4ab" strokeOpacity="0.4" strokeWidth="0.5" />
                      <text x="4" y={127 - i * 26} fontSize="7" fill="#514532">{t}°</text>
                    </g>
                  ))}
                  {/* normal band */}
                  <rect x="0" y={130 - 3 * 26} width="480" height={130 - 1 * 26} fill="#9fd292" opacity="0.08" />
                  <path
                    d="M0,104 C60,100 90,102 140,78 S 240,40 320,30 S 420,12 440,22 L 480,22"
                    fill="none" stroke="#3b6934" strokeWidth="2"
                  />
                  {/* excursion region */}
                  <path
                    d="M140,78 C180,60 230,30 300,26 S 420,14 440,20 L 480,22 L 480,130 L 0,130 Z"
                    fill="url(#tempFill)"
                  />
                  <line x1="140" x2="300" y1="10" y2="10" stroke="#FBB829" strokeWidth="1" strokeDasharray="3 2" />
                  <text x="150" y="22" fontSize="8" fill="#8c4a00" fontWeight="700">EXCURSION ZONE</text>
                  <circle cx="320" cy="30" r="5" fill="#ba1a1a">
                    <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
                  </circle>
                </svg>
              </div>
            </div>
            <div className="flex flex-wrap gap-6 text-metadata-sm text-on-surface-variant">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-tertiary" /> Normal band (&le; 34°)</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary-container" /> Nectar flow</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-error" /> Excursion &gt; 38°</span>
            </div>
          </div>
        </div>

        {/* Investigation rail */}
        <div className="space-y-6">
          <div className="rounded-xl bg-inverse-surface p-6 text-inverse-on-surface shadow-lg">
            <p className="mb-3 text-label-caps uppercase tracking-widest text-primary-container">Investigation</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-metadata-sm">
                <span className="text-secondary-fixed-dim">Case status</span>
                <span className="font-semibold text-primary-container">
                  {inc.investigation?.status.replace(/_/g, " ") ?? "NEW"}
                </span>
              </div>
              <div className="flex items-center justify-between text-metadata-sm">
                <span className="text-secondary-fixed-dim">Assigned to</span>
                <span className="font-semibold">Arjun Mehta</span>
              </div>
              <div className="flex items-center justify-between text-metadata-sm">
                <span className="text-secondary-fixed-dim">Opened</span>
                <span className="tabular-nums">
                  {inc.investigation?.openedAt?.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) ?? "—"}
                </span>
              </div>
            </div>

            {inc.investigation?.findings ? (
              <div className="mt-6 rounded-lg border border-primary-container/30 p-3.5">
                <h4 className="mb-1.5 flex items-center gap-1.5 text-label-caps uppercase tracking-widest text-primary-container">
                  <Icon name="edit_note" className="text-[16px]" /> Findings
                </h4>
                <p className="text-metadata-sm leading-relaxed text-inverse-on-surface/90">{inc.investigation.findings}</p>
              </div>
            ) : null}

            <div className="mt-6 flex gap-3">
              <button className="flex-1 rounded-lg bg-primary-container px-3 py-2 text-metadata-sm font-semibold text-on-primary-container transition-colors hover:bg-[#cba000]">
                Mark Resolved
              </button>
              <button className="rounded-lg border border-primary-container/40 px-3 py-2 text-metadata-sm font-medium text-primary-container">
                Attach Evidence
              </button>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <h3 className="mb-4 text-headline-md tracking-tight text-on-surface">Alert Timeline</h3>
            <div className="relative space-y-5 before:absolute before:bottom-1 before:left-[9px] before:top-1.5 before:w-px before:bg-outline-variant/50">
              {inc.alerts.map((a, i) => (
                <div key={a.id} className="relative flex gap-4 pl-6">
                  <span className={`absolute left-0 top-1.5 h-[19px] w-[19px] rounded-full border-2 ${
                    a.severity === "HIGH" ? "border-error bg-error/20" : a.severity === "MEDIUM" ? "border-primary bg-primary/20" : "border-tertiary bg-tertiary/20"
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-semibold tracking-wide ${
                        a.severity === "HIGH" ? "text-error" : a.severity === "MEDIUM" ? "text-primary" : "text-tertiary"
                      }`}>
                        {a.severity}
                      </span>
                      <span className="text-[11px] tabular-nums text-on-surface-variant">
                        {a.createdAt.toLocaleString("en-IN", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="mt-0.5 text-body-md text-on-surface">{a.message}</p>
                    {i === 0 && <span className="mt-1 inline-block rounded-full bg-error-container/60 px-2 py-0.5 text-[10px] font-semibold text-on-error-container">Detected</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}