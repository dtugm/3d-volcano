"use client";

import type { IconName } from "@/components/site/DesignIcon";

import AirQualityPanel from "./air-quality";
import EarthquakePanel from "./earthquake";
import FirePanel from "./fire";
import WeatherPanel from "./weather";

/** Rail shortcuts that scroll to each panel by id. */
export const RIGHT_RAIL_ITEMS = [
  { id: "panel-weather", icon: "cloud" },
  { id: "panel-air", icon: "wxAqi" },
  { id: "panel-fire", icon: "fire" },
  { id: "panel-quake", icon: "quake" },
] as const satisfies readonly { id: string; icon: IconName }[];

/** Stack of environmental panels; the page provides the column/rail/collapse frame. */
const RightSidebar = () => (
  <div className="flex flex-col gap-4">
    <WeatherPanel id="panel-weather" />
    <AirQualityPanel id="panel-air" />
    <FirePanel id="panel-fire" />
    <EarthquakePanel id="panel-quake" />
  </div>
);

export default RightSidebar;
