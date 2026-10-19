"use client";

import type { Map as MapLibreMap } from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";

import { MapView } from "@/components/map";
import { useTranslation } from "@/lib/i18n";
import { useActiveVolcano, useEpoch, useTwin } from "@/lib/twin/store";
import { formatTimeKey } from "@/lib/volcano";

import { EpochLayers, HOME_BEARING, HOME_PITCH, HOME_ZOOM, useBasemapStyle } from "./TwinMap";

/**
 * Swipe comparison: two maps on top of each other, the right one clipped at
 * the divider, with their cameras kept in lock-step.
 */
export default function CompareView({ onReady }: { onReady?: (map: MapLibreMap) => void }) {
  const { locale } = useTranslation();
  const volcano = useActiveVolcano();
  const compare = useTwin((s) => s.compare);
  const setCompare = useTwin((s) => s.setCompare);
  const left = useEpoch(compare.left);
  const right = useEpoch(compare.right);
  const style = useBasemapStyle();
  const [maps, setMaps] = useState<{ left: MapLibreMap | null; right: MapLibreMap | null }>({
    left: null,
    right: null,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Read once by MapView.
  const [options] = useState(() => ({
    center: [volcano.longitude, volcano.latitude] as [number, number],
    zoom: HOME_ZOOM,
    pitch: HOME_PITCH,
    bearing: HOME_BEARING,
    maxPitch: 80,
    fadeDuration: 0,
  }));

  // Camera sync: whichever map the user moves drives the other.
  useEffect(() => {
    const { left: a, right: b } = maps;
    if (!a || !b) return;
    let syncing = false;
    const follow = (source: MapLibreMap, target: MapLibreMap) => () => {
      if (syncing) return;
      syncing = true;
      target.jumpTo({
        center: source.getCenter(),
        zoom: source.getZoom(),
        bearing: source.getBearing(),
        pitch: source.getPitch(),
      });
      syncing = false;
    };
    const fromA = follow(a, b);
    const fromB = follow(b, a);
    a.on("move", fromA);
    b.on("move", fromB);
    fromA();
    return () => {
      a.off("move", fromA);
      b.off("move", fromB);
    };
  }, [maps]);

  const onLeftReady = useCallback(
    (map: MapLibreMap) => {
      setMaps((m) => ({ ...m, left: map }));
      onReady?.(map);
    },
    [onReady],
  );
  const onRightReady = useCallback((map: MapLibreMap) => setMaps((m) => ({ ...m, right: map })), []);

  const dragging = useRef(false);
  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setCompare({ split: Math.max(0.02, Math.min(0.98, (e.clientX - rect.left) / rect.width)) });
    },
    [setCompare],
  );
  useEffect(() => {
    const up = () => (dragging.current = false);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", up);
    };
  }, [onPointerMove]);

  const splat = compare.mode === "splat";
  const label = (date?: string) => (date ? formatTimeKey(date, locale) : "—");

  return (
    <div ref={containerRef} className="absolute inset-0">
      <MapView style={style} options={options} onReady={onLeftReady}>
        <EpochLayers epoch={left} showOrtho={!splat} showSplat={splat} idSuffix="-l" />
      </MapView>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${compare.split * 100}%)` }}>
        <MapView style={style} options={options} onReady={onRightReady}>
          <EpochLayers epoch={right} showOrtho={!splat} showSplat={splat} idSuffix="-r" reportSplat={false} />
        </MapView>
      </div>

      {/* Divider */}
      <div
        className="absolute top-0 bottom-0 z-10 w-8 -translate-x-1/2 cursor-col-resize touch-none"
        style={{ left: `${compare.split * 100}%` }}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
      >
        <div className="absolute top-0 bottom-0 left-1/2 w-[3px] -translate-x-1/2 bg-white shadow-[0_0_6px_rgba(0,0,0,0.45)]" />
        <div className="absolute top-1/2 left-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#2d3a4b] shadow-[var(--site-float)]">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M5 3 1 7l4 4M9 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Epoch labels */}
      <div
        className="pointer-events-none absolute bottom-4 z-10 flex -translate-x-full items-center gap-1.5 pr-4"
        style={{ left: `${compare.split * 100}%` }}
      >
        <span className="rounded-full bg-hint px-3 py-1 text-[12px] font-semibold whitespace-nowrap text-white backdrop-blur">
          {left?.code} · {label(left?.date)}
        </span>
      </div>
      <div
        className="pointer-events-none absolute bottom-4 z-10 flex items-center gap-1.5 pl-4"
        style={{ left: `${compare.split * 100}%` }}
      >
        <span className="rounded-full bg-hint px-3 py-1 text-[12px] font-semibold whitespace-nowrap text-white backdrop-blur">
          {right?.code} · {label(right?.date)}
        </span>
      </div>
    </div>
  );
}
