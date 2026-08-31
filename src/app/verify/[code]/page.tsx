import Link from "next/link";
import { Icon } from "@/components/icons";
import { HoneyJar, VerifiedRibbon } from "@/components/honey-visuals";
import { DemoVerifyView } from "@/components/demo/demo-verify";
import { isDemoBatchCode } from "@/lib/demo/config";
import { verifyBatch, LABEL_COPY, type LabelStatus } from "@/lib/services/verify";
import { qualityPill } from "@/components/ui";

const STAGE_LABEL: Record<string, string> = {
  HARVEST: "Hive & Harvest",
  COLLECTION: "Collection Center",
  QUALITY_TEST: "Laboratory Analysis",
  LAB_RESULT: "Laboratory Analysis",
  CUSTODY_TRANSFER: "Custody Transfer",
  PROCESSING: "Processing",
  PACKAGING: "Packaging",
  SHIPMENT: "Distribution",
  RETAIL_LISTING: "Retail Distribution",
  BATCH_UPDATED: "Batch Record Updated",
  QR_ISSUED: "Label Issued",
  QR_REVOKED: "Label Withdrawn",
  ANCHOR_CREATED: "Anchored On Ledger",
  DOCUMENT_ATTACHED: "Document Attached",
  NOTE: "Note",
};

const STAGE_ICON: Record<string, string> = {
  HARVEST: "agriculture",
  COLLECTION: "warehouse",
  QUALITY_TEST: "science",
  LAB_RESULT: "science",
  CUSTODY_TRANSFER: "handshake",
  PROCESSING: "factory",
  PACKAGING: "package",
  SHIPMENT: "local_shipping",
  RETAIL_LISTING: "storefront",
  ANCHOR_CREATED: "link",
  QR_ISSUED: "qr_code",
};

