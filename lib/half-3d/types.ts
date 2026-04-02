export interface EpochInfo {
  id: string;
  label: string;
  /** Local path (e.g. "/data/half3d/T1.tif") or remote URL (e.g. "https://bucket.example.com/T1.tif") */
  url: string;
  color: string;
}

// Default epoch colors
export const EPOCH_COLORS = [
  "#2196F3", // blue
  "#4CAF50", // green
  "#FF9800", // orange
  "#F44336", // red
  "#9C27B0", // purple
  "#00BCD4", // teal
];

export const EPOCHS: EpochInfo[] = [
  {
    id: "T1",
    label: "T1: Oct 17, 2017",
    url: "https://bucket.dt-volcano.geo-ai.id/Half3D/T1.tif",
    color: EPOCH_COLORS[0],
  },
  {
    id: "T2",
    label: "T2: Oct 20, 2017",
    url: "https://bucket.dt-volcano.geo-ai.id/Half3D/T2.tif",
    color: EPOCH_COLORS[1],
  },
  {
    id: "T3",
    label: "T3: Oct 21, 2017",
    url: "https://bucket.dt-volcano.geo-ai.id/Half3D/T3.tif",
    color: EPOCH_COLORS[2],
  },
  {
    id: "T4",
    label: "T4: Dec 16, 2017",
    url: "https://bucket.dt-volcano.geo-ai.id/Half3D/T4.tif",
    color: EPOCH_COLORS[3],
  },
  {
    id: "T5",
    label: "T5: July 6, 2019",
    url: "https://bucket.dt-volcano.geo-ai.id/Half3D/T5.tif",
    color: EPOCH_COLORS[4],
  },
  {
    id: "T6",
    label: "T6: Juli 2020",
    url: "https://bucket.dt-volcano.geo-ai.id/Half3D/T6.tif",
    color: EPOCH_COLORS[5],
  },
];

export interface ElevationData {
  width: number;
  height: number;
  elevations: Float32Array | Float64Array;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  minElevation: number;
  maxElevation: number;
  noDataValue: number | null;
}
