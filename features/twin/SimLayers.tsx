"use client";

import { useEffect, useLayoutEffect, useMemo } from "react";

import {
  isMapAlive,
  MapLayer,
  MapMarker,
  MapSource,
  SourceContext,
  useExclusiveClick,
  useMapContext,
} from "@/components/map";
import { DesignIcon } from "@/components/site/DesignIcon";
import type { LaharzResponse } from "@/lib/sim/laharz.worker";
import { useSim } from "@/lib/sim/store";
import { useActiveVolcano, useTwin } from "@/lib/twin/store";

import { buildLavaField } from "./lava/lava-field";
import { LavaRenderer } from "./lava/lava-renderer";

/**
 * Legend colours per zone, matching the lava ramp: upper-CL (largest, least
 * likely) cooled crust → lower-CL (most likely) incandescent core.
 */
export const LAHAR_ZONE_COLORS: [number, number, number][] = [
  [158, 32, 6],
  [255, 106, 20],
  [255, 206, 92],
];

const SOURCE_ID = "dt:lahar";
/** The front runs slightly past 1 so the last cells are fully revealed. */
const FRONT_END = 1.04;

/** Animated, glowing lava draped on the terrain via a `canvas` source. */
function LavaFlow({ result }: { result: LaharzResponse }) {
  const { map, ready, styleRevision } = useMapContext();
  const lava = useMemo(() => new LavaRenderer(buildLavaField(result)), [result]);

  useLayoutEffect(() => {
    if (!ready) return;
    lava.render(0, 0);
    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, { type: "canvas", canvas: lava.canvas, animate: true, coordinates: lava.coordinates } as never);
    }
    return () => {
      if (!isMapAlive(map) || !map.getSource(SOURCE_ID)) return;
      if (map.getLayer(SOURCE_ID)) map.removeLayer(SOURCE_ID);
      map.removeSource(SOURCE_ID);
    };
  }, [map, ready, styleRevision, lava]);

  useEffect(() => {
    let frame = 0;
    const startedAt = performance.now();
    const loop = (now: number) => {
      lava.render((now - startedAt) / 1000, useSim.getState().progress * FRONT_END);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      lava.dispose();
    };
  }, [lava]);

  if (!ready) return null;
  return (
    <SourceContext value={{ id: SOURCE_ID, key: `${styleRevision}|${SOURCE_ID}|${result.id}` }}>
      <MapLayer
        id={SOURCE_ID}
        type="raster"
        slot="overlay"
        paint={{ "raster-fade-duration": 0, "raster-resampling": "linear" }}
      />
    </SourceContext>
  );
}

function VentPin({
  lngLat,
  label,
  onRemove,
  removeLabel,
}: {
  lngLat: [number, number];
  label: string;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  return (
    <MapMarker lngLat={lngLat}>
      <div className="flex flex-col items-center">
        <span className="flex items-center gap-1 rounded-full bg-hint py-0.5 pl-2 text-[10.5px] font-semibold whitespace-nowrap text-white backdrop-blur pr-2 has-[button]:pr-0.5">
          {label}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              aria-label={removeLabel}
              title={removeLabel}
              className="grid size-4 place-items-center rounded-full bg-white/15 transition-colors hover:bg-white/35"
            >
              <DesignIcon name="xSmall" size={9} />
            </button>
          )}
        </span>
        <span className="mt-1 size-3.5 rounded-full border-2 border-white bg-[#c2410c] shadow-[0_0_0_4px_rgba(194,65,12,0.3)]" />
      </div>
    </MapMarker>
  );
}

/** Numbered secondary-lahar sources, largest first. */
function SourcePin({ lngLat, n }: { lngLat: [number, number]; n: number }) {
  return (
    <MapMarker lngLat={lngLat}>
      <span className="grid size-5 place-items-center rounded-full border-2 border-white bg-[#c2410c] text-[10px] font-bold text-white shadow-[0_0_0_4px_rgba(194,65,12,0.3)]">
        {n}
      </span>
    </MapMarker>
  );
}

