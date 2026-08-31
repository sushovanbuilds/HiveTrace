import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/api/errors";
import { limit, readQuery, route } from "@/lib/api/handler";
import { requireCapability } from "@/lib/auth/guard";

/**
 * Bound on how far a trace will walk. Blending and splitting can nest deeply,
 * but an unbounded walk on a cyclic or pathological graph is a way to hang a
 * request thread — and a 30-deep provenance tree is not readable anyway.
 */
const MAX_DEPTH = 12;
const MAX_NODES = 500;

const QuerySchema = z.object({
  batchId: z.string().trim().min(1).max(64),
  direction: z.enum(["upstream", "downstream", "both"]).default("both"),
});

interface LineageNode {
  batchId: string;
  publicCode: string;
  relationship: string;
  ratio: number | null;
  /** Hops from the queried batch; 1 is an immediate parent or child. */
  depth: number;
  riskState: string;
  qualityStatus: string;
  currentStage: string;
}

export const GET = route(async (request: NextRequest) => {
  const auth = await requireCapability("batch:read");
  if (auth.denied) return auth.denied;

  const rateLimited = limit(request, "lineage:trace", 60);
  if (rateLimited) return rateLimited;

  const query = readQuery(request, QuerySchema);
  if (query.error) return query.error;

  const batch = await db.batch.findUnique({
    where: { id: query.data.batchId },
    select: { id: true, publicCode: true, organisationId: true },
  });
  if (!batch) return errorResponse(404, "BATCH_NOT_FOUND", "Batch not found");
  if (
    !["ADMIN", "INVESTIGATOR", "LAB"].includes(auth.user.role) &&
    batch.organisationId !== auth.user.organisationId
  ) {
    return errorResponse(404, "BATCH_NOT_FOUND", "Batch not found");
  }

  const wantUpstream = query.data.direction !== "downstream";
  const wantDownstream = query.data.direction !== "upstream";

  const [upstream, downstream] = await Promise.all([
    wantUpstream ? trace(batch.id, "upstream") : Promise.resolve([]),
    wantDownstream ? trace(batch.id, "downstream") : Promise.resolve([]),
  ]);

  return Response.json({
    data: {
      batchId: batch.id,
      publicCode: batch.publicCode,
      upstream,
      downstream,
      totalUpstream: upstream.length,
      totalDownstream: downstream.length,
      truncated:
        upstream.length >= MAX_NODES ||
        downstream.length >= MAX_NODES ||
        upstream.some((node) => node.depth >= MAX_DEPTH) ||
        downstream.some((node) => node.depth >= MAX_DEPTH),
    },
  });
});

/**
 * Breadth-first walk of the lineage graph.
 *
 * Breadth-first rather than the previous recursion for two reasons: each level
 * is one query instead of one query per edge, and results arrive ordered by
 * distance, which is how a provenance tree is read. `seen` is scoped to a single
 * trace — the old version shared one mutable array across both directions, so a
 * batch reached upstream was silently skipped downstream.
 */
async function trace(
  rootId: string,
  direction: "upstream" | "downstream",
): Promise<LineageNode[]> {
  const seen = new Set<string>([rootId]);
  const nodes: LineageNode[] = [];
  let frontier = [rootId];

  const batchSelect = {
    id: true,
    publicCode: true,
    riskState: true,
    qualityStatus: true,
    currentStage: true,
  } as const;

  for (let depth = 1; depth <= MAX_DEPTH && frontier.length > 0; depth += 1) {
    // Each branch is its own query returning the same normalised
    // `{ relationship, ratio, neighbour }` shape. A single query with a
    // conditional `include` collapses to a union Prisma's generated types
    // cannot narrow, so the neighbour field becomes unreachable.
    const edges =
      direction === "upstream"
        ? (
            await db.batchLineage.findMany({
              where: { targetBatchId: { in: frontier } },
              select: {
                relationship: true,
                ratio: true,
                sourceBatch: { select: batchSelect },
              },
            })
          ).map((edge) => ({
            relationship: edge.relationship,
            ratio: edge.ratio,
            neighbour: edge.sourceBatch,
          }))
        : (
            await db.batchLineage.findMany({
              where: { sourceBatchId: { in: frontier } },
              select: {
                relationship: true,
                ratio: true,
                targetBatch: { select: batchSelect },
              },
            })
          ).map((edge) => ({
            relationship: edge.relationship,
            ratio: edge.ratio,
            neighbour: edge.targetBatch,
          }));

    const next: string[] = [];
    for (const edge of edges) {
      const neighbour = edge.neighbour;
      if (seen.has(neighbour.id)) continue;
      seen.add(neighbour.id);

      nodes.push({
        batchId: neighbour.id,
        publicCode: neighbour.publicCode,
        relationship: edge.relationship,
        ratio: edge.ratio,
        depth,
        riskState: neighbour.riskState,
        qualityStatus: neighbour.qualityStatus,
        currentStage: neighbour.currentStage,
      });
      next.push(neighbour.id);

      if (nodes.length >= MAX_NODES) return nodes;
    }
    frontier = next;
  }

  return nodes;
}
