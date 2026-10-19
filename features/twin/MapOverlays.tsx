"use client";

import { useEffect, useState } from "react";

import { DesignIcon, type IconName } from "@/components/site/DesignIcon";
import { overlayCard } from "@/components/site/ui";
import { cn } from "@/lib/cn";
import { useTranslation } from "@/lib/i18n";
import { useSim } from "@/lib/sim/store";
import { useActiveVolcano, useTwin } from "@/lib/twin/store";

import { useMapInstance } from "./map-instance";
import { HOME_BEARING, HOME_PITCH, HOME_ZOOM } from "./TwinMap";

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Camera state for UI outside the map, throttled to one update per frame. */
function useMapCamera() {
  const map = useMapInstance((s) => s.map);
  const [camera, setCamera] = useState({ lng: 0, lat: 0, zoom: 0, pitch: 0, bearing: 0 });
  useEffect(() => {
    if (!map) return;
    let frame = 0;
    const read = () => {
      frame = 0;
      const c = map.getCenter();
      setCamera({ lng: c.lng, lat: c.lat, zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() });
    };
    const onMove = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    map.on("move", onMove);
    return () => {
      map.off("move", onMove);
      cancelAnimationFrame(frame);
    };
  }, [map]);
  return camera;
}

export function ViewToggle() {
  const { t } = useTranslation();
  const map = useMapInstance((s) => s.map);
  const { pitch } = useMapCamera();
  const threeD = pitch > 5;
  const set = (on: boolean) =>
    map?.easeTo({ pitch: on ? HOME_PITCH : 0, duration: reducedMotion() ? 0 : 600 });
  return (
    <div className={cn(overlayCard, "relative flex h-9 w-[100px] items-center rounded-full p-[3px] text-[13px]")}>
      <span
        className="absolute top-[3px] h-[30px] w-[46px] rounded-full bg-brand transition-[left] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ left: threeD ? 51 : 3 }}
      />
      {[false, true].map((on) => (
        <button
          key={String(on)}
          type="button"
          onClick={() => set(on)}
          aria-pressed={threeD === on}
          className={cn(
            "relative z-10 h-[30px] flex-1 rounded-full",
            threeD === on ? "font-bold text-white" : "font-semibold text-muted hover:text-ink",
          )}
        >
          {on ? t.twin.view3d : t.twin.view2d}
        </button>
      ))}
    </div>
  );
}

function ControlButton({
  icon,
  label,
  onClick,
  active,
  style,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  active?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "grid size-[34px] place-items-center rounded-[10px] transition-colors duration-300",
        active ? "bg-brand-soft text-brand-deep" : "text-ink-body hover:bg-line",
      )}
    >
      <DesignIcon name={icon} size={18} style={style} />
    </button>
  );
}

export function MapControlsCard() {
  const { t } = useTranslation();
  const map = useMapInstance((s) => s.map);
  const volcano = useActiveVolcano();
  const tool = useTwin((s) => s.tool);
  const setTool = useTwin((s) => s.setTool);
  const { bearing } = useMapCamera();
  const duration = reducedMotion() ? 0 : 400;
  return (
    <div className={cn(overlayCard, "flex w-[42px] flex-col items-center gap-0.5 rounded-[14px] py-1")}>
      <ControlButton icon="plus" label="Zoom in" onClick={() => map?.zoomIn({ duration })} />
      <ControlButton icon="minus" label="Zoom out" onClick={() => map?.zoomOut({ duration })} />
      <ControlButton
        icon="compass"
        label="North"
        onClick={() => map?.easeTo({ bearing: 0, duration })}
        style={{ rotate: `${-bearing}deg` }}
      />
      <ControlButton icon="ruler" label={t.twin.ruler} active={tool === "ruler"} onClick={() => setTool("ruler")} />
      <ControlButton
        icon="locate"
        label={volcano.name}
        onClick={() =>
          map?.flyTo({
            center: [volcano.longitude, volcano.latitude],
            zoom: HOME_ZOOM,
            pitch: HOME_PITCH,
            bearing: HOME_BEARING,
            duration: reducedMotion() ? 0 : 1600,
          })
        }
      />
    </div>
  );
}

