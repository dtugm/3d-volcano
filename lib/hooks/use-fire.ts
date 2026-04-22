import useSWR from "swr";

import type { FireData } from "@/lib/types/api";
import { useVolcano } from "@/lib/volcano";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  });

export function useFire() {
  const { activeMountain } = useVolcano();

  const { data, error, isLoading, mutate } = useSWR<FireData>(
    activeMountain
      ? `/api/fire?lat=${activeMountain.latitude}&lon=${activeMountain.longitude}`
      : null,
    fetcher,
    { refreshInterval: 600_000 },
  );

  return { fire: data, error, isLoading, refresh: mutate };
}
