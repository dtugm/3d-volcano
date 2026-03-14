import React from "react";

interface DisplayModeButtonProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  isActive?: boolean;
  onClick?: () => void;
}

const DisplayModeButton: React.FC<DisplayModeButtonProps> = ({
  icon,
  label,
  color,
  isActive = false,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      style={
        isActive
          ? {
            backgroundColor: `${color}20`, // transparan
            borderColor: color,
          }
          : undefined
      }
      className={`
        flex flex-col items-center justify-center
        p-3 rounded-lg border transition-all duration-200
        
        ${isActive
          ? "shadow-md ring-1"
          : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700/60"
        }
      `}
    >
      <div className="mb-1 transition-colors">{icon}</div>

      <div
        className={`text-xs font-medium transition-colors ${isActive
          ? "text-slate-900 dark:text-white"
          : "text-slate-700 dark:text-slate-300"
          }`}
      >
        {label}
      </div>
    </button>
  );
};

export default DisplayModeButton;