"use client";

import {
  ActivityIcon,
  CheckCircleIcon,
  RefreshCwIcon,
} from "@/components/icons";
import SectionHeader from "@/components/section-header";
import { useEarthquake } from "@/lib/hooks/use-earthquake";
import { useTranslation } from "@/lib/i18n";
import type { EarthquakeEvent } from "@/lib/types/api";

// USGS-style magnitude bands, reusing the palette already in the sidebar.
function magnitudeColor(magnitude: number): string {
  if (magnitude >= 5) return "#E8764B";
  if (magnitude >= 4) return "#F4B942";
  return "#7AC4A8";
}

const EarthquakePanel = () => {
  const { t, locale } = useTranslation();
  const { events, windowDays, radiusKm, error, isLoading, refresh } =
    useEarthquake();

  const header = (
    <SectionHeader
      name={t.earthquake.title}
      icon={
        <ActivityIcon className="w-3.5 h-3.5 text-slate-500 dark:text-[#90A1B9]" />
      }
    />
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {header}
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        {header}
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

  return (
    <div className="space-y-3">
      {header}

      {events.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5">
          <div className="flex items-center gap-2">
            <CheckCircleIcon
              className="w-4 h-4 shrink-0"
              style={{ color: "#52A869" }}
            />
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {t.earthquake.noEvents} ({windowDays} {t.earthquake.lastDays},
              ≤{radiusKm} km)
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {events.length} {t.earthquake.events} {t.earthquake.recorded} ·{" "}
              {windowDays} {t.earthquake.lastDays} · ≤{radiusKm} km
            </p>
          </div>

          {events.slice(0, 5).map((event) => (
            <EarthquakeCard
              key={event.id}
              event={event}
              locale={locale}
              depthLabel={t.earthquake.depth}
              distanceLabel={t.earthquake.distance}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface EarthquakeCardProps {
  event: EarthquakeEvent;
  locale: string;
  depthLabel: string;
  distanceLabel: string;
}

const EarthquakeCard: React.FC<EarthquakeCardProps> = ({
  event,
  locale,
  depthLabel,
  distanceLabel,
}) => {
  const color = magnitudeColor(event.magnitude);
  const timestamp = new Date(event.time).toLocaleString(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5">
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          {event.magnitude.toFixed(1)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">
            {event.place}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {timestamp}
          </p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
        <MetricRow label={depthLabel} value={`${event.depthKm.toFixed(1)} km`} />
        <MetricRow label={distanceLabel} value={`${event.distanceKm} km`} />
      </div>
    </div>
  );
};

interface MetricRowProps {
  label: string;
  value: string;
}

const MetricRow: React.FC<MetricRowProps> = ({ label, value }) => (
  <div>
    {label && (
      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </div>
    )}
    <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
      {value}
    </div>
  </div>
);

export default EarthquakePanel;
