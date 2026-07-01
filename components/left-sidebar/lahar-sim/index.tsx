"use client";

import { useEffect, useMemo } from "react";

import SectionHeader from "@/components/section-header";
import { useLaharData } from "@/lib/lahar/hooks/use-lahar-data";
import { useSimSnapshot } from "@/lib/lahar/snapshot-context";
import { TerrainGrid } from "@/lib/lahar/terrain/grid";
import { useVolcano } from "@/lib/volcano";

import MaterialSelect from "./material-select";
import SimControls from "./sim-controls";
import VolumeTripleInput from "./volume-triple-input";

const MODE_LABELS = { off: "Off", lahar: "Lahar", lava: "Lava" } as const;

export default function LaharSimSection() {
  const {
    simulationMode,
    setSimulationMode,
    materialProfile,
    setMaterialProfile,
    selectedLSP,
    volumeInput,
    setVolumeInput,
    activeYearData,
    simReady,
    simRunning,
    setSimRunning,
    simSetSource,
    simSetBudget,
    simReset,
    simRejection,
  } = useVolcano();

  const simSnapshot = useSimSnapshot();
  const { data: laharData } = useLaharData(activeYearData?.laharData);

  useEffect(() => {
    if (!selectedLSP || !laharData || !simReady) return;
    const grid = new TerrainGrid({
      heights: new Float32Array(
        laharData.heightmapMeta.width * laharData.heightmapMeta.height,
      ),
      cols: laharData.heightmapMeta.width,
      rows: laharData.heightmapMeta.height,
      cellSizeM: laharData.heightmapMeta.cellSizeM,
      bbox: laharData.heightmapMeta.bbox,
    });
    const { r, c } = grid.lngLatToRc(selectedLSP.lng, selectedLSP.lat);
    simSetSource(r, c);
    if (selectedLSP.candidate) setVolumeInput(selectedLSP.candidate.slv);
  }, [selectedLSP, laharData, simReady, simSetSource, setVolumeInput]);

  useEffect(() => {
    if (!simReady) return;
    simSetBudget(volumeInput.likely > 0 ? volumeInput.likely : null);
  }, [simReady, volumeInput.likely, simSetBudget]);

  const stats = useMemo(() => {
    if (!simSnapshot) return null;
    return {
      maxDepth: simSnapshot.maxDepth,
      wettedCells: simSnapshot.wettedCells,
      timeS: simSnapshot.timeS,
      injectedM3: simSnapshot.injectedM3,
      budgetM3: simSnapshot.budgetM3,
      injecting: simSnapshot.injecting,
    };
  }, [simSnapshot]);

  if (!activeYearData?.laharData) return null;

  return (
    <div>
      <SectionHeader name="Lahar / Lava Simulation" />
      <div className="flex flex-col gap-3 mt-2">
        <div className="flex gap-1 text-xs">
          {(["off", "lahar", "lava"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setSimulationMode(m)}
              className={`flex-1 rounded-lg px-2 py-1.5 font-medium transition-colors ${
                simulationMode === m
                  ? "bg-orange-600 text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        {simulationMode !== "off" && (
          <>
            {!simReady ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Loading terrain…
              </div>
            ) : (
              <>
                <MaterialSelect
                  kind={simulationMode === "lava" ? "lava" : "lahar"}
                  value={materialProfile}
                  onChange={setMaterialProfile}
                />
                <VolumeTripleInput value={volumeInput} onChange={setVolumeInput} />
                {!selectedLSP && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2 py-1.5">
                    Click on a stream to set the starting point
                  </p>
                )}
                {simRejection && (
                  <p className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 rounded-lg px-2 py-1.5">
                    <span className="font-semibold">Click rejected: </span>
                    {simRejection === "outside_stream"
                      ? "Too far from a mainstem (>80 m). Click closer to a cyan line."
                      : simRejection === "below_hazard_cone"
                      ? "Outside hazard cone. Click higher up the mountain."
                      : simRejection === "not_in_deposition"
                      ? "Outside deposition zone."
                      : "No LSP candidate within 150 m. Try clicking a yellow dot."}
                  </p>
                )}
                <SimControls
                  running={simRunning}
                  ready={!!selectedLSP}
                  onPlay={() => setSimRunning(true)}
                  onPause={() => setSimRunning(false)}
                  onReset={simReset}
                  stats={stats}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
