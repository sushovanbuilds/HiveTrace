import { Pill, type PillTone } from "@/components/ui";
import type { HiveHealthState } from "@/lib/hiveos/types";

export const STATE_TONE: Record<HiveHealthState, PillTone> = {
  STABLE: "tertiary",
  WATCH: "honey",
  STRESSED: "warn",
  CRITICAL: "error",
};

export const STATE_DOT: Record<HiveHealthState, string> = {
  STABLE: "bg-tertiary",
  WATCH: "bg-primary",
  STRESSED: "bg-primary",
  CRITICAL: "bg-error",
};

export const STATE_BLURB: Record<HiveHealthState, string> = {
  STABLE: "No concerning factors in the current window.",
  WATCH: "One or more signals merit a closer look.",
  STRESSED: "Multiple concerning signals — inspect soon.",
  CRITICAL: "Urgent — inspect immediately.",
};

export function scoreTone(score: number): "tertiary" | "primary" | "error" {
  if (score >= 80) return "tertiary";
  if (score >= 50) return "primary";
  return "error";
}

export function HealthBadge({ state, score }: { state: HiveHealthState; score: number }) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 shrink-0">
        <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
          <circle cx="40" cy="40" r="34" fill="none" strokeWidth="8" className="stroke-surface-container-highest" />
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 213.6} 213.6`}
            className={
              score >= 80 ? "stroke-tertiary" : score >= 50 ? "stroke-primary" : "stroke-error"
            }
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-headline-md font-bold tabular-nums text-on-surface">
          {score}
        </span>
      </div>
      <div>
        <Pill tone={STATE_TONE[state]} dot={STATE_DOT[state]}>
          {state}
        </Pill>
        <p className="mt-2 max-w-[220px] text-metadata-sm leading-snug text-on-surface-variant">
          {STATE_BLURB[state]}
        </p>
      </div>
    </div>
  );
}
