/**
 * HIVETRACE HIVEOS — LLM advisor layer.
 *
 * This is where the self-hosted model (Ollama, e.g. qwen3:27b) is "trained"
 * for HiveTrace's requirements: not by changing its weights, but by giving it
 * HiveTrace-specific instructions for its three jobs — alert detection,
 * action recommendations, and attention ranking. The deterministic prototype
 * rules in engine.ts stay authoritative; everything here is ADVISORY and is
 * labelled as such in the UI ("AI-drafted — review before acting",
 * LOW DATA CONFIDENCE).
 *
 * Every call degrades gracefully: if the model is unconfigured, unreachable,
 * slow, or returns unparsable output, the result is { available: false } and
 * the UI falls back to the rules-only view. Nothing here ever throws.
 */
import { z } from "zod";
import {
  generate,
  isConfigured,
  resolveModelName,
  type ChatModelLike,
} from "@/lib/ai/provider";
import type { HiveOSView } from "./service";

/* ── public shapes ─────────────────────────────────────────────────── */

export interface AdvisorAlert {
  title: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  rationale: string;
  /** Factor keys from the rules engine this hypothesis cites. */
  evidenceRefs: string[];
  suggestedAction: string;
}

export interface AdvisorRecommendation {
  title: string;
  detail: string;
  priority: "now" | "this-week" | "watch";
  rationale: string;
}

export interface AdvisorResult<T> {
  /** False when the model is unconfigured, failed, or gave unusable output. */
  available: boolean;
  /** The model that answered, or null when unavailable. */
  model: string | null;
  items: T[];
  /** Honesty label the UI must render next to these items. */
  notice: string;
}

/* ── validation ────────────────────────────────────────────────────── */

const AlertSchema = z.object({
  title: z.string().trim().min(1).max(140),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  rationale: z.string().trim().min(1).max(600),
  evidenceRefs: z.array(z.string().trim().max(64)).max(8).default([]),
  suggestedAction: z.string().trim().min(1).max(300),
});

const AlertsSchema = z.object({ alerts: z.array(AlertSchema).max(6).default([]) });

const RecommendationSchema = z.object({
  title: z.string().trim().min(1).max(140),
  detail: z.string().trim().min(1).max(500),
  priority: z.enum(["now", "this-week", "watch"]),
  rationale: z.string().trim().min(1).max(400),
});

const RecommendationsSchema = z.object({
  recommendations: z.array(RecommendationSchema).max(6).default([]),
});

/* ── prompt construction ("training" for the three jobs) ───────────── */

const DOMAIN_BRIEF = `You are the HiveTrace apiary analyst. You advise beekeepers in India on hive health.

Domain facts you must respect:
- Healthy brood-nest temperature is 34–36°C; deviations beyond ±3°C matter.
- Signals come from hive sensors (temperature, humidity, weight, foraging activity) and manual inspections (brood pattern, varroa index 0–3, queen sightings).
- A hive health state is one of STABLE, WATCH, STRESSED, CRITICAL.

Hard rules for every answer:
- Reason ONLY from the data given below. Never invent numbers, dates, or observations.
- Every claim must cite at least one factor key from "Rule factors" via evidenceRefs.
- If the data cannot support a conclusion, say which data is missing instead of guessing.
- Keep language plain and practical — the reader is a beekeeper, not a data scientist.
- Reply with RAW JSON only (no markdown fences), exactly matching the requested schema.`;

function factorBlock(view: HiveOSView): string {
  const lines = view.assessment.factors.map(
    (f) => `- ${f.key} [${f.severity}]: ${f.label} — ${f.detail}`,
  );
  return lines.length ? lines.join("\n") : "- (no factors reported)";
}

function signalBlock(view: HiveOSView): string {
  const s = view.signals;
  const recent = view.observations.slice(-7).map((o) => {
    const parts = [o.date];
    if (o.tempC != null) parts.push(`${o.tempC.toFixed(1)}°C`);
    if (o.humidityPct != null) parts.push(`${o.humidityPct}%`);
    if (o.weightKg != null) parts.push(`${o.weightKg.toFixed(1)}kg`);
    if (o.activityIndex != null) parts.push(`act ${o.activityIndex}`);
    return parts.join(" ");
  });
  return [
    `State: ${view.assessment.state} (score ${view.assessment.score}/100)`,
    `Latest temp: ${s.tempC ?? "n/a"}°C · humidity: ${s.humidityPct ?? "n/a"}% · weight trend: ${s.weightTrendKgPerDay ?? "n/a"} kg/day · activity: ${s.activityIndex ?? "n/a"} (delta ${s.activityDelta ?? "n/a"})`,
    `Varroa index: ${s.varroaIndex ?? "n/a"} · brood pattern: ${s.broodPattern ?? "n/a"} · days since inspection: ${s.daysSinceInspection ?? "n/a"}`,
    `Confidence: ${view.confidence}`,
    `Last 7 observations: ${recent.join(" | ") || "none"}`,
  ].join("\n");
}

