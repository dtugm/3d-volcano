"use client";

import { CloudIcon, NavigationIcon, RefreshCwIcon } from "@/components/icons";
import SectionHeader from "@/components/section-header";
import { useWeather } from "@/lib/hooks/use-weather";
import { useTranslation } from "@/lib/i18n";
import type { AltitudeLayer } from "@/lib/types/api";

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

function degToCompass(deg: number): string {
  const index = Math.round(deg / 45) % 8;
  return COMPASS[index];
}

function formatAltitude(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)}km`;
  return `${m}m`;
}

function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code === 1) return "🌤️";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code >= 85 && code <= 86) return "🌨️";
  if (code >= 95) return "⛈️";
  return "☁️";
}

const WeatherPanel = () => {
  const { t } = useTranslation();
  const { weather, error, isLoading, refresh } = useWeather();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SectionHeader
          name={t.weather.title}
          icon={
            <CloudIcon className="w-3.5 h-3.5 text-slate-500 dark:text-[#90A1B9]" />
          }
        />
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 animate-pulse">
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-6 bg-slate-200 dark:bg-slate-700 rounded"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="space-y-3">
        <SectionHeader
          name={t.weather.title}
          icon={
            <CloudIcon className="w-3.5 h-3.5 text-slate-500 dark:text-[#90A1B9]" />
          }
        />
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t.common.error}
          </p>
          <button
            onClick={() => refresh()}
            className="mt-2 flex items-center gap-1 text-xs text-[#4285F4] hover:underline cursor-pointer"
          >
            <RefreshCwIcon className="w-3 h-3" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const layers = [...weather.layers].reverse();

  return (
    <div className="space-y-3">
      <SectionHeader
        name={t.weather.title}
        icon={
          <CloudIcon className="w-3.5 h-3.5 text-slate-500 dark:text-[#90A1B9]" />
        }
      />

      <div className="space-y-2">
        {layers.map((layer) => (
          <LayerCard key={layer.pressureHpa} layer={layer} t={t} />
        ))}
      </div>
    </div>
  );
};

interface LayerCardProps {
  layer: AltitudeLayer;
  t: ReturnType<typeof useTranslation>["t"];
}

const LayerCard: React.FC<LayerCardProps> = ({ layer, t }) => {
  const emoji = weatherEmoji(layer.weatherCode);

  return (
    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
      {/* Row 1: Altitude + weather emoji | Temperature */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm leading-none">{emoji}</span>
          <div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
              {formatAltitude(layer.approxAltitudeM)}
            </span>
            <span className="text-[10px] text-slate-400 ml-1.5 tabular-nums">
              {layer.pressureHpa} hPa
            </span>
          </div>
        </div>
        <div className="text-base font-bold text-slate-800 dark:text-slate-200 tabular-nums">
          {Math.round(layer.temperature)}°C
        </div>
      </div>

      {/* Row 2: Wind + Humidity */}
      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center gap-1">
          <NavigationIcon
            className="w-3 h-3 text-slate-400"
            style={{ transform: `rotate(${layer.windDirection}deg)` }}
          />
          <span className="text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
            {layer.windSpeed.toFixed(1)} m/s
          </span>
          <span className="text-[10px] text-slate-400 tabular-nums">
            {degToCompass(layer.windDirection)} ({Math.round(layer.windDirection)}°)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400">{t.weather.humidity}</span>
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 tabular-nums">
            {Math.round(layer.humidity)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default WeatherPanel;
