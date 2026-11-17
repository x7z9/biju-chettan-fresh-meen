// Pure zero-dependency TypeScript QR Code Matrix Encoder (ISO/IEC 18004, Error Correction Level L, Versions 1..25)
// Works 100% offline in browser and Node/tsx with zero external APIs.

const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    EXP_TABLE[i + 255] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]];
}

function gfPolyMul(p: Uint8Array, q: Uint8Array): Uint8Array {
  const res = new Uint8Array(p.length + q.length - 1);
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) {
      res[i + j] ^= gfMul(p[i], q[j]);
    }
  }
  return res;
}

function rsGeneratorPoly(ecCount: number): Uint8Array {
  let poly: Uint8Array = new Uint8Array([1]);
  for (let i = 0; i < ecCount; i++) {
    poly = gfPolyMul(poly, new Uint8Array([1, EXP_TABLE[i]]));
  }
  return poly;
}

function rsEncode(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsGeneratorPoly(ecCount);
  const res = new Uint8Array(data.length + ecCount);
  res.set(data);
  for (let i = 0; i < data.length; i++) {
    const factor = res[i];
    if (factor !== 0) {
      for (let j = 0; j < gen.length; j++) {
        res[i + j] ^= gfMul(gen[j], factor);
      }
    }
  }
  return res.slice(data.length);
}

// EC Level L block parameters for Versions 1..25:
// [totalCodewords, ecPerBlock, g1Blocks, g1DataCw, g2Blocks, g2DataCw]
const VERSION_L_SPECS: ReadonlyArray<
  readonly [number, number, number, number, number, number]
> = [
  [0, 0, 0, 0, 0, 0], // placeholder v0
  [26, 7, 1, 19, 0, 0], // v1
  [44, 10, 1, 34, 0, 0], // v2
  [70, 15, 1, 55, 0, 0], // v3
  [100, 20, 1, 80, 0, 0], // v4
  [134, 26, 1, 108, 0, 0], // v5
  [172, 18, 2, 68, 0, 0], // v6
  [196, 20, 2, 78, 0, 0], // v7
  [242, 24, 2, 97, 0, 0], // v8
  [292, 30, 2, 116, 0, 0], // v9
  [346, 18, 2, 68, 2, 69], // v10
  [404, 20, 4, 81, 0, 0], // v11
  [466, 24, 2, 92, 2, 93], // v12
  [532, 26, 4, 107, 0, 0], // v13
  [581, 30, 3, 115, 1, 116], // v14
  [655, 22, 5, 87, 1, 88], // v15
  [733, 24, 5, 98, 1, 99], // v16
  [815, 28, 1, 107, 5, 108], // v17
  [901, 30, 5, 120, 1, 121], // v18
  [991, 28, 3, 113, 4, 114], // v19
  [1085, 28, 3, 107, 5, 108], // v20
  [1156, 28, 4, 116, 4, 117], // v21
  [1258, 28, 2, 111, 7, 112], // v22
  [1364, 30, 4, 121, 5, 122], // v23
  [1474, 30, 6, 117, 4, 118], // v24
  [1588, 26, 8, 106, 4, 107], // v25
];

const ALIGNMENT_CENTERS: ReadonlyArray<readonly number[]> = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
  [6, 28, 50, 72, 94],
  [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110],
];

function formatInfoBits(mask: number): number {
  // EC Level L = 01 (bits 4..3), mask (bits 2..0)
  const data = (0b01 << 3) | (mask & 0b111);
  let rem = data << 10;
  const poly = 0b10100110111;
  for (let bit = 14; bit >= 10; bit--) {
    if ((rem >> bit) & 1) rem ^= poly << (bit - 10);
  }
  return ((data << 10) | rem) ^ 0b101010000010010;
}

function versionInfoBits(version: number): number {
  let rem = version << 12;
  const poly = 0b1111100100101;
  for (let bit = 17; bit >= 12; bit--) {
    if ((rem >> bit) & 1) rem ^= poly << (bit - 12);
  }
  return (version << 12) | rem;
}

function chooseVersion(byteLen: number): number {
  for (let v = 1; v <= 25; v++) {
    const [, , b1, d1, b2, d2] = VERSION_L_SPECS[v];
    const capacityBytes = b1 * d1 + b2 * d2;
    const headerBits = 4 + (v <= 9 ? 8 : 16);
    const totalNeededBits = headerBits + byteLen * 8;
    if (Math.ceil(totalNeededBits / 8) <= capacityBytes) {
      return v;
    }
  }
  return -1;
}

