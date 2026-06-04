"use client";

import { useState } from "react";

import TerrainViewer from "@/components/half-3d/TerrainViewerDynamic";
import { VOLCANOES, VolcanoId } from "@/lib/half-3d/types";

export default function HalfThreeDPage() {
  const [selectedId, setSelectedId] = useState<VolcanoId>("agung");

  const selected = VOLCANOES.find((v) => v.id === selectedId)!;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="flex gap-1 bg-[#0F1419] px-4 pt-3 pb-0 border-b border-white/10">
        {VOLCANOES.map((volcano) => (
          <button
            key={volcano.id}
            type="button"
            onClick={() => setSelectedId(volcano.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              selectedId === volcano.id
                ? "bg-white/10 text-white border border-b-transparent border-white/20"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
            }`}
          >
            {volcano.name}
          </button>
        ))}
      </div>
      <main className="relative flex-1 bg-[#0F1419]">
        <TerrainViewer key={selectedId} epochs={selected.epochs} />
      </main>
    </div>
  );
}
