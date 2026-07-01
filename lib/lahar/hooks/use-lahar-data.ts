"use client";

import type { FeatureCollection, LineString, Point, Polygon } from "geojson";
import useSWR from "swr";

import type { HeightmapMeta, LaharDataRef, LSPCandidate } from "../types";

export interface LaharDataBundle {
  mainstem: FeatureCollection<LineString>;
  branches: FeatureCollection<LineString>;
  deposition: FeatureCollection<Polygon>;
  hazardCone: FeatureCollection<Polygon>;
  lspCandidates: LSPCandidate[];
  heightmapMeta: HeightmapMeta;
  heightmapUrl: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json() as Promise<T>;
}

function asCandidates(fc: FeatureCollection<Point>): LSPCandidate[] {
  return fc.features.map((f) => {
    const p = f.properties ?? {};
    const [lng, lat] = f.geometry.coordinates;
    return {
      lspId: String(p.lspId),
      streamId: String(p.streamId),
      lng,
      lat,
      elevation: Number(p.elevation ?? 0),
      slv: {
        min: Number(p.slvMin ?? 0),
        likely: Number(p.slvLikely ?? 0),
        max: Number(p.slvMax ?? 0),
      },
    };
  });
}

export function useLaharData(ref?: LaharDataRef) {
  return useSWR(ref ? ["laharData", ref.baseUrl] : null, async () => {
    if (!ref) throw new Error("no lahar data");
    const base = ref.baseUrl.replace(/\/$/, "");
    const [mainstem, branches, deposition, hazardCone, lspCands, meta] =
      await Promise.all([
        fetchJson<FeatureCollection<LineString>>(`${base}/${ref.mainstem}`),
        fetchJson<FeatureCollection<LineString>>(`${base}/${ref.branches ?? "branches.geojson"}`),
        fetchJson<FeatureCollection<Polygon>>(`${base}/${ref.deposition}`),
        fetchJson<FeatureCollection<Polygon>>(`${base}/${ref.hazardCone}`),
        fetchJson<FeatureCollection<Point>>(`${base}/${ref.lspCandidates}`),
        fetchJson<HeightmapMeta>(`${base}/${ref.heightmapMeta}`),
      ]);
    return {
      mainstem,
      branches,
      deposition,
      hazardCone,
      lspCandidates: asCandidates(lspCands),
      heightmapMeta: meta,
      heightmapUrl: `${base}/${ref.heightmap}`,
    } satisfies LaharDataBundle;
  });
}
