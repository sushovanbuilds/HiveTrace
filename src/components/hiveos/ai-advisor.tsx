"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { GlassCard, Pill } from "@/components/ui";
import { SectionTitle } from "./shared";
import type { PillTone } from "@/components/ui";
import type {
  AdvisorAlert,
  AdvisorRecommendation,
} from "@/lib/hiveos/advisor";

interface AdvisorPayload {
  hiveId: string;
  hiveName: string;
  model: string | null;
  alerts: { available: boolean; items: AdvisorAlert[]; notice: string };
  recommendations: { available: boolean; items: AdvisorRecommendation[]; notice: string };
}

type Status = "loading" | "ready" | "unavailable" | "error";

const SEVERITY_TONE: Record<AdvisorAlert["severity"], PillTone> = {
  HIGH: "error",
  MEDIUM: "warn",
  LOW: "surface",
};

const PRIORITY_TONE: Record<AdvisorRecommendation["priority"], PillTone> = {
  now: "error",
  "this-week": "warn",
  watch: "surface",
};

const PRIORITY_LABEL: Record<AdvisorRecommendation["priority"], string> = {
  now: "Do now",
  "this-week": "This week",
  watch: "Watch",
};

/**
 * AI Advisor panel: LLM alert hypotheses + recommendations for one hive,
 * loaded lazily so a slow 27B model never blocks the page. Always labelled
 * AI-drafted; falls back to a quiet unavailable card when no model answers.
 */
export function AiAdvisor({ hiveId }: { hiveId: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<AdvisorPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/hives/${encodeURIComponent(hiveId)}/advisor`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { data: AdvisorPayload };
        if (cancelled) return;
        setData(body.data);
        setStatus(
          body.data.alerts.available || body.data.recommendations.available
            ? "ready"
            : "unavailable",
        );
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hiveId]);

  if (status === "loading") {
    return (
      <section aria-label="AI advisor" aria-busy="true" className="mb-8">
        <GlassCard className="p-5 md:p-6">
          <SectionTitle icon="psychology">AI advisor</SectionTitle>
          <div className="flex items-center gap-3 text-body-sm text-on-surface-variant">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Asking the model about this hive…
          </div>
        </GlassCard>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section aria-label="AI advisor" className="mb-8">
        <GlassCard className="p-5 md:p-6">
          <SectionTitle icon="psychology">AI advisor</SectionTitle>
          <p className="text-body-sm text-on-surface-variant">
            Couldn&apos;t reach the advisor right now. The rule-based analysis above is unaffected.
          </p>
        </GlassCard>
      </section>
    );
  }

  if (status === "unavailable" || !data) {
    return (
      <section aria-label="AI advisor" className="mb-8">
        <GlassCard className="p-5 md:p-6">
          <SectionTitle icon="psychology">AI advisor</SectionTitle>
          <p className="text-body-sm text-on-surface-variant">
            No model is connected, so there are no AI-drafted insights for this hive.
            Set <span className="font-mono">LLM_PROVIDER=ollama</span> and{" "}
            <span className="font-mono">OLLAMA_BASE_URL</span> to enable them — the rule-based
            analysis above keeps working either way.
          </p>
        </GlassCard>
      </section>
    );
  }

  const { alerts, recommendations, model } = data;
  const notice = alerts.available ? alerts.notice : recommendations.notice;

  return (
    <section aria-label="AI advisor" className="mb-8">
      <GlassCard className="p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h3 className="flex items-center gap-2 text-metadata-sm font-semibold uppercase tracking-wider text-on-surface-variant">
            <Icon name="psychology" className="text-[18px]" />
            AI advisor
          </h3>
          {model ? <Pill tone="honey">{model}</Pill> : null}
          <Pill tone="outline">LOW DATA CONFIDENCE</Pill>
        </div>

        {alerts.available && alerts.items.length > 0 && (
          <div className="mb-6">
            <h4 className="mb-3 text-body-md font-semibold text-on-surface">Alert hypotheses</h4>
            <ul className="space-y-3">
              {alerts.items.map((a, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-body-md font-semibold text-on-surface">{a.title}</span>
                    <Pill tone={SEVERITY_TONE[a.severity]}>{a.severity}</Pill>
                  </div>
                  <p className="mt-1.5 text-body-sm text-on-surface-variant">{a.rationale}</p>
                  {a.evidenceRefs.length > 0 && (
                    <p className="mt-1.5 font-mono text-[11px] text-on-surface-variant/70">
                      cites: {a.evidenceRefs.join(", ")}
                    </p>
                  )}
                  <p className="mt-2 flex items-start gap-1.5 text-body-sm text-on-surface">
                    <Icon name="arrow_forward" className="mt-0.5 shrink-0 text-[16px] text-primary" />
                    {a.suggestedAction}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {recommendations.available && recommendations.items.length > 0 && (
          <div>
            <h4 className="mb-3 text-body-md font-semibold text-on-surface">Recommended actions</h4>
            <ul className="space-y-3">
              {recommendations.items.map((r, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-body-md font-semibold text-on-surface">{r.title}</span>
                    <Pill tone={PRIORITY_TONE[r.priority]}>{PRIORITY_LABEL[r.priority]}</Pill>
                  </div>
                  <p className="mt-1.5 text-body-sm text-on-surface-variant">{r.detail}</p>
                  <p className="mt-1 text-[12px] text-on-surface-variant/80">{r.rationale}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {alerts.available && alerts.items.length === 0 && recommendations.items.length === 0 && (
          <p className="text-body-sm text-on-surface-variant">
            The model reviewed this hive&apos;s signals and raised no additional alerts.
          </p>
        )}

        <p className="mt-4 flex items-start gap-1.5 text-[12px] leading-relaxed text-on-surface-variant/80">
          <Icon name="info" className="mt-0.5 shrink-0 text-[14px]" />
          <span>{notice}</span>
        </p>
      </GlassCard>
    </section>
  );
}
