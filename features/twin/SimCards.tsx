"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";

import { DesignIcon, type IconName } from "@/components/site/DesignIcon";
import {
  Bar,
  CloseButton,
  eyebrow,
  FieldLabel,
  Segmented,
  SiteButton,
  Slider,
  Stat,
} from "@/components/site/ui";
import { cn } from "@/lib/cn";
import { useTranslation } from "@/lib/i18n";
import { CONFIDENCE_LIMITS, type ConfidenceLimit } from "@/lib/sim/laharz-areas";
import { type LaharMode, SIM_ACCENTS, type SimKind, useSim } from "@/lib/sim/store";
import { useActiveEpoch, useActiveVolcano, useTwin } from "@/lib/twin/store";
import { formatTimeKey } from "@/lib/volcano";

import { LAHAR_ZONE_COLORS } from "./SimLayers";

export const SIM_ICONS: Record<SimKind, IconName> = { lahar: "drop", crater: "target" };

export const popupCard =
  "animate-pop-in pointer-events-auto flex max-h-full w-[310px] max-w-full shrink-0 flex-col overflow-hidden rounded-2xl bg-surface shadow-[var(--site-float)]";

function Shell({
  kind,
  title,
  running,
  children,
  footer,
}: {
  kind: SimKind;
  title: string;
  running?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  const openCard = useSim((s) => s.openCard);
  const accent = SIM_ACCENTS[kind];
  return (
    <div className={cn(popupCard, "p-5")}>
      <div className="flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn(eyebrow, "flex items-center gap-1.5 whitespace-nowrap")} style={{ color: accent }}>
            <DesignIcon name={SIM_ICONS[kind]} size={13} />
            {t.twin[kind].name}
            {running && (
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-line px-1.5 py-px text-[9px] tracking-normal text-ink normal-case">
                <span className="size-1.5 animate-pulse rounded-full" style={{ background: accent }} />
                live
              </span>
            )}
          </p>
          <p className="mt-1 text-[18px] leading-tight font-extrabold text-ink">{title}</p>
        </div>
        <CloseButton onClick={() => openCard(null)} className="shrink-0 bg-canvas hover:bg-mist" />
      </div>
      <div className="thin-scroll -mr-2 mt-1 min-h-0 overflow-y-auto pr-2">{children}</div>
      {footer && <div className="mt-4 grid shrink-0 grid-cols-2 gap-2">{footer}</div>}
    </div>
  );
}

const formatArea = (m2: number) =>
  m2 >= 1e6 ? `${(m2 / 1e6).toFixed(2)} km²` : `${Math.round(m2 / 100) * 100} m²`;

const formatVolume = (v: number) =>
  v >= 1e6 ? `${(v / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} juta m³` : `${Math.round(v).toLocaleString("id-ID")} m³`;

/** Volume slider on a log scale, 10⁴ – 10⁸ m³. */
const toVolume = (s: number) => Math.round(10 ** s / 1000) * 1000;
const fromVolume = (v: number) => Math.log10(v);

function LaharCard() {
  const { t, locale } = useTranslation();
  const volcano = useActiveVolcano();
  const epoch = useActiveEpoch();
  const lahar = useSim((s) => s.lahar);
  const setLahar = useSim((s) => s.setLahar);
  const picking = useSim((s) => s.picking);
  const setPicking = useSim((s) => s.setPicking);
  const clearStart = useSim((s) => s.clearStart);
  const status = useSim((s) => s.status);
  const error = useSim((s) => s.error);
  const result = useSim((s) => s.result);
  const progress = useSim((s) => s.progress);
  const run = useSim((s) => s.run);
  const reset = useSim((s) => s.reset);
  const splatOn = useTwin((s) => s.layers.splat);
  const accent = SIM_ACCENTS.lahar;
  const secondary = lahar.mode === "secondary";

  // Secondary: two surveys with a DTM, by default the active one and the one before.
  const withDtm = volcano.epochs.filter((e) => e.sources.terrain);
  const laterCode =
    (lahar.later && withDtm.find((e) => e.code === lahar.later)?.code) ??
    (epoch?.sources.terrain ? epoch.code : withDtm.at(-1)?.code);
  const laterIndex = withDtm.findIndex((e) => e.code === laterCode);
  const earlierCode =
    (lahar.earlier && withDtm.find((e) => e.code === lahar.earlier)?.code) ??
    withDtm[laterIndex > 0 ? laterIndex - 1 : 1]?.code;
  const earlierEpoch = withDtm.find((e) => e.code === earlierCode);
  const laterEpoch = withDtm.find((e) => e.code === laterCode);
  const pairValid = !!earlierEpoch && !!laterEpoch && earlierEpoch.code !== laterEpoch.code;

  const zones = useMemo(
    () =>
      result
        ? ([
            [t.twin.lahar.zones.upper, result.zoneAreas[0], LAHAR_ZONE_COLORS[0]],
            [t.twin.lahar.zones.central, result.zoneAreas[1], LAHAR_ZONE_COLORS[1]],
            [t.twin.lahar.zones.lower, result.zoneAreas[2], LAHAR_ZONE_COLORS[2]],
          ] as const)
        : [],
    [result, t],
  );

  const canRun = status !== "computing" && (secondary ? pairValid : !!lahar.start);
  const runIt = () => {
    const center: [number, number] = [volcano.longitude, volcano.latitude];
    const offset = volcano.heightOffset ?? 0;
    if (secondary) {
      // Earlier/later in time order, whatever the selection order.
      const [a, b] = [earlierEpoch!, laterEpoch!].sort((x, y) => x.date.localeCompare(y.date));
      run(b.sources.terrain!, center, offset, { earlierBase: a.sources.terrain!, laterBase: b.sources.terrain! });
    } else {
      run(epoch?.sources.terrain ?? "", center, offset);
    }
  };

  const epochSelect = (label: string, value: string | undefined, key: "earlier" | "later") => (
    <label className="min-w-0 flex-1">
      <span className="mb-1 block text-[11px] font-semibold text-muted">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => setLahar({ [key]: e.target.value })}
        className="h-9 w-full min-w-0 rounded-xl bg-canvas px-2.5 text-[12px] font-semibold text-ink outline-none focus:ring-2 focus:ring-brand-soft"
      >
        {withDtm.map((e) => (
          <option key={e.code} value={e.code}>
            {e.code} · {formatTimeKey(e.date, locale)}
          </option>
        ))}
      </select>
    </label>
  );

  const shownSources = result?.sources ?? [];
  const simulatedCount = shownSources.filter((s) => s.simulated).length;

  return (
    <Shell
      kind="lahar"
      title={t.twin.lahar.title}
      running={status === "done" && progress < 1}
      footer={
        <>
          <SiteButton icon="play" disabled={!canRun} onClick={runIt}>
            {result ? t.twin.lahar.rerun : t.twin.lahar.run}
          </SiteButton>
          <SiteButton variant="soft" disabled={!result && status !== "error"} onClick={reset}>
            {t.twin.lahar.reset}
          </SiteButton>
        </>
      }
    >
      <div className="mt-3">
        <Segmented<LaharMode>
          value={lahar.mode}
          accent={accent}
          options={[
            { value: "primary", label: t.twin.lahar.modes.primary },
            { value: "secondary", label: t.twin.lahar.modes.secondary },
          ]}
          onChange={(mode) => {
            if (mode === lahar.mode) return;
            reset();
            setLahar({ mode });
            setPicking(false);
          }}
        />
      </div>
      <p className="mt-2 text-[11.5px] leading-snug text-muted">
        {secondary ? t.twin.lahar.descriptionSecondary : t.twin.lahar.description}
      </p>

      {secondary ? (
        <>
          <div className="mt-3 flex gap-2">
            {epochSelect(t.twin.lahar.earlier, earlierCode, "earlier")}
            {epochSelect(t.twin.lahar.later, laterCode, "later")}
          </div>
          {!pairValid && (
            <p className="mt-2 rounded-xl bg-warn-soft px-3 py-2 text-[11.5px] font-semibold text-warn-fg">
              {t.twin.lahar.needEpochs}
            </p>
          )}

          <FieldLabel label={t.twin.lahar.stemShare} aside={`${lahar.maxPercentLength}%`} />
          <Slider
            value={lahar.maxPercentLength}
            min={25}
            max={100}
            step={5}
            accent={accent}
            label={t.twin.lahar.stemShare}
            onChange={(v) => setLahar({ maxPercentLength: v })}
          />

          <FieldLabel label={t.twin.lahar.lod} aside={`${lahar.lodM.toLocaleString(locale)} m`} />
          <Slider
            value={lahar.lodM}
            min={0}
            max={5}
            step={0.5}
            accent={accent}
            label={t.twin.lahar.lod}
            onChange={(v) => setLahar({ lodM: v })}
          />

          <FieldLabel label={t.twin.lahar.corridor} aside={`${lahar.bufferM} m`} />
          <Slider
            value={lahar.bufferM}
            min={0}
            max={100}
            step={5}
            accent={accent}
            label={t.twin.lahar.corridor}
            onChange={(v) => setLahar({ bufferM: v })}
          />
        </>
      ) : (
        <>
          <FieldLabel label={t.twin.lahar.start} />
          <div className="flex items-center gap-2">
            <span className="flex min-w-0 flex-1 items-center gap-1 rounded-xl bg-canvas py-1 pr-1 pl-2.5 text-[12px] font-semibold text-ink tabular-nums">
              <span className="min-w-0 flex-1 truncate py-1">
                {lahar.start ? `${lahar.start[1].toFixed(4)}, ${lahar.start[0].toFixed(4)}` : "—"}
              </span>
              {lahar.start && (
                <button
                  type="button"
                  onClick={clearStart}
                  aria-label={t.twin.lahar.clearStart}
                  title={t.twin.lahar.clearStart}
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-mist hover:text-ink"
                >
                  <DesignIcon name="xSmall" size={12} />
                </button>
              )}
            </span>
            <button
              type="button"
              onClick={() => setPicking(!picking)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-[12px] font-semibold transition-colors",
                picking ? "text-white" : "bg-line text-ink hover:bg-mist",
              )}
              style={picking ? { background: accent } : undefined}
            >
              <DesignIcon name="target" size={13} />
              {picking ? t.twin.lahar.picking : t.twin.lahar.pickStart}
            </button>
          </div>

          <FieldLabel label={t.twin.lahar.volume} aside={formatVolume(lahar.volume)} />
          <Slider
            value={fromVolume(lahar.volume)}
            min={4}
            max={8}
            step={0.05}
            accent={accent}
            label={t.twin.lahar.volume}
            onChange={(s) => setLahar({ volume: toVolume(s) })}
          />
        </>
      )}

      <FieldLabel label={t.twin.lahar.confidence} />
      <Segmented<string>
        value={String(lahar.confidence)}
        accent={accent}
        columns={4}
        options={CONFIDENCE_LIMITS.filter((c) => c >= 80).map((c) => ({ value: String(c), label: `${c}%` }))}
        onChange={(v) => setLahar({ confidence: Number(v) as ConfidenceLimit })}
      />

      <FieldLabel label={t.twin.lahar.resolution} />
      <Segmented
        value={lahar.resolution}
        accent={accent}
        options={[
          { value: "coarse", label: t.twin.lahar.resolutions.coarse },
          { value: "fine", label: t.twin.lahar.resolutions.fine },
        ]}
        onChange={(resolution) => setLahar({ resolution })}
      />

      {status === "error" && (
        <p className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-[11.5px] font-semibold text-warn-fg">{error}</p>
      )}

      {result && (
        <>
          {progress < 1 && (
            <div className="mt-3.5">
              <Bar share={progress} color={accent} />
            </div>
          )}
          {result.kind === "secondary" && (
            <div className="mt-3">
              <Stat
                label={t.twin.lahar.verticalBias}
                value={`${result.verticalBias >= 0 ? "−" : "+"}${Math.abs(result.verticalBias).toFixed(1)} m`}
              />
            </div>
          )}
          {result.kind === "secondary" && shownSources.length > 0 && (
            <>
              <FieldLabel
                label={t.twin.lahar.sources}
                aside={`${t.twin.lahar.totalDeposit} ${formatVolume(shownSources.reduce((s, p) => s + p.volume, 0))}`}
              />
              <div className="space-y-1">
                {shownSources.slice(0, simulatedCount).map((s, i) => (
                  <div key={s.lngLat.join()} className="flex items-center gap-2 rounded-xl bg-canvas px-2.5 py-1.5 text-[12px]">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: accent }}>
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-muted tabular-nums">
                      {s.lngLat[1].toFixed(4)}, {s.lngLat[0].toFixed(4)}
                    </span>
                    <span className="font-extrabold text-ink tabular-nums">{formatVolume(s.volume)}</span>
                  </div>
                ))}
              </div>
              {shownSources.length > simulatedCount && (
                <p className="mt-1.5 text-[11px] text-subtle">
                  {t.twin.lahar.sourcesNote
                    .replace("{shown}", String(simulatedCount))
                    .replace("{total}", String(shownSources.length))}
                </p>
              )}
            </>
          )}
          <div className="mt-3 space-y-1.5">
            {zones.map(([label, area, color]) => (
              <div key={label} className="flex items-center gap-2 rounded-xl bg-canvas px-2.5 py-2 text-[12px]">
                <span className="size-3 shrink-0 rounded" style={{ background: `rgb(${color.join(",")})` }} />
                <span className="flex-1 font-semibold text-ink">{label}</span>
                <span className="font-extrabold text-ink tabular-nums">{formatArea(area)}</span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            <Stat label={t.twin.lahar.steps} value={`${((result.maxStep * result.cellSizeM) / 1000).toFixed(1)} km`} />
            <Stat label={t.twin.lahar.cell} value={`${result.cellSizeM.toFixed(1)} m`} />
          </div>
          {result.truncated && (
            <p className="mt-3 rounded-xl bg-amber-soft px-3 py-2 text-[11.5px] leading-snug font-semibold text-ink">
              {t.twin.lahar.truncated}
            </p>
          )}
          {splatOn && (
            <p className="mt-3 flex gap-2 rounded-xl bg-canvas px-3 py-2 text-[11.5px] leading-snug text-muted">
              <DesignIcon name="eye" size={14} className="mt-px shrink-0" />
              {t.twin.lahar.splatHidden}
            </p>
          )}
          <p className="mt-3 text-[10.5px] leading-snug text-subtle">
            {secondary ? `${t.twin.lahar.registrationCaveat} ` : ""}
            {t.twin.lahar.note} · {Math.round(result.timings.dem + result.timings.hydrology + result.timings.laharz)} ms
          </p>
        </>
      )}
    </Shell>
  );
}

