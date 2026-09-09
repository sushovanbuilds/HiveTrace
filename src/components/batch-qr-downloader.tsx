"use client";

import { useState, useEffect, useId } from "react";
import { Icon } from "@/components/icons";
import {
  generateBatchNumber,
  generateBatchQrCode,
  downloadBatchQrCode,
  type BatchNumberOptions,
} from "@/lib/batch-qr";

export interface BatchQrDownloaderProps {
  /** Optional initial batch number. If omitted, one is automatically generated. */
  batchNumber?: string;
  /** Custom base URL for verification links. */
  baseUrl?: string;
  /** Preset color scheme: 'honey' | 'classic' | 'forest' | 'ocean' | 'dark' | 'amber'. Default 'honey'. */
  preset?: "honey" | "classic" | "forest" | "ocean" | "dark" | "amber";
  /** Optional callback fired when a new batch number is automatically generated. */
  onBatchNumberChange?: (batchNumber: string) => void;
  /** Whether to show the button to generate a new batch number. Default true. */
  showGenerateButton?: boolean;
  /** Custom title for the card. */
  title?: string;
  /** Optional className wrapper. */
  className?: string;
}

export function BatchQrDownloader({
  batchNumber: initialBatchNumber,
  baseUrl,
  preset = "honey",
  onBatchNumberChange,
  showGenerateButton = true,
  title = "Batch QR Code",
  className = "",
}: BatchQrDownloaderProps) {
  const [currentBatchNumber, setCurrentBatchNumber] = useState<string>(
    initialBatchNumber || generateBatchNumber()
  );
  const [downloading, setDownloading] = useState<"svg" | "png" | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync if parent updates batchNumber prop
  useEffect(() => {
    if (initialBatchNumber && initialBatchNumber !== currentBatchNumber) {
      setCurrentBatchNumber(initialBatchNumber);
    }
  }, [initialBatchNumber]);

  // Compute the live QR code data
  const qr = generateBatchQrCode(currentBatchNumber, {
    baseUrl,
    preset,
    pixelSize: 220,
  });

  // Handle generating a new batch number
  function handleGenerateNewBatch(options?: BatchNumberOptions) {
    const newCode = generateBatchNumber(options);
    setCurrentBatchNumber(newCode);
    if (onBatchNumberChange) {
      onBatchNumberChange(newCode);
    }
  }

  // Handle download
  async function handleDownload(format: "svg" | "png") {
    setDownloading(format);
    try {
      await downloadBatchQrCode({
        batchNumber: currentBatchNumber,
        format,
        svg: qr.svg,
        preset,
      });
    } finally {
      setTimeout(() => setDownloading(null), 600);
    }
  }

  // Copy batch number to clipboard
  function handleCopy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(currentBatchNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/90 p-5 shadow-sm backdrop-blur-xl ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-outline-variant/20 pb-4">
        <div>
          <span className="font-label-caps text-[11px] uppercase tracking-widest text-secondary">
            {title}
          </span>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-[16px] font-semibold tracking-tight text-on-surface">
              {currentBatchNumber}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              title="Copy batch number"
              className="rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface"
            >
              <Icon name={copied ? "check" : "content_copy"} className="text-[15px]" />
            </button>
          </div>
        </div>

        {showGenerateButton && (
          <button
            type="button"
            onClick={() => handleGenerateNewBatch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-low px-3 py-1.5 text-metadata-sm font-medium text-on-surface transition-all hover:border-primary/50 hover:bg-surface-container active:scale-95"
            title="Generate a new batch number"
          >
            <Icon name="refresh" className="text-[16px] text-primary" />
            <span>New Batch</span>
          </button>
        )}
      </div>

      {/* QR Code Display */}
      <div className="my-5 flex flex-col items-center justify-center">
        <div className="rounded-xl border border-outline-variant/30 bg-white p-3 shadow-inner">
          <img
            src={qr.dataUri}
            width={180}
            height={180}
            alt={`QR code for batch ${currentBatchNumber}`}
            className="rounded-lg"
          />
        </div>
        <p className="mt-3 text-center text-[12px] text-on-surface-variant">
          Scan to verify origin and provenance on-chain.
        </p>
      </div>

      {/* Download Actions */}
      <div className="grid grid-cols-2 gap-2.5 pt-2">
        <button
          type="button"
          onClick={() => handleDownload("svg")}
          disabled={downloading !== null}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container px-3 py-2 text-metadata-sm font-semibold text-on-surface transition-all hover:bg-surface-variant active:scale-98 disabled:opacity-60"
        >
          {downloading === "svg" ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/40 border-t-primary" />
          ) : (
            <Icon name="download" className="text-[18px] text-primary" />
          )}
          <span>Download SVG</span>
        </button>

        <button
          type="button"
          onClick={() => handleDownload("png")}
          disabled={downloading !== null}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-metadata-sm font-semibold text-on-primary shadow-sm transition-all hover:bg-primary/90 active:scale-98 disabled:opacity-60"
        >
          {downloading === "png" ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary" />
          ) : (
            <Icon name="image" className="text-[18px]" />
          )}
          <span>Download PNG</span>
        </button>
      </div>
    </div>
  );
}
