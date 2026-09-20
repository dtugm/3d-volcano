import { useMemo } from "react";
import useSWR from "swr";

import type { ThermalResponse } from "@/lib/sensor-api";
import {
  haversineKm,
  lastDays,
  sensorApiFetcher,
  sensorApiUrl,
} from "@/lib/sensor-api";
import type { Hotspot } from "@/lib/types/api";
import { useVolcano } from "@/lib/volcano";

const WINDOW_DAYS = 7;
const RADIUS_KM = 50;
/** Bounding-box half-width in degrees; ~0.5° comfortably covers RADIUS_KM. */
const AREA_OFFSET = 0.5;

export function useFire() {
  const { activeMountain } = useVolcano();

  // Recomputed once per day so the SWR key stays stable between renders.
  const [startDate, endDate] = useMemo(() => lastDays(WINDOW_DAYS), []);

  const { data, error, isLoading, mutate } = useSWR<ThermalResponse>(
    activeMountain
      ? sensorApiUrl("/thermal-anomalies", {
          start_date: startDate,
          end_date: endDate,
          center_lat: activeMountain.latitude,
          center_lon: activeMountain.longitude,
          area_offset: AREA_OFFSET,
        })
      : null,
    sensorApiFetcher,
    { refreshInterval: 600_000 },
  );

  // FIRMS fields arrive as strings and cover the whole bounding box, so they
  // are parsed and trimmed to the radius here.
  const hotspots = useMemo<Hotspot[]>(() => {
    if (!data?.data || !activeMountain) return [];
    return data.data
      .map((point) => {
        const latitude = Number(point.latitude);
        const longitude = Number(point.longitude);
        const distanceKm = haversineKm(
          activeMountain.latitude,
          activeMountain.longitude,
          latitude,
          longitude,
        );
        return {
          latitude,
          longitude,
          brightness: Number(point.brightness) || 0,
          frp: Number(point.frp) || 0,
          satellite: point.satellite || "",
          instrument: point.instrument || "",
          acqDate: point.acq_date || "",
          acqTime: point.acq_time || "",
          distanceKm: Math.round(distanceKm * 10) / 10,
        };
      })
      .filter(
        (hotspot) =>
          Number.isFinite(hotspot.latitude) &&
          Number.isFinite(hotspot.longitude) &&
          hotspot.distanceKm <= RADIUS_KM,
      )
      .sort((a, b) => b.frp - a.frp);
  }, [data, activeMountain]);

  return {
    fire: { hotspots },
    windowDays: WINDOW_DAYS,
    radiusKm: RADIUS_KM,
    error,
    isLoading,
    refresh: mutate,
  };
}
