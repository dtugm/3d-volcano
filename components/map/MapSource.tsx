"use client";

import type { GeoJSONSource, SourceSpecification } from "maplibre-gl";
import { type ReactNode, useLayoutEffect, useMemo } from "react";

import { isMapAlive, SourceContext, useMapContext } from "./MapContext";

/**
 * Declarative source. GeoJSON `data` changes go through `setData`; any other
 * change to the spec re-creates the source (removing its layers first).
 */
export function MapSource({
  id,
  source,
  children,
}: {
  id: string;
  source: SourceSpecification;
  children?: ReactNode;
}) {
  const { map, ready, styleRevision } = useMapContext();
  const data = source.type === "geojson" ? source.data : undefined;
  const structureKey = useMemo(
    () => JSON.stringify({ ...source, data: undefined }),
    [source],
  );

  // Layout effect: the source must exist before child layers' passive effects.
  useLayoutEffect(() => {
    if (!ready) return;
    if (!map.getSource(id)) map.addSource(id, JSON.parse(structureKey) as SourceSpecification);
    return () => {
      if (!isMapAlive(map) || !map.getSource(id)) return;
      for (const layer of map.getStyle()?.layers ?? []) {
        if ("source" in layer && layer.source === id) map.removeLayer(layer.id);
      }
      if (map.getTerrain()?.source === id) map.setTerrain(null);
      map.removeSource(id);
    };
  }, [map, ready, styleRevision, id, structureKey]);

  useLayoutEffect(() => {
    if (!ready || data === undefined) return;
    (map.getSource(id) as GeoJSONSource | undefined)?.setData(data);
  }, [map, ready, styleRevision, id, data]);

  if (!ready) return null;
  return <SourceContext value={{ id, key: `${styleRevision}|${structureKey}` }}>{children}</SourceContext>;
}
