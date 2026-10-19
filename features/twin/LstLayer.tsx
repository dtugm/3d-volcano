"use client";

import { MapLayer, MapSource } from "@/components/map";
import { useLst } from "@/lib/hooks/use-lst";
import { LST_FOOTPRINT_DEG, LST_MAX_ZOOM, LST_MIN_ZOOM } from "@/lib/sensor-api";
import { useActiveVolcano, useTwin } from "@/lib/twin/store";

/**
 * Land Surface Temperature: an XYZ pyramid covering one volcano. Both the
 * zoom bounds and the rectangle matter, or MapLibre asks for tiles that
 * don't exist.
 */
export default function LstLayer() {
  const volcano = useActiveVolcano();
  const enabled = useTwin((s) => s.layers.lst);
  const opacity = useTwin((s) => s.lstOpacity);
  const { tileUrl } = useLst();
  if (!tileUrl) return null;

  return (
    <MapSource
      id="dt:lst"
      source={{
        type: "raster",
        tiles: [tileUrl],
        tileSize: 256,
        minzoom: LST_MIN_ZOOM,
        maxzoom: LST_MAX_ZOOM,
        bounds: [
          volcano.longitude - LST_FOOTPRINT_DEG,
          volcano.latitude - LST_FOOTPRINT_DEG,
          volcano.longitude + LST_FOOTPRINT_DEG,
          volcano.latitude + LST_FOOTPRINT_DEG,
        ],
      }}
    >
      <MapLayer id="dt:lst" type="raster" slot="raster" visible={enabled} paint={{ "raster-opacity": opacity }} />
    </MapSource>
  );
}
