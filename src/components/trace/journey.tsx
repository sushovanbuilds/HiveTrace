"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import type { JourneyStage, StageStatus } from "@/lib/trace/chain";

const STATUS_STYLE: Record<StageStatus, { node: string; icon: string; label: string; line: string }> = {
  done: {
    node: "bg-tertiary text-on-tertiary border-tertiary",
    icon: "text-on-tertiary",
    label: "text-on-surface",
    line: "bg-tertiary/60",
  },
  active: {
    node: "bg-primary-container text-on-primary-container border-primary",
    icon: "text-on-primary-container",
    label: "text-on-surface font-semibold",
    line: "bg-outline-variant/40",
  },
  pending: {
    node: "bg-surface-container-low text-on-surface-variant border-outline-variant/50 border-dashed",
    icon: "text-on-surface-variant/60",
    label: "text-on-surface-variant/70",
    line: "bg-outline-variant/30",
  },
};

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * The canonical Hive → … → Consumer QR chain as a compact horizontal stepper.
 * Purely presentational: it renders whatever JourneyStage[] it is given.
 * Stages with an href render as links (except pending ones, which have no
 * destination yet).
 */
export function TraceChainStrip({ stages, className = "" }: { stages: JourneyStage[]; className?: string }) {
  return (
    <ol className={`flex items-start gap-0 overflow-x-auto pb-2 ${className}`} aria-label="Traceability chain">
      {stages.map((s, i) => {
        const st = STATUS_STYLE[s.status];
        const clickable = s.href && s.status !== "pending";
        const node = (
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${st.node} ${
              s.status === "active" ? "animate-pulse" : ""
            }`}
            title={s.status === "done" ? `Completed${s.date ? ` · ${fmtDate(s.date)}` : ""}` : s.status === "active" ? "In progress" : "Not yet reached"}
          >
            <Icon name={s.status === "done" ? "check" : s.icon} className={`text-[20px] ${st.icon}`} />
          </span>
        );
        return (
          <li key={s.key} className="flex min-w-[76px] flex-1 items-start">
            <div className="flex flex-col items-center gap-1.5 px-1 text-center">
              {clickable ? (
                <Link href={s.href!} aria-label={`View ${s.label}`} className="rounded-full transition-transform hover:scale-105">
                  {node}
                </Link>
              ) : (
                node
              )}
              <span className={`text-[11px] leading-tight ${st.label}`}>{s.label}</span>
              {s.date && s.status === "done" ? (
                <span className="text-[10px] tabular-nums text-on-surface-variant/70">{fmtDate(s.date)}</span>
              ) : null}
            </div>
            {i < stages.length - 1 ? (
              <span className={`mx-1 mt-[22px] h-0.5 min-w-3 flex-1 rounded-full ${st.line}`} aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Vertical detailed rendering of the same chain — each stage with its date,
 * consumer-safe note and optional destination link.
 */
export function TraceChainList({ stages, className = "" }: { stages: JourneyStage[]; className?: string }) {
  return (
    <ol className={`relative space-y-0 ${className}`}>
      {stages.map((s, i) => {
        const st = STATUS_STYLE[s.status];
        const clickable = s.href && s.status !== "pending";
        const date = fmtDate(s.date);
        return (
          <li key={s.key} className="relative flex gap-4 pb-6 last:pb-0">
            {i < stages.length - 1 ? (
              <span className={`absolute left-[21px] top-12 h-[calc(100%-3rem)] w-0.5 ${st.line}`} aria-hidden />
            ) : null}
            <span className={`z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 ${st.node}`}>
              <Icon name={s.status === "done" ? "check" : s.icon} className={`text-[20px] ${st.icon}`} />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className={`text-body-md ${st.label}`}>{s.label}</p>
                {date ? <p className="text-metadata-sm tabular-nums text-on-surface-variant">{date}</p> : null}
              </div>
              {s.note ? <p className="mt-0.5 text-metadata-sm text-on-surface-variant">{s.note}</p> : null}
              {clickable ? (
                <Link
                  href={s.href!}
                  className="mt-1.5 inline-flex items-center gap-1 text-metadata-sm font-medium text-primary hover:underline"
                >
                  {linkLabelFor(s.key)}
                  <Icon name="arrow_forward" className="text-[14px]" />
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function linkLabelFor(key: JourneyStage["key"]): string {
  switch (key) {
    case "HIVE":
      return "View Hive Passport";
    case "HARVEST":
      return "View Harvest";
    case "BATCH":
      return "View Batch";
    case "CONSUMER_QR":
      return "Verify QR";
    default:
      return "View Traceability";
  }
}

/** Consistently styled chain-navigation button used across trace pages. */
export function ChainLink({
  href,
  icon,
  children,
  variant = "outline",
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
  variant?: "outline" | "filled";
}) {
  const cls =
    variant === "filled"
      ? "bg-primary text-on-primary hover:bg-primary/90"
      : "border border-outline-variant/50 bg-surface text-on-surface hover:bg-surface-variant";
  return (
    <Link
      href={href}
      className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-body-md font-medium transition-colors ${cls}`}
    >
      <Icon name={icon} className="text-[18px]" />
      {children}
    </Link>
  );
}
