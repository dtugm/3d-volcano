"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

import { useTranslation } from "@/lib/i18n";
import { ComparisonMode, useVolcano } from "@/lib/volcano";

import { CalendarIcon, GitCompareIcon } from "../../icons";
import SectionHeader from "../../section-header";
import Toggle from "../../toggle";
import TimeSeriesControls from "./time-series-controls";
import TimeSeriesSlider from "./time-series-slider";

interface TimeSeriesDate {
  date: string;
  label: string;
}

interface TimeSeriesPlayerProps {
  dates: TimeSeriesDate[];
}

const TimeSeriesPlayer: React.FC<TimeSeriesPlayerProps> = ({ dates }) => {
  const { t } = useTranslation();
  const { setActiveYear } = useVolcano();
  const [currentIndex, setCurrentIndex] = useState(dates.length - 1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(3);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const maxIndex = dates.length - 1;
  const currentDate = dates[currentIndex];

  // Sync active year in context whenever currentIndex changes
  useEffect(() => {
    if (dates[currentIndex]) {
      setActiveYear(dates[currentIndex].date);
    }
  }, [currentIndex, dates, setActiveYear]);
  useEffect(() => {
    if (!isPlaying) return;

    const countdown = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) return 3;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [isPlaying]);
  const stopPlayback = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    setIsPlaying(true);
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= maxIndex) {
          stopPlayback();
          return prev;
        }
        return prev + 1;
      });
    }, 3000);
  }, [maxIndex, stopPlayback]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
    } else {
      if (currentIndex >= maxIndex) {
        setCurrentIndex(0);
      }
      startPlayback();
    }
  }, [isPlaying, currentIndex, maxIndex, startPlayback, stopPlayback]);

  const handleSkipBack = useCallback(() => {
    stopPlayback();
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, [stopPlayback]);

  const handleSkipForward = useCallback(() => {
    stopPlayback();
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  }, [maxIndex, stopPlayback]);

  const handleSliderChange = useCallback(
    (value: number) => {
      stopPlayback();
      setCurrentIndex(value);
    },
    [stopPlayback],
  );

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {t.timeSeries.current}
        </span>
        <span className="text-xs font-mono bg-[#F4B942] text-slate-900 px-2 py-0.5 rounded-md font-medium">
          {currentDate?.label ?? currentDate?.date}
        </span>
      </div>

      <TimeSeriesSlider
        value={currentIndex}
        max={maxIndex}
        onChange={handleSliderChange}
      />

      <TimeSeriesControls
        isPlaying={isPlaying}
        canGoBack={currentIndex > 0}
        canGoForward={currentIndex < maxIndex}
        playLabel={t.timeSeries.play}
        pauseLabel={t.timeSeries.pause}
        onPlayPause={handlePlayPause}
        onSkipBack={handleSkipBack}
        onSkipForward={handleSkipForward}
        remainingSeconds={remainingSeconds}
      />
    </div>
  );
};

interface TimeSeriesSectionProps {
  dates: TimeSeriesDate[];
}

const TimeSeriesSection: React.FC<TimeSeriesSectionProps> = ({ dates }) => {
  const { t } = useTranslation();
  const {
    activeMountain,
    comparisonEnabled,
    setComparisonEnabled,
    comparisonLeftYear,
    setComparisonLeftYear,
    comparisonRightYear,
    setComparisonRightYear,
    comparisonMode,
    setComparisonMode,
  } = useVolcano();

  // Create a stable key based on dates array to reset player state when dates change
  const datesKey = dates.map((d) => d.date).join(",");

  if (dates.length === 0) {
    return null;
  }

  const years = activeMountain?.years ?? [];

  return (
    <section id="time-series" className="flex flex-col gap-2">
      <SectionHeader
        name={t.timeSeries.title}
        icon={<CalendarIcon className="w-3.5 h-3.5 dark:stroke-[#90A1B9]" />}
      />

      {!comparisonEnabled && <TimeSeriesPlayer key={datesKey} dates={dates} />}

      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 flex flex-col gap-3">
        <Toggle
          checked={comparisonEnabled}
          onChange={setComparisonEnabled}
          label={
            <span className="flex items-center gap-2">
              <GitCompareIcon className="w-3.5 h-3.5" />
              {t.timeSeries.comparison}
            </span>
          }
        />

        {comparisonEnabled && (
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
            {(["ortho", "terrain"] as ComparisonMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setComparisonMode(mode)}
                className={`flex-1 text-xs py-1.5 px-3 font-medium transition-colors ${
                  comparisonMode === mode
                    ? "bg-[#F4B942] text-slate-900"
                    : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"
                }`}
              >
                {t.timeSeries.comparisonModes[mode]}
              </button>
            ))}
          </div>
        )}

        {comparisonEnabled && (
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">
                {t.timeSeries.leftYear}
              </span>
              <select
                value={comparisonLeftYear}
                onChange={(e) => setComparisonLeftYear(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-2 py-1.5"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">
                {t.timeSeries.rightYear}
              </span>
              <select
                value={comparisonRightYear}
                onChange={(e) => setComparisonRightYear(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-2 py-1.5"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>
    </section>
  );
};

export default TimeSeriesSection;
