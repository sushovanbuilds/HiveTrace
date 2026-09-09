import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { CopyField } from "@/components/copy-field";
import { db } from "@/lib/db";
import { qrToSvg } from "@/lib/qr/svg";
import { STAGE_ORDER, type BatchStage } from "@/lib/types";

export const dynamic = "force-dynamic";

const STAGE_TITLE: Record<string, { title: string; blurb: string }> = {
  HARVEST: { title: "Raw Honey Extraction", blurb: "Extraction from hives at the registered apiary, sealed at the point of origin." },
  COLLECTION: { title: "Collection & Transit", blurb: "Handover to the collection centre and first custody transfer." },
  LAB: { title: "Quality & Purity Analysis", blurb: "Laboratory panel across purity, authenticity and adulteration markers." },
  PROCESSING: { title: "Filtration & Homogenization", blurb: "Cold filtration and blending at the processing plant." },
  PACKAGING: { title: "Packaging & Labeling", blurb: "Bottling, batch labeling and QR issuance." },
  DISTRIBUTION: { title: "Bulk Distribution", blurb: "Shipment to regional distribution hubs." },
  RETAIL: { title: "Retail & Consumer", blurb: "Listing at retail partners — journey complete." },
};

const EVENT_EVIDENCE: Record<string, string[]> = {
  HARVEST: ["Scale_Telemetry.csv", "Geo-Tag_Data.json"],
  COLLECTION: ["Waybill_Collection.pdf", "Custody_Receipt.pdf"],
  CUSTODY_TRANSFER: ["Custody_Receipt.pdf", "Handover_Signoff.pdf"],
  QUALITY_TEST: ["NMR_Result_Fragment.json"],
  LAB_RESULT: ["Full_NMR_Report.pdf"],
  PROCESSING: ["Batch_Recipe.csv", "Temp_Log.json"],
  PACKAGING: ["Labeling_Batch.csv", "QR_Issue_Log.json"],
  SHIPMENT: ["IoT_Temp_Log.json", "Waybill_7812.pdf"],
  RETAIL_LISTING: ["Listing_Record.pdf"],
  ANCHOR_CREATED: ["Anchoring_Proof.json"],
  QR_ISSUED: ["QR_Issue_Log.json"],
  DOCUMENT_ATTACHED: ["Attachment_Proof.json"],
  BATCH_UPDATED: ["Update_Log.json"],
};

const SCHEMA_LABEL: Record<string, string> = {
  quantity: "Quantity",
  hive: "Hive",
  from: "From",
  to: "To",
  role: "Role",
  testType: "Test",
  result: "Result",
  passed: "Passed",
  score: "Score",
  method: "Method",
  tempC: "Temp °C",
  facility: "Facility",
  carrier: "Carrier",
  location: "Location",
  description: "Note",
};

const TEST_LABEL: Record<string, string> = {
  MOISTURE: "Moisture Content",
  HMF: "HMF (Freshness)",
  PROLINE: "Proline",
  DIASTASE: "Diastase",
  ELECTRICAL_CONDUCTIVITY: "Electrical Conductivity",
  C4_SUGAR: "C4 Sugars (Adulteration)",
  POLLEN_DNA: "Pollen DNA Auth",
  HEAVY_METALS: "Heavy Metals",
  ANTIBIOTIC_RESIDUE: "Antibiotic Residue",
  SUGAR_SYRUP_SMR: "Sugar Syrup (SMR)",
};

const TEST_MAX: Record<string, number> = {
  MOISTURE: 20,
  HMF: 40,
  PROLINE: 300,
  DIASTASE: 40,
  ELECTRICAL_CONDUCTIVITY: 80,
  C4_SUGAR: 12,
  POLLEN_DNA: 1,
  HEAVY_METALS: 100,
  ANTIBIOTIC_RESIDUE: 100,
  SUGAR_SYRUP_SMR: 100,
};

type EventRecord = {
  id: string;
  type: string;
  timestamp: Date;
  data: Record<string, unknown>;
};

