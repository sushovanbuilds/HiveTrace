import { Icon } from "@/components/icons";
import { GlassCard, Pill, type PillTone } from "@/components/ui";
import type { ActionRecommendation } from "@/lib/hiveos/types";
import { ProtoNote, SectionTitle } from "./shared";

const PRIORITY_TONE: Record<ActionRecommendation["priority"], PillTone> = {
  NOW: "error",
  SOON: "honey",
  ROUTINE: "surface",
};

const PRIORITY_ICON: Record<ActionRecommendation["priority"], string> = {
  NOW: "priority_high",
  SOON: "schedule",
  ROUTINE: "check_circle",
};

/**
 * ACTION ENGINE — every recommendation carries the factors that triggered it,
 * so the keeper sees the WHY behind each suggested action.
 */
export function ActionList({ actions }: { actions: ActionRecommendation[] }) {
  return (
    <GlassCard className="p-6">
      <SectionTitle icon="tips_and_updates">Action engine</SectionTitle>
      <div className="space-y-4">
        {actions.map((a) => (
          <div
            key={a.id}
            className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4"
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-body-md font-semibold text-on-surface">
                <Icon name={PRIORITY_ICON[a.priority]} className="text-[18px] text-on-surface-variant" />
                {a.title}
              </p>
              <Pill tone={PRIORITY_TONE[a.priority]}>{a.priority}</Pill>
            </div>
            <p className="text-metadata-sm leading-relaxed text-on-surface-variant">{a.detail}</p>
            <div className="mt-2.5 rounded-lg bg-primary-container/15 p-2.5">
              <p className="mb-1 text-label-caps font-semibold uppercase tracking-wider text-on-surface-variant">
                Why this action
              </p>
              <ul className="space-y-1">
                {a.why.map((w, i) => (
                  <li key={i} className="text-[12px] leading-relaxed text-on-surface-variant">
                    → {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
      <ProtoNote>
        Recommendations are generated from prototype rules over demo data. Use your judgement —
        the hive in front of you outranks any panel.
      </ProtoNote>
    </GlassCard>
  );
}
