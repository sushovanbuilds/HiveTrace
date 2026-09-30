import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { Pill } from "@/components/ui";
import { ApiaryOverview } from "@/components/hiveos/apiary-overview";
import { AttentionPanel } from "@/components/hiveos/attention-panel";
import { STATE_DOT, STATE_TONE } from "@/components/hiveos/health-badge";
import { getApiaryOS, getHiveFleet } from "@/lib/hiveos/service";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<string, { tone: "tertiary" | "warn" | "error" | "surface"; label: string }> = {
  ACTIVE: { tone: "tertiary", label: "Active" },
  INSPECTION: { tone: "warn", label: "Inspection" },
  INACTIVE: { tone: "surface", label: "Inactive" },
  COLONY_LOSS: { tone: "error", label: "Colony Loss" },
};

const TYPE_LABEL: Record<string, string> = {
  LANGSTROTH: "Langstroth",
  TOP_BAR: "Top-Bar",
  WARRE: "Warré",
  OTHER: "Other",
};

export default async function HivesPage() {
  const [fleet, { intelligence }] = await Promise.all([getHiveFleet(), getApiaryOS()]);

  return (
    <AppShell>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-headline-lg tracking-tight text-on-surface">Hive Fleet</h1>
          <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">
            {fleet.length} registered hives across your apiaries — telemetry, health and productivity at a glance.
          </p>
        </div>
        <Link
          href="/hives?new=1"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-body-md font-medium text-on-primary shadow-sm transition-all active:scale-[0.98]"
        >
          <Icon name="add" className="text-[20px]" />
          Register Hive
        </Link>
      </div>

      <ApiaryOverview intelligence={intelligence} />

      <AttentionPanel />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {fleet.map((h) => {
          const sp = STATUS_PILL[h.status] ?? STATUS_PILL.ACTIVE;
          return (
            <Link
              key={h.id}
              href={`/hives/${h.id}`}
              className="group relative overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-[40px] bg-primary-container/10" />
              <div className="mb-4 flex items-start justify-between gap-2">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary-container/50 text-on-secondary-container">
                  <Icon name="hive" fill className="text-[24px]" />
                </span>
                <div className="flex flex-col items-end gap-1.5">
                  <Pill tone={sp.tone}>{sp.label}</Pill>
                  <Pill tone={STATE_TONE[h.state]} dot={STATE_DOT[h.state]}>
                    {h.state} · {h.score}
                  </Pill>
                </div>
              </div>
              <h3 className="text-headline-md tracking-tight text-on-surface">{h.name}</h3>
              <p className="mt-0.5 text-metadata-sm text-on-surface-variant">
                {h.farm} · {h.region}
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-outline-variant/20 pt-4 text-metadata-sm">
                <span className="inline-flex items-center gap-1.5 text-on-surface-variant">
                  <Icon name="category" className="text-[16px]" />
                  {TYPE_LABEL[h.type] ?? h.type}
                </span>
                <span className="inline-flex items-center gap-1.5 text-tertiary">
                  <Icon name="water_drop" className="text-[16px]" />
                  {h.harvestCount} harvests
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
