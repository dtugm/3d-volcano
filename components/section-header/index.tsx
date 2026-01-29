import React from "react";

interface SectionHeaderProps {
  name: string;
  icon?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ name, icon }) => {
  return (
    <div className="flex flex-row gap-1 items-center">
      {icon}
      <p className="text-xs font-semibold text-slate-500 dark:text-[#90A1B9] uppercase tracking-wider">
        {name}
      </p>
    </div>
  );
};

export default SectionHeader;
