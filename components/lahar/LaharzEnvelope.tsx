"use client";

import {
  Cartesian3,
  Color,
  Entity,
  PolygonHierarchy,
  Viewer as CesiumViewer,
} from "cesium";
import { useEffect, useRef } from "react";

import { hazardEnvelope } from "@/lib/lahar/laharz";
import type { MaterialProfile, VolumeTriple } from "@/lib/lahar/types";

interface Props {
  viewer: CesiumViewer | null;
  origin: { lng: number; lat: number } | null;
  volume: VolumeTriple;
  profile: MaterialProfile;
}

function ellipsePts(lng: number, lat: number, areaM2: number): Cartesian3[] {
  const radiusM = Math.sqrt(areaM2 / Math.PI);
  const radiusDeg = radiusM / 111_320;
  const pts: Cartesian3[] = [];
  for (let i = 0; i < 64; i++) {
    const th = (i / 64) * Math.PI * 2;
    pts.push(
      Cartesian3.fromDegrees(
        lng + Math.cos(th) * radiusDeg,
        lat + Math.sin(th) * radiusDeg,
      ),
    );
  }
  return pts;
}

export default function LaharzEnvelope({ viewer, origin, volume, profile }: Props) {
  const idsRef = useRef<Entity[]>([]);

  useEffect(() => {
    if (!viewer) return;
    for (const e of idsRef.current) viewer.entities.remove(e);
    idsRef.current = [];
    if (!origin) return;

    const env = hazardEnvelope(volume, profile);
    const layers = [
      { key: "low", area: env.low.planimetricArea, color: Color.YELLOW.withAlpha(0.18) },
      { key: "medium", area: env.medium.planimetricArea, color: Color.ORANGE.withAlpha(0.25) },
      { key: "high", area: env.high.planimetricArea, color: Color.RED.withAlpha(0.32) },
    ];
    for (const layer of layers) {
      const ent = viewer.entities.add({
        polygon: {
          hierarchy: new PolygonHierarchy(ellipsePts(origin.lng, origin.lat, layer.area)),
          material: layer.color,
          outline: false,
        },
      });
      idsRef.current.push(ent);
    }
    return () => {
      for (const e of idsRef.current) viewer.entities.remove(e);
      idsRef.current = [];
    };
  }, [viewer, origin, volume, profile]);

  return null;
}
