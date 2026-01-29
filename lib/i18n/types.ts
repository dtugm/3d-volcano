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
  };
  displayMode: {
    title: string;
    mesh3d: string;
    ortho: string;
    change: string;
    globe: string;
  };
  sensor: {
    title: string;
    thermal: string;
    wind: string;
    seismic: string;
    gas: string;
    deformation: string;
  };
  dimension: {
    title: string;
    calculate: string;
    diameter: string;
    depth: string;
    volumeDelta: string;
  };
  sensorMonitoring: {
    title: string;
    temperature: string;
    wind: string;
    seismic: string;
    gas: string;
    deformation: string;
    normal: string;
    warning: string;
    alert: string;
    alerts: string;
    warnings: string;
    change24h: string;
  };
}

// Context value type
export interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
}
