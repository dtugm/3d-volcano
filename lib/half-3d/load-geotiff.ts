import { fromArrayBuffer } from "geotiff";

import { ElevationData } from "./types";

export async function loadGeoTiff(url: string): Promise<ElevationData> {
  // Always fetch the full file as ArrayBuffer — works reliably with any
  // TIFF format (stripped, tiled, COG or not) and any storage backend
  // (local, S3, R2, GCS). fromUrl() uses range requests which can fail
  // with ERR_INSUFFICIENT_RESOURCES on non-COG files or restrictive CORS.
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const tiff = await fromArrayBuffer(arrayBuffer);

  const image = await tiff.getImage();
  const rasters = await image.readRasters();
  const data = rasters[0] as Float32Array;

  const bbox = image.getBoundingBox(); // [minX, minY, maxX, maxY]
  const width = image.getWidth();
  const height = image.getHeight();
  const noDataValue = image.getGDALNoData();

  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (noDataValue !== null && data[i] === noDataValue) continue;
    if (!isFinite(data[i])) continue;
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }

  return {
    width,
    height,
    elevations: data,
    bounds: { minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3] },
    minElevation: min,
    maxElevation: max,
    noDataValue,
  };
}
