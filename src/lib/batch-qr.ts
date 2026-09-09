import { qrToSvg, type QrSvgOptions } from "@/lib/qr/svg";

export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface BatchNumberOptions {
  /** Prefix for the batch code. Defaults to 'HC' (HoneyChain/HiveTrace). */
  prefix?: string;
  /** Year to embed. Defaults to current UTC year (e.g. 2026). */
  year?: number;
  /** Optional region code to embed (e.g. 'PUR', 'WB-PUR', 'KAS'). */
  region?: string;
  /** Optional date override (defaults to current date). */
  date?: Date;
  /** Length of the random alphanumeric suffix. Defaults to 6. */
  suffixLength?: number;
  /** Optional custom suffix or sequential number (e.g. '001' or 1). */
  suffix?: string | number;
}

/**
 * Automatically generates a unique, human-readable batch number for a new batch.
 *
 * Uses an unambiguous alphabet (no 0/O or 1/I) to prevent misreading on printed labels.
 * Safe across both browser and Node.js environments.
 *
 * Formats:
 * - Default: `HC-2026-X8K9M2`
 * - With region: `WB-PUR-2026-X8K9M2` or `HC-PUR-2026-X8K9M2`
 * - With sequence: `HC-2026-001`
 */
export function generateBatchNumber(options?: BatchNumberOptions): string {
  const date = options?.date ?? new Date();
  const year = options?.year ?? date.getUTCFullYear();
  const prefix = options?.prefix ?? (options?.region ? options.region : "HC");

  let suffix: string;
  if (options?.suffix !== undefined) {
    suffix =
      typeof options.suffix === "number"
        ? String(options.suffix).padStart(3, "0")
        : String(options.suffix);
  } else {
    const len = options?.suffixLength ?? 6;
    suffix = generateRandomSuffix(len);
  }

  // If both prefix and distinct region are provided:
  if (options?.prefix && options?.region && options.prefix !== options.region) {
    return `${options.prefix}-${options.region}-${year}-${suffix}`;
  }

  return `${prefix}-${year}-${suffix}`;
}

