import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { limit, readQuery, route } from "@/lib/api/handler";
import { requireCapability } from "@/lib/auth/guard";
import { signalForAlertType, evidenceForSignal } from "@/lib/incidents/signals";
import { clusterAlerts, type ClusterAlert } from "@/lib/incidents/clustering";

const QuerySchema = z.object({
  /** Only consider alerts from the last N days (default 30). */
  days: z.coerce.number().int().min(1).max(365).default(30),
  /** Cap on alerts pulled into the clusterer (default 500). */
  limit: z.coerce.number().int().min(1).max(2000).default(500),
});

/**
 * Proposed incident clusters from the triage queue.
 *
 * Groups unassigned (incidentId null) NEW / ACKNOWLEDGED alerts with the same
 * deterministic clusterer the Risk Center uses, so an investigator sees "one
 * shared cause → one case" instead of hundreds of lone alerts. Each proposal
 * carries the alert ids it groups, so creating the incident is a single
 * POST /api/incidents with { title, severity, alertIds, pattern }.
 *
 * Deterministic: alerts are sorted by (createdAt, id) before clustering, so
 * the same queue always yields the same proposals.
 */
export const GET = route(async (request: NextRequest) => {
  const auth = await requireCapability("incident:read");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "incidents:clusters", 30);
  if (rateLimited) return rateLimited;

  const query = readQuery(request, QuerySchema);
  if (query.error) return query.error;

  const since = new Date(Date.now() - query.data.days * 24 * 60 * 60 * 1000);

  const alerts = await db.alert.findMany({
    where: {
      incidentId: null,
      status: { in: ["NEW", "ACKNOWLEDGED"] },
      createdAt: { gte: since },
    },
    include: {
      batch: {
        select: {
          id: true,
          publicCode: true,
          honeyType: true,
          originRegion: true,
          organisationId: true,
          organisation: { select: { name: true } },
          lineage: { select: { sourceBatchId: true } },
          childLineage: { select: { targetBatchId: true } },
        },
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: query.data.limit,
  });

  const clusterInputs: ClusterAlert[] = [];
  let unmapped = 0;

  for (const alert of alerts) {
    const signal = signalForAlertType(alert.type);
    if (!signal) {
      unmapped++;
      continue;
    }
    const facts: Record<string, string | undefined> = {};
    const metadata = alert.metadata as Record<string, unknown> | null;
    if (metadata) {
      for (const [key, value] of Object.entries(metadata)) {
        if (typeof value === "string" || typeof value === "number") {
          facts[key] = String(value);
        }
      }
    }
    const family = new Set<string>([alert.batchId]);
    for (const link of alert.batch?.lineage ?? []) family.add(link.sourceBatchId);
    for (const link of alert.batch?.childLineage ?? []) family.add(link.targetBatchId);

    clusterInputs.push({
      id: alert.id,
      signal,
      batchId: alert.batchId,
      publicCode: alert.batch?.publicCode ?? alert.batchId,
      honeyType: alert.batch?.honeyType ?? undefined,
      supplierId: alert.batch?.organisationId ?? "unknown",
      supplierName: alert.batch?.organisation?.name ?? "Unknown supplier",
      location: alert.batch?.originRegion ?? "Unknown location",
      observedAt: alert.createdAt.getTime(),
      batchFamily: [...family],
      evidence: evidenceForSignal(signal, facts),
    });
  }

  const clusters = clusterAlerts(clusterInputs);

  return Response.json({
    data: clusters.map((cluster) => ({
      id: cluster.id,
      title: cluster.title,
      signal: cluster.signal,
      signalLabel: cluster.signalLabel,
      alertCount: cluster.alertCount,
      alertIds: cluster.alerts.map((a) => a.id),
      affectedBatches: cluster.affectedBatches,
      commonFactors: cluster.commonFactors,
      timeline: cluster.timeline,
      probableRootContext: cluster.probableRootContext,
      investigationStatus: cluster.investigationStatus,
      risk: cluster.risk,
    })),
    meta: {
      totalAlerts: alerts.length,
      clusteredAlerts: clusterInputs.length,
      unmappedAlerts: unmapped,
      clusters: clusters.length,
      // What POST /api/incidents needs to turn a proposal into a case.
      createHint: "POST /api/incidents with { title, severity, alertIds, pattern }",
    },
  });
});
