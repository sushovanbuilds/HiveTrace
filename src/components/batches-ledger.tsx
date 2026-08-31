"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui";

export type LedgerBatch = {
  id: string;
  publicCode: string;
  honeyType: string;
  originRegion: string;
  quantity: number;
  currentStage: string;
  riskState: string;
  verificationState: string;
  updatedAt: string | null;
};

const STAGE_META: Record<string, { icon: string; cls: string; label: string }> = {
  HARVEST: { icon: "agriculture", cls: "bg-surface-container-high text-on-surface border border-outline-variant/20", label: "Harvested" },
  COLLECTION: { icon: "warehouse", cls: "bg-surface-container-high text-on-surface border border-outline-variant/20", label: "Collection" },
  LAB: { icon: "science", cls: "bg-secondary-container/40 text-on-secondary-container border border-outline-variant/20", label: "In Testing" },
  PROCESSING: { icon: "sync", cls: "bg-secondary-container/40 text-on-secondary-container border border-outline-variant/20", label: "Processing" },
  PACKAGING: { icon: "inventory", cls: "bg-surface-container-high text-on-surface border border-outline-variant/20", label: "In Transit" },
  DISTRIBUTION: { icon: "local_shipping", cls: "bg-surface-container-high text-on-surface border border-outline-variant/20", label: "In Transit" },
  RETAIL: { icon: "check_circle", cls: "bg-tertiary/10 text-on-tertiary-container border border-tertiary/20", label: "Packaged" },
};

const RISK_META: Record<string, { dot: string; cls: string; label: string }> = {
  LOW: { dot: "bg-tertiary", cls: "text-tertiary", label: "Low" },
  MEDIUM: { dot: "bg-primary", cls: "text-primary", label: "Medium" },
  HIGH: { dot: "bg-error", cls: "text-error", label: "High" },
};

const VERIF_META: Record<string, { icon: string; cls: string; label: string }> = {
  VERIFIED: { icon: "verified", cls: "bg-tertiary/10 text-on-tertiary-container border border-tertiary/20", label: "Verified" },
  UNVERIFIED: { icon: "pending", cls: "bg-surface-variant text-on-surface-variant border border-outline-variant/30", label: "Pending" },
  DISPUTED: { icon: "report", cls: "bg-error-container text-on-error-container border border-error/20", label: "Disputed" },
};

function honeyTitle(t: string) {
  const map: Record<string, string> = {
    MULTIFLORAL: "Multifloral",
    ACACIA: "Acacia Blend",
    MANUKA: "Manuka",
    EUCALYPTUS: "Eucalyptus",
    MUSTARD: "Pure Mustard",
    MANGROVE: "Mangrove",
    LITCHI: "Litchi Blossom",
    JAMUN: "Jamun",
    WILDFLOWER: "Wild Forest",
    OTHER: "Artisan Blend",
  };
  return map[t] ?? t;
}

