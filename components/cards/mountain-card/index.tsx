"use client";

import React from "react";

import { useTranslation } from "@/lib/i18n";

import { MapPinIcon } from "../../icons";

interface MountainCardProps {
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  series: number;
  isActive?: boolean;
  onClick?: () => void;
}

const MountainCard: React.FC<MountainCardProps> = ({
  name,
  latitude,
  longitude,
  elevation,
  series,
  isActive = false,
  onClick,
}) => {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-3.5 rounded-xl border text-left
        transition-all duration-300 ease-out
        ${
          isActive
            ? "bg-[#4285F4] border-[#4285F4] text-white shadow-lg shadow-blue-500/20 scale-[1.02]"
            : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-900 dark:text-slate-100 hover:scale-[1.01]"
        }
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-semibold text-sm">{name}</h4>
          <div
            className={`
              flex items-center gap-1 text-xs mt-1
              transition-colors duration-300
              ${isActive ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}
            `}
          >
            <MapPinIcon />
            <span>
              {latitude.toFixed(2)}°, {longitude.toFixed(2)}°
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2.5">
        <div
          className={`
            rounded-lg p-2
            transition-colors duration-300
            ${isActive ? "bg-white/10" : "bg-slate-100 dark:bg-slate-700/50"}
          `}
        >
          <div
            className={`
              text-xs transition-colors duration-300
              ${isActive ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}
            `}
          >
            {t.mountainCard.elevation}
          </div>
          <div className="text-sm font-semibold">{elevation}m</div>
        </div>

        <div
          className={`
            rounded-lg p-2
            transition-colors duration-300
            ${isActive ? "bg-white/10" : "bg-slate-100 dark:bg-slate-700/50"}
          `}
        >
          <div
            className={`
              text-xs transition-colors duration-300
              ${isActive ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}
            `}
          >
            {t.mountainCard.series}
          </div>
          <div className="text-sm font-semibold">{series}</div>
        </div>
      </div>
    </button>
  );
};

export default MountainCard;
