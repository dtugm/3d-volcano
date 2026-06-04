"use client";

import React, { useMemo } from "react";

import { useTranslation } from "@/lib/i18n";
import { useVolcano } from "@/lib/volcano";

import { CalculatorIcon, RulerIcon } from "../../icons";
import DimensionValue from "./dimension-value";

const DimensionSection: React.FC = () => {
  const { locale, t } = useTranslation();
  const {
    activeMountain,
    activeMeasurementMode,
    setActiveMeasurementMode,
    measuredData,
    setMeasuredData,
    isSimulatingVolume,
    setIsSimulatingVolume,
    simulationWaterLevel,
    setSimulationWaterLevel,
    simulationType,
    setSimulationType,
  } = useVolcano();

  const crater = activeMountain?.craterDetails;

  // Formatter for localized numbers
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US").format(num);
  };

  // Calculate dynamic volume and fill percentage based on frustum geometry
  const simData = useMemo(() => {
    if (!crater) return { volume: 0, percent: 0 };
    const { floorElevation, rimElevation, minRadius, maxRadius, baseVolume } = crater;

    const h = Math.max(0, simulationWaterLevel - floorElevation);
    const totalH = rimElevation - floorElevation;
    const fraction = totalH > 0 ? h / totalH : 0;

    // Radius interpolates between floor (minRadius) and rim (maxRadius)
    const currentRadius = minRadius + fraction * (maxRadius - minRadius);

    // Frustum volume: (pi * h / 3) * (R1^2 + R2^2 + R1*R2)
    const volume = (Math.PI * h / 3) * (minRadius * minRadius + currentRadius * currentRadius + minRadius * currentRadius);

    // Parse baseVolume capacity string (e.g. "42.500.000 m³" -> 42500000)
    const numericBaseVolume = parseFloat(baseVolume.replace(/[^0-9]/g, "")) || 40000000;
    const percent = Math.min(100, Math.round((volume / numericBaseVolume) * 100));

    return {
      volume: Math.round(volume),
      percent,
    };
  }, [crater, simulationWaterLevel]);

  const handleClear = () => {
    setActiveMeasurementMode("none");
    setMeasuredData({
      diameter: null,
      depth: null,
      volumeDelta: null,
    });
  };

  if (!activeMountain) return null;

  return (
    <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-4 shadow-sm transition-all duration-300">
      {/* Title */}
      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
        <RulerIcon className="w-3.5 h-3.5 text-[#52A869]" />
        {t.dimension.title} - {activeMountain.name}
      </h3>

      {/* SECTION 1: Geological Baseline Data */}
      {crater && (
        <div className="bg-white dark:bg-slate-900/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            {/* Custom Mountain SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 text-[#52A869]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
            </svg>
            {locale === "id" ? "Informasi Geologi Kawah" : "Crater Geological Data"}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex flex-col p-1.5 bg-slate-50/50 dark:bg-slate-800/20 rounded-md">
              <span className="text-[10px] text-slate-400">{locale === "id" ? "Tipe Vulkanik" : "Volcanic Type"}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">{crater.geologyType}</span>
            </div>
            <div className="flex flex-col p-1.5 bg-slate-50/50 dark:bg-slate-800/20 rounded-md">
              <span className="text-[10px] text-slate-400">{locale === "id" ? "Ketinggian Puncak" : "Summit Height"}</span>
              <span className="font-semibold text-[#52A869]">{formatNumber(activeMountain.elevation)} m</span>
            </div>
            <div className="flex flex-col p-1.5 bg-slate-50/50 dark:bg-slate-800/20 rounded-md">
              <span className="text-[10px] text-slate-400">{locale === "id" ? "Diameter Kawah" : "Rim Diameter"}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{crater.baseDiameter}</span>
            </div>
            <div className="flex flex-col p-1.5 bg-slate-50/50 dark:bg-slate-800/20 rounded-md">
              <span className="text-[10px] text-slate-400">{locale === "id" ? "Kedalaman Kawah" : "Rim Depth"}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{crater.baseDepth}</span>
            </div>
            <div className="col-span-2 flex flex-col p-1.5 bg-slate-50/50 dark:bg-slate-800/20 rounded-md">
              <span className="text-[10px] text-slate-400">{locale === "id" ? "Kapasitas Tampungan" : "Crater Capacity"}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{crater.baseVolume}</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Interactive 3D Tools */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          {/* Custom Measure SVG */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 text-[#52A869]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
          </svg>
          {locale === "id" ? "Pengukuran 3D Interaktif" : "Interactive 3D Measurements"}
        </div>

        {/* Instructions */}
        <p className="text-[10px] text-slate-400 leading-normal bg-slate-100/50 dark:bg-slate-800/40 p-2 rounded-lg">
          {activeMeasurementMode === "none"
            ? (locale === "id" ? "Pilih alat di bawah untuk mulai mengukur di viewer 3D." : "Select a tool below to start measuring in the 3D viewer.")
            : (locale === "id" ? "Klik pada viewer 3D untuk menentukan Titik A dan Titik B." : "Click on the 3D viewer to place Point A and Point B.")}
        </p>

        {/* Tool Selector Toggles */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveMeasurementMode(activeMeasurementMode === "ruler" ? "none" : "ruler")}
            className={`p-2 rounded-lg border text-xs font-medium transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
              activeMeasurementMode === "ruler"
                ? "bg-[#52A869]/10 border-[#52A869] text-[#52A869] dark:bg-[#52A869]/20"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-1.5">
              {activeMeasurementMode === "ruler" && <span className="w-1.5 h-1.5 rounded-full bg-[#52A869] animate-pulse" />}
              <span>{locale === "id" ? "Ruler Diameter" : "Ruler Diameter"}</span>
            </div>
            <span className="text-[9px] opacity-75">{locale === "id" ? "Diameter Kawah" : "Crater Diameter"}</span>
          </button>

          <button
            onClick={() => setActiveMeasurementMode(activeMeasurementMode === "depth" ? "none" : "depth")}
            className={`p-2 rounded-lg border text-xs font-medium transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
              activeMeasurementMode === "depth"
                ? "bg-[#52A869]/10 border-[#52A869] text-[#52A869] dark:bg-[#52A869]/20"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-1.5">
              {activeMeasurementMode === "depth" && <span className="w-1.5 h-1.5 rounded-full bg-[#52A869] animate-pulse" />}
              <span>{locale === "id" ? "Profil Kedalaman" : "Depth Profiler"}</span>
            </div>
            <span className="text-[9px] opacity-75">{locale === "id" ? "Selisih Tinggi" : "Height Difference"}</span>
          </button>
        </div>

        {/* Live Measurement Results Cards */}
        <div className="space-y-2 pt-1">
          <DimensionValue
            label={t.dimension.diameter}
            value={measuredData.diameter ? `${formatNumber(measuredData.diameter)} m` : "--"}
          />
          <DimensionValue
            label={t.dimension.depth}
            value={measuredData.depth ? `${formatNumber(measuredData.depth)} m` : "--"}
          />
        </div>

        {/* Clear Button */}
        {(measuredData.diameter !== null || measuredData.depth !== null || activeMeasurementMode !== "none") && (
          <button
            onClick={handleClear}
            className="w-full text-[10px] font-medium text-slate-400 hover:text-red-500 transition-colors py-1 flex items-center justify-center gap-1 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            {locale === "id" ? "Hapus Pengukuran" : "Clear Measurements"}
          </button>
        )}
      </div>

      {/* SECTION 3: Dynamic Volume Simulation */}
      {crater && (
        <div className="bg-white dark:bg-slate-900/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 text-[#52A869]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" />
              </svg>
              {locale === "id" ? "Simulasi Volume Kawah" : "Crater Volume Simulation"}
            </div>

            {/* Toggle Switch */}
            <button
              onClick={() => setIsSimulatingVolume(!isSimulatingVolume)}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                isSimulatingVolume ? "bg-[#52A869]" : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                isSimulatingVolume ? "translate-x-4" : "translate-x-0"
              }`} />
            </button>
          </div>

          {isSimulatingVolume && (
            <div className="space-y-3 animate-fade-in">
              {/* Type Switch: Water or Lava */}
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                  onClick={() => setSimulationType("water")}
                  className={`text-[10px] font-semibold py-1 rounded-md transition-all cursor-pointer ${
                    simulationType === "water"
                      ? "bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  {locale === "id" ? "Air Danau" : "Crater Lake"}
                </button>
                <button
                  onClick={() => setSimulationType("lava")}
                  className={`text-[10px] font-semibold py-1 rounded-md transition-all cursor-pointer ${
                    simulationType === "lava"
                      ? "bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  {locale === "id" ? "Kubah Lava" : "Lava Dome"}
                </button>
              </div>

              {/* Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>{locale === "id" ? "Tinggi" : "Height"}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {formatNumber(Math.round(simulationWaterLevel))} m
                  </span>
                </div>
                <input
                  type="range"
                  min={crater.floorElevation}
                  max={crater.rimElevation}
                  value={simulationWaterLevel}
                  onChange={(e) => setSimulationWaterLevel(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#52A869]"
                />
                <div className="flex justify-between text-[8px] text-slate-400">
                  <span>{formatNumber(crater.floorElevation)} m</span>
                  <span>{formatNumber(crater.rimElevation)} m</span>
                </div>
              </div>

              {/* Stats Output */}
              <div className="bg-slate-50 dark:bg-slate-850 p-2 rounded-lg border border-slate-100 dark:border-slate-800/40 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">{locale === "id" ? "Simulasi Volume" : "Simulated Volume"}</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{formatNumber(simData.volume)} m³</span>
                </div>

                {/* Fill Percentage indicator */}
                <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800/40 mt-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">{locale === "id" ? "Kapasitas Tampung" : "Capacity Filled"}</span>
                    <span className={`font-bold ${simulationType === "water" ? "text-cyan-600" : "text-orange-600"}`}>{simData.percent}%</span>
                  </div>

                  {/* Aesthetic progress bar matching theme colors */}
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-850 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        simulationType === "water" ? "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" : "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                      }`}
                      style={{ width: `${simData.percent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DimensionSection;
