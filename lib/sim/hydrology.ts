/**
 * DEM hydrology for LAHARZ, replacing the WhiteboxTools preprocessing that
 * pearpy runs (`fill_depressions`, `d8_pointer --esri_pntr`,
 * `d8_flow_accumulation`).
 *
 * Grids are row-major (row 0 = north), NaN = NoData.
 */

/** ESRI D8 pointer codes. */
export const D8 = { E: 1, SE: 2, S: 4, SW: 8, W: 16, NW: 32, N: 64, NE: 128 } as const;
export const D8_NO_FLOW = 0;
export const D8_NODATA = 255;

const DIRS: { code: number; dr: number; dc: number }[] = [
  { code: 1, dr: 0, dc: 1 },
  { code: 2, dr: 1, dc: 1 },
  { code: 4, dr: 1, dc: 0 },
  { code: 8, dr: 1, dc: -1 },
  { code: 16, dr: 0, dc: -1 },
  { code: 32, dr: -1, dc: -1 },
  { code: 64, dr: -1, dc: 0 },
  { code: 128, dr: -1, dc: 1 },
];

/** Min-heap of cell indices keyed by elevation. */
class CellHeap {
  private idx: Int32Array;
  private key: Float64Array;
  size = 0;
  constructor(capacity: number) {
    this.idx = new Int32Array(capacity);
    this.key = new Float64Array(capacity);
  }
  push(i: number, k: number) {
    let n = this.size++;
    while (n > 0) {
      const p = (n - 1) >> 1;
      if (this.key[p] <= k) break;
      this.idx[n] = this.idx[p];
      this.key[n] = this.key[p];
      n = p;
    }
    this.idx[n] = i;
    this.key[n] = k;
  }
  pop(): number {
    const top = this.idx[0];
    const lastI = this.idx[--this.size];
    const lastK = this.key[this.size];
    let n = 0;
    for (;;) {
      let c = 2 * n + 1;
      if (c >= this.size) break;
      if (c + 1 < this.size && this.key[c + 1] < this.key[c]) c++;
      if (this.key[c] >= lastK) break;
      this.idx[n] = this.idx[c];
      this.key[n] = this.key[c];
      n = c;
    }
    this.idx[n] = lastI;
    this.key[n] = lastK;
    return top;
  }
}

/**
 * Priority-Flood depression filling with an epsilon gradient across flats
 * (Barnes et al. 2014), so every cell drains and D8 never sees a flat.
 */
export function fillDepressions(
  dem: Float32Array,
  width: number,
  height: number,
  epsilon = 1e-3,
): Float64Array {
  const n = width * height;
  const filled = new Float64Array(n);
  const closed = new Uint8Array(n);
  const heap = new CellHeap(n);

  for (let i = 0; i < n; i++) filled[i] = dem[i];

  // Seed with grid edges and cells bordering NoData.
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const i = r * width + c;
      if (Number.isNaN(dem[i])) {
        closed[i] = 1;
        continue;
      }
      let edge = r === 0 || c === 0 || r === height - 1 || c === width - 1;
      if (!edge) {
        for (const d of DIRS) {
          if (Number.isNaN(dem[(r + d.dr) * width + c + d.dc])) {
            edge = true;
            break;
          }
        }
      }
      if (edge) {
        closed[i] = 1;
        heap.push(i, filled[i]);
      }
    }
  }

  while (heap.size > 0) {
    const i = heap.pop();
    const r = (i / width) | 0;
    const c = i - r * width;
    const z = filled[i];
    for (const d of DIRS) {
      const rr = r + d.dr;
      const cc = c + d.dc;
      if (rr < 0 || cc < 0 || rr >= height || cc >= width) continue;
      const j = rr * width + cc;
      if (closed[j]) continue;
      closed[j] = 1;
      if (filled[j] <= z) filled[j] = z + epsilon;
      heap.push(j, filled[j]);
    }
  }
  return filled;
}

/** Steepest-descent D8 pointer with ESRI codes. */
export function d8Pointer(
  filled: Float64Array,
  width: number,
  height: number,
): Uint8Array {
  const dir = new Uint8Array(width * height);
  const diag = Math.SQRT2;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const i = r * width + c;
      const z = filled[i];
      if (Number.isNaN(z)) {
        dir[i] = D8_NODATA;
        continue;
      }
      let best = 0;
      let code = D8_NO_FLOW;
      for (const d of DIRS) {
        const rr = r + d.dr;
        const cc = c + d.dc;
        if (rr < 0 || cc < 0 || rr >= height || cc >= width) continue;
        const zn = filled[rr * width + cc];
        if (Number.isNaN(zn)) continue;
        const drop = (z - zn) / (d.dr !== 0 && d.dc !== 0 ? diag : 1);
        if (drop > best) {
          best = drop;
          code = d.code;
        }
      }
      dir[i] = code;
    }
  }
  return dir;
}

/** D8 flow accumulation (number of upstream cells, including itself). */
export function flowAccumulation(
  filled: Float64Array,
  dir: Uint8Array,
  width: number,
): Float32Array {
  const n = filled.length;
  const order = new Int32Array(n);
  for (let i = 0; i < n; i++) order[i] = i;
  // Highest first: a cell only drains to lower (filled) cells.
  order.sort((a, b) => (filled[b] || -Infinity) - (filled[a] || -Infinity));

  const acc = new Float32Array(n).fill(1);
  for (const i of order) {
    const code = dir[i];
    if (code === D8_NO_FLOW || code === D8_NODATA) continue;
    const d = DIRS.find((x) => x.code === code)!;
    const r = (i / width) | 0;
    const c = i - r * width;
    const j = (r + d.dr) * width + c + d.dc;
    if (j >= 0 && j < n) acc[j] += acc[i];
  }
  return acc;
}
