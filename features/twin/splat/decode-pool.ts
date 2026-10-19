"use client";

import type { SplatTile } from "@/lib/splat/spz";
import type { SpzRequest, SpzResponse } from "@/lib/splat/spz.worker";

const POOL_SIZE = Math.min(4, Math.max(2, (navigator.hardwareConcurrency ?? 4) >> 1));

let workers: Worker[] | null = null;
let next = 0;
let nextId = 0;
const pending = new Map<number, { resolve: (t: SplatTile) => void; reject: (e: Error) => void }>();

function pool() {
  if (!workers) {
    workers = Array.from({ length: POOL_SIZE }, () => {
      const worker = new Worker(new URL("../../../lib/splat/spz.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (event: MessageEvent<SpzResponse>) => {
        const job = pending.get(event.data.id);
        if (!job) return;
        pending.delete(event.data.id);
        if ("tile" in event.data) job.resolve(event.data.tile);
        else job.reject(new Error(event.data.error));
      };
      return worker;
    });
  }
  return workers;
}

/** Decodes a splat GLB off the main thread (gunzip + SPZ unpack). */
export function decodeInWorker(glb: ArrayBuffer, maxSplats: number): Promise<SplatTile> {
  const id = nextId++;
  const list = pool();
  const worker = list[next++ % list.length];
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, glb, maxSplats } satisfies SpzRequest, [glb]);
  });
}
