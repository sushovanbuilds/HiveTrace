"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-outline-variant/30 bg-surface p-2.5">
      <span className="hash-mono truncate text-[12px] tracking-wider text-secondary">{value}</span>
      <button
        type="button"
        aria-label="Copy"
        onClick={() => {
          navigator.clipboard?.writeText(value).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="text-primary transition-colors hover:text-primary-fixed-dim"
      >
        <Icon name={copied ? "check" : "content_copy"} fill={copied} className="text-[18px]" />
      </button>
    </div>
  );
}