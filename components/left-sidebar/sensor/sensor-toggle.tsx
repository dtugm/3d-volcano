import React from "react";

import Toggle from "../../toggle";

interface SensorToggleProps {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  color: string;
  onChange: (checked: boolean) => void;
}

const SensorToggle: React.FC<SensorToggleProps> = ({
  icon,
  label,
  checked,
  color,
  onChange,
}) => {
  return (
    <Toggle
      checked={checked}
      onChange={onChange}
      activeColor={color}
      label={
        <span className="flex items-center gap-2 transition-colors">
          {icon}
          {label}
        </span>
      }
    />
  );
};

export default SensorToggle;
