import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PNG } from "pngjs";

const CENTRE_LAT = -7.93;
const CENTRE_LON = 112.31;
const RADIUS_DEG = 0.03;

async function fetchSrtm() {
  const south = CENTRE_LAT - RADIUS_DEG;
  const north = CENTRE_LAT + RADIUS_DEG;
  const west = CENTRE_LON - RADIUS_DEG;
  const east = CENTRE_LON + RADIUS_DEG;
  const url = `https://portal.opentopography.org/API/globaldem?demtype=SRTMGL1&south=${south}&north=${north}&west=${west}&east=${east}&outputFormat=AAIGrid&API_Key=${process.env.OPENTOPO_KEY ?? "demoapikeyot2022"}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenTopography ${res.status}: ${await res.text()}`);
  const text = await res.text();
  const lines = text.split(/\r?\n/);
  const meta: Record<string, number> = {};
  let dataStart = 0;
  for (let i = 0; i < 6; i++) {
    const parts = lines[i].trim().split(/\s+/);
    meta[parts[0].toLowerCase()] = Number(parts[1]);
    dataStart = i + 1;
  }
  const cols = meta.ncols;
  const rows = meta.nrows;
  const cellsize = meta.cellsize;
  const nodata = meta.nodata_value;
  const data = new Int16Array(cols * rows);
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    const row = lines[dataStart + r].trim().split(/\s+/);
    for (let c = 0; c < cols; c++) {
      const v = Number(row[c]);
      data[idx++] = v === nodata ? 0 : v;
    }
  }
  return {
    data,
    cols,
    rows,
    bbox: [
      meta.xllcorner,
      meta.yllcorner,
      meta.xllcorner + cols * cellsize,
      meta.yllcorner + rows * cellsize,
    ] as [number, number, number, number],
  };
}

function syntheticCone() {
  const cols = 256,
    rows = 256;
  const cellsize = (RADIUS_DEG * 2 * 111_320) / cols; // ~26 m
  const data = new Int16Array(cols * rows);
  const cx = cols / 2;
  const cy = rows / 2;
  const sigma = cols / 6;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dx = c - cx;
      const dy = r - cy;
      const d2 = dx * dx + dy * dy;
      const h = 1731 * Math.exp(-d2 / (2 * sigma * sigma)) + 600;
      data[r * cols + c] = Math.round(h);
    }
  }
  void cellsize;
  return {
    data,
    cols,
    rows,
    bbox: [
      CENTRE_LON - RADIUS_DEG,
      CENTRE_LAT - RADIUS_DEG,
      CENTRE_LON + RADIUS_DEG,
      CENTRE_LAT + RADIUS_DEG,
    ] as [number, number, number, number],
  };
}

async function main() {
  const out = "public/lahar-test-data/gunung-kelud/2014";
  mkdirSync(out, { recursive: true });

  let dem;
  try {
    dem = await fetchSrtm();
    console.log("using SRTM");
  } catch (err) {
    console.warn(
      "SRTM failed, using synthetic cone:",
      err instanceof Error ? err.message : err,
    );
    dem = syntheticCone();
  }

  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < dem.data.length; i++) {
    const v = dem.data[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min || 1;
  const png = new PNG({ width: dem.cols, height: dem.rows, colorType: 6 });
  for (let i = 0; i < dem.cols * dem.rows; i++) {
    const v = Math.round(((dem.data[i] - min) / range) * 65535);
    png.data[i * 4] = (v >> 8) & 0xff;
    png.data[i * 4 + 1] = v & 0xff;
    png.data[i * 4 + 2] = 0;
    png.data[i * 4 + 3] = 255;
  }
  writeFileSync(join(out, "heightmap.png"), PNG.sync.write(png));
  const cellSizeM =
    (((dem.bbox[2] - dem.bbox[0]) * 111_320) / dem.cols +
      ((dem.bbox[3] - dem.bbox[1]) * 110_540) / dem.rows) /
    2;
  writeFileSync(
    join(out, "heightmap.json"),
    JSON.stringify(
      {
        width: dem.cols,
        height: dem.rows,
        bbox: dem.bbox,
        elevationMin: min,
        elevationMax: max,
        cellSizeM,
      },
      null,
      2,
    ),
  );
  console.log(
    `baked: ${dem.cols}x${dem.rows} elev ${min}..${max}m cell ${cellSizeM.toFixed(1)}m`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
