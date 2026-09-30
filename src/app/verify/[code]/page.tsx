import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { Decode } from "@/components/threeui/Decode";
import { isDemoBatchCode } from "@/lib/demo/config";
import { DEMO_DATA_SERVER_SNAPSHOT, getBatchByCode } from "@/lib/demo/seed";
import {
  verifyBatch,
  LABEL_COPY,
  type LabelStatus,
  type VerifyOutcome,
} from "@/lib/services/verify";
import { STAGE_ORDER, type BatchStage } from "@/lib/types";

/**
 * Consumer verification certificate — /verify/[code].
 *
 * This is the public, mobile-first certificate a shopper sees after scanning a
 * jar. It deliberately surfaces only consumer-safe facts: the batch's identity,
 * its journey, the lab summary, and record-integrity status. Operational data
 * (risk scores, incident IDs, internal alerts, investigator notes, fraud
 * probabilities, private records) never reaches this view.
 *
 * The [code] param name is kept (not renamed to [batchId]) because printed QR
 * labels in the wild encode /verify/:code — renaming would break them.
 */

/** Demo presentation data specified for the certificate. The batch's real
 * attributes (honey type, origin, harvest date) come from the demo dataset;
 * these identifiers are the user-specified demo anchors for this view. */
const DEMO_CERT_META: Record<string, { hiveId: string; labReportId: string }> = {
  "HC-2026-00124": { hiveId: "HIVE-A014", labReportId: "LAB-2026-441" },
};

type StepState = "done" | "current" | "todo";

interface JourneyStep {
  key: string;
  label: string;
  state: StepState;
  note?: string;
}

interface LabTest {
  type: string;
  passed: boolean;
}

interface Certificate {
  code: string;
  demo: boolean;
  status: "verified" | "found" | "warning" | "unverified" | "notfound" | "unavailable";
  headline: string;
  detail: string;
  honeyType: string;
  origin: string;
  harvestDate: string | null;
  hiveId: string | null;
  labReportId: string | null;
  labStatus: string;
  labTests: LabTest[];
  journey: JourneyStep[];
  integrity: {
    ok: boolean;
    headline: string;
    detail: string;
    demoLedger: boolean;
  } | null;
  duplicateWarning: string | null;
}

function fmtDate(d: Date | string | null): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function honeyTitle(t: string): string {
  const map: Record<string, string> = {
    MULTIFLORAL: "Multifloral Wildflower",
    ACACIA: "Acacia",
    MANUKA: "Manuka",
    EUCALYPTUS: "Eucalyptus",
    MUSTARD: "Pure Mustard Honey",
    MANGROVE: "Sundarbans Mangrove",
    LITCHI: "Litchi Blossom",
    JAMUN: "Jamun Honey",
    WILDFLOWER: "Wildflower",
    OTHER: "Wildflower",
  };
  return map[t] ?? t;
}

function qualityLabel(q: string): string {
  const map: Record<string, string> = {
    PENDING: "In progress",
    PASSED: "Passed",
    FAILED: "Failed",
    QUARANTINE: "On hold",
  };
  return map[q] ?? q;
}

const JOURNEY_KEYS = ["HIVE", "HARVEST", "LABORATORY", "PROCESSING", "DISTRIBUTION", "VERIFIED"] as const;

/** Build the six-step consumer chain from a 0-based "completed through" index. */
function buildJourney(completedThrough: number, notes: Partial<Record<string, string>>): JourneyStep[] {
  return JOURNEY_KEYS.map((key, i) => ({
    key,
    label: key.charAt(0) + key.slice(1).toLowerCase(),
    state: (i < completedThrough ? "done" : i === completedThrough ? "current" : "todo") as StepState,
    note: notes[key],
  }));
}

