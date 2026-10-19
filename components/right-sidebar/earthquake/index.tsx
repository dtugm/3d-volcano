"use client";

import { Panel, Pill } from "@/components/site/ui";
import { useEarthquake } from "@/lib/hooks/use-earthquake";
import { useTranslation } from "@/lib/i18n";
import type { EarthquakeEvent } from "@/lib/types/api";

import { MoreRows, PanelEmpty, PanelError, PanelSkeleton } from "../shared";

const MAX_ROWS = 5;

// USGS-style magnitude bands.
function magnitudeChip(magnitude: number): string {
  if (magnitude >= 5) return "bg-[color-mix(in_srgb,#e5484d_16%,transparent)] text-[#e5484d]";
  if (magnitude >= 4) return "bg-amber-soft text-amber";
  return "bg-brand-soft text-brand-deep";
}

const EarthquakePanel = ({ id }: { id?: string }) => {
  const { t, locale } = useTranslation();
  const { events, windowDays, radiusKm, error, isLoading, refresh } = useEarthquake();

  if (isLoading) {
    return (
      <Panel id={id} title={t.earthquake.title}>
        <PanelSkeleton rows={2} />
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel id={id} title={t.earthquake.title}>
        <PanelError message={t.common.error} onRetry={() => refresh()} />
      </Panel>
    );
  }

  return (
    <Panel
      id={id}
      title={t.earthquake.title}
      aside={
        <Pill tone={events.length === 0 ? "ok" : "neutral"}>
          {events.length} {t.earthquake.events}
        </Pill>
      }
    >
      {events.length === 0 ? (
        <PanelEmpty>
          {t.earthquake.noEvents} ({windowDays} {t.earthquake.lastDays}, ≤{radiusKm} km)
        </PanelEmpty>
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className="mb-1 text-[12px] text-muted tabular-nums">
            {events.length} {t.earthquake.events} {t.earthquake.recorded} · {windowDays} {t.earthquake.lastDays} · ≤
            {radiusKm} km
          </p>
          {events.slice(0, MAX_ROWS).map((event) => (
            <EarthquakeRow
              key={event.id}
              event={event}
              locale={locale}
              depthLabel={t.earthquake.depth}
              distanceLabel={t.earthquake.distance}
            />
          ))}
          <MoreRows count={events.length - MAX_ROWS} />
        </div>
      )}
    </Panel>
  );
};

function EarthquakeRow({
  event,
  locale,
  depthLabel,
  distanceLabel,
}: {
  event: EarthquakeEvent;
  locale: string;
  depthLabel: string;
  distanceLabel: string;
}) {
  const timestamp = new Date(event.time).toLocaleString(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-canvas px-3 py-2">
      <span
        className={`grid h-7 min-w-9 shrink-0 place-items-center rounded-lg px-1.5 text-[12.5px] font-bold tabular-nums ${magnitudeChip(event.magnitude)}`}
        title={event.magType}
      >
        {event.magnitude.toFixed(1)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink" title={event.place}>
          {event.place}
        </p>
        <p className="truncate text-[11.5px] text-muted tabular-nums">
          {timestamp} · <span title={depthLabel}>{depthLabel} {event.depthKm.toFixed(1)} km</span> ·{" "}
          <span title={distanceLabel}>{event.distanceKm} km</span>
        </p>
      </div>
    </div>
  );
}

export default EarthquakePanel;