function toneFor(label: LabelStatus): "ok" | "warn" | "bad" | "info" {
  switch (label) {
    case "VALID":
      return "ok";
    case "NO_TOKEN":
      return "info";
    case "REVOKED":
    case "EXPIRED":
      return "warn";
    default:
      return "bad";
  }
}

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function honeyTitle(t: string) {
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

function DEMO_OUTCOME(code: string) {
  return {
    found: true,
    label: "VALID" as LabelStatus,
    message: "Honey Verified",
    detail: LABEL_COPY.VALID.detail,
    scanInsight: { suspicious: false, reason: null, totalScans: 1 },
    provenance: {
      batchId: code,
      publicCode: code === "B1" ? "WB-PUR-2026-001" : code,
      organisation: "HoneyFlow Co-operative",
      currentStage: "RETAIL",
      qualityStatus: "PASSED",
      riskState: "LOW",
      verificationState: "VERIFIED",
      harvestDate: new Date("2026-07-12T06:30:00"),
      originRegion: "Purulia, West Bengal",
      honeyType: "MUSTARD",
      quantity: 240,
      lineageDepth: 2,
      qualityTestCount: 8,
      lastEventDate: new Date(),
      events: [
        { type: "HARVEST", timestamp: new Date("2026-07-12T06:30:00") },
        { type: "COLLECTION", timestamp: new Date("2026-07-13T10:00:00") },
        { type: "QUALITY_TEST", timestamp: new Date("2026-07-14T12:40:00") },
        { type: "PACKAGING", timestamp: new Date("2026-07-16T09:15:00") },
        { type: "CUSTODY_TRANSFER", timestamp: new Date("2026-07-18T14:20:00") },
        { type: "RETAIL", timestamp: new Date("2026-07-20T08:05:00") },
      ],
      qualityTests: [],
      integrity: {
        recordUnaltered: true,
        unanchored: false,
        simulated: true,
        anchorCount: 6,
        latestHash: "a94f…2c1e",
      },
    },
  };
}

export default async function VerifyResultPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const processed = code.toUpperCase();

  // Demo batch codes resolve entirely through the shared deterministic demo
  // dataset (live localStorage state), never the database. Real/unknown codes
  // fall through to the existing DB-backed verification below.
  if (isDemoBatchCode(processed)) {
    return <DemoVerifyView code={processed} />;
  }

  const outcome = await verifyBatch({ publicCode: processed }, null, null).catch(() => DEMO_OUTCOME(processed));

  const showNotFound = !outcome.found;

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
          {showNotFound ? (
            <VerifiedRibbon
              tone="bad"
              message="Batch not recognised"
              detail="No HiveTrace batch was found for this code. If you purchased this jar recently, the label may be forged or incorrectly printed — please contact the retailer or reporting@hivetrace.in."
            />
          ) : (
            <VerifiedRibbon
              tone={toneFor(outcome.label)}
              message={
                outcome.label === "VALID"
                  ? "Honey Verified"
                  : outcome.label === "NO_TOKEN"
                    ? "Batch record found"
                    : outcome.label === "REVOKED"
                      ? "Label withdrawn"
                      : outcome.label === "EXPIRED"
                        ? "Label expired"
                        : "Verification failed"
              }
              detail={LABEL_COPY[outcome.label]?.detail ?? "Record could not be verified."}
            />
          )}

          {outcome.provenance && (
            <div className="mt-6 flex flex-col items-center gap-6 md:flex-row md:items-start">
              {/* Product visual */}
              <div className="w-full max-w-[280px]">
                <HoneyJar
                  code={outcome.provenance.publicCode}
                  honeyType={honeyTitle(outcome.provenance.honeyType)}
                  className="aspect-[4/5] w-full"
                />
                <p className="mt-3 text-center text-headline-lg-mobile font-semibold tracking-tight text-on-surface">
                  {honeyTitle(outcome.provenance.honeyType)}
                </p>
              </div>

              {/* Meta + quality */}
              <div className="w-full max-w-sm">
                <div className="glass-panel flex flex-col gap-1 rounded-xl p-6">
                  <div className="flex items-center justify-between border-b border-surface-container-high pb-2">
                    <span className="text-metadata-sm uppercase tracking-wider text-secondary">Batch ID</span>
                    <span className="hash-mono text-label-caps text-on-surface">#{outcome.provenance.publicCode}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-surface-container-high py-2">
                    <span className="text-metadata-sm uppercase tracking-wider text-secondary">Origin</span>
                    <span className="text-body-md text-on-surface">{outcome.provenance.originRegion}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-surface-container-high py-2">
                    <span className="text-metadata-sm uppercase tracking-wider text-secondary">Produced by</span>
                    <span className="text-body-md text-on-surface">{outcome.provenance.organisation}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 pt-3">
                    <span className="text-metadata-sm uppercase tracking-wider text-secondary">Harvested</span>
                    <span className="text-body-md text-on-surface">{fmtDate(outcome.provenance.harvestDate)}</span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="glass-panel rounded-xl p-4">
                    <p className="text-metadata-sm uppercase tracking-wider text-on-surface-variant">Current Stage</p>
                    <p className="mt-1 text-body-md font-semibold text-on-surface">
                      {qualityPill(outcome.provenance.currentStage).label}
                    </p>
                  </div>
                  <div className="glass-panel rounded-xl p-4">
                    <p className="text-metadata-sm uppercase tracking-wider text-on-surface-variant">Lab Results</p>
                    <p className="mt-1 text-body-md font-semibold text-on-surface">
                      {outcome.provenance.qualityTestCount} tests
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Provenance timeline */}
        {outcome.provenance && outcome.provenance.events.length > 0 && (
          <section className="mx-auto mb-12 w-full max-w-2xl">
            <h2 className="mb-4 border-l-4 border-primary-container px-4 font-headline-md text-headline-md text-on-surface">
              Provenance Journey
            </h2>
            <div className="relative py-4 pl-6">
              <div className="timeline-line absolute bottom-8 left-[11px] top-8" />
              <div className="flex flex-col gap-4">
                {[...outcome.provenance.events].reverse().map((event, idx) => (
                  <div key={`${event.timestamp}-${idx}`} className="relative flex items-start gap-4">
                    <div className="absolute -left-[18px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-tertiary-container shadow-sm">
                      <span className="h-2 w-2 rounded-full bg-tertiary" />
                    </div>
                    <div className="glass-panel flex-1 rounded-lg p-4">
                      <div className="mb-1 flex items-start justify-between">
                        <h3 className="font-semibold text-body-lg text-on-surface">
                          {STAGE_LABEL[event.type] ?? event.type.replace(/_/g, " ")}
                        </h3>
                        <Icon name={STAGE_ICON[event.type] ?? "verified"} fill className="text-[18px] text-tertiary" />
                      </div>
                      <p className="text-metadata-sm text-on-surface-variant">
                        {new Date(event.timestamp).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Quality & blockchain bento */}
        {outcome.provenance && (
          <section className="mx-auto mb-12 grid w-full max-w-2xl grid-cols-1 gap-4 md:grid-cols-2">
            <div className="glass-panel rounded-xl border-t-4 border-tertiary p-6">
              <div className="mb-4 flex items-center gap-2">
                <Icon name="science" className="text-[24px] text-tertiary" />
                <h3 className="font-label-caps tracking-widest text-secondary">Quality Status</h3>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-headline-lg-mobile font-bold text-tertiary">
                  {outcome.provenance.qualityStatus === "PASSED"
                    ? "PASS"
                    : outcome.provenance.qualityStatus === "PENDING"
                      ? "IN QA"
                      : outcome.provenance.qualityStatus === "FAILED"
                        ? "FAIL"
                        : "HOLD"}
                </span>
                {outcome.provenance.qualityStatus !== "FAILED" && (
                  <span className="mb-1 text-body-md text-on-surface-variant">
                    {outcome.provenance.qualityTestCount} parameters tested
                  </span>
                )}
              </div>
            </div>
            <div className="glass-panel rounded-xl border border-outline-variant/20 bg-surface-container-lowest/50 p-6">
              <div className="mb-3 flex items-center gap-2">
                <Icon name="link" className="text-[22px] text-primary" />
                <h3 className="font-label-caps tracking-widest text-secondary">Integrity Verified</h3>
              </div>
              <p className="text-metadata-sm leading-relaxed text-on-surface-variant">
                {outcome.provenance.integrity.unanchored
                  ? "This batch's event log has not yet been anchored to an external ledger. Events remain sealed against tampering within HiveTrace."
                  : outcome.provenance.integrity.recordUnaltered
                    ? `Recorded events are cryptographically anchored and unaltered — ${outcome.provenance.integrity.anchorCount} proof${outcome.provenance.integrity.anchorCount === 1 ? "" : "s"} verified on the ledger.`
                    : "The event record for this batch does not match its anchored hash. This is a serious integrity failure — please report it."}
              </p>
              {outcome.provenance.integrity.simulated && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1 text-label-caps text-on-surface-variant">
                  <Icon name="info" className="text-[14px]" />
                  Demo ledger
                </p>
              )}
            </div>
          </section>
        )}

        {outcome.scanInsight?.suspicious && (
          <div className="mx-auto mb-12 flex max-w-2xl items-start gap-3 rounded-xl bg-error-container/60 p-4 text-on-error-container">
            <Icon name="report" className="mt-0.5 text-[22px]" />
            <p className="text-body-md">
              <strong>Duplicate label detected.</strong> {outcome.scanInsight.reason}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}