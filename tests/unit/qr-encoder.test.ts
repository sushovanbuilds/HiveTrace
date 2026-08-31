import { describe, expect, it } from "vitest";
import { encodeQr, type EccLevel, type QrMatrix } from "@/lib/qr/encoder";
import { qrToSvg } from "@/lib/qr/svg";

// The encoder is hand-written against ISO/IEC 18004, so it is verified by
// decoding its own output with an independently written reader below: format
// information, mask, module placement, block interleaving and the bitstream all
// have to agree, and every Reed-Solomon block must have zero syndromes. A
// transcription slip in the capacity tables or a swapped x/y in the zigzag
// walk fails these.

// ── Independent GF(2^8) arithmetic ────────────────────────────────────────

function gfMul(a: number, b: number): number {
  let product = 0;
  let x = a;
  let y = b;
  while (y > 0) {
    if (y & 1) product ^= x;
    y >>= 1;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  return product & 0xff;
}

function gfPow(base: number, exponent: number): number {
  let result = 1;
  for (let i = 0; i < exponent; i++) result = gfMul(result, base);
  return result;
}

// ── Independent reconstruction of the function-pattern mask ───────────────

function reservedMask(version: number): boolean[][] {
  const size = version * 4 + 17;
  const mask = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const reserve = (x: number, y: number) => {
    if (x >= 0 && x < size && y >= 0 && y < size) mask[y][x] = true;
  };

  for (let i = 0; i < size; i++) {
    reserve(i, 6); // horizontal timing
    reserve(6, i); // vertical timing
  }
  for (let y = 0; y <= 8; y++) {
    for (let x = 0; x <= 8; x++) reserve(x, y); // finder + separator + format
  }
  for (let y = 0; y <= 8; y++) {
    for (let x = size - 8; x < size; x++) reserve(x, y);
  }
  for (let y = size - 8; y < size; y++) {
    for (let x = 0; x <= 8; x++) reserve(x, y);
  }

  for (const cy of alignmentCenters(version)) {
    for (const cx of alignmentCenters(version)) {
      // Skip the three finder corners, which carry no alignment pattern.
      if (mask[cy]?.[cx] && isFinderCorner(cx, cy, size)) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) reserve(cx + dx, cy + dy);
      }
    }
  }

  if (version >= 7) {
    for (let y = 0; y <= 5; y++) {
      for (let x = size - 11; x <= size - 9; x++) reserve(x, y);
    }
    for (let y = size - 11; y <= size - 9; y++) {
      for (let x = 0; x <= 5; x++) reserve(x, y);
    }
  }
  return mask;
}

function isFinderCorner(cx: number, cy: number, size: number): boolean {
  const nearStart = (v: number) => v <= 8;
  const nearEnd = (v: number) => v >= size - 9;
  return (
    (nearStart(cx) && nearStart(cy)) ||
    (nearEnd(cx) && nearStart(cy)) ||
    (nearStart(cx) && nearEnd(cy))
  );
}

function alignmentCenters(version: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const result = [6];
  for (let pos = version * 4 + 10; result.length < count; pos -= step) result.splice(1, 0, pos);
  return result;
}

// ── Decoder ───────────────────────────────────────────────────────────────

const ECC_FROM_FORMAT: Record<number, EccLevel> = { 1: "L", 0: "M", 3: "Q", 2: "H" };

function readFormatInfo(matrix: QrMatrix): { ecc: EccLevel; mask: number } {
  const { modules } = matrix;
  const positions: Array<[number, number]> = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  let bits = 0;
  positions.forEach(([x, y], i) => {
    if (modules[y][x]) bits |= 1 << i;
  });
  const data = (bits ^ 0x5412) >>> 10;
  expect(ECC_FROM_FORMAT[data >> 3]).toBeDefined();
  return { ecc: ECC_FROM_FORMAT[data >> 3], mask: data & 0b111 };
}

function maskBit(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

/** Walks the zigzag in the same order the writer does and rebuilds codewords. */
function readCodewords(matrix: QrMatrix, mask: number, reserved: boolean[][]): number[] {
  const { size, modules } = matrix;
  const bits: number[] = [];
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (reserved[y][x]) continue;
        const unmasked = modules[y][x] !== maskBit(mask, x, y);
        bits.push(unmasked ? 1 : 0);
      }
    }
  }
  const codewords: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }
  return codewords;
}

const ECC_PER_BLOCK: Record<EccLevel, readonly number[]> = {
  L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
  M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
  Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24],
  H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28],
};
const BLOCK_COUNT: Record<EccLevel, readonly number[]> = {
  L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
  M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
  Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8],
  H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8],
};

