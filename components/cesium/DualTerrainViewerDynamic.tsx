"use client";

import dynamic from "next/dynamic";

const DualTerrainViewer = dynamic(() => import("./DualTerrainViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0F1419]">
      <span className="text-white">Loading 3D Viewer...</span>
    </div>
  ),
});

export default DualTerrainViewer;
