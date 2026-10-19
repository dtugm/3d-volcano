/** One elevation model in the Slice Comparison stack (built from the catalogue's slices). */
export interface EpochInfo {
  id: string;
  label: string;
  /** Local path (e.g. "/data/half3d/T1.tif") or remote URL. */
  url: string;
  color: string;
}

export interface ElevationData {
  width: number;
  height: number;
  elevations: Float32Array | Float64Array;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  minElevation: number;
  maxElevation: number;
  noDataValue: number | null;
}
