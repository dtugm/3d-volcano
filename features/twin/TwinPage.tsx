"use client";

import { type CSSProperties, type ReactNode, useEffect, useState } from "react";

import RightSidebar, { RIGHT_RAIL_ITEMS } from "@/components/right-sidebar";
import { DesignIcon, type IconName } from "@/components/site/DesignIcon";
import { getEpochByCode, getVolcano } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { useTranslation } from "@/lib/i18n";
import { useSim } from "@/lib/sim/store";
import { useTwin } from "@/lib/twin/store";

import CompareView from "./CompareView";
import {
  ComparePanel,
  EpochPanel,
  LayerPanel,
  LEFT_RAIL_ITEMS,
  SearchRow,
  ToolsPanel,
  VolcanoPanel,
} from "./LeftPanels";
import { useMapInstance } from "./map-instance";
import { MapControlsCard, MapStatus, MeasureCard, ScaleCoords, ViewToggle } from "./MapOverlays";
import { SimCard } from "./SimCards";
import TwinMap from "./TwinMap";

const LEFT_WIDTH = 330;
const RIGHT_WIDTH = 350;
const RAIL_WIDTH = 56;

/** Keeps `?e=<epoch code>` in sync with the selection (shareable links). */
function UrlStateSync() {
  const selectEpoch = useTwin((s) => s.selectEpoch);
  const selectVolcano = useTwin((s) => s.selectVolcano);
  const epochCode = useTwin((s) => s.epochCode);
  // Read before the effect below rewrites the URL (effects re-run in dev).
  const [initial] = useState(() => new URLSearchParams(window.location.search));

  useEffect(() => {
    const e = initial.get("e");
    const v = initial.get("v");
    if (e && getEpochByCode(e)) selectEpoch(e);
    else if (v && getVolcano(v)) selectVolcano(v);
  }, [initial, selectEpoch, selectVolcano]);

  useEffect(() => {
    if (!epochCode) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("v");
    url.searchParams.set("e", epochCode);
    window.history.replaceState(null, "", url);
  }, [epochCode]);
  return null;
}

function Rail({
  items,
  side,
  onOpen,
}: {
  items: readonly { id: string; icon: IconName }[];
  side: "left" | "right";
  onOpen: (id?: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <nav className="flex h-full w-14 flex-col items-center gap-1 rounded-[20px] bg-surface p-2">
      <button
        type="button"
        onClick={() => onOpen()}
        aria-label={t.twin.showPanel}
        className="grid size-10 place-items-center rounded-xl bg-line text-ink-body hover:bg-mist"
      >
        <DesignIcon name={side === "left" ? "panelLeftOpen" : "panelRightOpen"} size={18} />
      </button>
      <span className="my-1.5 h-px w-6 bg-mist" />
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onOpen(item.id)}
          className="grid size-10 place-items-center rounded-xl text-muted hover:bg-line"
        >
          <DesignIcon name={item.icon} size={18} />
        </button>
      ))}
    </nav>
  );
}

function SideColumn({
  side,
  open,
  setOpen,
  rail,
  children,
}: {
  side: "left" | "right";
  open: boolean;
  setOpen: (open: boolean) => void;
  rail: readonly { id: string; icon: IconName }[];
  children: ReactNode;
}) {
  const openTo = (id?: string) => {
    setOpen(true);
    if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 450);
  };
  return (
    <aside className={cn("relative min-h-0", side === "left" ? "lg:order-first" : "")}>
      <div
        className={cn(
          "no-scrollbar flex flex-col gap-4 transition-[opacity,translate] duration-300 lg:h-full lg:overflow-y-auto",
          !open && "lg:pointer-events-none lg:opacity-0",
          !open && (side === "left" ? "lg:-translate-x-6" : "lg:translate-x-6"),
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          "absolute inset-y-0 hidden transition-opacity duration-300 lg:block",
          side === "left" ? "left-0" : "right-0",
          open ? "pointer-events-none opacity-0" : "opacity-100 delay-200",
        )}
      >
        <Rail items={rail} side={side} onOpen={openTo} />
      </div>
    </aside>
  );
}

