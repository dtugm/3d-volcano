"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import { PanelIcon } from "../icons";
import SensorMonitoring from "./sensor-monitoring";

const STORAGE_KEY = "right-sidebar-collapsed";

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

const RightSidebar = () => {
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

  return (
    <div
      id="right-sidebar"
      className={`relative flex flex-col shrink-0 bg-background transition-all duration-300 ease-in-out w-full h-auto lg:h-full ${isCollapsed ? "lg:w-5" : "lg:w-80"}`}
    >
      <button
        onClick={toggleSidebar}
        className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 p-1 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <PanelIcon
          className={`w-4 h-4 text-slate-700 dark:text-slate-300 transition-transform duration-300 ${isCollapsed ? "" : "rotate-180"}`}
        />
      </button>
      {!isCollapsed && (
        <div className="hidden lg:block flex-1 min-w-80 overflow-y-auto">
          <SensorMonitoring />
        </div>
      )}
    </div>
  );
};

export default RightSidebar;
