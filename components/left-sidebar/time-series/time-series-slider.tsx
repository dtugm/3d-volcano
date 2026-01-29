"use client";

import React from "react";

interface TimeSeriesSliderProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
}

const TimeSeriesSlider: React.FC<TimeSeriesSliderProps> = ({
  value,
  max,
  onChange,
}) => {
  const dots = Array.from({ length: max + 1 }, (_, i) => i);

  return (
    <div className="relative mb-3">
      <input
        type="range"
        min="0"
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#4285F4] [&::-webkit-slider-thumb]:shadow-md"
      />
      <div className="flex justify-between mt-2">
        {dots.map((index) => (
          <div
            key={index}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              index === value
                ? "bg-[#4285F4] scale-150"
                : "bg-slate-300 dark:bg-slate-600"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default TimeSeriesSlider;
