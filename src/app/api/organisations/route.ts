import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { limit, readJson, readQuery, route } from "@/lib/api/handler";
import { requireAuth, requireCapability } from "@/lib/auth/guard";
import { ORGANISATION_TYPES } from "@/lib/types";

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.enum(ORGANISATION_TYPES),
});

export const POST = route(async (request: NextRequest) => {
  // Creating an organisation defines a new tenant boundary — admin only.
  const auth = await requireCapability("organisation:write");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "orgs:create", 10);
  if (rateLimited) return rateLimited;

  const body = await readJson(request, CreateSchema);
  if (body.error) return body.error;

  const org = await db.organisation.create({ data: body.data });
  return Response.json({ data: org }, { status: 201 });
});

const QuerySchema = z.object({
  type: z.enum(ORGANISATION_TYPES).optional(),
});

export const GET = route(async (request: NextRequest) => {
  // Any signed-in user may list organisations — a custody transfer needs to name
  // a counterparty. Member counts are aggregate only, never the member list.
  const auth = await requireAuth();
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "orgs:list", 60);
  if (rateLimited) return rateLimited;

  const query = readQuery(request, QuerySchema);
  if (query.error) return query.error;

  const orgs = await db.organisation.findMany({
    where: query.data.type ? { type: query.data.type } : {},
    include: { _count: { select: { users: true, farms: true, batches: true } } },
    orderBy: { name: "asc" },
  });

  return Response.json({
    data: orgs.map((org) => ({
      id: org.id,
      name: org.name,
      type: org.type,
      userCount: org._count.users,
      farmCount: org._count.farms,
      batchCount: org._count.batches,
      createdAt: org.createdAt,
    })),
  });
});
