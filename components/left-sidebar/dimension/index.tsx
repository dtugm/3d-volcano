"use client";

import React from "react";

import { useTranslation } from "@/lib/i18n";

import { CalculatorIcon, RulerIcon } from "../../icons";
import DimensionValue from "./dimension-value";

interface DimensionData {
  diameter: number | null;
  depth: number | null;
  volumeDelta: number | null;
}

interface DimensionSectionProps {
  data?: DimensionData;
  onCalculate?: () => void;
}

const DimensionSection: React.FC<DimensionSectionProps> = ({
  data,
  onCalculate,
}) => {
  const { t } = useTranslation();

  const formatValue = (value: number | null | undefined, unit?: string) => {
    if (value === null || value === undefined) {
      return "--" + (unit ? ` ${unit}` : "");
    }
    return `${value}${unit ? ` ${unit}` : ""}`;
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5">
      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <RulerIcon className="w-3.5 h-3.5" />
        {t.dimension.title}
      </h3>

      <button
        onClick={onCalculate}
        className="w-full mb-3 p-2.5 rounded-lg bg-[#52A869] hover:bg-[#489d5e] transition-all flex items-center justify-center gap-2 text-white"
      >
        <CalculatorIcon className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{t.dimension.calculate}</span>
      </button>

      <div className="space-y-2">
        <DimensionValue
          label={t.dimension.diameter}
          value={formatValue(data?.diameter, "m")}
        />
        <DimensionValue
          label={t.dimension.depth}
          value={formatValue(data?.depth, "m")}
        />
        <DimensionValue
          label={t.dimension.volumeDelta}
          value={formatValue(data?.volumeDelta)}
        />
      </div>
    </div>
  );
};

export default DimensionSection;
