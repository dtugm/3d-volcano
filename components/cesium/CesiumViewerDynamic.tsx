"use client";

import dynamic from "next/dynamic";

const CesiumViewer = dynamic(() => import("./Viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0F1419]">
      <span className="text-white">Loading 3D Viewer...</span>
    </div>
  ),
});

export default CesiumViewer;
