"use client";

import type { Map as MapLibreMap } from "maplibre-gl";
import { createContext, useContext } from "react";

export interface MapContextValue {
  map: MapLibreMap;
  /** False while a new style is loading; app layers wait for it. */
  ready: boolean;
  /** Increments after every style load, so sources and layers re-check themselves. */
  styleRevision: number;
}

export const MapContext = createContext<MapContextValue | null>(null);

/**
 * The enclosing `<MapSource>`: its id (the default `source` of child layers)
 * and a key that changes whenever the source is re-created, so children
 * re-add themselves.
 */
export const SourceContext = createContext<{ id: string; key: string } | null>(null);

export function useMapContext(): MapContextValue {
  const context = useContext(MapContext);
  if (!context) throw new Error("Map components must be rendered inside <MapView>.");
  return context;
}

const removedMaps = new WeakSet<MapLibreMap>();

/** React unmounts parents first; children's cleanups must not touch a removed map. */
export const isMapAlive = (map: MapLibreMap): boolean => !removedMaps.has(map);

export function markMapRemoved(map: MapLibreMap): void {
  removedMaps.add(map);
}
