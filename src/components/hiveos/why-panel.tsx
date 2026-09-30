import { Icon } from "@/components/icons";
import { GlassCard, Pill } from "@/components/ui";
import type { WhyExplanation } from "@/lib/hiveos/types";
import { ProtoNote, SectionTitle } from "./shared";

const CONFIDENCE_TONE = {
  "LOW DATA CONFIDENCE": "surface",
  "MEDIUM DATA CONFIDENCE": "honey",
  "HIGH DATA CONFIDENCE": "tertiary",
} as const;

/**
 * WHY ENGINE — explains a state change in terms of the factors the prototype
 * rules actually saw. Language is associative ("consistent with"), never causal.
 */
export function WhyPanel({ why }: { why: WhyExplanation }) {
  return (
    <GlassCard className="p-6">
      <SectionTitle icon="psychology">Why engine</SectionTitle>

      <p className="text-body-md leading-relaxed text-on-surface">{why.explanation}</p>

      <div className="mt-5 space-y-4">
        {why.primaryFactor && (
          <div className="rounded-xl border border-error/25 bg-error-container/20 p-4">
            <p className="mb-1 text-label-caps font-semibold uppercase tracking-wider text-on-error-container">
              Primary factor
            </p>
            <p className="text-body-md font-medium text-on-surface">{why.primaryFactor.label}</p>
            <p className="text-metadata-sm text-on-surface-variant">{why.primaryFactor.detail}</p>
          </div>
        )}

        {why.contributingFactors.length > 0 && (
          <div>
            <p className="mb-2 text-label-caps font-semibold uppercase tracking-wider text-on-surface-variant">
              Contributing factors
            </p>
            <ul className="space-y-2">
              {why.contributingFactors.map((x) => (
                <li key={x.key} className="flex items-start gap-2 text-metadata-sm">
                  <Icon name="add" className="mt-0.5 text-[16px] text-on-surface-variant" />
                  <span className="text-on-surface">
                    <span className="font-medium">{x.label}</span>
                    <span className="text-on-surface-variant"> — {x.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {why.contextualFactors.length > 0 && (
          <div>
            <p className="mb-2 text-label-caps font-semibold uppercase tracking-wider text-on-surface-variant">
              Contextual factors
            </p>
            <ul className="space-y-1.5">
              {why.contextualFactors.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-metadata-sm text-on-surface-variant">
                  <Icon name="info" className="mt-0.5 shrink-0 text-[16px]" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-outline-variant/20 pt-4">
        <span className="text-metadata-sm text-on-surface-variant">Evidence confidence</span>
        <Pill tone={CONFIDENCE_TONE[why.confidence]}>{why.confidence}</Pill>
      </div>

      <ProtoNote>
        Prototype association rules — they describe which readings coincided, not what caused what.
        Always confirm with a hands-on inspection.
      </ProtoNote>
    </GlassCard>
  );
}
