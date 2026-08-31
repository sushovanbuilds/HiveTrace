import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { Pill } from "@/components/ui";
import { db } from "@/lib/db";

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
  let hives: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    farm: { name: string; region: string } | null;
    harvestCount: number;
    lastHarvest: { date: Date; quantity: number; honeyType: string } | null;
  }> = [];
  let total = 0;

  try {
    const [rows, count] = await Promise.all([
      db.hive.findMany({
        include: {
          farm: { select: { name: true, region: true } },
          _count: { select: { harvests: true } },
          harvests: { orderBy: { date: "desc" }, take: 1, select: { date: true, quantity: true, honeyType: true } },
        },
        orderBy: { name: "asc" },
      }),
      db.hive.count(),
    ]);
    hives = rows.map((h) => ({
      id: h.id,
      name: h.name,
      type: h.type,
      status: h.status,
      farm: h.farm,
      harvestCount: h._count.harvests,
      lastHarvest: h.harvests[0] ?? null,
    }));
    total = count;
  } catch {
    hives = DEMO_HIVES;
    total = DEMO_HIVES.length;
  }

  return (
    <AppShell>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-headline-lg tracking-tight text-on-surface">Hive Fleet</h1>
          <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">
            {total} registered hives across your apiaries — telemetry, health and productivity at a glance.
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {hives.map((h) => {
          const sp = STATUS_PILL[h.status] ?? STATUS_PILL.ACTIVE;
          return (
            <Link
              key={h.id}
              href={`/hives/${h.id}`}
              className="group relative overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-[40px] bg-primary-container/10" />
              <div className="mb-4 flex items-start justify-between">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary-container/50 text-on-secondary-container">
                  <Icon name="hive" fill className="text-[24px]" />
                </span>
                <Pill tone={sp.tone}>{sp.label}</Pill>
              </div>
              <h3 className="text-headline-md tracking-tight text-on-surface">{h.name}</h3>
              <p className="mt-0.5 text-metadata-sm text-on-surface-variant">
                {h.farm ? `${h.farm.name} · ${h.farm.region}` : "Unassigned apiary"}
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
              <p className="mt-2 text-[12px] text-on-surface-variant">
                {h.lastHarvest
                  ? `Last harvest ${h.lastHarvest.quantity} kg · ${new Date(h.lastHarvest.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                  : "No harvests recorded yet"}
              </p>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}

const DEMO_HIVES = [
  { id: "hive_a105", name: "Hive A-105", type: "LANGSTROTH", status: "ACTIVE", farm: { name: "Purulia Apiary", region: "Sector 4" }, harvestCount: 12, lastHarvest: { date: new Date("2026-08-12T06:30:00"), quantity: 12, honeyType: "MUSTARD" } },
  { id: "hive_a106", name: "Hive A-106", type: "LANGSTROTH", status: "ACTIVE", farm: { name: "Purulia Apiary", region: "Sector 4" }, harvestCount: 9, lastHarvest: { date: new Date("2026-08-11T07:00:00"), quantity: 9.5, honeyType: "MUSTARD" } },
  { id: "hive_b220", name: "Hive B-220", type: "TOP_BAR", status: "INSPECTION", farm: { name: "Kashmir Valley", region: "Kullu" }, harvestCount: 6, lastHarvest: { date: new Date("2026-07-30T08:00:00"), quantity: 7, honeyType: "LITCHI" } },
  { id: "hive_c340", name: "Hive C-340", type: "LANGSTROTH", status: "ACTIVE", farm: { name: "Sundarbans Reserve", region: "Gosaba" }, harvestCount: 14, lastHarvest: { date: new Date("2026-08-02T05:45:00"), quantity: 15.2, honeyType: "MANGROVE" } },
  { id: "hive_d105", name: "Hive D-105", type: "WARRE", status: "COLONY_LOSS", farm: { name: "Murshidabad Co-op", region: "Suti" }, harvestCount: 3, lastHarvest: null },
  { id: "hive_e880", name: "Hive E-880", type: "LANGSTROTH", status: "ACTIVE", farm: { name: "Ghats Apiaries", region: "Nilgiris" }, harvestCount: 8, lastHarvest: { date: new Date("2026-06-20T07:10:00"), quantity: 6.8, honeyType: "EUCALYPTUS" } },
];