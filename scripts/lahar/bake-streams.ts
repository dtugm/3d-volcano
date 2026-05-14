import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PNG } from "pngjs";

const ROOT = "public/lahar-test-data/gunung-kelud/2014";

interface Meta {
  width: number;
  height: number;
  bbox: [number, number, number, number];
  elevationMin: number;
  elevationMax: number;
  cellSizeM: number;
}

function readHeights(): { heights: Float32Array; meta: Meta } {
  const meta = JSON.parse(readFileSync(join(ROOT, "heightmap.json"), "utf8")) as Meta;
  const png = PNG.sync.read(readFileSync(join(ROOT, "heightmap.png")));
  const range = meta.elevationMax - meta.elevationMin;
  const h = new Float32Array(meta.width * meta.height);
  for (let i = 0; i < h.length; i++) {
    const v = (png.data[i * 4] << 8) | png.data[i * 4 + 1];
    h[i] = meta.elevationMin + (v / 65535) * range;
  }
  return { heights: h, meta };
}

const D8 = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];
const DIST = [Math.SQRT2, 1, Math.SQRT2, 1, 1, Math.SQRT2, 1, Math.SQRT2];

function flowDir(h: Float32Array, cols: number, rows: number): Int8Array {
  const dirs = new Int8Array(cols * rows).fill(-1);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      let bestSlope = 0;
      let bestD = -1;
      const z = h[r * cols + c];
      for (let d = 0; d < 8; d++) {
        const nr = r + D8[d][0];
        const nc = c + D8[d][1];
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        const s = (z - h[nr * cols + nc]) / DIST[d];
        if (s > bestSlope) {
          bestSlope = s;
          bestD = d;
        }
      }
      dirs[r * cols + c] = bestD;
    }
  return dirs;
}

function flowAccum(dirs: Int8Array, cols: number, rows: number): Int32Array {
  const acc = new Int32Array(cols * rows).fill(1);
  for (let i = 0; i < acc.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const d = dirs[i];
    if (d < 0) continue;
    const nr = r + D8[d][0];
    const nc = c + D8[d][1];
    acc[nr * cols + nc] += acc[i];
  }
  return acc;
}

function traceStream(
  start: { r: number; c: number },
  dirs: Int8Array,
  acc: Int32Array,
  cols: number,
  rows: number,
  threshold: number,
  meta: Meta,
): [number, number][] {
  const [w, , e, n] = meta.bbox;
  const lonStep = (e - w) / cols;
  const latStep = (n - meta.bbox[1]) / rows;
  const pts: [number, number][] = [];
  let r = start.r;
  let c = start.c;
  while (acc[r * cols + c] >= threshold) {
    pts.push([w + (c + 0.5) * lonStep, n - (r + 0.5) * latStep]);
    const d = dirs[r * cols + c];
    if (d < 0) break;
    r += D8[d][0];
    c += D8[d][1];
    if (r < 0 || r >= rows || c < 0 || c >= cols) break;
  }
  return pts;
}

function main() {
  const { heights, meta } = readHeights();
  const { width: cols, height: rows } = meta;
  const dirs = flowDir(heights, cols, rows);
  const acc = flowAccum(dirs, cols, rows);

  // Try threshold 400, fall back to 100 if no streams found
  let THRESH = 400;
  let candidates: Array<{ r: number; c: number; z: number }> = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    candidates = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const a = acc[r * cols + c];
        if (a >= THRESH && a < THRESH * 2)
          candidates.push({ r, c, z: heights[r * cols + c] });
      }
    candidates.sort((a, b) => b.z - a.z);
    const testStems: Array<[number, number][]> = [];
    for (const start of candidates.slice(0, 3)) {
      const trace = traceStream(start, dirs, acc, cols, rows, THRESH, meta);
      if (trace.length >= 2) testStems.push(trace);
    }
    if (testStems.length >= 1) break;
    console.warn(`No streams at threshold ${THRESH}, retrying with 100`);
    THRESH = 100;
  }

  console.log(`Using flow accumulation threshold: ${THRESH}`);

  const mainstems: Array<[number, number][]> = [];
  for (const start of candidates.slice(0, 3)) {
    const trace = traceStream(start, dirs, acc, cols, rows, THRESH, meta);
    if (trace.length >= 2) mainstems.push(trace);
  }

  const mainstemGeojson = {
    type: "FeatureCollection",
    features: mainstems.map((coords, i) => ({
      type: "Feature",
      properties: { streamId: `s${i + 1}`, order: 1 },
      geometry: { type: "LineString", coordinates: coords },
    })),
  };
  writeFileSync(join(ROOT, "mainstem.geojson"), JSON.stringify(mainstemGeojson));
  writeFileSync(
    join(ROOT, "branches.geojson"),
    JSON.stringify({ type: "FeatureCollection", features: [] }),
  );

  const cx = (meta.bbox[0] + meta.bbox[2]) / 2;
  const cy = (meta.bbox[1] + meta.bbox[3]) / 2;
  const ring = (radiusDeg: number) => {
    const pts: [number, number][] = [];
    for (let a = 0; a < 64; a++) {
      const th = (a / 64) * Math.PI * 2;
      pts.push([cx + Math.cos(th) * radiusDeg, cy + Math.sin(th) * radiusDeg]);
    }
    pts.push(pts[0]);
    return pts;
  };
  writeFileSync(
    join(ROOT, "deposition.geojson"),
    JSON.stringify({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { synthetic: true },
          geometry: { type: "Polygon", coordinates: [ring(0.012)] },
        },
      ],
    }),
  );
  writeFileSync(
    join(ROOT, "hazardCone.geojson"),
    JSON.stringify({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { synthetic: true, radiusKm: 3 },
          geometry: { type: "Polygon", coordinates: [ring(0.025)] },
        },
      ],
    }),
  );

  const lspFeatures = mainstems.map((coords, i) => {
    let best = coords[0];
    let bestD = Infinity;
    for (const p of coords) {
      const d = Math.hypot(p[0] - cx, p[1] - cy);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return {
      type: "Feature",
      properties: {
        lspId: `lsp-${i + 1}`,
        streamId: `s${i + 1}`,
        elevation:
          heights[
            Math.floor(
              ((cy - best[1]) / (meta.bbox[3] - meta.bbox[1])) * rows,
            ) *
              cols +
              Math.floor(
                ((best[0] - meta.bbox[0]) / (meta.bbox[2] - meta.bbox[0])) *
                  cols,
              )
          ] ?? 1500,
        slvMin: 4000,
        slvLikely: 8000,
        slvMax: 14000,
      },
      geometry: { type: "Point", coordinates: best },
    };
  });
  writeFileSync(
    join(ROOT, "lspCandidates.geojson"),
    JSON.stringify({ type: "FeatureCollection", features: lspFeatures }),
  );

  console.log(`wrote ${mainstems.length} mainstems, ${lspFeatures.length} LSPs`);
}

main();
