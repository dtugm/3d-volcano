import useSWR from "swr";

import type { AltitudeWeatherData } from "@/lib/types/api";
import { useVolcano } from "@/lib/volcano";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  });

export function useWeather() {
  const { activeMountain } = useVolcano();

  const { data, error, isLoading, mutate } = useSWR<AltitudeWeatherData>(
    activeMountain
      ? `/api/weather?lat=${activeMountain.latitude}&lon=${activeMountain.longitude}`
      : null,
    fetcher,
    { refreshInterval: 600_000 },
  );

  return { weather: data, error, isLoading, refresh: mutate };
}
