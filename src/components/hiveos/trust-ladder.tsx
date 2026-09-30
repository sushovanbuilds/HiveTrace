import { Icon } from "@/components/icons";
import { GlassCard, Pill } from "@/components/ui";
import type { ConfidenceLabel, Evidence, EvidenceTier } from "@/lib/hiveos/types";
import { SectionTitle } from "./shared";

const TIERS: Array<{ tier: EvidenceTier; label: string; hint: string }> = [
  { tier: "MANUAL", label: "Manual observation", hint: "Keeper's written notes" },
  { tier: "BASIC_SENSOR", label: "Basic sensor data", hint: "One sensor stream" },
  { tier: "MULTI_SENSOR", label: "Multiple sensor data", hint: "Temp + humidity + weight" },
  { tier: "SENSOR_VERIFIED", label: "Sensor + verified evidence", hint: "Cross-checked at inspection" },
];

const RANK: Record<EvidenceTier, number> = { MANUAL: 0, BASIC_SENSOR: 1, MULTI_SENSOR: 2, SENSOR_VERIFIED: 3 };

const CONFIDENCE_TONE = {
  "LOW DATA CONFIDENCE": "surface",
  "MEDIUM DATA CONFIDENCE": "honey",
  "HIGH DATA CONFIDENCE": "tertiary",
} as const;

/**
 * TRUST LADDER — shows how much evidence backs the current assessment.
 * Confidence is a qualitative label, never an invented percentage.
 */
export function TrustLadder({ evidence, confidence }: { evidence: Evidence[]; confidence: ConfidenceLabel }) {
  const best = evidence.reduce<EvidenceTier>(
    (b, e) => (RANK[e.tier] > RANK[b] ? e.tier : b),
    "MANUAL",
  );
  const bestRank = RANK[best];

  return (
    <GlassCard className="p-6">
      <SectionTitle icon="verified">Trust ladder</SectionTitle>

      <div className="space-y-1">
        {TIERS.map((t, i) => {
          const reached = i <= bestRank;
          const current = i === bestRank;
          return (
            <div key={t.tier} className="flex items-stretch gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                    reached ? "border-tertiary bg-tertiary/15 text-tertiary" : "border-outline-variant/40 text-on-surface-variant/40"
                  }`}
                >
                  <Icon name={reached ? "check" : "circle"} className="text-[16px]" />
                </span>
                {i < TIERS.length - 1 && (
                  <span className={`w-0.5 flex-1 ${i < bestRank ? "bg-tertiary/50" : "bg-outline-variant/25"}`} />
                )}
              </div>
              <div className={`pb-4 ${current ? "" : "opacity-70"}`}>
                <p className={`text-body-md font-medium ${current ? "text-on-surface" : "text-on-surface-variant"}`}>
                  {t.label}
                  {current && (
                    <span className="ml-2 rounded-full bg-tertiary/15 px-2 py-0.5 text-[11px] font-semibold text-tertiary">
                      CURRENT
                    </span>
                  )}
                </p>
                <p className="text-metadata-sm text-on-surface-variant">{t.hint}</p>
              </div>
            </div>
          );
        })}
      </div>

      {evidence.map((e) => (
        <p key={e.tier} className="mt-1 text-[12px] leading-relaxed text-on-surface-variant">
          · {e.detail}
        </p>
      ))}

      <div className="mt-4 flex items-center justify-between border-t border-outline-variant/20 pt-4">
        <span className="text-metadata-sm text-on-surface-variant">Overall</span>
        <Pill tone={CONFIDENCE_TONE[confidence]}>{confidence}</Pill>
      </div>
    </GlassCard>
  );
}
