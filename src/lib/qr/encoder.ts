// QR Code (ISO/IEC 18004) byte-mode encoder.
//
// Written from the specification rather than pulled from npm: the registry is
// unreachable in this environment, and a label generator is a poor place for a
// dependency that only ever needs to do one thing. Byte mode only — a URL is
// mixed-case and gains nothing from alphanumeric mode.
//
// The pieces, in order: pick a version, lay out the bitstream, add Reed-Solomon
// parity, interleave the blocks, then place everything in the module grid and
// choose the mask that scores best under the spec's four penalty rules.

export type EccLevel = "L" | "M" | "Q" | "H";

export interface QrMatrix {
  /** Width and height in modules, excluding the quiet zone. */
  size: number;
  version: number;
  ecc: EccLevel;
  mask: number;
  /** Row-major `modules[y][x]`; true means dark. */
  modules: boolean[][];
}

// ── Spec tables (Annex D / Table 9) ────────────────────────────────────────
// Index 0 is unused so the version number indexes directly.

const ECC_CODEWORDS_PER_BLOCK: Record<EccLevel, readonly number[]> = {
  L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
};

const ECC_BLOCKS: Record<EccLevel, readonly number[]> = {
  L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
};

/** Two-bit ECC indicator used in the format information — not L,M,Q,H order. */
const ECC_FORMAT_BITS: Record<EccLevel, number> = { L: 1, M: 0, Q: 3, H: 2 };

const MIN_VERSION = 1;
const MAX_VERSION = 40;

// ── Capacity ───────────────────────────────────────────────────────────────

/** Module count available for data and ECC, i.e. excluding function patterns. */
function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36; // version information blocks
  }
  return result;
}

function totalCodewords(version: number): number {
  return Math.floor(rawDataModules(version) / 8);
}

function dataCodewords(version: number, ecc: EccLevel): number {
  return (
    totalCodewords(version) -
    ECC_CODEWORDS_PER_BLOCK[ecc][version] * ECC_BLOCKS[ecc][version]
  );
}

/** Character-count field width for byte mode. */
function charCountBits(version: number): number {
  return version <= 9 ? 8 : 16;
}

function chooseVersion(byteLength: number, ecc: EccLevel): number {
  for (let version = MIN_VERSION; version <= MAX_VERSION; version++) {
    const capacity = dataCodewords(version, ecc) * 8;
    if (4 + charCountBits(version) + byteLength * 8 <= capacity) return version;
  }
  throw new Error(
    `Data too long for a QR code: ${byteLength} bytes exceeds the version-40 ${ecc} capacity.`,
  );
}

// ── GF(2^8) arithmetic, primitive polynomial x^8+x^4+x^3+x^2+1 (0x11D) ─────

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    // Reduce modulo the primitive polynomial whenever bit 8 would be set.
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

/** Coefficients of the degree-`degree` RS generator, highest power omitted. */
function rsGenerator(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

function rsRemainder(data: readonly number[], generator: readonly number[]): number[] {
  const result = new Array<number>(generator.length).fill(0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() as number);
    result.push(0);
    for (let i = 0; i < generator.length; i++) {
      result[i] ^= gfMul(generator[i], factor);
    }
  }
  return result;
}

// ── Bitstream ──────────────────────────────────────────────────────────────

function buildDataCodewords(bytes: Uint8Array, version: number, ecc: EccLevel): number[] {
  const capacityBits = dataCodewords(version, ecc) * 8;
  const bits: number[] = [];
  const append = (value: number, width: number) => {
    for (let i = width - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };

  append(0b0100, 4); // byte mode
  append(bytes.length, charCountBits(version));
  for (const byte of bytes) append(byte, 8);

  // Terminator, then zero-fill to a byte boundary.
  for (let i = 0; i < 4 && bits.length < capacityBits; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }
  // Spec-mandated alternating pad bytes.
  for (let pad = 0xec; codewords.length < capacityBits / 8; pad ^= 0xec ^ 0x11) {
    codewords.push(pad);
  }
  return codewords;
}

/** Splits into blocks, appends parity, and interleaves per §8.6. */
function addEccAndInterleave(data: readonly number[], version: number, ecc: EccLevel): number[] {
  const numBlocks = ECC_BLOCKS[ecc][version];
  const eccLen = ECC_CODEWORDS_PER_BLOCK[ecc][version];
  const rawCodewords = totalCodewords(version);
  const shortBlockDataLen = Math.floor(rawCodewords / numBlocks) - eccLen;
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);

  const generator = rsGenerator(eccLen);
  const blocks: number[][] = [];
  for (let i = 0, offset = 0; i < numBlocks; i++) {
    const length = shortBlockDataLen + (i < numShortBlocks ? 0 : 1);
    const block = data.slice(offset, offset + length);
    offset += length;
    const parity = rsRemainder(block, generator);
    // Pad short blocks to a uniform length so the interleave indices line up;
    // the placeholder is skipped when reading back out.
    if (i < numShortBlocks) block.push(0);
    blocks.push(block.concat(parity));
  }

  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    for (let j = 0; j < blocks.length; j++) {
      if (i !== shortBlockDataLen || j >= numShortBlocks) result.push(blocks[j][i]);
    }
  }
  return result;
}

