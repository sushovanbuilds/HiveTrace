import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/api/errors";
import { limit, readJson, route } from "@/lib/api/handler";
import { requireCapability } from "@/lib/auth/guard";

const SEVERITIES = ["MEDIUM", "HIGH", "CRITICAL"] as const;
const STATUSES = ["OPEN", "INVESTIGATING", "RESOLVED", "CLOSED"] as const;

export const GET = route(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireCapability("incident:read");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "incident:read", 120);
  if (rateLimited) return rateLimited;

  const { id } = await params;

  const incident = await db.incident.findUnique({
    where: { id },
    include: {
      alerts: {
        include: {
          batch: {
            select: {
              id: true,
              publicCode: true,
              honeyType: true,
              originRegion: true,
              riskScore: true,
              riskState: true,
            },
          },
        },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      },
      investigation: true,
    },
  });

  if (!incident) return errorResponse(404, "INCIDENT_NOT_FOUND", "Incident not found");
  return Response.json({ data: incident });
});

const PatchSchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    description: z.string().trim().max(5_000).nullable().optional(),
    severity: z.enum(SEVERITIES).optional(),
    status: z.enum(STATUSES).optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one updatable field is required",
  });

export const PATCH = route(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireCapability("incident:write");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "incident:update", 30);
  if (rateLimited) return rateLimited;

  const { id } = await params;

  const body = await readJson(request, PatchSchema);
  if (body.error) return body.error;

  const incident = await db.incident.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!incident) return errorResponse(404, "INCIDENT_NOT_FOUND", "Incident not found");

  // resolvedAt is derived from status, not accepted from the client. The previous
  // handler had it in the allow-list, so a caller could stamp a resolution time
  // on an incident that was still open.
  const updates: Record<string, unknown> = { ...body.data };
  if (body.data.status !== undefined) {
    const terminal = body.data.status === "RESOLVED" || body.data.status === "CLOSED";
    updates.resolvedAt = terminal ? new Date() : null;
  }

  const updated = await db.incident.update({ where: { id }, data: updates });
  return Response.json({ data: updated });
});
