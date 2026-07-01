import type { LaharDataRef } from "@/lib/lahar/types";

export interface YearData {
  tilesetUrl?: string;
  terrainUrl?: string;
  orthoUrl?: string;
  gaussianSplatUrl?: string;
  laharData?: LaharDataRef;
}

export interface CraterDetails {
  craterCenter: { latitude: number; longitude: number };
  floorElevation: number; // meters
  rimElevation: number;   // meters
  minRadius: number;      // meters
  maxRadius: number;      // meters
  baseDiameter: string;   // e.g. "900 m"
  baseDepth: string;      // e.g. "250 m"
  baseVolume: string;     // e.g. "42,500,000 m³"
  geologyType: string;
  lastEruption: string;
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
  craterDetails?: CraterDetails;
}

export const MOUNTAINS: Mountain[] = [
  {
    id: "gunung-agung",
    name: "Gunung Agung",
    latitude: -8.34,
    longitude: 115.51,
    elevation: 3031,
    series: 7,
    years: ["2017", "2017-10", "2017-12", "2019-07", "2020"],
    yearData: {
      "2017": {
        terrainUrl: "https://bucket.dt-volcano.geo-ai.id/DTM/gunung-agung/2017",
        orthoUrl: "https://bucket.dt-volcano.geo-ai.id/ORTHO/gunung-agung/2017",
        gaussianSplatUrl:
          "https://bucket.dt-volcano.geo-ai.id/GaussianSplat/gunung-agung/2017_ver_1/tileset.json",
      },
      "2017-10": {
        terrainUrl:
          "https://bucket.dt-volcano.geo-ai.id/DTM/gunung-agung/2017_10",
        orthoUrl:
          "https://bucket.dt-volcano.geo-ai.id/ORTHO/gunung-agung/2017_10",
      },
      "2017-12": {
        terrainUrl:
          "https://bucket.dt-volcano.geo-ai.id/DTM/gunung-agung/2017_12",
        orthoUrl:
          "https://bucket.dt-volcano.geo-ai.id/ORTHO/gunung-agung/2017_12",
      },
      "2019-07": {
        terrainUrl:
          "https://bucket.dt-volcano.geo-ai.id/DTM/gunung-agung/2019_07",
        orthoUrl:
          "https://bucket.dt-volcano.geo-ai.id/ORTHO/gunung-agung/2019_07",
        gaussianSplatUrl:
          "https://bucket.dt-volcano.geo-ai.id/GaussianSplat/gunung-agung/2019/tileset.json",
      },
      "2020": {
        terrainUrl: "https://bucket.dt-volcano.geo-ai.id/DTM/gunung-agung/2020",
        orthoUrl: "https://bucket.dt-volcano.geo-ai.id/ORTHO/gunung-agung/2020",
        gaussianSplatUrl:
          "https://bucket.dt-volcano.geo-ai.id/GaussianSplat/gunung-agung/2020/tileset.json",
        laharData: {
          baseUrl: "/lahar-test-data/gunung-agung/2020",
          mainstem: "mainstem.geojson",
          branches: "branches.geojson",
          deposition: "deposition.geojson",
          hazardCone: "hazardCone.geojson",
          lspCandidates: "lspCandidates.geojson",
          heightmap: "heightmap.png",
          heightmapMeta: "heightmap.json",
        },
      },
    },
    craterDetails: {
      craterCenter: { latitude: -8.343, longitude: 115.508 },
      floorElevation: 2780,
      rimElevation: 3031,
      minRadius: 150,
      maxRadius: 450,
      baseDiameter: "900 m",
      baseDepth: "250 m",
      baseVolume: "42.500.000 m³",
      geologyType: "Stratovolkano Aktif (Tipe A)",
      lastEruption: "2019",
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
        gaussianSplatUrl:
          "https://bucket.dt-volcano.geo-ai.id/GaussianSplat/gunung-kelud/2014/tileset.json",
        laharData: {
          baseUrl: "/lahar-test-data/gunung-kelud/2014",
          mainstem: "mainstem.geojson",
          branches: "branches.geojson",
          deposition: "deposition.geojson",
          hazardCone: "hazardCone.geojson",
          lspCandidates: "lspCandidates.geojson",
          heightmap: "heightmap.png",
          heightmapMeta: "heightmap.json",
        },
      },
      "2026": {
        terrainUrl: "https://bucket.dt-volcano.geo-ai.id/DTM/gunung-kelud/2026",
        orthoUrl: "https://bucket.dt-volcano.geo-ai.id/ORTHO/gunung-kelud/2026",
      },
    },
    craterDetails: {
      craterCenter: { latitude: -7.930, longitude: 112.308 },
      floorElevation: 1380,
      rimElevation: 1731,
      minRadius: 250,
      maxRadius: 750,
      baseDiameter: "1.500 m",
      baseDepth: "350 m",
      baseVolume: "55.000.000 m³",
      geologyType: "Stratovolkano dengan Danau Kawah",
      lastEruption: "2014",
    },
  },
];
