"use client";

import React, { useState } from "react";

import { useTranslation } from "@/lib/i18n";

import { BoxIcon, EarthIcon, LayersIcon, MapIcon } from "../../icons";
import SectionHeader from "../../section-header";
import DisplayModeButton from "./display-mode-button";

export type DisplayMode = "mesh3d" | "ortho" | "change" | "globe";

interface DisplayModeConfig {
  id: DisplayMode;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  color: string;
}

const DISPLAY_MODES: DisplayModeConfig[] = [
  { id: "mesh3d", icon: BoxIcon, color: "#52A869" },
  { id: "ortho", icon: MapIcon, color: "#4285F4" },
  { id: "change", icon: LayersIcon, color: "#E8764B" },
  { id: "globe", icon: EarthIcon, color: "#E07B91" },
];

interface DisplayModeSectionProps {
  defaultMode?: DisplayMode;
  onModeChange?: (mode: DisplayMode) => void;
}

const DisplayModeSection: React.FC<DisplayModeSectionProps> = ({
  defaultMode = "globe",
  onModeChange,
}) => {
  const { t } = useTranslation();
  const [activeMode, setActiveMode] = useState<DisplayMode>(defaultMode);

  const handleModeChange = (mode: DisplayMode) => {
    setActiveMode(mode);
    onModeChange?.(mode);
  };

  const getModeLabel = (mode: DisplayMode): string => {
    return t.displayMode[mode];
  };

  return (
    <section id="display-mode" className="flex flex-col gap-2">
      <SectionHeader name={t.displayMode.title} />

      <div className="grid grid-cols-2 gap-2">
        {DISPLAY_MODES.map((mode) => {
          const IconComponent = mode.icon;
          return (
            <DisplayModeButton
              key={mode.id}
              icon={
                <IconComponent
                  className="w-4 h-4 mb-1"
                  style={{ color: mode.color }}
                />
              }
              label={getModeLabel(mode.id)}
              isActive={activeMode === mode.id}
              onClick={() => handleModeChange(mode.id)}
            />
          );
        })}
      </div>
    </section>
  );
};

export default DisplayModeSection;
