import type { HeightmapMeta } from "../types";
import { TerrainGrid } from "./grid";

/**
 * Loads a 16-bit grayscale PNG heightmap plus its JSON sidecar and
 * returns a TerrainGrid with real-world elevations in metres.
 *
 * The PNG is encoded as 16-bit luminance; pixel value 0 maps to
 * meta.elevationMin and 65535 maps to meta.elevationMax.
 */
export async function loadHeightmap(
  pngUrl: string,
  metaUrl: string,
): Promise<TerrainGrid> {
  const [pngRes, metaRes] = await Promise.all([fetch(pngUrl), fetch(metaUrl)]);
  if (!pngRes.ok) throw new Error(`heightmap fetch failed: ${pngRes.status}`);
  if (!metaRes.ok) throw new Error(`meta fetch failed: ${metaRes.status}`);

  const meta = (await metaRes.json()) as HeightmapMeta;
  const blob = await pngRes.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("OffscreenCanvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0);
  const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);

  const heights = new Float32Array(bitmap.width * bitmap.height);
  const range = meta.elevationMax - meta.elevationMin;
  for (let i = 0; i < heights.length; i++) {
    // Two-channel encoding: R = high byte, G = low byte
    const v = (data[i * 4] << 8) | data[i * 4 + 1];
    heights[i] = meta.elevationMin + (v / 65535) * range;
  }
  return new TerrainGrid({
    heights,
    cols: meta.width,
    rows: meta.height,
    cellSizeM: meta.cellSizeM,
    bbox: meta.bbox,
  });
}
