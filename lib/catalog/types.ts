/**
 * Volcano & epoch catalogue.
 *
 * Every volcano gets a stable index (`index`, e.g. 1 → "V01") and a short
 * three-letter `code` ("AGU"). Every survey epoch of a volcano gets a code
 * built from both ("AGU-E03"), so a dataset can be referred to unambiguously
 * in the UI, URLs and reports no matter how many volcanoes are added.
 *
 * To add a volcano: create `volcanoes/<id>.ts` exporting a `VolcanoEntry`
 * and register it in `volcanoes/index.ts`. Epoch codes are derived from the
 * chronological order of `epochs`, so keep that array sorted by date.
 */

/** A third-party photo and the attribution its licence requires. */
export interface PhotoCredit {
  /** Path under /public, e.g. "/landing/agung.jpg". */
  src: string;
  author: string;
  license: string;
  /** Source page (e.g. the Wikimedia Commons file page). */
  source: string;
}

/** Data products that can exist for a survey epoch. */
export interface EpochSources {
  /** Quantized-mesh terrain (Cesium terrain layer.json folder). */
  terrain?: string;
  /** Orthophoto, TMS (Web Mercator, y flipped) PNG pyramid. */
  ortho?: string;
  /** Gaussian Splat 3D Tiles tileset.json. */
  splat?: string;
}

/**
 * Correction for a splat tileset whose georeference does not match the
 * survey DTM, in the east-north-up frame at the tileset origin (metres,
 * degrees): p′ = translate + scale · Rz · Ry · Rx · p.
 */
export interface SplatAdjust {
  /** East, north, up (m). */
  translate: [number, number, number];
  /** About the east, north and up axes (degrees). */
  rotate?: [number, number, number];
  scale?: number;
}

export interface EpochEntry {
  /** Time key: "YYYY", "YYYY-MM" or "YYYY-MM-DD". Used for sorting & labels. */
  date: string;
  sources: EpochSources;
  /** Fits the splat onto the DTM (see `SplatAdjust`). */
  splatAdjust?: SplatAdjust;
  /** Free-text note, e.g. the survey platform or eruption phase. */
  note?: string;
}

/** Crater-scale DEM clip used by the Slice Comparison module. */
export interface SliceEntry {
  date: string;
  /** Short label shown in the legend, e.g. "Oct 17, 2017". */
  label: string;
  /** Single-band elevation GeoTIFF. */
  url: string;
}

export interface CraterDetails {
  craterCenter: { latitude: number; longitude: number };
  floorElevation: number; // meters
  rimElevation: number; // meters
  minRadius: number; // meters
  maxRadius: number; // meters
  baseDiameter: string;
  baseDepth: string;
  baseVolume: string;
  geologyType: string;
  lastEruption: string;
}

export interface VolcanoEntry {
  /** URL-safe id, e.g. "gunung-agung". */
  id: string;
  /** Catalogue number, 1-based. Rendered as V01, V02, ... */
  index: number;
  /** Three-letter code used as the epoch code prefix. */
  code: string;
  name: string;
  island: string;
  province: string;
  /** Morphological type, e.g. "Stratovolcano". */
  type: string;
  latitude: number;
  longitude: number;
  /** Summit elevation in metres. */
  elevation: number;
  epochs: EpochEntry[];
  slices?: SliceEntry[];
  craterDetails?: CraterDetails;
  /**
   * Metres to subtract from survey heights (DTM, splats) to match the global
   * DEM: the survey products carry ellipsoidal heights, the base DEM is
   * orthometric. Measured as the median DTM − Terrarium difference.
   */
  heightOffset?: number;
  /** Cover photo for the landing page (a file in /public, with its licence). */
  photo?: PhotoCredit;
}

/** An epoch with its derived catalogue identity. */
export interface Epoch extends EpochEntry {
  /** "AGU-E01" */
  code: string;
  /** 1-based position in the volcano's epoch list. */
  number: number;
  volcanoId: string;
}

export interface Slice extends SliceEntry {
  /** "AGU-S01" */
  code: string;
  number: number;
  color: string;
}

export interface Volcano extends Omit<VolcanoEntry, "epochs" | "slices"> {
  /** "V01" */
  indexCode: string;
  epochs: Epoch[];
  slices: Slice[];
}
