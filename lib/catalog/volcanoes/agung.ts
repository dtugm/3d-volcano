import type { VolcanoEntry } from "../types";

const BUCKET = "https://bucket.dt-volcano.geo-ai.id";

export const agung: VolcanoEntry = {
  id: "gunung-agung",
  index: 1,
  code: "AGU",
  name: "Gunung Agung",
  island: "Bali",
  province: "Bali",
  type: "Stratovolcano",
  latitude: -8.34,
  longitude: 115.51,
  elevation: 3031,
  heightOffset: 47,
  photo: {
    src: "/landing/agung.jpg",
    author: "Slleong",
    license: "CC0",
    source: "https://commons.wikimedia.org/wiki/File:Gunung_Agung_1.jpg",
  },
  epochs: [
    {
      date: "2017",
      sources: {
        terrain: `${BUCKET}/DTM/gunung-agung/2017`,
        ortho: `${BUCKET}/ORTHO/gunung-agung/2017`,
        splat: `${BUCKET}/GaussianSplat/gunung-agung/2017_ver_1/tileset.json`,
      },
    },
    {
      date: "2017-10",
      sources: {
        terrain: `${BUCKET}/DTM/gunung-agung/2017_10`,
        ortho: `${BUCKET}/ORTHO/gunung-agung/2017_10`,
      },
    },
    {
      date: "2017-12",
      sources: {
        terrain: `${BUCKET}/DTM/gunung-agung/2017_12`,
        ortho: `${BUCKET}/ORTHO/gunung-agung/2017_12`,
      },
    },
    {
      date: "2019-07",
      sources: {
        terrain: `${BUCKET}/DTM/gunung-agung/2019_07`,
        ortho: `${BUCKET}/ORTHO/gunung-agung/2019_07`,
        splat: `${BUCKET}/GaussianSplat/gunung-agung/2019/tileset.json`,
      },
      // Fitted onto this epoch's DTM (residual MAD 3.0 m).
      splatAdjust: { translate: [-28.76, 26.36, -128.3], rotate: [4.531, 1.762, 2.095], scale: 1.0604 },
    },
    {
      date: "2020",
      sources: {
        terrain: `${BUCKET}/DTM/gunung-agung/2020`,
        ortho: `${BUCKET}/ORTHO/gunung-agung/2020`,
        splat: `${BUCKET}/GaussianSplat/gunung-agung/2020/tileset.json`,
      },
      // The Cesium ion placement is ~250 m too high, turned 6° and 9% too
      // small: fitted onto this epoch's DTM (surface splats, residual MAD 4.2 m).
      splatAdjust: { translate: [106.58, 40.18, -272.25], rotate: [-3.852, 1.791, 6.049], scale: 1.0923 },
    },
  ],
  slices: [
    { date: "2017-10-17", label: "Oct 17, 2017", url: `${BUCKET}/Half3D/Agung/T1.tif` },
    { date: "2017-10-20", label: "Oct 20, 2017", url: `${BUCKET}/Half3D/Agung/T2.tif` },
    { date: "2017-10-21", label: "Oct 21, 2017", url: `${BUCKET}/Half3D/Agung/T3.tif` },
    { date: "2017-12-16", label: "Dec 16, 2017", url: `${BUCKET}/Half3D/Agung/T4.tif` },
    { date: "2019-07-06", label: "Jul 6, 2019", url: `${BUCKET}/Half3D/Agung/T5.tif` },
    { date: "2020-07", label: "Jul 2020", url: `${BUCKET}/Half3D/Agung/T6.tif` },
  ],
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
};
