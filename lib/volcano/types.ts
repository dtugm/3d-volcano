export interface YearData {
  tilesetUrl?: string;
  terrainUrl?: string;
  orthoUrl?: string;
}

export interface Mountain {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  series: number;
  years: string[];
  yearData: Record<string, YearData>;
}

export const MOUNTAINS: Mountain[] = [
  {
    id: "gunung-agung",
    name: "Gunung Agung",
    latitude: -8.34,
    longitude: 115.51,
    elevation: 3031,
    series: 2,
    years: ["2020", "2026"],
    yearData: {
      "2020": {
        terrainUrl: "https://bucket.dt-volcano.geo-ai.id/DTM/gunung-agung/2020",
        orthoUrl: "https://bucket.dt-volcano.geo-ai.id/ORTHO/gunung-agung/2020",
      },
      "2026": {
        terrainUrl: "",
        orthoUrl: "https://bucket.dt-volcano.geo-ai.id/ORTHO/gunung-agung/2026",
      },
    },
  },
  {
    id: "gunung-kelud",
    name: "Gunung Kelud",
    latitude: -7.93,
    longitude: 112.31,
    elevation: 1731,
    series: 2,
    years: ["2014", "2026"],
    yearData: {
      "2014": {
        terrainUrl: "https://bucket.dt-volcano.geo-ai.id/DTM/gunung-kelud/2014",
        orthoUrl: "https://bucket.dt-volcano.geo-ai.id/ORTHO/gunung-kelud/2014",
      },
      "2026": {
        terrainUrl: "https://bucket.dt-volcano.geo-ai.id/DTM/gunung-kelud/2026",
        orthoUrl: "https://bucket.dt-volcano.geo-ai.id/ORTHO/gunung-kelud/2026",
      },
    },
  },
];
