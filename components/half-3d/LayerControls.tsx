"use client";

import { EPOCHS } from "@/lib/half-3d/types";

interface LayerControlsProps {
  layerVisibility: boolean[];
  onToggleLayer: (index: number) => void;
  verticalExaggeration: number;
  onExaggerationChange: (value: number) => void;
  layerSpacing: number;
  onSpacingChange: (value: number) => void;
}

export default function LayerControls({
  layerVisibility,
  onToggleLayer,
  verticalExaggeration,
  onExaggerationChange,
  layerSpacing,
  onSpacingChange,
}: LayerControlsProps) {
  return (
    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-4 text-white text-sm w-56 select-none">
      <h3 className="font-semibold mb-3 text-xs uppercase tracking-wider text-white/70">
        Layers
      </h3>

      <div className="space-y-1.5 mb-4">
        {EPOCHS.map((epoch, i) => (
          <label
            key={epoch.id}
            className="flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded px-1.5 py-1 transition-colors"
          >
            <input
              type="checkbox"
              checked={layerVisibility[i]}
              onChange={() => onToggleLayer(i)}
              className="sr-only"
            />
            <span
              className="w-3 h-3 rounded-sm border border-white/30 shrink-0 transition-opacity"
              style={{
                backgroundColor: layerVisibility[i]
                  ? epoch.color
                  : "transparent",
                opacity: layerVisibility[i] ? 1 : 0.4,
              }}
            />
            <span
              className="transition-opacity"
              style={{ opacity: layerVisibility[i] ? 1 : 0.5 }}
            >
              {epoch.label}
            </span>
          </label>
        ))}
      </div>

      <div className="space-y-3 border-t border-white/20 pt-3">
        <div>
          <label className="text-xs text-white/70 block mb-1">
            Vertical Exaggeration: {verticalExaggeration.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.1"
            value={verticalExaggeration}
            onChange={(e) => onExaggerationChange(parseFloat(e.target.value))}
            className="w-full accent-white h-1"
          />
        </div>

        <div>
          <label className="text-xs text-white/70 block mb-1">
            Layer Spacing: {layerSpacing.toFixed(0)}
          </label>
          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={layerSpacing}
            onChange={(e) => onSpacingChange(parseFloat(e.target.value))}
            className="w-full accent-white h-1"
          />
        </div>
      </div>
    </div>
  );
}
