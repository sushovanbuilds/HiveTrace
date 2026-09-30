"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { Pill, type PillTone } from "@/components/ui";
import {
  saveDemoData,
  reviewClusterCase,
  confirmClusterCase,
  dismissClusterCase,
  resolveClusterCase,
  addClusterCaseNote,
  type DemoClusterCase,
  type DemoClusterCaseStatus,
  type DemoData,
} from "@/lib/demo/data";
import { useDemoData } from "@/lib/demo/hooks";
import { getCurrentDemoUser } from "@/lib/demo/auth";
import { buildDemoFeed } from "@/lib/incidents/demo-feed";
import {
  clusterAlerts,
  formatWindow,
  type IncidentCluster,
} from "@/lib/incidents/clustering";
import {
  RISK_MEANING,
  NO_ML_NOTICE,
  type RiskBand,
} from "@/lib/incidents/risk";
import { ANOMALY_SIGNALS, SIGNAL_IDS } from "@/lib/incidents/signals";

const RISK_TONE: Record<RiskBand, PillTone> = {
  LOW: "tertiary",
  MEDIUM: "warn",
  HIGH: "error",
};

const STATUS_TONE: Record<DemoClusterCaseStatus, PillTone> = {
  OPEN: "error",
  UNDER_REVIEW: "warn",
  RESOLVED: "tertiary",
  DISMISSED: "surface",
};

const STATUS_LABEL: Record<DemoClusterCaseStatus, string> = {
  OPEN: "Open",
  UNDER_REVIEW: "Under review",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};

const RESOLVE_DECISIONS = [
  "FALSE_POSITIVE",
  "SUPPLIER_ERROR",
  "PROCESSING_ERROR",
  "OTHER",
] as const;

function authorName(): string {
  return getCurrentDemoUser()?.name ?? "Investigator";
}

function formatClock(ms: number): string {
  return new Date(ms).toISOString().slice(11, 16);
}

/* ── Investigation action bar ──────────────────────────────────────── */

type ActionKind = "note" | "confirm" | "dismiss" | "resolve";

