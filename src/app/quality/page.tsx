import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { ChartCard, RingGauge } from "@/components/charts";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function loadTests() {
  try {
    const [tests, batchCounts] = await Promise.all([
      db.qualityTest.findMany({
        orderBy: { testedAt: "desc" },
        take: 20,
        include: {
          batch: {
            select: { id: true, publicCode: true, honeyType: true, originRegion: true, qualityStatus: true },
          },
        },
      }),
      db.batch.groupBy({ by: ["qualityStatus"], _count: { _all: true } }),
    ]);
    return { tests, batchCounts };
  } catch {
    return null;
  }
}

const METRICS = [
  { icon: "science", label: "Tests Today", value: "48", tone: "primary", sub: "from 6 labs" },
  { icon: "check_circle", label: "Passed", value: "44", tone: "tertiary", sub: "91.7% pass rate" },
  { icon: "hourglass_top", label: "In Queue", value: "7", tone: "surface", sub: "awaiting review" },
  { icon: "report", label: "Flagged", value: "2", tone: "error", sub: "needs retest" },
];

export default async function QualityLabPage() {
  const data = await loadTests();
  const passRate = 91.7;

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-headline-lg tracking-tight text-on-surface">Quality Lab</h1>
        <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">
          Central laboratory queue — every purity panel is recorded and cryptographically anchored
          before a batch can move downstream.
        </p>
      </div>

      {/* Metrics */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {METRICS.map((m) => (
          <div key={m.label} className={`metric-card rounded-xl p-5 transition-shadow hover:shadow-md ${m.tone === "error" ? "border-error/20 bg-error-container/10" : ""}`}>
            <div className="flex items-start justify-between">
              <p className="text-metadata-sm uppercase tracking-wider text-on-surface-variant">{m.label}</p>
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${
                m.tone === "tertiary" ? "bg-tertiary-container/50 text-tertiary" : m.tone === "error" ? "bg-error-container text-on-error-container" : "bg-surface-container text-on-surface-variant"
              }`}>
                <Icon name={m.icon} />
              </span>
            </div>
            <p className="mt-3 text-headline-lg tabular-nums tracking-tight text-on-surface">{m.value}</p>
            <p className={`mt-1 text-metadata-sm ${m.tone === "error" ? "text-error" : "text-tertiary"}`}>{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard className="lg:col-span-2" title="Test Results" icon="science">
          <div className="overflow-x-auto no-scrollbar rounded-xl border border-outline-variant/20">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container-low text-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Parameter</th>
                  <th className="px-4 py-3 text-right">Result</th>
                  <th className="px-4 py-3 text-right">Limit</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15 text-metadata-sm">
                {data?.tests.length ? (
                  data.tests.map((t) => {
                    return (
                      <tr key={t.id} className="bg-surface-container-lowest/60 transition-colors hover:bg-surface-container/60">
                        <td className="px-4 py-3">
                          <p className="font-medium tracking-wide text-on-surface">{t.batch.publicCode}</p>
                          <p className="text-on-surface-variant">{t.batch.originRegion}</p>
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant">
                          {t.testType.replace(/_/g, " ")}
                          {t.labName ? <span className="ml-1 text-[11px]">· {t.labName}</span> : null}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-on-surface">
                          {t.result} {t.unit}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-on-surface-variant">—</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            t.passed ? "bg-tertiary/10 text-tertiary" : "bg-error-container/60 text-on-error-container"
                          }`}>
                            {t.passed ? "PASS" : "FAIL"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-on-surface-variant">
                      No results yet — run the seed to populate the queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="Pass Rate" icon="verified">
          <div className="flex h-full flex-col items-center justify-center">
            <RingGauge value={passRate / 100} label={`${passRate}%`} sub="Overall pass rate" tone="#3b6934" />
            <div className="mt-8 w-full space-y-3">
              {[
                { label: "Moisture ≤ 20%", v: 96 },
                { label: "C4 Sugars ≤ 7%", v: 94 },
                { label: "HMF ≤ 40 mg/kg", v: 97 },
                { label: "Pollen DNA Auth", v: 92 },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between text-metadata-sm">
                  <span className="text-on-surface-variant">{r.label}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-variant">
                      <div className="h-full bg-tertiary" style={{ width: `${r.v}%` }} />
                    </div>
                    <span className="w-9 text-right tabular-nums text-on-surface">{r.v}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>
    </AppShell>
  );
}