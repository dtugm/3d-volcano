import React from "react";

interface DisplayModeButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

const DisplayModeButton: React.FC<DisplayModeButtonProps> = ({
  icon,
  label,
  isActive = false,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg border transition-all ${
        isActive
          ? "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 shadow-md"
          : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
      }`}
    >
      {icon}
      <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
        {label}
      </div>
    </button>
  );
};

export default DisplayModeButton;