function CraterCard() {
  const { t, locale } = useTranslation();
  const volcano = useActiveVolcano();
  const crater = useTwin((s) => s.crater);
  const setCrater = useTwin((s) => s.setCrater);
  const details = volcano.craterDetails;
  const accent = SIM_ACCENTS.crater;
  const fmt = (n: number) => new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US").format(n);

  const sim = useMemo(() => {
    if (!details) return { volume: 0, percent: 0 };
    const { floorElevation, rimElevation, minRadius, maxRadius, baseVolume } = details;
    const h = Math.max(0, crater.level - floorElevation);
    const fraction = h / (rimElevation - floorElevation);
    const r = minRadius + fraction * (maxRadius - minRadius);
    // Frustum volume between the floor and the current level.
    const volume = ((Math.PI * h) / 3) * (minRadius ** 2 + r ** 2 + minRadius * r);
    const capacity = parseFloat(baseVolume.replace(/[^0-9]/g, "")) || 40_000_000;
    return { volume: Math.round(volume), percent: Math.min(100, Math.round((volume / capacity) * 100)) };
  }, [details, crater.level]);

  if (!details) return null;
  return (
    <Shell kind="crater" title={t.twin.crater.title} running={crater.enabled}>
      <FieldLabel label={t.twin.crater.level} aside={`${fmt(Math.round(crater.level))} m`} />
      <Slider
        value={crater.level}
        min={details.floorElevation}
        max={details.rimElevation}
        accent={accent}
        onChange={(level) => setCrater({ level, enabled: true })}
      />
      <div className="mt-1 flex justify-between text-[10px] text-subtle tabular-nums">
        <span>{fmt(details.floorElevation)} m</span>
        <span>{fmt(details.rimElevation)} m</span>
      </div>
      <FieldLabel label={t.twin.crater.name} />
      <Segmented
        value={crater.fill}
        accent={crater.fill === "water" ? accent : "#e8590c"}
        options={[
          { value: "water", label: t.twin.crater.water },
          { value: "lava", label: t.twin.crater.lava },
        ]}
        onChange={(fill) => setCrater({ fill, enabled: true })}
      />
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <Stat label={t.twin.crater.volume} value={`${fmt(sim.volume)} m³`} wide />
        <Stat label={t.twin.crater.filled} value={`${sim.percent}%`} color={accent} />
        <Stat label="Kapasitas" value={details.baseVolume} />
      </div>
      <div className="mt-3">
        <Bar share={sim.percent / 100} color={crater.fill === "water" ? accent : "#e8590c"} />
      </div>
    </Shell>
  );
}

export function SimCard() {
  const card = useSim((s) => s.card);
  if (card === "lahar") return <LaharCard />;
  if (card === "crater") return <CraterCard />;
  return null;
}
