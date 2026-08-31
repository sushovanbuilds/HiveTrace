import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { PaginationSchema, limit, pageArgs, readJson, readQuery, route } from "@/lib/api/handler";
import { requireCapability } from "@/lib/auth/guard";

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const STATUSES = ["NEW", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"] as const;

const QuerySchema = PaginationSchema.extend({
  severity: z.enum(SEVERITIES).optional(),
  status: z.enum(STATUSES).optional(),
  batchId: z.string().trim().min(1).max(64).optional(),
  /** Unlinked alerts only — the queue an investigator triages from. */
  unassigned: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});

export const GET = route(async (request: NextRequest) => {
  const auth = await requireCapability("alert:read");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "alerts:list", 60);
  if (rateLimited) return rateLimited;

  const query = readQuery(request, QuerySchema);
  if (query.error) return query.error;

  const where = {
    ...(query.data.severity ? { severity: query.data.severity } : {}),
    ...(query.data.status ? { status: query.data.status } : {}),
    ...(query.data.batchId ? { batchId: query.data.batchId } : {}),
    ...(query.data.unassigned ? { incidentId: null } : {}),
  };

  const [alerts, total, openCount] = await Promise.all([
    db.alert.findMany({
      where,
      include: {
        batch: { select: { id: true, publicCode: true, honeyType: true, originRegion: true } },
      },
      ...pageArgs(query.data),
      // Severity first so a CRITICAL alert is not pushed off page one by a
      // newer trivial one; recency breaks the tie.
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    }),
    db.alert.count({ where }),
    db.alert.count({ where: { status: { in: ["NEW", "ACKNOWLEDGED"] } } }),
  ]);

  return Response.json({
    data: alerts.map((alert) => ({
      id: alert.id,
      batchId: alert.batchId,
      batchCode: alert.batch?.publicCode,
      honeyType: alert.batch?.honeyType,
      originRegion: alert.batch?.originRegion,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      metadata: alert.metadata,
      status: alert.status,
      incidentId: alert.incidentId,
      createdAt: alert.createdAt,
      resolvedAt: alert.resolvedAt,
    })),
    meta: { total, page: query.data.page, pageSize: query.data.pageSize, openCount },
  });
});

const PatchSchema = z.object({
  ids: z.array(z.string().trim().min(1).max(64)).min(1).max(200),
  status: z.enum(STATUSES),
});

/**
 * Bulk triage. Acknowledging or dismissing alerts one request at a time makes a
 * fifty-alert queue unusable, so this takes a list.
 */
export const PATCH = route(async (request: NextRequest) => {
  const auth = await requireCapability("incident:write");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "alerts:triage", 30);
  if (rateLimited) return rateLimited;

  const body = await readJson(request, PatchSchema);
  if (body.error) return body.error;

  const terminal = body.data.status === "RESOLVED" || body.data.status === "DISMISSED";

  const result = await db.alert.updateMany({
    where: { id: { in: body.data.ids } },
    data: {
      status: body.data.status,
      // resolvedAt is set only on a terminal status, and cleared if an alert is
      // reopened, so "resolved" and "has a resolution time" cannot disagree.
      resolvedAt: terminal ? new Date() : null,
    },
  });

  return Response.json({ data: { updated: result.count, status: body.data.status } });
});