function buildCodewords(bytes: Uint8Array, version: number): Uint8Array {
  const [, ecPerBlock, b1, d1, b2, d2] = VERSION_L_SPECS[version];
  const totalDataCw = b1 * d1 + b2 * d2;

  const bitBuf: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bitBuf.push((val >> i) & 1);
    }
  };

  // Mode indicator 0100 (Byte mode)
  pushBits(0b0100, 4);
  pushBits(bytes.length, version <= 9 ? 8 : 16);
  for (let i = 0; i < bytes.length; i++) {
    pushBits(bytes[i], 8);
  }

  const maxBits = totalDataCw * 8;
  const termLen = Math.min(4, maxBits - bitBuf.length);
  for (let i = 0; i < termLen; i++) bitBuf.push(0);
  while (bitBuf.length % 8 !== 0) bitBuf.push(0);

  const dataCw = new Uint8Array(totalDataCw);
  let byteIdx = 0;
  for (let i = 0; i < bitBuf.length; i += 8) {
    let val = 0;
    for (let j = 0; j < 8; j++) val = (val << 1) | bitBuf[i + j];
    dataCw[byteIdx++] = val;
  }
  let padToggle = 0;
  while (byteIdx < totalDataCw) {
    dataCw[byteIdx++] = padToggle % 2 === 0 ? 0xec : 0x11;
    padToggle++;
  }

  // Split into RS blocks & interleave
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;
  for (let i = 0; i < b1; i++) {
    const blk = dataCw.slice(offset, offset + d1);
    offset += d1;
    dataBlocks.push(blk);
    ecBlocks.push(rsEncode(blk, ecPerBlock));
  }
  for (let i = 0; i < b2; i++) {
    const blk = dataCw.slice(offset, offset + d2);
    offset += d2;
    dataBlocks.push(blk);
    ecBlocks.push(rsEncode(blk, ecPerBlock));
  }

  const out: number[] = [];
  const maxDataLen = Math.max(d1, d2);
  for (let col = 0; col < maxDataLen; col++) {
    for (const blk of dataBlocks) {
      if (col < blk.length) out.push(blk[col]);
    }
  }
  for (let col = 0; col < ecPerBlock; col++) {
    for (const blk of ecBlocks) {
      out.push(blk[col]);
    }
  }
  return new Uint8Array(out);
}

function drawFinder(grid: Int8Array, reserved: Uint8Array, size: number, r0: number, c0: number) {
  for (let dr = -1; dr <= 7; dr++) {
    for (let dc = -1; dc <= 7; dc++) {
      const r = r0 + dr;
      const c = c0 + dc;
      if (r < 0 || r >= size || c < 0 || c >= size) continue;
      reserved[r * size + c] = 1;
      const onOuter = dr === 0 || dr === 6 || dc === 0 || dc === 6;
      const onInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      const inBounds = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
      grid[r * size + c] = inBounds && (onOuter || onInner) ? 1 : 0;
    }
  }
}

function drawAlignment(grid: Int8Array, reserved: Uint8Array, size: number, r0: number, c0: number) {
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const r = r0 + dr;
      const c = c0 + dc;
      if (reserved[r * size + c]) return;
    }
  }
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const r = r0 + dr;
      const c = c0 + dc;
      reserved[r * size + c] = 1;
      const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
      grid[r * size + c] = dark ? 1 : 0;
    }
  }
}

function applyMaskCondition(mask: number, r: number, c: number): boolean {
  switch (mask) {
    case 0:
      return (r + c) % 2 === 0;
    case 1:
      return r % 2 === 0;
    case 2:
      return c % 3 === 0;
    case 3:
      return (r + c) % 3 === 0;
    case 4:
      return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5:
      return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6:
      return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    default:
      return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
  }
}

function writeFormatInfo(grid: Int8Array, size: number, mask: number) {
  const bits = formatInfoBits(mask);
  const getBit = (i: number) => (bits >> i) & 1;

  for (let i = 0; i <= 5; i++) grid[8 * size + i] = getBit(14 - i);
  grid[8 * size + 7] = getBit(8);
  grid[8 * size + 8] = getBit(7);
  grid[7 * size + 8] = getBit(6);
  for (let i = 9; i <= 14; i++) grid[(14 - i) * size + 8] = getBit(14 - i);

  for (let i = 0; i <= 7; i++) grid[8 * size + (size - 1 - i)] = getBit(i);
  for (let i = 8; i <= 14; i++) grid[(size - 15 + i) * size + 8] = getBit(i);
}

function writeVersionInfo(grid: Int8Array, reserved: Uint8Array, size: number, version: number) {
  if (version < 7) return;
  const bits = versionInfoBits(version);
  for (let i = 0; i < 18; i++) {
    const bit = (bits >> i) & 1;
    const a = size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    grid[a * size + b] = bit;
    reserved[a * size + b] = 1;
    grid[b * size + a] = bit;
    reserved[b * size + a] = 1;
  }
}