function deinterleave(
  stream: readonly number[],
  version: number,
  ecc: EccLevel,
): number[][] {
  const numBlocks = BLOCK_COUNT[ecc][version];
  const eccLen = ECC_PER_BLOCK[ecc][version];
  const total = stream.length;
  const shortDataLen = Math.floor(total / numBlocks) - eccLen;
  const numShort = numBlocks - (total % numBlocks);

  const blocks: number[][] = Array.from({ length: numBlocks }, () => []);
  let cursor = 0;
  const maxLen = shortDataLen + 1 + eccLen;
  for (let i = 0; i < maxLen; i++) {
    for (let j = 0; j < numBlocks; j++) {
      if (i === shortDataLen && j < numShort) continue;
      if (cursor < total) blocks[j].push(stream[cursor++]);
    }
  }
  expect(cursor).toBe(total);
  return blocks;
}

/** Zero syndromes prove the parity bytes are a valid RS codeword. */
function syndromesAreZero(block: readonly number[], eccLen: number): boolean {
  for (let i = 0; i < eccLen; i++) {
    const root = gfPow(2, i);
    let value = 0;
    for (const coefficient of block) value = gfMul(value, root) ^ coefficient;
    if (value !== 0) return false;
  }
  return true;
}

function decode(matrix: QrMatrix): string {
  const format = readFormatInfo(matrix);
  expect(format.ecc).toBe(matrix.ecc);
  expect(format.mask).toBe(matrix.mask);

  const reserved = reservedMask(matrix.version);
  const stream = readCodewords(matrix, format.mask, reserved);
  const blocks = deinterleave(stream, matrix.version, format.ecc);
  const eccLen = ECC_PER_BLOCK[format.ecc][matrix.version];

  const data: number[] = [];
  for (const block of blocks) {
    expect(syndromesAreZero(block, eccLen)).toBe(true);
    data.push(...block.slice(0, block.length - eccLen));
  }

  const bits: number[] = [];
  for (const byte of data) {
    for (let i = 7; i >= 0; i--) bits.push((byte >>> i) & 1);
  }
  const take = (count: number) => {
    let value = 0;
    for (let i = 0; i < count; i++) value = (value << 1) | bits.shift()!;
    return value;
  };

  expect(take(4)).toBe(0b0100); // byte mode
  const length = take(matrix.version <= 9 ? 8 : 16);
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) bytes[i] = take(8);
  return new TextDecoder().decode(bytes);
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("QR encoder", () => {
  it("round-trips a verification URL through an independent decoder", () => {
    const url =
      "https://hivetrace.example/verify/HC-2026-K7QM2X?t=v1.eyJiYXRjaElkIjoiYmF0Y2hfMSJ9.abcdef";
    const matrix = encodeQr(url, "M");
    expect(decode(matrix)).toBe(url);
  });

  it("round-trips across every error correction level", () => {
    const text = "HC-2026-ABCDEF";
    for (const ecc of ["L", "M", "Q", "H"] as const) {
      const matrix = encodeQr(text, ecc);
      expect(matrix.ecc).toBe(ecc);
      expect(decode(matrix), `ecc=${ecc}`).toBe(text);
    }
  });

  it("round-trips at each version boundary it selects", () => {
    // One string per length that pushes the encoder into a new version, so the
    // capacity table and the multi-block interleave paths are both exercised.
    for (const length of [1, 14, 15, 26, 27, 62, 63, 106, 107, 152]) {
      const text = "H".repeat(length);
      const matrix = encodeQr(text, "M");
      expect(decode(matrix), `length=${length} version=${matrix.version}`).toBe(text);
    }
  });

  it("encodes multi-byte UTF-8 without corrupting it", () => {
    const text = "Kashmir · 24.1% · मधु";
    expect(decode(encodeQr(text, "M"))).toBe(text);
  });

  it("places the three finder patterns", () => {
    const { modules, size } = encodeQr("finder", "M");
    for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
      expect(modules[cy][cx], `centre ${cx},${cy}`).toBe(true);
      expect(modules[cy - 1][cx - 1]).toBe(true);
      expect(modules[cy - 2][cx]).toBe(false); // light ring
      expect(modules[cy - 3][cx]).toBe(true); // outer border
    }
  });

  it("grows the version as the payload grows", () => {
    expect(encodeQr("short", "M").version).toBeLessThan(
      encodeQr("x".repeat(300), "M").version,
    );
  });

  it("rejects a payload beyond version 40", () => {
    expect(() => encodeQr("x".repeat(3000), "H")).toThrow(/too long/i);
  });
});

describe("qrToSvg", () => {
  it("emits a self-contained SVG sized in module units", () => {
    const svg = qrToSvg("https://hivetrace.example/verify/HC-2026-ABCDEF");
    const size = encodeQr("https://hivetrace.example/verify/HC-2026-ABCDEF", "M").size;
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(svg).toContain(`viewBox="0 0 ${size + 8} ${size + 8}"`);
    expect(svg).toContain("<path d=\"M");
  });

  it("escapes the accessible title", () => {
    const svg = qrToSvg("x", { title: 'Batch "A" & <B>' });
    expect(svg).toContain("<title>Batch &quot;A&quot; &amp; &lt;B&gt;</title>");
    expect(svg).not.toContain("<B>");
  });

  it("marks a titleless code as decorative", () => {
    expect(qrToSvg("x", { title: null })).toContain('aria-hidden="true"');
  });
});
