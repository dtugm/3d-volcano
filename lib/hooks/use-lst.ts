import { useEffect, useMemo } from "react";
import useSWR from "swr";

import type {
  LstConfigResponse,
  LstDatesResponse,
} from "@/lib/sensor-api";
import {
  sensorApiFetcher,
  sensorApiUrl,
  toLstKey,
  toPublicTileUrl,
} from "@/lib/sensor-api";
import { useVolcano } from "@/lib/volcano";

/**
 * Land Surface Temperature tiles for the active mountain.
 *
 * /lst/dates returns capture dates newest-first; the newest one is selected
 * automatically whenever the active mountain changes or the current selection
 * is not available for it.
 */
export function useLst() {
  const { activeMountainId, lstDate, setLstDate } = useVolcano();

  const {
    data: config,
    error: configError,
    isLoading: configLoading,
  } = useSWR<LstConfigResponse>(
    sensorApiUrl("/lst/config"),
    sensorApiFetcher,
    { revalidateOnFocus: false },
  );

  const {
    data: allDates,
    error: datesError,
    isLoading: datesLoading,
  } = useSWR<LstDatesResponse>(sensorApiUrl("/lst/dates"), sensorApiFetcher, {
    revalidateOnFocus: false,
  });

  const key = toLstKey(activeMountainId);

  const dates = useMemo(() => allDates?.[key] ?? [], [allDates, key]);

  // Keep the selected date valid for the mountain currently on screen.
  useEffect(() => {
    if (dates.length === 0) return;
    if (!lstDate || !dates.includes(lstDate)) {
      setLstDate(dates[0]);
    }
  }, [dates, lstDate, setLstDate]);

  const tileUrl = useMemo(() => {
    const template = config?.tile_urls?.[key];
    if (!template || !lstDate || !dates.includes(lstDate)) return null;
    return toPublicTileUrl(template).replace("{date}", lstDate);
  }, [config, key, lstDate, dates]);

  return {
    tileUrl,
    dates,
    legend: config?.colormap.legend ?? [],
    unit: config?.colormap.unit ?? "Celsius",
    isLoading: configLoading || datesLoading,
    error: configError || datesError,
  };
}
