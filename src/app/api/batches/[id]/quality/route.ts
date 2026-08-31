import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/api/errors";
import { limit, readJson, route } from "@/lib/api/handler";
import { requireCapability } from "@/lib/auth/guard";
import { TEST_TYPES } from "@/lib/types";

export const GET = route(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireCapability("batch:read");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "quality:list", 120);
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

  const tests = await db.qualityTest.findMany({
    where: { batchId: id },
    include: { document: true },
    orderBy: { testedAt: "desc" },
  });

  return Response.json({ data: tests });
});

const CreateSchema = z.object({
  testType: z.enum(TEST_TYPES),
  result: z.number().finite(),
  unit: z.string().trim().min(1).max(32),
  method: z.string().trim().max(120).optional(),
  passed: z.boolean(),
  labName: z.string().trim().max(200).optional(),
  labReportNumber: z.string().trim().max(120).optional(),
  testedAt: z.coerce.date().optional(),
});

export const POST = route(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  // Publishing lab evidence is restricted to LAB and ADMIN (plan §13).
  const auth = await requireCapability("quality:write");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "quality:create", 60);
  if (rateLimited) return rateLimited;

  const { id } = await params;

  const body = await readJson(request, CreateSchema);
  if (body.error) return body.error;

  const batch = await db.batch.findUnique({ where: { id }, select: { id: true } });
  if (!batch) return errorResponse(404, "BATCH_NOT_FOUND", "Batch not found");

  const now = new Date();
  const testedAt = body.data.testedAt ?? now;
  if (testedAt.getTime() > now.getTime() + 60_000) {
    return errorResponse(400, "TIMESTAMP_IN_FUTURE", "testedAt cannot be in the future");
  }

  // The issuing lab is the caller's own organisation. Previously this came from
  // the request body, which let one lab publish results under another's name —
  // exactly the attribution a certificate is supposed to establish.
  const organisationId = auth.user.organisationId;

  // Test, derived quality status and the corresponding batch event go in together.
  // A published result that does not move the batch's status leaves the
  // dashboard showing PENDING on a failed batch.
  const created = await db.$transaction(async (tx) => {
    const test = await tx.qualityTest.create({
      data: {
        batchId: id,
        organisationId,
        testType: body.data.testType,
        result: body.data.result,
        unit: body.data.unit,
        method: body.data.method ?? null,
        passed: body.data.passed,
        labName: body.data.labName ?? null,
        labReportNumber: body.data.labReportNumber ?? null,
        testedAt,
      },
    });

    const tests = await tx.qualityTest.findMany({
      where: { batchId: id },
      select: { passed: true },
    });
    // One failure is decisive and is not cleared by later passes: a retest that
    // passes does not un-fail the sample that failed. Clearing a FAILED batch is
    // an investigator decision, recorded through the incident workflow.
    const qualityStatus = tests.some((entry) => !entry.passed) ? "FAILED" : "PASSED";

    await tx.batch.update({ where: { id }, data: { qualityStatus } });

    await tx.batchEvent.create({
      data: {
        batchId: id,
        type: "QUALITY_TEST",
        data: {
          testType: body.data.testType,
          result: body.data.result,
          unit: body.data.unit,
          passed: body.data.passed,
          labName: body.data.labName ?? null,
        },
        actorId: auth.user.id,
        timestamp: testedAt,
      },
    });

    return { test, qualityStatus };
  });

  return Response.json(
    { data: created.test, meta: { qualityStatus: created.qualityStatus } },
    { status: 201 },
  );
});