function hiveContext(view: HiveOSView): string {
  return [
    `Hive: ${view.passport.name} (${view.passport.code}) — ${view.passport.farm}, ${view.passport.region}`,
    signalBlock(view),
    "Rule factors:",
    factorBlock(view),
  ].join("\n");
}

const ALERT_SYSTEM = `${DOMAIN_BRIEF}

YOUR JOB — ALERT DETECTION:
Surface alert hypotheses the rule factors point at, especially patterns the
individual rules may underweight: several weak signals combining into one
story, a stale inspection on top of a stressed hive, or a factor whose
severity looks mis-scored against the raw numbers. Each alert cites the
factor keys it rests on. Prefer fewer, stronger alerts over many weak ones.

Schema: {"alerts": [{"title": string, "severity": "LOW"|"MEDIUM"|"HIGH", "rationale": string, "evidenceRefs": [factor keys], "suggestedAction": string}]}
Empty array is a valid answer when nothing warrants an alert.`;

const RECOMMEND_SYSTEM = `${DOMAIN_BRIEF}

YOUR JOB — ACTION RECOMMENDATIONS:
Propose concrete beekeeper actions for the next 7 days, ordered by urgency.
"now" = do within 24h, "this-week" = schedule this week, "watch" = monitor,
no intervention yet. Each recommendation must be actionable with basic apiary
equipment and must cite the factor keys that motivate it. Do not repeat the
rule-based actions verbatim — complement them or refine their timing.

Schema: {"recommendations": [{"title": string, "detail": string, "priority": "now"|"this-week"|"watch", "rationale": string}]}`;

/* ── execution ─────────────────────────────────────────────────────── */

function unavailable<T>(): AdvisorResult<T> {
  return {
    available: false,
    model: null,
    items: [],
    notice: "AI advisor unavailable — showing rules-only analysis.",
  };
}

function labelled<T>(model: string, items: T[]): AdvisorResult<T> {
  return {
    available: true,
    model,
    items,
    notice: `AI-drafted by ${model} — review before acting. Not a validated prediction.`,
  };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.search(/[{[]/);
  if (start === -1) throw new Error("no JSON found");
  return JSON.parse(trimmed.slice(start));
}

async function callAdvisor<T>(
  system: string,
  user: string,
  parse: (json: unknown) => T[],
  model?: ChatModelLike,
): Promise<AdvisorResult<T>> {
  if (!model && !isConfigured()) return unavailable();
  let result: Awaited<ReturnType<typeof generate>>;
  try {
    result = await generate({ system, prompt: user, model, temperature: 0.2, maxTokens: 1200 });
  } catch {
    return unavailable();
  }
  try {
    return labelled(result.model, parse(extractJson(result.text)));
  } catch {
    return unavailable();
  }
}

/**
 * LLM alert hypotheses for one hive. Advisory — the rules engine stays
 * authoritative and every hypothesis cites rule factor keys.
 */
export function detectAlerts(
  view: HiveOSView,
  model?: ChatModelLike,
): Promise<AdvisorResult<AdvisorAlert>> {
  const user = `${hiveContext(view)}\n\nRule-based actions already suggested:\n${view.actions.map((a) => `- ${a.title}: ${a.detail}`).join("\n") || "- none"}\n\nList alert hypotheses as JSON.`;
  return callAdvisor<AdvisorAlert>(ALERT_SYSTEM, user, (j) => AlertsSchema.parse(j).alerts, model);
}

/**
 * LLM action recommendations for one hive, complementing the rule-based list.
 */
export function recommendActions(
  view: HiveOSView,
  model?: ChatModelLike,
): Promise<AdvisorResult<AdvisorRecommendation>> {
  const user = `${hiveContext(view)}\n\nRule-based actions already suggested (complement, don't duplicate):\n${view.actions.map((a) => `- ${a.title}: ${a.detail}`).join("\n") || "- none"}\n\nPropose beekeeper actions as JSON.`;
  return callAdvisor<AdvisorRecommendation>(
    RECOMMEND_SYSTEM,
    user,
    (j) => RecommendationsSchema.parse(j).recommendations,
    model,
  );
}

/** Model display name for UI badges; null when no provider is configured. */
export function advisorModelName(): string | null {
  return isConfigured() ? resolveModelName() : null;
}
