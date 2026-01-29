"use client";

import React from "react";

import {
  ActivityIcon,
  DropletsIcon,
  MoveIcon,
  ThermometerIcon,
  WindIcon,
} from "@/components/icons";
import { useTranslation } from "@/lib/i18n";

import SensorCard, { SensorStatus, TrendDirection } from "./sensor-card";
import SensorSummary from "./sensor-summary";

interface SensorData {
  id: string;
  value: number;
  unit: string;
  trend: TrendDirection;
  status: SensorStatus;
  change24h: string;
}

interface SensorMonitoringProps {
  date?: string;
  data?: {
    temperature?: SensorData;
    wind?: SensorData;
    seismic?: SensorData;
    gas?: SensorData;
    deformation?: SensorData;
  };
  alertsCount?: number;
  warningsCount?: number;
}

interface SensorConfig {
  id: keyof NonNullable<SensorMonitoringProps["data"]>;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  color: string;
  defaultUnit: string;
}

const SENSOR_CONFIGS: SensorConfig[] = [
  { id: "temperature", icon: ThermometerIcon, color: "#E8764B", defaultUnit: "°C" },
  { id: "wind", icon: WindIcon, color: "#8AB4F8", defaultUnit: "km/h" },
  { id: "seismic", icon: ActivityIcon, color: "#E07B91", defaultUnit: "M" },
  { id: "gas", icon: DropletsIcon, color: "#7AC4A8", defaultUnit: "ppm" },
  { id: "deformation", icon: MoveIcon, color: "#F4B942", defaultUnit: "cm" },
];

const DEFAULT_DATA: Record<string, SensorData> = {
  temperature: { id: "temperature", value: 858.0, unit: "°C", trend: "down", status: "warning", change24h: "-1.7 °C" },
  wind: { id: "wind", value: 12.5, unit: "km/h", trend: "stable", status: "normal", change24h: "+0.9 km/h" },
  seismic: { id: "seismic", value: 2.72, unit: "M", trend: "stable", status: "warning", change24h: "+0.1 M" },
  gas: { id: "gas", value: 487, unit: "ppm", trend: "up", status: "normal", change24h: "+2.6 ppm" },
  deformation: { id: "deformation", value: 5.57, unit: "cm", trend: "stable", status: "warning", change24h: "-0.0 cm" },
};

const SensorMonitoring: React.FC<SensorMonitoringProps> = ({
  date = "2024-01-15",
  data = DEFAULT_DATA,
  alertsCount = 0,
  warningsCount = 3,
}) => {
  const { t } = useTranslation();

  const getStatusLabel = (status: SensorStatus): string => {
    return t.sensorMonitoring[status];
  };

  const getSensorLabel = (sensorId: string): string => {
    return t.sensorMonitoring[sensorId as keyof typeof t.sensorMonitoring] || sensorId;
  };

  return (
    <div className="p-5 space-y-4">
      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {t.sensorMonitoring.title}
      </h3>

      <div className="space-y-3">
        {SENSOR_CONFIGS.map((config) => {
          const sensorData = data[config.id] || DEFAULT_DATA[config.id];
          const IconComponent = config.icon;

          return (
            <SensorCard
              key={config.id}
              chartId={config.id}
              icon={
                <IconComponent
                  className="w-4 h-4"
                  style={{ color: config.color }}
                />
              }
              iconColor={config.color}
              label={getSensorLabel(config.id)}
              value={sensorData.value}
              unit={sensorData.unit || config.defaultUnit}
              trend={sensorData.trend}
              status={sensorData.status}
              statusLabel={getStatusLabel(sensorData.status)}
              change24h={sensorData.change24h}
              change24hLabel={t.sensorMonitoring.change24h}
            />
          );
        })}
      </div>

      <SensorSummary
        date={date}
        alertsLabel={t.sensorMonitoring.alerts}
        alertsCount={alertsCount}
        warningsLabel={t.sensorMonitoring.warnings}
        warningsCount={warningsCount}
      />
    </div>
  );
};

export default SensorMonitoring;
