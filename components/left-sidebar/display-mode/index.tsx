"use client";

import React from "react";

import { useTranslation } from "@/lib/i18n";
import { LayerType, useVolcano } from "@/lib/volcano";

import { BoxIcon, LayersIcon, MapIcon } from "../../icons";
import SectionHeader from "../../section-header";
import DisplayModeButton from "./display-mode-button";

interface DisplayModeConfig {
  id: LayerType;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  color: string;
}

const DISPLAY_MODES: DisplayModeConfig[] = [
  { id: "terrain", icon: LayersIcon, color: "#E8764B" },
  { id: "ortho", icon: MapIcon, color: "#4285F4" },
  { id: "gaussianSplat", icon: BoxIcon, color: "#9333EA" },
];

const DisplayModeSection: React.FC = () => {
  const { t } = useTranslation();
  const { layerVisibility, toggleLayer, activeYearData } = useVolcano();

  const isGaussianSplatAvailable = !!activeYearData?.gaussianSplatUrl;

  const getModeLabel = (mode: LayerType): string => {
    return t.displayMode[mode];
  };

  return (
    <section id="display-mode" className="flex flex-col gap-2">
      <SectionHeader name={t.displayMode.title} />

      <div className="grid grid-cols-2 gap-2">
        {DISPLAY_MODES.map((mode) => {
          const IconComponent = mode.icon;
          const isDisabled = mode.id === "gaussianSplat" && !isGaussianSplatAvailable;
          return (
            <DisplayModeButton
              key={mode.id}
              icon={
                <IconComponent
                  className="w-4 h-4 mb-1"
                  style={isDisabled ? undefined : { color: mode.color }}
                />
              }
              label={getModeLabel(mode.id)}
              color={mode.color}
              isActive={layerVisibility[mode.id]}
              disabled={isDisabled}
              tooltip={isDisabled ? "Belum tersedia\nCoba epoch lain" : undefined}
              onClick={() => toggleLayer(mode.id)}
            />
          );
        })}
      </div>
    </section>
  );
};

export default DisplayModeSection;
