"use client";

import { useEffect, useRef, useState } from "react";

import { loadHeightmap } from "../terrain/heightmap-loader";
import type { HeightmapMeta, MaterialProfileId, SimSnapshot } from "../types";

interface UseSimEngineArgs {
  heightmapUrl?: string;
  heightmapMeta?: HeightmapMeta;
  profileId: MaterialProfileId;
  enabled: boolean;
}

export function useSimEngine({
  heightmapUrl,
  heightmapMeta,
  profileId,
  enabled,
}: UseSimEngineArgs) {
  const workerRef = useRef<Worker | null>(null);
  const [ready, setReady] = useState(false);
  const [snapshot, setSnapshot] = useState<SimSnapshot | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!enabled || !heightmapUrl || !heightmapMeta) return;
    let cancelled = false;

    (async () => {
      const grid = await loadHeightmap(
        heightmapUrl,
        heightmapUrl.replace(/heightmap\.png$/, "heightmap.json"),
      );
      if (cancelled) return;
      const w = new Worker(
        new URL("../workers/sim.worker.ts", import.meta.url),
        { type: "module" },
      );
      workerRef.current = w;
      w.onmessage = (e) => {
        if (e.data?.type === "ready") {
          setReady(true);
        } else if (e.data?.type === "snapshot") {
          setSnapshot(e.data.snap as SimSnapshot);
        } else if (e.data?.type === "error") {
          console.error("[lahar:worker]", e.data.message);
        }
      };
      w.onerror = (ev) => console.error("[lahar:worker.onerror]", ev.message);
      w.postMessage(
        {
          type: "init",
          grid: {
            heights: grid.heights.buffer,
            cols: grid.cols,
            rows: grid.rows,
            cellSizeM: grid.cellSizeM,
            bbox: grid.bbox,
          },
          profileId,
        },
        [grid.heights.buffer],
      );
    })().catch((err) => console.error("[useSimEngine] init", err));

    return () => {
      cancelled = true;
      workerRef.current?.terminate();
      workerRef.current = null;
      // Cleanup resets derived state — cleanup callbacks are allowed by
      // react-hooks/set-state-in-effect.
      setReady(false);
      setSnapshot(null);
    };
  }, [enabled, heightmapUrl, heightmapMeta, profileId]);

  // RAF loop drives physics steps off the main thread.
  useEffect(() => {
    if (!running || !ready) return;
    // 2 steps per frame → ~120 physics steps/s at 60 fps, worker off main thread.
    const STEPS_PER_FRAME = 2;
    let raf = 0;
    const tick = () => {
      workerRef.current?.postMessage({ type: "step", count: STEPS_PER_FRAME });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, ready]);

  return {
    ready,
    snapshot,
    running,
    setRunning,
    setSource(r: number, c: number) {
      workerRef.current?.postMessage({ type: "setSource", r, c });
    },
    setProfile(id: MaterialProfileId) {
      workerRef.current?.postMessage({ type: "setProfile", profileId: id });
    },
    setBudget(budgetM3: number | null) {
      workerRef.current?.postMessage({ type: "setBudget", budgetM3 });
    },
    reset() {
      workerRef.current?.postMessage({ type: "reset" });
      setSnapshot(null);
    },
  };
}
