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
  comparisonEnabled: boolean;
  setComparisonEnabled: (enabled: boolean) => void;
  comparisonLeftYear: string;
  setComparisonLeftYear: (year: string) => void;
  comparisonRightYear: string;
  setComparisonRightYear: (year: string) => void;
  splitPosition: number;
  setSplitPosition: (position: number) => void;
  comparisonLeftYearData: YearData | undefined;
  comparisonRightYearData: YearData | undefined;
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
  const [comparisonEnabled, setComparisonEnabledState] = useState(false);
  const [comparisonLeftYear, setComparisonLeftYear] = useState<string>("");
  const [comparisonRightYear, setComparisonRightYear] = useState<string>("");
  const [splitPosition, setSplitPosition] = useState(0.5);

  const activeMountain = MOUNTAINS.find((m) => m.id === activeMountainId);

  const setActiveMountainId = useCallback((id: string) => {
    setActiveMountainIdState(id);
    // Auto-set activeYear to the latest year of the new mountain
    const mountain = MOUNTAINS.find((m) => m.id === id);
    if (mountain && mountain.years.length > 0) {
      setActiveYearState(mountain.years[mountain.years.length - 1]);
    }
    // Reset comparison state on mountain change
    setComparisonEnabledState(false);
    setComparisonLeftYear("");
    setComparisonRightYear("");
    setSplitPosition(0.5);
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

  const setComparisonEnabled = useCallback(
    (enabled: boolean) => {
      setComparisonEnabledState(enabled);
      if (enabled && activeMountain) {
        const years = activeMountain.years;
        setComparisonLeftYear(years[0]);
        setComparisonRightYear(years[years.length - 1]);
        setSplitPosition(0.5);
      }
    },
    [activeMountain],
  );

  const comparisonLeftYearData = useMemo(() => {
    return activeMountain?.yearData[comparisonLeftYear];
  }, [activeMountain, comparisonLeftYear]);

  const comparisonRightYearData = useMemo(() => {
    return activeMountain?.yearData[comparisonRightYear];
  }, [activeMountain, comparisonRightYear]);

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
        comparisonEnabled,
        setComparisonEnabled,
        comparisonLeftYear,
        setComparisonLeftYear,
        comparisonRightYear,
        setComparisonRightYear,
        splitPosition,
        setSplitPosition,
        comparisonLeftYearData,
        comparisonRightYearData,
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
