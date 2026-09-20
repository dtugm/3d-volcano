/** Great-circle distance between two WGS84 points, in kilometres. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Formats a Date as the YYYY-MM-DD string the sensor API expects. */
export function toApiDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** [start, end] covering the last `days` days, ending today. */
export function lastDays(days: number): [string, string] {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return [toApiDate(start), toApiDate(end)];
}
