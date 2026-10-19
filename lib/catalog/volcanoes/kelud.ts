import type { VolcanoEntry } from "../types";

const BUCKET = "https://bucket.dt-volcano.geo-ai.id";

export const kelud: VolcanoEntry = {
  id: "gunung-kelud",
  index: 2,
  code: "KLD",
  name: "Gunung Kelud",
  island: "Jawa",
  province: "Jawa Timur",
  type: "Stratovolcano",
  latitude: -7.93,
  longitude: 112.31,
  elevation: 1731,
  heightOffset: 50,
  photo: {
    src: "/landing/kelud-crater-lake.jpg",
    author: "Tirta Haloho",
    license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Mount_kelud_crater_lake_from_hiking_trail.jpg",
  },
  epochs: [
    {
      date: "2014",
      sources: {
        terrain: `${BUCKET}/DTM/gunung-kelud/2014`,
        ortho: `${BUCKET}/ORTHO/gunung-kelud/2014`,
        splat: `${BUCKET}/GaussianSplat/gunung-kelud/2014/tileset.json`,
      },
    },
    {
      date: "2026",
      sources: {
        terrain: `${BUCKET}/DTM/gunung-kelud/2026`,
        ortho: `${BUCKET}/ORTHO/gunung-kelud/2026`,
      },
    },
  ],
  slices: [
    { date: "2014", label: "2014", url: `${BUCKET}/Half3D/Kelud/clip_2014.tif` },
    { date: "2026", label: "2026", url: `${BUCKET}/Half3D/Kelud/clip_2026.tif` },
  ],
  craterDetails: {
    craterCenter: { latitude: -7.93, longitude: 112.308 },
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
};
