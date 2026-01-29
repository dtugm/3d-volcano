import LeftSideBar from "../components/left-sidebar";
import RightSidebar from "../components/right-sidebar";

export default function Home() {
  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-auto">
      <LeftSideBar />
      <main className="flex flex-1 flex-col items-center justify-between py-32 px-16 bg-[#F1F5F9] dark:bg-[#0F1419] sm:items-start order-first lg:order-0 min-h-[calc(100vh-64px)] lg:min-h-0"></main>
      <RightSidebar />
    </div>
  );
}
