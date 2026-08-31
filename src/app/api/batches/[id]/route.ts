import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/api/errors";
import { limit, readJson, route } from "@/lib/api/handler";
import { requireCapability } from "@/lib/auth/guard";
import { STAGE_ORDER } from "@/lib/types";

/** Producers see their own batches; labs, investigators and admins see all. */
function mayRead(role: string, organisationId: string, batchOrganisationId: string): boolean {
  if (["ADMIN", "INVESTIGATOR", "LAB"].includes(role)) return true;
  return organisationId === batchOrganisationId;
}

export const GET = route(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireCapability("batch:read");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "batch:read", 120);
  if (rateLimited) return rateLimited;

  const { id } = await params;

  const batch = await db.batch.findUnique({
    where: { id },
    include: {
      organisation: { select: { id: true, name: true, type: true } },
      harvest: {
        select: {
          id: true,
          date: true,
          quantity: true,
          honeyType: true,
          hive: {
            select: {
              id: true,
              name: true,
              farm: { select: { id: true, name: true, region: true, location: true } },
            },
          },
        },
      },
      events: { orderBy: { timestamp: "asc" } },
      qualityTests: { orderBy: { testedAt: "desc" } },
      riskScores: { orderBy: { calculatedAt: "desc" }, take: 1 },
      alerts: { orderBy: { createdAt: "desc" }, take: 20 },
      documents: { orderBy: { createdAt: "desc" } },
      custodyTransfers: { orderBy: { timestamp: "asc" } },
      // Deliberately NOT `qrTokens: true`. A QR token is a bearer credential —
      // including the column here would let anyone who can read a batch mint a
      // working label for it. Only counts and lifecycle state are exposed;
      // POST /api/batches/:id/qr returns a token exactly once, at issuance.
      qrTokens: {
        select: {
          id: true,
          scanCount: true,
          lastScan: true,
          revoked: true,
          createdAt: true,
          expiresAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!batch) {
    return errorResponse(404, "BATCH_NOT_FOUND", "Batch not found");
  }
  if (!mayRead(auth.user.role, auth.user.organisationId, batch.organisationId)) {
    // 404 rather than 403: confirming a batch exists but is not yours is itself
    // a disclosure about another organisation's inventory.
    return errorResponse(404, "BATCH_NOT_FOUND", "Batch not found");
  }

  return Response.json({ data: batch });
});

const PatchSchema = z
  .object({
    currentStage: z.enum(STAGE_ORDER as [string, ...string[]]).optional(),
    qualityStatus: z.enum(["PENDING", "PASSED", "FAILED", "QUARANTINE"]).optional(),
    verificationState: z.enum(["UNVERIFIED", "VERIFIED", "DISPUTED"]).optional(),
    floralSource: z.string().trim().max(200).nullable().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one updatable field is required",
  });

export const PATCH = route(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireCapability("batch:write");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "batch:update", 30);
  if (rateLimited) return rateLimited;

  const { id } = await params;

  const body = await readJson(request, PatchSchema);
  if (body.error) return body.error;

  const batch = await db.batch.findUnique({
    where: { id },
    select: { id: true, currentStage: true, organisationId: true, currentCustodianId: true },
  });
  if (!batch) return errorResponse(404, "BATCH_NOT_FOUND", "Batch not found");

  // Writing requires custody, not merely read access: the organisation that
  // currently holds the batch is the one accountable for its state.
  const isCustodian = batch.currentCustodianId === auth.user.id;
  const isOwner = batch.organisationId === auth.user.organisationId;
  if (auth.user.role !== "ADMIN" && !isCustodian && !isOwner) {
    return errorResponse(403, "NOT_CUSTODIAN", "Only the current custodian may update this batch");
  }

  // riskState is intentionally absent from PatchSchema. It is derived output —
  // letting a client set it directly would let a producer overwrite their own
  // risk verdict. Recalculation happens via POST /api/batches/:id/risk.
  const updates: Record<string, unknown> = {};
  if (body.data.currentStage !== undefined) updates.currentStage = body.data.currentStage;
  if (body.data.qualityStatus !== undefined) updates.qualityStatus = body.data.qualityStatus;
  if (body.data.floralSource !== undefined) updates.floralSource = body.data.floralSource;
  if (body.data.verificationState !== undefined) {
    // Marking a batch VERIFIED is an attestation; only admins may assert it.
    if (auth.user.role !== "ADMIN") {
      return errorResponse(
        403,
        "FORBIDDEN",
        "Only an administrator may change the verification state",
      );
    }
    updates.verificationState = body.data.verificationState;
  }

  if (body.data.currentStage !== undefined) {
    const currentIndex = STAGE_ORDER.indexOf(batch.currentStage as (typeof STAGE_ORDER)[number]);
    const nextIndex = STAGE_ORDER.indexOf(body.data.currentStage as (typeof STAGE_ORDER)[number]);
    if (nextIndex < currentIndex) {
      return errorResponse(
        400,
        "INVALID_TRANSITION",
        `Cannot move backwards from ${batch.currentStage} to ${body.data.currentStage}`,
      );
    }
    if (nextIndex === currentIndex) {
      return errorResponse(
        400,
        "INVALID_TRANSITION",
        `Batch is already at ${batch.currentStage}`,
      );
    }
  }

  // Update and event log in one transaction: a stage change that is not recorded
  // in the event history is invisible to the anchor and to the risk engine.
  const updated = await db.$transaction(async (tx) => {
    const result = await tx.batch.update({ where: { id }, data: updates });
    await tx.batchEvent.create({
      data: {
        batchId: id,
        type: body.data.currentStage !== undefined ? "STAGE_CHANGE" : "BATCH_UPDATED",
        data: { ...updates, previousStage: batch.currentStage },
        actorId: auth.user.id,
      },
    });
    return result;
  });

  return Response.json({ data: updated });
});
