import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/api/errors";
import { limit, readJson, readQuery, route } from "@/lib/api/handler";
import { requireCapability } from "@/lib/auth/guard";
import { generate, isConfigured, resolveModelName } from "@/lib/ai/provider";

/** Matches the `type` comment on the AIAnalysis model. Closed so the analysis
 *  history stays filterable instead of accumulating free-text labels. */
const ANALYSIS_TYPES = [
  "RISK_EXPLANATION",
  "INCIDENT_SUMMARY",
  "EVIDENCE_SUMMARY",
  "HIVE_INSIGHT",
] as const;

const CreateSchema = z.object({
  batchId: z.string().trim().min(1).max(64),
  type: z.enum(ANALYSIS_TYPES),
  // Capped because prompt length is billed. Without a bound one request can
  // spend an arbitrary amount of the project's model budget.
  prompt: z.string().trim().min(1).max(4_000),
});

export const POST = route(async (request: NextRequest) => {
  const auth = await requireCapability("ai:query");
  if (auth.denied) return auth.denied;

  // Deliberately tight: each call costs real money, and unlike the read
  // endpoints there is no cache in front of it.
  const rateLimited = limit(request, "ai:generate", 10);
  if (rateLimited) return rateLimited;

  const body = await readJson(request, CreateSchema);
  if (body.error) return body.error;

  // Checked before the batch lookup so a misconfigured deployment fails with an
  // operator-actionable message instead of the provider's own throw.
  if (!isConfigured()) {
    return errorResponse(
      503,
      "AI_NOT_CONFIGURED",
      "No model provider is configured. Set OPENAI_API_KEY (or GOOGLE_API_KEY with LLM_PROVIDER=gemini) and restart.",
    );
  }

  const batch = await db.batch.findUnique({
    where: { id: body.data.batchId },
    include: {
      events: { orderBy: { timestamp: "asc" } },
      qualityTests: true,
      riskScores: { take: 1, orderBy: { calculatedAt: "desc" } },
      custodyTransfers: { orderBy: { timestamp: "desc" } },
      organisation: { select: { name: true } },
    },
  });

  if (!batch) return errorResponse(404, "BATCH_NOT_FOUND", "Batch not found");
  if (
    !["ADMIN", "INVESTIGATOR", "LAB"].includes(auth.user.role) &&
    batch.organisationId !== auth.user.organisationId
  ) {
    // 404, not 403: confirming the batch exists is itself a disclosure.
    return errorResponse(404, "BATCH_NOT_FOUND", "Batch not found");
  }

  const latestRisk = batch.riskScores[0];

  // Only fields the platform derives or validates go into the context block.
  // Producer-authored free text (floralSource, event notes) is left out on
  // purpose: it would let whoever wrote it steer the model's answer about their
  // own batch, and an analysis a supplier can influence is not evidence.
  const system = `You are HIVETRACE AI, an analyst for honey supply-chain traceability.

Batch under review:
- Public code: ${batch.publicCode}
- Honey type: ${batch.honeyType}
- Origin region: ${batch.originRegion}
- Current stage: ${batch.currentStage}
- Risk score: ${batch.riskScore}/100 (${batch.riskState})${
    latestRisk ? `, last scored ${latestRisk.calculatedAt.toISOString()}` : ""
  }
- Quality status: ${batch.qualityStatus}
- Verification: ${batch.verificationState}
- Recorded events: ${batch.events.length}
- Quality tests: ${batch.qualityTests.length} (${
    batch.qualityTests.filter((test) => !test.passed).length
  } failed)
- Custody transfers: ${batch.custodyTransfers.length}
- Custodian organisation: ${batch.organisation.name}

Answer only from the figures above. If they are insufficient to support a
conclusion, say which data is missing rather than inferring it. Be concise.`;

  let result: Awaited<ReturnType<typeof generate>>;
  try {
    result = await generate({ prompt: body.data.prompt, system });
  } catch {
    // The provider's message can carry request URLs, org identifiers, and
    // occasionally a fragment of the key, so it is logged rather than returned.
    console.error("[ai] generation failed for batch %s", batch.id);
    return errorResponse(
      502,
      "AI_UPSTREAM_FAILED",
      "The model provider did not return an analysis. Try again shortly.",
    );
  }

  const analysis = await db.aIAnalysis.create({
    data: {
      batchId: batch.id,
      type: body.data.type,
      input: { prompt: body.data.prompt, system },
      output: { text: result.text },
      model: result.model,
      tokensIn: result.usage.tokensIn,
      tokensOut: result.usage.tokensOut,
    },
  });

  return Response.json(
    {
      data: {
        id: analysis.id,
        batchId: analysis.batchId,
        type: analysis.type,
        result: result.text,
        model: analysis.model,
        usage: result.usage,
        createdAt: analysis.createdAt,
      },
    },
    { status: 201 },
  );
});

const QuerySchema = z.object({
  batchId: z.string().trim().min(1).max(64),
  type: z.enum(ANALYSIS_TYPES).optional(),
});

export const GET = route(async (request: NextRequest) => {
  const auth = await requireCapability("ai:query");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "ai:history", 60);
  if (rateLimited) return rateLimited;

  const query = readQuery(request, QuerySchema);
  if (query.error) return query.error;

  // Same tenant check as POST — the history contains the analyses, so scoping
  // only the generation endpoint would leave the results readable by anyone.
  const batch = await db.batch.findUnique({
    where: { id: query.data.batchId },
    select: { id: true, organisationId: true },
  });
  if (!batch) return errorResponse(404, "BATCH_NOT_FOUND", "Batch not found");
  if (
    !["ADMIN", "INVESTIGATOR", "LAB"].includes(auth.user.role) &&
    batch.organisationId !== auth.user.organisationId
  ) {
    return errorResponse(404, "BATCH_NOT_FOUND", "Batch not found");
  }

  const analyses = await db.aIAnalysis.findMany({
    where: {
      batchId: batch.id,
      ...(query.data.type ? { type: query.data.type } : {}),
    },
    // `input` is omitted: it holds the rendered system prompt, which is internal
    // plumbing, and echoing it back on every list response is pure weight.
    select: {
      id: true,
      batchId: true,
      type: true,
      output: true,
      model: true,
      tokensIn: true,
      tokensOut: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return Response.json({
    data: analyses,
    meta: { configured: isConfigured(), model: resolveModelName() },
  });
});
