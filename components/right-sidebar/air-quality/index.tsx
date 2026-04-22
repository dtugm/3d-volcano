"use client";

import { AirVentIcon, RefreshCwIcon } from "@/components/icons";
import SectionHeader from "@/components/section-header";
import { useTranslation } from "@/lib/i18n";
import { useAirQuality } from "@/lib/hooks/use-air-quality";

type AqLevel = "safe" | "moderate" | "unhealthy";

const AQ_COLORS: Record<AqLevel, string> = {
  safe: "#52A869",
  moderate: "#F4B942",
  unhealthy: "#E8764B",
};

const AQI_COLORS: Record<number, string> = {
  1: "#52A869",
  2: "#7AC4A8",
  3: "#F4B942",
  4: "#E8764B",
  5: "#E07B91",
};

function getSo2Level(value: number): AqLevel {
  // µg/m³ — WHO: 40 (24h safe), 125 (moderate)
  if (value <= 40) return "safe";
  if (value <= 125) return "moderate";
  return "unhealthy";
}

function getPm25Level(value: number): AqLevel {
  // µg/m³ — WHO: 15 (24h safe), 50 (moderate)
  if (value <= 25) return "safe";
  if (value <= 50) return "moderate";
  return "unhealthy";
}

function getPm10Level(value: number): AqLevel {
  // µg/m³ — WHO: 45 (24h safe), 100 (moderate)
  if (value <= 45) return "safe";
  if (value <= 100) return "moderate";
  return "unhealthy";
}

const AirQualityPanel = () => {
  const { t } = useTranslation();
  const { airQuality, error, isLoading, refresh } = useAirQuality();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SectionHeader
          name={t.airQuality.title}
          icon={
            <AirVentIcon className="w-3.5 h-3.5 text-slate-500 dark:text-[#90A1B9]" />
          }
        />
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 animate-pulse">
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
          <div className="grid grid-cols-3 gap-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-14 bg-slate-200 dark:bg-slate-700 rounded"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !airQuality) {
    return (
      <div className="space-y-3">
        <SectionHeader
          name={t.airQuality.title}
          icon={
            <AirVentIcon className="w-3.5 h-3.5 text-slate-500 dark:text-[#90A1B9]" />
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

  const aqiColor = AQI_COLORS[airQuality.aqi] || "#52A869";

  return (
    <div className="space-y-3">
      <SectionHeader
        name={t.airQuality.title}
        icon={
          <AirVentIcon className="w-3.5 h-3.5 text-slate-500 dark:text-[#90A1B9]" />
        }
      />

      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5">
        {/* AQI header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
              AQI
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-2xl font-bold"
                style={{ color: aqiColor }}
              >
                {airQuality.aqi}
              </span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${aqiColor}1A`,
                  color: aqiColor,
                }}
              >
                {airQuality.aqiLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Key pollutants grid */}
        <div className="grid grid-cols-3 gap-2">
          <PollutantBadge
            label={t.airQuality.so2}
            value={airQuality.so2}
            unit="µg/m³"
            level={getSo2Level(airQuality.so2)}
            levelLabel={t.airQuality}
          />
          <PollutantBadge
            label={t.airQuality.pm25}
            value={airQuality.pm25}
            unit="µg/m³"
            level={getPm25Level(airQuality.pm25)}
            levelLabel={t.airQuality}
          />
          <PollutantBadge
            label={t.airQuality.pm10}
            value={airQuality.pm10}
            unit="µg/m³"
            level={getPm10Level(airQuality.pm10)}
            levelLabel={t.airQuality}
          />
        </div>
      </div>
    </div>
  );
};

interface PollutantBadgeProps {
  label: string;
  value: number;
  unit: string;
  level: AqLevel;
  levelLabel: { safe: string; moderate: string; unhealthy: string };
}

function formatValue(value: number): string {
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

const PollutantBadge: React.FC<PollutantBadgeProps> = ({
  label,
  value,
  unit,
  level,
  levelLabel,
}) => {
  const color = AQ_COLORS[level];

  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 min-w-0">
      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
        {formatValue(value)}
      </div>
      <div className="text-[10px] text-slate-400">{unit}</div>
      <span className="text-[10px] font-medium" style={{ color }}>
        {levelLabel[level]}
      </span>
    </div>
  );
};

export default AirQualityPanel;
