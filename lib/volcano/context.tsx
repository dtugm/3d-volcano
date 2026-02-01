"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

import { Mountain, MOUNTAINS } from "./types";

export type LayerType = "terrain" | "ortho" | "tiles3d";

export interface LayerVisibility {
  terrain: boolean;
  ortho: boolean;
  tiles3d: boolean;
}

interface VolcanoContextValue {
  mountains: Mountain[];
  activeMountainId: string;
  activeMountain: Mountain | undefined;
  setActiveMountainId: (id: string) => void;
  layerVisibility: LayerVisibility;
  toggleLayer: (layer: LayerType) => void;
}

const VolcanoContext = createContext<VolcanoContextValue | null>(null);

export function VolcanoProvider({ children }: { children: ReactNode }) {
  const [activeMountainId, setActiveMountainIdState] = useState<string>(
    MOUNTAINS[0].id,
  );
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    terrain: true,
    ortho: true,
    tiles3d: true,
  });

  const setActiveMountainId = useCallback((id: string) => {
    setActiveMountainIdState(id);
  }, []);

  const toggleLayer = useCallback((layer: LayerType) => {
    setLayerVisibility((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  }, []);

  const activeMountain = MOUNTAINS.find((m) => m.id === activeMountainId);

  return (
    <VolcanoContext.Provider
      value={{
        mountains: MOUNTAINS,
        activeMountainId,
        activeMountain,
        setActiveMountainId,
        layerVisibility,
        toggleLayer,
      }}
    >
      {children}
    </VolcanoContext.Provider>
  );
}

export function useVolcano() {
  const context = useContext(VolcanoContext);
  if (!context) {
    throw new Error("useVolcano must be used within a VolcanoProvider");
  }
  return context;
}