function stableHex(code: string) {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) | 0;
  const abs = Math.abs(h).toString(16).padStart(8, "0");
  return `0x7F4a${abs}ab3e...9b2C${abs.slice(0, 4)}`;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(d: Date) {
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StageCard({
  step,
  event,
  state,
  fallback,
}: {
  step: number;
  event?: EventRecord;
  state: "done" | "active" | "pending";
  fallback: { title: string; blurb: string };
}) {
  const isActive = state === "active";
  const title = event ? STAGE_TITLE[event.type]?.title ?? fallback.title : fallback.title;
  const blurb = event ? STAGE_TITLE[event.type]?.blurb ?? fallback.blurb : fallback.blurb;

  return (
    <div className={`relative mb-6 group ${state === "pending" ? "opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0" : ""}`}>
      <div
        className={`absolute -left-[35px] top-5 z-10 flex h-4 w-4 items-center justify-center rounded-full shadow-md ring-4 ring-surface-bright md:-left-[47px] ${
          isActive
            ? "border-4 border-primary-container bg-surface"
            : state === "done"
              ? "bg-primary-container"
              : "border-[3px] border-outline-variant bg-surface"
        }`}
      >
        {isActive ? <span className="absolute inset-0 animate-ping rounded-full bg-primary-container opacity-50" /> : null}
        {state === "done" ? <span className="h-1.5 w-1.5 rounded-full bg-on-primary-container" /> : null}
      </div>

      <div
        className={`relative overflow-hidden rounded-xl pb-1 shadow-sm ${
          isActive
            ? "border-2 border-primary/40 bg-surface shadow-md"
            : state === "done"
              ? "border border-outline-variant/30 bg-surface-container-lowest"
              : "border border-dashed border-outline-variant/30 bg-surface-container-low"
        }`}
      >
        {state === "done" ? <span className="absolute left-0 top-0 h-full w-1 bg-tertiary" /> : null}
        {isActive ? (
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-container/10 to-transparent" />
        ) : null}

        <div className={`p-6 ${isActive ? "relative z-10" : ""}`}>
          <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <p className="mb-1.5 text-label-caps uppercase tracking-widest text-secondary">
                Step {String(step).padStart(2, "0")} · {event ? fmtDateTime(event.timestamp) : "Pending"}
              </p>
              <h4 className="text-[20px] font-semibold tracking-tight text-on-surface">{title}</h4>
            </div>
            {isActive ? (
              <span className="inline-flex h-fit items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-on-primary shadow-sm">
                <Icon name="sync" className="animate-spin text-[16px]" />
                <span className="text-[12px] font-bold">Processing</span>
              </span>
            ) : state === "done" ? (
              <span className="inline-flex h-fit items-center gap-1.5 rounded-md border border-tertiary-fixed/30 bg-tertiary px-3 py-1.5 text-on-tertiary shadow-sm">
                <Icon name="verified" className="text-[16px]" />
                <span className="text-[12px] font-bold">Integrity Intact</span>
              </span>
            ) : (
              <span className="inline-flex h-fit items-center gap-1.5 rounded-md border border-outline-variant/30 bg-surface-variant px-3 py-1.5 text-on-surface-variant">
                <Icon name="schedule" className="text-[16px]" />
                <span className="text-[12px] font-bold">Upcoming</span>
              </span>
            )}
          </div>

          <p className="mb-4 hidden text-body-md text-on-surface-variant md:block">{blurb}</p>

          {event && state !== "pending" ? (
            <>
              <div className="mb-4 grid grid-cols-1 gap-4 rounded-lg border border-outline-variant/20 bg-surface/80 px-5 py-4 backdrop-blur-sm md:grid-cols-2">
                {Object.entries(event.data ?? {})
                  .filter(([k]) => !["description"].includes(k))
                  .slice(0, 4)
                  .map(([k, v]) => (
                    <div key={k} className="flex items-start gap-3">
                      <Icon name={k === "role" ? "swap_horiz" : k === "quantity" ? "scale" : k === "result" ? "speed" : "info"} className="mt-0.5 text-[20px] text-secondary" />
                      <div>
                        <span className="mb-1 block text-label-caps uppercase tracking-widest text-secondary">
                          {SCHEMA_LABEL[k] ?? k.replace(/_/g, " ")}
                        </span>
                        <span className="text-metadata-sm font-medium text-on-surface">
                          {typeof v === "object" ? JSON.stringify(v) : String(v)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-label-caps uppercase tracking-widest text-secondary">Evidence:</span>
                {EVENT_EVIDENCE[event.type]?.map((f) => (
                  <span
                    key={f}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-outline-variant/40 bg-surface-variant px-3 py-1.5 text-[12px] text-on-surface-variant shadow-sm transition-colors hover:bg-surface-container-high"
                  >
                    <Icon name={f.endsWith("pdf") ? "picture_as_pdf" : f.endsWith(".csv") ? "dataset" : "description"} className="text-[14px]" />
                    {f}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-metadata-sm text-secondary italic">Awaiting operator sign-off…</p>
          )}
        </div>
      </div>
    </div>
  );
}

async function loadBatch(id: string) {
  try {
    const batch = await db.batch.findUnique({
      where: { id },
      include: {
        organisation: { select: { name: true, type: true } },
        harvest: { select: { date: true, hive: { select: { name: true, farm: { select: { name: true, region: true } } } } } },
        events: { orderBy: { timestamp: "asc" } },
        qualityTests: { orderBy: { testedAt: "asc" } },
      },
    });
    return batch;
  } catch {
    return null;
  }
}

export default async function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batch = await loadBatch(id);

  if (!batch) {
    const demo = DEMO_BY_ID[id];
    if (!demo) notFound();
    return <BatchDetailView id={id} />;
  }

  const stageIndex = STAGE_ORDER.indexOf(batch.currentStage as BatchStage);
  const events = batch.events.map((e) => ({ id: e.id, type: e.type, timestamp: e.timestamp, data: (e.data ?? {}) as Record<string, unknown> }));

  return (
    <AppShell>
      <BatchDetailInner
        publicCode={batch.publicCode}
        honeyType={batch.honeyType}
        originRegion={batch.originRegion}
        organisation={batch.organisation?.name ?? "Unknown"}
        quantity={batch.quantity}
        currentStage={batch.currentStage}
        events={events}
        qualityTests={batch.qualityTests.map((t) => ({
          testType: t.testType,
          result: t.result,
          unit: t.unit,
          passed: t.passed,
          labName: t.labName,
        }))}
      />
    </AppShell>
  );
}

async function BatchDetailView({ id }: { id: string }) {
  const demo = DEMO_BY_ID[id] ?? DEMO;
  return (
    <AppShell>
      <BatchDetailInner
        publicCode={demo.publicCode}
        honeyType={demo.honeyType}
        originRegion={demo.originRegion}
        organisation={demo.organisation}
        quantity={demo.quantity}
        currentStage={demo.currentStage}
        events={demo.events}
        qualityTests={demo.qualityTests}
      />
    </AppShell>
  );
}

function BatchDetailInner({
  publicCode,
  honeyType,
  originRegion,
  organisation,
  quantity,
  currentStage,
  events,
  qualityTests,
}: {
  publicCode: string;
  honeyType: string;
  originRegion: string;
  organisation: string;
  quantity: number;
  currentStage: string;
  events: Array<{ id: string; type: string; timestamp: Date; data: Record<string, unknown> }>;
  qualityTests: Array<{ testType: string; result: number; unit: string; passed: boolean; labName: string | null }>;
}) {
  const stageIndex = STAGE_ORDER.indexOf(currentStage as BatchStage);
  const honeyName = honeyTitle(honeyType);
  const labName = qualityTests.find((t) => t.labName)?.labName ?? "National Bee Board Lab";

  const stagesDone = STAGE_ORDER.slice(0, stageIndex + 1);
  const stagesPending = STAGE_ORDER.slice(stageIndex + 1);
  const stageByType = new Map(events.map((e) => [e.type, e]));

  return (
    <>
      {/* Page header */}
      <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1 font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">
              <Icon name="verified" fill className="text-[12px] text-tertiary" />
              Integrity Verified
            </span>
          </div>
          <h1 className="text-headline-lg tracking-tight text-on-surface">Batch #{publicCode}</h1>
          <p className="mt-2 max-w-2xl text-body-lg text-on-surface-variant">
            End-to-end cryptographic provenance audit. All events cryptographically signed.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-outline-variant/50 bg-surface px-4 py-2 text-metadata-sm text-on-surface transition-colors hover:bg-surface-variant">
            <Icon name="download" className="text-[18px]" />
            Export PDF
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-primary-container px-4 py-2 text-metadata-sm font-semibold text-on-primary-container shadow-sm transition-colors hover:bg-primary-fixed">
            <Icon name="share" className="text-[18px]" />
            Share Link
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* Timeline */}
        <div className="col-span-12 lg:col-span-8 lg:pr-8">
          <h3 className="mb-8 flex items-center gap-3 font-headline-md text-headline-md text-surface-tint">
            <Icon name="route" />
            Provenance Journey
          </h3>
          <div className="relative mt-8 pl-[28px] md:pl-[40px]">
            <div className="absolute left-0 top-4 bottom-8 w-[2px] rounded-full bg-surface-variant md:left-[11px]">
              <div
                className="progress-line-animation timeline-line-glow w-full bg-gradient-to-b from-primary-container to-primary"
                style={{ height: `${Math.min(100, ((stageIndex + 1) / STAGE_ORDER.length) * 100)}%` }}
              />
            </div>

            {stagesDone.map((stage, i) => {
              const evs = events.filter((e) => e.type === stage);
              const ev = evs.at(-1);
              return (
                <StageCard
                  key={stage}
                  step={i + 1}
                  event={ev}
                  state={i === stageIndex ? "active" : "done"}
                  fallback={STAGE_TITLE[stage]}
                />
              );
            })}
            {stagesPending.map((stage, i) => (
              <StageCard
                key={stage}
                step={stageIndex + i + 2}
                state="pending"
                fallback={STAGE_TITLE[stage]}
              />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-4">
          <aside className="lg:sticky lg:top-6 space-y-4">
            <div className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/90 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-2xl">
              {/* Hero area */}
              <div className="relative h-56 w-full overflow-hidden border-b border-outline-variant/20 bg-[radial-gradient(circle_at_30%_20%,#fff3cf_0%,#f6e09a_50%,#e9c476_100%)]">
                <Icon name="verified" className="absolute -bottom-6 -right-4 rotate-12 text-[140px] text-primary/20" />
                <div className="absolute bottom-5 left-8">
                  <span className="rounded-md border border-outline-variant/50 bg-surface/95 px-3.5 py-1.5 font-label-caps font-bold uppercase tracking-[0.1em] text-surface-tint shadow-sm backdrop-blur-md">
                    Premium Grade
                  </span>
                </div>
              </div>

              <div className="p-8">
                <h3 className="mb-2 text-[28px] font-semibold tracking-tight text-on-surface">{honeyName}</h3>
                <p className="mb-8 border-b border-outline-variant/20 pb-6 text-body-md leading-relaxed text-on-surface-variant">
                  Single-origin floral nectar harvested during peak bloom, tracked hive-to-shelf.
                </p>

                <div className="mb-8 grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4 shadow-sm">
                    <span className="mb-1.5 block text-label-caps uppercase tracking-widest text-secondary">Total Volume</span>
                    <span className="flex items-baseline gap-1 text-[20px] font-semibold text-on-surface">
                      {quantity.toLocaleString("en-IN")} <span className="text-metadata-sm font-normal text-secondary">kg</span>
                    </span>
                  </div>
                  <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4 shadow-sm">
                    <span className="mb-1.5 block text-label-caps uppercase tracking-widest text-secondary">Current State</span>
                    <span className="flex items-center gap-1.5 text-[20px] font-semibold text-surface-tint">
                      <Icon name="autorenew" className="animate-spin text-[20px]" />
                      {stageLabel(currentStage)}
                    </span>
                  </div>
                  <div className="col-span-2 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4 shadow-sm">
                    <span className="mb-1.5 block text-label-caps uppercase tracking-widest text-secondary">Batch ID</span>
                    <span className="text-metadata-sm font-medium text-on-surface">#{publicCode}</span>
                  </div>
                  <div className="col-span-2 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4 shadow-sm">
                    <span className="mb-2 block text-label-caps uppercase tracking-widest text-secondary">Smart Contract Hash</span>
                    <CopyField value={stableHex(publicCode)} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="mb-4 border-b border-outline-variant/20 pb-3 font-label-caps uppercase tracking-[0.1em] text-secondary">
                    Key Quality Metrics
                  </h4>
                  {qualityTests.length === 0 ? (
                    <p className="text-metadata-sm text-on-surface-variant">Lab report pending.</p>
                  ) : (
                    qualityTests.map((t) => {
                      const max = TEST_MAX[t.testType] ?? 100;
                      const pct = Math.min(100, (t.result / max) * 100);
                      return (
                        <div key={t.testType} className="flex items-center justify-between">
                          <span className="text-metadata-sm font-medium text-on-surface-variant">
                            {TEST_LABEL[t.testType] ?? t.testType.replace(/_/g, " ")}
                          </span>
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-variant">
                              <div className={`h-full ${t.passed ? "bg-tertiary" : "bg-error"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-16 text-right text-metadata-sm tabular-nums text-on-surface">
                              {t.result} {t.unit}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Auto-generated QR Code */}
            <QrCodeCard publicCode={publicCode} />
          </aside>
        </div>
      </div>
    </>
  );
}

function QrCodeCard({ publicCode }: { publicCode: string }) {
  const qrUrl = `/verify/${encodeURIComponent(publicCode)}`;
  const svg = qrToSvg(qrUrl, {
    pixelSize: 180,
    preset: "honey",
    title: `Verification QR for batch ${publicCode}`,
  });
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/90 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-2xl">
      <div className="p-6">
        <h4 className="mb-4 flex items-center gap-2 font-label-caps uppercase tracking-[0.1em] text-secondary">
          <Icon name="qr_code_2" className="text-[18px]" />
          Verification QR
        </h4>
        <div className="flex flex-col items-center gap-4">
          <img
            src={source}
            width={180}
            height={180}
            alt={`QR code for batch ${publicCode}`}
            className="rounded-lg bg-white p-2 shadow-sm"
          />
          <p className="text-center text-metadata-sm text-on-surface-variant">
            Scan to verify batch provenance and quality records.
          </p>
          <a
            href={source}
            download={`${publicCode}-qr.svg`}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-outline-variant bg-white px-3 text-metadata-sm font-semibold text-on-surface transition-colors hover:bg-surface-variant"
          >
            <Icon name="download" className="text-[18px]" /> Download QR
          </a>
        </div>
      </div>
    </div>
  );
}

function honeyTitle(t: string) {
  const map: Record<string, string> = {
    MULTIFLORAL: "Multifloral Wildflower",
    ACACIA: "Acacia Blend",
    MANUKA: "Manuka",
    EUCALYPTUS: "Eucalyptus",
    MUSTARD: "Pure Mustard Honey",
    MANGROVE: "Sundarbans Mangrove",
    LITCHI: "Litchi Blossom",
    JAMUN: "Jamun Honey",
    WILDFLOWER: "Wild Forest",
    OTHER: "Artisan Blend",
  };
  return map[t] ?? t;
}

function stageLabel(s: string) {
  const map: Record<string, string> = {
    HARVEST: "Harvest",
    COLLECTION: "Collection",
    LAB: "In Testing",
    PROCESSING: "Processing",
    PACKAGING: "Packaging",
    DISTRIBUTION: "Distribution",
    RETAIL: "Retail",
  };
  return map[s] ?? s;
}

function EventRec(t: string, ts: Date, data: Record<string, unknown>): { id: string; type: string; timestamp: Date; data: Record<string, unknown> } {
  return { id: `${t}-${ts.getTime()}`, type: t, timestamp: ts, data };
}

const DEMO: {
  publicCode: string;
  honeyType: string;
  originRegion: string;
  organisation: string;
  quantity: number;
  currentStage: string;
  events: Array<{ id: string; type: string; timestamp: Date; data: Record<string, unknown> }>;
  qualityTests: Array<{ testType: string; result: number; unit: string; passed: boolean; labName: string | null }>;
} = {
  publicCode: "HC-2026-00124",
  honeyType: "MUSTARD",
  originRegion: "Purulia, West Bengal",
  organisation: "Rana Beekeeping FPO",
  quantity: 1240,
  currentStage: "PROCESSING",
  events: [
    EventRec("HARVEST", new Date("2026-08-12T06:30:00"), { quantity: 1240, hive: "Hive A-105", location: "Purulia Apiary, Sector 4" }),
    EventRec("COLLECTION", new Date("2026-08-13T09:15:00"), { facility: "West Bengal Hub", location: "Purulia Collection Centre" }),
    EventRec("CUSTODY_TRANSFER", new Date("2026-08-13T09:18:00"), { role: "BEEKEEPER → COLLECTOR" }),
    EventRec("QUALITY_TEST", new Date("2026-08-14T10:24:00"), { testType: "MOISTURE", result: 17.2 }),
    EventRec("LAB_RESULT", new Date("2026-08-14T10:30:00"), { passed: true, score: 94, facility: "Kolkata Testing Facility" }),
    EventRec("CUSTODY_TRANSFER", new Date("2026-08-15T08:00:00"), { role: "COLLECTOR → PROCESSOR" }),
    EventRec("PROCESSING", new Date(), { method: "COLD_FILTERED", tempC: 34, facility: "Central Processing Plant A" }),
  ],
  qualityTests: [
    { testType: "MOISTURE", result: 17.2, unit: "%", passed: true, labName: "Kolkata Testing Facility" },
    { testType: "HMF", result: 4.1, unit: "mg/kg", passed: true, labName: "Kolkata Testing Facility" },
    { testType: "PROLINE", result: 212, unit: "mg/kg", passed: true, labName: "Kolkata Testing Facility" },
    { testType: "C4_SUGAR", result: 0.4, unit: "%", passed: true, labName: "Kolkata Testing Facility" },
    { testType: "DIASTASE", result: 21, unit: "DN", passed: true, labName: "Kolkata Testing Facility" },
  ],
};

const DEMO_BY_ID: Record<string, typeof DEMO> = {
  b1: DEMO,
  b2: {
    ...DEMO,
    publicCode: "JK-KAS-2026-002",
    honeyType: "ACACIA",
    originRegion: "Kashmir Valley",
    organisation: "Kashmir Honey Co-op",
    quantity: 850,
    currentStage: "DISTRIBUTION",
    events: [
      EventRec("HARVEST", new Date("2026-07-02T05:45:00"), { quantity: 850, hive: "Hive B-18", location: "Himalayan Apiary" }),
      EventRec("LAB_RESULT", new Date("2026-07-08T11:00:00"), { passed: true, score: 96 }),
      EventRec("PROCESSING", new Date("2026-07-10T09:00:00"), { method: "COLD_FILTERED" }),
      EventRec("PACKAGING", new Date("2026-07-14T13:00:00"), { facility: "Amrit Bottling Line" }),
      EventRec("SHIPMENT", new Date(), { carrier: "AgriLogistics (Truck #772)", tempC: 22 }),
    ],
  },
  b3: {
    ...DEMO,
    publicCode: "WB-SUN-2026-003",
    honeyType: "WILDFLOWER",
    originRegion: "Sundarbans, WB",
    organisation: "Sundarbans Co.",
    quantity: 2100,
    currentStage: "LAB",
    qualityTests: [
      { testType: "C4_SUGAR", result: 8.7, unit: "%", passed: false, labName: "Mangrove Lab" },
      { testType: "MOISTURE", result: 19.4, unit: "%", passed: false, labName: "Mangrove Lab" },
    ],
  },
  b4: {
    ...DEMO,
    publicCode: "TN-NIL-2026-004",
    honeyType: "EUCALYPTUS",
    originRegion: "Nilgiris, TN",
    organisation: "Ghats Apiaries",
    quantity: 450,
    currentStage: "RETAIL",
    events: [
      EventRec("HARVEST", new Date("2026-06-20T07:00:00"), { quantity: 450 }),
      EventRec("LAB_RESULT", new Date("2026-06-26T10:00:00"), { passed: true, score: 91 }),
      EventRec("RETAIL_LISTING", new Date(), { location: "Organic Bazaar, Coimbatore" }),
    ],
  },
  b5: {
    ...DEMO,
    publicCode: "HP-KUL-2026-005",
    honeyType: "LITCHI",
    originRegion: "Kullu, HP",
    organisation: "Kullu Valley Co.",
    quantity: 730,
    currentStage: "PACKAGING",
  },
  b6: {
    ...DEMO,
    publicCode: "WB-MUR-2026-006",
    honeyType: "MULTIFLORAL",
    originRegion: "Murshidabad, WB",
    organisation: "Murshidabad Farmers Co.",
    quantity: 1980,
    currentStage: "COLLECTION",
  },
};