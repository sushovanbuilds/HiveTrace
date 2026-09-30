import { NextRequest } from "next/server";
import { z } from "zod";
import { limit, readQuery, route } from "@/lib/api/handler";
import { requireCapability } from "@/lib/auth/guard";
import {
  attentionModelName,
  briefAttention,
  getAttentionQueue,
} from "@/lib/attention/rank";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(5),
  brief: z.coerce.boolean().default(false),
});

/**
 * GET /api/attention — the HiveTrace attention layer.
 * Ranked queue of hives needing attention (rules-based, deterministic).
 * ?brief=1 adds an AI-drafted plain-language briefing when a model is
 * configured; the queue itself never depends on the model.
 */
export const GET = route(async (request: NextRequest) => {
  const auth = await requireCapability("batch:read");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "attention", 60);
  if (rateLimited) return rateLimited;

  const query = readQuery(request, QuerySchema);
  if (query.error) return query.error;

  const queue = await getAttentionQueue(query.data.limit);
  const briefing = query.data.brief ? await briefAttention(queue) : null;

  return Response.json({
    data: {
      ...queue,
      briefing,
      llm: { configured: attentionModelName() !== null, model: attentionModelName() },
    },
  });
});
