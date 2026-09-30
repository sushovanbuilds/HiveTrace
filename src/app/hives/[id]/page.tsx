import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { GlassCard, Pill } from "@/components/ui";
import { TrendChart } from "@/components/charts";
import { getHiveOS } from "@/lib/hiveos/service";
import { HealthBadge, scoreTone } from "@/components/hiveos/health-badge";
import { WhyPanel } from "@/components/hiveos/why-panel";
import { ActionList } from "@/components/hiveos/action-list";
import { AiAdvisor } from "@/components/hiveos/ai-advisor";
import { TrustLadder } from "@/components/hiveos/trust-ladder";
import { HivePassportCard } from "@/components/hiveos/passport";
import { TraceBridge } from "@/components/hiveos/trace-bridge";
import { InterventionMemory } from "@/components/hiveos/interventions";
import { WhatIfSimulator } from "@/components/hiveos/what-if";
import { ProtoNote, SectionTitle } from "@/components/hiveos/shared";
import type { FactorSeverity } from "@/lib/hiveos/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const view = await getHiveOS(id);
  return { title: view ? `HiveOS · ${view.passport.name}` : "Hive not found" };
}

const FACTOR_ICON: Record<FactorSeverity, { name: string; cls: string }> = {
  bad: { name: "error", cls: "text-error" },
  watch: { name: "warning", cls: "text-primary" },
  info: { name: "check_circle", cls: "text-tertiary" },
};

function trendArrow(now: number | null, then: number | null, invert = false): string {
  if (now == null || then == null) return "→";
  const d = now - then;
  if (Math.abs(d) < 1e-9) return "→";
  const up = d > 0;
  return up !== invert ? "▲" : "▼";
}

