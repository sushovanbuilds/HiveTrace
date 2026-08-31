"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { Button, Pill, Card } from "@/components/ui";
import { BatchCard } from "@/components/demo/batch-card";
import { DemoSection, DemoStat, DemoGreeting, DemoEmpty } from "@/components/demo/demo-ui";
import { useDemoWorkspace } from "@/lib/demo/hooks";
import { addQualityResult, confirmAnomaly } from "@/lib/demo/data";
import { formatQty, relativeTime } from "@/components/demo/format";

const TEST_CHOICES = [
  { type: "Moisture", unit: "%" },
  { type: "HMF", unit: "mg/kg" },
  { type: "Diastase", unit: "DN" },
  { type: "Proline", unit: "mg/kg" },
];

export default function AnalystPage() {
  const { user, data, ready, mutate } = useDemoWorkspace("ANALYST");
  const [sel, setSel] = useState<string>("HC-2026-00124");
  const [testIdx, setTestIdx] = useState(0);
  const [result, setResult] = useState("18.2");
  const [pass, setPass] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);

  if (!ready || !user || !data) {
    return (
      <AppShell>
        <div className="py-24 text-center text-on-surface-variant">Loading…</div>
      </AppShell>
    );
  }

  const batches = data.batches.filter((b) => b.anomaly === "NONE");
  const flagged = data.batches.filter((b) => b.anomaly !== "NONE");
  const awaiting = batches.filter((b) => b.quality === "PENDING");
  const passed = batches.filter((b) => b.quality === "PASSED").length;
  const failed = batches.filter((b) => b.quality === "FAILED").length;
  const selected = batches.find((b) => b.id === sel) ?? batches[0];

  const runTest = () => {
    if (!selected) return;
    const t = TEST_CHOICES[testIdx];
    mutate(
      addQualityResult(
        data,
        selected.id,
        {
          testType: t.type,
          result: Number(result) || 0,
          unit: t.unit,
        },
        { email: user.email, name: user.name, lab: user.organization },
        pass,
      ),
    );
    setFlash(
      pass
        ? `${selected.publicCode} — ${t.type} passed and released to processing.`
        : `${selected.publicCode} — ${t.type} failed; flagged for review.`,
    );
  };

  const detect = () => {
    if (flagged.length === 0) return;
    mutate(confirmAnomaly(data, flagged[0].id));
    setFlash(`Anomaly confirmed for ${flagged[0].publicCode} — incident raised in the Risk Center.`);
  };

  const first = user.name.split(/\s+/)[0];

  return (
    <AppShell>
      <DemoGreeting
        eyebrow="Analyst · National Bee Board Lab"
        first={first}
        sub="Release batches on lab evidence and keep an eye on anomalies across the network."
      />

      {flash ? (
        <div role="status" className="mb-6 flex items-center gap-2 rounded-xl border border-tertiary-container/30 bg-tertiary-container/20 px-4 py-3 text-body-md text-on-tertiary-container">
          <Icon name="check_circle" fill className="text-[20px]" />
          {flash}
        </div>
      ) : null}

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DemoStat label="In queue" value={awaiting.length} sub="awaiting test" icon="science" tone="surface" />
        <DemoStat label="Passed" value={passed} sub="released to processing" icon="verified" tone="tertiary" />
        <DemoStat label="Failed" value={failed} sub="flagged" icon="error" tone="error" alert={failed > 0} />
        <DemoStat label="Open anomalies" value={flagged.length} sub="risk center" icon="warning" tone="error" alert={flagged.length > 0} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DemoSection
          id="quality"
          title="Add quality result"
          subtitle="Publish a lab test against a shared batch — it releases the batch onward."
          icon="science"
        >
          <Card className="space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-metadata-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                Batch
              </span>
              <select
                value={selected?.id ?? ""}
                onChange={(e) => setSel(e.target.value)}
                className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface outline-none focus:border-primary"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.publicCode} · {b.honeyType} · {formatQty(b.quantityKg)}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span className="mb-1.5 block text-metadata-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                Test
              </span>
              <div className="flex flex-wrap gap-2">
                {TEST_CHOICES.map((t, i) => (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => { setTestIdx(i); setResult(i === 0 ? "18.2" : i === 1 ? "4.1" : i === 2 ? "9.5" : "312"); }}
                    className={`rounded-full px-3 py-1.5 text-body-md font-medium transition-colors ${
                      testIdx === i
                        ? "bg-primary-container text-on-primary-container"
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-highest"
                    }`}
                  >
                    {t.type}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-metadata-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                Result ({TEST_CHOICES[testIdx].unit})
              </span>
              <input
                value={result}
                onChange={(e) => setResult(e.target.value)}
                inputMode="decimal"
                className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-body-md tabular-nums text-on-surface outline-none focus:border-primary"
              />
            </label>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPass(true)}
                  className={`rounded-full px-3 py-1.5 text-body-md font-medium transition-colors ${pass ? "bg-tertiary text-on-tertiary" : "bg-surface-container text-on-surface-variant"}`}
                >
                  Pass
                </button>
                <button
                  type="button"
                  onClick={() => setPass(false)}
                  className={`rounded-full px-3 py-1.5 text-body-md font-medium transition-colors ${!pass ? "bg-error text-on-error" : "bg-surface-container text-on-surface-variant"}`}
                >
                  Fail
                </button>
              </div>
              <Button onClick={runTest} icon="science" disabled={!selected}>
                Publish result
              </Button>
            </div>
          </Card>
        </DemoSection>

        <DemoSection
          id="anomalies"
          title="Anomalies"
          subtitle="Deterministic risk scenario — GPS mismatch on HC-2026-00281."
          icon="warning"
        >
          {flagged.length === 0 ? (
            <DemoEmpty title="No anomalies" body="No risk events detected in the demo dataset." icon="task_alt" />
          ) : (
            <Card className="space-y-4">
              {flagged.map((b) => {
                const inc = data.incidents.find((i) => i.batchId === b.id);
                return (
                  <div key={b.id} className="rounded-xl border border-error/20 bg-error-container/10 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-body-md font-bold text-error">{b.publicCode}</span>
                        <Pill tone="error" icon="warning">GPS mismatch</Pill>
                      </div>
                      <Pill tone="error">{b.risk}</Pill>
                    </div>
                    <p className="mt-2 text-metadata-sm text-on-surface-variant">
                      Harvest recorded with a GPS trail that drifts beyond the allowed radius from the declared apiary.
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-metadata-sm text-on-surface-variant">
                        {inc ? `${inc.status} · ${relativeTime(inc.createdAt)}` : "Not yet raised"}
                      </span>
                      <Button size="sm" onClick={detect} icon="radar" variant={inc ? "outline" : "danger"}>
                        {inc ? "Re-confirm" : "Detect & raise incident"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </DemoSection>
      </div>

      <DemoSection
        id="evidence"
        title="Lab evidence submitted"
        subtitle="Results already published against shared batches."
        icon="description"
      >
        {data.batches.flatMap((b) => b.qualityResults).length === 0 ? (
          <DemoEmpty title="No lab evidence yet" body="Publish your first quality result to build the evidence trail." icon="science" />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {data.batches.flatMap((b) =>
              b.qualityResults.map((qr, i) => (
                <div key={`${b.id}-${i}`} className="glass-card flex items-center justify-between rounded-xl p-4">
                  <div>
                    <p className="font-mono text-body-md font-semibold text-on-surface">{b.publicCode}</p>
                    <p className="text-metadata-sm text-on-surface-variant">
                      {qr.testType} · {qr.result} {qr.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <Pill tone={qr.passed ? "tertiary" : "error"}>{qr.passed ? "Passed" : "Failed"}</Pill>
                    <p className="mt-1 text-metadata-sm text-on-surface-variant">{relativeTime(qr.timestamp)}</p>
                  </div>
                </div>
              )),
            )}
          </div>
        )}
      </DemoSection>

      <div className="mt-8">
        <DemoSection
          title="Batches to qualify"
          subtitle="The same shared records processors will receive downstream."
          icon="inventory_2"
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {batches.map((b) => (
              <BatchCard key={b.id} batch={b} detailHref={`/trace/${encodeURIComponent(b.id)}`} actorEmails={[]} />
            ))}
          </div>
        </DemoSection>
      </div>
    </AppShell>
  );
}
