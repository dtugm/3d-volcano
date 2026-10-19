/// <reference lib="webworker" />
import { encodeTerrarium, getHeightTile } from "./height-tiles";

export interface TerrainTileRequest {
  id: number;
  base: string;
  bbox?: [number, number, number, number];
  heightOffset?: number;
  z: number;
  x: number;
  y: number;
}

export type TerrainTileResponse =
  | { id: number; png: ArrayBuffer }
  | { id: number; error: string };

self.onmessage = async (event: MessageEvent<TerrainTileRequest>) => {
  const { id, base, bbox, heightOffset, z, x, y } = event.data;
  const scope = self as DedicatedWorkerGlobalScope;
  try {
    const heights = await getHeightTile({ base, bbox, heightOffset }, z, x, y);
    const png = await encodeTerrarium(heights);
    scope.postMessage({ id, png } satisfies TerrainTileResponse, [png]);
  } catch (err) {
    scope.postMessage({
      id,
      error: err instanceof Error ? err.message : String(err),
    } satisfies TerrainTileResponse);
  }
};
