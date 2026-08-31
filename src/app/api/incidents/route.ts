import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { PaginationSchema, limit, pageArgs, readJson, readQuery, route } from "@/lib/api/handler";
import { requireCapability } from "@/lib/auth/guard";

const SEVERITIES = ["MEDIUM", "HIGH", "CRITICAL"] as const;
const STATUSES = ["OPEN", "INVESTIGATING", "RESOLVED", "CLOSED"] as const;

const QuerySchema = PaginationSchema.extend({
  status: z.enum(STATUSES).optional(),
  severity: z.enum(SEVERITIES).optional(),
});

export const GET = route(async (request: NextRequest) => {
  const auth = await requireCapability("incident:read");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "incidents:list", 60);
  if (rateLimited) return rateLimited;

  const query = readQuery(request, QuerySchema);
  if (query.error) return query.error;

  const where = {
    ...(query.data.status ? { status: query.data.status } : {}),
    ...(query.data.severity ? { severity: query.data.severity } : {}),
  };

  const [incidents, total, openCount] = await Promise.all([
    db.incident.findMany({
      where,
      include: {
        _count: { select: { alerts: true } },
        investigation: { select: { id: true, status: true, assignedToId: true } },
      },
      ...pageArgs(query.data),
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    }),
    db.incident.count({ where }),
    db.incident.count({ where: { status: { in: ["OPEN", "INVESTIGATING"] } } }),
  ]);

  return Response.json({
    data: incidents.map((incident) => ({
      id: incident.id,
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      status: incident.status,
      batchCount: incident.batchCount,
      alertCount: incident._count.alerts,
      investigation: incident.investigation,
      pattern: incident.pattern,
      createdAt: incident.createdAt,
      resolvedAt: incident.resolvedAt,
    })),
    meta: { total, page: query.data.page, pageSize: query.data.pageSize, openCount },
  });
});

const CreateSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(5_000).optional(),
  severity: z.enum(SEVERITIES),
  alertIds: z.array(z.string().trim().min(1).max(64)).max(500).optional(),
});

export const POST = route(async (request: NextRequest) => {
  const auth = await requireCapability("incident:write");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "incidents:create", 20);
  if (rateLimited) return rateLimited;

  const body = await readJson(request, CreateSchema);
  if (body.error) return body.error;

  // One transaction: the previous version created the incident, then linked
  // alerts, then corrected batchCount in three separate writes. A failure
  // between them left an incident claiming zero affected batches while holding
  // linked alerts.
  const incident = await db.$transaction(async (tx) => {
    const created = await tx.incident.create({
      data: {
        title: body.data.title,
        description: body.data.description ?? null,
        severity: body.data.severity,
        status: "OPEN",
        batchCount: 0,
      },
    });

    if (!body.data.alertIds?.length) return created;

    // Only alerts not already attached to another incident, so building a new
    // cluster cannot silently steal evidence from an open investigation.
    await tx.alert.updateMany({
      where: { id: { in: body.data.alertIds }, incidentId: null },
      data: { incidentId: created.id },
    });

    const affected = await tx.alert.findMany({
      where: { incidentId: created.id },
      select: { batchId: true },
      distinct: ["batchId"],
    });

    return tx.incident.update({
      where: { id: created.id },
      data: { batchCount: affected.length },
    });
  });

  return Response.json({ data: incident }, { status: 201 });
});
