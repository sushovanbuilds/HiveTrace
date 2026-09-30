import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon, SectionLabel } from "@/components/icons";
import { Card, Pill, EmptyState, ButtonLink } from "@/components/ui";
import { db } from "@/lib/db";
import { getDemoIncidentRows } from "@/lib/incidents/demo-incidents";

export const dynamic = "force-dynamic";

type IncidentRow = {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  batchCount: number;
  alertCount: number;
  createdAt: Date;
};

const SEVERITY_TONE: Record<string, "error" | "warn" | "primary"> = {
  CRITICAL: "error",
  HIGH: "error",
  MEDIUM: "warn",
};

const STATUS_TONE: Record<string, "error" | "warn" | "tertiary" | "surface"> = {
  OPEN: "error",
  INVESTIGATING: "warn",
  RESOLVED: "tertiary",
  CLOSED: "surface",
};

async function loadIncidents(): Promise<{ incidents: IncidentRow[]; openCount: number } | null> {
  try {
    const incidents = await db.incident.findMany({
      include: { _count: { select: { alerts: true } } },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 30,
    });
    return {
      openCount: incidents.filter((i) => i.status === "OPEN" || i.status === "INVESTIGATING").length,
      incidents: incidents.map((i) => ({
        id: i.id,
        title: i.title,
        description: i.description,
        severity: i.severity,
        status: i.status,
        batchCount: i.batchCount,
        alertCount: i._count.alerts,
        createdAt: i.createdAt,
      })),
    };
  } catch {
    return null;
  }
}

export default async function IncidentsPage() {
  const data = await loadIncidents();
  const isDemo = !data?.incidents.length;
  const incidents = isDemo ? getDemoIncidentRows() : data.incidents;
  const openCount = data?.openCount ?? getDemoIncidentRows().filter((i) => i.status === "OPEN" || i.status === "INVESTIGATING").length;

  return (
    <AppShell>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-headline-lg tracking-tight text-on-surface">Investigations</h1>
          <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">
            Every flagged anomaly becomes a case — evidence, custody, and anchored records are pulled together in one workspace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-error-container/60 px-4 py-2 text-metadata-sm font-semibold text-on-error-container">
            <span className="h-2 w-2 rounded-full bg-error animate-pulse" />
            {openCount} open
          </span>
          <ButtonLink href="/risk-center" variant="primary" icon="add" className="px-4 py-2 text-metadata-sm">
            New Case
          </ButtonLink>
        </div>
      </div>

      {isDemo && (
        <div className="mb-6 flex max-w-3xl items-start gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-3">
          <Icon name="info" className="mt-0.5 text-[18px] text-on-surface-variant" />
          <p className="text-metadata-sm text-on-surface-variant">
            <span className="font-semibold text-on-surface">Sample data.</span> The incident database is unreachable, so
            these illustrative cases are shown instead of live records.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {incidents.map((inc) => (
          <Link key={inc.id} href={`/incidents/${inc.id}`} className="group">
            <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg">
              <div className="flex items-start justify-between">
                <SectionLabel>
                  Incident #{inc.id.replace(/\D/g, "").slice(0, 5) || "NEW"}
                </SectionLabel>
                <Pill tone={SEVERITY_TONE[inc.severity] ?? "primary"}>{inc.severity}</Pill>
              </div>

              <h3 className="mt-4 text-headline-md tracking-tight text-on-surface group-hover:text-primary">
                {inc.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-body-md text-on-surface-variant">{inc.description}</p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Pill tone={STATUS_TONE[inc.status] ?? "surface"}>
                  <span className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      inc.status === "OPEN" ? "bg-error" : inc.status === "INVESTIGATING" ? "bg-primary" : "bg-tertiary"
                    }`} />
                    {inc.status.replace(/_/g, " ")}
                  </span>
                </Pill>
                <span className="text-metadata-sm text-on-surface-variant">
                  {inc.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>

              <div className="mt-5 flex items-center gap-6 border-t border-outline-variant/20 pt-4 text-metadata-sm text-on-surface-variant">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="package_2" className="text-[16px]" /> {inc.batchCount} batches
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="notifications_active" className="text-[16px]" /> {inc.alertCount} alerts
                </span>
                <span className="ml-auto inline-flex items-center gap-1 font-medium text-primary">
                  Open <Icon name="arrow_forward" className="text-[16px] group-hover:-translate-y-0" />
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {incidents.length === 0 && (
        <Card>
          <EmptyState title="No incidents" body="Flagged anomalies will appear here as cases." icon="verified_user" />
        </Card>
      )}
    </AppShell>
  );
}