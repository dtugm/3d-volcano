/// <reference lib="webworker" />
import { getHeightTileWithCoverage, TILE_SIZE } from "../terrain/height-tiles";
import { d8Pointer, fillDepressions, flowAccumulation } from "./hydrology";
import { runLaharz } from "./laharz";
import { type ConfidenceLimit, laharzAreas, MIN_VOLUME } from "./laharz-areas";
import { findStartingPoints } from "./starting-points";

interface GridRequest {
  id: number;
  /** Quantized-mesh folder of the epoch DTM ("" = global DEM only). */
  dtmBase: string;
  /** Metres subtracted from DTM heights (see the catalogue). */
  heightOffset: number;
  /** Analysis window centre (usually the summit). */
  center: [number, number];
  /** Half-size of the analysis window, km. */
  radiusKm: number;
  /** Web Mercator zoom of the DEM grid (13 ≈ 19 m, 14 ≈ 9.5 m cells). */
  zoom: number;
  confidence: ConfidenceLimit;
}

/** Primary lahar: one user-picked start and volume. */
export interface PrimaryRequest extends GridRequest {
  kind: "primary";
  start: [number, number];
  volume: number;
  /** Snap the start to the strongest channel within this many cells. */
  snapCells: number;
}

/**
 * Secondary lahars: starts and volumes from the deposits between two epochs
 * (pearpy `starting_point2`); `dtmBase` is the later epoch.
 */
export interface SecondaryRequest extends GridRequest {
  kind: "secondary";
  earlierBase: string;
  streamCells: number;
  maxPercentLength: number;
  bufferM: number;
  /** Largest sources simulated (the rest are listed only). */
  maxSources: number;
  /** Sources below this deposit volume are ignored, m³. */
  minVolume: number;
  /** Elevation changes below this are noise, not deposits (m). */
  lodM: number;
}

export type LaharzRequest = PrimaryRequest | SecondaryRequest;

export interface LaharSource {
  lngLat: [number, number];
  /** m³ */
  volume: number;
  simulated: boolean;
}

export interface LaharzResponse {
  id: number;
  kind: LaharzRequest["kind"];
  /** Cropped result raster, row-major. */
  width: number;
  height: number;
  /** 0 = dry, 1 = upper-CL, 2 = central, 3 = lower-CL zone. */
  zone: Uint8Array;
  /** Downstream march step of first inundation, -1 = dry. */
  step: Int32Array;
  maxStep: number;
  /** [west, north, east, south] of the cropped raster in degrees. */
  bounds: [number, number, number, number];
  cellSizeM: number;
  /** (First) start point, snapped. */
  start: [number, number];
  /** Secondary lahars: every start found, largest first. */
  sources: LaharSource[];
  /** Secondary: median later − earlier difference removed before the analysis (m). */
  verticalBias: number;
  /** Inundated map area per zone (upper, central, lower), m². */
  zoneAreas: [number, number, number];
  /** Target planimetric areas B (upper, central, lower), m² (primary only). */
  targetAreas: number[];
  crossAreas: number[];
  /** True if a flow stopped before spending the full planimetric area. */
  truncated: boolean;
  timings: { dem: number; hydrology: number; laharz: number };
}

export type LaharzMessage = LaharzResponse | { id: number; error: string };

const lon2x = (lon: number, z: number) => ((lon + 180) / 360) * 2 ** z * TILE_SIZE;
const lat2y = (lat: number, z: number) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 2 ** z * TILE_SIZE;
};
const x2lon = (x: number, z: number) => (x / (2 ** z * TILE_SIZE)) * 360 - 180;
const y2lat = (y: number, z: number) => {
  const n = Math.PI * (1 - (2 * y) / (2 ** z * TILE_SIZE));
  return (Math.atan(Math.sinh(n)) * 180) / Math.PI;
};

interface Window {
  z: number;
  tx0: number;
  tx1: number;
  ty0: number;
  ty1: number;
  width: number;
  height: number;
  cellSizeM: number;
}

