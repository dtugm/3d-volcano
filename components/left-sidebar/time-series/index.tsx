"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

import { useTranslation } from "@/lib/i18n";

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const maxIndex = dates.length - 1;
  const currentDate = dates[currentIndex];

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
    }, 1000);
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
      />
    </div>
  );
};

interface TimeSeriesSectionProps {
  dates: TimeSeriesDate[];
}

const TimeSeriesSection: React.FC<TimeSeriesSectionProps> = ({ dates }) => {
  const { t } = useTranslation();
  const [comparisonEnabled, setComparisonEnabled] = useState(false);

  // Create a stable key based on dates array to reset player state when dates change
  const datesKey = dates.map((d) => d.date).join(",");

  if (dates.length === 0) {
    return null;
  }

  return (
    <section id="time-series" className="flex flex-col gap-2">
      <SectionHeader
        name={t.timeSeries.title}
        icon={<CalendarIcon className="w-3.5 h-3.5 dark:stroke-[#90A1B9]" />}
      />

      <TimeSeriesPlayer key={datesKey} dates={dates} />

      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5">
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
      </div>
    </section>
  );
};

export default TimeSeriesSection;
