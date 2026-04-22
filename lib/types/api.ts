export interface AirQualityData {
  aqi: number;
  aqiLabel: string;
  co: number;
  no: number;
  no2: number;
  o3: number;
  so2: number;
  pm25: number;
  pm10: number;
  nh3: number;
}

export interface AltitudeLayer {
  pressureHpa: number;
  approxAltitudeM: number;
  temperature: number;
  windSpeed: number;
  windDirection: number;
  humidity: number;
  weatherCode: number;
}

export interface AltitudeWeatherData {
  elevation: number;
  layers: AltitudeLayer[];
}

export interface Hotspot {
  latitude: number;
  longitude: number;
  brightness: number;
  frp: number;
  confidence: string;
  satellite: string;
  acqDate: string;
  acqTime: string;
  daynight: string;
  distanceKm: number;
}

export interface FireData {
  hotspots: Hotspot[];
}
