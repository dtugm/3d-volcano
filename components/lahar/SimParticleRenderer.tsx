"use client";

import {
  Cartesian3,
  Color,
  PointPrimitiveCollection,
  Viewer as CesiumViewer,
} from "cesium";
import { useEffect, useRef } from "react";

import type { HeightmapMeta, SimSnapshot } from "@/lib/lahar/types";

interface Props {
  viewer: CesiumViewer | null;
  meta: HeightmapMeta | undefined;
  snapshot: SimSnapshot | null;
  rgb: [number, number, number];
}

export default function SimParticleRenderer({ viewer, meta, snapshot, rgb }: Props) {
  const collRef = useRef<PointPrimitiveCollection | null>(null);

  useEffect(() => {
    if (!viewer || !meta || !snapshot?.particles) return;
    if (!collRef.current) {
      collRef.current = new PointPrimitiveCollection();
      viewer.scene.primitives.add(collRef.current);
    }
    const coll = collRef.current;
    coll.removeAll();
    const [w, s, e, n] = meta.bbox;
    const lonStep = (e - w) / meta.width;
    const latStep = (n - s) / meta.height;
    for (let i = 0; i < snapshot.particles.length; i += 3) {
      const r = snapshot.particles[i];
      const c = snapshot.particles[i + 1];
      const age = snapshot.particles[i + 2];
      const lng = w + (c + 0.5) * lonStep;
      const lat = n - (r + 0.5) * latStep;
      const fade = Math.max(0.2, 1 - age / 500);
      coll.add({
        position: Cartesian3.fromDegrees(lng, lat, 50),
        color: new Color(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, fade),
        pixelSize: 6,
      });
    }
  }, [viewer, meta, snapshot, rgb]);

  useEffect(
    () => () => {
      if (collRef.current && viewer) {
        viewer.scene.primitives.remove(collRef.current);
        collRef.current = null;
      }
    },
    [viewer],
  );

  return null;
}