function analysisWindow(req: GridRequest): Window {
  const { zoom: z, center, radiusKm } = req;
  const latRad = (center[1] * Math.PI) / 180;
  const cellSizeM = (40075016.686 * Math.cos(latRad)) / (2 ** z * TILE_SIZE);
  const halfPx = (radiusKm * 1000) / cellSizeM;
  const cx = lon2x(center[0], z);
  const cy = lat2y(center[1], z);
  const tx0 = Math.floor((cx - halfPx) / TILE_SIZE);
  const tx1 = Math.floor((cx + halfPx) / TILE_SIZE);
  const ty0 = Math.floor((cy - halfPx) / TILE_SIZE);
  const ty1 = Math.floor((cy + halfPx) / TILE_SIZE);
  return {
    z,
    tx0,
    tx1,
    ty0,
    ty1,
    width: (tx1 - tx0 + 1) * TILE_SIZE,
    height: (ty1 - ty0 + 1) * TILE_SIZE,
    cellSizeM,
  };
}

/** DEM mosaic of the window, and which cells the survey DTM covered. */
async function buildDem(win: Window, base: string, heightOffset: number) {
  const { width, height } = win;
  const dem = new Float32Array(width * height);
  const covered = new Uint8Array(width * height);
  const jobs: Promise<void>[] = [];
  for (let tx = win.tx0; tx <= win.tx1; tx++) {
    for (let ty = win.ty0; ty <= win.ty1; ty++) {
      jobs.push(
        getHeightTileWithCoverage({ base, heightOffset }, win.z, tx, ty).then((tile) => {
          const ox = (tx - win.tx0) * TILE_SIZE;
          const oy = (ty - win.ty0) * TILE_SIZE;
          for (let r = 0; r < TILE_SIZE; r++) {
            const at = (oy + r) * width + ox;
            dem.set(tile.heights.subarray(r * TILE_SIZE, (r + 1) * TILE_SIZE), at);
            if (tile.covered) covered.set(tile.covered.subarray(r * TILE_SIZE, (r + 1) * TILE_SIZE), at);
          }
        }),
      );
    }
  }
  await Promise.all(jobs);
  // Sea and missing data become NoData so flows end at the coast.
  for (let i = 0; i < dem.length; i++) if (dem[i] <= 0) dem[i] = NaN;
  return { dem, covered };
}

interface Hydro {
  key: string;
  win: Window;
  dem: Float32Array;
  covered: Uint8Array;
  filled: Float64Array;
  dir: Uint8Array;
  acc: Float32Array;
  timings: { dem: number; hydrology: number };
}

let cached: Hydro | null = null;

async function prepare(req: GridRequest): Promise<Hydro> {
  const win = analysisWindow(req);
  const key = [req.dtmBase, req.heightOffset, win.z, win.tx0, win.tx1, win.ty0, win.ty1].join("|");
  if (cached?.key === key) return cached;

  const t0 = performance.now();
  const { dem, covered } = await buildDem(win, req.dtmBase, req.heightOffset);
  const t1 = performance.now();
  const filled = fillDepressions(dem, win.width, win.height);
  const dir = d8Pointer(filled, win.width, win.height);
  const acc = flowAccumulation(filled, dir, win.width);
  const t2 = performance.now();

  cached = { key, win, dem, covered, filled, dir, acc, timings: { dem: t1 - t0, hydrology: t2 - t1 } };
  return cached;
}

/** Runs LAHARZ from each start and merges the zones (max) and arrival (min). */
function inundate(hydro: Hydro, starts: { row: number; col: number; volume: number }[], confidence: ConfidenceLimit) {
  const { width: W, height: H, cellSizeM } = hydro.win;
  const label = new Int32Array(W * H);
  const firstStep = new Int32Array(W * H).fill(-1);
  let truncated = false;
  let areas = laharzAreas(MIN_VOLUME + 1, confidence);
  for (const s of starts) {
    areas = laharzAreas(Math.max(MIN_VOLUME + 1, s.volume), confidence);
    const result = runLaharz(
      { width: W, height: H, dem: hydro.filled, dir: hydro.dir, cellWidth: cellSizeM },
      s.row,
      s.col,
      areas.cross,
      areas.planimetric,
    );
    truncated ||= result.leftover[0] > 0;
    for (let i = 0; i < label.length; i++) {
      const l = result.label[i];
      if (l <= 1) continue;
      if (l > label[i]) label[i] = l;
      const st = result.firstStep[i];
      if (firstStep[i] < 0 || st < firstStep[i]) firstStep[i] = st;
    }
  }
  return { label, firstStep, truncated, areas };
}

