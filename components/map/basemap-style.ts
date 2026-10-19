import type { LayerSpecification, StyleSpecification } from "maplibre-gl";

/**
 * Invisible anchor layers. App layers are inserted before a slot, so draped
 * rasters stay under vector overlays, which stay under labels.
 */
export const SLOTS = {
  raster: "slot:raster",
  overlay: "slot:overlay",
  top: "slot:top",
} as const;
export type Slot = keyof typeof SLOTS;

export const APP_PREFIX = "dt:";

export type BasemapKind = "map" | "satellite" | "osm";

const VECTOR_STYLE = {
  light: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

const GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

function rasterStyle(id: string, tiles: string[], maxzoom: number, attribution: string): StyleSpecification {
  return {
    version: 8,
    glyphs: GLYPHS,
    sources: { [id]: { type: "raster", tiles, tileSize: 256, maxzoom, attribution } },
    layers: [{ id, type: "raster", source: id }],
  };
}

export const SATELLITE_STYLE = rasterStyle(
  "esri-imagery",
  ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
  19,
  "Esri, Maxar, Earthstar Geographics",
);

export const OSM_STYLE = rasterStyle(
  "osm",
  ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
  19,
  "© OpenStreetMap contributors",
);

/** URL or inline style for a basemap; `key` changes whenever a reload is needed. */
export function basemapStyle(kind: BasemapKind, theme: "light" | "dark") {
  if (kind === "satellite") return { style: SATELLITE_STYLE, key: "satellite" };
  if (kind === "osm") return { style: OSM_STYLE, key: "osm" };
  return { style: VECTOR_STYLE[theme], key: `map:${theme}` };
}

const slotLayer = (id: string): LayerSpecification => ({
  id,
  type: "background",
  layout: { visibility: "none" },
  paint: { "background-opacity": 0 },
});

/**
 * Prepares a basemap for the twin: drops 3D building extrusions (they fight
 * the terrain) and inserts the slot anchors between the base layers and the
 * labels.
 */
export function withSlots(style: StyleSpecification): StyleSpecification {
  const layers = style.layers.filter(
    (l) => l.type !== "fill-extrusion" && !l.id.startsWith("slot:"),
  );
  const base = layers.filter((l) => l.type !== "symbol");
  const labels = layers.filter((l) => l.type === "symbol");
  return {
    ...style,
    glyphs: style.glyphs ?? GLYPHS,
    layers: [
      ...base,
      slotLayer(SLOTS.raster),
      slotLayer(SLOTS.overlay),
      ...labels,
      slotLayer(SLOTS.top),
    ],
  };
}

/**
 * Carries the app's own (`dt:`) sources and layers, and the terrain, from
 * the previous style into the next one so a basemap or theme switch never
 * blinks them out.
 */
export function carryOverAppLayers(
  previous: StyleSpecification | undefined,
  next: StyleSpecification,
): StyleSpecification {
  const prepared = withSlots(next);
  if (!previous) return prepared;

  const sources = { ...prepared.sources };
  for (const [id, source] of Object.entries(previous.sources)) {
    if (id.startsWith(APP_PREFIX)) sources[id] = source;
  }

  const layers = [...prepared.layers];
  for (const layer of previous.layers) {
    if (!layer.id.startsWith(APP_PREFIX)) continue;
    const slot = (layer.metadata as Record<string, string> | undefined)?.["dt:slot"] ?? SLOTS.overlay;
    const index = layers.findIndex((l) => l.id === slot);
    layers.splice(index < 0 ? layers.length : index, 0, layer);
  }

  const terrain =
    previous.terrain && previous.terrain.source.startsWith(APP_PREFIX) ? previous.terrain : prepared.terrain;

  return { ...prepared, sources, layers, ...(terrain ? { terrain } : {}) };
}
