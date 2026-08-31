import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/api/errors";
import { PaginationSchema, limit, pageArgs, readJson, readQuery, route } from "@/lib/api/handler";
import { requireCapability } from "@/lib/auth/guard";

const QuerySchema = PaginationSchema.extend({
  region: z.string().trim().min(1).max(120).optional(),
  organisationId: z.string().trim().min(1).max(64).optional(),
});

export const GET = route(async (request: NextRequest) => {
  const auth = await requireCapability("batch:read");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "farms:list", 60);
  if (rateLimited) return rateLimited;

  const query = readQuery(request, QuerySchema);
  if (query.error) return query.error;

  // Tenant scoping: a caller may filter within their own organisation, but only
  // an admin may read across organisations. Without this an authenticated
  // beekeeper could enumerate every competitor's farm locations.
  const scopedOrganisationId =
    auth.user.role === "ADMIN" ? query.data.organisationId : auth.user.organisationId;

  const where = {
    ...(query.data.region ? { region: query.data.region } : {}),
    ...(scopedOrganisationId ? { organisationId: scopedOrganisationId } : {}),
  };

  const [farms, total] = await Promise.all([
    db.farm.findMany({
      where,
      include: { _count: { select: { hives: true } } },
      ...pageArgs(query.data),
      orderBy: { createdAt: "desc" },
    }),
    db.farm.count({ where }),
  ]);

  return Response.json({
    data: farms.map((farm) => ({
      id: farm.id,
      name: farm.name,
      location: farm.location,
      region: farm.region,
      organisationId: farm.organisationId,
      hiveCount: farm._count.hives,
      createdAt: farm.createdAt,
    })),
    meta: { total, page: query.data.page, pageSize: query.data.pageSize },
  });
});

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  // "lat,lng" — stored as text in the schema, but an unparseable value here
  // silently breaks the geo-temporal risk rule downstream.
  location: z
    .string()
    .trim()
    .regex(/^-?\d{1,3}(\.\d+)?,-?\d{1,3}(\.\d+)?$/, "location must be \"latitude,longitude\"")
    .refine((value) => {
      const [lat, lng] = value.split(",").map(Number);
      return Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    }, "latitude must be within ±90 and longitude within ±180"),
  region: z.string().trim().min(1).max(120),
  organisationId: z.string().trim().min(1).max(64).optional(),
});

export const POST = route(async (request: NextRequest) => {
  const auth = await requireCapability("farm:write");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "farms:create", 20);
  if (rateLimited) return rateLimited;

  const body = await readJson(request, CreateSchema);
  if (body.error) return body.error;

  // Non-admins always create within their own organisation; the request cannot
  // choose the owner. Admins may name one explicitly.
  const organisationId =
    auth.user.role === "ADMIN"
      ? (body.data.organisationId ?? auth.user.organisationId)
      : auth.user.organisationId;

  const org = await db.organisation.findUnique({
    where: { id: organisationId },
    select: { id: true },
  });
  if (!org) return errorResponse(404, "ORG_NOT_FOUND", "Organisation not found");

  const farm = await db.farm.create({
    data: {
      name: body.data.name,
      location: body.data.location,
      region: body.data.region,
      organisationId,
    },
  });

  return Response.json({ data: farm }, { status: 201 });
});
