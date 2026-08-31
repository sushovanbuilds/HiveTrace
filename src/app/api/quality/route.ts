import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { PaginationSchema, limit, pageArgs, readQuery, route } from "@/lib/api/handler";
import { requireCapability } from "@/lib/auth/guard";
import { TEST_TYPES } from "@/lib/types";

const QuerySchema = PaginationSchema.extend({
  // Named `testType` to match the column. The previous handler read `type` and
  // assigned it to `where.type`, which is not a field on QualityTest — any
  // filtered request failed with a Prisma validation error.
  testType: z.enum(TEST_TYPES).optional(),
  passed: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  batchId: z.string().trim().min(1).max(64).optional(),
});

export const GET = route(async (request: NextRequest) => {
  const auth = await requireCapability("batch:read");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "quality:index", 60);
  if (rateLimited) return rateLimited;

  const query = readQuery(request, QuerySchema);
  if (query.error) return query.error;

  const crossTenant = ["ADMIN", "INVESTIGATOR", "LAB"].includes(auth.user.role);

  const where = {
    ...(query.data.testType ? { testType: query.data.testType } : {}),
    ...(query.data.passed !== undefined ? { passed: query.data.passed } : {}),
    ...(query.data.batchId ? { batchId: query.data.batchId } : {}),
    // A producer sees test results for their own batches. Labs see the panels
    // they ran plus, as reviewers, everything else — hence the cross-tenant list.
    ...(crossTenant ? {} : { batch: { organisationId: auth.user.organisationId } }),
  };

  const [tests, total] = await Promise.all([
    db.qualityTest.findMany({
      where,
      include: { batch: { select: { id: true, publicCode: true, honeyType: true } } },
      ...pageArgs(query.data),
      orderBy: { testedAt: "desc" },
    }),
    db.qualityTest.count({ where }),
  ]);

  return Response.json({
    data: tests.map((test) => ({
      id: test.id,
      batchId: test.batchId,
      batchCode: test.batch?.publicCode,
      honeyType: test.batch?.honeyType,
      testType: test.testType,
      result: test.result,
      unit: test.unit,
      method: test.method,
      passed: test.passed,
      labName: test.labName,
      labReportNumber: test.labReportNumber,
      testedAt: test.testedAt,
    })),
    meta: { total, page: query.data.page, pageSize: query.data.pageSize },
  });
});
