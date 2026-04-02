"use client";

import TerrainViewer from "@/components/half-3d/TerrainViewerDynamic";

export default function HalfThreeDPage() {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <main className="relative flex-1 bg-[#0F1419]">
        <TerrainViewer />
      </main>
    </div>
  );
}