/** Crops the merged inundation and packs the response. */
function respond(
  req: LaharzRequest,
  hydro: Hydro,
  merged: ReturnType<typeof inundate>,
  start: { row: number; col: number },
  sources: LaharSource[],
  laharzMs: number,
  verticalBias = 0,
): LaharzResponse {
  const { width: W, height: H, z, cellSizeM, tx0, ty0 } = hydro.win;
  const px0 = tx0 * TILE_SIZE;
  const py0 = ty0 * TILE_SIZE;
  let minR = H, maxR = -1, minC = W, maxC = -1, maxStep = 0;
  const zoneCount = [0, 0, 0];
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const l = merged.label[r * W + c];
      if (l <= 1) continue;
      zoneCount[l - 2]++;
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
      if (c < minC) minC = c;
      if (c > maxC) maxC = c;
      const s = merged.firstStep[r * W + c];
      if (s > maxStep) maxStep = s;
    }
  }
  if (maxR < 0) {
    minR = maxR = start.row;
    minC = maxC = start.col;
  }
  const cw = maxC - minC + 1;
  const ch = maxR - minR + 1;
  const zone = new Uint8Array(cw * ch);
  const step = new Int32Array(cw * ch).fill(-1);
  for (let r = 0; r < ch; r++) {
    for (let c = 0; c < cw; c++) {
      const i = (r + minR) * W + c + minC;
      const l = merged.label[i];
      if (l > 1) {
        zone[r * cw + c] = l - 1;
        step[r * cw + c] = merged.firstStep[i];
      }
    }
  }

  const cellArea = cellSizeM ** 2;
  // Zones are nested: upper ⊇ central ⊇ lower.
  const lower = zoneCount[2] * cellArea;
  const central = lower + zoneCount[1] * cellArea;
  const upper = central + zoneCount[0] * cellArea;
  const gx = (c: number) => x2lon(px0 + c, z);
  const gy = (r: number) => y2lat(py0 + r, z);

  return {
    id: req.id,
    kind: req.kind,
    width: cw,
    height: ch,
    zone,
    step,
    maxStep,
    bounds: [gx(minC), gy(minR), gx(maxC + 1), gy(maxR + 1)],
    cellSizeM,
    start: [gx(start.col + 0.5), gy(start.row + 0.5)],
    sources,
    verticalBias,
    zoneAreas: [upper, central, lower],
    targetAreas: req.kind === "primary" ? merged.areas.planimetric : [],
    crossAreas: req.kind === "primary" ? merged.areas.cross : [],
    truncated: merged.truncated,
    timings: { ...hydro.timings, laharz: laharzMs },
  };
}

async function simulatePrimary(req: PrimaryRequest): Promise<LaharzResponse> {
  const hydro = await prepare(req);
  const { width: W, height: H, z, tx0, ty0 } = hydro.win;

  let row = Math.floor(lat2y(req.start[1], z) - ty0 * TILE_SIZE);
  let col = Math.floor(lon2x(req.start[0], z) - tx0 * TILE_SIZE);
  if (row < 0 || col < 0 || row >= H || col >= W) {
    throw new Error("Titik awal berada di luar area analisis.");
  }

  // Snap to the strongest channel nearby: a start on a hillslope gives an
  // unrealistic path (LAHARZ assumes the flow starts in a channel).
  let best = hydro.acc[row * W + col];
  const r0 = row;
  const c0 = col;
  for (let dr = -req.snapCells; dr <= req.snapCells; dr++) {
    for (let dc = -req.snapCells; dc <= req.snapCells; dc++) {
      const r = r0 + dr;
      const c = c0 + dc;
      if (r < 0 || c < 0 || r >= H || c >= W || dr * dr + dc * dc > req.snapCells ** 2) continue;
      const a = hydro.acc[r * W + c];
      if (a > best) {
        best = a;
        row = r;
        col = c;
      }
    }
  }

  const t0 = performance.now();
  const merged = inundate(hydro, [{ row, col, volume: req.volume }], req.confidence);
  return respond(req, hydro, merged, { row, col }, [], performance.now() - t0);
}

