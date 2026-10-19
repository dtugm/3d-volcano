/**
 * Secondary-lahar starting points, after pearpy's `starting_point2`: fresh
 * deposits between two survey epochs (later − earlier DEM > 0) lying in a
 * drainage are the material rain can remobilise. Along the main stem of
 * every drainage, the most downstream point still inside a deposit (a stream
 * junction preferred) becomes a starting point, and the deposit volume along
 * the stem upstream of it becomes its lahar volume.
 *
 * Differences from pearpy: stems and links come from our D8 grid instead of
 * WhiteboxTools, and volumes use the cell area (pearpy multiplies by the
 * cell width, which equals the area only for 1 m rasters).
 */

const OFFSETS: Record<number, [number, number]> = {
  1: [0, 1],
  2: [1, 1],
  4: [1, 0],
  8: [1, -1],
  16: [0, -1],
  32: [-1, -1],
  64: [-1, 0],
  128: [-1, 1],
};

/** pearpy: deposit window of 10 × 10 cells, more than half of it deposit. */
const WINDOW = 5;
const WINDOW_MIN_DEPOSIT = ((WINDOW * 2) ** 2) / 2;
/** pearpy skips stems shorter than this (m). */
const MIN_STEM_M = 100;

export interface StartingPointInput {
  width: number;
  height: number;
  /** D8 pointers of the later epoch (ESRI codes; 0/255 = none). */
  dir: Uint8Array;
  /** Flow accumulation (cells) of the later epoch. */
  acc: Float32Array;
  /** Later − earlier elevation, NaN where either survey has no data. */
  diff: Float32Array;
  cellSizeM: number;
  /** Upstream cells for a channel to start (pearpy default 250). */
  streamCells: number;
  /** Share of each stem, from its head, searched for a start (%). */
  maxPercentLength: number;
  /** Half-width of the stem corridor whose deposits feed the lahar (m). */
  bufferM: number;
}

export interface StartingPoint {
  row: number;
  col: number;
  /** Deposit volume upstream of the point, m³. */
  volume: number;
}

export function findStartingPoints(input: StartingPointInput): StartingPoint[] {
  const { width: W, height: H, dir, acc, diff, cellSizeM, streamCells } = input;
  const n = W * H;
  const cellArea = cellSizeM * cellSizeM;
  const diag = cellSizeM * Math.SQRT2;

  const down = new Int32Array(n).fill(-1);
  const stream = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (acc[i] < streamCells) continue;
    stream[i] = 1;
    const o = OFFSETS[dir[i]];
    if (!o) continue;
    const r = Math.floor(i / W) + o[0];
    const c = (i % W) + o[1];
    if (r >= 0 && c >= 0 && r < H && c < W) down[i] = r * W + c;
  }

  // Longest upstream path to every channel cell (Kahn order from the heads),
  // keeping the predecessor on it: following it back from an outlet traces
  // that drainage's main stem.
  const inflow = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (stream[i] && down[i] >= 0 && stream[down[i]]) inflow[down[i]]++;
  const pending = Uint8Array.from(inflow);
  const length = new Float32Array(n);
  const pred = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  for (let i = 0; i < n; i++) if (stream[i] && inflow[i] === 0) queue[tail++] = i;
  const outlets: number[] = [];
  while (head < tail) {
    const i = queue[head++];
    const j = down[i];
    if (j < 0 || !stream[j]) {
      outlets.push(i);
      continue;
    }
    const step = Math.floor(i / W) !== Math.floor(j / W) && i % W !== j % W ? diag : cellSizeM;
    if (length[i] + step > length[j]) {
      length[j] = length[i] + step;
      pred[j] = i;
    }
    if (--pending[j] === 0) queue[tail++] = j;
  }

  const deposit = (i: number) => diff[i] > 0;
  const windowCount = (r: number, c: number, sum: boolean) => {
    let count = 0;
    let volume = 0;
    for (let rr = r - WINDOW; rr < r + WINDOW; rr++) {
      for (let cc = c - WINDOW; cc < c + WINDOW; cc++) {
        const k = rr * W + cc;
        if (!deposit(k)) continue;
        count++;
        if (sum) volume += diff[k] * cellArea;
      }
    }
    return sum ? volume : count;
  };

  const radius = Math.max(0, Math.round(input.bufferM / cellSizeM));
  const points: StartingPoint[] = [];
  const taken = new Set<number>();
  for (const outlet of outlets) {
    if (length[outlet] < MIN_STEM_M) continue;
    // Head → outlet.
    const stem: number[] = [];
    for (let i = outlet; i >= 0; i = pred[i]) stem.push(i);
    stem.reverse();
    const limit = (length[outlet] * input.maxPercentLength) / 100;

    let start = -1;
    let startJunction = -1;
    let travelled = 0;
    for (let k = 0; k < stem.length; k++) {
      const i = stem[k];
      if (k > 0) {
        const p = stem[k - 1];
        travelled += Math.floor(p / W) !== Math.floor(i / W) && p % W !== i % W ? diag : cellSizeM;
      }
      if (travelled > limit) break;
      const r = Math.floor(i / W);
      const c = i % W;
      if (r - WINDOW <= 0 || c - WINDOW <= 0 || r + WINDOW >= H || c + WINDOW >= W) continue;
      if (!deposit(i) || windowCount(r, c, false) <= WINDOW_MIN_DEPOSIT) continue;
      if (inflow[i] >= 2) startJunction = k;
      else start = k;
    }
    const at = startJunction >= 0 ? startJunction : start;
    if (at < 0 || taken.has(stem[at])) continue;
    taken.add(stem[at]);

    const r0 = Math.floor(stem[at] / W);
    const c0 = stem[at] % W;
    let volume = 0;
    if (at < 5) {
      volume = windowCount(r0, c0, true);
    } else {
      const seen = new Set<number>();
      for (let k = 0; k <= at; k++) {
        const r = Math.floor(stem[k] / W);
        const c = stem[k] % W;
        for (let dr = -radius; dr <= radius; dr++) {
          for (let dc = -radius; dc <= radius; dc++) {
            if (dr * dr + dc * dc > radius * radius) continue;
            const rr = r + dr;
            const cc = c + dc;
            if (rr < 0 || cc < 0 || rr >= H || cc >= W) continue;
            const idx = rr * W + cc;
            if (seen.has(idx)) continue;
            seen.add(idx);
            if (deposit(idx)) volume += diff[idx] * cellArea;
          }
        }
      }
    }
    points.push({ row: r0, col: c0, volume });
  }
  return points.sort((a, b) => b.volume - a.volume);
}
