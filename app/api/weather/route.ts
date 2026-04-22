import { NextRequest, NextResponse } from "next/server";

import type { AltitudeLayer } from "@/lib/types/api";

// Pressure levels and their approximate altitudes
const PRESSURE_LEVELS = [
  { hPa: 1000, altM: 100 },
  { hPa: 850, altM: 1500 },
  { hPa: 700, altM: 3000 },
  { hPa: 500, altM: 5500 },
] as const;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon || isNaN(Number(lat)) || isNaN(Number(lon))) {
    return NextResponse.json(
      { error: "Valid lat and lon query parameters are required" },
      { status: 400 },
    );
  }

  try {
    const pressureVars = PRESSURE_LEVELS.map((p) => p.hPa);
    const hourlyParams = [
      ...pressureVars.flatMap((hPa) => [
        `temperature_${hPa}hPa`,
        `wind_speed_${hPa}hPa`,
        `wind_direction_${hPa}hPa`,
        `relative_humidity_${hPa}hPa`,
        `cloud_cover_${hPa}hPa`,
      ]),
      "weather_code",
    ].join(",");

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${hourlyParams}&forecast_days=1&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: 600 } });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Open-Meteo API error: ${res.statusText}` },
        { status: 502 },
      );
    }

    const raw = await res.json();
    const hourly = raw.hourly || {};
    const times: string[] = hourly.time || [];

    // Find the closest hour to now
    const now = new Date();
    let closestIdx = 0;
    let closestDiff = Infinity;
    for (let i = 0; i < times.length; i++) {
      const diff = Math.abs(new Date(times[i]).getTime() - now.getTime());
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIdx = i;
      }
    }

    // Surface layer uses the overall weather_code directly
    const surfaceWeatherCode: number =
      hourly.weather_code?.[closestIdx] ?? 0;

    const layers: AltitudeLayer[] = PRESSURE_LEVELS.map((p) => {
      const cloudCover: number =
        hourly[`cloud_cover_${p.hPa}hPa`]?.[closestIdx] ?? 0;

      // For surface, use actual weather_code; for upper levels, derive from cloud cover + humidity
      let weatherCode: number;
      if (p.hPa === 1000) {
        weatherCode = surfaceWeatherCode;
      } else {
        const humidity: number =
          hourly[`relative_humidity_${p.hPa}hPa`]?.[closestIdx] ?? 0;
        weatherCode = deriveWeatherCode(cloudCover, humidity);
      }

      return {
        pressureHpa: p.hPa,
        approxAltitudeM: p.altM,
        temperature: hourly[`temperature_${p.hPa}hPa`]?.[closestIdx] ?? 0,
        windSpeed: hourly[`wind_speed_${p.hPa}hPa`]?.[closestIdx] ?? 0,
        windDirection:
          hourly[`wind_direction_${p.hPa}hPa`]?.[closestIdx] ?? 0,
        humidity: hourly[`relative_humidity_${p.hPa}hPa`]?.[closestIdx] ?? 0,
        weatherCode,
      };
    });

    return NextResponse.json(
      {
        elevation: raw.elevation || 0,
        layers,
      },
      {
        headers: {
          "Cache-Control": "s-maxage=600, stale-while-revalidate=60",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch altitude weather data" },
      { status: 502 },
    );
  }
}

// Derive WMO weather code from cloud cover and humidity
function deriveWeatherCode(cloudCover: number, humidity: number): number {
  // WMO codes: 0=clear, 1=mainly clear, 2=partly cloudy, 3=overcast
  // 51=light drizzle, 61=slight rain, 71=slight snow
  if (humidity > 95 && cloudCover > 80) return 61; // rain likely
  if (humidity > 90 && cloudCover > 60) return 51; // drizzle
  if (cloudCover > 80) return 3; // overcast
  if (cloudCover > 50) return 2; // partly cloudy
  if (cloudCover > 20) return 1; // mainly clear
  return 0; // clear
}
