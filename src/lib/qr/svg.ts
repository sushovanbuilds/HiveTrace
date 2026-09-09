import { encodeQr, type EccLevel, type QrMatrix } from "./encoder";

// ── Color presets ───────────────────────────────────────────────────────────

export interface QrColorPreset {
  dark: string;
  light: string;
  label: string;
}

export const QR_COLOR_PRESETS: Record<string, QrColorPreset> = {
  classic: { dark: "#24231f", light: "#ffffff", label: "Classic Black" },
  honey: { dark: "#b8860b", light: "#fffbe6", label: "Honey Gold" },
  forest: { dark: "#2d5016", light: "#f0f7e6", label: "Forest Green" },
  ocean: { dark: "#1a5276", light: "#eaf2f8", label: "Ocean Blue" },
  dark: { dark: "#ffffff", light: "#1a1a2e", label: "Inverted Dark" },
  amber: { dark: "#7c2d12", light: "#fef3c7", label: "Amber Warm" },
};

// ── Options ─────────────────────────────────────────────────────────────────

export interface QrSvgOptions {
  /** Error correction level. M survives ~15% damage and suits printed labels. */
  ecc?: EccLevel;
  /** Light border, in modules. The spec requires at least 4 for reliable scanning. */
  quietZone?: number;
  /** Rendered edge length in CSS pixels. */
  pixelSize?: number;
  dark?: string;
  light?: string;
  /** Accessible name. Pass null for a purely decorative code. */
  title?: string | null;
  /**
   * Color preset name. Overrides `dark`/`light` when set.
   * One of: classic, honey, forest, ocean, dark, amber.
   */
  preset?: string;
  /**
   * Base64-encoded logo data URI (e.g. "data:image/png;base64,...") or a
   * relative path to an image. When set, ECC is forced to H (30% tolerance)
   * and the logo is centered with a white pad.
   */
  logo?: string;
  /** Logo size as a fraction of the QR code width (0.1–0.3). Default 0.2. */
  logoSize?: number;
  /** Border radius on each module in module units (0 = square, 0.4 = rounded). */
  moduleRadius?: number;
}

// ── Main renderer ───────────────────────────────────────────────────────────

/**
 * Renders a QR code as an SVG string with optional customization.
 *
 * Supports color presets, logo embedding (centered with background pad),
 * and rounded module corners. When a logo is provided, ECC level is forced
 * to H to maintain scannability despite the occluded center.
 */
export function qrToSvg(text: string, options: QrSvgOptions = {}): string {
  const preset = options.preset ? QR_COLOR_PRESETS[options.preset] : undefined;
  const {
    ecc: requestedEcc = "M",
    quietZone = 4,
    pixelSize = 240,
    dark = preset?.dark ?? "#24231f",
    light = preset?.light ?? "#ffffff",
    title = "QR code",
    logo,
    logoSize = 0.2,
    moduleRadius = 0,
  } = options;

  // Logo occlusion requires the highest error correction level.
  const ecc: EccLevel = logo ? "H" : requestedEcc;

  const matrix = encodeQr(text, ecc);
  const extent = matrix.size + quietZone * 2;

  const titleMarkup = title
    ? `<title>${escapeXml(title)}</title>`
    : "";
  const ariaAttrs = title ? 'role="img"' : 'role="presentation" aria-hidden="true"';

  let content: string;

  if (moduleRadius > 0) {
    content = modulesToRoundedPath(matrix, quietZone, moduleRadius);
  } else {
    content = modulesToPath(matrix, quietZone);
  }

  let svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${extent} ${extent}" ` +
    `width="${pixelSize}" height="${pixelSize}" shape-rendering="crispEdges" ${ariaAttrs}>` +
    titleMarkup +
    `<rect width="${extent}" height="${extent}" fill="${light}"/>` +
    `<path d="${content}" fill="${dark}"/>`;

  // Embed a centered logo with a white background pad.
  if (logo) {
    const logoModules = Math.floor(matrix.size * logoSize);
    const logoPadding = Math.max(1, Math.floor(logoModules * 0.15));
    const totalLogoArea = logoModules + logoPadding * 2;
    const offset = (extent - totalLogoArea) / 2;

    svg += `<rect x="${offset}" y="${offset}" width="${totalLogoArea}" height="${totalLogoArea}" rx="${logoPadding * 0.5}" fill="${light}"/>`;
    svg += `<image href="${escapeXml(logo)}" x="${offset + logoPadding}" y="${offset + logoPadding}" width="${logoModules}" height="${logoModules}" preserveAspectRatio="xMidYMid slice"/>`;
  }

  svg += `</svg>`;
  return svg;
}

// ── Path generators ─────────────────────────────────────────────────────────

/** Horizontal runs of dark modules, emitted as one rectangle each. */
function modulesToPath(matrix: QrMatrix, quietZone: number): string {
  const parts: string[] = [];
  for (let y = 0; y < matrix.size; y++) {
    let runStart = -1;
    for (let x = 0; x <= matrix.size; x++) {
      const dark = x < matrix.size && matrix.modules[y][x];
      if (dark && runStart < 0) {
        runStart = x;
      } else if (!dark && runStart >= 0) {
        parts.push(`M${runStart + quietZone} ${y + quietZone}h${x - runStart}v1h-${x - runStart}z`);
        runStart = -1;
      }
    }
  }
  return parts.join("");
}

/** Individual rounded-rect modules for a softer, more modern look. */
function modulesToRoundedPath(matrix: QrMatrix, quietZone: number, radius: number): string {
  const parts: string[] = [];
  const r = Math.min(0.5, Math.max(0, radius));
  for (let y = 0; y < matrix.size; y++) {
    for (let x = 0; x < matrix.size; x++) {
      if (!matrix.modules[y][x]) continue;
      const cx = x + quietZone;
      const cy = y + quietZone;
      // SVG rounded rect at module scale
      parts.push(
        `M${cx + r} ${cy}` +
        `h${1 - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}` +
        `v${1 - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}` +
        `h${-(1 - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}` +
        `v${-(1 - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`
      );
    }
  }
  return parts.join("");
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** `data:` URL form, for `<img src>` and for embedding in printable labels. */
export function qrToDataUri(text: string, options?: QrSvgOptions): string {
  const svg = qrToSvg(text, options);
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
