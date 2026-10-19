"use client";

import { NavigationIcon } from "@/components/icons";
import { DesignIcon } from "@/components/site/DesignIcon";
import { Panel } from "@/components/site/ui";
import { useWeather } from "@/lib/hooks/use-weather";
import { useTranslation } from "@/lib/i18n";
import type { AltitudeLayer } from "@/lib/types/api";

import { PanelError, PanelSkeleton } from "../shared";

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

const WeatherPanel = ({ id }: { id?: string }) => {
  const { t } = useTranslation();
  const { weather, error, isLoading, refresh } = useWeather();

  if (isLoading) {
    return (
      <Panel id={id} title={t.weather.title}>
        <PanelSkeleton rows={4} hero />
      </Panel>
    );
  }

  if (error || !weather) {
    return (
      <Panel id={id} title={t.weather.title}>
        <PanelError message={t.common.error} onRetry={() => refresh()} />
      </Panel>
    );
  }

  // Lowest (near-ground) layer is the headline; the rest are listed by altitude.
  const layers = [...weather.layers].sort((a, b) => a.approxAltitudeM - b.approxAltitudeM);
  const [ground, ...rest] = layers;

  return (
    <Panel id={id} title={t.weather.title}>
      {ground && (
        <div className="mb-3">
          <div className="flex items-center gap-3">
            <span className="text-[44.8px] leading-[58px] font-bold tracking-[-1.73px] text-ink tabular-nums">
              {Math.round(ground.temperature)}°C
            </span>
            <span className="text-[34px] leading-none" aria-hidden>
              {weatherEmoji(ground.weatherCode)}
            </span>
          </div>
          <p className="text-[12px] text-muted tabular-nums">
            {t.common.height} {formatAltitude(ground.approxAltitudeM)} · {ground.pressureHpa} hPa
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <WindReading layer={ground} />
            <HumidityReading layer={ground} label={t.weather.humidity} />
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {rest.map((layer) => (
            <div
              key={layer.pressureHpa}
              className="flex items-center justify-between gap-2 rounded-xl bg-canvas px-3 py-2 text-[13px]"
            >
              <span className="flex w-[64px] shrink-0 items-center gap-1.5">
                <span className="text-[13px] leading-none" aria-hidden>
                  {weatherEmoji(layer.weatherCode)}
                </span>
                <span className="font-semibold text-ink tabular-nums" title={`${layer.pressureHpa} hPa`}>
                  {formatAltitude(layer.approxAltitudeM)}
                </span>
              </span>
              <WindReading layer={layer} compact />
              <HumidityReading layer={layer} label={t.weather.humidity} compact />
              <span className="w-[42px] shrink-0 text-right font-bold text-ink tabular-nums">
                {Math.round(layer.temperature)}°
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
};

function WindReading({ layer, compact }: { layer: AltitudeLayer; compact?: boolean }) {
  return (
    <span
      className="flex items-center gap-1 text-[13px] text-ink-body tabular-nums"
      title={`${degToCompass(layer.windDirection)} (${Math.round(layer.windDirection)}°)`}
    >
      <NavigationIcon
        className="size-[13px] shrink-0 text-brand"
        style={{ transform: `rotate(${layer.windDirection}deg)` }}
      />
      {layer.windSpeed.toFixed(1)}
      <span className="text-muted">m/s</span>
      {compact ? (
        <span className="text-[11.5px] text-muted">{degToCompass(layer.windDirection)}</span>
      ) : (
        <span className="text-[11.5px] text-muted">
          {degToCompass(layer.windDirection)} ({Math.round(layer.windDirection)}°)
        </span>
      )}
    </span>
  );
}

function HumidityReading({ layer, label, compact }: { layer: AltitudeLayer; label: string; compact?: boolean }) {
  return (
    <span className="flex items-center gap-1 text-[13px] text-ink-body tabular-nums" title={label}>
      <DesignIcon name="wxHumidity" size={15} className="text-muted" />
      {!compact && <span className="text-muted">{label}</span>}
      {Math.round(layer.humidity)}%
    </span>
  );
}

export default WeatherPanel;
