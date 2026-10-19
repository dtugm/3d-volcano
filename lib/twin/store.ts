"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { type Epoch, getVolcano, latestEpoch, type Volcano, VOLCANOES } from "@/lib/catalog";

export type Basemap = "map" | "satellite" | "osm";
export type LayerKey = "terrain" | "hillshade" | "ortho" | "splat" | "lst";
export type CompareMode = "ortho" | "splat";
export type Tool = "none" | "ruler" | "depth";
export type CraterFill = "water" | "lava";

export interface SplatStatus {
  loading: boolean;
  /** 0..1 */
  progress: number;
  /** "unplaced": the tileset carries no georeference (no root transform). */
  error?: "unplaced";
}

export interface Measurement {
  points: [number, number, number][];
  /** 3D distance (ruler) or height difference (depth), metres. */
  value: number | null;
}

interface TwinState {
  volcanoId: string;
  epochCode: string;
  layers: Record<LayerKey, boolean>;
  basemap: Basemap;
  lstOpacity: number;
  lstDate: string;

  compare: { enabled: boolean; mode: CompareMode; left: string; right: string; split: number };

  leftOpen: boolean;
  rightOpen: boolean;

  tool: Tool;
  measurement: Measurement;
  crater: { enabled: boolean; level: number; fill: CraterFill };

  splat: SplatStatus;

  selectVolcano: (id: string) => void;
  selectEpoch: (code: string) => void;
  setLayer: (key: LayerKey, on: boolean) => void;
  setBasemap: (basemap: Basemap) => void;
  setLstOpacity: (v: number) => void;
  setLstDate: (d: string) => void;
  setCompare: (patch: Partial<TwinState["compare"]>) => void;
  setLeftOpen: (open: boolean) => void;
  setRightOpen: (open: boolean) => void;
  setTool: (tool: Tool) => void;
  addMeasurePoint: (p: [number, number, number]) => void;
  clearMeasurement: () => void;
  setCrater: (patch: Partial<TwinState["crater"]>) => void;
  setSplat: (status: SplatStatus) => void;
}

const firstVolcano = VOLCANOES[0];

function defaultsFor(volcano: Volcano) {
  const epochs = volcano.epochs;
  return {
    epochCode: latestEpoch(volcano)?.code ?? "",
    compare: {
      enabled: false,
      mode: "ortho" as CompareMode,
      left: epochs[0]?.code ?? "",
      right: epochs[epochs.length - 1]?.code ?? "",
      split: 0.5,
    },
    crater: {
      enabled: false,
      level: volcano.craterDetails?.floorElevation ?? 0,
      fill: "water" as CraterFill,
    },
    tool: "none" as Tool,
    measurement: { points: [], value: null },
  };
}

export const useTwin = create<TwinState>()(
  persist(
    (set, get) => ({
      volcanoId: firstVolcano.id,
      ...defaultsFor(firstVolcano),
      layers: { terrain: true, hillshade: true, ortho: true, splat: false, lst: false },
      basemap: "satellite",
      lstOpacity: 0.7,
      lstDate: "",
      leftOpen: true,
      rightOpen: true,
      splat: { loading: false, progress: 0 },

      selectVolcano: (id) => {
        const volcano = getVolcano(id);
        if (!volcano || volcano.id === get().volcanoId) return;
        set((s) => ({
          volcanoId: volcano.id,
          ...defaultsFor(volcano),
          lstDate: "",
          layers: { ...s.layers, splat: false },
        }));
      },

      selectEpoch: (code) => {
        const volcano = getVolcano(code.split("-")[0]);
        if (!volcano) return;
        if (volcano.id !== get().volcanoId) get().selectVolcano(volcano.id);
        set({ epochCode: code });
      },

      setLayer: (key, on) =>
        set((s) => {
          const layers = { ...s.layers, [key]: on };
          // Splats replace the ortho drape (they carry their own colour).
          if (key === "splat" && on) layers.ortho = false;
          if (key === "ortho" && on) layers.splat = false;
          return { layers };
        }),

      setBasemap: (basemap) => set({ basemap }),
      setLstOpacity: (lstOpacity) => set({ lstOpacity }),
      setLstDate: (lstDate) => set({ lstDate }),
      setCompare: (patch) => set((s) => ({ compare: { ...s.compare, ...patch } })),
      setLeftOpen: (leftOpen) => set({ leftOpen }),
      setRightOpen: (rightOpen) => set({ rightOpen }),

      setTool: (tool) =>
        set((s) => ({ tool: s.tool === tool ? "none" : tool, measurement: { points: [], value: null } })),

      addMeasurePoint: (p) =>
        set((s) => {
          const points = s.measurement.points.length >= 2 ? [p] : [...s.measurement.points, p];
          let value: number | null = null;
          if (points.length === 2) {
            const [a, b] = points;
            if (s.tool === "depth") {
              value = Math.abs(a[2] - b[2]);
            } else {
              const lat = ((a[1] + b[1]) / 2) * (Math.PI / 180);
              const dx = (b[0] - a[0]) * 111320 * Math.cos(lat);
              const dy = (b[1] - a[1]) * 110540;
              value = Math.hypot(dx, dy, b[2] - a[2]);
            }
          }
          return { measurement: { points, value } };
        }),

      clearMeasurement: () => set({ measurement: { points: [], value: null } }),
      setCrater: (patch) => set((s) => ({ crater: { ...s.crater, ...patch } })),
      setSplat: (splat) => set({ splat }),
    }),
    {
      name: "dt-volcano-twin",
      version: 1,
      // Only preferences persist; the dataset selection comes from the URL.
      partialize: (s) => ({
        layers: s.layers,
        basemap: s.basemap,
        lstOpacity: s.lstOpacity,
        leftOpen: s.leftOpen,
        rightOpen: s.rightOpen,
      }),
    },
  ),
);

export function useActiveVolcano(): Volcano {
  const id = useTwin((s) => s.volcanoId);
  return getVolcano(id) ?? firstVolcano;
}

export function useActiveEpoch(): Epoch | undefined {
  const volcano = useActiveVolcano();
  const code = useTwin((s) => s.epochCode);
  return volcano.epochs.find((e) => e.code === code) ?? latestEpoch(volcano);
}

export function useEpoch(code: string): Epoch | undefined {
  const volcano = useActiveVolcano();
  return volcano.epochs.find((e) => e.code === code);
}