function scorePenalty(grid: Int8Array, size: number): number {
  let penalty = 0;
  // Rule 1: 5+ consecutive modules in rows/cols
  for (let r = 0; r < size; r++) {
    let run = 1;
    for (let c = 1; c < size; c++) {
      if (grid[r * size + c] === grid[r * size + c - 1]) {
        run++;
      } else {
        if (run >= 5) penalty += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) penalty += 3 + (run - 5);
  }
  for (let c = 0; c < size; c++) {
    let run = 1;
    for (let r = 1; r < size; r++) {
      if (grid[r * size + c] === grid[(r - 1) * size + c]) {
        run++;
      } else {
        if (run >= 5) penalty += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) penalty += 3 + (run - 5);
  }
  // Rule 2: 2x2 blocks
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = grid[r * size + c];
      if (
        v === grid[r * size + c + 1] &&
        v === grid[(r + 1) * size + c] &&
        v === grid[(r + 1) * size + c + 1]
      ) {
        penalty += 3;
      }
    }
  }
  return penalty;
}

export interface QrMatrix {
  size: number;
  modules: boolean[][];
}

export function encodeQrMatrix(text: string): QrMatrix | null {
  const bytes = new TextEncoder().encode(text);
  const version = chooseVersion(bytes.length);
  if (version < 1) return null;

  const size = version * 4 + 17;
  const baseGrid = new Int8Array(size * size).fill(0);
  const reserved = new Uint8Array(size * size).fill(0);

  drawFinder(baseGrid, reserved, size, 0, 0);
  drawFinder(baseGrid, reserved, size, 0, size - 7);
  drawFinder(baseGrid, reserved, size, size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0 ? 1 : 0;
    baseGrid[6 * size + i] = dark;
    reserved[6 * size + i] = 1;
    baseGrid[i * size + 6] = dark;
    reserved[i * size + 6] = 1;
  }

  // Dark module
  baseGrid[(4 * version + 9) * size + 8] = 1;
  reserved[(4 * version + 9) * size + 8] = 1;

  // Reserve format info strips
  for (let i = 0; i <= 8; i++) {
    reserved[8 * size + i] = 1;
    reserved[i * size + 8] = 1;
  }
  for (let i = 0; i < 8; i++) {
    reserved[8 * size + (size - 1 - i)] = 1;
    reserved[(size - 1 - i) * size + 8] = 1;
  }

  // Alignment patterns
  const centers = ALIGNMENT_CENTERS[version];
  for (const r of centers) {
    for (const c of centers) {
      drawAlignment(baseGrid, reserved, size, r, c);
    }
  }

  writeVersionInfo(baseGrid, reserved, size, version);

  const codewords = buildCodewords(bytes, version);
  const totalBits = codewords.length * 8;

  // Place data bits zigzag right-to-left
  let bitIdx = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        const upward = ((right + 1) & 2) === 0;
        const r = upward ? size - 1 - vert : vert;
        if (reserved[r * size + c]) continue;
        let bit = 0;
        if (bitIdx < totalBits) {
          const cw = codewords[bitIdx >> 3];
          bit = (cw >> (7 - (bitIdx & 7))) & 1;
          bitIdx++;
        }
        baseGrid[r * size + c] = bit;
      }
    }
  }

  // Choose lowest penalty mask
  let bestGrid = baseGrid;
  let bestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const candidate = new Int8Array(baseGrid);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!reserved[r * size + c] && applyMaskCondition(mask, r, c)) {
          candidate[r * size + c] ^= 1;
        }
      }
    }
    writeFormatInfo(candidate, size, mask);
    const pen = scorePenalty(candidate, size);
    if (pen < bestPenalty) {
      bestPenalty = pen;
      bestGrid = candidate;
    }
  }

  const modules: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) {
      row.push(bestGrid[r * size + c] === 1);
    }
    modules.push(row);
  }
  return { size, modules };
}

export function renderQrToSvgString(text: string, margin = 4): string | null {
  const matrix = encodeQrMatrix(text);
  if (!matrix) return null;
  const full = matrix.size + margin * 2;
  const paths: string[] = [];
  for (let r = 0; r < matrix.size; r++) {
    for (let c = 0; c < matrix.size; c++) {
      if (matrix.modules[r][c]) {
        paths.push(`M${c + margin},${r + margin}h1v1h-1z`);
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${full} ${full}" shape-rendering="crispEdges"><rect width="${full}" height="${full}" fill="#ffffff"/><path d="${paths.join('')}" fill="#082d59"/></svg>`;
}

export function renderQrToPngDataUrl(text: string, pixelSize = 512): string | null {
  if (typeof document === 'undefined') return null;
  const matrix = encodeQrMatrix(text);
  if (!matrix) return null;
  const margin = 4;
  const full = matrix.size + margin * 2;
  const cell = Math.max(4, Math.floor(pixelSize / full));
  const canvasSize = full * cell;
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasSize, canvasSize);
  ctx.fillStyle = '#082d59';
  for (let r = 0; r < matrix.size; r++) {
    for (let c = 0; c < matrix.size; c++) {
      if (matrix.modules[r][c]) {
        ctx.fillRect((c + margin) * cell, (r + margin) * cell, cell, cell);
      }
    }
  }
  return canvas.toDataURL('image/png');
}
