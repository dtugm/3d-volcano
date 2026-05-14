/// <reference lib="webworker" />
import { getProfile } from "@/lib/lahar/materials";
import { FluidEngine } from "@/lib/lahar/sim/engine";
import { TerrainGrid } from "@/lib/lahar/terrain/grid";
import type { MaterialProfileId } from "@/lib/lahar/types";

type InMsg =
  | {
      type: "init";
      grid: {
        heights: ArrayBuffer;
        cols: number;
        rows: number;
        cellSizeM: number;
        bbox: [number, number, number, number];
      };
      profileId: MaterialProfileId;
    }
  | { type: "setSource"; r: number; c: number }
  | { type: "setProfile"; profileId: MaterialProfileId }
  | { type: "step"; count: number }
  | { type: "reset" };

let engine: FluidEngine | null = null;

self.onmessage = (e: MessageEvent<InMsg>) => {
  const msg = e.data;
  try {
    if (msg.type === "init") {
      const grid = new TerrainGrid({
        heights: new Float32Array(msg.grid.heights),
        cols: msg.grid.cols,
        rows: msg.grid.rows,
        cellSizeM: msg.grid.cellSizeM,
        bbox: msg.grid.bbox,
      });
      engine = new FluidEngine(grid, getProfile(msg.profileId));
      (self as unknown as Worker).postMessage({ type: "ready" });
      return;
    }
    if (!engine) throw new Error("engine not initialised");
    if (msg.type === "setSource") engine.setSource(msg.r, msg.c);
    else if (msg.type === "setProfile") engine.setProps(getProfile(msg.profileId));
    else if (msg.type === "reset") engine.reset();
    else if (msg.type === "step") {
      engine.advance(msg.count);
      if (engine.shouldSnapshot()) {
        const snap = engine.snapshot();
        const transfer: Transferable[] = [snap.depth.buffer];
        if (snap.particles) transfer.push(snap.particles.buffer);
        (self as unknown as Worker).postMessage({ type: "snapshot", snap }, transfer);
      }
    }
  } catch (err) {
    (self as unknown as Worker).postMessage({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

export {};
