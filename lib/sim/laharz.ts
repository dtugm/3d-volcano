/**
 * LAHARZ distal inundation, ported from pearpy `create_lahar_inundation`
 * and `calc_cross_section` (https://github.com/ruliandaru/pearpy, MIT).
 *
 * The flow follows the D8 path downstream from the start cell. At every path
 * cell, valley cross-sections perpendicular to the flow are "filled" until
 * they hold the cross-section area A; the touched cells are labelled until
 * their total map area reaches the planimetric area B. Three nested zones are
 * produced for the upper confidence limit, the central estimate and the lower
 * confidence limit.
 *
 * Labels: 1 = dry, 2 = upper-CL zone only, 3 = central zone, 4 = lower-CL
 * (most likely) zone.
 */

export interface LaharzGrid {
  width: number;
  height: number;
  /** Filled DEM, metres. NaN = NoData. */
  dem: Float64Array;
  /** ESRI D8 pointer. */
  dir: Uint8Array;
  /** Cell size in metres. */
  cellWidth: number;
}

const NEXT: Record<number, [number, number]> = {
  1: [-1, 0], 2: [-1, 1], 4: [0, 1], 8: [1, 1],
  16: [1, 0], 32: [1, -1], 64: [0, -1], 128: [-1, -1],
};
const DOWN: Record<number, [number, number]> = {
  1: [0, 1], 2: [1, 1], 4: [1, 0], 8: [1, -1],
  16: [0, -1], 32: [-1, -1], 64: [-1, 0], 128: [-1, 1],
};
const CHECKER: Record<number, [number, number]> = {
  8: [1, 0], 32: [0, -1], 128: [-1, 0], 2: [0, 1],
};
const CARDINAL_FIRST: Record<number, [number, number]> = {
  32: [16, 64], 128: [64, 1], 2: [1, 4], 8: [4, 16],
};
const CARDINAL_SECOND: Record<number, [number, number]> = {
  1: [128, 2], 4: [2, 8], 16: [8, 32], 64: [32, 128],
};
const DIAGONAL = new Set([2, 8, 32, 128]);
const NO_VALUE = 99999;
const MAX_STEPS = 90_000_000;
const MAX_SECTION_ITERATIONS = 1_000_000_000;

interface State {
  label: Int32Array;
  /** value[k] = number of cells carrying label k + 2. */
  value: number[];
  crossArea: number[];
  crossOri: number[];
  /** March step at which each cell was first reached (-1 = never). */
  firstStep: Int32Array;
  step: number;
}

export interface LaharzResult {
  /** Per-cell zone label (see module docs). */
  label: Int32Array;
  /** Downstream step at which a cell was first inundated, for animation. */
  firstStep: Int32Array;
  /** Number of path steps marched. */
  steps: number;
  /**
   * Planimetric area not spent per remaining zone, m². A positive first value
   * means the flow stopped (pit, NoData, grid edge) before reaching B.
   */
  leftover: number[];
}

