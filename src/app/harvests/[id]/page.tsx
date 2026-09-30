import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { GlassCard, Pill, qualityPill, riskPill, stageLabel } from "@/components/ui";
import { TraceChainStrip, ChainLink } from "@/components/trace/journey";
import { buildJourneyStages, CANONICAL_STAGES, currentStageToCanonical, getHarvestDetail } from "@/lib/trace/chain";

export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function honeyTitle(t: string): string {
  const map: Record<string, string> = {
    MULTIFLORAL: "Multifloral",
    MANUKA: "Manuka",
    EUCALYPTUS: "Eucalyptus",
    MUSTARD: "Mustard",
    MANGROVE: "Mangrove",
    LITCHI: "Litchi",
    OTHER: "Other",
  };
  return map[t] ?? t.replace(/_/g, " ");
}

export default async function HarvestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getHarvestDetail(id);

  if (!detail) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl py-24 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container text-on-surface-variant">
            <Icon name="agriculture" className="text-[30px]" />
          </span>
          <h1 className="mt-4 text-headline-md text-on-surface">Harvest unavailable</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            This harvest record could not be loaded — it may not exist, or the database is unreachable.
          </p>
          <Link
            href="/hives"
            className="mt-5 inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-body-md font-medium text-on-primary"
          >
            <Icon name="arrow_back" className="text-[18px]" />
            Back to hives
          </Link>
        </div>
      </AppShell>
    );
  }

  const firstBatch = detail.batches[0] ?? null;
  // Downstream stages continue per batch; the chain reflects the furthest
  // progress any batch from this harvest has reached.
  const stageRank = (stage: string | null): number => {
    const canonical = currentStageToCanonical(stage);
    return canonical ? CANONICAL_STAGES.findIndex((s) => s.key === canonical) : -1;
  };
  const furthestBatch =
    [...detail.batches].sort((a, b) => stageRank(b.currentStage) - stageRank(a.currentStage))[0] ?? null;
  const stages = buildJourneyStages({
    events: [],
    currentStage: furthestBatch?.currentStage ?? null,
    hasHive: detail.hive !== null,
    hasHarvest: true,
    hasBatch: detail.batches.length > 0,
    harvestDate: detail.date,
    notes: {
      HIVE: detail.hive ? `${detail.hive.name} · ${detail.hive.farmName}` : null,
      HARVEST: `${detail.quantity} kg · ${honeyTitle(detail.honeyType)}`,
      BATCH:
        detail.batches.length > 0
          ? detail.batches.map((b) => b.publicCode).join(", ")
          : "No batches created from this harvest yet",
      DISTRIBUTION: detail.batches.length > 0 ? "Continues per batch — see below" : null,
    },
    hrefs: {
      HIVE: detail.hive ? `/hives/${detail.hive.id}` : null,
      BATCH: firstBatch ? `/batches/${firstBatch.id}` : null,
      CONSUMER_QR: firstBatch ? `/verify/${encodeURIComponent(firstBatch.publicCode)}` : null,
    },
  });

  return (
    <AppShell>
      <Link
        href={detail.hive ? `/hives/${detail.hive.id}` : "/hives"}
        className="mb-4 inline-flex items-center gap-1 text-metadata-sm font-medium text-on-surface-variant hover:text-on-surface"
      >
        <Icon name="arrow_back" className="text-[18px]" />
        {detail.hive ? `Back to ${detail.hive.name}` : "Back to hives"}
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-metadata-sm font-medium uppercase tracking-wider text-on-surface-variant">
            Harvest · {fmtDate(detail.date)}
          </p>
          <h1 className="mt-1 text-headline-lg tracking-tight text-on-surface">
            {honeyTitle(detail.honeyType)} — {detail.quantity} kg
          </h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            {detail.hive ? (
              <>
                From <span className="font-medium text-on-surface">{detail.hive.name}</span> ·{" "}
                {detail.hive.farmName} · {detail.hive.region}
              </>
            ) : (
              "Originating hive not recorded"
            )}
          </p>
        </div>
        {detail.hive ? (
          <ChainLink href={`/hives/${detail.hive.id}`} icon="hive">
            View Hive Passport
          </ChainLink>
        ) : null}
      </div>

      <GlassCard className="mb-6 p-6">
        <h2 className="mb-4 text-headline-md text-on-surface">Where this harvest sits in the chain</h2>
        <TraceChainStrip stages={stages} />
        <p className="mt-3 text-metadata-sm text-on-surface-variant">
          Hive → Harvest → Honey Batch → Lab → Processing → Packaging → Distribution → Consumer QR.
          Downstream stages continue independently for each batch below.
        </p>
      </GlassCard>

      <h2 className="mb-4 text-headline-md text-on-surface">
        Batches from this harvest{" "}
        <span className="text-body-md font-normal text-on-surface-variant">({detail.batches.length})</span>
      </h2>

      {detail.batches.length === 0 ? (
        <GlassCard className="p-6">
          <p className="text-body-md text-on-surface-variant">
            No honey batches have been created from this harvest yet.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {detail.batches.map((b) => (
            <GlassCard key={b.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-highest text-on-surface-variant">
                    <Icon name="inventory_2" className="text-[20px]" />
                  </span>
                  <div>
                    <p className="font-mono text-body-md font-semibold text-on-surface">{b.publicCode}</p>
                    <p className="text-metadata-sm text-on-surface-variant">{stageLabel(b.currentStage)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Pill {...qualityPill(b.qualityStatus)}>{qualityPill(b.qualityStatus).label}</Pill>
                  <Pill {...riskPill(b.riskState)}>{riskPill(b.riskState).label}</Pill>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <ChainLink href={`/batches/${b.id}`} icon="inventory_2">
                  View Batch
                </ChainLink>
                <ChainLink href={`/batches/${b.id}#provenance`} icon="route">
                  View Traceability
                </ChainLink>
                <ChainLink href={`/verify/${encodeURIComponent(b.publicCode)}`} icon="qr_code_2" variant="filled">
                  Verify QR
                </ChainLink>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </AppShell>
  );
}
