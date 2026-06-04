"use client";

interface FpsOverlayProps {
  fps: number;
  frameTime: number;
  visible: boolean;
  onToggle: () => void;
}

function getFpsColor(fps: number): string {
  if (fps >= 45) return "#4ade80";
  if (fps >= 30) return "#facc15";
  return "#f87171";
}

export default function FpsOverlay({ fps, frameTime, visible, onToggle }: FpsOverlayProps) {
  const color = getFpsColor(fps);

  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-1.5 pointer-events-none">
      {visible && (
        <div className="bg-black/70 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-xs font-mono min-w-[110px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-white/50">FPS</span>
            <span className="font-bold" style={{ color }}>{fps}</span>
          </div>
          <div className="flex items-center justify-between gap-3 mt-0.5">
            <span className="text-white/50">Frame</span>
            <span className="text-white/80">{frameTime.toFixed(1)} ms</span>
          </div>
        </div>
      )}
      <button
        onClick={onToggle}
        className="pointer-events-auto bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/10 hover:border-white/20 rounded-md px-2 py-1 text-[10px] font-mono font-bold tracking-wider transition-colors"
        style={{ color: visible ? color : "rgba(255,255,255,0.4)" }}
        title={visible ? "Sembunyikan FPS" : "Tampilkan FPS"}
      >
        FPS
      </button>
    </div>
  );
}
