"use client";

import {
  AlertTriangleIcon,
  CheckCircleIcon,
  FlameIcon,
  RefreshCwIcon,
} from "@/components/icons";
import SectionHeader from "@/components/section-header";
import { useTranslation } from "@/lib/i18n";
import { useFire } from "@/lib/hooks/use-fire";

const FirePanel = () => {
  const { t } = useTranslation();
  const { fire, error, isLoading, refresh } = useFire();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SectionHeader
          name={t.fire.title}
          icon={
            <FlameIcon className="w-3.5 h-3.5 text-slate-500 dark:text-[#90A1B9]" />
          }
        />
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <SectionHeader
          name={t.fire.title}
          icon={
            <FlameIcon className="w-3.5 h-3.5 text-slate-500 dark:text-[#90A1B9]" />
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

  const hotspots = fire?.hotspots || [];

  return (
    <div className="space-y-3">
      <SectionHeader
        name={t.fire.title}
        icon={
          <FlameIcon className="w-3.5 h-3.5 text-slate-500 dark:text-[#90A1B9]" />
        }
      />

      {hotspots.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5">
          <div className="flex items-center gap-2">
            <CheckCircleIcon
              className="w-4 h-4 shrink-0"
              style={{ color: "#52A869" }}
            />
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {t.fire.noHotspots}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Summary badge */}
          <div className="bg-white dark:bg-slate-800/50 border border-[#F4B942] rounded-xl p-3.5">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon
                className="w-4 h-4 shrink-0"
                style={{ color: "#E8764B" }}
              />
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                {hotspots.length} {t.fire.hotspots} {t.fire.detected}
              </p>
            </div>
          </div>

          {/* Hotspot cards */}
          {hotspots.slice(0, 5).map((hotspot, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5"
            >
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <MetricRow
                  label={t.fire.brightness}
                  value={`${hotspot.brightness.toFixed(1)} K`}
                />
                <MetricRow
                  label={t.fire.frp}
                  value={`${hotspot.frp.toFixed(1)} MW`}
                />
                <MetricRow
                  label={t.fire.confidence}
                  value={hotspot.confidence}
                />
                <MetricRow
                  label={t.fire.distance}
                  value={`${hotspot.distanceKm} km`}
                />
                <MetricRow
                  label={t.fire.satellite}
                  value={hotspot.satellite}
                />
                <MetricRow
                  label=""
                  value={`${hotspot.acqDate} ${hotspot.acqTime}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
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

export default FirePanel;
