import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { ButtonLink, Card } from "@/components/ui";

const JOURNEY = [
  { eye: "Purulia", name: "Source & Origin", icon: "landscape", desc: "Geo-tagged nectar source, floral bloom and apiary certification." },
  { eye: "Extraction", name: "Raw Honey Extraction", icon: "water_drop", desc: "Temperature and humidity wrapped into the batch record at source." },
  { eye: "Purulia", name: "Packaging", icon: "package_2", desc: "Sealed with tamper-evident custody label and unique QR." },
  { eye: "Kolkata", name: "Lab Testing", icon: "science", desc: "Full purity panel — moisture, HMF, C4 sugars, pollen DNA." },
  { eye: "Sundarbans", name: "Warehouse & Inventory", icon: "warehouse", desc: "Pallet movements synced and custody hand-overs anchored." },
  { eye: "On-The-Move", name: "Distribution", icon: "local_shipping", desc: "Each leg recorded; cold-chain telemetry pushed to ledger." },
  { eye: "Kolkata", name: "Consumer Verify", icon: "qr_code_scanner", desc: "Scan the label anywhere — the full journey recomputes on-chain." },
];

export default function TraceabilityPage() {
  return (
    <AppShell>
      <div className="mb-8 max-w-3xl">
        <h1 className="text-headline-lg tracking-tight text-on-surface">Traceability Overview</h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          From bloom to bottle — every hop in a honey&apos;s journey is recorded, hashed and anchored. Verify any batch in seconds.
        </p>
      </div>

      <div className="mb-10 flex flex-col gap-4 rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-5 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
<Icon name="qr_code_2" className="text-[32px] text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-headline-md tracking-tight text-on-surface">Verify a batch</p>
            <p className="text-metadata-sm text-on-surface-variant">Paste a public code, or scan the QR on any HiveTrace label.</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface px-4 py-3 md:max-w-sm md:flex-1">
          <Icon name="search" className="text-[20px] text-on-surface-variant" />
          <input placeholder="WB-PUR-2026-001…" className="w-full min-w-0 bg-transparent text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none" />
        </div>
        <div className="flex shrink-0 gap-3">
          <ButtonLink href="/verify" variant="primary" icon="qr_code_scanner">Scan</ButtonLink>
          <ButtonLink href="/batches" variant="outline">Browse all</ButtonLink>
        </div>
      </div>

      {/* Journey pipeline */}
      <h2 className="mb-6 flex items-center gap-2 text-headline-md tracking-tight text-on-surface">
        <Icon name="route" className="text-[26px] text-secondary" />
        A batch&apos;s journey
      </h2>
      <div className="mb-6 overflow-x-auto no-scrollbar">
        <div className="flex min-w-[960px] items-stretch gap-2">
          {JOURNEY.map((j, i) => (
            <div key={j.name} className="flex flex-1 items-stretch gap-2">
              <div className="flex flex-1 flex-col rounded-xl border border-outline-variant/25 bg-surface-container-lowest p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-container/30 text-primary">
                    <Icon name={j.icon} className="text-[18px]" />
                  </span>
                  <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-bold tabular-nums text-on-surface-variant">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="text-label-caps uppercase tracking-widest text-on-surface-variant">{j.eye}</p>
                <h3 className="mt-1 text-body-md font-semibold leading-snug text-on-surface">{j.name}</h3>
                <p className="mt-1.5 text-metadata-sm leading-relaxed text-on-surface-variant">{j.desc}</p>
                <div className="mt-auto pt-3 text-metadata-sm font-medium text-tertiary">
                  <span className="inline-flex items-center gap-1">
                    <Icon name="verified" className="text-[14px]" /> anchored
                  </span>
                </div>
              </div>
              {i < JOURNEY.length - 1 && (
                <span className="flex items-center text-outline">
                  <Icon name="chevron_right" className="text-[20px]" />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {[
          {
            icon: "capture",
            title: "Capture at source",
            body: "Every event — harvest, extraction, test, hand-off — gets a signed, tamper-evident record with sensor telemetry.",
            tone: "primary" as const,
          },
          {
            icon: "link",
            title: "Anchor on-chain",
            body: "Records are bundle-hashed into a Merkle root and anchored to Polygon within 60 seconds of the event.",
            tone: "tertiary" as const,
          },
          {
            icon: "qr_code_scanner",
            title: "Verify anywhere",
            body: "Scan the label — the app recomputes the hash chain and proves the record is unaltered since harvest.",
            tone: "error" as const,
          },
        ].map((s) => (
          <Card key={s.title} className="relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <div className={`absolute inset-x-0 top-0 h-1 ${s.tone === "primary" ? "bg-primary" : s.tone === "tertiary" ? "bg-tertiary" : "bg-error-container"}`} />
            <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${
              s.tone === "primary" ? "bg-primary-container/40 text-primary" : s.tone === "tertiary" ? "bg-tertiary-container/50 text-tertiary" : "bg-error-container text-on-error-container"
            }`}>
              <Icon name={s.icon} className="text-[24px]" />
            </span>
            <h3 className="mt-4 text-headline-md tracking-tight text-on-surface">{s.title}</h3>
            <p className="mt-2 text-body-md text-on-surface-variant">{s.body}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 rounded-xl bg-inverse-surface p-6 text-inverse-on-surface">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h3 className="text-[20px] font-semibold tracking-tight">See it in action</h3>
            <p className="mt-1 text-metadata-sm text-inverse-on-surface/80">
              Open a live batch and walk its provenance timeline step by step.
            </p>
          </div>
          <ButtonLink href="/batches/b1" icon="open_in_new">Open sample batch</ButtonLink>
        </div>
      </div>
    </AppShell>
  );
}