/** White pill with a spinner and optional progress bar. */
function LoadingPill({ label, progress }: { label: string; progress?: number }) {
  return (
    <div className="flex animate-pop-in items-center gap-2.5 rounded-full bg-surface px-3.5 py-2 text-[12px] font-semibold text-ink shadow-[var(--site-float)]">
      <span className="size-3.5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      {label}
      {progress !== undefined && (
        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-line">
          <span
            className="block h-full bg-brand transition-[width] duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </span>
      )}
    </div>
  );
}

/** Dark hint pill with an optional close dot. */
function HintPill({ icon, label, onClose }: { icon: IconName; label: string; onClose?: () => void }) {
  return (
    <div className="flex h-[31px] animate-pop-in items-center gap-2 rounded-full bg-hint px-3.5 text-[12px] font-semibold whitespace-nowrap text-white backdrop-blur">
      <DesignIcon name={icon} size={14} />
      {label}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Batal"
          className="-mr-2 grid size-6 place-items-center rounded-full bg-white/15 hover:bg-white/25"
        >
          <DesignIcon name="xSmall" size={11} />
        </button>
      )}
    </div>
  );
}

export function MapStatus() {
  const { t } = useTranslation();
  const splat = useTwin((s) => s.splat);
  const splatOn = useTwin((s) => s.layers.splat || (s.compare.enabled && s.compare.mode === "splat"));
  const tool = useTwin((s) => s.tool);
  const setTool = useTwin((s) => s.setTool);
  const setLayer = useTwin((s) => s.setLayer);
  const picking = useSim((s) => s.picking);
  const setPicking = useSim((s) => s.setPicking);
  const computing = useSim((s) => s.status === "computing");

  return (
    <div className="flex flex-col items-center gap-2">
      {picking && <HintPill icon="target" label={t.twin.lahar.pickHint} onClose={() => setPicking(false)} />}
      {tool !== "none" && !picking && (
        <HintPill icon="ruler" label={t.twin.measureHint} onClose={() => setTool(tool)} />
      )}
      {computing && <LoadingPill label={t.twin.lahar.computing} />}
      {splatOn && splat.loading && <LoadingPill label={t.twin.loadingSplat} progress={splat.progress} />}
      {splatOn && splat.error === "unplaced" && (
        <HintPill icon="eye" label={t.twin.splatUnplaced} onClose={() => setLayer("splat", false)} />
      )}
    </div>
  );
}

const NICE = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

export function ScaleCoords() {
  const { lng, lat, zoom } = useMapCamera();
  const metresPerPx = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);
  const distance = [...NICE].reverse().find((d) => d / metresPerPx <= 72) ?? 1;
  const width = distance / metresPerPx;
  return (
    <div className={cn(overlayCard, "flex h-10 items-center gap-3 rounded-[14px] px-3.5")}>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10.5px] font-semibold text-ink tabular-nums">
          {distance >= 1000 ? `${distance / 1000} km` : `${distance} m`}
        </span>
        <span className="h-[3px] rounded-[2px] bg-ink" style={{ width }} />
      </div>
      <span className="text-[12px] font-medium text-muted tabular-nums">
        {lat.toFixed(4)}, {lng.toFixed(4)}
      </span>
    </div>
  );
}

/** Live result of the ruler / height tools. */
export function MeasureCard() {
  const { t } = useTranslation();
  const tool = useTwin((s) => s.tool);
  const value = useTwin((s) => s.measurement.value);
  if (tool === "none" || value === null) return null;
  return (
    <div className={cn(overlayCard, "flex animate-pop-in items-center gap-3 px-3.5 py-2")}>
      <DesignIcon name="ruler" size={16} className="text-brand" />
      <div>
        <div className="text-[10.5px] text-muted">{tool === "depth" ? t.twin.heightDiff : t.twin.distance}</div>
        <div className="text-[15px] font-extrabold text-ink tabular-nums">
          {value >= 1000 ? `${(value / 1000).toFixed(2)} km` : `${Math.round(value)} m`}
        </div>
      </div>
    </div>
  );
}
