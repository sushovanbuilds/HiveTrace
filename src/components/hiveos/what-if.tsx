/**
 * WHAT-IF SIMULATOR — client component.
 * A lightweight prototype: toggle a hypothetical management action and see how
 * the prototype rules re-classify the hive. Output is explicitly labeled as
 * simulated decision support, never a validated prediction.
 */
"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { GlassCard, Pill } from "@/components/ui";
import { simulateWhatIf } from "@/lib/hiveos/engine";
import type { HealthSignals, HiveHealthState, WhatIfAdjustment } from "@/lib/hiveos/types";
import { STATE_TONE, HealthBadge } from "./health-badge";
import { SectionTitle } from "./shared";

const OPTIONS: Array<{
  key: keyof WhatIfAdjustment;
  title: string;
  hint: string;
}> = [
  { key: "ventilationFixed", title: "Fix ventilation", hint: "Shade board / ventilation shim fitted" },
  { key: "waterProvided", title: "Provide water", hint: "Water source refilled nearby" },
  { key: "inspectionDone", title: "Complete inspection", hint: "Full hands-on inspection done" },
  { key: "varroaTreated", title: "Treat varroa", hint: "Varroa treatment applied" },
  { key: "feedProvided", title: "Provide feed", hint: "Supplementary feeding given" },
];

export function WhatIfSimulator({
  signals,
  currentState,
  currentScore,
}: {
  signals: HealthSignals;
  currentState: HiveHealthState;
  currentScore: number;
}) {
  const [adj, setAdj] = useState<WhatIfAdjustment>({});
  const active = Object.values(adj).some(Boolean);

  const result = useMemo(() => (active ? simulateWhatIf(signals, adj) : null), [active, signals, adj]);

  const toggle = (key: keyof WhatIfAdjustment) =>
    setAdj((a) => ({ ...a, [key]: !a[key] }));

  return (
    <GlassCard className="p-6">
      <SectionTitle icon="science">What-if simulator</SectionTitle>

      <div className="mb-5 rounded-xl border border-dashed border-primary/50 bg-primary-container/10 p-3.5">
        <p className="flex items-center gap-2 text-metadata-sm font-semibold uppercase tracking-wider text-on-surface">
          <Icon name="warning" className="text-[18px]" />
          Simulated decision-support output
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-on-surface-variant">
          This re-runs the prototype rules against hypothetical changes. It is an illustration to
          support discussion — not a scientifically validated prediction of what will happen.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-label-caps font-semibold uppercase tracking-wider text-on-surface-variant">
            Try a management action
          </p>
          <div className="space-y-2">
            {OPTIONS.map((o) => {
              const on = !!adj[o.key];
              return (
                <button
                  key={o.key}
                  onClick={() => toggle(o.key)}
                  aria-pressed={on}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-all ${
                    on
                      ? "border-primary bg-primary-container/25"
                      : "border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant/60"
                  }`}
                >
                  <span>
                    <span className="block text-body-md font-medium text-on-surface">{o.title}</span>
                    <span className="block text-metadata-sm text-on-surface-variant">{o.hint}</span>
                  </span>
                  <span
                    className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors ${
                      on ? "justify-end bg-primary" : "justify-start bg-surface-container-highest"
                    }`}
                  >
                    <span className="h-4 w-4 rounded-full bg-white shadow" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-3 text-label-caps font-semibold uppercase tracking-wider text-on-surface-variant">
            Simulated outcome
          </p>
          {!result ? (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-xl border border-outline-variant/25 p-6 text-center">
              <Icon name="touch_app" className="mb-2 text-[32px] text-on-surface-variant/50" />
              <p className="max-w-[260px] text-metadata-sm text-on-surface-variant">
                Toggle an action on the left to see how the prototype rules would re-classify this hive.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-metadata-sm text-on-surface-variant">Current:</span>
                <Pill tone={STATE_TONE[currentState]}>{currentState}</Pill>
                <span className="text-metadata-sm tabular-nums text-on-surface-variant">{currentScore}/100</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-outline-variant/25 p-5">
              <HealthBadge state={result.state} score={result.score} />
              <div className="mt-4 space-y-1.5">
                {result.appliedChanges.map((c, i) => (
                  <p key={i} className="flex items-start gap-2 text-metadata-sm text-on-surface-variant">
                    <Icon name="check" className="mt-0.5 shrink-0 text-[16px] text-tertiary" />
                    {c}
                  </p>
                ))}
              </div>
              {result.factors.filter((x) => x.severity !== "info").length > 0 && (
                <div className="mt-3 border-t border-outline-variant/20 pt-3">
                  <p className="mb-1.5 text-label-caps uppercase tracking-wider text-on-surface-variant">
                    Remaining concerning factors
                  </p>
                  {result.factors
                    .filter((x) => x.severity !== "info")
                    .map((x) => (
                      <p key={x.key} className="text-metadata-sm text-on-surface-variant">
                        · {x.label} — {x.detail}
                      </p>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
