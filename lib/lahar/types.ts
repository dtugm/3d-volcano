export type MaterialKind = "lahar" | "lava";
export type MaterialProfileId =
  | "laharWet"
  | "laharDry"
  | "lavaBasaltic"
  | "lavaAndesitic";

export interface MaterialProfile {
  id: MaterialProfileId;
  kind: MaterialKind;
  displayName: string;
  density: number;          // kg/m³
  viscosity: number;        // cP (used for solver routing + Manning n)
  yieldStrength: number;    // Pa (Bingham term; 0 for water-like)
  manningN: number;         // hydraulic roughness
  flowRate: number;         // m³/s injected per tick at source
  spread: number;           // particle lateral spread weight (D8 mode)
  color: [number, number, number]; // RGB 0-255
  // LAHARZ empirical coefficients (Iverson 1998, tweaked per Bernard 2021)
  laharzA: number;          // cross-section coefficient
  laharzB: number;          // planimetric coefficient
}

export interface VolumeTriple {
  min: number;
  likely: number;
  max: number;
}

export interface LSPCandidate {
  lspId: string;
  streamId: string;
  lng: number;
  lat: number;
  elevation: number;
  slv: VolumeTriple;
}

export interface LaharDataRef {
  baseUrl: string;
  mainstem: string;       // relative path under baseUrl
  branches?: string;
  deposition: string;
  hazardCone: string;
  lspCandidates: string;
  heightmap: string;      // PNG 16-bit
  heightmapMeta: string;  // JSON sidecar
}

export interface HeightmapMeta {
  width: number;
  height: number;
  bbox: [number, number, number, number]; // [w, s, e, n]
  elevationMin: number;
  elevationMax: number;
  cellSizeM: number;
}

export interface SimSnapshot {
  step: number;
  timeS: number;
  cols: number;
  rows: number;
  depth: Float32Array;    // length cols*rows
  particles?: Float32Array; // [x0,y0,age0, x1,y1,age1, ...]
  maxDepth: number;
  wettedCells: number;
  injectedM3: number;
  budgetM3: number | null;
  injecting: boolean;
}

export type SimulationMode = "off" | "lahar" | "lava";
export type SimStatus = "idle" | "running" | "paused" | "done" | "error";

export type LSPRejection =
  | "outside_stream"
  | "below_hazard_cone"
  | "not_in_deposition"
  | "not_at_junction";

export interface LSPValidationResult {
  ok: boolean;
  snapped?: { lng: number; lat: number };
  candidate?: LSPCandidate;
  reason?: LSPRejection;
}
