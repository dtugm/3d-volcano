"use client";

import dynamic from "next/dynamic";

const TerrainViewer = dynamic(() => import("./TerrainViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0F1419]">
      <span className="text-white">Loading 3D Terrain Viewer...</span>
    </div>
  ),
});

export default TerrainViewer;
