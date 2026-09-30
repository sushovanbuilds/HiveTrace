import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api/errors";
import { limit, route } from "@/lib/api/handler";
import { requireCapability } from "@/lib/auth/guard";
import { getHiveOS } from "@/lib/hiveos/service";
import { advisorModelName, detectAlerts, recommendActions } from "@/lib/hiveos/advisor";

/**
 * GET /api/hives/[id]/advisor — LLM alert detection + recommendations for one
 * hive. Advisory only: the deterministic rules stay authoritative and every
 * model output is labelled AI-drafted. Returns available:false (200) when no
 * model is configured or the model fails, so the UI can fall back to rules.
 */
export const GET = route(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireCapability("batch:read");
  if (auth.denied) return auth.denied;

  // Tight: each call fans out to two model generations on a 27B model.
  const rateLimited = limit(request, "hive:advisor", 20);
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const view = await getHiveOS(id);
  if (!view) return errorResponse(404, "HIVE_NOT_FOUND", "Hive not found");

  const [alerts, recommendations] = await Promise.all([
    detectAlerts(view),
    recommendActions(view),
  ]);

  return Response.json({
    data: {
      hiveId: view.passport.id,
      hiveName: view.passport.name,
      model: advisorModelName(),
      alerts,
      recommendations,
    },
  });
});
