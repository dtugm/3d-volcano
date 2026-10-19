"use client";

import type { Map as MapLibreMap } from "maplibre-gl";
import { create } from "zustand";

/** The live map, for UI outside the map tree (controls, panels). */
export const useMapInstance = create<{ map: MapLibreMap | null; setMap: (map: MapLibreMap | null) => void }>()(
  (set) => ({
    map: null,
    setMap: (map) => {
      // Handy for debugging in the browser console.
      if (process.env.NODE_ENV !== "production") (window as unknown as { __dtMap?: unknown }).__dtMap = map;
      set({ map });
    },
  }),
);
