import { db } from "@/lib/db";
import { errorResponse } from "@/lib/api/errors";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reportQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
});

export async function GET(request: Request) {
  const parsed = reportQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "Invalid query parameters",
      parsed.error.flatten(),
    );
  }

  const reports = await db.threatReport.findMany({
    where: parsed.data.severity ? { severity: parsed.data.severity } : undefined,
    orderBy: { createdAt: "desc" },
    take: parsed.data.limit,
  });
  return Response.json(reports);
}
