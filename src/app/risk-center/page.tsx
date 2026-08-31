"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { Pill } from "@/components/ui";
import {
  saveDemoData,
  confirmAnomaly,
  type DemoIncident,
} from "@/lib/demo/data";
import { useDemoData } from "@/lib/demo/hooks";
import { formatQty } from "@/components/demo/format";
import type { PillTone } from "@/components/ui";
import type { DemoBatch } from "@/lib/demo/types";

const SEVERITY_TONE: Record<DemoIncident["severity"], PillTone> = {
  LOW: "tertiary",
  MEDIUM: "warn",
  HIGH: "error",
  CRITICAL: "error",
};

const STATUS_TONE: Record<DemoIncident["status"], PillTone> = {
  OPEN: "error",
  UNDER_REVIEW: "warn",
  RESOLVED: "tertiary",
};

/**
 * Reward/expected coordinates for the deterministic anomalies, so a judge can
 * see "Expected location" vs what the GPS actually reported without hunting.
 * Demo map strings only — no real coordinates are exposed.
 */
const EXPECTED_ORIGIN: Record<string, string> = {
  "HC-2026-00281": "Valley Heights apiary, Nashik, Maharashtra",
};

const DETECTED_ORIGIN: Record<string, string> = {
  "HC-2026-00281": "GPS trail ~11 km east of declared apiary",
};

function IncidentCard({
  incident,
  batch,
  onConfirm,
}: {
  incident: DemoIncident;
  batch?: DemoBatch;
  onConfirm: (batchId: string) => void;
}) {
  const isGps = batch?.anomaly === "GPS_MISMATCH";
  const open = incident.status === "OPEN" || incident.status === "UNDER_REVIEW";

  return (
    <div className={`glass-card overflow-hidden rounded-xl ${batch?.anomaly !== "NONE" ? "border-t-4 border-error" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error">
            <Icon name={isGps ? "location_on" : "warning"} fill className="text-[22px]" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-metadata-sm tracking-wider text-on-surface-variant">
                {incident.id}
              </span>
              <Pill tone={STATUS_TONE[incident.status]}>{incident.status}</Pill>
            </div>
            <h3 className="mt-1 text-[18px] font-semibold tracking-tight text-on-surface">
              {incident.title}
            </h3>
            <p className="text-metadata-sm text-on-surface-variant">
              Affects batch{" "}
              <Link href={`/trace/${encodeURIComponent(incident.publicCode)}`} className="font-mono font-semibold text-primary hover:underline">
                {incident.publicCode}
              </Link>
              {batch ? ` · ${batch.honeyType} · ${formatQty(batch.quantityKg)}` : ""}
            </p>
          </div>
        </div>
        <Pill tone={SEVERITY_TONE[incident.severity]} icon="report">
          {incident.severity}
        </Pill>
      </div>

      <div className="px-5 pb-5 sm:px-6">
        {isGps ? (
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-surface-container/60 p-4">
              <p className="text-metadata-sm uppercase tracking-wider text-on-surface-variant">Expected location</p>
              <p className="mt-1 flex items-start gap-2 text-body-md font-semibold text-on-surface">
                <Icon name="location_on" className="mt-0.5 text-[18px] text-tertiary" />
                {EXPECTED_ORIGIN[incident.publicCode] ?? batch?.originRegion}
              </p>
            </div>
            <div className="rounded-xl bg-surface-container/60 p-4">
              <p className="text-metadata-sm uppercase tracking-wider text-on-surface-variant">Detected location</p>
              <p className="mt-1 flex items-start gap-2 text-body-md font-semibold text-error">
                <Icon name="location_off" className="mt-0.5 text-[18px]" />
                {DETECTED_ORIGIN[incident.publicCode] ?? "Unexpected location"}
              </p>
            </div>
          </div>
        ) : null}

        <p className="text-body-md text-on-surface-variant">{incident.description}</p>

        {batch && batch.events.length > 0 ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-surface-container-lowest/50 p-3 text-metadata-sm text-on-surface-variant">
            <Icon name="timeline" className="mt-0.5 text-[16px] text-secondary" />
            <span>
              Detected by HiveTrace Risk Engine at harvest.
              {batch.anomaly !== "NONE" ? " This is a deterministic GPS-mismatch scenario used for the demo." : ""}
            </span>
          </div>
        ) : null}

        {open && isGps ? (
          <button
            type="button"
            onClick={() => onConfirm(incident.batchId)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-error px-4 py-2.5 text-body-md font-semibold text-on-error transition-all hover:bg-error/90 active:scale-95"
          >
            <Icon name="verified_user" className="text-[20px]" />
            Confirm Anomaly
          </button>
        ) : null}

        {!open ? (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-tertiary-container/40 px-3 py-1 text-label-caps font-semibold text-on-tertiary-container">
            <Icon name="check_circle" fill className="text-[16px]" />
            Reviewed & confirmed
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function RiskCenterPage() {
  const data = useDemoData();

  const incidents = [...data.incidents];
  const open = incidents.filter((i) => i.status === "OPEN" || i.status === "UNDER_REVIEW");
  const resolved = incidents.filter((i) => i.status === "RESOLVED");
  const batches = data.batches;

  const bankOf = (code: string) => batches.find((b) => b.publicCode === code);

  const handleConfirm = (batchId: string) => {
    saveDemoData(confirmAnomaly(data, batchId));
  };

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">
          Risk / Incident Center
        </h1>
        <p className="mt-1 text-body-lg text-on-surface-variant">
          Central view of deterministic anomalies across the demo supply chain.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="metric-card flex-1 min-w-[160px] p-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">Open incidents</p>
          <p className="mt-1 font-headline-md text-headline-md text-error">{open.length}</p>
        </div>
        <div className="metric-card flex-1 min-w-[160px] p-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">Resolved</p>
          <p className="mt-1 font-headline-md text-headline-md text-on-surface">{resolved.length}</p>
        </div>
        <div className="metric-card flex-1 min-w-[160px] p-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">High severity</p>
          <p className="mt-1 font-headline-md text-headline-md text-error">
            {data.incidents.filter((i) => i.severity === "HIGH" || i.severity === "CRITICAL").length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {open.length === 0 && resolved.length === 0 ? (
          <div className="glass-card rounded-xl p-10 text-center text-on-surface-variant">
            No incidents in the demo dataset.
          </div>
        ) : (
          <>
            {open.map((inc) => (
              <IncidentCard key={inc.id} incident={inc} batch={bankOf(inc.publicCode)} onConfirm={handleConfirm} />
            ))}
            {resolved.map((inc) => (
              <IncidentCard key={inc.id} incident={inc} batch={bankOf(inc.publicCode)} onConfirm={handleConfirm} />
            ))}
          </>
        )}
      </div>
    </AppShell>
  );
}
