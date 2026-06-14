import React from "react";

interface DisplayModeButtonProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  isActive?: boolean;
  disabled?: boolean;
  tooltip?: string;
  onClick?: () => void;
}

const DisplayModeButton: React.FC<DisplayModeButtonProps> = ({
  icon,
  label,
  color,
  isActive = false,
  disabled = false,
  tooltip,
  onClick,
}) => {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={
        isActive && !disabled
          ? {
            backgroundColor: `${color}20`,
            borderColor: color,
          }
          : undefined
      }
      className={`
        relative flex flex-col items-center justify-center
        p-3 rounded-lg border transition-all duration-200
        ${disabled
          ? "cursor-not-allowed bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
          : isActive
            ? "shadow-md ring-1"
            : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700/60"
        }
      `}
    >
      <div className={`mb-1 transition-colors ${disabled ? "opacity-30" : ""}`}>{icon}</div>

      <div
        className={`text-xs font-medium transition-colors ${
          disabled
            ? "opacity-30 text-slate-700 dark:text-slate-300"
            : isActive
              ? "text-slate-900 dark:text-white"
              : "text-slate-700 dark:text-slate-300"
        }`}
      >
        {label}
      </div>

      {disabled && tooltip && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-100/85 dark:bg-slate-900/85 backdrop-blur-sm px-1">
          <p className="text-xs text-center text-slate-500 dark:text-slate-400 leading-tight whitespace-pre-line">
            {tooltip}
          </p>
        </div>
      )}
    </button>
  );
};

export default DisplayModeButton;