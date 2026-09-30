import Link from "next/link";
import { Icon } from "@/components/icons";
import { GlassCard, Pill, qualityPill, riskPill, stageLabel } from "@/components/ui";
import type { TraceHarvestLink } from "@/lib/hiveos/types";
import { SectionTitle } from "./shared";

/**
 * TRACEABILITY BRIDGE — the digital twin's link into the real supply chain:
 * Hive → Inspection → Harvest → Honey Batch → Lab → Processing → Distribution → Consumer QR.
 */
export function TraceBridge({ hiveName, trace }: { hiveName: string; trace: TraceHarvestLink[] }) {
  return (
    <GlassCard className="p-6">
      <SectionTitle icon="account_tree">Traceability bridge</SectionTitle>
      <p className="mb-5 text-metadata-sm text-on-surface-variant">
        {hiveName}&apos;s harvest history, linked forward into honey batches and their
        supply-chain journey — down to the consumer QR.
      </p>

      {trace.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">No harvests recorded for this hive yet.</p>
      ) : (
        <div className="space-y-5">
          {trace.map((h) => (
            <div key={h.id} className="relative pl-6">
              <span className="absolute left-0 top-1 h-full w-px bg-outline-variant/40" />
              <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-tertiary" />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-body-md font-semibold text-on-surface">
                  {h.honeyType.replace(/_/g, " ")} harvest
                </p>
                <div className="flex items-center gap-3">
                  <p className="text-metadata-sm tabular-nums text-on-surface-variant">
                    {new Date(h.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}
                    {h.quantity} kg
                  </p>
                  {!h.batches.every((b) => b.demo) ? (
                    <Link
                      href={`/harvests/${h.id}`}
                      className="inline-flex items-center gap-1 text-metadata-sm font-medium text-primary hover:underline"
                    >
                      View Harvest
                      <Icon name="arrow_forward" className="text-[14px]" />
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="mt-2 space-y-2">
                {h.batches.length === 0 ? (
                  <p className="text-metadata-sm text-on-surface-variant">Not yet assigned to a batch.</p>
                ) : (
                  h.batches.map((b) => (
                    <div
                      key={b.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3.5 py-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon name="qr_code_2" className="text-[20px] text-on-surface-variant" />
                        <div>
                          <p className="font-mono text-body-md font-semibold text-on-surface">{b.publicCode}</p>
                          <p className="text-metadata-sm text-on-surface-variant">
                            {stageLabel(b.currentStage)}
                            {b.demo ? " · simulated demo link" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill {...qualityPill(b.qualityStatus)}>{qualityPill(b.qualityStatus).label}</Pill>
                        <Pill {...riskPill(b.riskState)}>{riskPill(b.riskState).label}</Pill>
                        {b.demo ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-lg bg-surface-container px-3 py-1.5 text-metadata-sm text-on-surface-variant"
                            title="Simulated harvest memory — this demo hive has no live batch record in the traceability system."
                          >
                            <Icon name="info" className="text-[16px]" />
                            Simulated
                          </span>
                        ) : (
                          <>
                            <Link
                              href={`/harvests/${h.id}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-surface-container px-3 py-1.5 text-metadata-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high"
                            >
                              <Icon name="agriculture" className="text-[16px]" />
                              View Harvest
                            </Link>
                            <Link
                              href={`/batches/${b.id}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-surface-container px-3 py-1.5 text-metadata-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high"
                            >
                              <Icon name="inventory_2" className="text-[16px]" />
                              View Batch
                            </Link>
                            <Link
                              href={`/batches/${b.id}#provenance`}
                              className="inline-flex items-center gap-1 rounded-lg bg-surface-container px-3 py-1.5 text-metadata-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high"
                            >
                              <Icon name="route" className="text-[16px]" />
                              View Traceability
                            </Link>
                            <Link
                              href={`/verify/${encodeURIComponent(b.publicCode)}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-primary-container/40 px-3 py-1.5 text-metadata-sm font-medium text-on-primary-container transition-colors hover:bg-primary-container/60"
                            >
                              <Icon name="verified" className="text-[16px]" />
                              Verify QR
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-outline-variant/20 pt-4 text-metadata-sm text-on-surface-variant">
        {["Inspection", "Harvest", "Honey Batch", "Lab", "Processing", "Distribution", "Consumer QR"].map((s, i, arr) => (
          <span key={s} className="inline-flex items-center gap-4">
            <span className={i <= 2 ? "font-medium text-on-surface" : ""}>{s}</span>
            {i < arr.length - 1 && <Icon name="chevron_right" className="text-[14px]" />}
          </span>
        ))}
      </div>
    </GlassCard>
  );
}
