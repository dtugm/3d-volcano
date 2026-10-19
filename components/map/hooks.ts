"use client";

import type { MapEventType, MapLayerMouseEvent, MapMouseEvent } from "maplibre-gl";
import { useEffect, useEffectEvent } from "react";

import { isMapAlive, useMapContext } from "./MapContext";

/** Subscribes to a map event for as long as `enabled` is true. */
export function useMapEvent<T extends keyof MapEventType>(
  type: T,
  handler: (event: MapEventType[T]) => void,
  enabled = true,
) {
  const { map } = useMapContext();
  const onEvent = useEffectEvent(handler);
  useEffect(() => {
    if (!enabled) return;
    const listener = (event: MapEventType[T]) => onEvent(event);
    map.on(type, listener);
    return () => {
      if (isMapAlive(map)) map.off(type, listener);
    };
  }, [map, type, enabled]);
}

/**
 * While `enabled`, every map click goes to `handler` and the cursor becomes a
 * crosshair (picking a vent, measuring).
 */
export function useExclusiveClick(
  handler: (event: MapMouseEvent | MapLayerMouseEvent) => void,
  enabled: boolean,
) {
  const { map } = useMapContext();
  useMapEvent("click", handler, enabled);
  useEffect(() => {
    if (!enabled) return;
    const canvas = map.getCanvas();
    canvas.style.cursor = "crosshair";
    return () => {
      canvas.style.cursor = "";
    };
  }, [map, enabled]);
}