async function simulateSecondary(req: SecondaryRequest): Promise<LaharzResponse> {
  const hydro = await prepare(req);
  const { width: W, height: H, z, tx0, ty0 } = hydro.win;
  const earlier = await buildDem(hydro.win, req.earlierBase, req.heightOffset);

  // Deposits only where both surveys have data (elsewhere both fall back to
  // the same global DEM, or one of them does, which is not a real change).
  const diff = new Float32Array(W * H).fill(NaN);
  let overlap = 0;
  for (let i = 0; i < diff.length; i++) {
    if (!hydro.covered[i] || !earlier.covered[i]) continue;
    const d = hydro.dem[i] - earlier.dem[i];
    if (Number.isFinite(d)) {
      diff[i] = d;
      overlap++;
    }
  }
  if (overlap === 0) throw new Error("Kedua epoch tidak punya area DTM yang bertampalan.");

  // The surveys may sit on different vertical datums (ellipsoid vs geoid) or
  // carry a processing bias: most of the surface does not change between
  // epochs, so remove the median difference, then ignore changes below the
  // level of detection.
  const sample: number[] = [];
  const stride = Math.max(1, Math.floor(overlap / 200_000));
  for (let i = 0, k = 0; i < diff.length; i++) {
    if (Number.isNaN(diff[i])) continue;
    if (k++ % stride === 0) sample.push(diff[i]);
  }
  sample.sort((a, b) => a - b);
  const verticalBias = sample[Math.floor(sample.length / 2)];
  for (let i = 0; i < diff.length; i++) {
    if (Number.isNaN(diff[i])) continue;
    const d = diff[i] - verticalBias;
    diff[i] = Math.abs(d) < req.lodM ? 0 : d;
  }

  const found = findStartingPoints({
    width: W,
    height: H,
    dir: hydro.dir,
    acc: hydro.acc,
    diff,
    cellSizeM: hydro.win.cellSizeM,
    streamCells: req.streamCells,
    maxPercentLength: req.maxPercentLength,
    bufferM: req.bufferM,
  }).filter((p) => p.volume >= req.minVolume);
  if (found.length === 0) {
    throw new Error("Tidak ada endapan baru di alur sungai antara kedua epoch.");
  }

  const simulated = found.slice(0, req.maxSources);
  const lngLat = (p: { row: number; col: number }): [number, number] => [
    x2lon(tx0 * TILE_SIZE + p.col + 0.5, z),
    y2lat(ty0 * TILE_SIZE + p.row + 0.5, z),
  ];
  const sources = found.map((p, i) => ({ lngLat: lngLat(p), volume: p.volume, simulated: i < req.maxSources }));

  const t0 = performance.now();
  const merged = inundate(hydro, simulated, req.confidence);
  return respond(req, hydro, merged, simulated[0], sources, performance.now() - t0, verticalBias);
}

self.onmessage = async (event: MessageEvent<LaharzRequest>) => {
  const scope = self as DedicatedWorkerGlobalScope;
  try {
    const req = event.data;
    const res = req.kind === "secondary" ? await simulateSecondary(req) : await simulatePrimary(req);
    scope.postMessage(res satisfies LaharzMessage, [res.zone.buffer, res.step.buffer]);
  } catch (err) {
    scope.postMessage({
      id: event.data.id,
      error: err instanceof Error ? err.message : String(err),
    } satisfies LaharzMessage);
  }
};
