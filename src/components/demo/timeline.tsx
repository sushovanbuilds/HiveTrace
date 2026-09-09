"use client";

import { Icon } from "@/components/icons";
import { Pill, type PillTone } from "@/components/ui";
import type { DemoBatch, DemoRole, DemoStage } from "@/lib/demo/types";
import { ROLE_LABEL } from "@/lib/demo/config";

/**
 * Shared traceability timeline. Every role renders the SAME batch and therefore
 * the SAME evolving journey. A stage is "done" when the batch has moved past it;
 * the milestone formatting follows the quality/processing/packaging lifecycle.
 */

export const TIMELINE_STEPS: Array<{
  key: string;
  label: string;
  icon: string;
}> = [
  { key: "HIVE", label: "Hive", icon: "hive" },
  { key: "HARVEST", label: "Harvest", icon: "inventory_2" },
  { key: "LAB", label: "Laboratory", icon: "science" },
  { key: "PROCESSING", label: "Processing", icon: "factory" },
  { key: "PACKAGING", label: "Packaging", icon: "inventory_2" },
  { key: "DISTRIBUTION", label: "Distribution", icon: "local_shipping" },
  { key: "DELIVERED", label: "Delivered", icon: "verified" },
];

const ORDER: DemoStage[] = ["HARVEST", "LAB", "PROCESSING", "PACKAGING", "DISTRIBUTION", "DELIVERED"];

function stageIndex(stage: DemoStage): number {
  return ORDER.indexOf(stage);
}

/**
 * Return the per-step state ("done" | "active" | "pending") plus a caption.
 * Quality variants adjust the Laboratory milestone text.
 */
function stepStatus(batch: DemoBatch, index: number): {
  state: "done" | "active" | "pending";
  caption: string;
} {
  const key = TIMELINE_STEPS[index].key;

  if (key === "HIVE") return { state: "done", caption: "Apiary registered" };

  if (key === "HARVEST") {
    return batch.events.some((e) => e.stage === "HARVEST")
      ? { state: "done", caption: `${batch.quantityKg} kg` }
      : { state: "pending", caption: "Awaiting harvest" };
  }

  if (key === "LAB") {
    if (batch.quality === "PASSED") return { state: "done", caption: "Quality passed" };
    if (batch.quality === "FAILED") return { state: "done", caption: "Quality failed" };
    return { state: "pending", caption: "Awaiting lab" };
  }

  if (key === "PROCESSING") {
    return orderIndex(batch) >= 3
      ? { state: "done", caption: "Complete" }
      : { state: "pending", caption: orderIndex(batch) === 2 ? "In progress" : "Pending" };
  }

  if (key === "PACKAGING") {
    return orderIndex(batch) >= 4
      ? { state: "done", caption: "Lot sealed" }
      : { state: "pending", caption: "Pending" };
  }

  if (key === "DISTRIBUTION") {
    return orderIndex(batch) >= 5
      ? { state: "done", caption: "In transit" }
      : { state: "pending", caption: "Pending" };
  }

  if (key === "DELIVERED") {
    return batch.currentStage === "DELIVERED"
      ? { state: "done", caption: "Delivered" }
      : { state: "pending", caption: "Pending" };
  }

  return { state: "pending", caption: "" };
}

function orderIndex(batch: DemoBatch): number {
  return stageIndex(batch.currentStage);
}

export function TraceTimeline({ batch }: { batch: DemoBatch }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-2 no-scrollbar" aria-label="Batch trace timeline">
    <ol className="flex min-w-max items-center">
      {TIMELINE_STEPS.map((step, i) => {
        const { state, caption } = stepStatus(batch, i);
        return (
          <li key={step.key} className="flex items-center">
            {i > 0 ? (
              <span className={`mx-1.5 h-0.5 w-4 sm:w-6 ${state === "done" ? "bg-tertiary" : "bg-surface-container-highest"}`} />
            ) : null}
            <div className={`flex flex-col items-center gap-1 ${state === "done" ? "opacity-100" : "opacity-60"}`}>
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                  state === "done"
                    ? "bg-tertiary text-on-tertiary shadow-sm"
                    : state === "active"
                      ? "bg-primary-container text-on-primary-container ring-2 ring-primary"
                      : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {state === "done" ? (
                  <Icon name="check" fill className="text-[20px]" />
                ) : (
                  <Icon name={step.icon} className="text-[20px]" />
                )}
              </span>
              <span className="text-[11px] font-semibold tracking-wide text-on-surface">{step.label}</span>
              <span className="text-[10px] text-on-surface-variant">{caption}</span>
            </div>
          </li>
        );
      })}
    </ol>
    </div>
  );
}

/* ── Vertical milestone timeline ─────────────────────────────────────── */

