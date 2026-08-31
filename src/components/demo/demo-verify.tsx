"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { HoneyJar, VerifiedRibbon } from "@/components/honey-visuals";
import { Pill } from "@/components/ui";
import { useDemoData } from "@/lib/demo/hooks";
import { demoQualityPill, demoRiskPill, formatQty } from "@/components/demo/format";
import { consumerVerdict, journeyFor, ROLE_ICON_MAP, roleLabel } from "@/lib/demo/verify";

const KEEPER_BY_ORIGIN: Record<string, string> = {
  "Purulia, West Bengal": "Ravi Kumar · Green Valley Apiaries",
  "Nashik, Maharashtra": "Ravi Kumar · Green Valley Apiaries",
};

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Consumer-facing verification for a deterministic demo batch. Reads the shared
 * demo dataset (live localStorage state) so the shown journey reflects whichever
 * roles have already acted on the batch. Never touches the database — used by the
 * /verify/[code] route only when the requested code is a known demo batch.
 */
export function DemoVerifyView({ code }: { code: string }) {
  const open = code.toUpperCase();
  const data = useDemoData();

  const batch = data.batches.find((b) => b.publicCode === open);

  if (!batch) {
    return (
      <div className="min-h-dvh bg-background font-sans text-on-surface">
        <nav className="mx-auto flex max-w-[1200px] items-center justify-between border-b border-outline-variant/30 px-[20px] py-4 md:px-[64px]">
          <div className="flex items-center gap-2">
            <Icon name="verified" fill className="text-[24px] text-tertiary" />
            <span className="text-headline-md font-bold text-on-surface">Verification Flow</span>
          </div>
          <Link
            href="/verify"
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant"
          >
            <Icon name="close" />
          </Link>
        </nav>
        <main className="mx-auto w-full max-w-[1200px] px-[20px] pt-24 md:px-[64px]">
          <div className="text-center">
            <VerifiedRibbon
              tone="bad"
              message="Batch not recognised"
              detail="No demo batch was found for this code. Please check the label and try again."
            />
          </div>
        </main>
      </div>
    );
  }

  const q = demoQualityPill(batch.quality);
  const r = demoRiskPill(batch.risk);
  const delivered = batch.currentStage === "DELIVERED";
  const allPassed = batch.quality === "PASSED";

  const verdict = consumerVerdict(batch);
  const checks = verdict.checks;
  const checksDone = checks.filter((c) => c.done).length;
  const checkTone = verdict.complete ? "ok" : checksDone === 0 ? "warn" : "info";

  const keeper = KEEPER_BY_ORIGIN[batch.originRegion] ?? "Green Valley Apiaries";
  const journey = journeyFor(batch);

  return (
    <div className="min-h-dvh bg-background font-sans text-on-surface">
      {/* Top nav */}
      <nav className="mx-auto flex max-w-[1200px] items-center justify-between border-b border-outline-variant/30 px-[20px] py-4 md:px-[64px]">
        <div className="flex items-center gap-2">
          <Icon name="verified" fill className="text-[24px] text-tertiary" />
          <span className="text-headline-md font-bold text-on-surface">Verification Flow</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="mr-2 hidden font-label-caps tracking-widest text-on-surface-variant sm:inline">
            HIVETRACE
          </span>
          <Link
            href="/verify"
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant"
          >
            <Icon name="close" />
          </Link>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-[1200px] px-[20px] pt-6 md:px-[64px]">
        {/* Hero: verification + product */}
        <section className="mb-12 flex flex-col items-center">
          <VerifiedRibbon
            tone={checkTone}
            message={
              batch.risk === "HIGH" && batch.anomaly !== "NONE"
                ? "Batch flagged — review required"
                : delivered && allPassed
                  ? "Honey Verified"
                  : "Batch record found"
            }
            detail={
              batch.risk === "HIGH" && batch.anomaly !== "NONE"
                ? "A GPS location anomaly was detected on this batch. It is flagged for analyst review and should not be released."
                : delivered && allPassed
                  ? "This batch completed its full journey and every step is traceable."
                  : `${checksDone} of ${checks.length} verification steps completed. The rest are pending in the supply chain.`
            }
          />

          <div className="mt-6 flex flex-col items-center gap-6 md:flex-row md:items-start">
            <div className="w-full max-w-[280px]">
              <HoneyJar code={open} honeyType={batch.honeyType} className="aspect-[4/5] w-full" />
              <p className="mt-3 text-center text-headline-lg-mobile font-semibold tracking-tight text-on-surface">
                {batch.honeyType}
              </p>
            </div>

            <div className="w-full max-w-sm">
              <div className="glass-panel flex flex-col gap-1 rounded-xl p-6">
                <div className="flex items-center justify-between border-b border-surface-container-high pb-2">
                  <span className="text-metadata-sm uppercase tracking-wider text-secondary">Batch ID</span>
                  <span className="hash-mono text-label-caps text-on-surface">#{open}</span>
                </div>
                <div className="flex items-center justify-between border-b border-surface-container-high py-2">
                  <span className="text-metadata-sm uppercase tracking-wider text-secondary">Origin</span>
                  <span className="text-body-md text-on-surface">{batch.originRegion}</span>
                </div>
                <div className="flex items-center justify-between border-b border-surface-container-high py-2">
                  <span className="text-metadata-sm uppercase tracking-wider text-secondary">Keeper</span>
                  <span className="text-body-md text-on-surface">{keeper}</span>
                </div>
                <div className="flex items-center justify-between border-b border-surface-container-high py-2">
                  <span className="text-metadata-sm uppercase tracking-wider text-secondary">Product</span>
                  <span className="text-body-md text-on-surface">{batch.floralSource}</span>
                </div>
                <div className="flex items-center justify-between py-2 pt-3">
                  <span className="text-metadata-sm uppercase tracking-wider text-secondary">Harvested</span>
                  <span className="text-body-md text-on-surface">
                    {fmtDateTime(batch.createdAt)}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="glass-panel rounded-xl p-4">
                  <p className="text-metadata-sm uppercase tracking-wider text-on-surface-variant">Current Stage</p>
                  <p className="mt-1 text-body-md font-semibold text-on-surface">
                    {batch.currentStage.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="glass-panel rounded-xl p-4">
                  <p className="text-metadata-sm uppercase tracking-wider text-on-surface-variant">Quantity</p>
                  <p className="mt-1 text-body-md font-semibold text-on-surface">{formatQty(batch.quantityKg)}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Pill tone={q.tone}>{q.label}</Pill>
                <Pill tone={r.tone} dot={r.dot}>
                  {r.label}
                </Pill>
              </div>
            </div>
          </div>
        </section>

        {/* Verification checklist */}
        <section className="mx-auto mb-12 w-full max-w-2xl">
          <h2 className="mb-4 border-l-4 border-primary-container px-4 font-headline-md text-headline-md text-on-surface">
            Verification result
          </h2>
          <div className="glass-panel rounded-xl p-6">
            <ul className="space-y-3">
              {checks.map((c) => (
                <li key={c.label} className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      c.done ? "bg-tertiary text-on-tertiary" : "bg-surface-container text-on-surface-variant"
                    }`}
                  >
                    {c.done ? <Icon name="check" fill className="text-[16px]" /> : <Icon name="schedule" className="text-[16px]" />}
                  </span>
                  <span className={`text-body-md ${c.done ? "font-semibold text-on-surface" : "text-on-surface-variant"}`}>
                    {c.label}
                  </span>
                  {!c.done ? <span className="ml-auto text-metadata-sm text-on-surface-variant">Pending</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Provenance journey */}
        {journey.length > 0 && (
          <section className="mx-auto mb-12 w-full max-w-2xl">
            <h2 className="mb-4 border-l-4 border-primary-container px-4 font-headline-md text-headline-md text-on-surface">
              Provenance Journey
            </h2>
            <div className="relative py-4 pl-6">
              <div className="timeline-line absolute bottom-8 left-[11px] top-8" />
              <div className="flex flex-col gap-4">
                {journey.map((m, idx) => (
                  <div key={`${m.title}-${idx}`} className="relative flex items-start gap-4">
                    <div className="absolute -left-[18px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-tertiary-container shadow-sm">
                      <span className="h-2 w-2 rounded-full bg-tertiary" />
                    </div>
                    <div className="glass-panel flex-1 rounded-lg p-4">
                      <div className="mb-1 flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-body-lg text-on-surface">{m.title}</h3>
                          <p className="text-metadata-sm text-on-surface-variant">{m.sub}</p>
                        </div>
                        <Icon name={ROLE_ICON_MAP[m.role] ?? "verified"} fill className="text-[18px] text-tertiary" />
                      </div>
                      <p className="mt-1 text-metadata-sm text-on-surface-variant">{m.note}</p>
                      <p className="mt-1 text-metadata-sm text-on-surface-variant/70">
                        {fmtDateTime(m.timestamp)} · {m.actor} · {roleLabel(m.role)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Integrity note */}
        <section className="mx-auto mb-12 w-full max-w-2xl">
          <div className="glass-panel rounded-xl border border-outline-variant/20 bg-surface-container-lowest/50 p-6">
            <div className="mb-3 flex items-center gap-2">
              <Icon name="link" className="text-[22px] text-primary" />
              <h3 className="font-label-caps tracking-widest text-secondary">Traceability Available</h3>
            </div>
            <p className="text-metadata-sm leading-relaxed text-on-surface-variant">
              {delivered && allPassed
                ? "Complete traceability is available for this batch — origin, quality, processing and distribution are all recorded in the shared demo dataset."
                : "Partial traceability — record the remaining supply-chain steps to unlock full verification."}
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1 text-label-caps text-on-surface-variant">
              <Icon name="info" className="text-[14px]" />
              Demo ledger
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
