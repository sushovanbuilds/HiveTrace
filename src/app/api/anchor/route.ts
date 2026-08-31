import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/api/errors";
import { requireCapability } from "@/lib/auth/guard";
import { anchorBatchEvents, verifyAnchorIntegrity } from "@/lib/services/anchor";

const AnchorSchema = z.object({ batchId: z.string().min(1) });

export async function POST(request: NextRequest) {
  const auth = await requireCapability("anchor:write");
  if (auth.denied) return auth.denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON");
  }

  const parsed = AnchorSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, "VALIDATION_ERROR", "batchId is required");
  }

  const batch = await db.batch.findUnique({
    where: { id: parsed.data.batchId },
    select: { id: true },
  });
  if (!batch) return errorResponse(404, "BATCH_NOT_FOUND", "Batch not found");

  // The signer is the authenticated user, not a caller-supplied string — an
  // attributable signature that the request body can choose is not a signature.
  const result = await anchorBatchEvents(batch.id, auth.user.id);

  return Response.json(
    {
      data: result,
      meta: result.simulated
        ? {
            notice:
              "No blockchain is configured. The Merkle root is computed and stored locally, " +
              "which detects later edits to the event log but is not witnessed by an external ledger.",
          }
        : undefined,
    },
    { status: result.alreadyAnchored ? 200 : 201 },
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireCapability("batch:read");
  if (auth.denied) return auth.denied;

  const batchId = new URL(request.url).searchParams.get("batchId");
  if (!batchId) return errorResponse(400, "MISSING_PARAM", "batchId is required");

  const integrity = await verifyAnchorIntegrity(batchId);
  return Response.json({ data: integrity });
}
