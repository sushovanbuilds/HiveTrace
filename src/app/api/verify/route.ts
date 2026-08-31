import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api/errors";
import { rateLimit, clientKey } from "@/lib/api/rateLimit";
import { LABEL_COPY, verifyBatch } from "@/lib/services/verify";

/**
 * Public batch lookup by code. No authentication — this is the consumer-facing
 * endpoint a jar label points at.
 */
export async function GET(request: NextRequest) {
  const rl = rateLimit(`verify:${clientKey(request)}`, 60, 60_000);
  if (!rl.ok) {
    return errorResponse(429, "RATE_LIMITED", "Too many requests", { retryAfter: rl.retryAfter });
  }

  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId");
  const publicCode = searchParams.get("publicCode");
  const token = searchParams.get("t");

  if (!batchId && !publicCode && !token) {
    return errorResponse(400, "MISSING_PARAM", "Provide publicCode, batchId, or t (QR token)");
  }

  const outcome = await verifyBatch(
    { batchId: batchId ?? undefined, publicCode: publicCode ?? undefined },
    token,
    { ip: clientKey(request), userAgent: request.headers.get("user-agent") },
  );

  if (!outcome.found) {
    return Response.json(
      {
        data: {
          found: false,
          label: outcome.label,
          message: LABEL_COPY[outcome.label].headline,
          detail: LABEL_COPY[outcome.label].detail,
        },
      },
      // A forged signature is an authentication failure; an unmatched code is
      // simply absent.
      { status: outcome.label === "FORGED" ? 401 : 404 },
    );
  }

  return Response.json({
    data: {
      found: true,
      label: outcome.label,
      message: LABEL_COPY[outcome.label].headline,
      detail: LABEL_COPY[outcome.label].detail,
      ...outcome.provenance,
      scanInsight: outcome.scanInsight,
    },
  });
}

/** POST form, for scanners that submit the token in a body rather than a URL. */
export async function POST(request: NextRequest) {
  const rl = rateLimit(`verify:${clientKey(request)}`, 60, 60_000);
  if (!rl.ok) {
    return errorResponse(429, "RATE_LIMITED", "Too many requests", { retryAfter: rl.retryAfter });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON");
  }

  const { token, publicCode } = (body ?? {}) as Record<string, unknown>;
  if (typeof token !== "string" && typeof publicCode !== "string") {
    return errorResponse(400, "MISSING_PARAM", "token or publicCode is required");
  }

  const outcome = await verifyBatch(
    { publicCode: typeof publicCode === "string" ? publicCode : undefined },
    typeof token === "string" ? token : null,
    { ip: clientKey(request), userAgent: request.headers.get("user-agent") },
  );

  const status = outcome.found ? 200 : outcome.label === "FORGED" ? 401 : 404;
  return Response.json(
    {
      data: {
        found: outcome.found,
        label: outcome.label,
        message: LABEL_COPY[outcome.label].headline,
        detail: LABEL_COPY[outcome.label].detail,
        ...(outcome.provenance ?? {}),
        scanInsight: outcome.scanInsight,
      },
    },
    { status },
  );
}
