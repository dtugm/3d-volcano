"use client";

import CesiumViewer from "@/components/cesium/CesiumViewerDynamic";
import DualTerrainViewer from "@/components/cesium/DualTerrainViewerDynamic";
import SplitSlider from "@/components/cesium/SplitSliderDynamic";
import LeftSideBar from "@/components/left-sidebar";
import { useVolcano } from "@/lib/volcano";
import RightSidebar from "@/components/right-sidebar";

export default function Home() {
  const { comparisonEnabled, comparisonMode } = useVolcano();

  const showDualViewer = comparisonEnabled && comparisonMode === "terrain";

  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-auto">
      <LeftSideBar />
      <main className="relative flex-1 bg-[#F1F5F9] dark:bg-[#0F1419] order-first lg:order-0 min-h-[calc(100vh-64px)] lg:min-h-0">
        {showDualViewer ? <DualTerrainViewer /> : <CesiumViewer />}
        <SplitSlider />
      </main>
      <RightSidebar />
    </div>
  );
}
