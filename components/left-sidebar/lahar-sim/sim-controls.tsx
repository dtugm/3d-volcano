"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";

interface Props {
  running: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  stats: { maxDepth: number; wettedCells: number; timeS: number } | null;
}

export default function SimControls({ running, onPlay, onPause, onReset, stats }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {running ? (
          <button
            onClick={onPause}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-2 py-1.5 text-xs font-medium transition-colors"
          >
            {t.simulation.controls.pause}
          </button>
        ) : (
          <button
            onClick={onPlay}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2 py-1.5 text-xs font-medium transition-colors"
          >
            {t.simulation.controls.play}
          </button>
        )}
        <button
          onClick={onReset}
          className="flex-1 bg-slate-600 hover:bg-slate-700 text-white rounded-lg px-2 py-1.5 text-xs font-medium transition-colors"
        >
          {t.simulation.controls.reset}
        </button>
      </div>
      {stats ? (
        <dl className="text-xs grid grid-cols-3 gap-2 text-slate-700 dark:text-slate-300">
          <div>
            <dt className="text-[10px] uppercase text-slate-500">
              {t.simulation.stats.maxDepth}
            </dt>
            <dd className="font-mono">{stats.maxDepth.toFixed(2)} m</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-slate-500">
              {t.simulation.stats.wettedCells}
            </dt>
            <dd className="font-mono">{stats.wettedCells}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-slate-500">
              {t.simulation.stats.simTime}
            </dt>
            <dd className="font-mono">{stats.timeS.toFixed(0)} s</dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}