// ── Module grid ────────────────────────────────────────────────────────────

function getBit(value: number, index: number): boolean {
  return ((value >>> index) & 1) !== 0;
}

class Grid {
  readonly size: number;
  readonly modules: boolean[][];
  /** Function patterns are immune to masking and to data placement. */
  private readonly reserved: boolean[][];

  constructor(readonly version: number, readonly ecc: EccLevel) {
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
    this.reserved = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
  }

  private setFunction(x: number, y: number, dark: boolean): void {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) return;
    this.modules[y][x] = dark;
    this.reserved[y][x] = true;
  }

  drawFunctionPatterns(): void {
    for (let i = 0; i < this.size; i++) {
      this.setFunction(6, i, i % 2 === 0); // vertical timing
      this.setFunction(i, 6, i % 2 === 0); // horizontal timing
    }

    this.drawFinder(3, 3);
    this.drawFinder(this.size - 4, 3);
    this.drawFinder(3, this.size - 4);

    const positions = alignmentPatternPositions(this.version);
    const last = positions.length - 1;
    for (let i = 0; i < positions.length; i++) {
      for (let j = 0; j < positions.length; j++) {
        // The three finder corners already occupy these intersections.
        const isFinderCorner =
          (i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0);
        if (!isFinderCorner) this.drawAlignment(positions[i], positions[j]);
      }
    }

    this.drawFormatBits(0); // placeholder; rewritten once the mask is chosen
    this.drawVersionBits();
  }

  /** 7×7 finder plus its light separator ring. */
  private drawFinder(cx: number, cy: number): void {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        this.setFunction(cx + dx, cy + dy, dist !== 2 && dist !== 4);
      }
    }
  }

  private drawAlignment(cx: number, cy: number): void {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunction(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  /** BCH(15,5) format info, written to both copies. */
  drawFormatBits(mask: number): void {
    const data = (ECC_FORMAT_BITS[this.ecc] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;

    for (let i = 0; i <= 5; i++) this.setFunction(8, i, getBit(bits, i));
    this.setFunction(8, 7, getBit(bits, 6));
    this.setFunction(8, 8, getBit(bits, 7));
    this.setFunction(7, 8, getBit(bits, 8));
    for (let i = 9; i < 15; i++) this.setFunction(14 - i, 8, getBit(bits, i));

    for (let i = 0; i < 8; i++) this.setFunction(this.size - 1 - i, 8, getBit(bits, i));
    for (let i = 8; i < 15; i++) this.setFunction(8, this.size - 15 + i, getBit(bits, i));
    this.setFunction(8, this.size - 8, true); // always-dark module
  }

  /** BCH(18,6) version info, present from version 7 upward. */
  private drawVersionBits(): void {
    if (this.version < 7) return;
    let rem = this.version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (this.version << 12) | rem;

    for (let i = 0; i < 18; i++) {
      const dark = getBit(bits, i);
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFunction(a, b, dark);
      this.setFunction(b, a, dark);
    }
  }

  /** Zigzag placement, two columns at a time, right to left. */
  drawCodewords(codewords: readonly number[]): void {
    let bitIndex = 0;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5; // skip the vertical timing column
      for (let vert = 0; vert < this.size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? this.size - 1 - vert : vert;
          if (!this.reserved[y][x] && bitIndex < codewords.length * 8) {
            this.modules[y][x] = getBit(codewords[bitIndex >>> 3], 7 - (bitIndex & 7));
            bitIndex++;
          }
        }
      }
    }
  }

  /** XOR-symmetric: calling twice with the same mask restores the grid. */
  applyMask(mask: number): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.reserved[y][x]) continue;
        if (maskBit(mask, x, y)) this.modules[y][x] = !this.modules[y][x];
      }
    }
  }
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
    case 7: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: throw new Error(`Invalid mask ${mask}`);
  }
}

