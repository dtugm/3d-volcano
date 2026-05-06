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

export type LayerType = "terrain" | "ortho" | "tiles3d" | "gaussianSplat";
export type ComparisonMode = "ortho" | "terrain" | "gaussianSplat";
export type BasemapType = "osm" | "cesium" | "esri";

export interface LayerVisibility {
  terrain: boolean;
  ortho: boolean;
  tiles3d: boolean;
  gaussianSplat: boolean;
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
  comparisonMode: ComparisonMode;
  setComparisonMode: (mode: ComparisonMode) => void;
  comparisonLeftYear: string;
  setComparisonLeftYear: (year: string) => void;
  comparisonRightYear: string;
  setComparisonRightYear: (year: string) => void;
  splitPosition: number;
  setSplitPosition: (position: number) => void;
  comparisonLeftYearData: YearData | undefined;
  comparisonRightYearData: YearData | undefined;
  basemap: BasemapType;
  setBasemap: (basemap: BasemapType) => void;
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
    gaussianSplat: false,
  });
  const [comparisonEnabled, setComparisonEnabledState] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("ortho");
  const [comparisonLeftYear, setComparisonLeftYear] = useState<string>("");
  const [comparisonRightYear, setComparisonRightYear] = useState<string>("");
  const [splitPosition, setSplitPosition] = useState(0.5);
  const [basemap, setBasemap] = useState<BasemapType>("osm");

  const activeMountain = MOUNTAINS.find((m) => m.id === activeMountainId);

  const setActiveMountainId = useCallback((id: string) => {
    setActiveMountainIdState(id);
    // Auto-set activeYear to the latest year of the new mountain
    const mountain = MOUNTAINS.find((m) => m.id === id);
    if (mountain && mountain.years.length > 0) {
      setActiveYearState(mountain.years[mountain.years.length - 1]);
    }
    // If the new mountain has no Gaussian Splat data, fall back to the
    // default terrain+ortho display so the viewer doesn't go blank.
    const hasSplat = !!mountain?.years.some(
      (y) => !!mountain.yearData[y]?.gaussianSplatUrl,
    );
    if (!hasSplat) {
      setLayerVisibility((prev) => ({
        ...prev,
        gaussianSplat: false,
        terrain: prev.terrain || prev.gaussianSplat,
        ortho: prev.ortho || prev.gaussianSplat,
      }));
    }
    // Reset comparison state on mountain change
    setComparisonEnabledState(false);
    setComparisonMode("ortho");
    setComparisonLeftYear("");
    setComparisonRightYear("");
    setSplitPosition(0.5);
  }, []);

  const setActiveYear = useCallback((year: string) => {
    setActiveYearState(year);
  }, []);

  const toggleLayer = useCallback((layer: LayerType) => {
    setLayerVisibility((prev) => {
      const next = { ...prev, [layer]: !prev[layer] };
      // Gaussian Splat is mutually exclusive with terrain and ortho:
      // when splat turns on, hide terrain and ortho; when terrain or ortho
      // turn on while splat is on, hide splat. The user's display-mode
      // sidebar buttons stay in sync with what the viewer actually shows.
      if (layer === "gaussianSplat" && next.gaussianSplat) {
        next.terrain = false;
        next.ortho = false;
      }
      if ((layer === "terrain" || layer === "ortho") && next[layer]) {
        next.gaussianSplat = false;
      }
      return next;
    });
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
        comparisonMode,
        setComparisonMode,
        comparisonLeftYear,
        setComparisonLeftYear,
        comparisonRightYear,
        setComparisonRightYear,
        splitPosition,
        setSplitPosition,
        comparisonLeftYearData,
        comparisonRightYearData,
        basemap,
        setBasemap,
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
