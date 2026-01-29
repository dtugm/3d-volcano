import CesiumViewer from "@/components/cesium/CesiumViewerDynamic";
import LeftSideBar from "@/components/left-sidebar";
// import RightSidebar from "@/components/right-sidebar";

export default function Home() {
  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-auto">
      <LeftSideBar />
      <main className="relative flex-1 bg-[#F1F5F9] dark:bg-[#0F1419] order-first lg:order-0 min-h-[calc(100vh-64px)] lg:min-h-0">
        <CesiumViewer />
      </main>
      {/* <RightSidebar /> */}
    </div>
  );
}
