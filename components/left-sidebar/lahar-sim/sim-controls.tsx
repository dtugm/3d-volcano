"use client";

interface Props {
  running: boolean;
  ready: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
}

export default function SimControls({ running, ready, onPlay, onPause, onReset }: Props) {
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
      {running && (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
          Simulating flow path…
        </div>
      )}
    </div>
  );
}
