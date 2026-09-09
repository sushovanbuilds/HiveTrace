"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { Pill } from "@/components/ui";
import { TraceTimeline } from "@/components/demo/timeline";
import { demoQualityPill, demoRiskPill, formatQty, relativeTime, ROLE_ICON, shareKeys } from "@/components/demo/format";
import type { DemoBatch } from "@/lib/demo/types";
import { downloadBatchQrCode } from "@/lib/batch-qr";

export function BatchCard({
  batch,
  detailHref,
  actorEmails,
}: {
  batch: DemoBatch;
  detailHref: string;
  actorEmails: string[];
}) {
  const q = demoQualityPill(batch.quality);
  const r = demoRiskPill(batch.risk);
  const mine = actorEmails.filter((e) => e).length > 0;

  return (
    <div className="glass-card rounded-xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[13px] font-bold tracking-widest text-primary">{batch.publicCode}</span>
            {batch.anomaly !== "NONE" ? (
              <Pill tone="error" icon="warning">
                Anomaly
              </Pill>
            ) : null}
          </div>
          <h3 className="mt-1 text-[18px] font-semibold tracking-tight text-on-surface">
            {batch.honeyType}
          </h3>
          <p className="text-metadata-sm text-on-surface-variant">
            {batch.originRegion} · {formatQty(batch.quantityKg)}
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-metadata-sm text-on-surface-variant">
          <Icon name="schedule" className="text-[16px]" />
          {relativeTime(batch.createdAt)}
        </span>
      </div>

      <div className="my-5">
        <TraceTimeline batch={batch} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/10 pt-4">
        <div className="flex items-center gap-2">
          <Pill tone={q.tone}>{q.label}</Pill>
          <Pill tone={r.tone} dot={r.dot}>
            {r.label}
          </Pill>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-1.5">
            {shareKeys(batch).map((role) => (
              <span
                key={role}
                title={role}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white bg-surface-container-highest text-on-surface-variant"
              >
                <Icon name={ROLE_ICON[role] ?? "inventory_2"} className="text-[14px]" />
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => downloadBatchQrCode({ batchNumber: batch.publicCode, format: "svg" })}
            className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/30 bg-white/70 px-2.5 py-1.5 text-metadata-sm font-medium text-on-surface transition-all hover:border-primary/40 hover:bg-white hover:text-primary active:scale-95"
            title={`Download QR code for batch ${batch.publicCode}`}
          >
            <Icon name="qr_code_2" className="text-[16px] text-primary" />
            <span>QR</span>
          </button>
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/20 bg-white/50 px-3 py-1.5 text-metadata-sm font-medium text-on-surface-variant transition-colors hover:border-outline-variant/40 hover:text-primary"
          >
            {mine ? "Open trace" : "View"}
            <Icon name="arrow_forward" className="text-[16px]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
