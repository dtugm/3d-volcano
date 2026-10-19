/**
 * Builds Web Mercator elevation tiles for MapLibre from:
 *  1. a global base DEM (AWS Terrarium, ~30 m), and
 *  2. the survey DTM of an epoch (Cesium quantized-mesh, EPSG:4326 TMS),
 *     rasterised on top wherever it has coverage.
 *
 * Runs inside a Web Worker (uses fetch, createImageBitmap, OffscreenCanvas).
 */

import { decodeQuantizedMesh, QUANTIZED_MAX, type QuantizedMesh } from "./quantized-mesh";

export const TILE_SIZE = 256;
const TERRARIUM_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium";
const TERRARIUM_MAX_ZOOM = 15;
/** Geographic levels tried below the ideal one when a DTM tile is missing. */
const DTM_FALLBACK_LEVELS = 3;

// ---------------------------------------------------------------- geometry

export function tileBounds(z: number, x: number, y: number) {
  const n = 2 ** z;
  const lon = (px: number) => (px / n) * 360 - 180;
  const lat = (py: number) =>
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * py) / n))) * 180) / Math.PI;
  return { west: lon(x), east: lon(x + 1), north: lat(y), south: lat(y + 1) };
}

/** Latitude → Web Mercator y in [0, 1] (0 = north). */
function mercY(lat: number) {
  const s = Math.sin((lat * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
}

// ---------------------------------------------------------------- caches

class Lru<V> {
  private map = new Map<string, V>();
  constructor(private limit: number) {}
  get(key: string) {
    const v = this.map.get(key);
    if (v !== undefined) {
      this.map.delete(key);
      this.map.set(key, v);
    }
    return v;
  }
  delete(key: string) {
    this.map.delete(key);
  }
  set(key: string, v: V) {
    this.map.set(key, v);
    if (this.map.size > this.limit) this.map.delete(this.map.keys().next().value!);
  }
}

const meshCache = new Lru<Promise<QuantizedMesh | null>>(256);
/** Heights plus, per pixel, whether the survey DTM covered it (null = none). */
export interface HeightTile {
  heights: Float32Array;
  covered: Uint8Array | null;
}

const heightCache = new Lru<Promise<HeightTile>>(192);

// ---------------------------------------------------------------- sources

async function fetchTerrarium(z: number, x: number, y: number): Promise<Float32Array> {
  const out = new Float32Array(TILE_SIZE * TILE_SIZE);
  // Above the base DEM's max zoom, upsample the covering parent tile.
  const dz = Math.max(0, z - TERRARIUM_MAX_ZOOM);
  const pz = z - dz;
  const px = x >> dz;
  const py = y >> dz;
  // Failures throw: MapLibre then over-zooms the parent tile instead of
  // showing a tile at 0 m (a cliff hundreds of metres deep).
  {
    const res = await fetch(`${TERRARIUM_URL}/${pz}/${px}/${py}.png`);
    if (!res.ok) throw new Error(`Terrarium ${pz}/${px}/${py}: HTTP ${res.status}`);
    const bitmap = await createImageBitmap(await res.blob());
    const canvas = new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const scale = 2 ** dz;
    const sub = TILE_SIZE / scale;
    ctx.drawImage(
      bitmap,
      (x - (px << dz)) * sub,
      (y - (py << dz)) * sub,
      sub,
      sub,
      0,
      0,
      TILE_SIZE,
      TILE_SIZE,
    );
    bitmap.close();
    const { data } = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
    for (let i = 0; i < out.length; i++) {
      out[i] = data[i * 4] * 256 + data[i * 4 + 1] + data[i * 4 + 2] / 256 - 32768;
    }
  }
  return out;
}

function fetchMesh(base: string, level: number, x: number, y: number) {
  const key = `${base}|${level}|${x}|${y}`;
  let p = meshCache.get(key);
  if (!p) {
    p = fetch(`${base}/${level}/${x}/${y}.terrain?v=1.1.0`)
      .then(async (res) => (res.ok ? decodeQuantizedMesh(await res.arrayBuffer()) : null))
      .catch(() => null);
    meshCache.set(key, p);
  }
  return p;
}

// ---------------------------------------------------------------- rasterise

/**
 * Rasterises one geographic quantized-mesh tile into `heights` (a Mercator
 * tile), interpolating heights barycentrically at pixel centres.
 */
function rasterizeMesh(
  mesh: QuantizedMesh,
  geo: { west: number; east: number; south: number; north: number },
  merc: { west: number; east: number; north: number; south: number },
  heights: Float32Array,
  written: Uint8Array,
  heightOffset: number,
) {
  const n = mesh.u.length;
  const px = new Float32Array(n);
  const py = new Float32Array(n);
  const mx0 = merc.west;
  const sx = TILE_SIZE / (merc.east - merc.west);
  const my0 = mercY(merc.north);
  const sy = TILE_SIZE / (mercY(merc.south) - my0);
  const gw = geo.east - geo.west;
  const gh = geo.north - geo.south;
  for (let i = 0; i < n; i++) {
    const lon = geo.west + (mesh.u[i] / QUANTIZED_MAX) * gw;
    const lat = geo.south + (mesh.v[i] / QUANTIZED_MAX) * gh;
    px[i] = (lon - mx0) * sx;
    py[i] = (mercY(lat) - my0) * sy;
  }

  const idx = mesh.indices;
  const h = mesh.heights;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t];
    const b = idx[t + 1];
    const c = idx[t + 2];
    const ax = px[a], ay = py[a], bx = px[b], by = py[b], cx = px[c], cy = py[c];
    const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const maxX = Math.min(TILE_SIZE - 1, Math.ceil(Math.max(ax, bx, cx)));
    const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const maxY = Math.min(TILE_SIZE - 1, Math.ceil(Math.max(ay, by, cy)));
    if (minX > maxX || minY > maxY) continue;
    // Tile skirts / filler vertices sit far below the surface: drop them.
    if (h[a] < 0 || h[b] < 0 || h[c] < 0) continue;
    const det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (det === 0) continue;
    const inv = 1 / det;
    for (let yy = minY; yy <= maxY; yy++) {
      const sy0 = yy + 0.5;
      for (let xx = minX; xx <= maxX; xx++) {
        const sx0 = xx + 0.5;
        const w0 = ((by - cy) * (sx0 - cx) + (cx - bx) * (sy0 - cy)) * inv;
        const w1 = ((cy - ay) * (sx0 - cx) + (ax - cx) * (sy0 - cy)) * inv;
        const w2 = 1 - w0 - w1;
        if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
        const k = yy * TILE_SIZE + xx;
        heights[k] = w0 * h[a] + w1 * h[b] + w2 * h[c] - heightOffset;
        written[k] = 1;
      }
    }
  }
}

