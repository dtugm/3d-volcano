"use client";

const CHUNK = 4 * 1024 * 1024;
const CONCURRENCY = 6;
/** Below this size a single request is as fast. */
const MIN_RANGED = 2 * CHUNK;

export interface ByteProgress {
  loaded: number;
  total: number;
}

async function plain(url: string, signal: AbortSignal | undefined, onProgress: (d: ByteProgress) => void) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const data = await res.arrayBuffer();
  onProgress({ loaded: data.byteLength, total: data.byteLength });
  return data;
}

/**
 * Downloads a large file as parallel HTTP range requests. Splat tiles are
 * tens of MB and the bucket serves some objects slowly per connection;
 * splitting them up is faster and gives byte-level progress.
 *
 * The size comes from a HEAD request: `Content-Length` is CORS-safelisted,
 * whereas the bucket does not expose `Content-Range`.
 */
export async function fetchRanged(
  url: string,
  signal: AbortSignal | undefined,
  onProgress: (delta: ByteProgress) => void,
): Promise<ArrayBuffer> {
  let total = NaN;
  try {
    const head = await fetch(url, { method: "HEAD", signal });
    if (head.ok) total = Number(head.headers.get("Content-Length"));
  } catch (err) {
    if (signal?.aborted) throw err;
  }
  if (!Number.isFinite(total) || total < MIN_RANGED) return plain(url, signal, onProgress);

  onProgress({ loaded: 0, total });
  const out = new Uint8Array(total);
  let next = 0;
  const worker = async () => {
    for (;;) {
      const start = next++ * CHUNK;
      if (start >= total) return;
      const end = Math.min(total, start + CHUNK) - 1;
      const res = await fetch(url, { headers: { Range: `bytes=${start}-${end}` }, signal });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const part = new Uint8Array(await res.arrayBuffer());
      if (res.status !== 206 || part.byteLength !== end - start + 1) {
        // Range ignored: the response is the whole file.
        if (part.byteLength === total) {
          out.set(part, 0);
          next = Infinity;
          onProgress({ loaded: total, total: 0 });
          return;
        }
        throw new Error(`Unexpected range response for ${url}`);
      }
      out.set(part, start);
      onProgress({ loaded: part.byteLength, total: 0 });
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return out.buffer;
}

const CACHE_NAME = "dt-volcano-splat-tiles-v1";

/**
 * `fetchRanged` with a persistent Cache Storage copy: splat tiles are large
 * and immutable, and the bucket sends no Cache-Control, so without this every
 * visit downloads them again. Cache failures (private mode, quota) fall back
 * to the network.
 */
export async function fetchCached(
  url: string,
  signal: AbortSignal | undefined,
  onProgress: (delta: ByteProgress) => void,
): Promise<ArrayBuffer> {
  let cache: Cache | null = null;
  try {
    cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(url);
    if (hit) {
      const data = await hit.arrayBuffer();
      onProgress({ loaded: data.byteLength, total: data.byteLength });
      return data;
    }
  } catch {
    cache = null;
  }
  const data = await fetchRanged(url, signal, onProgress);
  if (cache) {
    cache
      .put(url, new Response(data.slice(0), { headers: { "Content-Type": "model/gltf-binary" } }))
      .catch(() => {});
  }
  return data;
}
