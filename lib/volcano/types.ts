export interface Mountain {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  series: number;
  dates: string[];
  tilesetUrl?: string;
  terrainUrl?: string;
  orthoUrl?: string;
}

export const MOUNTAINS: Mountain[] = [
  {
    id: "gunung-agung",
    name: "Gunung Agung",
    latitude: -8.34,
    longitude: 115.51,
    elevation: 3031,
    series: 6,
    dates: [
      "2024-01-15",
      "2024-02-15",
      "2024-03-15",
      "2024-04-15",
      "2024-05-15",
      "2024-06-15",
    ],
    tilesetUrl:
      "https://digital-twin-ugm.s3.ap-southeast-1.amazonaws.com/dt-volcano/pnts_gunung_agung/tileset.json",
    terrainUrl:
      "https://digital-twin-ugm.s3.ap-southeast-1.amazonaws.com/dt-volcano/2017_wgs2",
    orthoUrl:
      "https://digital-twin-ugm.s3.ap-southeast-1.amazonaws.com/ortho-collection/volcano/gn_agung_2017",
  },
  {
    id: "gunung-kelud",
    name: "Gunung Kelud",
    latitude: -7.93,
    longitude: 112.31,
    elevation: 1731,
    series: 2,
    dates: ["2024-01-20", "2024-02-20"],
    // No tilesetUrl yet - not ready
  },
];
