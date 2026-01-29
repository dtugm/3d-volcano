"use client";

import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  activeColor?: string;
}

const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  activeColor = "#4285F4",
}) => {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      {label && (
        <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
          {label}
        </span>
      )}
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          className="w-9 h-[18px] bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:shadow-inner"
          style={checked ? { backgroundColor: activeColor } : undefined}
        />
      </div>
    </label>
  );
};

export default Toggle;
