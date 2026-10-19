"use client";

import { useContext, useEffect } from "react";

import { isMapAlive, MapLayer, MapSource, SourceContext, useMapContext } from "@/components/map";
import { volcanoBbox } from "@/lib/catalog";
import { dtmTileUrl } from "@/lib/terrain/protocol";
import { useActiveVolcano, useTwin } from "@/lib/twin/store";

export const TERRAIN_SOURCE_ID = "dt:terrain";

function ApplyTerrain({ enabled }: { enabled: boolean }) {
  const { map, ready, styleRevision } = useMapContext();
  const sourceKey = useContext(SourceContext)?.key;
  useEffect(() => {
    if (!ready) return;
    // Exaggeration stays 1: the Gaussian splats are true-scale.
    map.setTerrain(enabled ? { source: TERRAIN_SOURCE_ID, exaggeration: 1 } : null);
    map.triggerRepaint();
    return () => {
      if (isMapAlive(map) && map.getTerrain()?.source === TERRAIN_SOURCE_ID) map.setTerrain(null);
    };
  }, [map, ready, styleRevision, sourceKey, enabled]);
  return null;
}

/**
 * Elevation for the active epoch: the survey DTM (quantized-mesh, decoded in a
 * worker) over a global base DEM, as a raster-dem. A second copy of the
 * source feeds the hillshade — MapLibre shades sharper when it does not share
 * the terrain's source.
 */
export default function TerrainLayer({ dtmBase }: { dtmBase?: string }) {
  const volcano = useActiveVolcano();
  const terrainOn = useTwin((s) => s.layers.terrain);
  const hillshadeOn = useTwin((s) => s.layers.hillshade);
  const orthoOn = useTwin((s) => s.layers.ortho);
  const tiles = [dtmTileUrl(dtmBase, volcanoBbox(volcano), volcano.heightOffset)];

  return (
    <>
      <MapSource
        id={TERRAIN_SOURCE_ID}
        source={{ type: "raster-dem", tiles, tileSize: 256, encoding: "terrarium", maxzoom: 16 }}
      >
        <ApplyTerrain enabled={terrainOn} />
      </MapSource>
      <MapSource
        id="dt:terrain-shade"
        source={{ type: "raster-dem", tiles, tileSize: 256, encoding: "terrarium", maxzoom: 16 }}
      >
        <MapLayer
          id="dt:terrain-hillshade"
          type="hillshade"
          slot="raster"
          visible={hillshadeOn}
          paint={{
            "hillshade-exaggeration": orthoOn ? 0.18 : 0.45,
            "hillshade-shadow-color": "rgba(45, 28, 20, 0.6)",
            "hillshade-highlight-color": "rgba(255, 255, 255, 0.25)",
            "hillshade-accent-color": "rgba(45, 28, 20, 0.25)",
          }}
        />
      </MapSource>
    </>
  );
}
