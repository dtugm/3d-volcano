"use client";

import React, { useState } from "react";

import { useTranslation } from "@/lib/i18n";

import {
  ActivityIcon,
  DropletsIcon,
  MoveIcon,
  ThermometerIcon,
  WindIcon,
} from "../../icons";
import SensorToggle from "./sensor-toggle";

export type SensorType = "thermal" | "wind" | "seismic" | "gas" | "deformation";

interface SensorConfig {
  id: SensorType;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  color: string;
}

const SENSORS: SensorConfig[] = [
  { id: "thermal", icon: ThermometerIcon, color: "#E8764B" },
  { id: "wind", icon: WindIcon, color: "#8AB4F8" },
  { id: "seismic", icon: ActivityIcon, color: "#E07B91" },
  { id: "gas", icon: DropletsIcon, color: "#7AC4A8" },
  { id: "deformation", icon: MoveIcon, color: "#F4B942" },
];

interface SensorSectionProps {
  defaultEnabled?: SensorType[];
  onSensorChange?: (enabledSensors: SensorType[]) => void;
}

const SensorSection: React.FC<SensorSectionProps> = ({
  defaultEnabled = ["thermal", "wind", "seismic", "gas", "deformation"],
  onSensorChange,
}) => {
  const { t } = useTranslation();
  const [enabledSensors, setEnabledSensors] =
    useState<SensorType[]>(defaultEnabled);

  const handleToggle = (sensorId: SensorType, checked: boolean) => {
    const newEnabled = checked
      ? [...enabledSensors, sensorId]
      : enabledSensors.filter((id) => id !== sensorId);
    setEnabledSensors(newEnabled);
    onSensorChange?.(newEnabled);
  };

  const getSensorLabel = (sensorId: SensorType): string => {
    return t.sensor[sensorId];
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5">
      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        {t.sensor.title}
      </h3>
      <div className="space-y-2">
        {SENSORS.map((sensor) => {
          const IconComponent = sensor.icon;
          return (
            <SensorToggle
              key={sensor.id}
              icon={
                <IconComponent
                  className="w-3.5 h-3.5"
                  style={{ color: sensor.color }}
                />
              }
              label={getSensorLabel(sensor.id)}
              checked={enabledSensors.includes(sensor.id)}
              color={sensor.color}
              onChange={(checked) => handleToggle(sensor.id, checked)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default SensorSection;
