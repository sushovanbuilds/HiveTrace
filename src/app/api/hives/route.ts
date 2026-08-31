import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/api/errors";
import { PaginationSchema, limit, pageArgs, readJson, readQuery, route } from "@/lib/api/handler";
import { requireCapability } from "@/lib/auth/guard";
import { HIVE_STATUSES, HIVE_TYPES, HONEY_TYPES } from "@/lib/types";
import { ownScopeVia, seesAllOrganisations } from "@/lib/auth/scope";

const QuerySchema = PaginationSchema.extend({
  farmId: z.string().trim().min(1).max(64).optional(),
  status: z.enum(HIVE_STATUSES).optional(),
  type: z.enum(HIVE_TYPES).optional(),
});

export const GET = route(async (request: NextRequest) => {
  const auth = await requireCapability("batch:read");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "hives:list", 60);
  if (rateLimited) return rateLimited;

  const query = readQuery(request, QuerySchema);
  if (query.error) return query.error;

  // Hives have no organisationId of their own, so tenancy is enforced through
  // the parent farm. Filtering client-side would ship every competitor's apiary
  // layout to the browser first.
  const where = {
    ...(query.data.farmId ? { farmId: query.data.farmId } : {}),
    ...(query.data.status ? { status: query.data.status } : {}),
    ...(query.data.type ? { type: query.data.type } : {}),
    ...ownScopeVia(auth.user, "farm"),
  };

  const [hives, total, statusCounts] = await Promise.all([
    db.hive.findMany({
      where,
      include: {
        farm: { select: { id: true, name: true, region: true, location: true } },
        _count: { select: { harvests: true } },
        // Latest harvest only: the hives page shows "last harvested", and
        // pulling the full history for every hive is the kind of query that
        // looks fine on seed data and collapses on a real apiary.
        harvests: {
          select: { id: true, date: true, quantity: true, honeyType: true },
          orderBy: { date: "desc" },
          take: 1,
        },
      },
      ...pageArgs(query.data),
      orderBy: { createdAt: "desc" },
    }),
    db.hive.count({ where }),
    db.hive.groupBy({ by: ["status"], where, _count: { _all: true } }),
  ]);

  return Response.json({
    data: hives.map((hive) => ({
      id: hive.id,
      name: hive.name,
      type: hive.type,
      status: hive.status,
      farmId: hive.farmId,
      farmName: hive.farm.name,
      region: hive.farm.region,
      location: hive.farm.location,
      harvestCount: hive._count.harvests,
      lastHarvest: hive.harvests[0] ?? null,
      createdAt: hive.createdAt,
    })),
    meta: {
      total,
      page: query.data.page,
      pageSize: query.data.pageSize,
      byStatus: Object.fromEntries(
        statusCounts.map((row) => [row.status, row._count._all]),
      ),
    },
  });
});

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  farmId: z.string().trim().min(1).max(64),
  type: z.enum(HIVE_TYPES),
  status: z.enum(HIVE_STATUSES).default("ACTIVE"),
});

export const POST = route(async (request: NextRequest) => {
  const auth = await requireCapability("hive:write");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "hives:create", 30);
  if (rateLimited) return rateLimited;

  const body = await readJson(request, CreateSchema);
  if (body.error) return body.error;

  const farm = await db.farm.findUnique({
    where: { id: body.data.farmId },
    select: { id: true, organisationId: true },
  });
  if (!farm) return errorResponse(404, "FARM_NOT_FOUND", "Farm not found");

  // A beekeeper may only add hives to their own farms; otherwise one producer
  // could attach hives to another's apiary and have their harvests inherit that
  // farm's location for the geo-temporal risk checks.
  if (auth.user.role !== "ADMIN" && farm.organisationId !== auth.user.organisationId) {
    return errorResponse(404, "FARM_NOT_FOUND", "Farm not found");
  }

  const hive = await db.hive.create({ data: body.data });
  return Response.json({ data: hive }, { status: 201 });
});

const HarvestSchema = z.object({
  hiveId: z.string().trim().min(1).max(64),
  date: z.coerce.date(),
  quantity: z.number().positive().max(10_000),
  honeyType: z.enum(HONEY_TYPES),
});

/**
 * Records a harvest. It lives here rather than under a `/api/harvests` route
 * because a harvest is only ever created against a hive, and the tenancy check
 * is the same walk up through the farm.
 */
export const PUT = route(async (request: NextRequest) => {
  const auth = await requireCapability("hive:write");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "harvests:create", 30);
  if (rateLimited) return rateLimited;

  const body = await readJson(request, HarvestSchema);
  if (body.error) return body.error;

  const now = new Date();
  if (body.data.date.getTime() > now.getTime() + 60_000) {
    return errorResponse(
      400,
      "DATE_IN_FUTURE",
      "A harvest cannot be recorded before it has happened",
    );
  }

  const hive = await db.hive.findUnique({
    where: { id: body.data.hiveId },
    select: { id: true, status: true, farm: { select: { organisationId: true } } },
  });
  if (!hive) return errorResponse(404, "HIVE_NOT_FOUND", "Hive not found");
  if (auth.user.role !== "ADMIN" && hive.farm.organisationId !== auth.user.organisationId) {
    return errorResponse(404, "HIVE_NOT_FOUND", "Hive not found");
  }
  if (hive.status === "COLONY_LOSS") {
    // A lost colony producing honey is the volume-anomaly pattern the risk
    // engine exists to catch; reject it at the source rather than scoring it.
    return errorResponse(
      409,
      "HIVE_NOT_PRODUCING",
      "This hive is recorded as a colony loss and cannot report a harvest",
    );
  }

  const harvest = await db.harvest.create({ data: body.data });
  return Response.json({ data: harvest }, { status: 201 });
});
