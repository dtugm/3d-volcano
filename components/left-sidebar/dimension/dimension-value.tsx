import React from "react";

interface DimensionValueProps {
  label: string;
  value: string | number;
  unit?: string;
}

const DimensionValue: React.FC<DimensionValueProps> = ({
  label,
  value,
  unit,
}) => {
  return (
    <div className="bg-white dark:bg-slate-700/50 rounded-lg p-2.5 border border-slate-200 dark:border-slate-600">
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
        {label}
      </div>
      <div className="text-base font-bold text-slate-900 dark:text-white">
        {value}
        {unit && ` ${unit}`}
      </div>
    </div>
  );
};

export default DimensionValue;
