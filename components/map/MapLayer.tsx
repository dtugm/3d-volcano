"use client";

import type { FilterSpecification, LayerSpecification } from "maplibre-gl";
import { useContext, useEffect, useRef } from "react";

import { type Slot, SLOTS } from "./basemap-style";
import { isMapAlive, SourceContext, useMapContext } from "./MapContext";

type Paint = Record<string, unknown>;

export interface MapLayerProps {
  id: string;
  type: LayerSpecification["type"];
  source?: string;
  slot?: Slot;
  paint?: Paint;
  layout?: Paint;
  filter?: FilterSpecification;
  minzoom?: number;
  maxzoom?: number;
  visible?: boolean;
}

/**
 * Declarative layer, inserted before its slot anchor. Paint, layout and
 * filter changes are applied per property instead of re-creating the layer.
 */
export function MapLayer({
  id,
  type,
  source,
  slot = "overlay",
  paint,
  layout,
  filter,
  minzoom,
  maxzoom,
  visible = true,
}: MapLayerProps) {
  const { map, ready, styleRevision } = useMapContext();
  const contextSource = useContext(SourceContext);
  const sourceId = source ?? contextSource?.id;
  const sourceKey = contextSource?.key;
  const applied = useRef<{ paint: Paint; layout: Paint }>({ paint: {}, layout: {} });

  // Passive: the parent <MapSource> adds its source in a layout effect, which runs first.
  useEffect(() => {
    if (!ready || !sourceId || map.getLayer(id)) return;
    const spec = {
      id,
      type,
      source: sourceId,
      metadata: { "dt:slot": SLOTS[slot] },
      paint: paint ?? {},
      layout: { ...(layout ?? {}), visibility: visible ? "visible" : "none" },
      ...(filter ? { filter } : {}),
      ...(minzoom !== undefined ? { minzoom } : {}),
      ...(maxzoom !== undefined ? { maxzoom } : {}),
    } as LayerSpecification;
    map.addLayer(spec, map.getLayer(SLOTS[slot]) ? SLOTS[slot] : undefined);
    applied.current = { paint: paint ?? {}, layout: layout ?? {} };
    return () => {
      if (isMapAlive(map) && map.getLayer(id)) map.removeLayer(id);
    };
    // Created once per style; property changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, ready, styleRevision, id, type, sourceId, sourceKey, slot]);

  useEffect(() => {
    if (!ready || !map.getLayer(id)) return;
    const next = paint ?? {};
    for (const key of new Set([...Object.keys(applied.current.paint), ...Object.keys(next)])) {
      if (JSON.stringify(applied.current.paint[key]) !== JSON.stringify(next[key])) {
        map.setPaintProperty(id, key as never, next[key] as never);
      }
    }
    applied.current.paint = next;
  }, [map, ready, styleRevision, sourceKey, id, paint]);

  useEffect(() => {
    if (!ready || !map.getLayer(id)) return;
    const next = { ...(layout ?? {}) };
    for (const key of new Set([...Object.keys(applied.current.layout), ...Object.keys(next)])) {
      if (JSON.stringify(applied.current.layout[key]) !== JSON.stringify(next[key])) {
        map.setLayoutProperty(id, key as never, next[key] as never);
      }
    }
    applied.current.layout = next;
    map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
  }, [map, ready, styleRevision, sourceKey, id, layout, visible]);

  useEffect(() => {
    if (!ready || !map.getLayer(id)) return;
    map.setFilter(id, filter ?? null);
  }, [map, ready, styleRevision, sourceKey, id, filter]);

  return null;
}
