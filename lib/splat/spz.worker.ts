/// <reference lib="webworker" />
import { decodeSplatTile, type SplatTile } from "./spz";

export interface SpzRequest {
  id: number;
  glb: ArrayBuffer;
  maxSplats: number;
}

export type SpzResponse = { id: number; tile: SplatTile } | { id: number; error: string };

self.onmessage = async (event: MessageEvent<SpzRequest>) => {
  const scope = self as DedicatedWorkerGlobalScope;
  const { id, glb, maxSplats } = event.data;
  try {
    const tile = await decodeSplatTile(glb, maxSplats);
    const s = tile.splats;
    scope.postMessage({ id, tile } satisfies SpzResponse, [
      s.positions.buffer,
      s.alphas.buffer,
      s.colors.buffer,
      s.scales.buffer,
      s.rotations.buffer,
    ]);
  } catch (err) {
    scope.postMessage({ id, error: err instanceof Error ? err.message : String(err) } satisfies SpzResponse);
  }
};
