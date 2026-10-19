"use client";

import { addProtocol, type RequestParameters } from "maplibre-gl";

import type { TerrainTileRequest, TerrainTileResponse } from "./terrain.worker";

/**
 * `dtm://` protocol for MapLibre raster-dem sources. The tile URL template is
 * `dtm://{z}/{x}/{y}?base=<quantized-mesh folder>`; an empty base serves the
 * global DEM only. Work is spread over a small worker pool.
 */
export const DTM_PROTOCOL = "dtm";

const POOL_SIZE = 2;
let workers: Worker[] | null = null;
let nextWorker = 0;
let nextId = 0;
const pending = new Map<number, { resolve: (b: ArrayBuffer) => void; reject: (e: Error) => void }>();
let registered = false;

function pool() {
  if (!workers) {
    workers = Array.from({ length: POOL_SIZE }, () => {
      const worker = new Worker(new URL("./terrain.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (event: MessageEvent<TerrainTileResponse>) => {
        const job = pending.get(event.data.id);
        if (!job) return;
        pending.delete(event.data.id);
        if ("png" in event.data) job.resolve(event.data.png);
        else job.reject(new Error(event.data.error));
      };
      return worker;
    });
  }
  return workers;
}

/**
 * Tile URL template for a raster-dem source. `bbox` limits where the survey
 * DTM is requested (it 404s everywhere else).
 */
export function dtmTileUrl(
  base: string | undefined,
  bbox?: [number, number, number, number],
  heightOffset = 0,
) {
  const params = new URLSearchParams({ base: base ?? "" });
  if (bbox) params.set("bbox", bbox.map((v) => v.toFixed(5)).join(","));
  if (heightOffset) params.set("off", String(heightOffset));
  return `${DTM_PROTOCOL}://{z}/{x}/{y}?${params}`;
}

export function registerDtmProtocol() {
  if (registered) return;
  registered = true;
  addProtocol(DTM_PROTOCOL, (params: RequestParameters, abortController: AbortController) => {
    const url = new URL(params.url.replace(`${DTM_PROTOCOL}://`, "http://dtm/"));
    const [z, x, y] = url.pathname.split("/").filter(Boolean).map(Number);
    const base = url.searchParams.get("base") ?? "";
    const bboxParam = url.searchParams.get("bbox");
    const bbox = bboxParam
      ? (bboxParam.split(",").map(Number) as [number, number, number, number])
      : undefined;
    const heightOffset = Number(url.searchParams.get("off") ?? 0);
    const id = nextId++;
    const workerList = pool();
    const worker = workerList[nextWorker++ % workerList.length];

    return new Promise((resolve, reject) => {
      pending.set(id, { resolve: (data) => resolve({ data }), reject });
      abortController.signal.addEventListener("abort", () => {
        pending.delete(id);
        reject(new DOMException("Aborted", "AbortError"));
      });
      worker.postMessage({ id, base, bbox, heightOffset, z, x, y } satisfies TerrainTileRequest);
    });
  });
}
