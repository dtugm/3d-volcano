"use client";

import { useEffect, useRef, useState } from "react";

import { DesignIcon, type IconName } from "@/components/site/DesignIcon";
import { Panel, Pill, Segmented, Slider, Switch, ToggleRow } from "@/components/site/ui";
import { searchVolcanoes, VOLCANOES } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { useLst } from "@/lib/hooks/use-lst";
import { useTranslation } from "@/lib/i18n";
import { SIM_ACCENTS, type SimKind, useSim } from "@/lib/sim/store";
import { type Basemap, type LayerKey, useActiveEpoch, useActiveVolcano, useTwin } from "@/lib/twin/store";
import { formatTimeKey } from "@/lib/volcano";

import { SIM_ICONS } from "./SimCards";

// ---------------------------------------------------------------- search

export function SearchRow({ onHide }: { onHide?: () => void }) {
  const { t } = useTranslation();
  const selectVolcano = useTwin((s) => s.selectVolcano);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const results = searchVolcanoes(query);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <div ref={boxRef} className="relative min-w-0 flex-1">
        <label className="flex h-11 items-center gap-2.5 rounded-full bg-surface pr-3 pl-4 focus-within:shadow-[0_0_0_3px_var(--site-brand-soft)]">
          <DesignIcon name="search" size={16} className="text-subtle" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={t.twin.search}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-subtle"
          />
        </label>
        {open && (
          <div className="absolute inset-x-0 top-[calc(100%+6px)] z-40 animate-pop-in rounded-2xl bg-surface p-1.5 shadow-[0_20px_50px_-20px_rgba(43,24,14,0.5)] ring-1 ring-line">
            {results.length === 0 && <p className="px-3 py-2 text-[13px] text-muted">{t.twin.noResults}</p>}
            {results.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  selectVolcano(v.id);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-brand-soft"
              >
                <span className="font-mono text-[11px] font-bold text-subtle">{v.indexCode}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-ink">{v.name}</span>
                  <span className="block truncate text-[11.5px] text-muted">
                    {v.code} · {v.province} · {v.epochs.length} epoch
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {onHide && (
        <button
          type="button"
          onClick={onHide}
          aria-label={t.twin.hidePanel}
          className="hidden size-11 shrink-0 place-items-center rounded-full bg-surface text-ink-body hover:bg-brand-soft lg:grid"
        >
          <DesignIcon name="panelLeft" size={18} />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- volcano

export function VolcanoPanel() {
  const { t } = useTranslation();
  const active = useActiveVolcano();
  const selectVolcano = useTwin((s) => s.selectVolcano);
  return (
    <Panel
      id="panel-volcano"
      title={t.twin.volcano}
      aside={<span className="text-[11.5px] font-semibold text-subtle">{VOLCANOES.length} terindeks</span>}
    >
      <div className="flex flex-col gap-1.5">
        {VOLCANOES.map((v) => {
          const on = v.id === active.id;
          return (
            <button
              key={v.id}
              type="button"
              aria-pressed={on}
              onClick={() => selectVolcano(v.id)}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-[background-color,box-shadow] duration-300",
                on ? "bg-brand-soft shadow-[inset_0_0_0_1.5px_var(--site-brand)]" : "bg-canvas hover:bg-line",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl font-mono text-[11px] font-bold",
                  on ? "bg-brand text-white" : "bg-surface text-muted",
                )}
              >
                {v.code}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-bold text-ink">{v.name}</span>
                <span className="block truncate text-[11.5px] text-muted">
                  {v.indexCode} · {v.province} · {v.elevation.toLocaleString("id-ID")} m
                </span>
              </span>
              <Pill tone={on ? "brand" : "neutral"}>{v.epochs.length} epoch</Pill>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------- epochs

const SOURCE_ORDER = ["terrain", "ortho", "splat"] as const;

export function EpochPanel() {
  const { t, locale } = useTranslation();
  const volcano = useActiveVolcano();
  const active = useActiveEpoch();
  const selectEpoch = useTwin((s) => s.selectEpoch);
  const compareOn = useTwin((s) => s.compare.enabled);
  const [playing, setPlaying] = useState(false);

  // Step through the epochs every 3 s.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const epochs = volcano.epochs;
      const index = epochs.findIndex((e) => e.code === useTwin.getState().epochCode);
      if (index >= epochs.length - 1) {
        setPlaying(false);
        return;
      }
      selectEpoch(epochs[index + 1].code);
    }, 3000);
    return () => clearInterval(id);
  }, [playing, volcano, selectEpoch]);

  return (
    <Panel
      id="panel-epoch"
      title={t.twin.epochs}
      aside={
        <button
          type="button"
          disabled={compareOn}
          onClick={() => {
            if (!playing && active?.code === volcano.epochs.at(-1)?.code) selectEpoch(volcano.epochs[0].code);
            setPlaying((p) => !p);
          }}
          aria-label={playing ? "Pause" : "Play"}
          className="grid size-8 place-items-center rounded-full bg-brand text-white transition-transform hover:scale-105 disabled:opacity-40"
        >
          <DesignIcon name={playing ? "pause" : "play"} size={13} />
        </button>
      }
    >
      <ol className="relative flex flex-col gap-1">
        {volcano.epochs.map((epoch) => {
          const on = !compareOn && epoch.code === active?.code;
          return (
            <li key={epoch.code}>
              <button
                type="button"
                onClick={() => selectEpoch(epoch.code)}
                aria-current={on ? "true" : undefined}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
                  on ? "bg-brand-soft" : "hover:bg-line",
                )}
              >
                <span
                  className={cn(
                    "size-2.5 shrink-0 rounded-full ring-4",
                    on ? "bg-brand ring-brand-tint" : "bg-mist ring-transparent",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-ink">{formatTimeKey(epoch.date, locale)}</span>
                  <span className="block font-mono text-[10.5px] font-bold text-subtle">{epoch.code}</span>
                </span>
                <span className="flex gap-1">
                  {SOURCE_ORDER.map((key) => (
                    <span
                      key={key}
                      title={t.twin.layerNames[key === "terrain" ? "terrain" : key]}
                      className={cn(
                        "rounded-md px-1.5 py-px text-[9.5px] font-bold",
                        epoch.sources[key] ? "bg-chip text-chip-fg" : "text-mist line-through",
                      )}
                    >
                      {t.twin.sources[key]}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

// ---------------------------------------------------------------- layers

const LAYER_ICONS: Record<LayerKey, IconName> = {
  terrain: "terrain",
  hillshade: "eye",
  ortho: "doc",
  splat: "gs",
  lst: "sun",
};

export function LayerPanel() {
  const { t } = useTranslation();
  const epoch = useActiveEpoch();
  const layers = useTwin((s) => s.layers);
  const setLayer = useTwin((s) => s.setLayer);
  const basemap = useTwin((s) => s.basemap);
  const setBasemap = useTwin((s) => s.setBasemap);
  const lstOpacity = useTwin((s) => s.lstOpacity);
  const setLstOpacity = useTwin((s) => s.setLstOpacity);
  const lstDate = useTwin((s) => s.lstDate);
  const setLstDate = useTwin((s) => s.setLstDate);
  const { dates } = useLst();

  const availability: Record<LayerKey, boolean> = {
    terrain: true,
    hillshade: true,
    ortho: !!epoch?.sources.ortho,
    splat: !!epoch?.sources.splat,
    lst: dates.length > 0,
  };

  return (
    <Panel id="panel-layers" title={t.twin.layers}>
      <div className="flex flex-col gap-[9px]">
        {(Object.keys(LAYER_ICONS) as LayerKey[]).map((key) => (
          <ToggleRow
            key={key}
            icon={LAYER_ICONS[key]}
            label={t.twin.layerNames[key]}
            hint={availability[key] ? t.twin.layerHints[key] : t.twin.notInEpoch}
            checked={layers[key] && availability[key]}
            disabled={!availability[key]}
            onChange={(on) => setLayer(key, on)}
          />
        ))}
      </div>

      {layers.lst && availability.lst && (
        <div className="mt-3 rounded-xl bg-canvas p-3">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="font-semibold text-ink">{t.twin.lstDate}</span>
            <select
              value={lstDate}
              onChange={(e) => setLstDate(e.target.value)}
              className="rounded-lg bg-surface px-2 py-1 text-[12px] font-semibold text-ink outline-none"
            >
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[12px]">
            <span className="font-semibold text-ink">{t.twin.lstOpacity}</span>
            <Slider value={lstOpacity} min={0} max={1} step={0.05} onChange={setLstOpacity} />
            <span className="w-9 text-right font-bold text-ink tabular-nums">{Math.round(lstOpacity * 100)}%</span>
          </div>
        </div>
      )}

      <p className="mt-4 mb-2 text-[12px] font-semibold text-muted">{t.twin.basemap}</p>
      <Segmented<Basemap>
        value={basemap}
        onChange={setBasemap}
        options={[
          { value: "satellite", label: t.twin.basemaps.satellite },
          { value: "map", label: t.twin.basemaps.map },
          { value: "osm", label: t.twin.basemaps.osm },
        ]}
      />
    </Panel>
  );
}

// ---------------------------------------------------------------- compare

export function ComparePanel() {
  const { t, locale } = useTranslation();
  const volcano = useActiveVolcano();
  const compare = useTwin((s) => s.compare);
  const setCompare = useTwin((s) => s.setCompare);
  const hasSplat = volcano.epochs.some((e) => e.sources.splat);
  const candidates = volcano.epochs.filter((e) =>
    compare.mode === "splat" ? e.sources.splat : e.sources.ortho,
  );

  const select = (side: "left" | "right") => (
    <label className="min-w-0 flex-1">
      <span className="mb-1 block text-[11px] font-semibold text-muted">
        {side === "left" ? t.twin.left : t.twin.right}
      </span>
      <select
        value={compare[side]}
        onChange={(e) => setCompare({ [side]: e.target.value })}
        className="h-9 w-full min-w-0 rounded-xl bg-canvas px-2.5 text-[12px] font-semibold text-ink outline-none focus:ring-2 focus:ring-brand-soft"
      >
        {candidates.map((e) => (
          <option key={e.code} value={e.code}>
            {e.code} · {formatTimeKey(e.date, locale)}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <Panel
      id="panel-compare"
      title={t.twin.compare}
      aside={
        <Switch
          checked={compare.enabled}
          label={t.twin.compare}
          onChange={(enabled) => setCompare({ enabled, split: 0.5 })}
        />
      }
    >
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-500",
          compare.enabled ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <Segmented
            value={compare.mode}
            onChange={(mode) => {
              const list = volcano.epochs.filter((e) => (mode === "splat" ? e.sources.splat : e.sources.ortho));
              setCompare({ mode, left: list[0]?.code ?? "", right: list.at(-1)?.code ?? "" });
            }}
            options={[
              { value: "ortho", label: t.twin.compareModes.ortho },
              { value: "splat", label: t.twin.compareModes.splat, disabled: !hasSplat },
            ]}
          />
          <div className="mt-3 flex gap-2">
            {select("left")}
            {select("right")}
          </div>
          <p className="mt-2 text-[11.5px] text-subtle">{t.twin.compareHint}</p>
        </div>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------- tools & sims

function SimulationTile({ kind }: { kind: SimKind }) {
  const { t } = useTranslation();
  const card = useSim((s) => s.card);
  const openCard = useSim((s) => s.openCard);
  const laharRunning = useSim((s) => s.result !== null);
  const reset = useSim((s) => s.reset);
  const craterOn = useTwin((s) => s.crater.enabled);
  const setCrater = useTwin((s) => s.setCrater);
  const color = SIM_ACCENTS[kind];
  const running = kind === "lahar" ? laharRunning : craterOn;
  const open = card === kind;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => openCard(open ? null : kind)}
        aria-pressed={running}
        aria-expanded={open}
        className={cn(
          "flex h-[56px] w-full flex-col items-center justify-center gap-1 rounded-[13px] px-0.5 transition-[background-color,box-shadow,translate] duration-300 hover:-translate-y-0.5",
          !running && "bg-line hover:bg-mist",
        )}
        style={{
          ...(running ? { background: `color-mix(in srgb, ${color} 18%, var(--site-surface))` } : {}),
          ...(open ? { boxShadow: `inset 0 0 0 2px ${color}` } : {}),
        }}
      >
        <span className="relative grid size-7 place-items-center rounded-lg text-white" style={{ background: color }}>
          <DesignIcon name={SIM_ICONS[kind]} size={15} className="relative" />
        </span>
        <span className="w-full truncate text-center text-[11px] leading-tight font-semibold text-ink">
          {t.twin[kind].name}
        </span>
      </button>
      {running && (
        <button
          type="button"
          onClick={() => (kind === "lahar" ? reset() : setCrater({ enabled: false }))}
          aria-label={`Stop ${t.twin[kind].name}`}
          className="absolute -top-1.5 -right-1.5 grid size-5 animate-pop-in place-items-center rounded-full bg-[#e0533d] text-white shadow-[0_2px_6px_rgba(224,83,61,0.5)] ring-2 ring-surface transition-transform hover:scale-110"
        >
          <span className="size-[7px] rounded-[1.5px] bg-white" />
        </button>
      )}
    </div>
  );
}

export function ToolsPanel() {
  const { t } = useTranslation();
  const tool = useTwin((s) => s.tool);
  const setTool = useTwin((s) => s.setTool);
  const volcano = useActiveVolcano();
  const tools = [
    { id: "ruler" as const, label: t.twin.ruler, icon: "ruler" as IconName },
    { id: "depth" as const, label: t.twin.depth, icon: "measure" as IconName },
  ];
  return (
    <Panel id="panel-sims" title={t.twin.simulations}>
      <div className="grid grid-cols-4 gap-1.5">
        <SimulationTile kind="lahar" />
        {volcano.craterDetails && <SimulationTile kind="crater" />}
        {tools.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setTool(x.id)}
            aria-pressed={tool === x.id}
            className={cn(
              "flex h-[56px] flex-col items-center justify-center gap-1 rounded-[13px] px-0.5 transition-[background-color,translate] duration-300 hover:-translate-y-0.5",
              tool === x.id ? "bg-brand-soft shadow-[inset_0_0_0_2px_var(--site-brand)]" : "bg-line hover:bg-mist",
            )}
          >
            <span className="grid size-7 place-items-center rounded-lg bg-slate text-white">
              <DesignIcon name={x.icon} size={15} />
            </span>
            <span className="w-full truncate text-center text-[11px] leading-tight font-semibold text-ink">{x.label}</span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------- rail

export const LEFT_RAIL_ITEMS: { id: string; icon: IconName }[] = [
  { id: "panel-volcano", icon: "terrain" },
  { id: "panel-epoch", icon: "clock" },
  { id: "panel-layers", icon: "gs" },
  { id: "panel-compare", icon: "split" },
  { id: "panel-sims", icon: "drop" },
];
