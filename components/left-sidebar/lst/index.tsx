"use client";

import React from "react";

import SectionHeader from "@/components/section-header";
import Toggle from "@/components/toggle";
import { useLst } from "@/lib/hooks/use-lst";
import { useTranslation } from "@/lib/i18n";
import { useVolcano } from "@/lib/volcano";

import { ThermometerIcon } from "../../icons";

const ACCENT = "#E8764B";

const LstSection: React.FC = () => {
  const { t } = useTranslation();
  const {
    lstEnabled,
    setLstEnabled,
    lstOpacity,
    setLstOpacity,
    lstDate,
    setLstDate,
  } = useVolcano();
  const { dates, legend, unit, isLoading } = useLst();

  const hasDates = dates.length > 0;

  // The colormap stops are evenly spaced in the source ramp, so a linear
  // gradient across them reproduces the tile colouring.
  const gradient =
    legend.length > 0
      ? `linear-gradient(to right, ${legend.map((stop) => stop.hex).join(", ")})`
      : undefined;

  return (
    <section id="lst" className="flex flex-col gap-2">
      <SectionHeader
        name={t.lst.title}
        icon={<ThermometerIcon className="w-3.5 h-3.5" style={{ color: ACCENT }} />}
      />

      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-3">
        <Toggle
          checked={lstEnabled}
          onChange={setLstEnabled}
          activeColor={ACCENT}
          disabled={!hasDates}
          label={
            <span className="flex items-center gap-2 transition-colors">
              {t.lst.show}
            </span>
          }
        />

        {!hasDates && !isLoading && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {t.lst.noDates}
          </p>
        )}

        {hasDates && (
          <>
            <div>
              <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t.lst.date}
              </label>
              <select
                value={lstDate}
                onChange={(e) => setLstDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-2 py-1.5 mt-1"
              >
                {dates.map((date) => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t.lst.opacity}
                </label>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {Math.round(lstOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={lstOpacity}
                onChange={(e) => setLstOpacity(Number(e.target.value))}
                disabled={!lstEnabled}
                className="w-full mt-1 accent-[#E8764B] disabled:opacity-40"
              />
            </div>

            {gradient && (
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t.lst.legend} ({unit === "Celsius" ? "°C" : unit})
                </div>
                <div
                  className="h-2.5 w-full rounded-full mt-1.5"
                  style={{ background: gradient }}
                />
                <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  <span>{legend[0].temp_c}</span>
                  <span>{legend[legend.length - 1].temp_c}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default LstSection;
