"use client";

import { Icon } from "@/components/icons";

/**
 * Small, non-intrusive "Demo Mode" indicator. Rendered in the profile/menu area
 * rather than as a full-page warning, so it never drowns the interface.
 */
export function DemoBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-primary-container/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-on-primary-container ${
        compact ? "" : "ring-1 ring-primary/20"
      }`}
      title="Demo Mode — sample workspace data"
    >
      <Icon name="science" className="text-[14px]" fill />
      Demo Mode
    </span>
  );
}
