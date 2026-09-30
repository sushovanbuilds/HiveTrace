import type { ReactNode } from "react";
import { Icon } from "@/components/icons";

/** Section heading used across HiveOS panels. */
export function SectionTitle({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <h3 className="mb-4 flex items-center gap-2 text-metadata-sm font-semibold uppercase tracking-wider text-on-surface-variant">
      <Icon name={icon} className="text-[18px]" />
      {children}
    </h3>
  );
}

/**
 * Honesty label rendered under every HiveOS intelligence output.
 * The rules are prototypes — the UI must never present them as validated.
 */
export function ProtoNote({ children }: { children?: ReactNode }) {
  return (
    <p className="mt-4 flex items-start gap-1.5 text-[12px] leading-relaxed text-on-surface-variant/80">
      <Icon name="info" className="mt-0.5 shrink-0 text-[14px]" />
      <span>
        {children ?? "Prototype rules (hiveos-proto-v1) over demo observations — not trained ML, not a scientifically validated prediction."}
      </span>
    </p>
  );
}
