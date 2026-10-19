import type { CSSProperties } from "react";

import { cn } from "@/lib/cn";

/** Icons from the DT design set (`public/design`), drawn as CSS masks in `currentColor`. */
export const ICONS = {
  search: "/design/icon-search.svg",
  up: "/design/icon-up.svg",
  down: "/design/icon-down.svg",
  chevron: "/design/icon-chev.svg",
  arrow: "/design/icon-arrow.svg",
  x: "/design/icon-x.svg",
  xSmall: "/design/icon-x-small.svg",
  panelLeft: "/design/icon-panel-left.svg",
  panelLeftOpen: "/design/icon-panel-left-open.svg",
  panelRight: "/design/icon-panel-right.svg",
  panelRightOpen: "/design/icon-panel-right-open.svg",
  plus: "/design/ctrl-plus.svg",
  minus: "/design/ctrl-minus.svg",
  compass: "/design/ctrl-compass.svg",
  locate: "/design/ctrl-locate.svg",
  ruler: "/design/ctrl-ruler.svg",
  measure: "/design/ctrl-measure.svg",
  terrain: "/design/layer-terrain.svg",
  wind: "/design/layer-wind.svg",
  cube: "/design/icon-cube-small.svg",
  gs: "/design/lod-gs.svg",
  fire: "/design/icon-fire.svg",
  quake: "/design/icon-quake.svg",
  sun: "/design/icon-sun.svg",
  moon: "/design/icon-moon.svg",
  lang: "/design/icon-lang.svg",
  rain: "/design/icon-rain.svg",
  drop: "/design/icon-drop.svg",
  target: "/design/icon-target.svg",
  play: "/design/icon-play.svg",
  pause: "/design/icon-pause.svg",
  split: "/design/icon-split.svg",
  clock: "/design/icon-clock.svg",
  eye: "/design/icon-eye.svg",
  filter: "/design/icon-filter.svg",
  doc: "/design/icon-doc.svg",
  route: "/design/icon-route.svg",
  pointer: "/design/icon-pointer.svg",
  expand: "/design/icon-expand.svg",
  collapse: "/design/icon-collapse.svg",
  pulse: "/design/rail-pulse.svg",
  cloud: "/design/rail-cloud.svg",
  railWind: "/design/rail-wind.svg",
  water: "/design/rail-water.svg",
  wxWind: "/design/wx-wind.svg",
  wxHumidity: "/design/wx-humidity.svg",
  wxUv: "/design/wx-uv.svg",
  wxAqi: "/design/wx-aqi.svg",
} as const;

export type IconName = keyof typeof ICONS;

export function DesignIcon({
  name,
  size = 16,
  className,
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const url = `url("${ICONS[name]}")`;
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{
        width: size,
        height: size,
        maskImage: url,
        WebkitMaskImage: url,
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        ...style,
      }}
    />
  );
}
