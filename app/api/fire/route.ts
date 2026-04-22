import { NextRequest, NextResponse } from "next/server";

import type { Hotspot } from "@/lib/types/api";

function haversineKm(
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

function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    if (values.length !== headers.length) continue;
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx];
    });
    rows.push(row);
  }

  return rows;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const radiusKm = Number(searchParams.get("radius") || "50");

  if (!lat || !lon || isNaN(Number(lat)) || isNaN(Number(lon))) {
    return NextResponse.json(
      { error: "Valid lat and lon query parameters are required" },
      { status: 400 },
    );
  }

  const mapKey = process.env.FIRMS_MAP_KEY;
  if (!mapKey) {
    return NextResponse.json(
      { error: "FIRMS_MAP_KEY is not configured" },
      { status: 500 },
    );
  }

  try {
    const latNum = Number(lat);
    const lonNum = Number(lon);
    // Convert radius to approximate degree delta for bounding box
    const delta = radiusKm / 111;
    const west = lonNum - delta;
    const south = latNum - delta;
    const east = lonNum + delta;
    const north = latNum + delta;

    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/VIIRS_SNPP_NRT/${west},${south},${east},${north}/1`;
    const res = await fetch(url, { next: { revalidate: 600 } });

    if (!res.ok) {
      return NextResponse.json(
        { error: `NASA FIRMS API error: ${res.statusText}` },
        { status: 502 },
      );
    }

    const csvText = await res.text();
    const rows = parseCsv(csvText);

    const hotspots: Hotspot[] = rows
      .map((row) => {
        const hotLat = Number(row.latitude);
        const hotLon = Number(row.longitude);
        const dist = haversineKm(latNum, lonNum, hotLat, hotLon);

        if (dist > radiusKm) return null;

        return {
          latitude: hotLat,
          longitude: hotLon,
          brightness: Number(row.bright_ti4 || row.brightness) || 0,
          frp: Number(row.frp) || 0,
          confidence: row.confidence || "unknown",
          satellite: row.satellite || "VIIRS",
          acqDate: row.acq_date || "",
          acqTime: row.acq_time || "",
          daynight: row.daynight || "",
          distanceKm: Math.round(dist * 10) / 10,
        };
      })
      .filter((h): h is Hotspot => h !== null)
      .sort((a, b) => b.frp - a.frp);

    return NextResponse.json(
      { hotspots },
      {
        headers: {
          "Cache-Control": "s-maxage=600, stale-while-revalidate=60",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch fire data" },
      { status: 502 },
    );
  }
}
