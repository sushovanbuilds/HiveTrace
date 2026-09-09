import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/api/errors";
import { route } from "@/lib/api/handler";
import { rateLimit, clientKey } from "@/lib/api/rateLimit";
import { requireCapability } from "@/lib/auth/guard";
import { issueQRToken, qrVerificationUrl } from "@/lib/services/qr";
import { qrToSvg, type QrSvgOptions } from "@/lib/qr/svg";

const IssueSchema = z.object({
  /** Optional shelf life. Omitted means the label never expires on its own. */
  expiresInDays: z.number().int().positive().max(3650).optional(),
  /** Retire previously printed labels for this batch. */
  revokeExisting: z.boolean().optional(),
  /** QR color preset: classic, honey, forest, ocean, dark, amber. */
  preset: z.string().optional(),
  /** Custom dark module color (hex). */
  dark: z.string().optional(),
  /** Custom light background color (hex). */
  light: z.string().optional(),
  /** Base64-encoded logo data URI to embed in the center of the QR code. */
  logo: z.string().optional(),
  /** Logo size as fraction of QR width (0.1–0.3). Default 0.2. */
  logoSize: z.number().min(0.1).max(0.3).optional(),
  /** Module corner radius (0 = square, 0.4 = rounded). Default 0. */
  moduleRadius: z.number().min(0).max(0.5).optional(),
});

/** Lists the labels issued for a batch. Tokens are never returned in full. */
export const GET = route(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireCapability("qr:issue");
  if (auth.denied) return auth.denied;

  const { id } = await params;

  // Same tenant check as issuance. Scan counts and last-scan times are
  // commercial signal — how much of a batch has reached consumers — so listing
  // them for an arbitrary batch id leaks across organisations even though the
  // tokens themselves stay hidden.
  const batch = await db.batch.findUnique({
    where: { id },
    select: { id: true, organisationId: true },
  });
  if (!batch) return errorResponse(404, "BATCH_NOT_FOUND", "Batch not found");
  if (auth.user.role !== "ADMIN" && auth.user.organisationId !== batch.organisationId) {
    return errorResponse(404, "BATCH_NOT_FOUND", "Batch not found");
  }

  const tokens = await db.qRToken.findMany({
    where: { batchId: id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { scans: true } } },
  });

  return Response.json({
    data: tokens.map((token) => ({
      id: token.id,
      // A full token is a working credential for the label; only enough is
      // shown to match a row against a physical jar.
      tokenPreview: `${token.token.slice(0, 12)}…`,
      revoked: token.revoked,
      scanCount: token.scanCount,
      distinctScans: token._count.scans,
      lastScan: token.lastScan,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
    })),
  });
});

/** Issues a new signed label and returns the printable SVG. */
export const POST = route(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireCapability("qr:issue");
  if (auth.denied) return auth.denied;

  const rl = rateLimit(`qr-issue:${clientKey(request)}`, 30, 60_000);
  if (!rl.ok) {
    return errorResponse(429, "RATE_LIMITED", "Too many requests", { retryAfter: rl.retryAfter });
  }

  const { id } = await params;

  // The body is optional — issuing a label with default options is the common
  // case — so an empty body is read as `{}` rather than rejected. Checking
  // content-length alone is not enough: a body-less POST does not always carry
  // the header, and `request.json()` throws on the empty string.
  const raw = await request.text();
  let body: unknown = {};
  if (raw.trim().length > 0) {
    try {
      body = JSON.parse(raw) ?? {};
    } catch {
      return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON");
    }
  }

  const parsed = IssueSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, "VALIDATION_ERROR", "Invalid QR issuance options", {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  const batch = await db.batch.findUnique({
    where: { id },
    select: { id: true, publicCode: true, organisationId: true },
  });
  if (!batch) return errorResponse(404, "BATCH_NOT_FOUND", "Batch not found");

  // Tenant isolation: a label is an assertion about someone's product, so only
  // the owning organisation (or an admin) may mint one.
  if (auth.user.role !== "ADMIN" && auth.user.organisationId !== batch.organisationId) {
    return errorResponse(403, "FORBIDDEN", "Batch belongs to another organisation");
  }

  const token = issueQRToken(batch.id, batch.publicCode);
  const expiresAt = parsed.data.expiresInDays
    ? new Date(Date.now() + parsed.data.expiresInDays * 86_400_000)
    : null;

  const [, created] = await db.$transaction([
    // Revoking inside the transaction avoids a window where a batch has no
    // valid label at all.
    parsed.data.revokeExisting
      ? db.qRToken.updateMany({ where: { batchId: batch.id, revoked: false }, data: { revoked: true } })
      : db.qRToken.updateMany({ where: { id: "" }, data: {} }),
    db.qRToken.create({ data: { batchId: batch.id, token, expiresAt } }),
  ]);

  const url = qrVerificationUrl(batch.publicCode, token);

  const qrOptions: QrSvgOptions = {
    title: `Verification QR for batch ${batch.publicCode}`,
  };
  if (parsed.data.preset) qrOptions.preset = parsed.data.preset;
  if (parsed.data.dark) qrOptions.dark = parsed.data.dark;
  if (parsed.data.light) qrOptions.light = parsed.data.light;
  if (parsed.data.logo) qrOptions.logo = parsed.data.logo;
  if (parsed.data.logoSize !== undefined) qrOptions.logoSize = parsed.data.logoSize;
  if (parsed.data.moduleRadius !== undefined) qrOptions.moduleRadius = parsed.data.moduleRadius;

  const svg = qrToSvg(url, qrOptions);

  await db.batchEvent.create({
    data: {
      batchId: batch.id,
      type: "QR_ISSUED",
      data: { qrTokenId: created.id, revokedExisting: parsed.data.revokeExisting ?? false },
      actorId: auth.user.id,
    },
  });

  return Response.json(
    {
      data: {
        id: created.id,
        publicCode: batch.publicCode,
        // Returned once, at issuance. Print it now — it is not retrievable later.
        token,
        url,
        svg,
        expiresAt,
      },
    },
    { status: 201 },
  );
});
