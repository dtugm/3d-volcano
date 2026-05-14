"use client";

import { useEffect, useMemo } from "react";

import SectionHeader from "@/components/section-header";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useLaharData } from "@/lib/lahar/hooks/use-lahar-data";
import { TerrainGrid } from "@/lib/lahar/terrain/grid";
import { useVolcano } from "@/lib/volcano";

import MaterialSelect from "./material-select";
import SimControls from "./sim-controls";
import VolumeTripleInput from "./volume-triple-input";

export default function LaharSimSection() {
  const { t } = useTranslation();
  const {
    simulationMode,
    setSimulationMode,
    materialProfile,
    setMaterialProfile,
    selectedLSP,
    volumeInput,
    setVolumeInput,
    activeYearData,
    simSnapshot,
    simReady,
    simRunning,
    setSimRunning,
    simSetSource,
    simReset,
  } = useVolcano();

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

  const stats = useMemo(() => {
    if (!simSnapshot) return null;
    return {
      maxDepth: simSnapshot.maxDepth,
      wettedCells: simSnapshot.wettedCells,
      timeS: simSnapshot.timeS,
    };
  }, [simSnapshot]);

  if (!activeYearData?.laharData) return null;

  return (
    <div>
      <SectionHeader name={t.simulation.title} />
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
              {t.simulation.mode[m]}
            </button>
          ))}
        </div>

        {simulationMode !== "off" ? (
          <>
            <MaterialSelect
              kind={simulationMode === "lava" ? "lava" : "lahar"}
              value={materialProfile}
              onChange={setMaterialProfile}
            />
            <VolumeTripleInput value={volumeInput} onChange={setVolumeInput} />
            {!selectedLSP ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2 py-1.5">
                {t.simulation.promptClick}
              </p>
            ) : null}
            <SimControls
              running={simRunning}
              onPlay={() => setSimRunning(true)}
              onPause={() => setSimRunning(false)}
              onReset={simReset}
              stats={stats}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
