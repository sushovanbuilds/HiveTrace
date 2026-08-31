import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api/errors";
import { rateLimit, clientKey } from "@/lib/api/rateLimit";
import { LABEL_COPY, verifyBatch } from "@/lib/services/verify";

/**
 * Path form of the public lookup: `/api/verify/HC-2026-ABCDEF?t=<token>`.
 * This is the shape the printed QR encodes.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const rl = rateLimit(`verify:${clientKey(request)}`, 60, 60_000);
  if (!rl.ok) {
    return errorResponse(429, "RATE_LIMITED", "Too many requests", { retryAfter: rl.retryAfter });
  }

  const { code } = await params;
  const token = new URL(request.url).searchParams.get("t");

  const outcome = await verifyBatch({ publicCode: code }, token, {
    ip: clientKey(request),
    userAgent: request.headers.get("user-agent"),
  });

  const copy = LABEL_COPY[outcome.label];
  const status = outcome.found ? 200 : outcome.label === "FORGED" ? 401 : 404;

  return Response.json(
    {
      data: {
        found: outcome.found,
        label: outcome.label,
        message: copy.headline,
        detail: copy.detail,
        ...(outcome.provenance ?? {}),
        scanInsight: outcome.scanInsight,
      },
    },
    { status },
  );
}
