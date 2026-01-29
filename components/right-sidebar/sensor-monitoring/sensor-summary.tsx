import React from "react";

interface SensorSummaryProps {
  date: string;
  alertsLabel: string;
  alertsCount: number;
  warningsLabel: string;
  warningsCount: number;
}

const SensorSummary: React.FC<SensorSummaryProps> = ({
  date,
  alertsLabel,
  alertsCount,
  warningsLabel,
  warningsCount,
}) => {
  return (
    <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5">
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
        {date}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {alertsLabel}
          </div>
          <div className="text-xl font-bold text-[#E8764B]">{alertsCount}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {warningsLabel}
          </div>
          <div className="text-xl font-bold text-[#F4B942]">
            {warningsCount}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SensorSummary;
