"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { Button, Pill, Card } from "@/components/ui";
import { BatchCard } from "@/components/demo/batch-card";
import { DemoSection, DemoStat, DemoGreeting, DemoEmpty } from "@/components/demo/demo-ui";
import { useDemoWorkspace } from "@/lib/demo/hooks";
import { completeProcessing, createPackagingLot, startProcessing } from "@/lib/demo/data";
import { formatQty } from "@/components/demo/format";

export default function ProcessorPage() {
  const { user, data, ready, mutate } = useDemoWorkspace("PROCESSOR");

  const [sel, setSel] = useState<string>("HC-2026-00124");
  const [lot, setLot] = useState("LOT-0124-A");
  const [flash, setFlash] = useState<string | null>(null);

  if (!ready || !user || !data) {
    return (
      <AppShell>
        <div className="py-24 text-center text-on-surface-variant">Loading…</div>
      </AppShell>
    );
  }

  const batches = data.batches.filter((b) => b.anomaly === "NONE");
  const inbound = batches.filter((b) => b.quality === "PASSED");
  const processing = batches.filter((b) => b.currentStage === "PROCESSING" || b.currentStage === "PACKAGING");
  const packaged = batches.filter((b) => b.currentStage === "PACKAGING");
  const readyDispatch = batches.filter((b) => b.currentStage === "PACKAGING");
  const selected = batches.find((b) => b.id === sel) ?? batches[0];

  const actor = { email: user.email, name: user.name };

  const start = () => {
    if (!selected) return;
    mutate(startProcessing(data, selected.id, actor));
    setFlash(`${selected.publicCode} — processing started.`);
  };
  const complete = () => {
    if (!selected) return;
    mutate(completeProcessing(data, selected.id, actor));
    setFlash(`${selected.publicCode} — processing complete, ready to package.`);
  };
  const pack = () => {
    if (!selected) return;
    mutate(createPackagingLot(data, selected.id, actor, lot.trim() || "LOT-0124-A"));
    setFlash(`${selected.publicCode} — packaged as ${lot.trim() || "LOT-0124-A"}.`);
  };

  const first = user.name.split(/\s+/)[0];
  const stage = selected?.currentStage;

  return (
    <AppShell>
      <DemoGreeting
        eyebrow="Processor · Amrit Honey Processors"
        first={first}
        sub="Convert released honey into sealed lots, then pass control to distribution."
      />

      {flash ? (
        <div role="status" className="mb-6 flex items-center gap-2 rounded-xl border border-tertiary-container/30 bg-tertiary-container/20 px-4 py-3 text-body-md text-on-tertiary-container">
          <Icon name="check_circle" fill className="text-[20px]" />
          {flash}
        </div>
      ) : null}

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DemoStat label="Inbound" value={inbound.length} sub="released by lab" icon="move_down" tone="surface" />
        <DemoStat label="In process" value={processing.length} sub="creaming & filtration" icon="factory" tone="primary" />
        <DemoStat label="Packaged" value={packaged.length} sub="sealed lots" icon="inventory_2" tone="tertiary" />
        <DemoStat label="Ready to dispatch" value={readyDispatch.length} sub="to distributor" icon="local_shipping" tone="surface" />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DemoSection
          id="processing"
          title="Processing control"
          subtitle="Drive one shared batch through creation, processing and packaging."
          icon="factory"
        >
          <Card className="space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-metadata-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                Batch
              </span>
              <select
                value={selected?.id ?? ""}
                onChange={(e) => setSel(e.target.value)}
                className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface outline-none focus:border-primary"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id} disabled={b.quality !== "PASSED" && b.currentStage === "HARVEST"}>
                    {b.publicCode} · {b.honeyType} · {formatQty(b.quantityKg)}
                  </option>
                ))}
              </select>
            </label>

            {selected ? (
              <div className="flex items-center justify-between rounded-xl bg-surface-container/60 px-4 py-3">
                <div>
                  <p className="text-body-md font-semibold text-on-surface">{selected.publicCode}</p>
                  <p className="text-metadata-sm text-on-surface-variant">
                    Current: {selected.currentStage.replace(/_/g, " ")} · {selected.honeyType}
                  </p>
                </div>
                <Pill tone={selected.quality === "PASSED" ? "tertiary" : "surface"}>
                  {selected.quality === "PASSED" ? "Lab released" : "Not released"}
                </Pill>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={start} icon="play_arrow" disabled={!selected}>
                Start
              </Button>
              <Button variant="outline" onClick={complete} icon="check" disabled={!selected}>
                Complete
              </Button>
            </div>

            {stage === "PROCESSING" || stage === "PACKAGING" || stage === "DISTRIBUTION" || stage === "DELIVERED" ? (
              <div className="border-t border-outline-variant/10 pt-4">
                <label className="block">
                  <span className="mb-1.5 block text-metadata-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                    Packaging lot label
                  </span>
                  <div className="flex gap-2">
                    <input
                      value={lot}
                      onChange={(e) => setLot(e.target.value)}
                      className="h-12 flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 font-mono text-body-md text-on-surface outline-none focus:border-primary"
                    />
                    <Button onClick={pack} icon="inventory_2" disabled={!selected}>
                      Seal lot
                    </Button>
                  </div>
                </label>
              </div>
            ) : null}

            <p className="text-metadata-sm text-on-surface-variant">
              Tip: seal a lot to move the batch to packaging so the Distributor can pick it up.
            </p>
          </Card>
        </DemoSection>

        <DemoSection
          id="packaging"
          title="Packaging overview"
          subtitle="Sealed lots waiting to enter distribution."
          icon="inventory_2"
        >
          {readyDispatch.length === 0 ? (
            <DemoEmpty
              title="Nothing packaged yet"
              body="Start and complete processing, then seal a lot above."
              icon="inventory_2"
            />
          ) : (
            <div className="space-y-3">
              {readyDispatch.map((b) => (
                <div key={b.id} className="glass-card flex items-center justify-between rounded-xl p-4">
                  <div>
                    <p className="font-mono text-body-md font-semibold text-on-surface">{b.publicCode}</p>
                    <p className="text-metadata-sm text-on-surface-variant">
                      {b.honeyType} · {formatQty(b.quantityKg)} · sealed
                    </p>
                  </div>
                  <Pill tone="tertiary" icon="verified">Packaged</Pill>
                </div>
              ))}
            </div>
          )}
        </DemoSection>
      </div>

      <DemoSection
        title="Processing queue"
        subtitle="Shared batches on the processing floor — the same records the lab released."
        icon="factory"
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {batches.map((b) => (
            <BatchCard key={b.id} batch={b} detailHref={`/trace/${encodeURIComponent(b.id)}`} actorEmails={[]} />
          ))}
        </div>
      </DemoSection>
    </AppShell>
  );
}
