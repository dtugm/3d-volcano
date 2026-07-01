"use client";

interface Stats {
  maxDepth: number;
  wettedCells: number;
  timeS: number;
  injectedM3?: number;
  budgetM3?: number | null;
  injecting?: boolean;
}

interface Props {
  running: boolean;
  ready: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  stats: Stats | null;
}

export default function SimControls({ running, ready, onPlay, onPause, onReset, stats }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {running ? (
          <button
            onClick={onPause}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-2 py-1.5 text-xs font-medium transition-colors"
          >
            Pause
          </button>
        ) : (
          <button
            onClick={onPlay}
            disabled={!ready}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg px-2 py-1.5 text-xs font-medium transition-colors"
          >
            Run
          </button>
        )}
        <button
          onClick={onReset}
          className="flex-1 bg-slate-600 hover:bg-slate-700 text-white rounded-lg px-2 py-1.5 text-xs font-medium transition-colors"
        >
          Reset
        </button>
      </div>

      {running && !stats && (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
          Simulating flow…
        </div>
      )}

      {stats && (
        <>
          <dl className="text-xs grid grid-cols-3 gap-2 text-slate-700 dark:text-slate-300">
            <div>
              <dt className="text-[10px] uppercase text-slate-500">Max depth</dt>
              <dd className="font-mono">{stats.maxDepth.toFixed(2)} m</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-slate-500">Cells</dt>
              <dd className="font-mono">{stats.wettedCells}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-slate-500">Sim time</dt>
              <dd className="font-mono">{stats.timeS.toFixed(0)} s</dd>
            </div>
          </dl>

          {stats.budgetM3 != null && stats.injectedM3 != null && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] uppercase text-slate-500">
                <span>Injected / Budget (m³)</span>
                <span className={stats.injecting === false ? "text-emerald-600 dark:text-emerald-400 normal-case" : "normal-case"}>
                  {stats.injecting === false ? "exhausted" : "active"}
                </span>
              </div>
              <div className="h-1.5 w-full rounded bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full ${stats.injecting === false ? "bg-emerald-500" : "bg-orange-500"}`}
                  style={{ width: `${Math.min(100, (stats.injectedM3 / Math.max(1, stats.budgetM3)) * 100).toFixed(1)}%` }}
                />
              </div>
              <div className="text-[10px] font-mono text-slate-600 dark:text-slate-400">
                {stats.injectedM3.toFixed(0)} / {stats.budgetM3.toFixed(0)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
