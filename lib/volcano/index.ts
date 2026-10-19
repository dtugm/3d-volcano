"use client";

import { useActiveVolcano, useTwin } from "@/lib/twin/store";

export { formatTimeKey } from "./format-time-key";

/**
 * Read-only view of the active volcano for the environmental data hooks
 * (weather, air quality, hotspots, earthquakes, LST). The twin store is the
 * source of truth.
 */
export function useVolcano() {
  const activeMountain = useActiveVolcano();
  const lstDate = useTwin((s) => s.lstDate);
  const setLstDate = useTwin((s) => s.setLstDate);
  return { activeMountain, activeMountainId: activeMountain.id, lstDate, setLstDate };
}
