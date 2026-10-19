import type { LaharzResponse } from "@/lib/sim/laharz.worker";

/** Empty cells around the inundation, so the glow halo is not clipped. */
const PAD = 14;

export interface LavaField {
  width: number;
  height: number;
  /** RGBA8: arrival (0–1), smooth mask, halo, core heat. */
  field: Uint8Array;
  /** RGBA8: downstream direction (x, y) encoded as d · 0.5 + 0.5. */
  flow: Uint8Array;
  /** Corners (NW, NE, SE, SW) of the padded grid, [lng, lat]. */
  coordinates: [[number, number], [number, number], [number, number], [number, number]];
}

/** Separable box blur, `passes` times (≈ Gaussian), in place. */
function blur(src: Float32Array, w: number, h: number, radius: number, passes = 3) {
  if (radius < 1) return src;
  const tmp = new Float32Array(src.length);
  const norm = 1 / (2 * radius + 1);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let acc = 0;
      for (let k = -radius; k <= radius; k++) acc += src[row + Math.min(w - 1, Math.max(0, k))];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = acc * norm;
        acc += src[row + Math.min(w - 1, x + radius + 1)] - src[row + Math.max(0, x - radius)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) acc += tmp[Math.min(h - 1, Math.max(0, k)) * w + x];
      for (let y = 0; y < h; y++) {
        src[y * w + x] = acc * norm;
        acc += tmp[Math.min(h - 1, y + radius + 1) * w + x] - tmp[Math.max(0, y - radius) * w + x];
      }
    }
  }
  return src;
}

const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const latFromMercY = (y: number) => (360 / Math.PI) * Math.atan(Math.exp(y)) - 90;

/**
 * Turns the LAHARZ raster into smooth fields for the lava shader: bilinear
 * filtering of blurred masks gives rounded, fluid outlines instead of
 * blocky cells, and the arrival order gives the flow direction.
 */
export function buildLavaField(result: LaharzResponse): LavaField {
  const { width: w0, height: h0, zone, step, maxStep } = result;
  const w = w0 + 2 * PAD;
  const h = h0 + 2 * PAD;
  const n = w * h;

  const wet = new Float32Array(n);
  const heat = new Float32Array(n);
  const arrival = new Float32Array(n).fill(-1);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  const span = Math.max(1, maxStep);
  for (let y = 0; y < h0; y++) {
    for (let x = 0; x < w0; x++) {
      const i = y * w0 + x;
      if (!zone[i]) continue;
      const j = (y + PAD) * w + x + PAD;
      wet[j] = 1;
      // Lower confidence limit (zone 3) = most likely = the hot core.
      heat[j] = zone[i] / 3;
      arrival[j] = Math.max(0, step[i]) / span;
      queue[tail++] = j;
    }
  }

  // Dry cells take the arrival of the nearest wet cell (multi-source BFS),
  // so the halo and the filtered edges reveal together with the flow.
  while (head < tail) {
    const j = queue[head++];
    const x = j % w;
    const neighbours = [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, j - w, j + w];
    for (const k of neighbours) {
      if (k < 0 || k >= n || arrival[k] >= 0) continue;
      arrival[k] = arrival[j];
      queue[tail++] = k;
    }
  }
  if (tail === 0) arrival.fill(1);

  const mask = blur(Float32Array.from(wet), w, h, 1);
  const halo = blur(Float32Array.from(wet), w, h, 5);
  blur(heat, w, h, 2);
  const smoothArrival = blur(Float32Array.from(arrival), w, h, 1, 2);
  const flowArrival = blur(Float32Array.from(arrival), w, h, 4);

  const field = new Uint8Array(n * 4);
  const flow = new Uint8Array(n * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      field[i * 4] = Math.round(Math.min(1, smoothArrival[i]) * 255);
      field[i * 4 + 1] = Math.round(mask[i] * 255);
      field[i * 4 + 2] = Math.round(Math.min(1, halo[i] * 1.6) * 255);
      field[i * 4 + 3] = Math.round(Math.min(1, heat[i]) * 255);

      // Downstream = towards later arrival.
      const gx = flowArrival[y * w + Math.min(w - 1, x + 1)] - flowArrival[y * w + Math.max(0, x - 1)];
      const gy = flowArrival[Math.min(h - 1, y + 1) * w + x] - flowArrival[Math.max(0, y - 1) * w + x];
      const len = Math.hypot(gx, gy);
      const dx = len > 1e-6 ? gx / len : 0;
      const dy = len > 1e-6 ? gy / len : 0;
      flow[i * 4] = Math.round((dx * 0.5 + 0.5) * 255);
      flow[i * 4 + 1] = Math.round((dy * 0.5 + 0.5) * 255);
      flow[i * 4 + 3] = 255;
    }
  }

  // Pad the bounds: linear in longitude, linear in Mercator y for latitude.
  const [west, north, east, south] = result.bounds;
  const dLng = (east - west) / w0;
  const yN = mercY(north);
  const dY = (yN - mercY(south)) / h0;
  const lngW = west - PAD * dLng;
  const lngE = east + PAD * dLng;
  const latN = latFromMercY(yN + PAD * dY);
  const latS = latFromMercY(yN - (h0 + PAD) * dY);

  return {
    width: w,
    height: h,
    field,
    flow,
    coordinates: [
      [lngW, latN],
      [lngE, latN],
      [lngE, latS],
      [lngW, latS],
    ],
  };
}
