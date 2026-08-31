import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/api/errors";
import { limit, readJson, route } from "@/lib/api/handler";
import { requireCapability } from "@/lib/auth/guard";

const DECISIONS = [
  "CONFIRMED_FRAUD",
  "FALSE_POSITIVE",
  "SUPPLIER_ERROR",
  "PROCESSING_ERROR",
  "OTHER",
] as const;

const BodySchema = z
  .object({
    assignedToId: z.string().trim().min(1).max(64).nullable().optional(),
    findings: z.string().trim().max(20_000).optional(),
    resolution: z.string().trim().max(20_000).optional(),
    decision: z.enum(DECISIONS).optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one field is required",
  })
  .refine((value) => value.decision === undefined || (value.resolution?.trim().length ?? 0) > 0, {
    // A decision is the legally weighty part of the record. Recording
    // CONFIRMED_FRAUD with no written justification is not a finding.
    message: "resolution is required when recording a decision",
    path: ["resolution"],
  });

export const POST = route(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;

  const body = await readJson(request, BodySchema);
  if (body.error) return body.error;

  // Two different capabilities: opening or annotating a case is investigator or
  // admin work, but *closing* one with a decision is restricted further.
  const auth = await requireCapability(
    body.data.decision !== undefined ? "investigation:resolve" : "incident:write",
  );
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "investigation:write", 30);
  if (rateLimited) return rateLimited;

  const incident = await db.incident.findUnique({ where: { id }, select: { id: true } });
  if (!incident) return errorResponse(404, "INCIDENT_NOT_FOUND", "Incident not found");

  if (body.data.assignedToId) {
    const assignee = await db.user.findUnique({
      where: { id: body.data.assignedToId },
      select: { id: true, role: true },
    });
    if (!assignee) return errorResponse(404, "USER_NOT_FOUND", "Assignee not found");
    if (!["INVESTIGATOR", "ADMIN"].includes(assignee.role)) {
      return errorResponse(
        400,
        "INVALID_ASSIGNEE",
        "Cases may only be assigned to an investigator or administrator",
      );
    }
  }

  const resolvedAt = body.data.decision !== undefined ? new Date() : null;

  // Upsert plus the incident status change in one transaction, so an incident
  // can never read RESOLVED while its case is still IN_PROGRESS.
  const investigation = await db.$transaction(async (tx) => {
    const existing = await tx.investigationCase.findUnique({
      where: { incidentId: id },
      select: { id: true },
    });

    const record = existing
      ? await tx.investigationCase.update({
          where: { incidentId: id },
          data: {
            ...(body.data.assignedToId !== undefined
              ? { assignedToId: body.data.assignedToId }
              : {}),
            ...(body.data.findings !== undefined ? { findings: body.data.findings } : {}),
            ...(body.data.resolution !== undefined ? { resolution: body.data.resolution } : {}),
            ...(body.data.decision !== undefined
              ? { decision: body.data.decision, status: "RESOLVED", resolvedAt }
              : {}),
          },
        })
      : await tx.investigationCase.create({
          data: {
            incidentId: id,
            assignedToId: body.data.assignedToId ?? null,
            status: body.data.decision !== undefined ? "RESOLVED" : "IN_PROGRESS",
            findings: body.data.findings ?? null,
            resolution: body.data.resolution ?? null,
            decision: body.data.decision ?? null,
            resolvedAt,
          },
        });

    await tx.incident.update({
      where: { id },
      data:
        body.data.decision !== undefined
          ? { status: "RESOLVED", resolvedAt }
          : { status: "INVESTIGATING" },
    });

    // Closing a case resolves the alerts that justified it; leaving them NEW
    // means the same evidence immediately reappears in the triage queue.
    if (body.data.decision !== undefined) {
      await tx.alert.updateMany({
        where: { incidentId: id, status: { in: ["NEW", "ACKNOWLEDGED"] } },
        data: { status: "RESOLVED", resolvedAt },
      });
    }

    // The decision is the auditable act; record who made it.
    await tx.auditLog.create({
      data: {
        userId: auth.user.id,
        action: body.data.decision !== undefined ? "INVESTIGATION_RESOLVED" : "INVESTIGATION_UPDATED",
        entity: "InvestigationCase",
        entityId: record.id,
        investigationId: record.id,
        // Prisma.DbNull, not `null`: on a nullable Json column a bare null is
        // ambiguous between SQL NULL and the JSON value `null`, so the client
        // rejects it. A case that did not exist before has no prior state.
        before: existing ? { status: "IN_PROGRESS" } : Prisma.DbNull,
        after: {
          incidentId: id,
          status: record.status,
          decision: body.data.decision ?? null,
          assignedToId: body.data.assignedToId ?? null,
        },
      },
    });

    return { record, created: !existing };
  });

  return Response.json(
    { data: investigation.record },
    { status: investigation.created ? 201 : 200 },
  );
});