export function runLaharz(
  grid: LaharzGrid,
  startRow: number,
  startCol: number,
  crossAreas: number[],
  planimetricAreas: number[],
): LaharzResult {
  const { width: W, height: H, dem, dir, cellWidth } = grid;
  const cellDiagonal = Math.round(Math.sqrt(cellWidth ** 2 * 2) * 100) / 100;

  const inBounds = (r: number, c: number) => r >= 0 && r < H && c >= 0 && c < W;
  // NoData behaves like the grid edge (pearpy does not handle it at all).
  const elevation = (r: number, c: number) => {
    const z = dem[r * W + c];
    return Number.isNaN(z) ? NO_VALUE : z;
  };
  const dirAt = (r: number, c: number) => (inBounds(r, c) ? dir[r * W + c] : 255);

  const state: State = {
    label: new Int32Array(W * H).fill(1),
    value: planimetricAreas.map(() => 0),
    crossArea: crossAreas.slice(),
    crossOri: crossAreas.slice(),
    firstStep: new Int32Array(W * H).fill(-1),
    step: 0,
  };

  const appendPoint = (r: number, c: number) => {
    const count = state.crossArea.length + 1;
    const i = r * W + c;
    const v = state.label[i];
    if (v === 1) {
      state.label[i] = count;
      state.value[count - 2] += 1;
      if (state.firstStep[i] < 0) state.firstStep[i] = state.step;
    } else if (v < count) {
      state.label[i] = count;
      state.value[v - 2] -= 1;
      state.value[count - 2] += 1;
    }
  };

  const nextCell = (r: number, c: number, side: number, d: number): [number, number, number] => {
    const [dr, dc] = NEXT[d];
    const nr = r + side * dr;
    const nc = c + side * dc;
    return inBounds(nr, nc) ? [nr, nc, elevation(nr, nc)] : [r, c, NO_VALUE];
  };

  const subtractArea = (first: number, second: number, dim: number, n = 1) => {
    let next = state.crossArea.map((a) => a - (first - second) * (dim * n));
    if (next.length > 1) next = next.filter((a) => a > 0);
    state.crossArea = next;
  };

  const hasArea = () => state.crossArea.length > 0 && state.crossArea[0] > 0;

  const crossSection = (d: number, r0: number, c0: number) => {
    const dim = DIAGONAL.has(d) ? cellDiagonal : cellWidth;
    let rx = r0;
    let ry = c0;
    let lx = r0 + NEXT[d][0];
    let ly = c0 + NEXT[d][1];
    if (!inBounds(lx, ly) || !inBounds(rx, ry)) return;
    let le = elevation(lx, ly);
    let re = elevation(rx, ry);
    let fill = re;
    let cellCount = 0;

    for (let count = 0; count < MAX_SECTION_ITERATIONS && hasArea(); count++) {
      if (le === fill) {
        appendPoint(lx, ly);
        [lx, ly, le] = nextCell(lx, ly, 1, d);
        cellCount++;
      } else if (re === fill) {
        appendPoint(rx, ry);
        [rx, ry, re] = nextCell(rx, ry, -1, d);
        cellCount++;
      } else if (re < fill) {
        subtractArea(fill, re, dim);
        cellCount++;
        if (hasArea()) {
          appendPoint(rx, ry);
          [rx, ry, re] = nextCell(rx, ry, -1, d);
        }
      } else if (le < fill) {
        subtractArea(fill, le, dim);
        cellCount++;
        if (hasArea()) {
          appendPoint(lx, ly);
          [lx, ly, le] = nextCell(lx, ly, 1, d);
        }
      } else if (re === le) {
        subtractArea(re, fill, dim, cellCount);
        if (hasArea()) {
          fill = re;
          appendPoint(lx, ly);
          [lx, ly, le] = nextCell(lx, ly, 1, d);
          appendPoint(rx, ry);
          [rx, ry, re] = nextCell(rx, ry, -1, d);
          cellCount += 2;
        }
      } else if (re > le) {
        subtractArea(le, fill, dim, cellCount);
        cellCount++;
        if (hasArea()) {
          fill = le;
          appendPoint(lx, ly);
          [lx, ly, le] = nextCell(lx, ly, 1, d);
        }
      } else {
        subtractArea(re, fill, dim, cellCount);
        cellCount++;
        if (hasArea()) {
          fill = re;
          appendPoint(rx, ry);
          // pearpy assigns this elevation to the *left* side here, which
          // loses the real left elevation; LAHARZ updates the right side.
          [rx, ry, re] = nextCell(rx, ry, -1, d);
        }
      }
      if (le === NO_VALUE || re === NO_VALUE) {
        state.crossArea = state.crossArea.map(() => -NO_VALUE);
      }
    }
    state.crossArea = state.crossOri.slice();
  };

  const planimetric = planimetricAreas.slice();
  let check = planimetric.slice();
  const cellArea = cellWidth * cellWidth;

  let r = startRow;
  let c = startCol;
  let d = dirAt(r, c);
  let steps = 0;

  while (steps < MAX_STEPS && d !== 0 && d !== 255) {
    state.step = steps;
    crossSection(d, r, c);
    let second = d;
    const first = CARDINAL_FIRST[d];
    if (first) {
      crossSection(first[0], r, c);
      crossSection(first[1], r, c);
      second = first[1];
    }
    const cardinal = CARDINAL_SECOND[second];
    if (cardinal) {
      crossSection(cardinal[0], r, c);
      crossSection(cardinal[1], r, c);
    }
    const checker = CHECKER[d];
    if (checker) crossSection(d, r + checker[0], c + checker[1]);

    // Area of cells with label >= i + 2 (suffix sums over value[]).
    const spent = new Array<number>(state.value.length);
    let acc = 0;
    for (let i = state.value.length - 1; i >= 0; i--) {
      acc += state.value[i];
      spent[i] = acc * cellArea;
    }
    check = check.map((_, i) => planimetric[i] - spent[i]);

    // Exhausted zones stop receiving cells (mirrors pearpy's pop-while-iterating).
    if (check.length > 1) {
      for (let i = 0; i < check.length; i++) {
        if (check[i] < 0) {
          state.crossOri.pop();
          state.crossArea = state.crossOri.slice();
          planimetric.pop();
          check.pop();
        }
      }
    }
    if (check[0] < 0) break;

    const [dr, dc] = DOWN[d];
    r += dr;
    c += dc;
    d = dirAt(r, c);
    steps++;

    let blanks = 0;
    for (let rr = r - 5; rr < r + 5; rr++) {
      for (let cc = c - 5; cc < c + 5; cc++) {
        if (inBounds(rr, cc) && dir[rr * W + cc] === 255) blanks++;
      }
    }
    if (blanks > 5 || d === 255) break;
  }

  return { label: state.label, firstStep: state.firstStep, steps, leftover: check };
}
