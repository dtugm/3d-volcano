"use client";

import { MapLayer, MapSource } from "@/components/map";
import { volcanoBbox } from "@/lib/catalog";
import { useActiveVolcano } from "@/lib/twin/store";

/** Survey orthophoto (TMS pyramid, Web Mercator, y flipped). */
export default function OrthoLayer({
  url,
  visible,
  idSuffix = "",
}: {
  url: string;
  visible: boolean;
  idSuffix?: string;
}) {
  const volcano = useActiveVolcano();
  const id = `dt:ortho${idSuffix}`;
  return (
    <MapSource
      id={id}
      source={{
        type: "raster",
        tiles: [`${url}/{z}/{x}/{y}.png`],
        scheme: "tms",
        tileSize: 256,
        minzoom: 11,
        maxzoom: 17,
        bounds: volcanoBbox(volcano),
      }}
    >
      <MapLayer id={id} type="raster" slot="raster" visible={visible} paint={{ "raster-fade-duration": 150 }} />
    </MapSource>
  );
}
