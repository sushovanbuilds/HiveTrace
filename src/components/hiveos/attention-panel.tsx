import Link from "next/link";
import { Icon } from "@/components/icons";
import { GlassCard, Pill } from "@/components/ui";
import { SectionTitle } from "./shared";
import { getAttentionQueue } from "@/lib/attention/rank";
import type { HiveHealthState } from "@/lib/hiveos/types";
import type { PillTone } from "@/components/ui";

const STATE_TONE: Record<HiveHealthState, PillTone> = {
  CRITICAL: "error",
  STRESSED: "warn",
  WATCH: "honey",
  STABLE: "tertiary",
};

/**
 * Attention layer panel for the fleet page: the hives that need the
 * beekeeper first, ranked by deterministic rules. Server-rendered — no model
 * call, no latency.
 */
export async function AttentionPanel() {
  const queue = await getAttentionQueue(5);
  if (!queue.items.length) return null;

  return (
    <section aria-label="Attention queue" className="mb-8">
      <GlassCard className="p-5 md:p-6">
        <SectionTitle icon="priority_high">Needs attention</SectionTitle>
        <ol className="space-y-3">
          {queue.items.map((item, i) => (
            <li key={item.hiveId}>
              <Link
                href={`/hives/${item.hiveId}`}
                className="flex items-center gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container/50 text-body-md font-bold text-on-primary-container">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-body-md font-semibold text-on-surface">
                      {item.hiveName}
                    </span>
                    <Pill tone={STATE_TONE[item.state]}>{item.state}</Pill>
                  </span>
                  <span className="mt-1 block truncate text-body-sm text-on-surface-variant">
                    {item.farm}
                    {item.reasons.length > 0 ? ` · ${item.reasons[0]}` : ""}
                  </span>
                  <span
                    className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-container"
                    role="img"
                    aria-label={`Attention score ${item.attentionScore} of 100`}
                  >
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${item.attentionScore}%` }}
                    />
                  </span>
                </span>
                <Icon name="chevron_right" className="shrink-0 text-[20px] text-on-surface-variant" />
              </Link>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-start gap-1.5 text-[12px] leading-relaxed text-on-surface-variant/80">
          <Icon name="info" className="mt-0.5 shrink-0 text-[14px]" />
          <span>
            Ranked by transparent prototype rules over hive signals — deterministic, not ML.
            {queue.total > queue.items.length
              ? ` Showing top ${queue.items.length} of ${queue.total} hives.`
              : ""}
          </span>
        </p>
      </GlassCard>
    </section>
  );
}
