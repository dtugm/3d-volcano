export const SENSOR_API_BASE_URL = (
  process.env.NEXT_PUBLIC_SENSOR_API_URL ||
  "https://api-sensor-vdt-production.up.railway.app"
).replace(/\/$/, "");

/**
 * Public CDN domain that actually serves the LST tiles. The backend's
 * /lst/config reports the raw R2 S3 endpoint instead, which rejects
 * unsigned requests, so every tile template is rewritten onto this host.
 */
export const LST_TILE_HOST = (
  process.env.NEXT_PUBLIC_LST_TILE_HOST ||
  "https://bucket.dt-volcano.geo-ai.id"
).replace(/\/$/, "");

/** Zoom range the LST tile pyramid is published at (verified against the bucket). */
export const LST_MIN_ZOOM = 5;
export const LST_MAX_ZOOM = 12;

/**
 * Half-width, in degrees, of the box an LST scene covers around its volcano.
 * The scenes are roughly 0.7 deg wide but not perfectly centred on the summit,
 * so the imagery rectangle is padded to make sure nothing is clipped.
 * Cesium also needs a bounded rectangle here: with a global one, the tile count
 * at LST_MIN_ZOOM is far too large and the layer never renders at all.
 */
export const LST_FOOTPRINT_DEG = 0.6;

const R2_S3_HOST_RE = /^https?:\/\/[0-9a-f]{32}\.r2\.cloudflarestorage\.com\/[^/]+/i;

/**
 * Rewrites a tile template from /lst/config onto the public host.
 * The S3-style URL ("https://{account}.r2.cloudflarestorage.com/{bucket}/LST/...")
 * answers 400 InvalidArgument without an AWS signature, while the same key
 * served from the custom domain is public.
 */
export function toPublicTileUrl(tileUrl: string): string {
  if (R2_S3_HOST_RE.test(tileUrl)) {
    return tileUrl.replace(R2_S3_HOST_RE, LST_TILE_HOST);
  }
  return tileUrl;
}

export function sensorApiUrl(
  path: string,
  params?: Record<string, string | number | undefined>,
): string {
  const url = new URL(`${SENSOR_API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export async function sensorApiFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Sensor API ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** Maps a mountain id from lib/volcano ("gunung-agung") to an API key ("agung"). */
export function toLstKey(mountainId: string): string {
  return mountainId.replace(/^gunung-/, "");
}