/** Map an operational batch stage onto how far the consumer chain has progressed. */
function stageIndex(stage: BatchStage): number {
  const order = STAGE_ORDER.indexOf(stage);
  if (order <= STAGE_ORDER.indexOf("COLLECTION")) return 1; // harvest recorded
  if (stage === "LAB") return 2;
  if (stage === "PROCESSING" || stage === "PACKAGING") return 3;
  return 4; // DISTRIBUTION / RETAIL
}

function demoStageIndex(stage: string): number {
  switch (stage) {
    case "HARVEST":
      return 1;
    case "LAB":
      return 2;
    case "PROCESSING":
    case "PACKAGING":
      return 3;
    case "DISTRIBUTION":
    case "DELIVERED":
      return 4;
    default:
      return 1;
  }
}

function statusForLabel(label: LabelStatus): Certificate["status"] {
  switch (label) {
    case "VALID":
      return "verified";
    case "NO_TOKEN":
      return "found";
    case "REVOKED":
    case "EXPIRED":
      return "warning";
    default:
      return "unverified";
  }
}

function headlineForLabel(label: LabelStatus): string {
  switch (label) {
    case "VALID":
      return "Verified batch";
    case "NO_TOKEN":
      return "Batch record found";
    case "REVOKED":
      return "Label withdrawn";
    case "EXPIRED":
      return "Label expired";
    default:
      return "Could not be verified";
  }
}

