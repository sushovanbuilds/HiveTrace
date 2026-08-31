"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { Button, Pill, Card } from "@/components/ui";
import { BatchCard } from "@/components/demo/batch-card";
import {
  DemoSection,
  DemoStat,
  DemoGreeting,
  DemoEmpty,
} from "@/components/demo/demo-ui";
import { useDemoWorkspace } from "@/lib/demo/hooks";
import { addHarvestBatch } from "@/lib/demo/data";
import { formatQty } from "@/components/demo/format";

const HONEY_CHOICES = [
  "Mustard Honey",
  "Litchi Honey",
  "Acacia Honey",
  "Wildflower Honey",
];

export default function KeeperPage() {
  const { user, data, ready, mutate } = useDemoWorkspace("BEEKEEPER");

  const [code, setCode] = useState("HC-2026-00124");
  const [honey, setHoney] = useState("Mustard Honey");
  const [region, setRegion] = useState("Purulia, West Bengal");
  const [qty, setQty] = useState("420");
  const [flash, setFlash] = useState<string | null>(null);

  if (!ready || !user || !data) {
    return (
      <AppShell>
        <div className="py-24 text-center text-on-surface-variant">Loading…</div>
      </AppShell>
    );
  }

  const mine = data.batches.filter((b) => b.anomaly === "NONE");
  const flagged = data.batches.filter((b) => b.anomaly !== "NONE");
  const awaitedLab = mine.filter((b) => b.quality === "PENDING").length;

  const createHarvest = () => {
    const n = Math.max(1, Number(qty) || 0);
    mutate(
      addHarvestBatch(
        data,
        {
          publicCode: code.trim(),
          honeyType: honey,
          floralSource: honey.replace(/\s+Honey$/, ""),
          originRegion: region.trim(),
          quantityKg: n,
        },
        { email: user.email, name: user.name },
      ),
    );
    setFlash(`Harvest registered — ${code.trim()} now moving through the chain.`);
  };

  const first = user.name.split(/\s+/)[0];

  return (
    <AppShell>
      <DemoGreeting
        eyebrow="Honey Keeper · Green Valley Apiaries"
        first={first}
        sub="Track your hive output, register harvests, and watch batches move downstream."
      />

      {flash ? (
        <div role="status" className="mb-6 flex items-center gap-2 rounded-xl border border-tertiary-container/30 bg-tertiary-container/20 px-4 py-3 text-body-md text-on-tertiary-container">
          <Icon name="check_circle" fill className="text-[20px]" />
          {flash}
        </div>
      ) : null}

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DemoStat label="Active hives" value="156" sub="4 apiaries" icon="hive" tone="primary" />
        <DemoStat label="My batches" value={mine.length} sub="shared chain" icon="inventory_2" tone="surface" />
        <DemoStat label="Awaiting lab" value={awaitedLab} sub="in the queue" icon="science" tone="tertiary" />
        <DemoStat label="Risk flags" value={flagged.length} sub="need attention" icon="warning" tone="error" alert={flagged.length > 0} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DemoSection
          id="harvest"
          title="Log a harvest"
          subtitle="Create or update a harvest batch that flows through the whole chain."
          icon="inventory_2"
        >
          <Card className="space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-metadata-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                Batch code
              </span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 font-mono text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary-container/40"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-metadata-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                Honey type
              </span>
              <div className="flex flex-wrap gap-2">
                {HONEY_CHOICES.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHoney(h)}
                    className={`rounded-full px-3 py-1.5 text-body-md font-medium transition-colors ${
                      honey === h
                        ? "bg-primary-container text-on-primary-container"
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-highest"
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </label>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-metadata-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                  Origin region
                </span>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface outline-none focus:border-primary"
                >
                  <option>Purulia, West Bengal</option>
                  <option>Kolkata, West Bengal</option>
                  <option>Nashik, Maharashtra</option>
                  <option>Karnataka</option>
                  <option>Assam</option>
                  <option>Uttarakhand</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-metadata-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                  Quantity (kg)
                </span>
                <input
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  inputMode="numeric"
                  className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-body-md tabular-nums text-on-surface outline-none focus:border-primary"
                />
              </label>
            </div>
            <Button onClick={createHarvest} icon="add_circle" className="w-full">
              Create harvest batch
            </Button>
          </Card>
        </DemoSection>

        <DemoSection
          id="insights"
          title="Smart insights"
          subtitle="A lightweight read on your apiary from the shared demo data."
          icon="auto_awesome"
        >
          <Card className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-surface-container/60 p-4">
              <span className="mt-0.5 rounded-md bg-primary-container/40 p-1.5 text-primary">
                <Icon name="lightbulb" className="text-[20px]" />
              </span>
              <div>
                <p className="text-body-md font-semibold text-on-surface">
                  {mine.length} harvested batches are in the shared pipeline
                </p>
                <p className="text-metadata-sm text-on-surface-variant">
                  {awaitedLab > 0
                    ? `${awaitedLab} awaiting laboratory release before processing can begin.`
                    : "All batches have cleared the laboratory stage."}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-surface-container/60 p-4">
              <span className="mt-0.5 rounded-md bg-tertiary-container/40 p-1.5 text-tertiary">
                <Icon name="hive" className="text-[20px]" />
              </span>
              <div>
                <p className="text-body-md font-semibold text-on-surface">Seasonal readiness looks strong</p>
                <p className="text-metadata-sm text-on-surface-variant">
                  Predicted florals: Mustard and Litchi across Western Bengal.
                </p>
              </div>
            </div>
            {flagged.length > 0 ? (
              <div className="flex items-start gap-3 rounded-xl border border-error/20 bg-error-container/10 p-4">
                <span className="mt-0.5 rounded-md bg-error/10 p-1.5 text-error">
                  <Icon name="warning" className="text-[20px]" />
                </span>
                <div>
                  <p className="text-body-md font-semibold text-on-surface">Anomaly detected</p>
                  <p className="text-metadata-sm text-on-surface-variant">
                    {flagged[0].publicCode} flagged for GPS mismatch — visible to the Analyst &amp; Risk Center.
                  </p>
                </div>
              </div>
            ) : null}
          </Card>
        </DemoSection>
      </div>

      <DemoSection
        title="My harvest batches"
        subtitle="Every batch above is the SAME shared record your downstream partners will see."
        icon="inventory_2"
      >
        {mine.length === 0 ? (
          <DemoEmpty
            title="No batches yet"
            body="Register your first harvest above to start the demo journey."
            icon="inventory_2"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {mine.map((b) => (
              <BatchCard
                key={b.id}
                batch={b}
                detailHref={`/trace/${encodeURIComponent(b.id)}`}
                actorEmails={[user.email]}
              />
            ))}
          </div>
        )}
      </DemoSection>
    </AppShell>
  );
}
