"use client";

import { EpochInfo } from "@/lib/half-3d/types";
import { useTranslation } from "@/lib/i18n";

interface LayerControlsProps {
  epochs: EpochInfo[];
  layerVisibility: boolean[];
  onToggleLayer: (index: number) => void;
  onSetAllLayers: (visible: boolean) => void;
  verticalExaggeration: number;
  onExaggerationChange: (value: number) => void;
  layerSpacing: number;
  onSpacingChange: (value: number) => void;
}

export default function LayerControls({
  epochs,
  layerVisibility,
  onToggleLayer,
  onSetAllLayers,
  verticalExaggeration,
  onExaggerationChange,
  layerSpacing,
  onSpacingChange,
}: LayerControlsProps) {
  const { t } = useTranslation();
  const allVisible = layerVisibility.every(Boolean);

  return (
    <div className="absolute top-4 right-4 w-64 max-w-[calc(100%-2rem)] max-h-[calc(100%-5rem)] overflow-y-auto rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-white shadow-xl backdrop-blur-md select-none animate-fade-in">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
          {t.slice.layers}
        </h3>
        <button
          type="button"
          onClick={() => onSetAllLayers(!allVisible)}
          className="rounded-md px-2 py-0.5 text-[11px] font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
        >
          {allVisible ? t.slice.hideAll : t.slice.showAll}
        </button>
      </div>

      <div className="mb-4 space-y-0.5">
        {epochs.map((epoch, i) => (
          <label
            key={epoch.id}
            className="flex items-center gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-white/10 transition-colors"
          >
            <input
              type="checkbox"
              checked={layerVisibility[i]}
              onChange={() => onToggleLayer(i)}
              className="sr-only peer"
            />
            <span
              className="h-3.5 w-3.5 shrink-0 rounded border border-white/40 transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-white/60"
              style={{
                backgroundColor: layerVisibility[i] ? epoch.color : "transparent",
                borderColor: layerVisibility[i] ? epoch.color : undefined,
              }}
            />
            <span
              className="text-[13px] transition-opacity"
              style={{ opacity: layerVisibility[i] ? 1 : 0.5 }}
            >
              {epoch.label}
            </span>
          </label>
        ))}
      </div>

      <div className="space-y-4 border-t border-white/15 pt-3.5">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs text-white/70">
            <label htmlFor="slice-exaggeration">{t.slice.verticalExaggeration}</label>
            <span className="font-mono text-white tabular-nums">
              {verticalExaggeration.toFixed(1)}×
            </span>
          </div>
          <input
            id="slice-exaggeration"
            type="range"
            min="0.5"
            max="5"
            step="0.1"
            value={verticalExaggeration}
            onChange={(e) => onExaggerationChange(parseFloat(e.target.value))}
            className="w-full accent-[#4285F4] cursor-pointer"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs text-white/70">
            <label htmlFor="slice-spacing">{t.slice.layerSpacing}</label>
            <span className="font-mono text-white tabular-nums">
              {layerSpacing.toFixed(0)}
            </span>
          </div>
          <input
            id="slice-spacing"
            type="range"
            min="0"
            max="30"
            step="1"
            value={layerSpacing}
            onChange={(e) => onSpacingChange(parseFloat(e.target.value))}
            className="w-full accent-[#4285F4] cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
