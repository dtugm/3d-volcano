// Mirrors the schemas exposed by the Volcano Digital Twin API
// (https://api-sensor-vdt-production.up.railway.app/openapi.json).

/** Key used by the backend to identify a mountain, e.g. "agung", "kelud". */
export type LstMountainKey = "agung" | "kelud";

export interface LstColormapStop {
  temp_c: number;
  hex: string;
  label: string;
}

export interface LstConfigResponse {
  instructions: string;
  tile_urls: Record<string, string>;
  colormap: {
    unit: string;
    legend: LstColormapStop[];
  };
}

export type LstDatesResponse = Record<string, string[]>;

export interface ThermalPoint {
  latitude: string;
  longitude: string;
  brightness: string;
  frp: string;
  acq_date: string;
  acq_time: string;
  satellite: string;
  instrument: string;
}

export interface ThermalResponse {
  data: ThermalPoint[];
}

export interface EarthquakeProperties {
  mag: number | null;
  place: string | null;
  time: number | null;
  url: string | null;
  alert: string | null;
  tsunami: number | null;
  sig: number | null;
  magType: string | null;
  type: string | null;
  title: string | null;
}

export interface EarthquakeFeature {
  type: string;
  id: string;
  properties: EarthquakeProperties;
  /** GeoJSON order: [longitude, latitude, depthKm] */
  geometry: { type: string; coordinates: number[] };
}

export interface EarthquakeResponse {
  type: string;
  metadata: { generated?: number | null; count?: number | null };
  features: EarthquakeFeature[];
}
