import type { Epoch, Slice, Volcano, VolcanoEntry } from "./types";
import { agung } from "./volcanoes/agung";
import { kelud } from "./volcanoes/kelud";

export type * from "./types";

/** Register new volcanoes here. Order does not matter; `index` decides. */
const ENTRIES: VolcanoEntry[] = [agung, kelud];

export const SLICE_COLORS = [
  "#2196F3",
  "#4CAF50",
  "#FF9800",
  "#F44336",
  "#9C27B0",
  "#00BCD4",
  "#FFEB3B",
  "#795548",
];

const pad = (n: number) => String(n).padStart(2, "0");

function build(entry: VolcanoEntry): Volcano {
  const epochs: Epoch[] = [...entry.epochs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((epoch, i) => ({
      ...epoch,
      number: i + 1,
      code: `${entry.code}-E${pad(i + 1)}`,
      volcanoId: entry.id,
    }));

  const slices: Slice[] = [...(entry.slices ?? [])]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((slice, i) => ({
      ...slice,
      number: i + 1,
      code: `${entry.code}-S${pad(i + 1)}`,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
    }));

  return { ...entry, indexCode: `V${pad(entry.index)}`, epochs, slices };
}

export const VOLCANOES: Volcano[] = ENTRIES.map(build).sort(
  (a, b) => a.index - b.index,
);

if (process.env.NODE_ENV !== "production") {
  const seen = new Set<string>();
  for (const v of VOLCANOES) {
    for (const key of [v.id, v.code, v.indexCode]) {
      if (seen.has(key)) throw new Error(`Duplicate volcano key in catalog: ${key}`);
      seen.add(key);
    }
  }
}

export function getVolcano(id: string): Volcano | undefined {
  return VOLCANOES.find((v) => v.id === id || v.code === id);
}

/** Looks up an epoch by its code ("AGU-E03") across all volcanoes. */
export function getEpochByCode(code: string): Epoch | undefined {
  const volcano = getVolcano(code.split("-")[0]);
  return volcano?.epochs.find((e) => e.code === code);
}

export function latestEpoch(volcano: Volcano): Epoch | undefined {
  return volcano.epochs[volcano.epochs.length - 1];
}

/** [west, south, east, north] around the summit, for data requests and camera limits. */
export function volcanoBbox(volcano: Volcano, padDeg = 0.12): [number, number, number, number] {
  return [
    volcano.longitude - padDeg,
    volcano.latitude - padDeg,
    volcano.longitude + padDeg,
    volcano.latitude + padDeg,
  ];
}

/** Total survey epochs across the catalogue. */
export const TOTAL_EPOCHS = VOLCANOES.reduce((n, v) => n + v.epochs.length, 0);

/** Case/diacritic-insensitive search over name, code, island and province. */
export function searchVolcanoes(query: string): Volcano[] {
  const q = normalize(query.trim());
  if (!q) return VOLCANOES;
  return VOLCANOES.filter((v) =>
    [v.name, v.code, v.indexCode, v.island, v.province, v.type]
      .map(normalize)
      .some((field) => field.includes(q)),
  );
}

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