export default async function HiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = await getHiveOS(id);
  if (!view) notFound();

  const { passport, assessment, signals, why, actions, evidence, confidence } = view;
  const statusPill: "tertiary" | "warn" | "error" | "surface" =
    passport.status === "ACTIVE" ? "tertiary" : passport.status === "INSPECTION" ? "warn" : passport.status === "COLONY_LOSS" ? "error" : "surface";

  const obs = view.observations;
  const latest = obs[obs.length - 1];
  const weekAgo = obs[obs.length - 8] ?? obs[0];
  const weights = obs.map((o) => o.weightKg);
  const weightVals = weights.filter((v): v is number => v != null).slice(-14);
  const weightLabels = obs
    .filter((o) => o.weightKg != null)
    .slice(-14)
    .map((o) => new Date(o.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }));

  const telemetry = [
    {
      icon: "thermostat",
      label: "Internal Temp",
      value: latest?.tempC != null ? `${latest.tempC.toFixed(1)}°C` : "—",
      sub: latest?.tempC != null ? `${trendArrow(latest.tempC, weekAgo?.tempC ?? null)} vs 7d ago` : "no sensor",
    },
    {
      icon: "water_drop",
      label: "Humidity",
      value: latest?.humidityPct != null ? `${latest.humidityPct}%` : "—",
      sub: latest?.humidityPct != null ? `${trendArrow(latest.humidityPct, weekAgo?.humidityPct ?? null)} vs 7d ago` : "no sensor",
    },
    {
      icon: "scale",
      label: "Hive Weight",
      value: latest?.weightKg != null ? `${latest.weightKg.toFixed(1)} kg` : "—",
      sub:
        signals.weightTrendKgPerDay != null
          ? `${signals.weightTrendKgPerDay >= 0 ? "+" : ""}${signals.weightTrendKgPerDay.toFixed(2)} kg/day`
          : "no trend",
    },
    {
      icon: "sensors",
      label: "Activity Index",
      value: latest?.activityIndex != null ? `${latest.activityIndex}/100` : "—",
      sub:
        signals.activityDelta != null
          ? `${signals.activityDelta >= 0 ? "+" : ""}${signals.activityDelta.toFixed(0)} vs baseline`
          : "no baseline",
    },
  ];

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Link href="/hives" className="inline-flex items-center gap-1 text-metadata-sm font-medium uppercase tracking-wider text-on-surface-variant hover:text-primary">
              <Icon name="chevron_left" className="text-[16px]" />
              Hive Fleet
            </Link>
            <Pill tone="primary">HiveOS</Pill>
            {view.isDemo && <Pill tone="surface">Demo data</Pill>}
          </div>
          <h1 className="flex flex-wrap items-center gap-3 text-headline-lg tracking-tight text-on-surface">
            {passport.name}
            <Pill tone={statusPill}>{passport.status.replace(/_/g, " ")}</Pill>
          </h1>
          <p className="mt-1 text-body-lg text-on-surface-variant">
            {passport.farm} · {passport.region} · {passport.type} · Code {passport.code}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-outline-variant/50 bg-surface px-4 py-2 text-metadata-sm text-on-surface transition-colors hover:bg-surface-variant">
            <Icon name="inspection" className="text-[18px]" />
            Log Inspection
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-primary-container px-4 py-2 text-metadata-sm font-semibold text-on-primary-container shadow-sm transition-colors hover:bg-primary-fixed">
            <Icon name="agriculture" className="text-[18px]" />
            Log Harvest
          </button>
        </div>
      </div>

      {/* Live telemetry — driven by the observation series */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {telemetry.map((m) => (
          <div key={m.label} className="metric-card rounded-xl p-5 transition-shadow hover:shadow-md">
            <p className="mb-4 flex items-center gap-2 text-label-caps uppercase tracking-wider text-on-surface-variant">
              <Icon name={m.icon} className="text-[18px]" />
              {m.label}
            </p>
            <p className="text-headline-md tabular-nums tracking-tight text-on-surface">{m.value}</p>
            <p className="mt-1 flex items-center justify-between text-metadata-sm text-on-surface-variant">
              {m.sub}
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${latest?.source === "SENSOR" ? "bg-tertiary/15 text-tertiary" : "bg-surface-container-highest text-on-surface-variant"}`}>
                {latest?.source === "SENSOR" ? "sensor" : "manual"}
              </span>
            </p>
          </div>
        ))}
      </div>

      {/* Health state + trust */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-2">
          <SectionTitle icon="monitor_heart">Hive health state</SectionTitle>
          <HealthBadge state={assessment.state} score={assessment.score} />

          <div className="mt-6">
            <p className="mb-2 text-label-caps font-semibold uppercase tracking-wider text-on-surface-variant">
              Factors contributing to the score
            </p>
            <ul className="divide-y divide-outline-variant/15">
              {assessment.factors.map((fx) => {
                const ic = FACTOR_ICON[fx.severity];
                return (
                  <li key={fx.key} className="flex items-start justify-between gap-3 py-2.5">
                    <span className="flex items-start gap-2.5">
                      <Icon name={ic.name} className={`mt-0.5 text-[20px] ${ic.cls}`} />
                      <span>
                        <span className="block text-body-md font-medium text-on-surface">{fx.label}</span>
                        <span className="block text-metadata-sm text-on-surface-variant">{fx.detail}</span>
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums ${
                        fx.contribution > 0 ? "bg-error-container/60 text-on-error-container" : "bg-tertiary/15 text-tertiary"
                      }`}
                    >
                      {fx.contribution > 0 ? `−${fx.contribution} pts` : "reassuring"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {weightVals.length >= 2 && (
            <div className="mt-4">
              <p className="mb-2 text-label-caps font-semibold uppercase tracking-wider text-on-surface-variant">
                Weight trend (14 days)
              </p>
              <TrendChart labels={weightLabels} values={weightVals} tone={scoreTone(assessment.score) === "tertiary" ? "#3b6934" : "#b87a00"} />
            </div>
          )}
          <ProtoNote />
        </GlassCard>

        <TrustLadder evidence={evidence} confidence={confidence} />
      </div>

      {/* Why + actions */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WhyPanel why={why} />
        </div>
        <ActionList actions={actions} />
      </div>

      {/* AI advisor — LLM alert hypotheses + recommendations, lazy-loaded */}
      <AiAdvisor hiveId={passport.id} />

      {/* Passport */}
      <div className="mb-6">
        <HivePassportCard
          passport={passport}
          inspections={view.inspections}
          healthEvents={view.healthEvents}
          ambientNote={view.ambientNote}
        />
      </div>

      {/* Interventions + traceability */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <InterventionMemory hiveId={passport.id} seed={view.interventions} />
        <TraceBridge hiveName={passport.name} trace={view.trace} />
      </div>

      {/* What-if */}
      <div className="mb-6">
        <WhatIfSimulator signals={signals} currentState={assessment.state} currentScore={assessment.score} />
      </div>
    </AppShell>
  );
}
