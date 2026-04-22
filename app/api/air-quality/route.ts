import { NextRequest, NextResponse } from "next/server";

const AQI_LABELS = ["Good", "Fair", "Moderate", "Poor", "Very Poor"];

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

  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENWEATHERMAP_API_KEY is not configured" },
      { status: 500 },
    );
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 600 } });

    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenWeatherMap Air Pollution API error: ${res.statusText}` },
        { status: 502 },
      );
    }

    const raw = await res.json();
    const entry = raw.list?.[0];

    if (!entry) {
      return NextResponse.json(
        { error: "No air quality data available" },
        { status: 502 },
      );
    }

    const aqi = entry.main?.aqi || 1;
    const c = entry.components || {};

    const data = {
      aqi,
      aqiLabel: AQI_LABELS[aqi - 1] || "Unknown",
      co: c.co || 0,
      no: c.no || 0,
      no2: c.no2 || 0,
      o3: c.o3 || 0,
      so2: c.so2 || 0,
      pm25: c.pm2_5 || 0,
      pm10: c.pm10 || 0,
      nh3: c.nh3 || 0,
    };

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "s-maxage=600, stale-while-revalidate=60",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch air quality data" },
      { status: 502 },
    );
  }
}