async function getCertificate(code: string, token: string | null): Promise<Certificate> {
  const processed = code.toUpperCase();

  // --- Demo batches: deterministic server snapshot, never the database. ---
  if (isDemoBatchCode(processed)) {
    const batch = getBatchByCode(DEMO_DATA_SERVER_SNAPSHOT, processed);
    if (!batch) {
      return {
        code: processed,
        demo: true,
        status: "notfound",
        headline: "Batch not recognised",
        detail:
          "No HiveTrace batch was found for this code. The label may be misprinted — check the code and try again, or scan the QR code on the jar.",
        honeyType: "",
        origin: "",
        harvestDate: null,
        hiveId: null,
        labReportId: null,
        labStatus: "",
        labTests: [],
        journey: [],
        integrity: null,
        duplicateWarning: null,
      };
    }
    const meta = DEMO_CERT_META[processed];
    const idx = demoStageIndex(batch.currentStage);
    // The demo dataset records harvest as a timeline event; fall back to the
    // batch creation date if the event is missing.
    const harvestEvent = batch.events.find((e) => e.type === "HARVEST" || e.stage === "HARVEST");
    const harvestDate = fmtDate(harvestEvent?.timestamp ?? batch.createdAt);
    return {
      code: processed,
      demo: true,
      status: "verified",
      headline: "Verified batch",
      detail:
        "This jar's batch was found in HiveTrace records. The details below come from the demo dataset.",
      honeyType: honeyTitle(batch.honeyType),
      origin: batch.originRegion,
      harvestDate,
      hiveId: meta?.hiveId ?? null,
      labReportId: meta?.labReportId ?? null,
      labStatus: qualityLabel(batch.quality),
      labTests: batch.qualityResults.map((r) => ({ type: r.testType, passed: r.passed })),
      journey: buildJourney(idx, {
        HIVE: meta ? `Hive ${meta.hiveId}` : undefined,
        HARVEST: harvestDate ? `Harvested ${harvestDate}` : undefined,
        LABORATORY: meta ? `Report ${meta.labReportId}` : undefined,
      }),
      integrity: {
        ok: true,
        headline: "Record integrity verified",
        detail:
          "This is demo data, so integrity proofs are illustrative here. In production, tamper-evident proofs let anyone detect whether a batch's history was altered after it was written.",
        demoLedger: true,
      },
      duplicateWarning: null,
    };
  }

  // --- Real batches: DB-backed verification. A DB failure must surface as an
  // error state, never as a fabricated verdict. ---
  let outcome: VerifyOutcome | null = null;
  try {
    outcome = await verifyBatch({ publicCode: processed }, token, null);
  } catch {
    outcome = null;
  }

  if (outcome === null) {
    return {
      code: processed,
      demo: false,
      status: "unavailable",
      headline: "Verification unavailable",
      detail:
        "We couldn't reach the verification service, so this batch could not be checked. Please try again shortly — no verdict is shown rather than a potentially wrong one.",
      honeyType: "",
      origin: "",
      harvestDate: null,
      hiveId: null,
      labReportId: null,
      labStatus: "",
      labTests: [],
      journey: [],
      integrity: null,
      duplicateWarning: null,
    };
  }

  if (!outcome.found || !outcome.provenance) {
    return {
      code: processed,
      demo: false,
      status: "notfound",
      headline: "Batch not recognised",
      detail:
        "No HiveTrace batch was found for this code. If you bought this jar recently, the label may be forged or misprinted — please contact the retailer.",
      honeyType: "",
      origin: "",
      harvestDate: null,
      hiveId: null,
      labReportId: null,
      labStatus: "",
      labTests: [],
      journey: [],
      integrity: null,
      duplicateWarning: null,
    };
  }

  const p = outcome.provenance;
  const status = statusForLabel(outcome.label);
  const idx = stageIndex(p.currentStage);
  const integrity = p.integrity.unanchored
    ? {
        ok: true,
        headline: "Record integrity verified",
        detail:
          "This batch's events have not yet been anchored to an external ledger. They remain sealed against tampering inside HiveTrace, and the anchor is created as the batch moves forward.",
        demoLedger: false,
      }
    : p.integrity.recordUnaltered
      ? {
          ok: true,
          headline: "Record integrity verified",
          detail: `The batch's recorded history matches its tamper-evident proofs — nothing was altered after it was written. ${p.integrity.anchorCount} proof${p.integrity.anchorCount === 1 ? "" : "s"} checked.`,
          demoLedger: p.integrity.simulated,
        }
      : {
          ok: false,
          headline: "Integrity check failed",
          detail:
            "This batch's record does not match its tamper-evident proof. Do not trust this label — please report it to the retailer.",
          demoLedger: p.integrity.simulated,
        };

  return {
    code: processed,
    demo: false,
    status,
    headline: headlineForLabel(outcome.label),
    detail: LABEL_COPY[outcome.label]?.detail ?? "Record could not be verified.",
    honeyType: honeyTitle(p.honeyType),
    origin: p.originRegion,
    harvestDate: fmtDate(p.harvestDate),
    hiveId: p.hiveName ?? null,
    labReportId: null,
    labStatus: qualityLabel(p.qualityStatus),
    labTests: p.qualityTests.map((t) => ({ type: t.testType, passed: t.passed })),
    journey: buildJourney(idx, {
      HIVE: p.hiveName ? (p.apiaryName ? `${p.hiveName} · ${p.apiaryName}` : p.hiveName) : undefined,
      HARVEST: p.harvestDate ? `Harvested ${fmtDate(p.harvestDate)}` : undefined,
      LABORATORY: p.qualityTestCount > 0 ? `${p.qualityTestCount} lab tests on record` : undefined,
    }),
    integrity,
    duplicateWarning: outcome.scanInsight?.suspicious ? (outcome.scanInsight.reason ?? "This label appears to have been scanned from many different places.") : null,
  };
}

/* ------------------------------- presentation ------------------------------ */