const MILESTONE_ORDER: DemoStage[] = [
  "HARVEST",
  "LAB",
  "PROCESSING",
  "PACKAGING",
  "DISTRIBUTION",
  "DELIVERED",
];

const MILESTONE_META: Record<string, { title: string; icon: string; done: string }> = {
  HARVEST: { title: "Harvested", icon: "inventory_2", done: "Harvest recorded" },
  LAB: { title: "Quality Verified", icon: "science", done: "Quality passed" },
  PROCESSING: { title: "Processed", icon: "factory", done: "Processing complete" },
  PACKAGING: { title: "Packaged", icon: "inventory_2", done: "Lot sealed with QR" },
  DISTRIBUTION: { title: "Distributed", icon: "local_shipping", done: "In transit to retail" },
  DELIVERED: { title: "Consumer Verified", icon: "verified", done: "Delivered to retail" },
};

const ROLE_ICON: Record<string, string> = {
  BEEKEEPER: "hive",
  ANALYST: "science",
  PROCESSOR: "factory",
  DISTRIBUTOR: "local_shipping",
};

function fmtMilestoneTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Milestone {
  stage: DemoStage;
  title: string;
  icon: string;
  done: boolean;
  timestamp: string | null;
  actor: string | null;
  role: DemoRole | null;
  location: string | null;
  note: string | null;
  quality: "PASSED" | "FAILED" | null;
}

export function TraceMilestones({ batch }: { batch: DemoBatch }) {
  const m: Milestone[] = MILESTONE_ORDER.map((stage) => {
    const meta = MILESTONE_META[stage];
    const evs = batch.events.filter((e) => e.stage === stage);
    const last = evs[evs.length - 1];

    let done = false;
    if (stage === "LAB") {
      done = batch.quality === "PASSED" || batch.quality === "FAILED";
    } else if (stage === "DELIVERED") {
      done = batch.currentStage === "DELIVERED";
    } else if (stage === "DISTRIBUTION") {
      done = batch.currentStage === "DISTRIBUTION" || batch.currentStage === "DELIVERED";
    } else {
      done = evs.length > 0;
    }

    const location =
      stage === "HARVEST" ? batch.originRegion : done ? meta.title : null;

    return {
      stage,
      title: meta.title,
      icon: meta.icon,
      done,
      timestamp: last ? last.timestamp : null,
      actor: last ? last.actorName : null,
      role: last ? ((last.role) as DemoRole) : null,
      location,
      note: last ? last.note : null,
      quality: stage === "LAB" ? (batch.quality === "PASSED" ? "PASSED" : batch.quality === "FAILED" ? "FAILED" : null) : null,
    };
  });

  return (
    <ol className="relative border-l border-outline-variant/20 pl-6">
      {m.map((mil) => {
        const failure = mil.quality === "FAILED";
        const tower: PillTone = failure ? "error" : mil.done ? "tertiary" : "surface";
        const label: string = failure
          ? "Quality Failed"
          : mil.quality === "PASSED"
            ? "Quality Passed"
            : mil.done
              ? "Complete"
              : "Pending";

        return (
          <li key={mil.stage} className="relative pb-6 last:pb-0">
            <span
              className={`absolute -left-[31px] top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white ${
                mil.done ? "bg-tertiary" : "bg-surface-container-highest"
              }`}
            >
              {mil.done ? (
                <Icon name="check" fill className="text-[13px] text-on-tertiary" />
              ) : null}
            </span>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon name={mil.icon} fill={mil.done} className={`text-[20px] ${mil.done ? "text-tertiary" : "text-on-surface-variant"}`} />
                <h3 className={`text-body-lg font-semibold ${mil.done ? "text-on-surface" : "text-on-surface-variant"}`}>
                  {mil.title}
                </h3>
                <span className="font-mono text-[12px] font-bold text-primary">
                  {mil.location ? `· ${mil.location}` : ""}
                </span>
              </div>
              <Pill tone={tower} icon={mil.done ? "check_circle" : "schedule"}>
                {label}
              </Pill>
            </div>

            {mil.note ? (
              <p className="mt-1 text-metadata-sm text-on-surface-variant">{mil.note}</p>
            ) : null}

            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-metadata-sm text-on-surface-variant/80">
              {mil.timestamp ? (
                <span className="inline-flex items-center gap-1">
                  <Icon name="schedule" className="text-[15px]" />
                  {fmtMilestoneTime(mil.timestamp)}
                </span>
              ) : null}
              {mil.actor && mil.role ? (
                <span className="inline-flex items-center gap-1">
                  <Icon name={ROLE_ICON[mil.role] ?? "inventory_2"} className="text-[15px]" />
                  {mil.actor} · {ROLE_LABEL[mil.role] ?? mil.role}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
