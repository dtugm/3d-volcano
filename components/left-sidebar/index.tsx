"use client";

import { useEffect, useMemo } from "react";
import { useVolcano } from "@/lib/volcano";
import { useSidebar } from "@/lib/app/useSidebar";

import { PanelIcon } from "../icons";
import DimensionSection from "./dimension";
import DisplayModeSection from "./display-mode";
import MountainList from "./mountain-list";
import SensorSection from "./sensor";
import TimeSeriesSection from "./time-series";

const STORAGE_KEY = "left-sidebar-collapsed";

const LeftSideBar = () => {
  const { mountains, activeMountainId, activeMountain, setActiveMountainId } =
    useVolcano();
  const { isCollapsed, toggleSidebar } = useSidebar();

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const timeSeriesDates = useMemo(() => {
    if (!activeMountain) return [];
    return activeMountain.dates.map((date) => ({
      date,
      label: date,
    }));
  }, [activeMountain]);

  return (
    <>
      {!isCollapsed && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-20"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      <div
        id="left-sidebar"
        className={`
          fixed lg:relative inset-y-0 left-0 z-30 lg:z-90
          flex flex-col shrink-0 bg-background 
          transition-transform duration-300 ease-in-out
          ${isCollapsed 
            ? '-translate-x-full lg:translate-x-0 lg:w-5' 
            : 'translate-x-0 w-80 lg:w-80'
          }
          h-full
          border-r border-slate-200 dark:border-slate-800
        `}
      >
        <button
          onClick={toggleSidebar}
          className={`
            absolute top-1/2 -translate-y-1/2 z-50 
            p-1 rounded-full 
            bg-slate-200 dark:bg-slate-700 
            hover:bg-slate-300 dark:hover:bg-slate-600 
            transition-colors cursor-pointer shadow-md
            
            /* Posisi Horizontal */
            right-0 
            translate-x-full lg:translate-x-1/2
            
            /* Sedikit margin di mobile agar tidak terlalu mepet layar jika diinginkan */
            mr-[-2px] lg:mr-0
          `}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelIcon
            className={`w-4 h-4 text-slate-700 dark:text-slate-300 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
          />
        </button>

        {!isCollapsed && (
          <div className="flex flex-col flex-1 p-4 min-w-80 overflow-hidden animate-fade-in overflow-y-auto gap-4">
            <MountainList
              mountains={mountains}
              activeMountainId={activeMountainId}
              onMountainSelect={setActiveMountainId}
            />
            <DisplayModeSection />
            <div className="pointer-events-none opacity-50 flex flex-col gap-4">
            <TimeSeriesSection dates={timeSeriesDates} />
            <SensorSection />
            <DimensionSection />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default LeftSideBar;