const SEAL: Record<Certificate["status"], { ring: string; color: string; path: string }> = {
  verified: { ring: "border-[#3b6934] bg-[#3b6934]/10", color: "text-[#3b6934]", path: "M5 12.5l4.5 4.5L19 7.5" },
  found: { ring: "border-[#ffb800] bg-[#ffb800]/10", color: "text-[#8a5b00]", path: "M12 7.5h.01M12 11v5.5" },
  warning: {
    ring: "border-[#b3541e] bg-[#b3541e]/10",
    color: "text-[#b3541e]",
    path: "M12 4.25L21 19.5H3Z M12 10.75v3.5 M12 16.75h.01",
  },
  unverified: { ring: "border-[#b3261e] bg-[#b3261e]/10", color: "text-[#b3261e]", path: "M7.5 7.5l9 9M16.5 7.5l-9 9" },
  notfound: {
    ring: "border-[#b3261e] bg-[#b3261e]/10",
    color: "text-[#b3261e]",
    path: "M2.5 10.5a8 8 0 1 0 16 0a8 8 0 1 0-16 0M16.2 16.2L21 21M4 20L20 4",
  },
  unavailable: {
    ring: "border-[#5c4a2a] bg-[#5c4a2a]/10",
    color: "text-[#5c4a2a]",
    path: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z M3 3l18 18",
  },
};

/* The seal is decorative — the status is also stated in words right below it. */
function Seal({ status }: { status: Certificate["status"] }) {
  const s = SEAL[status];
  return (
    <div className={`animate-seal-pop flex h-20 w-20 items-center justify-center rounded-full border-2 ${s.ring}`} aria-hidden>
      <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none">
        <path
          d={s.path}
          pathLength={1}
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`animate-seal-draw ${s.color}`}
        />
      </svg>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[#2a1e05]/10 py-3 last:border-0">
      <dt className="shrink-0 text-label-caps tracking-[0.14em] text-[#5c4a2a]">{label}</dt>
      <dd className={`text-right text-body-md font-medium text-[#2a1e05] ${mono ? "font-mono tracking-wide" : ""}`}>
        {value ?? "—"}
      </dd>
    </div>
  );
}

