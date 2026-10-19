"use client";

import { create } from "zustand";

import type { LaharzMessage, LaharzRequest, LaharzResponse } from "./laharz.worker";
import type { ConfidenceLimit } from "./laharz-areas";

export type SimKind = "lahar" | "crater";

export const SIM_ACCENTS: Record<SimKind, string> = {
  lahar: "#c2410c",
  crater: "#0891b2",
};

/** DEM grid resolutions offered in the card (Web Mercator zoom). */
export const LAHAR_RESOLUTIONS = { coarse: 13, fine: 14 } as const;
export type LaharResolution = keyof typeof LAHAR_RESOLUTIONS;

/**
 * Primary: a lahar from a picked point and volume. Secondary: lahars that
 * remobilise the deposits between two epochs (pearpy starting points).
 */
export type LaharMode = "primary" | "secondary";

export interface LaharParams {
  mode: LaharMode;
  start: [number, number] | null;
  /** m³ */
  volume: number;
  confidence: ConfidenceLimit;
  resolution: LaharResolution;
  /** Secondary: epoch codes of the earlier and later surveys. */
  earlier: string | null;
  later: string | null;
  /** Secondary: share of each stem searched for a start, from its head (%). */
  maxPercentLength: number;
  /** Secondary: half-width of the stem corridor feeding the lahar (m). */
  bufferM: number;
  /** Secondary: smallest elevation change counted as deposit (m). */
  lodM: number;
}

/** Dataset the secondary analysis reads, resolved by the caller. */
export interface SecondaryEpochs {
  earlierBase: string;
  laterBase: string;
}

interface SimState {
  card: SimKind | null;
  picking: boolean;
  lahar: LaharParams;
  status: "idle" | "computing" | "done" | "error";
  error: string | null;
  result: LaharzResponse | null;
  /** 0 → 1 while the inundation front is animated. */
  progress: number;

  openCard: (card: SimKind | null) => void;
  setPicking: (picking: boolean) => void;
  pick: (point: [number, number]) => void;
  clearStart: () => void;
  setLahar: (patch: Partial<LaharParams>) => void;
  run: (
    dtmBase: string,
    center: [number, number],
    heightOffset: number,
    secondary?: SecondaryEpochs,
  ) => Promise<void>;
  reset: () => void;
}

const ANIMATION_MS = 6000;
/** pearpy defaults. */
const STREAM_CELLS = 250;
/** Simulated secondary sources (largest first); the rest are listed. */
const MAX_SOURCES = 12;
const MIN_SOURCE_VOLUME = 1000;

let worker: Worker | null = null;
let requestId = 0;
let runToken = 0;

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./laharz.worker.ts", import.meta.url), { type: "module" });
  }
  return worker;
}

type Unsent<T> = T extends unknown ? Omit<T, "id"> : never;

function simulate(request: Unsent<LaharzRequest>): Promise<LaharzResponse> {
  const id = ++requestId;
  const w = getWorker();
  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<LaharzMessage>) => {
      if (event.data.id !== id) return;
      w.removeEventListener("message", onMessage);
      if ("error" in event.data) reject(new Error(event.data.error));
      else resolve(event.data);
    };
    w.addEventListener("message", onMessage);
    w.postMessage({ ...request, id } as LaharzRequest);
  });
}

export const useSim = create<SimState>()((set, get) => ({
  card: null,
  picking: false,
  lahar: {
    mode: "primary",
    start: null,
    volume: 2_000_000,
    confidence: 95,
    resolution: "coarse",
    earlier: null,
    later: null,
    maxPercentLength: 75,
    bufferM: 20,
    lodM: 1,
  },
  status: "idle",
  error: null,
  result: null,
  progress: 0,

  openCard: (card) => set(card ? { card } : { card, picking: false }),
  setPicking: (picking) => set({ picking }),
  pick: (point) => set((s) => ({ picking: false, lahar: { ...s.lahar, start: point } })),
  clearStart: () => {
    runToken++;
    set((s) => ({
      picking: false,
      lahar: { ...s.lahar, start: null },
      // The shown inundation belongs to the removed point.
      ...(s.lahar.mode === "primary" ? { status: "idle" as const, error: null, result: null, progress: 0 } : {}),
    }));
  },
  setLahar: (patch) => set((s) => ({ lahar: { ...s.lahar, ...patch } })),

  run: async (dtmBase, center, heightOffset, secondary) => {
    const { lahar } = get();
    if (lahar.mode === "primary" && !lahar.start) return;
    if (lahar.mode === "secondary" && !secondary) return;
    const token = ++runToken;
    set({ status: "computing", error: null, result: null, progress: 0, picking: false });
    const common = {
      heightOffset,
      center,
      zoom: LAHAR_RESOLUTIONS[lahar.resolution],
      confidence: lahar.confidence,
    };
    try {
      const result = await simulate(
        lahar.mode === "secondary"
          ? {
              ...common,
              kind: "secondary",
              dtmBase: secondary!.laterBase,
              earlierBase: secondary!.earlierBase,
              radiusKm: lahar.resolution === "fine" ? 9 : 14,
              streamCells: STREAM_CELLS,
              maxPercentLength: lahar.maxPercentLength,
              bufferM: lahar.bufferM,
              maxSources: MAX_SOURCES,
              minVolume: MIN_SOURCE_VOLUME,
              lodM: lahar.lodM,
            }
          : {
              ...common,
              kind: "primary",
              dtmBase,
              // Larger lahars run further: grow the analysis window with the
              // volume (hydrology cost grows with its area, so cap it).
              radiusKm: Math.min(
                lahar.resolution === "fine" ? 10 : 18,
                8 + 3 * Math.max(0, Math.log10(lahar.volume / 1e5)),
              ),
              start: lahar.start!,
              volume: lahar.volume,
              snapCells: lahar.resolution === "fine" ? 12 : 6,
            },
      );
      if (token !== runToken) return;
      set({ status: "done", result, progress: 0 });
      // Reveal the inundation in march order.
      const startedAt = performance.now();
      const step = (now: number) => {
        if (token !== runToken) return;
        const progress = Math.min((now - startedAt) / ANIMATION_MS, 1);
        set({ progress });
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    } catch (err) {
      if (token !== runToken) return;
      set({ status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  },

  reset: () => {
    runToken++;
    set({ status: "idle", error: null, result: null, progress: 0 });
  },
}));