/** Popup slot over the map: one card at a time. */
function PopupSlot() {
  const card = useSim((s) => s.card);
  if (!card) return null;
  return <SimCard />;
}

function MapFrame() {
  const compare = useTwin((s) => s.compare.enabled);
  const setMap = useMapInstance((s) => s.setMap);
  return (
    <div className="twin-map relative order-first h-[72dvh] min-h-[460px] overflow-hidden rounded-[24px] bg-map lg:order-none lg:h-auto lg:min-h-0">
      {compare ? <CompareView key="compare" onReady={setMap} /> : <TwinMap key="single" onReady={setMap} />}
      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="pointer-events-auto absolute top-4 left-4">
          <ViewToggle />
        </div>
        <div className="absolute top-4 left-1/2 -translate-x-1/2 max-sm:top-16">
          <div className="pointer-events-auto">
            <MapStatus />
          </div>
        </div>
        <div className="pointer-events-auto absolute top-4 right-4">
          <MapControlsCard />
        </div>
        <div className="absolute top-[68px] bottom-[72px] left-4 flex max-w-[calc(100%-96px)] flex-col max-sm:right-4">
          <PopupSlot />
        </div>
        <div className="pointer-events-auto absolute right-4 bottom-4 flex flex-col items-end gap-2">
          <MeasureCard />
          {!compare && <ScaleCoords />}
        </div>
      </div>
    </div>
  );
}

export default function TwinPage() {
  const leftOpen = useTwin((s) => s.leftOpen);
  const rightOpen = useTwin((s) => s.rightOpen);
  const setLeftOpen = useTwin((s) => s.setLeftOpen);
  const setRightOpen = useTwin((s) => s.setRightOpen);
  const { t } = useTranslation();

  // Below 1280 px three columns leave the map too narrow: start with the
  // environment column folded into its rail.
  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px) and (max-width: 1279px)").matches) setRightOpen(false);
  }, [setRightOpen]);

  const columns = {
    "--twin-left": `${leftOpen ? LEFT_WIDTH : RAIL_WIDTH}px`,
    "--twin-right": `${rightOpen ? RIGHT_WIDTH : RAIL_WIDTH}px`,
  } as CSSProperties;

  return (
    <div className="h-full overflow-y-auto bg-canvas font-jakarta text-ink lg:overflow-hidden">
      <UrlStateSync />
      <div className="mx-auto flex max-w-[1680px] flex-col gap-4 px-4 pb-4 lg:h-full">
        <div
          style={columns}
          className="grid min-h-0 flex-1 grid-cols-1 gap-4 transition-[grid-template-columns] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:grid-cols-[var(--twin-left)_minmax(0,1fr)_var(--twin-right)]"
        >
          <SideColumn side="left" open={leftOpen} setOpen={setLeftOpen} rail={LEFT_RAIL_ITEMS}>
            <SearchRow onHide={() => setLeftOpen(false)} />
            <VolcanoPanel />
            <EpochPanel />
            <LayerPanel />
            <ComparePanel />
            <ToolsPanel />
          </SideColumn>

          <MapFrame />

          <SideColumn side="right" open={rightOpen} setOpen={setRightOpen} rail={RIGHT_RAIL_ITEMS}>
            <div className="flex items-center justify-between gap-2 px-1 pt-1">
              <h2 className="text-[13px] font-bold tracking-[0.4px] text-muted uppercase">{t.twin.environment}</h2>
              <button
                type="button"
                onClick={() => setRightOpen(false)}
                aria-label={t.twin.hidePanel}
                className="hidden size-8 place-items-center rounded-full text-ink-body hover:bg-brand-soft lg:grid"
              >
                <DesignIcon name="panelRight" size={17} />
              </button>
            </div>
            <RightSidebar />
          </SideColumn>
        </div>
      </div>
    </div>
  );
}
