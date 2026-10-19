"use client";

import { DesignIcon } from "@/components/site/DesignIcon";
import { Panel, Pill } from "@/components/site/ui";
import { useFire } from "@/lib/hooks/use-fire";
import { useTranslation } from "@/lib/i18n";

import { MoreRows, PanelEmpty, PanelError, PanelSkeleton } from "../shared";

const MAX_ROWS = 5;

const FirePanel = ({ id }: { id?: string }) => {
  const { t } = useTranslation();
  const { fire, windowDays, error, isLoading, refresh } = useFire();

  if (isLoading) {
    return (
      <Panel id={id} title={t.fire.title}>
        <PanelSkeleton rows={2} />
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel id={id} title={t.fire.title}>
        <PanelError message={t.common.error} onRetry={() => refresh()} />
      </Panel>
    );
  }

  const hotspots = fire?.hotspots || [];

  return (
    <Panel
      id={id}
      title={t.fire.title}
      aside={
        hotspots.length === 0 ? (
          <Pill tone="ok">0</Pill>
        ) : (
          <Pill tone="amber">
            {hotspots.length} {t.fire.detected}
          </Pill>
        )
      }
    >
      {hotspots.length === 0 ? (
        <PanelEmpty>
          {t.fire.noHotspots} ({windowDays} {t.fire.lastDays})
        </PanelEmpty>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="mb-1 flex items-baseline gap-2">
            <span className="text-[30px] leading-none font-bold text-amber tabular-nums">{hotspots.length}</span>
            <span className="text-[12px] text-muted">
              {t.fire.hotspots} · {windowDays} {t.fire.lastDays}
            </span>
          </div>

          {hotspots.slice(0, MAX_ROWS).map((hotspot, idx) => (
            <div key={idx} className="flex items-center gap-2.5 rounded-xl bg-canvas px-3 py-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-soft text-amber">
                <DesignIcon name="fire" size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-semibold text-ink tabular-nums" title={t.fire.frp}>
                    {hotspot.frp.toFixed(1)} MW
                  </span>
                  <span className="text-[12px] font-semibold text-ink-body tabular-nums" title={t.fire.distance}>
                    {hotspot.distanceKm} km
                  </span>
                </div>
                <div className="truncate text-[11.5px] text-muted tabular-nums">
                  <span title={t.fire.brightness}>{hotspot.brightness.toFixed(1)} K</span>
                  {" · "}
                  <span title={`${t.fire.satellite} / ${t.fire.instrument}`}>
                    {hotspot.satellite} {hotspot.instrument}
                  </span>
                  {" · "}
                  {hotspot.acqDate} {hotspot.acqTime}
                </div>
              </div>
            </div>
          ))}
          <MoreRows count={hotspots.length - MAX_ROWS} />
        </div>
      )}
    </Panel>
  );
};

export default FirePanel;
