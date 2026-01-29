"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { PanelIcon } from "../icons";
import DimensionSection from "./dimension";
import DisplayModeSection from "./display-mode";
import MountainList, { Mountain } from "./mountain-list";
import SensorSection from "./sensor";
import TimeSeriesSection from "./time-series";

const STORAGE_KEY = "left-sidebar-collapsed";

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function getServerSnapshot(): boolean {
  return false;
}

const MOUNTAINS: Mountain[] = [
  {
    id: "gunung-agung",
    name: "Gunung Agung",
    latitude: -8.34,
    longitude: 115.51,
    elevation: 3031,
    series: 6,
    dates: [
      "2024-01-15",
      "2024-02-15",
      "2024-03-15",
      "2024-04-15",
      "2024-05-15",
      "2024-06-15",
    ],
  },
  {
    id: "gunung-kelud",
    name: "Gunung Kelud",
    latitude: -7.93,
    longitude: 112.31,
    elevation: 1731,
    series: 2,
    dates: ["2024-01-20", "2024-02-20"],
  },
];

const LeftSideBar = () => {
  const [activeMountainId, setActiveMountainId] = useState<string>(
    MOUNTAINS[0].id,
  );
  const isCollapsed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setIsCollapsed = useCallback((value: boolean) => {
    localStorage.setItem(STORAGE_KEY, String(value));
    emitChange();
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        emitChange();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  const activeMountain = MOUNTAINS.find((m) => m.id === activeMountainId);

  const timeSeriesDates = useMemo(() => {
    if (!activeMountain) return [];
    return activeMountain.dates.map((date) => ({
      date,
      label: date,
    }));
  }, [activeMountain]);

  return (
    <div
      id="left-sidebar"
      className={`relative flex flex-col shrink-0 bg-background transition-all duration-300 ease-in-out w-full h-auto lg:h-full ${isCollapsed ? "lg:w-5" : "lg:w-80"}`}
    >
      <button
        onClick={toggleSidebar}
        className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 p-1 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <PanelIcon
          className={`w-4 h-4 text-slate-700 dark:text-slate-300 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
        />
      </button>
      {!isCollapsed && (
        <div className="hidden lg:block flex-1 p-4 min-w-80 overflow-hidden animate-fade-in overflow-y-auto gap-4">
          <MountainList
            mountains={MOUNTAINS}
            activeMountainId={activeMountainId}
            onMountainSelect={setActiveMountainId}
          />

          <TimeSeriesSection dates={timeSeriesDates} />

          <SensorSection />

          <DisplayModeSection />

          <DimensionSection />
        </div>
      )}
    </div>
  );
};

export default LeftSideBar;
