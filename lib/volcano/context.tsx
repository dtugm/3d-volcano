"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { Mountain, MOUNTAINS, YearData } from "./types";

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
  activeYear: string;
  setActiveYear: (year: string) => void;
  activeYearData: YearData | undefined;
}

const VolcanoContext = createContext<VolcanoContextValue | null>(null);

export function VolcanoProvider({ children }: { children: ReactNode }) {
  const [activeMountainId, setActiveMountainIdState] = useState<string>(
    MOUNTAINS[0].id,
  );
  const [activeYear, setActiveYearState] = useState<string>(
    MOUNTAINS[0].years[MOUNTAINS[0].years.length - 1],
  );
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    terrain: true,
    ortho: true,
    tiles3d: true,
  });

  const activeMountain = MOUNTAINS.find((m) => m.id === activeMountainId);

  const setActiveMountainId = useCallback((id: string) => {
    setActiveMountainIdState(id);
    // Auto-set activeYear to the latest year of the new mountain
    const mountain = MOUNTAINS.find((m) => m.id === id);
    if (mountain && mountain.years.length > 0) {
      setActiveYearState(mountain.years[mountain.years.length - 1]);
    }
  }, []);

  const setActiveYear = useCallback((year: string) => {
    setActiveYearState(year);
  }, []);

  const toggleLayer = useCallback((layer: LayerType) => {
    setLayerVisibility((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  }, []);

  const activeYearData = useMemo(() => {
    return activeMountain?.yearData[activeYear];
  }, [activeMountain, activeYear]);

  return (
    <VolcanoContext.Provider
      value={{
        mountains: MOUNTAINS,
        activeMountainId,
        activeMountain,
        setActiveMountainId,
        layerVisibility,
        toggleLayer,
        activeYear,
        setActiveYear,
        activeYearData,
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