/** Generates cryptographically sound random suffix characters using the safe alphabet. */
function generateRandomSuffix(length: number): string {
  const bytes = new Uint8Array(length);
  if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    // Math.random fallback if crypto is unavailable
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let result = "";
  for (let i = 0; i < length; i++) {
    result += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return result;
}

// ── QR Code Generator ────────────────────────────────────────────────────────

export interface BatchQrOptions extends QrSvgOptions {
  /** The batch number / public code (e.g. 'HC-2026-X8K9M2'). */
  batchNumber?: string;
  publicCode?: string;
  /** Base URL for verification links (e.g. 'https://hivetrace.org' or window.location.origin). */
  baseUrl?: string;
  /** Explicit verification URL to encode into the QR. If omitted, constructed from baseUrl + batch number. */
  verificationUrl?: string;
  /** Optional verification token for signed labels. */
  token?: string;
}

export interface GeneratedBatchQr {
  batchNumber: string;
  publicCode: string;
  verificationUrl: string;
  svg: string;
  dataUri: string;
  pixelSize: number;
}

/**
 * Generates a styled QR code specifically for a batch.
 *
 * Encodes the batch verification URL with HoneyChain styling, preset colors,
 * accessible titles, and scannable quiet zones.
 *
 * @param batch Batch number string or BatchQrOptions configuration.
 * @param options Optional overrides when batch number string is supplied.
 */
export function generateBatchQrCode(
  batch: string | BatchQrOptions,
  options?: Partial<BatchQrOptions>,
): GeneratedBatchQr {
  const opts: BatchQrOptions =
    typeof batch === "string" ? { batchNumber: batch, ...options } : { ...batch, ...options };
  const batchNumber = opts.batchNumber || opts.publicCode || generateBatchNumber();

  let verificationUrl = opts.verificationUrl;
  if (!verificationUrl) {
    let base = opts.baseUrl;
    if (!base && typeof window !== "undefined" && window.location?.origin) {
      base = window.location.origin;
    }
    base = base ? base.replace(/\/+$/, "") : "";
    const path = `/verify/${encodeURIComponent(batchNumber)}`;
    verificationUrl = base ? `${base}${path}` : path;
    if (opts.token) {
      const separator = verificationUrl.includes("?") ? "&" : "?";
      verificationUrl = `${verificationUrl}${separator}t=${encodeURIComponent(opts.token)}`;
    }
  }

  const pixelSize = opts.pixelSize ?? 240;
  const preset = opts.preset ?? "honey";
  const title = opts.title ?? `Verification QR for batch ${batchNumber}`;

  const svg = qrToSvg(verificationUrl, {
    ...opts,
    pixelSize,
    preset,
    title,
  });

  const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  return {
    batchNumber,
    publicCode: batchNumber,
    verificationUrl,
    svg,
    dataUri,
    pixelSize,
  };
}

// ── QR Downloader ───────────────────────────────────────────────────────────

export interface DownloadBatchQrOptions extends Partial<BatchQrOptions> {
  batchNumber?: string;
  publicCode?: string;
  format?: "svg" | "png";
  filename?: string;
  svg?: string;
  pngScale?: number;
}

export interface DownloadResult {
  success: boolean;
  filename: string;
  format: "svg" | "png";
  reason?: string;
}

/**
 * Downloads a QR code for a batch to the user's computer.
 *
 * Supports both SVG (vector) and PNG (raster at high print resolution) formats.
 * In browser environments, programmatically triggers the file download.
 * In non-browser environments, returns a safe status result without throwing.
 */
export async function downloadBatchQrCode(
  options: string | DownloadBatchQrOptions,
): Promise<DownloadResult> {
  const opts: DownloadBatchQrOptions =
    typeof options === "string" ? { batchNumber: options } : options;
  const batchNumber = opts.batchNumber || opts.publicCode || "batch";
  const format = opts.format ?? "svg";
  const filename = opts.filename ?? `${batchNumber}-qr.${format}`;

  // If outside browser environment:
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      success: false,
      filename,
      format,
      reason: "browser_environment_required",
    };
  }

  // Get or generate SVG content
  let svg = opts.svg;
  if (!svg) {
    const generated = generateBatchQrCode({
      ...opts,
      batchNumber,
    });
    svg = generated.svg;
  }

  try {
    if (format === "svg") {
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      triggerBlobDownload(blob, filename);
      return { success: true, filename, format };
    } else {
      // PNG download via offscreen Canvas
      const pixelSize = opts.pixelSize ?? 240;
      const scale = opts.pngScale ?? 2; // 2x scale for sharp print quality
      const canvasSize = pixelSize * scale;

      const blob = await svgToPngBlob(svg, canvasSize, canvasSize);
      triggerBlobDownload(blob, filename);
      return { success: true, filename, format };
    }
  } catch (error) {
    return {
      success: false,
      filename,
      format,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function svgToPngBlob(svgString: string, width: number, height: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to acquire 2D canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to convert canvas to PNG blob"));
        }
      }, "image/png");
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG into image: " + String(e)));
    };

    img.src = url;
  });
}

// ── Batch + QR Orchestration ────────────────────────────────────────────────

/**
 * Convenience helper: automatically generates a new batch number,
 * generates its QR code, and provides a direct downloader function.
 */
export function createBatchWithQr(options?: BatchNumberOptions & Partial<BatchQrOptions>) {
  const batchNumber = generateBatchNumber(options);
  const qr = generateBatchQrCode(batchNumber, options);

  return {
    batchNumber,
    publicCode: batchNumber,
    qr,
    download: (format: "svg" | "png" = "svg") =>
      downloadBatchQrCode({
        batchNumber,
        format,
        svg: qr.svg,
        ...options,
      }),
  };
}
