"use client";

import type { Map as MapLibreMap } from "maplibre-gl";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";

import { basemapStyle, MapView, useMapContext } from "@/components/map";
import type { Epoch } from "@/lib/catalog";
import { useTranslation } from "@/lib/i18n";
import { useSim } from "@/lib/sim/store";
import { useActiveEpoch, useActiveVolcano, useTwin } from "@/lib/twin/store";

import LstLayer from "./LstLayer";
import OrthoLayer from "./OrthoLayer";
import { CraterLayer, LaharLayers, MeasureLayers } from "./SimLayers";
import TerrainLayer from "./TerrainLayer";

// ~2.3 MB of splat renderer: only fetched when the layer is switched on.
const GaussianSplatLayer = dynamic(() => import("./GaussianSplatLayer"), { ssr: false });

export const HOME_ZOOM = 13.2;
export const HOME_PITCH = 62;
export const HOME_BEARING = -20;

export function useBasemapStyle() {
  const basemap = useTwin((s) => s.basemap);
  const { resolvedTheme } = useTheme();
  return useMemo(
    () => basemapStyle(basemap, resolvedTheme === "dark" ? "dark" : "light"),
    [basemap, resolvedTheme],
  );
}

/** Flies to the volcano when it changes (not on the first render). */
function FollowVolcano() {
  const { map } = useMapContext();
  const volcano = useActiveVolcano();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    map.flyTo({
      center: [volcano.longitude, volcano.latitude],
      zoom: HOME_ZOOM,
      pitch: HOME_PITCH,
      bearing: HOME_BEARING,
      duration: 2200,
      essential: true,
    });
  }, [map, volcano]);
  return null;
}

/** Data layers for one epoch: terrain, imagery and splats. */
export function EpochLayers({
  epoch,
  showOrtho,
  showSplat,
  idSuffix = "",
  reportSplat = true,
}: {
  epoch: Epoch | undefined;
  showOrtho: boolean;
  showSplat: boolean;
  idSuffix?: string;
  reportSplat?: boolean;
}) {
  const sources = epoch?.sources;
  const heightOffset = useActiveVolcano().heightOffset;
  return (
    <>
      <TerrainLayer dtmBase={sources?.terrain} />
      {sources?.ortho && <OrthoLayer url={sources.ortho} visible={showOrtho} idSuffix={idSuffix} />}
      {showSplat && sources?.splat && (
        <GaussianSplatLayer
          key={sources.splat}
          url={sources.splat}
          heightOffset={-(heightOffset ?? 0)}
          adjust={epoch?.splatAdjust}
          layerId={`dt:gaussian-splat${idSuffix}`}
          reportStatus={reportSplat}
        />
      )}
    </>
  );
}

export default function TwinMap({ onReady }: { onReady?: (map: MapLibreMap) => void }) {
  const { t } = useTranslation();
  const volcano = useActiveVolcano();
  const epoch = useActiveEpoch();
  const layers = useTwin((s) => s.layers);
  const style = useBasemapStyle();

  const laharShown = useSim((s) => s.result !== null);

  // Read once: the map is created with the volcano in view.
  const [options] = useState(() => ({
    center: [volcano.longitude, volcano.latitude] as [number, number],
    zoom: HOME_ZOOM,
    pitch: HOME_PITCH,
    bearing: HOME_BEARING,
    maxPitch: 80,
    minZoom: 4,
    maxZoom: 20,
    fadeDuration: 120,
  }));

  return (
    <MapView style={style} options={options} onReady={onReady}>
      {/* The splat draws in its own canvas over the map and would hide the lava. */}
      <EpochLayers epoch={epoch} showOrtho={layers.ortho} showSplat={layers.splat && !laharShown} />
      <LstLayer />
      <CraterLayer />
      <MeasureLayers />
      <LaharLayers startLabel={t.twin.lahar.start} removeLabel={t.twin.lahar.clearStart} />
      <FollowVolcano />
    </MapView>
  );
}
