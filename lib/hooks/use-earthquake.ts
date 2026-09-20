import { useMemo } from "react";
import useSWR from "swr";

import type { EarthquakeResponse } from "@/lib/sensor-api";
import {
  haversineKm,
  lastDays,
  sensorApiFetcher,
  sensorApiUrl,
} from "@/lib/sensor-api";
import type { EarthquakeEvent } from "@/lib/types/api";
import { useVolcano } from "@/lib/volcano";

const WINDOW_DAYS = 30;
// The regional radius the backend itself defaults to; 250 km around Agung
// returns nothing in a typical month, which makes the panel look broken.
const MAX_RADIUS_KM = 500;
const MIN_MAGNITUDE = 2.0;
const LIMIT = 50;

export function useEarthquake() {
  const { activeMountain } = useVolcano();

  // Recomputed once per day so the SWR key stays stable between renders.
  const [startDate, endDate] = useMemo(() => lastDays(WINDOW_DAYS), []);

  const { data, error, isLoading, mutate } = useSWR<EarthquakeResponse>(
    activeMountain
      ? sensorApiUrl("/earthquake", {
          start_date: startDate,
          end_date: endDate,
          min_magnitude: MIN_MAGNITUDE,
          center_lat: activeMountain.latitude,
          center_lon: activeMountain.longitude,
          max_radius_km: MAX_RADIUS_KM,
          limit: LIMIT,
        })
      : null,
    sensorApiFetcher,
    { refreshInterval: 600_000 },
  );

  const events = useMemo<EarthquakeEvent[]>(() => {
    if (!data?.features || !activeMountain) return [];
    return data.features
      .map((feature) => {
        const [longitude, latitude, depthKm] = feature.geometry.coordinates;
        return {
          id: feature.id,
          magnitude: feature.properties.mag ?? 0,
          magType: feature.properties.magType ?? "",
          place: feature.properties.place ?? "",
          time: feature.properties.time ?? 0,
          url: feature.properties.url ?? "",
          latitude,
          longitude,
          depthKm: depthKm ?? 0,
          distanceKm:
            Math.round(
              haversineKm(
                activeMountain.latitude,
                activeMountain.longitude,
                latitude,
                longitude,
              ) * 10,
            ) / 10,
        };
      })
      .sort((a, b) => b.time - a.time);
  }, [data, activeMountain]);

  return {
    events,
    windowDays: WINDOW_DAYS,
    radiusKm: MAX_RADIUS_KM,
    error,
    isLoading,
    refresh: mutate,
  };
}
