/**
 * HIVETRACE ATTENTION LAYER — "what needs the beekeeper first".
 *
 * Ranks every hive by how urgently it needs human attention, combining the
 * deterministic HiveOS rules (health state, bad/watch factors) into a single
 * attention score. The ranking itself is pure rules — fast and auditable. An
 * optional LLM briefing (see briefAttention) turns the top of the queue into
 * plain language, and is always labelled AI-drafted.
 */
import { db } from "@/lib/db";
import { generate, isConfigured, resolveModelName, type ChatModelLike } from "@/lib/ai/provider";
import { classifyHealth, deriveSignals } from "@/lib/hiveos/engine";
import { DEMO_HIVE_METAS, getHiveOSData } from "@/lib/hiveos/demo";
import type { HiveHealthState } from "@/lib/hiveos/types";

export interface AttentionItem {
  hiveId: string;
  hiveName: string;
  farm: string;
  state: HiveHealthState;
  /** 0–100 rule health score (higher = healthier). */
  score: number;
  /** 0–100 attention score (higher = look at this first). */
  attentionScore: number;
  /** Short rule-based reasons, most important first. */
  reasons: string[];
}

const STATE_WEIGHT: Record<HiveHealthState, number> = {
  CRITICAL: 70,
  STRESSED: 45,
  WATCH: 25,
  STABLE: 5,
};

function scoreHive(
  id: string,
  name: string,
  farm: string,
  type: string,
): AttentionItem {
  const os = getHiveOSData(id);
  const signals = deriveSignals(os.observations, os.inspections, os.colonyLost, type);
  const assessment = classifyHealth(signals);
  const bad = assessment.factors.filter((f) => f.severity === "bad");
  const watch = assessment.factors.filter((f) => f.severity === "watch");
  const attentionScore = Math.min(
    100,
    Math.round(
      STATE_WEIGHT[assessment.state] + bad.length * 8 + watch.length * 3 + (100 - assessment.score) * 0.2,
    ),
  );
  const reasons = [...bad, ...watch]
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map((f) => f.label);
  return {
    hiveId: id,
    hiveName: name,
    farm,
    state: assessment.state,
    score: assessment.score,
    attentionScore,
    reasons,
  };
}

export interface AttentionQueue {
  items: AttentionItem[];
  total: number;
  generatedAt: string;
}

/** Ranked attention queue across the fleet. DB first, demo fallback — mirrors getHiveFleet. */
export async function getAttentionQueue(limit = 5): Promise<AttentionQueue> {
  const items: AttentionItem[] = [];
  try {
    const hives = await db.hive.findMany({
      include: { farm: { select: { name: true } } },
      orderBy: { name: "asc" },
    });
    if (hives.length) {
      for (const h of hives) {
        items.push(scoreHive(h.id, h.name, h.farm?.name ?? "Unassigned", h.type));
      }
    }
  } catch {
    // fall through to demo
  }
  if (!items.length) {
    for (const m of DEMO_HIVE_METAS) {
      items.push(scoreHive(m.id, m.name, m.farm, m.type));
    }
  }
  items.sort((a, b) => b.attentionScore - a.attentionScore);
  return {
    items: items.slice(0, Math.max(1, limit)),
    total: items.length,
    generatedAt: new Date().toISOString(),
  };
}

/* ── LLM briefing (advisory, labelled) ───────────────────────────────── */

const BRIEF_SYSTEM = `You are the HiveTrace apiary analyst writing a morning briefing for a beekeeper in India.
Given the ranked attention queue below (higher attentionScore = needs attention first), write 3–5 short sentences of plain, practical guidance: which hives to check first and why, in one paragraph. Reason ONLY from the data given. Never invent numbers or hives. Do not repeat the scores verbatim — translate them into actions. Reply with the paragraph only, no heading.`;

export interface AttentionBrief {
  available: boolean;
  model: string | null;
  text: string | null;
  notice: string;
}

/** Plain-language briefing over the top of the queue. Null text = rules-only mode. */
export async function briefAttention(
  queue: AttentionQueue,
  model?: ChatModelLike,
): Promise<AttentionBrief> {
  if (!model && !isConfigured()) {
    return {
      available: false,
      model: null,
      text: null,
      notice: "AI briefing unavailable — ranked by rules only.",
    };
  }
  const user = queue.items
    .map(
      (i) =>
        `- ${i.hiveName} (${i.farm}): state ${i.state}, attention ${i.attentionScore}/100. Reasons: ${i.reasons.join("; ") || "routine"}.`,
    )
    .join("\n");
  try {
    const result = await generate({
      system: BRIEF_SYSTEM,
      prompt: `Attention queue (top ${queue.items.length} of ${queue.total} hives):\n${user}`,
      model,
      temperature: 0.3,
      maxTokens: 400,
    });
    return {
      available: true,
      model: result.model,
      text: result.text.trim(),
      notice: `AI-drafted by ${result.model} — review before acting. Not a validated prediction.`,
    };
  } catch {
    return {
      available: false,
      model: null,
      text: null,
      notice: "AI briefing unavailable — ranked by rules only.",
    };
  }
}

/** Model display name for UI badges; null when no provider is configured. */
export function attentionModelName(): string | null {
  return isConfigured() ? resolveModelName() : null;
}
