"use client";

import React from "react";

import {
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from "../../icons";

interface TimeSeriesControlsProps {
  isPlaying: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  playLabel: string;
  pauseLabel: string;
  onPlayPause: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
}

const TimeSeriesControls: React.FC<TimeSeriesControlsProps> = ({
  isPlaying,
  canGoBack,
  canGoForward,
  playLabel,
  pauseLabel,
  onPlayPause,
  onSkipBack,
  onSkipForward,
}) => {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onSkipBack}
        disabled={!canGoBack}
        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <SkipBackIcon className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onPlayPause}
        className="flex-1 p-2 rounded-lg bg-[#4285F4] hover:bg-[#3b78e7] transition-all flex items-center justify-center gap-2 text-white"
      >
        {isPlaying ? (
          <>
            <PauseIcon className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{pauseLabel}</span>
          </>
        ) : (
          <>
            <PlayIcon className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{playLabel}</span>
          </>
        )}
      </button>
      <button
        onClick={onSkipForward}
        disabled={!canGoForward}
        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <SkipForwardIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default TimeSeriesControls;
