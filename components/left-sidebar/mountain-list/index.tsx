"use client";

import React from "react";

import { useTranslation } from "@/lib/i18n";
import { Mountain } from "@/lib/volcano";

import MountainCard from "../../cards/mountain-card";
import { StrokeMountainIcon } from "../../icons";
import SectionHeader from "../../section-header";

interface MountainListProps {
  mountains: Mountain[];
  activeMountainId: string;
  onMountainSelect: (mountainId: string) => void;
}

const MountainList: React.FC<MountainListProps> = ({
  mountains,
  activeMountainId,
  onMountainSelect,
}) => {
  const { t } = useTranslation();

  return (
    <section id="mountain-list" className="flex flex-col gap-2">
      <SectionHeader
        name={t.mountain}
        icon={<StrokeMountainIcon className="dark:stroke-[#90A1B9] w-3 h-3" />}
      />
      <div className="flex flex-col gap-2">
        {mountains.map((mountain) => (
          <MountainCard
            key={mountain.id}
            elevation={mountain.elevation}
            latitude={mountain.latitude}
            longitude={mountain.longitude}
            name={mountain.name}
            series={mountain.series}
            isActive={mountain.id === activeMountainId}
            onClick={() => onMountainSelect(mountain.id)}
          />
        ))}
      </div>
    </section>
  );
};

export default MountainList;
