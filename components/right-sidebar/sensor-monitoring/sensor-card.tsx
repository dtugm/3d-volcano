"use client";

import React, { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

import {
  MinusIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "@/components/icons";

export type SensorStatus = "normal" | "warning" | "alert";
export type TrendDirection = "up" | "down" | "stable";

function generateRandomData(points: number = 24): { value: number }[] {
  const data: { value: number }[] = [];
  let value = Math.random() * 50 + 25;

  for (let i = 0; i < points; i++) {
    value += (Math.random() - 0.5) * 20;
    value = Math.max(5, Math.min(95, value));
    data.push({ value });
  }

  return data;
}

interface SensorCardProps {
  icon: React.ReactNode;
  iconColor: string;
  chartId: string;
  label: string;
  value: number | string;
  unit: string;
  trend: TrendDirection;
  status: SensorStatus;
  statusLabel: string;
  change24h: string;
  change24hLabel: string;
}

const STATUS_COLORS: Record<SensorStatus, string> = {
  normal: "#52A869",
  warning: "#F4B942",
  alert: "#E8764B",
};

const TREND_COLORS: Record<TrendDirection, string> = {
  up: "#E8764B",
  down: "#4285F4",
  stable: "currentColor",
};

const SensorCard: React.FC<SensorCardProps> = ({
  icon,
  iconColor,
  chartId,
  label,
  value,
  unit,
  trend,
  status,
  statusLabel,
  change24h,
  change24hLabel,
}) => {
  const statusColor = STATUS_COLORS[status];
  const trendColor = TREND_COLORS[trend];
  const isWarningOrAlert = status === "warning" || status === "alert";

  const chartData = useMemo(() => generateRandomData(24), []);

  const TrendIcon =
    trend === "up"
      ? TrendingUpIcon
      : trend === "down"
        ? TrendingDownIcon
        : MinusIcon;

  return (
    <div
      className={`bg-white dark:bg-slate-800/50 border rounded-xl p-3.5 transition-all ${
        isWarningOrAlert
          ? "border-[#F4B942]"
          : "border-slate-200 dark:border-slate-700"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${iconColor}14` }}
          >
            {icon}
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {label}
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {value}
              <span className="text-xs ml-1 font-normal text-slate-500 dark:text-slate-400">
                {unit}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <TrendIcon
            className={`w-3.5 h-3.5 ${trend === "stable" ? "text-slate-400" : ""}`}
            style={trend !== "stable" ? { color: trendColor } : undefined}
          />
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
            style={{ backgroundColor: `${statusColor}26`, color: statusColor }}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="h-12 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`gradient-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={iconColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={iconColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={iconColor}
              strokeWidth={1.5}
              fill={`url(#gradient-${chartId})`}
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
        {change24hLabel}: {change24h}
      </div>
    </div>
  );
};

export default SensorCard;
