import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/api/errors";
import {
  JsonObjectSchema,
  PaginationSchema,
  limit,
  pageArgs,
  readJson,
  readQuery,
  route,
} from "@/lib/api/handler";
import { requireCapability } from "@/lib/auth/guard";
import { CLIENT_SUBMITTABLE_EVENT_TYPES } from "@/lib/types";

const QuerySchema = PaginationSchema.extend({
  type: z.string().trim().min(1).max(64).optional(),
});

export const GET = route(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireCapability("batch:read");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "events:list", 120);
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const query = readQuery(request, QuerySchema);
  if (query.error) return query.error;

  const batch = await db.batch.findUnique({
    where: { id },
    select: { id: true, organisationId: true },
  });
  if (!batch) return errorResponse(404, "BATCH_NOT_FOUND", "Batch not found");
  if (
    !["ADMIN", "INVESTIGATOR", "LAB"].includes(auth.user.role) &&
    batch.organisationId !== auth.user.organisationId
  ) {
    return errorResponse(404, "BATCH_NOT_FOUND", "Batch not found");
  }

  const where = { batchId: id, ...(query.data.type ? { type: query.data.type } : {}) };
  const [events, total] = await Promise.all([
    db.batchEvent.findMany({
      where,
      // Ascending: this is a chronology, and the traceability timeline renders it
      // in the order returned.
      orderBy: { timestamp: "asc" },
      ...pageArgs(query.data),
    }),
    db.batchEvent.count({ where }),
  ]);

  return Response.json({
    data: events,
    meta: { total, page: query.data.page, pageSize: query.data.pageSize },
  });
});

const CreateSchema = z.object({
  type: z.enum(CLIENT_SUBMITTABLE_EVENT_TYPES),
  // Free-form per event type, but bounded: this lands in a JSONB column that is
  // hashed into the Merkle root, and an unbounded blob is a cheap way to bloat
  // both the table and every subsequent anchor computation.
  data: JsonObjectSchema.refine(
    (value) => JSON.stringify(value).length <= 8_192,
    "data must serialise to at most 8 KB",
  ),
  /** Optional backdating, e.g. entering a paper record. Never in the future. */
  timestamp: z.coerce.date().optional(),
});

export const POST = route(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireCapability("batch:write");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "events:create", 60);
  if (rateLimited) return rateLimited;

  const { id } = await params;

  const body = await readJson(request, CreateSchema);
  if (body.error) return body.error;

  const batch = await db.batch.findUnique({
    where: { id },
    select: { id: true, organisationId: true, currentCustodianId: true, createdAt: true },
  });
  if (!batch) return errorResponse(404, "BATCH_NOT_FOUND", "Batch not found");

  const isCustodian = batch.currentCustodianId === auth.user.id;
  const isOwner = batch.organisationId === auth.user.organisationId;
  if (auth.user.role !== "ADMIN" && !isCustodian && !isOwner) {
    return errorResponse(
      403,
      "NOT_CUSTODIAN",
      "Only the current custodian may append events to this batch",
    );
  }

  const now = new Date();
  const timestamp = body.data.timestamp ?? now;
  if (timestamp.getTime() > now.getTime() + 60_000) {
    // A minute of slack for clock skew; beyond that a future-dated event would
    // let a custodian pre-write a step they have not performed.
    return errorResponse(400, "TIMESTAMP_IN_FUTURE", "Event timestamp cannot be in the future");
  }

  const event = await db.batchEvent.create({
    data: {
      batchId: id,
      type: body.data.type,
      data: body.data.data,
      // Attribution comes from the session, never from the body. A client-chosen
      // actorId means the audit trail records whoever the client says it does.
      actorId: auth.user.id,
      timestamp,
    },
  });

  return Response.json({ data: event }, { status: 201 });
});
