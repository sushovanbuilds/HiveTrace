import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/api/errors";
import { limit, route } from "@/lib/api/handler";
import { requireCapability } from "@/lib/auth/guard";
import { persistRiskScore } from "@/lib/services/risk-engine";

export const GET = route(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireCapability("batch:read");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "risk:list", 120);
  if (rateLimited) return rateLimited;

  const { id } = await params;

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

  // Newest first: this is score history, and the current verdict is what callers
  // read first. (Contrast the event log, which is a chronology.)
  const scores = await db.riskScore.findMany({
    where: { batchId: id },
    orderBy: { calculatedAt: "desc" },
    take: 50,
  });

  return Response.json({ data: scores });
});

export const POST = route(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireCapability("risk:recalculate");
  if (auth.denied) return auth.denied;

  // Scoring walks the batch's full history, so it is markedly more expensive
  // than a read; the limit here is deliberately tighter.
  const rateLimited = limit(request, "risk:recalculate", 20);
  if (rateLimited) return rateLimited;

  const { id } = await params;

  const batch = await db.batch.findUnique({ where: { id }, select: { id: true } });
  if (!batch) return errorResponse(404, "BATCH_NOT_FOUND", "Batch not found");

  // No try/catch: `route()` maps an unexpected failure to a generic 500. The
  // previous handler interpolated `err.message` into the response, which leaks
  // table and column names from a Prisma error.
  const riskScore = await persistRiskScore(id);
  return Response.json({ data: riskScore }, { status: 201 });
});