function Journey({ steps }: { steps: JourneyStep[] }) {
  return (
    <ol className="relative">
      {steps.map((step, i) => (
        <li key={step.key} className="relative flex gap-4 pb-7 last:pb-0">
          {/* connector */}
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className={`absolute left-[17px] top-9 h-[calc(100%-2.25rem)] w-0.5 ${step.state === "done" ? "bg-[#3b6934]/40" : "bg-[#2a1e05]/10"}`}
            />
          )}
          <span
            className={`z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
              step.state === "done"
                ? "border-[#3b6934] bg-[#3b6934] text-white"
                : step.state === "current"
                  ? "border-[#ffb800] bg-[#ffb800]/15 text-[#8a5b00]"
                  : "border-[#2a1e05]/30 bg-transparent text-[#2a1e05]/55"
            }`}
          >
            {step.state === "done" ? (
              <Icon name="check" className="text-[18px]" />
            ) : step.state === "current" ? (
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#ffb800]" aria-hidden />
            ) : (
              <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
            )}
          </span>
          <div className="pt-1">
            <p className={`text-body-md font-semibold ${step.state === "todo" ? "text-[#2a1e05]/70" : "text-[#2a1e05]"}`}>
              {step.label}
            </p>
            {step.note && <p className="mt-0.5 text-body-sm text-[#5c4a2a]">{step.note}</p>}
            {step.state === "current" && !step.note && (
              <p className="mt-0.5 text-body-sm text-[#5c4a2a]">In progress</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Batch ${code}`,
    description: `Verify batch ${code} — its journey, laboratory evidence and record integrity, from HiveTrace.`,
  };
}

export default async function VerifyCertificatePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const { code } = await params;
  const { t } = await searchParams;
  // `t` is the HMAC-signed label token the printed QR encodes (?t=<token>).
  // Passing it through lets a genuine label report VALID; without it the page
  // can only do the token-less batch-code lookup.
  const cert = await getCertificate(code, typeof t === "string" ? t : null);
  const hasBody = cert.status === "verified" || cert.status === "found" || cert.status === "warning";

  return (
    <div className="min-h-dvh bg-[#faf6ec] font-sans text-[#2a1e05]">
      {/* Nav */}
      <nav className="relative mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-4">
        <Link
          href="/scan"
          className="flex h-11 min-w-11 items-center gap-2 rounded-full px-2 text-body-sm font-medium text-[#5c4a2a] transition-colors hover:bg-[#2a1e05]/5"
        >
          <Icon name="arrow_back" className="text-[20px]" />
          <span className="hidden sm:inline">Scan</span>
        </Link>
        {/* Centred independently of the asymmetric left/right controls */}
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-label-caps tracking-[0.22em] text-[#8a5b00]">
          HIVETRACE
        </span>
        <span className="w-11" aria-hidden />
      </nav>

      <main className="mx-auto w-full max-w-2xl px-5 pb-16">
        {/* Seal + headline */}
        <section className="animate-fade-up flex flex-col items-center pt-4 text-center">
          <Seal status={cert.status} />
          <p className="mt-5 text-eyebrow tracking-[0.22em] text-[#3b6934]">{cert.headline}</p>
          {/* ThreeUI TextAnimationCollection (article-headings variant): the
              batch code resolves through the authored decode reveal. */}
          <Decode as="h1" className="mt-2 font-mono text-display-sm tracking-wide text-[#221606]">
            {cert.code}
          </Decode>
          {cert.demo && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#2a1e05]/5 px-3 py-1 text-label-caps text-[#5c4a2a]">
              <Icon name="info" className="text-[14px]" />
              Demo data
            </span>
          )}
          <p className="mt-4 max-w-md text-body-md leading-relaxed text-[#5c4a2a]">{cert.detail}</p>
        </section>

        {cert.duplicateWarning && (
          <div className="animate-fade-up stagger-1 mt-6 flex items-start gap-3 rounded-2xl bg-[#b3261e]/8 p-4 text-[#7a1f16]" role="alert">
            <Icon name="report" className="mt-0.5 shrink-0 text-[22px]" />
            <p className="text-body-md">
              <strong>Duplicate label detected.</strong> {cert.duplicateWarning}
            </p>
          </div>
        )}

        {hasBody && (
          <>
            {/* Certificate card */}
            <section aria-label="Batch certificate" className="animate-fade-up stagger-1 mt-8 overflow-hidden rounded-3xl border border-[#2a1e05]/10 bg-[#fffdf7] shadow-[0_18px_50px_-24px_rgba(42,30,5,0.35)]">
              <div className="h-1.5 bg-gradient-to-r from-[#ffb800] via-[#e09b00] to-[#ffb800]" aria-hidden />
              <div className="p-6 sm:p-8">
                <h2 className="text-eyebrow tracking-[0.18em] text-[#8a5b00]">Certificate</h2>
                <dl className="mt-2">
                  <Row label="Honey type" value={cert.honeyType} />
                  <Row label="Origin" value={cert.origin} />
                  <Row label="Harvest date" value={cert.harvestDate} />
                  <Row label="Hive" value={cert.hiveId} mono />
                </dl>
              </div>
            </section>

            {/* Journey */}
            <section aria-label="Batch journey" className="animate-fade-up stagger-2 mt-8 rounded-3xl border border-[#2a1e05]/10 bg-[#fffdf7] p-6 sm:p-8">
              <h2 className="text-eyebrow tracking-[0.18em] text-[#8a5b00]">The journey</h2>
              <p className="mt-1.5 text-body-sm text-[#5c4a2a]">Every step this batch passed through, from hive to your jar.</p>
              <div className="mt-6">
                <Journey steps={cert.journey} />
              </div>
            </section>

            {/* Laboratory */}
            <section aria-label="Laboratory evidence" className="animate-fade-up stagger-3 mt-8 rounded-3xl border border-[#2a1e05]/10 bg-[#fffdf7] p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3b6934]/10 text-[#3b6934]">
                  <Icon name="science" className="text-[22px]" />
                </span>
                <div>
                  <h2 className="text-eyebrow tracking-[0.18em] text-[#8a5b00]">Laboratory</h2>
                  {cert.labReportId && (
                    <p className="mt-0.5 font-mono text-body-sm tracking-wide text-[#2a1e05]">{cert.labReportId}</p>
                  )}
                </div>
                <span className={`ml-auto rounded-full px-3 py-1 text-label-caps ${cert.labStatus === "Passed" ? "bg-[#3b6934]/10 text-[#3b6934]" : "bg-[#ffb800]/15 text-[#8a5b00]"}`}>
                  {cert.labStatus}
                </span>
              </div>
              {cert.labTests.length > 0 ? (
                <ul className="mt-5 space-y-2">
                  {cert.labTests.map((test, i) => (
                    <li key={`${test.type}-${i}`} className="flex items-center justify-between rounded-xl bg-[#2a1e05]/[0.03] px-4 py-2.5">
                      <span className="text-body-md capitalize text-[#2a1e05]">{test.type.replace(/_/g, " ").toLowerCase()}</span>
                      <span className={`inline-flex items-center gap-1 text-body-sm font-medium ${test.passed ? "text-[#3b6934]" : "text-[#b3261e]"}`}>
                        <Icon name={test.passed ? "check_circle" : "cancel"} fill={test.passed} className="text-[18px]" />
                        {test.passed ? "Pass" : "Fail"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-body-md leading-relaxed text-[#5c4a2a]">
                  {cert.labReportId
                    ? `Laboratory report ${cert.labReportId} is attached to this batch. The laboratory publishes its summary here once testing completes.`
                    : "Laboratory testing has not been recorded for this batch yet."}
                </p>
              )}
              <p className="mt-4 text-body-sm leading-relaxed text-[#5c4a2a]/80">
                Detailed lab parameters are shared with the batch owner. What you see here is the public summary.
              </p>
            </section>

            {/* Integrity */}
            {cert.integrity && (
              <section aria-label="Record integrity" className="animate-fade-up stagger-4 mt-8 rounded-3xl border border-[#2a1e05]/10 bg-[#221606] p-6 text-[#faf6ec] sm:p-8">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffb800]/15 text-[#ffb800]">
                    <Icon name="shield" fill className="text-[22px]" />
                  </span>
                  <h2 className="text-headline-sm text-white">{cert.integrity.headline}</h2>
                </div>
                <p className="mt-4 text-body-md leading-relaxed text-white/80">{cert.integrity.detail}</p>
                <p className="mt-3 border-t border-white/10 pt-3 text-body-sm leading-relaxed text-white/60">
                  Integrity proofs protect the digital record — they show whether this batch&apos;s history was
                  changed after it was written. They don&apos;t test the honey itself; only laboratory analysis
                  speaks to purity and quality.
                </p>
                {cert.integrity.demoLedger && (
                  <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-label-caps text-white/70">
                    <Icon name="info" className="text-[14px]" />
                    Demo ledger
                  </span>
                )}
              </section>
            )}
          </>
        )}

        {/* Footer actions */}
        <div className="animate-fade-up stagger-4 mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/scan"
            className="flex h-13 flex-1 items-center justify-center gap-2 rounded-full bg-[#2a1e05] py-3.5 text-body-md font-semibold text-[#faf6ec] transition-all hover:bg-[#3a2a10] active:scale-[0.98]"
          >
            <Icon name="qr_code_scanner" className="text-[20px]" />
            Scan another jar
          </Link>
          <Link
            href="/"
            className="flex h-13 flex-1 items-center justify-center gap-2 rounded-full border border-[#2a1e05]/15 py-3.5 text-body-md font-semibold text-[#2a1e05] transition-all hover:bg-[#2a1e05]/5 active:scale-[0.98]"
          >
            Back to home
          </Link>
        </div>
        <p className="mt-6 text-center text-body-sm text-[#5c4a2a]/85">
          Something look wrong? Tell the retailer where you bought this jar.
        </p>
      </main>
    </div>
  );
}
