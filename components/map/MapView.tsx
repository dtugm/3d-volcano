"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import {
  Map as MapLibreMap,
  type MapOptions,
  setWorkerUrl,
  type StyleSpecification,
} from "maplibre-gl";
import { type ReactNode, useCallback, useEffect, useEffectEvent, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { registerDtmProtocol } from "@/lib/terrain/protocol";

import { carryOverAppLayers } from "./basemap-style";
import { MapContext, markMapRemoved } from "./MapContext";

// MapLibre 6 spawns its worker next to its own module, which the bundler
// moves; point it at the copy in public/ (see the `copy-maplibre` script).
let workerConfigured = false;
function configureWorker() {
  if (workerConfigured) return;
  setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
  registerDtmProtocol();
  workerConfigured = true;
}

export interface MapStyleSource {
  style: string | StyleSpecification;
  /** Changes when the style must be reloaded (basemap, theme). */
  key: string;
}

export interface MapViewProps {
  style: MapStyleSource;
  /** Creation options (camera, limits…); read once. */
  options?: Omit<MapOptions, "container" | "style">;
  className?: string;
  onReady?: (map: MapLibreMap) => void;
  /** Called before the map is destroyed. */
  onRemove?: () => void;
  children?: ReactNode;
}

/**
 * Owns the MapLibre map. Children (sources, layers, markers, overlays) render
 * once the first style has loaded and keep themselves in sync after later
 * style swaps: app layers are carried into the new style, and every child
 * re-checks itself when `styleRevision` changes.
 */
export function MapView({ style, options, className, onReady, onRemove, children }: MapViewProps) {
  const [map, setMap] = useState<MapLibreMap | null>(null);
  // Tied to the map instance: a re-created map (StrictMode, fast refresh) starts not loaded.
  const [loaded, setLoaded] = useState<{ map: MapLibreMap | null; key: string; revision: number }>({
    map: null,
    key: "",
    revision: 0,
  });
  const creation = useRef({ options, onReady, onRemove });
  const requestedKey = useRef("");

  const containerRef = useCallback((container: HTMLDivElement | null) => {
    if (!container) return;
    configureWorker();
    const instance = new MapLibreMap({
      container,
      attributionControl: false,
      canvasContextAttributes: { antialias: true },
      ...creation.current.options,
    });
    instance.on("style.load", () =>
      setLoaded((previous) => ({
        map: instance,
        key: requestedKey.current,
        revision: previous.revision + 1,
      })),
    );
    setMap(instance);
    creation.current.onReady?.(instance);

    return () => {
      creation.current.onRemove?.();
      setMap(null);
      markMapRemoved(instance);
      instance.remove();
    };
  }, []);

  const transform = useEffectEvent((previous: StyleSpecification | undefined, next: StyleSpecification) =>
    carryOverAppLayers(previous, next),
  );

  useEffect(() => {
    if (!map) return;
    requestedKey.current = style.key;
    map.setStyle(style.style, {
      diff: false,
      transformStyle: (previous, next) => transform(previous, next),
    });
  }, [map, style.style, style.key]);

  return (
    <>
      {/* maplibre-gl.css sets `position: relative` on the container, which beats
          Tailwind's layered utilities — so the container fills a positioned wrapper. */}
      <div className={cn("absolute inset-0", className)}>
        <div ref={containerRef} className="h-full w-full" />
      </div>
      {map && loaded.map === map && (
        <MapContext
          value={{ map, ready: loaded.key === style.key, styleRevision: loaded.revision }}
        >
          {children}
        </MapContext>
      )}
    </>
  );
}