function relative(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function BatchesLedger({
  initial,
  total,
}: {
  initial: LedgerBatch[];
  total: number;
}) {
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<string | null>(null);
  const [risk, setRisk] = useState<string | null>(null);

  const rows = useMemo(() => {
    return initial.filter((b) => {
      if (stage && b.currentStage !== stage) return false;
      if (risk && b.riskState !== risk) return false;
      if (!q.trim()) return true;
      const term = q.trim().toLowerCase();
      return (
        b.publicCode.toLowerCase().includes(term) ||
        honeyTitle(b.honeyType).toLowerCase().includes(term) ||
        b.originRegion.toLowerCase().includes(term)
      );
    });
  }, [initial, q, stage, risk]);

  const stages = [...BATCH_STAGES];
  const risks = ["LOW", "MEDIUM", "HIGH"];

  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-col justify-between gap-4 border-b border-outline-variant/20 bg-surface-bright p-4 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-80">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search batches, origin, or SKU…"
            className="w-full rounded-lg border border-outline-variant/50 bg-surface-container-low py-2 pl-9 pr-3 text-metadata-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant focus:border-on-surface focus:bg-surface-container-lowest"
          />
        </div>
        <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:pb-0 no-scrollbar">
          {stages.map((s) => (
            <button
              key={s}
              onClick={() => setStage(stage === s ? null : s)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 font-label-caps tracking-wide transition-colors ${
                stage === s
                  ? "border border-primary/20 bg-primary/10 text-primary"
                  : "border border-outline-variant/50 bg-surface text-on-surface hover:bg-surface-variant"
              }`}
            >
              {STAGE_META[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="relative flex-grow overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead className="sticky top-0 z-20">
            <tr className="border-b border-outline-variant/30 bg-surface-container-low">
              <th className="w-44 bg-surface-container-low px-4 py-2.5 text-left font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">Batch ID</th>
              <th className="px-4 py-2.5 font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">Honey Type</th>
              <th className="px-4 py-2.5 font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">Origin</th>
              <th className="px-4 py-2.5 text-right font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">Quantity</th>
              <th className="px-4 py-2.5 font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">Current Stage</th>
              <th className="px-4 py-2.5 font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">Risk</th>
              <th className="px-4 py-2.5 font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">Verification</th>
              <th className="px-4 py-2.5 text-right font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20 bg-surface-container-lowest text-metadata-sm text-on-surface">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-on-surface-variant">
                  No batches match your filters.
                </td>
              </tr>
            ) : (
              rows.map((b) => {
                const st = STAGE_META[b.currentStage] ?? STAGE_META.HARVEST;
                const rk = RISK_META[b.riskState] ?? RISK_META.LOW;
                const vf = VERIF_META[b.verificationState] ?? VERIF_META.UNVERIFIED;
                return (
                  <tr key={b.id} className="group transition-colors hover:bg-surface-container/50">
                    <td className="sticky left-0 bg-surface-container-lowest px-4 py-2 font-medium tracking-wider transition-colors group-hover:bg-surface-container/50">
                      <Link href={`/batches/${b.id}`} className="flex items-center gap-2 hover:text-primary">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${b.riskState === "HIGH" ? "bg-error" : b.riskState === "MEDIUM" ? "bg-primary" : "bg-tertiary"}`}
                        />
                        {b.publicCode}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-on-surface-variant">{honeyTitle(b.honeyType)}</td>
                    <td className="px-4 py-2 text-on-surface-variant">{b.originRegion}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {b.quantity.toLocaleString("en-IN")} kg
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] ${st.cls}`}>
                        <Icon name={st.icon} className="text-[12px]" />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1.5 ${rk.cls}`}>
                        <span className={`h-1 w-1 rounded-full ${rk.dot}`} />
                        {rk.label}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${vf.cls}`}>
                        <Icon name={vf.icon} fill={b.verificationState === "VERIFIED"} className="text-[12px]" />
                        {vf.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-[11px] text-on-surface-variant">
                      {relative(b.updatedAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-outline-variant/20 bg-surface-container-lowest p-3 text-on-surface-variant">
        <p className="text-metadata-sm">
          Showing {rows.length} of {total} entries
        </p>
        <div className="flex gap-2">
          <button className="rounded-md border border-outline-variant/30 bg-surface p-1.5 transition-colors hover:bg-surface-variant disabled:opacity-50" disabled>
            <Icon name="chevron_left" className="text-[16px]" />
          </button>
          <button className="rounded-md border border-outline-variant/30 bg-surface p-1.5 transition-colors hover:bg-surface-variant">
            <Icon name="chevron_right" className="text-[16px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

export const BATCH_STAGES = ["HARVEST", "COLLECTION", "LAB", "PROCESSING", "PACKAGING", "DISTRIBUTION", "RETAIL"] as const;

export function BatchesHeader({ total }: { total: number }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h1 className="text-headline-lg tracking-tight text-on-surface">Active Batches</h1>
        <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">
          {total} batches marked as traceable across the network — every event, lab result and
          custody transfer recorded against an immutable ledger.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 rounded-lg border border-outline-variant/50 bg-surface-container px-4 py-2 text-metadata-sm text-on-surface transition-colors hover:bg-surface-variant">
          <Icon name="download" className="text-[16px]" />
          Export CSV
        </button>
        <ButtonLink href="/harvests/new" icon="add">
          Create Batch
        </ButtonLink>
      </div>
    </div>
  );
}