/** Overlays survey DTM heights onto `heights`; returns the covered pixels. */
async function overlayDtm(
  base: string,
  z: number,
  x: number,
  y: number,
  heights: Float32Array,
  maxLevel: number,
  heightOffset: number,
): Promise<Uint8Array> {
  const merc = tileBounds(z, x, y);
  const written = new Uint8Array(heights.length);
  const ideal = Math.max(0, Math.min(maxLevel, z - 1));

  for (let level = ideal; level >= Math.max(0, ideal - DTM_FALLBACK_LEVELS); level--) {
    const size = 180 / 2 ** level;
    const x0 = Math.floor((merc.west + 180) / size);
    const x1 = Math.floor((merc.east - 1e-9 + 180) / size);
    const y0 = Math.floor((merc.south + 90) / size);
    const y1 = Math.floor((merc.north - 1e-9 + 90) / size);
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > 16) break;

    const jobs: Promise<void>[] = [];
    let found = false;
    for (let gx = x0; gx <= x1; gx++) {
      for (let gy = y0; gy <= y1; gy++) {
        jobs.push(
          fetchMesh(base, level, gx, gy).then((mesh) => {
            if (!mesh) return;
            found = true;
            const geo = {
              west: gx * size - 180,
              east: (gx + 1) * size - 180,
              south: gy * size - 90,
              north: (gy + 1) * size - 90,
            };
            rasterizeMesh(mesh, geo, merc, heights, written, heightOffset);
          }),
        );
      }
    }
    await Promise.all(jobs);
    if (found) break;
  }

  return written;
}

// ---------------------------------------------------------------- public

/**
 * Elevation tile in metres (row-major, north first). `dtmBase` is the
 * quantized-mesh folder of the epoch, or "" for the global base DEM only.
 */
export interface DtmOptions {
  /** Quantized-mesh folder of the epoch DTM ("" = base DEM only). */
  base: string;
  /** [west, south, east, north] where the DTM may have data. */
  bbox?: [number, number, number, number];
  /** Metres subtracted from DTM heights (ellipsoidal → orthometric). */
  heightOffset?: number;
  maxLevel?: number;
}

export function getHeightTile(
  dtm: DtmOptions,
  z: number,
  x: number,
  y: number,
): Promise<Float32Array> {
  return getHeightTileWithCoverage(dtm, z, x, y).then((tile) => tile.heights);
}

/** `getHeightTile` plus the mask of pixels the survey DTM covered. */
export function getHeightTileWithCoverage(
  dtm: DtmOptions,
  z: number,
  x: number,
  y: number,
): Promise<HeightTile> {
  const { base: dtmBase, bbox: dtmBbox, heightOffset = 0, maxLevel: dtmMaxLevel = 18 } = dtm;
  const key = `${dtmBase}|${heightOffset}|${z}|${x}|${y}`;
  let p = heightCache.get(key);
  if (!p) {
    p = (async () => {
      const heights = await fetchTerrarium(z, x, y);
      const b = tileBounds(z, x, y);
      const intersects =
        !dtmBbox ||
        (b.east > dtmBbox[0] && b.west < dtmBbox[2] && b.north > dtmBbox[1] && b.south < dtmBbox[3]);
      const covered =
        dtmBase && z >= 9 && intersects
          ? await overlayDtm(dtmBase, z, x, y, heights, dtmMaxLevel, heightOffset)
          : null;
      return { heights, covered };
    })();
    // Don't keep failures: the next request retries.
    p.catch(() => heightCache.delete(key));
    heightCache.set(key, p);
  }
  return p;
}

/** Terrarium-encodes heights into a PNG for a MapLibre raster-dem source. */
export async function encodeTerrarium(heights: Float32Array): Promise<ArrayBuffer> {
  const canvas = new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(TILE_SIZE, TILE_SIZE);
  const d = image.data;
  for (let i = 0; i < heights.length; i++) {
    const v = Math.max(0, Math.min(65535.99, heights[i] + 32768));
    const r = Math.floor(v / 256);
    const g = Math.floor(v) - r * 256;
    d[i * 4] = r;
    d[i * 4 + 1] = g;
    d[i * 4 + 2] = Math.floor((v - Math.floor(v)) * 256);
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const blob = await canvas.convertToBlob({ type: "image/png" });
  return blob.arrayBuffer();
}