function alignmentPatternPositions(version: number): number[] {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const step =
    version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result = [6];
  for (let pos = version * 4 + 17 - 7; result.length < numAlign; pos -= step) {
    result.splice(1, 0, pos);
  }
  return result;
}

// ── Mask selection (§8.8.2 penalty rules) ─────────────────────────────────

function penaltyScore(grid: Grid): number {
  const { size, modules } = grid;
  const N1 = 3, N2 = 3, N3 = 40, N4 = 10;
  let score = 0;

  // Rule 1 (runs of five or more) and rule 3 (1:1:3:1:1 finder lookalikes),
  // scanned in both directions.
  for (let y = 0; y < size; y++) {
    let runColor = false;
    let runLength = 0;
    const history = [0, 0, 0, 0, 0, 0, 0];
    for (let x = 0; x < size; x++) {
      if (modules[y][x] === runColor) {
        runLength++;
        if (runLength === 5) score += N1;
        else if (runLength > 5) score++;
      } else {
        addRunToHistory(runLength, history, size);
        if (!runColor) score += countFinderLookalikes(history) * N3;
        runColor = modules[y][x];
        runLength = 1;
      }
    }
    score += terminateRun(runColor, runLength, history, size) * N3;
  }
  for (let x = 0; x < size; x++) {
    let runColor = false;
    let runLength = 0;
    const history = [0, 0, 0, 0, 0, 0, 0];
    for (let y = 0; y < size; y++) {
      if (modules[y][x] === runColor) {
        runLength++;
        if (runLength === 5) score += N1;
        else if (runLength > 5) score++;
      } else {
        addRunToHistory(runLength, history, size);
        if (!runColor) score += countFinderLookalikes(history) * N3;
        runColor = modules[y][x];
        runLength = 1;
      }
    }
    score += terminateRun(runColor, runLength, history, size) * N3;
  }

  // Rule 2: solid 2×2 blocks.
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = modules[y][x];
      if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) {
        score += N2;
      }
    }
  }

  // Rule 4: deviation from an even dark/light split.
  let dark = 0;
  for (const row of modules) for (const cell of row) if (cell) dark++;
  const total = size * size;
  const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
  return score + k * N4;
}

function addRunToHistory(runLength: number, history: number[], size: number): void {
  // The very first run is preceded by the quiet zone, which counts as light.
  if (history[0] === 0) runLength += size;
  history.pop();
  history.unshift(runLength);
}

function countFinderLookalikes(history: readonly number[]): number {
  const n = history[1];
  const core =
    n > 0 && history[2] === n && history[3] === n * 3 && history[4] === n && history[5] === n;
  return (
    (core && history[0] >= n * 4 && history[6] >= n ? 1 : 0) +
    (core && history[6] >= n * 4 && history[0] >= n ? 1 : 0)
  );
}

function terminateRun(
  runColor: boolean,
  runLength: number,
  history: number[],
  size: number,
): number {
  let length = runLength;
  if (runColor) {
    addRunToHistory(length, history, size);
    length = 0;
  }
  length += size; // trailing quiet zone
  addRunToHistory(length, history, size);
  return countFinderLookalikes(history);
}

// ── Public API ─────────────────────────────────────────────────────────────

export function encodeQr(text: string, ecc: EccLevel = "M"): QrMatrix {
  const bytes = new TextEncoder().encode(text);
  const version = chooseVersion(bytes.length, ecc);

  const codewords = addEccAndInterleave(
    buildDataCodewords(bytes, version, ecc),
    version,
    ecc,
  );

  const grid = new Grid(version, ecc);
  grid.drawFunctionPatterns();
  grid.drawCodewords(codewords);

  let bestMask = 0;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    grid.applyMask(mask);
    grid.drawFormatBits(mask);
    const score = penaltyScore(grid);
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
    }
    grid.applyMask(mask); // undo
  }

  grid.applyMask(bestMask);
  grid.drawFormatBits(bestMask);

  return {
    size: grid.size,
    version,
    ecc,
    mask: bestMask,
    modules: grid.modules,
  };
}
