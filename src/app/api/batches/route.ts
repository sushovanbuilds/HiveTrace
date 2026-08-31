import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/api/errors";
import {
  PaginationSchema,
  isUniqueViolation,
  limit,
  pageArgs,
  readJson,
  readQuery,
  route,
} from "@/lib/api/handler";
import { requireCapability } from "@/lib/auth/guard";
import { generatePublicCode } from "@/lib/services/qr";
import { HONEY_TYPES, STAGE_ORDER } from "@/lib/types";

const QuerySchema = PaginationSchema.extend({
  stage: z.enum(STAGE_ORDER as [string, ...string[]]).optional(),
  riskState: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  qualityStatus: z.enum(["PENDING", "PASSED", "FAILED", "QUARANTINE"]).optional(),
  organisationId: z.string().trim().min(1).max(64).optional(),
  /** Substring match on publicCode, honey type or region. */
  q: z.string().trim().min(1).max(120).optional(),
});

export const GET = route(async (request: NextRequest) => {
  const auth = await requireCapability("batch:read");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "batches:list", 60);
  if (rateLimited) return rateLimited;

  const query = readQuery(request, QuerySchema);
  if (query.error) return query.error;

  // Investigators and labs need cross-organisation visibility to do their job
  // (a lab receives batches from many producers); producers see only their own.
  const crossTenant = ["ADMIN", "INVESTIGATOR", "LAB"].includes(auth.user.role);
  const organisationId = crossTenant ? query.data.organisationId : auth.user.organisationId;

  const where = {
    ...(query.data.stage ? { currentStage: query.data.stage } : {}),
    ...(query.data.riskState ? { riskState: query.data.riskState } : {}),
    ...(query.data.qualityStatus ? { qualityStatus: query.data.qualityStatus } : {}),
    ...(organisationId ? { organisationId } : {}),
    ...(query.data.q
      ? {
          OR: [
            { publicCode: { contains: query.data.q, mode: "insensitive" as const } },
            { honeyType: { contains: query.data.q, mode: "insensitive" as const } },
            { originRegion: { contains: query.data.q, mode: "insensitive" as const } },
            { floralSource: { contains: query.data.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [batches, total] = await Promise.all([
    db.batch.findMany({
      where,
      include: {
        organisation: { select: { id: true, name: true } },
        harvest: {
          select: {
            id: true,
            date: true,
            hive: { select: { name: true, farm: { select: { name: true, region: true } } } },
          },
        },
        _count: { select: { events: true, qualityTests: true, alerts: true } },
      },
      ...pageArgs(query.data),
      orderBy: { updatedAt: "desc" },
    }),
    db.batch.count({ where }),
  ]);

  return Response.json({
    data: batches.map((batch) => ({
      id: batch.id,
      publicCode: batch.publicCode,
      honeyType: batch.honeyType,
      floralSource: batch.floralSource,
      originRegion: batch.originRegion,
      quantity: batch.quantity,
      currentStage: batch.currentStage,
      qualityStatus: batch.qualityStatus,
      riskScore: batch.riskScore,
      riskState: batch.riskState,
      verificationState: batch.verificationState,
      organisation: batch.organisation,
      harvest: batch.harvest,
      eventCount: batch._count.events,
      qualityTestCount: batch._count.qualityTests,
      alertCount: batch._count.alerts,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
    })),
    meta: { total, page: query.data.page, pageSize: query.data.pageSize },
  });
});

const CreateSchema = z.object({
  harvestId: z.string().trim().min(1).max(64).optional(),
  honeyType: z.enum(HONEY_TYPES),
  floralSource: z.string().trim().max(200).optional(),
  originRegion: z.string().trim().min(1).max(120),
  // A batch of 0 kg is not a batch, and the upper bound keeps a typo from
  // reading as a nation's annual output.
  quantity: z.number().positive().max(100_000),
  currentCustodianId: z.string().trim().min(1).max(64).optional(),
  organisationId: z.string().trim().min(1).max(64).optional(),
});

export const POST = route(async (request: NextRequest) => {
  const auth = await requireCapability("batch:write");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "batches:create", 20);
  if (rateLimited) return rateLimited;

  const body = await readJson(request, CreateSchema);
  if (body.error) return body.error;

  const organisationId =
    auth.user.role === "ADMIN"
      ? (body.data.organisationId ?? auth.user.organisationId)
      : auth.user.organisationId;

  const org = await db.organisation.findUnique({
    where: { id: organisationId },
    select: { id: true },
  });
  if (!org) return errorResponse(404, "ORG_NOT_FOUND", "Organisation not found");

  // Custody starts with the creator unless they hand it straight on. Either way
  // the custodian must be a real user, or the custody chain begins broken.
  const custodianId = body.data.currentCustodianId ?? auth.user.id;
  const custodian = await db.user.findUnique({
    where: { id: custodianId },
    select: { id: true },
  });
  if (!custodian) return errorResponse(404, "USER_NOT_FOUND", "Custodian not found");

  if (body.data.harvestId) {
    const harvest = await db.harvest.findUnique({
      where: { id: body.data.harvestId },
      select: { id: true },
    });
    if (!harvest) return errorResponse(404, "HARVEST_NOT_FOUND", "Harvest not found");
  }

  // publicCode is random, not `count() + 1`: the old scheme raced against the
  // unique index and leaked production volume onto every jar. Random codes can
  // still collide, so retry a bounded number of times on the constraint.
  let batch: Awaited<ReturnType<typeof db.batch.create>> | null = null;
  for (let attempt = 0; attempt < 5 && batch === null; attempt += 1) {
    try {
      batch = await db.batch.create({
        data: {
          publicCode: generatePublicCode(),
          harvestId: body.data.harvestId,
          organisationId,
          honeyType: body.data.honeyType,
          floralSource: body.data.floralSource ?? null,
          originRegion: body.data.originRegion,
          quantity: body.data.quantity,
          currentStage: "HARVEST",
          currentCustodianId: custodianId,
        },
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  if (!batch) {
    return errorResponse(
      503,
      "CODE_ALLOCATION_FAILED",
      "Could not allocate a unique batch code; please retry",
    );
  }

  await db.batchEvent.create({
    data: {
      batchId: batch.id,
      type: "HARVEST",
      data: {
        honeyType: body.data.honeyType,
        originRegion: body.data.originRegion,
        quantity: body.data.quantity,
      },
      actorId: auth.user.id,
    },
  });

  return Response.json({ data: batch }, { status: 201 });
});
