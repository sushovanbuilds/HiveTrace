"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { Button, Pill, Card } from "@/components/ui";
import { BatchCard } from "@/components/demo/batch-card";
import { DemoSection, DemoStat, DemoGreeting, DemoEmpty } from "@/components/demo/demo-ui";
import { useDemoWorkspace } from "@/lib/demo/hooks";
import { confirmDelivery, dispatchShipment, updateLocation } from "@/lib/demo/data";
import { formatQty } from "@/components/demo/format";

const WAYPOINTS = [
  "Leaving Amrit facility, Kolkata",
  "Arrived regional hub, Howrah",
  "Crossed into Nashik corridor",
  "At depot, nearing retailer",
];

export default function DistributorPage() {
  const { user, data, ready, mutate } = useDemoWorkspace("DISTRIBUTOR");

  const [sel, setSel] = useState<string>("HC-2026-00124");
  const [waypoint, setWaypoint] = useState(WAYPOINTS[0]);
  const [flash, setFlash] = useState<string | null>(null);

  if (!ready || !user || !data) {
    return (
      <AppShell>
        <div className="py-24 text-center text-on-surface-variant">Loading…</div>
      </AppShell>
    );
  }

  const batches = data.batches.filter((b) => b.anomaly === "NONE");
  const flagged = data.batches.filter((b) => b.anomaly !== "NONE");
  const shipped = batches.filter((b) => b.currentStage === "DISTRIBUTION");
  const inTransit = batches.filter((b) => b.currentStage === "DISTRIBUTION");
  const delivered = batches.filter((b) => b.currentStage === "DELIVERED");
  const selected = batches.find((b) => b.id === sel) ?? batches[0];

  const actor = { email: user.email, name: user.name };

  const dispatch = () => {
    if (!selected) return;
    mutate(dispatchShipment(data, selected.id, actor));
    setFlash(`${selected.publicCode} — shipment dispatched to regional hub.`);
  };
  const track = () => {
    if (!selected) return;
    mutate(updateLocation(data, selected.id, actor, waypoint));
    setFlash(`${selected.publicCode} — ${waypoint}.`);
  };
  const deliver = () => {
    if (!selected) return;
    mutate(confirmDelivery(data, selected.id, actor));
    setFlash(`${selected.publicCode} — delivery confirmed. Journey complete.`);
  };

  const first = user.name.split(/\s+/)[0];

  return (
    <AppShell>
      <DemoGreeting
        eyebrow="Distributor · HoneyLine Distributors"
        first={first}
        sub="Dispatch, track and deliver shared batches to the shelf."
      />

      {flash ? (
        <div role="status" className="mb-6 flex items-center gap-2 rounded-xl border border-tertiary-container/30 bg-tertiary-container/20 px-4 py-3 text-body-md text-on-tertiary-container">
          <Icon name="check_circle" fill className="text-[20px]" />
          {flash}
        </div>
      ) : null}

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DemoStat label="Shipped" value={shipped.length} sub="dispatched lots" icon="local_shipping" tone="primary" />
        <DemoStat label="In transit" value={inTransit.length} sub="on the road" icon="radar" tone="surface" />
        <DemoStat label="Delivered" value={delivered.length} sub="reached shelf" icon="verified" tone="tertiary" />
        <DemoStat label="Exceptions" value={flagged.length} sub="flag for review" icon="warning" tone="error" alert={flagged.length > 0} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DemoSection
          id="shipments"
          title="Dispatch & track"
          subtitle="Move a shared batch to the retailer and record its journey."
          icon="local_shipping"
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
                  <option key={b.id} value={b.id}>
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
                    Stage: {selected.currentStage.replace(/_/g, " ")} · {selected.originRegion}
                  </p>
                </div>
                <Pill tone={selected.currentStage === "DELIVERED" ? "tertiary" : selected.currentStage === "DISTRIBUTION" ? "primary" : "surface"}>
                  {selected.currentStage.replace(/_/g, " ")}
                </Pill>
              </div>
            ) : null}

            <div className="grid grid-cols-3 gap-3">
              <Button variant="outline" onClick={dispatch} icon="local_shipping" disabled={!selected}>
                Dispatch
              </Button>
              <Button variant="outline" onClick={track} icon="radar" disabled={!selected}>
                Update
              </Button>
              <Button onClick={deliver} icon="verified" disabled={!selected}>
                Deliver
              </Button>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-metadata-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                Location update
              </span>
              <select
                value={waypoint}
                onChange={(e) => setWaypoint(e.target.value)}
                className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface outline-none focus:border-primary"
              >
                {WAYPOINTS.map((w) => (
                  <option key={w}>{w}</option>
                ))}
              </select>
            </label>
          </Card>
        </DemoSection>

        <DemoSection
          id="exceptions"
          title="Exceptions"
          subtitle="Flagged batches a distributor should not accept."
          icon="warning"
        >
          {flagged.length === 0 ? (
            <DemoEmpty title="No exceptions" body="No risk-flagged batches in the current dataset." icon="task_alt" />
          ) : (
            <div className="space-y-3">
              {flagged.map((b) => (
                <div key={b.id} className="rounded-xl border border-error/20 bg-error-container/10 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-body-md font-bold text-on-surface">{b.publicCode}</span>
                    <Pill tone="error" icon="warning">GPS mismatch</Pill>
                  </div>
                  <p className="mt-1 text-metadata-sm text-on-surface-variant">
                    {b.honeyType} · {formatQty(b.quantityKg)} · held pending review.
                  </p>
                </div>
              ))}
            </div>
          )}
        </DemoSection>
      </div>

      <div className="mb-8">
        <DemoSection
          id="map"
          title="Route map"
          subtitle="Last-mile corridor from the processing facility to the retailer."
          icon="map"
        >
          <Card>
            <div className="flex h-40 items-center justify-between rounded-xl bg-surface-container/60 px-6">
              {["Amrit, Kolkata", "Howrah hub", "Nashik corridor", "Retailer"].map((stop, i, arr) => (
                <div key={stop} className="flex items-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${i === arr.length - 1 ? "bg-tertiary text-on-tertiary" : "bg-primary-container text-on-primary-container"}`}>
                      <Icon name={i === arr.length - 1 ? "verified" : "location_on"} className="text-[18px]" />
                    </span>
                    <span className="max-w-[64px] text-center text-[10px] font-semibold leading-tight text-on-surface-variant">{stop}</span>
                  </div>
                  {i < arr.length - 1 ? (
                    <span className="mx-1 hidden h-0.5 w-8 sm:block bg-outline-variant/60" />
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        </DemoSection>
      </div>

      <DemoSection
        title="Distribution queue"
        subtitle="Shared batches in the distribution leg — the same records processors sealed."
        icon="local_shipping"
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
