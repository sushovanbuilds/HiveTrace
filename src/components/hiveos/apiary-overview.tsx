import Link from "next/link";
import { Icon } from "@/components/icons";
import { GlassCard } from "@/components/ui";
import type { ApiaryIntelligence, HiveHealthState } from "@/lib/hiveos/types";
import { STATE_TONE, STATE_DOT } from "./health-badge";
import { Pill } from "@/components/ui";
import { ProtoNote, SectionTitle } from "./shared";

const STATE_ORDER: HiveHealthState[] = ["STABLE", "WATCH", "STRESSED", "CRITICAL"];

const STATE_CELL: Record<HiveHealthState, string> = {
  STABLE: "bg-tertiary/20 border-tertiary/40",
  WATCH: "bg-primary-container/30 border-primary-container/60",
  STRESSED: "bg-primary-container/60 border-primary/50",
  CRITICAL: "bg-error-container/50 border-error/50",
};

/**
 * APIARY INTELLIGENCE — multi-hive overview: health counts, a status
 * heatmap, and anomaly grouping (hives in one apiary sharing a pattern).
 */
export function ApiaryOverview({ intelligence }: { intelligence: ApiaryIntelligence }) {
  const { total, byState, avgScore, groups, heatmap } = intelligence;
  const byFarm = new Map<string, typeof heatmap>();
  for (const h of heatmap) {
    const list = byFarm.get(h.farm) ?? [];
    list.push(h);
    byFarm.set(h.farm, list);
  }

  return (
    <section className="mb-10">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-headline-md tracking-tight text-on-surface">
            <Icon name="hive" fill className="text-[24px] text-primary" />
            Apiary intelligence
          </h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            {total} hives assessed by prototype rules · average health {avgScore}/100
          </p>
        </div>
        <div className="hidden gap-2 sm:flex">
          {STATE_ORDER.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 text-metadata-sm text-on-surface-variant">
              <span className={`h-2.5 w-2.5 rounded-sm ${STATE_DOT[s]}`} />
              {byState[s]} {s.toLowerCase()}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Heatmap */}
        <GlassCard className="p-6 lg:col-span-2">
          <SectionTitle icon="grid_view">Hive status heatmap</SectionTitle>
          <div className="space-y-5">
            {[...byFarm.entries()].map(([farm, hives]) => (
              <div key={farm}>
                <p className="mb-2 text-metadata-sm font-medium text-on-surface-variant">{farm}</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {hives.map((h) => (
                    <Link
                      key={h.hiveId}
                      href={`/hives/${h.hiveId}`}
                      title={`${h.name} — ${h.state} (${h.score}/100)`}
                      className={`rounded-xl border p-3 transition-transform hover:scale-[1.03] ${STATE_CELL[h.state]}`}
                    >
                      <p className="text-body-md font-bold tabular-nums text-on-surface">{h.score}</p>
                      <p className="truncate text-metadata-sm font-medium text-on-surface">{h.name}</p>
                      <p className="text-[11px] uppercase tracking-wider text-on-surface-variant">{h.state}</p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <ProtoNote />
        </GlassCard>

        {/* Anomaly grouping */}
        <div className="space-y-4">
          <GlassCard className="p-6">
            <SectionTitle icon="grouped_bar_chart">Pattern detection</SectionTitle>
            {groups.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">
                No shared anomaly patterns across apiaries right now.
              </p>
            ) : (
              <div className="space-y-3">
                {groups.map((g) => (
                  <div key={g.id} className="rounded-xl border border-primary/30 bg-primary-container/15 p-4">
                    <p className="mb-2 flex items-center gap-2 text-label-caps font-semibold uppercase tracking-wider text-on-surface">
                      <Icon name="warning" className="text-[16px]" />
                      Localized pattern
                    </p>
                    <p className="text-body-md leading-relaxed text-on-surface">{g.headline}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {g.hiveIds.map((id, i) => (
                        <Link
                          key={id}
                          href={`/hives/${id}`}
                          className="rounded-lg bg-surface px-2.5 py-1 text-metadata-sm font-medium text-on-surface shadow-sm hover:bg-surface-variant"
                        >
                          {g.hiveNames[i]}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-[12px] leading-relaxed text-on-surface-variant/80">
              Groups hives in one apiary that share an anomaly signature. A shared pattern suggests
              checking for a local environmental cause — it is not a diagnosis.
            </p>
          </GlassCard>

          <GlassCard className="p-6">
            <SectionTitle icon="monitoring">Fleet health</SectionTitle>
            <div className="space-y-2.5">
              {STATE_ORDER.map((s) => (
                <div key={s} className="flex items-center justify-between">
                  <Pill tone={STATE_TONE[s]} dot={STATE_DOT[s]}>
                    {s}
                  </Pill>
                  <span className="text-body-md font-semibold tabular-nums text-on-surface">
                    {byState[s]}
                    <span className="ml-1 font-normal text-on-surface-variant">
                      ({total ? Math.round((byState[s] / total) * 100) : 0}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
