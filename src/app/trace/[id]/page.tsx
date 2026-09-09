"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { Pill } from "@/components/ui";
import { TraceMilestones, TraceTimeline } from "@/components/demo/timeline";
import { demoQualityPill, demoRiskPill, formatQty, relativeTime, ROLE_ICON } from "@/components/demo/format";
import { DemoBadge } from "@/components/demo/demo-badge";
import { useDemoData, useDemoSession } from "@/lib/demo/hooks";
import { ROLE_LABEL } from "@/lib/demo/config";
import type { DemoRole } from "@/lib/demo/types";
import { BatchQrDownloader } from "@/components/batch-qr-downloader";

/**
 * Shared batch trace page. Any demo role can open the same batch and watch the
 * full, evolving journey — the single identity (HC-2026-00124) stays constant
 * while its state changes role by role.
 */
export default function TracePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const data = useDemoData();
  const me = useDemoSession().user;

  const open = params ? decodeURIComponent(params.id) : "";
  const batch = data.batches.find((b) => b.id === open || b.publicCode === open);
  const incidents = data.incidents.filter((i) => i.batchId === open);
  const myRole = me?.role;

  if (!batch) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl py-24 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container text-on-surface-variant">
            <Icon name="search_off" className="text-[30px]" />
          </span>
          <h1 className="mt-4 font-headline-md text-headline-md text-on-surface">Batch not found</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            The batch `{open}` does not exist in the demo dataset.
          </p>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-5 inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-body-md font-medium text-on-primary"
          >
            <Icon name="arrow_back" className="text-[18px]" />
            Go back
          </button>
        </div>
      </AppShell>
    );
  }

  const q = demoQualityPill(batch.quality);
  const r = demoRiskPill(batch.risk);
  const topIncident = batch.anomaly !== "NONE";

  return (
    <AppShell>
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1 text-metadata-sm font-medium text-on-surface-variant hover:text-on-surface"
      >
        <Icon name="arrow_back" className="text-[18px]" />
        Back
      </button>

      <div className="mb-6 inline-flex w-full items-center justify-end">
        <Link
          href={`/verify/${encodeURIComponent(batch.publicCode)}`}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-body-md font-semibold text-on-primary transition-all hover:bg-primary/90 active:scale-95"
        >
          <Icon name="qr_code_2" className="text-[20px]" />
          Verify as consumer
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-headline-lg font-bold tracking-tight text-primary">
              {batch.publicCode}
            </span>
            {myRole ? <DemoBadge compact /> : null}
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-on-surface">{batch.honeyType}</h1>
          <p className="text-body-md text-on-surface-variant">
            {batch.originRegion} · {formatQty(batch.quantityKg)} · {batch.floralSource}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone={q.tone}>{q.label}</Pill>
          <Pill tone={r.tone} dot={r.dot}>
            {r.label}
          </Pill>
        </div>
      </div>

      {topIncident ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-error/20 bg-error-container/10 p-4">
          <span className="mt-0.5 rounded-md bg-error/10 p-1.5 text-error">
            <Icon name="warning" className="text-[20px]" />
          </span>
          <div>
            <p className="text-body-md font-semibold text-on-surface">
              Risk flag — GPS mismatch
            </p>
            <p className="text-metadata-sm text-on-surface-variant">
              This batch triggered the deterministic anomaly scenario. See the Risk flags section.
            </p>
          </div>
        </div>
      ) : null}

      <div className="glass-card rounded-xl p-6 mb-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md tracking-tight text-on-surface">
            Traceability
          </h2>
          <Pill tone="surface">{batch.currentStage.replace(/_/g, " ")}</Pill>
        </div>
        <div className="mb-6">
          <TraceTimeline batch={batch} />
        </div>
        <TraceMilestones batch={batch} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-xl p-6">
            <h2 className="mb-4 flex items-center gap-2 font-headline-md text-headline-md tracking-tight text-on-surface">
              <Icon name="timeline" className="text-[22px] text-secondary" />
              Live audit trail
            </h2>
            <ol className="space-y-1">
              {batch.events.length === 0 ? (
                <p className="text-body-md text-on-surface-variant">No events recorded yet.</p>
              ) : (
                [...batch.events].reverse().map((ev, i) => (
                  <li key={`${ev.timestamp}-${i}`} className="flex gap-3 rounded-lg px-3 py-3 hover:bg-surface-container/60">
                    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant">
                      <Icon name={ROLE_ICON[ev.role] ?? "inventory_2"} className="text-[16px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <p className="text-body-md font-semibold text-on-surface">
                          {ev.type.replace(/_/g, " ")}
                        </p>
                        <span className="text-metadata-sm text-on-surface-variant">{relativeTime(ev.timestamp)}</span>
                      </div>
                      <p className="text-metadata-sm text-on-surface-variant">{ev.note}</p>
                      <p className="mt-0.5 text-metadata-sm text-on-surface-variant/70">
                        by {ev.actorName} · {ROLE_LABEL[ev.role as DemoRole] ?? ev.role}
                      </p>
                    </div>
                  </li>
                ))
              )}
            </ol>
          </div>

          {batch.qualityResults.length > 0 ? (
            <div className="glass-card rounded-xl p-6">
              <h2 className="mb-4 flex items-center gap-2 font-headline-md text-headline-md tracking-tight text-on-surface">
                <Icon name="science" className="text-[22px] text-secondary" />
                Lab results
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-body-md">
                  <thead>
                    <tr className="border-b border-outline-variant/20 text-metadata-xs uppercase tracking-widest text-on-surface-variant">
                      <th className="py-2 pr-4 font-semibold">Test</th>
                      <th className="py-2 pr-4 font-semibold">Result</th>
                      <th className="py-2 pr-4 font-semibold">Status</th>
                      <th className="py-2 font-semibold">Lab</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batch.qualityResults.map((qr, i) => (
                      <tr key={i} className="border-b border-outline-variant/10 last:border-0">
                        <td className="py-3 pr-4 font-medium text-on-surface">{qr.testType}</td>
                        <td className="py-3 pr-4 tabular-nums text-on-surface-variant">
                          {qr.result} {qr.unit}
                        </td>
                        <td className="py-3 pr-4">
                          <Pill tone={qr.passed ? "tertiary" : "error"}>
                            {qr.passed ? "Passed" : "Failed"}
                          </Pill>
                        </td>
                        <td className="py-3 text-on-surface-variant">{qr.lab}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-xl p-6">
            <h2 className="mb-3 font-headline-md text-headline-md tracking-tight text-on-surface">
              Batch details
            </h2>
            <dl className="space-y-2.5 text-body-md">
              {[
                ["Honey type", batch.honeyType],
                ["Floral source", batch.floralSource],
                ["Origin", batch.originRegion],
                ["Quantity", formatQty(batch.quantityKg)],
                ["Current stage", batch.currentStage.replace(/_/g, " ")],
                ["Quality", q.label],
                ["Risk", r.label],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <dt className="text-on-surface-variant">{k}</dt>
                  <dd className="text-right font-medium text-on-surface">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <BatchQrDownloader
            batchNumber={batch.publicCode}
            title="Batch QR Code & Verification Label"
            showGenerateButton={false}
          />

          <div className="glass-card rounded-xl p-6">
            <h2 className="mb-3 flex items-center gap-2 font-headline-md text-headline-md tracking-tight text-on-surface">
              <Icon name="shield" className="text-[22px] text-secondary" />
              Risk flags
            </h2>
            {incidents.length === 0 && !topIncident ? (
              <p className="text-body-md text-on-surface-variant">No open incidents for this batch.</p>
            ) : (
              <ul className="space-y-3">
                {incidents.map((inc) => (
                  <li key={inc.id} className="rounded-lg border border-error/20 bg-error-container/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-body-md font-semibold text-on-surface">{inc.title}</span>
                      <Pill tone="error">{inc.severity}</Pill>
                    </div>
                    <p className="mt-1 text-metadata-sm text-on-surface-variant">{inc.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
