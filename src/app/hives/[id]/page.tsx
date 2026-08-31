import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { Pill, ProgressBar } from "@/components/ui";
import { TrendChart, HBar } from "@/components/charts";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Hive ${id}` };
}

const TYPE_LABEL: Record<string, string> = {
  LANGSTROTH: "Langstroth",
  TOP_BAR: "Top-Bar",
  WARRE: "Warré",
  OTHER: "Other",
};

async function loadHive(id: string) {
  try {
    return await db.hive.findUnique({
      where: { id },
      include: {
        farm: { select: { name: true, region: true, location: true } },
        harvests: { orderBy: { date: "desc" }, take: 30, select: { id: true, date: true, quantity: true, honeyType: true } },
      },
    });
  } catch {
    return null;
  }
}

export default async function HiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hive = await loadHive(id);
  if (!hive) {
    const demo = DEMO_BY_ID[id];
    if (!demo) notFound();
    return <HiveDetailView demo={demo} />;
  }
  const demo = {
    id: hive.id,
    name: hive.name,
    type: TYPE_LABEL[hive.type] ?? hive.type,
    status: hive.status,
    farm: hive.farm?.name ?? "Unassigned",
    region: hive.farm?.region ?? "—",
    harvests: hive.harvests.map((h) => ({ date: h.date, quantity: h.quantity, honeyType: h.honeyType })),
  };
  return <HiveDetailView demo={demo} />;
}

function HiveDetailView({
  demo,
}: {
  demo: {
    id: string;
    name: string;
    type: string;
    status: string;
    farm: string;
    region: string;
    harvests: Array<{ date: Date; quantity: number; honeyType: string }>;
  };
}) {
  const statusPill: "tertiary" | "warn" | "error" | "surface" =
    demo.status === "ACTIVE" ? "tertiary" : demo.status === "INSPECTION" ? "warn" : demo.status === "COLONY_LOSS" ? "error" : "surface";
  const statusDot = demo.status === "ACTIVE" ? "bg-tertiary" : demo.status === "INSPECTION" ? "bg-primary" : "bg-error";
  const spark = demo.harvests.length >= 2 ? demo.harvests.slice(0, 8).map((h) => h.quantity).reverse() : [8, 9, 12, 10, 11, 12, 13, 12];
  const labels = demo.harvests.length >= 2 ? demo.harvests.slice(0, 8).map((h, i) => `${i + 1}`).reverse() : ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"];

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Link href="/hives" className="inline-flex items-center gap-1 text-metadata-sm font-medium uppercase tracking-wider text-on-surface-variant hover:text-primary">
              <Icon name="chevron_left" className="text-[16px]" />
              Hive Fleet
            </Link>
          </div>
          <h1 className="flex items-center gap-3 text-headline-lg tracking-tight text-on-surface">
            {demo.name}
            <Pill tone={statusPill} dot={statusDot}>
              {demo.status.replace(/_/g, " ")}
            </Pill>
          </h1>
          <p className="mt-1 text-body-lg text-on-surface-variant">
            {demo.farm} · {demo.region} · {demo.type}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-outline-variant/50 bg-surface px-4 py-2 text-metadata-sm text-on-surface transition-colors hover:bg-surface-variant">
            <Icon name="inspection" className="text-[18px]" />
            Log Inspection
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-primary-container px-4 py-2 text-metadata-sm font-semibold text-on-primary-container shadow-sm transition-colors hover:bg-primary-fixed">
            <Icon name="agriculture" className="text-[18px]" />
            Log Harvest
          </button>
        </div>
      </div>

      {/* Live telemetry */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {[
          { icon: "thermostat", label: "Internal Temp", value: "35.2°C", cls: "text-on-surface" },
          { icon: "water_drop", label: "Humidity", value: "62%", cls: "text-on-surface" },
          { icon: "scale", label: "Hive Weight", value: "42 kg", cls: "text-on-surface" },
          { icon: "hive", label: "Est. Prod.", value: "12 kg", cls: "text-tertiary" },
        ].map((m) => (
          <div key={m.label} className="metric-card rounded-xl p-5 transition-shadow hover:shadow-md">
            <p className="mb-4 flex items-center gap-2 text-label-caps uppercase tracking-wider text-on-surface-variant">
              <Icon name={m.icon} className="text-[18px]" />
              {m.label}
            </p>
            <p className={`text-headline-md tabular-nums tracking-tight ${m.cls}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trends + history */}
        <div className="space-y-6 lg:col-span-2">
          <div className="glass-card rounded-xl p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-metadata-sm font-semibold text-on-surface">
                Weight &amp; Influences (30 Days)
              </h3>
              <div className="flex items-center gap-1.5 text-metadata-sm text-on-surface-variant">
                <span className="h-2 w-2 rounded-full bg-primary-container" />
                Nectar Inflow
                <span className="h-2 w-2 rounded-full bg-tertiary" />
                Weight Gain
              </div>
            </div>
            <TrendChart labels={labels} values={spark} tone="#3b6934" />
          </div>

          <div className="glass-card rounded-xl p-6">
            <h3 className="mb-4 text-metadata-sm font-semibold text-on-surface">Recent Harvests</h3>
            {demo.harvests.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">No harvests recorded for this hive yet.</p>
            ) : (
              <div className="divide-y divide-outline-variant/15">
                {demo.harvests.slice(0, 6).map((h) => (
                  <div key={`${h.date}-${h.quantity}`} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-tertiary-container/40 text-tertiary">
                        <Icon name="water_drop" className="text-[18px]" />
                      </span>
                      <div>
                        <p className="text-body-md font-medium text-on-surface">
                          {h.honeyType.replace(/_/g, " ")} extraction
                        </p>
                        <p className="text-metadata-sm text-on-surface-variant">
                          {h.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <span className="text-body-md font-semibold tabular-nums text-on-surface">{h.quantity} kg</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* HIVE INTELLIGENCE panel */}
        <div className="rounded-xl bg-inverse-surface p-6 text-inverse-on-surface shadow-lg">
          <p className="mb-4 text-label-caps tracking-wider text-primary-container">HIVE INTELLIGENCE</p>
          <div className="flex items-center justify-between">
            <span className="text-metadata-sm text-secondary-fixed-dim">Health Score</span>
            <span className="text-[28px] font-bold tracking-tight" style={{ color: "#9fd292" }}>
              88
            </span>
          </div>
          <ProgressBar value={88} tone="tertiary" className="mt-2" />
          <div className="mt-6 mb-3 flex items-center gap-2">
            <Icon name="sensors" className="text-[20px] text-primary-container" />
            <span className="text-label-caps uppercase tracking-widest text-secondary-fixed-dim">
              Signature Analysis
            </span>
          </div>
          <div className="space-y-4">
            <HBar label="Brood Viability" value={92} tone="#9fd292" />
            <HBar label="Foraging Activity" value={78} tone="#ffba20" />
            <HBar label="Queen Health" value={85} tone="#9fd292" />
            <HBar label="Stress Index" value={34} tone="#e2dfde" />
          </div>

          <div className="mt-6">
            <h4 className="mb-3 text-label-caps uppercase tracking-widest text-secondary-fixed-dim">
              Key Evidence
            </h4>
            <ul className="space-y-2 text-metadata-sm">
              <li className="flex items-center gap-2">
                <Icon name="check_circle" fill className="text-[18px] text-tertiary-fixed-dim" />
                Sustained weight gain 6 of 7 days
              </li>
              <li className="flex items-center gap-2">
                <Icon name="check_circle" fill className="text-[18px] text-tertiary-fixed-dim" />
                Temperature stable within band
              </li>
              <li className="flex items-center gap-2">
                <Icon name="warning" className="text-[18px] text-primary-container" />
                Varroa pressure index climbing
              </li>
            </ul>
          </div>

          <div className="mt-6 rounded-lg border border-primary-container/30 p-3.5">
            <h4 className="mb-1.5 flex items-center gap-1.5 text-label-caps uppercase tracking-widest text-primary-container">
              <Icon name="tips_and_updates" className="text-[16px]" />
              Recommendation
            </h4>
            <p className="text-metadata-sm leading-relaxed text-inverse-on-surface/90">
              Schedule a hive inspection within 24 hours to check for swarming preparation or queen health.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

const DEMO_BY_ID: Record<string, Parameters<typeof HiveDetailView>[0]["demo"]> = {
  hive_a105: {
    id: "hive_a105",
    name: "Hive A-105",
    type: "Langstroth",
    status: "ACTIVE",
    farm: "Purulia Apiary",
    region: "Sector 4",
    harvests: [
      { date: new Date("2026-08-12T06:30:00"), quantity: 12, honeyType: "MUSTARD" },
      { date: new Date("2026-07-28T07:00:00"), quantity: 11.2, honeyType: "MUSTARD" },
      { date: new Date("2026-07-10T06:45:00"), quantity: 10.5, honeyType: "MUSTARD" },
      { date: new Date("2026-06-24T07:15:00"), quantity: 13.1, honeyType: "MULTIFLORAL" },
    ],
  },
};