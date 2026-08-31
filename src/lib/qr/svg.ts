import { encodeQr, type EccLevel, type QrMatrix } from "./encoder";

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
}

/**
 * Renders a QR code as a single-path SVG.
 *
 * One `<path>` of rectangles rather than N `<rect>` elements: a version-7 code
 * is ~400 dark modules, and the element-per-module version bloats the DOM for
 * no visual gain. The `viewBox` is in module units so the code scales to any
 * size without re-encoding.
 */
export function qrToSvg(text: string, options: QrSvgOptions = {}): string {
  const {
    ecc = "M",
    quietZone = 4,
    pixelSize = 240,
    dark = "#24231f",
    light = "#ffffff",
    title = "QR code",
  } = options;

  const matrix = encodeQr(text, ecc);
  const extent = matrix.size + quietZone * 2;
  const path = modulesToPath(matrix, quietZone);

  // Titles are the only place caller-supplied text lands in the markup, so it
  // is escaped rather than interpolated raw.
  const titleMarkup = title
    ? `<title>${escapeXml(title)}</title>`
    : "";
  const ariaAttrs = title ? 'role="img"' : 'role="presentation" aria-hidden="true"';

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${extent} ${extent}" ` +
    `width="${pixelSize}" height="${pixelSize}" shape-rendering="crispEdges" ${ariaAttrs}>` +
    titleMarkup +
    `<rect width="${extent}" height="${extent}" fill="${light}"/>` +
    `<path d="${path}" fill="${dark}"/>` +
    `</svg>`
  );
}

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
