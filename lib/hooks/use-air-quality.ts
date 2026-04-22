import useSWR from "swr";

import type { AirQualityData } from "@/lib/types/api";
import { useVolcano } from "@/lib/volcano";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  });

export function useAirQuality() {
  const { activeMountain } = useVolcano();

  const { data, error, isLoading, mutate } = useSWR<AirQualityData>(
    activeMountain
      ? `/api/air-quality?lat=${activeMountain.latitude}&lon=${activeMountain.longitude}`
      : null,
    fetcher,
    { refreshInterval: 600_000 },
  );

  return { airQuality: data, error, isLoading, refresh: mutate };
}
