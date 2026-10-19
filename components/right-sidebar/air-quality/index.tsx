"use client";

import { Panel, Pill } from "@/components/site/ui";
import { cn } from "@/lib/cn";
import { useAirQuality } from "@/lib/hooks/use-air-quality";
import { useTranslation } from "@/lib/i18n";

import { PanelError, PanelSkeleton } from "../shared";

type AqLevel = "safe" | "moderate" | "unhealthy";

const LEVEL_TEXT: Record<AqLevel, string> = {
  safe: "text-ok",
  moderate: "text-amber",
  unhealthy: "text-[#e5484d]",
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

/** AQI index (1–5) → overall level for colour + pill tone. */
function aqiLevel(aqi: number): AqLevel {
  if (aqi <= 2) return "safe";
  if (aqi === 3) return "moderate";
  return "unhealthy";
}

function formatValue(value: number): string {
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

const AirQualityPanel = ({ id }: { id?: string }) => {
  const { t } = useTranslation();
  const { airQuality, error, isLoading, refresh } = useAirQuality();

  if (isLoading) {
    return (
      <Panel id={id} title={t.airQuality.title}>
        <PanelSkeleton rows={3} hero />
      </Panel>
    );
  }

  if (error || !airQuality) {
    return (
      <Panel id={id} title={t.airQuality.title}>
        <PanelError message={t.common.error} onRetry={() => refresh()} />
      </Panel>
    );
  }

  const level = aqiLevel(airQuality.aqi);
  const tone = level === "safe" ? "ok" : "amber";

  return (
    <Panel id={id} title={t.airQuality.title} aside={<Pill tone={tone}>{airQuality.aqiLabel}</Pill>}>
      <div className="mb-3 flex items-baseline gap-2">
        <span className={cn("text-[30px] leading-none font-bold tabular-nums", LEVEL_TEXT[level])}>
          {airQuality.aqi}
        </span>
        <span className="text-[12px] text-muted">AQI · 1–5</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <PollutantRow
          label={t.airQuality.so2}
          value={airQuality.so2}
          level={getSo2Level(airQuality.so2)}
          levelLabel={t.airQuality}
        />
        <PollutantRow
          label={t.airQuality.pm25}
          value={airQuality.pm25}
          level={getPm25Level(airQuality.pm25)}
          levelLabel={t.airQuality}
        />
        <PollutantRow
          label={t.airQuality.pm10}
          value={airQuality.pm10}
          level={getPm10Level(airQuality.pm10)}
          levelLabel={t.airQuality}
        />
      </div>
    </Panel>
  );
};

function PollutantRow({
  label,
  value,
  level,
  levelLabel,
}: {
  label: string;
  value: number;
  level: AqLevel;
  levelLabel: { safe: string; moderate: string; unhealthy: string };
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-canvas px-3 py-2">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-ink">{label}</div>
        <div className={cn("text-[11.5px] font-medium", LEVEL_TEXT[level])}>{levelLabel[level]}</div>
      </div>
      <div className="shrink-0 text-right">
        <span className="text-[15px] font-bold text-ink tabular-nums">{formatValue(value)}</span>
        <span className="ml-1 text-[11.5px] text-muted">µg/m³</span>
      </div>
    </div>
  );
}

export default AirQualityPanel;