function ActionBar({
  clusterId,
  status,
  data,
}: {
  clusterId: string;
  status: DemoClusterCaseStatus;
  data: DemoData;
}) {
  const [form, setForm] = useState<ActionKind | null>(null);
  const [text, setText] = useState("");
  const [decision, setDecision] = useState<string>(RESOLVE_DECISIONS[0]);

  const apply = (next: DemoData) => {
    saveDemoData(next);
    setForm(null);
    setText("");
  };
  const author = authorName();
  const terminal = status === "RESOLVED" || status === "DISMISSED";

  const submit = () => {
    if (form === "note") apply(addClusterCaseNote(data, clusterId, author, text));
    else if (form === "confirm") apply(confirmClusterCase(data, clusterId, author, text));
    else if (form === "dismiss") apply(dismissClusterCase(data, clusterId, author, text));
    else if (form === "resolve") apply(resolveClusterCase(data, clusterId, author, text, decision));
  };

  const btn =
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-metadata-sm font-semibold transition-all active:scale-95";

  return (
    <div className="mt-5 border-t border-outline-variant/20 pt-4">
      <p className="mb-2 text-label-caps uppercase tracking-widest text-on-surface-variant">
        Investigation actions
      </p>
      <div className="flex flex-wrap gap-2">
        {status === "OPEN" && (
          <button
            type="button"
            onClick={() => apply(reviewClusterCase(data, clusterId, author))}
            className={`${btn} bg-primary text-on-primary hover:bg-primary/90`}
          >
            <Icon name="visibility" className="text-[18px]" /> Review
          </button>
        )}
        {!terminal && (
          <button
            type="button"
            onClick={() => setForm(form === "confirm" ? null : "confirm")}
            className={`${btn} bg-tertiary-container/60 text-on-tertiary-container hover:bg-tertiary-container`}
          >
            <Icon name="verified_user" className="text-[18px]" /> Confirm
          </button>
        )}
        {!terminal && (
          <button
            type="button"
            onClick={() => setForm(form === "dismiss" ? null : "dismiss")}
            className={`${btn} border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container`}
          >
            <Icon name="close" className="text-[18px]" /> Dismiss
          </button>
        )}
        {!terminal && (
          <button
            type="button"
            onClick={() => setForm(form === "resolve" ? null : "resolve")}
            className={`${btn} bg-tertiary text-on-tertiary hover:bg-tertiary/90`}
          >
            <Icon name="check_circle" className="text-[18px]" /> Resolve
          </button>
        )}
        <button
          type="button"
          onClick={() => setForm(form === "note" ? null : "note")}
          className={`${btn} border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container`}
        >
          <Icon name="edit_note" className="text-[18px]" /> Add note
        </button>
      </div>

      {form && (
        <div className="mt-3 rounded-xl bg-surface-container/60 p-4">
          <label className="mb-1.5 block text-label-caps uppercase tracking-widest text-on-surface-variant">
            {form === "note" && "Investigation note"}
            {form === "confirm" && "Confirmation note (optional)"}
            {form === "dismiss" && "Dismissal reason (required)"}
            {form === "resolve" && "Resolution summary (required)"}
          </label>
          {form === "resolve" && (
            <select
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              className="mb-2 w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-body-md text-on-surface"
            >
              {RESOLVE_DECISIONS.map((d) => (
                <option key={d} value={d}>
                  {d.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={
              form === "note"
                ? "What did you find? Facts only — the score never declares fraud."
                : form === "confirm"
                  ? "Why does this pattern look genuine? (optional)"
                  : form === "dismiss"
                    ? "Why is this not an issue? e.g. printer re-issued the codes, confirmed with the supplier."
                    : "How was this resolved? e.g. label stock audited, duplicate codes revoked."
            }
            className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/60"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={(form === "dismiss" || form === "resolve" || form === "note") && !text.trim()}
              className={`${btn} bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-40`}
            >
              <Icon name="send" className="text-[18px]" />
              {form === "note" && "Save note"}
              {form === "confirm" && "Confirm anomaly"}
              {form === "dismiss" && "Dismiss incident"}
              {form === "resolve" && "Resolve incident"}
            </button>
            <button
              type="button"
              onClick={() => { setForm(null); setText(""); }}
              className={`${btn} text-on-surface-variant hover:bg-surface-container`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Cluster card ──────────────────────────────────────────────────── */

function ClusterCard({
  cluster,
  caseData,
  data,
}: {
  cluster: IncidentCluster;
  caseData: DemoClusterCase | undefined;
  data: DemoData;
}) {
  const status: DemoClusterCaseStatus = caseData?.status ?? "OPEN";
  const shownBatches = cluster.affectedBatches.slice(0, 4);
  const hiddenBatches = cluster.affectedBatches.length - shownBatches.length;

  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error">
            <Icon name="hub" fill className="text-[22px]" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-metadata-sm tracking-wider text-on-surface-variant">
                {cluster.id}
              </span>
              <Pill tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Pill>
            </div>
            <h3 className="mt-1 text-[18px] font-semibold tracking-tight text-on-surface">
              {cluster.title}
            </h3>
            <p className="mt-0.5 text-body-md font-semibold text-primary">
              {cluster.alertCount.toLocaleString("en-US")} related{" "}
              {cluster.alertCount === 1 ? "alert" : "alerts"} → 1 incident cluster
            </p>
          </div>
        </div>
        <Pill tone={RISK_TONE[cluster.risk.band]} icon="report">
          {cluster.risk.band} · {cluster.risk.points}
        </Pill>
      </div>

      <div className="space-y-5 px-5 pb-5 sm:px-6">
        {/* Affected batches + common factors */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-surface-container/60 p-4">
            <p className="text-label-caps uppercase tracking-widest text-on-surface-variant">
              Affected batches ({cluster.affectedBatches.length})
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {shownBatches.map((b) => (
                <Link
                  key={b.batchId}
                  href={`/trace/${encodeURIComponent(b.publicCode)}`}
                  className="rounded-full bg-surface px-2.5 py-1 font-mono text-metadata-sm font-semibold text-primary hover:underline"
                >
                  {b.publicCode}
                </Link>
              ))}
              {hiddenBatches > 0 && (
                <span className="rounded-full bg-surface px-2.5 py-1 text-metadata-sm text-on-surface-variant">
                  +{hiddenBatches.toLocaleString("en-US")} more
                </span>
              )}
            </div>
          </div>
          <div className="rounded-xl bg-surface-container/60 p-4">
            <p className="text-label-caps uppercase tracking-widest text-on-surface-variant">
              Common factors
            </p>
            <ul className="mt-2 space-y-1.5">
              {cluster.commonFactors.map((f) => (
                <li key={f.dimension} className="flex items-start justify-between gap-3 text-body-md">
                  <span>
                    <span className="font-semibold capitalize text-on-surface">{f.dimension}:</span>{" "}
                    <span className="text-on-surface-variant">{f.value}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-tertiary-container/50 px-2 py-0.5 text-metadata-sm font-semibold text-tertiary">
                    {Math.round(f.coverage * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-xl bg-surface-container/60 p-4">
          <p className="text-label-caps uppercase tracking-widest text-on-surface-variant">
            Timeline · {formatWindow(cluster.timeline.start, cluster.timeline.end)}
          </p>
          <div className="relative mt-3 space-y-2.5 before:absolute before:bottom-1 before:left-[7px] before:top-1.5 before:w-px before:bg-outline-variant/50">
            {cluster.timeline.entries.map((e) => (
              <div key={`${e.at}-${e.label}`} className="relative flex items-center gap-3 pl-6">
                <span className="absolute left-0 top-1/2 h-[15px] w-[15px] -translate-y-1/2 rounded-full border-2 border-primary bg-primary/20" />
                <span className="shrink-0 font-mono text-metadata-sm tabular-nums text-on-surface-variant">
                  {formatClock(e.at)}
                </span>
                <span className="text-body-md text-on-surface">{e.label}</span>
              </div>
            ))}
          </div>
          {cluster.timeline.truncated && (
            <p className="mt-2 pl-6 text-metadata-sm text-on-surface-variant">
              +{(cluster.alertCount - cluster.timeline.entries.length).toLocaleString("en-US")}{" "}
              further alerts in this window — aggregated, not listed.
            </p>
          )}
        </div>

        {/* Probable root context */}
        <div className="rounded-xl border border-primary/25 bg-primary-container/15 p-4">
          <p className="flex items-center gap-1.5 text-label-caps uppercase tracking-widest text-primary">
            <Icon name="psychology" className="text-[16px]" /> Probable root context
          </p>
          <p className="mt-1.5 text-body-md leading-relaxed text-on-surface">
            {cluster.probableRootContext}
          </p>
        </div>

        {/* Contributing evidence behind the risk score */}
        <div className="rounded-xl bg-surface-container/60 p-4">
          <p className="text-label-caps uppercase tracking-widest text-on-surface-variant">
            Why this risk score — contributing evidence
          </p>
          <div className="mt-2 space-y-3">
            {cluster.risk.contributions.map((c) => (
              <div key={c.signalLabel} className="rounded-lg bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-body-md font-semibold text-on-surface">
                    {c.kind === "volume" ? "Alert volume" : ANOMALY_SIGNALS[c.signalId!].label}
                  </span>
                  <span className="font-mono text-metadata-sm font-bold text-primary">
                    +{c.points}
                  </span>
                </div>
                {c.evidence.length > 0 && (
                  <dl className="mt-1.5 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                    {c.evidence.map((e, i) => (
                      <div key={i} className="flex gap-1.5 text-metadata-sm">
                        <dt className="shrink-0 font-semibold text-on-surface-variant">{e.label}:</dt>
                        <dd className="text-on-surface">
                          {e.value}
                          {e.detail && <span className="text-on-surface-variant"> — {e.detail}</span>}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-metadata-sm text-on-surface-variant">
            Total {cluster.risk.points}/100 · {cluster.risk.band} risk
          </p>
        </div>

        {/* Investigation notes */}
        {caseData && (caseData.notes.length > 0 || caseData.outcome) && (
          <div className="rounded-xl bg-surface-container/60 p-4">
            <p className="text-label-caps uppercase tracking-widest text-on-surface-variant">
              Investigation log
            </p>
            {caseData.outcome && (
              <p className="mt-2 rounded-lg bg-tertiary-container/40 p-3 text-body-md text-on-surface">
                <span className="font-semibold">Outcome: </span>
                {caseData.outcome}
              </p>
            )}
            <ul className="mt-2 space-y-2">
              {caseData.notes.map((n) => (
                <li key={n.id} className="flex gap-2.5 text-body-md">
                  <Icon
                    name={n.kind === "CONFIRMATION" ? "verified_user" : n.kind === "STATUS" ? "sync" : "edit_note"}
                    className="mt-0.5 shrink-0 text-[18px] text-secondary"
                  />
                  <div>
                    <p className="text-on-surface">{n.text}</p>
                    <p className="text-metadata-sm text-on-surface-variant">
                      {n.author} · {new Date(n.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ActionBar clusterId={cluster.id} status={status} data={data} />
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function RiskCenterPage() {
  const data = useDemoData();

  const clusters = useMemo(() => clusterAlerts(buildDemoFeed()), []);
  const caseById = useMemo(
    () => new Map(data.clusterCases.map((c) => [c.clusterId, c])),
    [data.clusterCases],
  );

  const openCases = data.clusterCases.filter(
    (c) => c.status === "OPEN" || c.status === "UNDER_REVIEW",
  );
  const totalAlerts = clusters.reduce((sum, c) => sum + c.alertCount, 0);
  const highRisk = clusters.filter((c) => c.risk.band === "HIGH").length;
  const underReview = data.clusterCases.filter((c) => c.status === "UNDER_REVIEW").length;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">
          Risk / Incident Center
        </h1>
        <p className="mt-1 max-w-3xl text-body-lg text-on-surface-variant">
          Individual anomaly signals are grouped into incident clusters — one
          shared cause, one investigation. Every risk score below shows the
          evidence behind it.
        </p>
      </div>

      {/* Meaning of a risk score — always visible, never buried. */}
      <div className="mb-6 rounded-xl border border-primary/30 bg-primary-container/15 p-4 sm:p-5">
        <p className="flex items-start gap-2 text-body-md font-semibold text-on-surface">
          <Icon name="info" className="mt-0.5 shrink-0 text-[20px] text-primary" />
          {RISK_MEANING}
        </p>
        <p className="mt-1.5 pl-7 text-metadata-sm text-on-surface-variant">{NO_ML_NOTICE}</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {[
          { label: "Open incident clusters", value: String(openCases.length), tone: "text-error" },
          { label: "Alerts grouped into clusters", value: totalAlerts.toLocaleString("en-US"), tone: "text-on-surface" },
          { label: "High-risk clusters", value: String(highRisk), tone: "text-error" },
          { label: "Under review", value: String(underReview), tone: "text-on-surface" },
        ].map((s) => (
          <div key={s.label} className="metric-card min-w-[160px] flex-1 p-5">
            <p className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">
              {s.label}
            </p>
            <p className={`mt-1 font-headline-md text-headline-md ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-headline-md tracking-tight text-on-surface">Incident clusters</h2>
        <span className="text-metadata-sm text-on-surface-variant">
          Deterministic grouping · same input, same clusters, every run
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {clusters.map((cluster) => (
          <ClusterCard
            key={cluster.id}
            cluster={cluster}
            caseData={caseById.get(cluster.id)}
            data={data}
          />
        ))}
      </div>

      {/* Signal taxonomy */}
      <div className="mt-8">
        <h2 className="mb-3 text-headline-md tracking-tight text-on-surface">
          Anomaly signals monitored
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SIGNAL_IDS.map((id) => {
            const signal = ANOMALY_SIGNALS[id];
            const count = clusters
              .filter((c) => c.signal === id)
              .reduce((sum, c) => sum + c.alertCount, 0);
            return (
              <div key={id} className="glass-card rounded-xl p-4">
                <p className="flex items-center justify-between text-body-md font-semibold text-on-surface">
                  {signal.label}
                  <span className="rounded-full bg-surface-container px-2 py-0.5 font-mono text-metadata-sm text-on-surface-variant">
                    {count.toLocaleString("en-US")}
                  </span>
                </p>
                <p className="mt-1 text-metadata-sm leading-relaxed text-on-surface-variant">
                  {signal.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