export function LaharLayers({ startLabel, removeLabel }: { startLabel: string; removeLabel: string }) {
  const picking = useSim((s) => s.picking);
  const pick = useSim((s) => s.pick);
  const clearStart = useSim((s) => s.clearStart);
  const mode = useSim((s) => s.lahar.mode);
  const start = useSim((s) => s.lahar.start);
  const result = useSim((s) => s.result);

  useExclusiveClick((e) => pick([e.lngLat.lng, e.lngLat.lat]), picking);

  const sources = result?.kind === "secondary" ? result.sources.filter((p) => p.simulated) : [];
  const vent = mode === "primary" ? (result?.kind === "primary" ? result.start : start) : null;
  return (
    <>
      {result && <LavaFlow result={result} />}
      {vent && <VentPin lngLat={vent} label={startLabel} onRemove={clearStart} removeLabel={removeLabel} />}
      {sources.map((p, i) => (
        <SourcePin key={p.lngLat.join()} lngLat={p.lngLat} n={i + 1} />
      ))}
    </>
  );
}

/** Ruler / height-difference picking and drawing. */
export function MeasureLayers() {
  const { map } = useMapContext();
  const tool = useTwin((s) => s.tool);
  const points = useTwin((s) => s.measurement.points);
  const add = useTwin((s) => s.addMeasurePoint);

  useExclusiveClick((e) => {
    const h = map.queryTerrainElevation(e.lngLat) ?? 0;
    add([e.lngLat.lng, e.lngLat.lat, h]);
  }, tool !== "none");

  const data = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features:
        points.length === 2
          ? [
              {
                type: "Feature" as const,
                properties: {},
                geometry: { type: "LineString" as const, coordinates: points.map((p) => [p[0], p[1]]) },
              },
            ]
          : [],
    }),
    [points],
  );

  if (tool === "none" && points.length === 0) return null;
  return (
    <>
      <MapSource id="dt:measure" source={{ type: "geojson", data }}>
        <MapLayer
          id="dt:measure-line"
          type="line"
          slot="top"
          paint={{ "line-color": "#ffd43b", "line-width": 3, "line-dasharray": [2, 1.5] }}
        />
      </MapSource>
      {points.map((p, i) => (
        <MapMarker key={`${i}-${p[0]}`} lngLat={[p[0], p[1]]}>
          <span className="grid size-6 place-items-center rounded-full border-2 border-white bg-[#f59f00] text-[11px] font-bold text-white shadow">
            {i === 0 ? "A" : "B"}
          </span>
        </MapMarker>
      ))}
    </>
  );
}

/** Crater lake / lava dome fill level as a circle draped on the terrain. */
export function CraterLayer() {
  const volcano = useActiveVolcano();
  const crater = useTwin((s) => s.crater);
  const details = volcano.craterDetails;

  const data = useMemo(() => {
    if (!details) return null;
    const { floorElevation, rimElevation, minRadius, maxRadius, craterCenter } = details;
    const fraction = Math.max(0, Math.min(1, (crater.level - floorElevation) / (rimElevation - floorElevation)));
    const radius = minRadius + fraction * (maxRadius - minRadius);
    const lat = craterCenter.latitude;
    const kx = 111320 * Math.cos((lat * Math.PI) / 180);
    const ring: [number, number][] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      ring.push([craterCenter.longitude + (Math.cos(a) * radius) / kx, lat + (Math.sin(a) * radius) / 110540]);
    }
    return {
      type: "FeatureCollection" as const,
      features: [{ type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [ring] } }],
    };
  }, [details, crater.level]);

  if (!crater.enabled || !data) return null;
  const color = crater.fill === "water" ? "#22b8cf" : "#fd7e14";
  return (
    <MapSource id="dt:crater" source={{ type: "geojson", data }}>
      <MapLayer id="dt:crater-fill" type="fill" slot="overlay" paint={{ "fill-color": color, "fill-opacity": 0.45 }} />
      <MapLayer id="dt:crater-edge" type="line" slot="overlay" paint={{ "line-color": color, "line-width": 2 }} />
    </MapSource>
  );
}
