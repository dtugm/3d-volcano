// Supported locales
export type Locale = "en" | "id";

// Translation structure - single source of truth
// TypeScript will enforce that all translation files implement this interface
export interface Translations {
  navbar: {
    title: string;
    subtitle: string;
  };
  common: {
    loading: string;
    error: string;
  };
  mountain: string;
  mountainCard: {
    elevation: string;
    series: string;
  };
  timeSeries: {
    title: string;
    current: string;
    play: string;
    pause: string;
    comparison: string;
    comparisonModes: {
      ortho: string;
      terrain: string;
    };
    leftYear: string;
    rightYear: string;
  };
  displayMode: {
    title: string;
    terrain: string;
    ortho: string;
    tiles3d: string;
  };
  sensor: {
    title: string;
    thermal: string;
    wind: string;
    seismic: string;
    gas: string;
    deformation: string;
  };
  basemap: {
    title: string;
    osm: string;
    cesium: string;
    esri: string;
  };
  dimension: {
    title: string;
    calculate: string;
    diameter: string;
    depth: string;
    volumeDelta: string;
  };
  weather: {
    title: string;
    temperature: string;
    wind: string;
    humidity: string;
  };
  airQuality: {
    title: string;
    so2: string;
    pm25: string;
    pm10: string;
    noStations: string;
    station: string;
    lastUpdated: string;
    safe: string;
    moderate: string;
    unhealthy: string;
  };
  fire: {
    title: string;
    hotspots: string;
    noHotspots: string;
    brightness: string;
    frp: string;
    confidence: string;
    satellite: string;
    distance: string;
    detected: string;
  };
}

// Context value type
export interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
}
