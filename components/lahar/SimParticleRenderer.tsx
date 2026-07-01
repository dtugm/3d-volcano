"use client";

import {
  BillboardCollection,
  Cartesian2,
  Cartesian3,
  Color,
  HeightReference,
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

/**
 * Pre-generate a small radial-gradient disc image once, then reuse it as
 * the billboard texture for every particle. Billboards (unlike
 * PointPrimitive) support `heightReference: CLAMP_TO_GROUND`, so each
 * particle sticks to the terrain surface as the camera orbits.
 */
function makeDiscImage(rgb: [number, number, number]): HTMLCanvasElement {
  const size = 32;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  const [r, gC, b] = rgb;
  g.addColorStop(0, `rgba(${r}, ${gC}, ${b}, 1)`);
  g.addColorStop(0.6, `rgba(${r}, ${gC}, ${b}, 0.85)`);
  g.addColorStop(1, `rgba(${r}, ${gC}, ${b}, 0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

export default function SimParticleRenderer({
  viewer,
  meta,
  snapshot,
  rgb,
}: Props) {
  const collRef = useRef<BillboardCollection | null>(null);
  const imageRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !meta) return;
    if (!collRef.current) {
      collRef.current = new BillboardCollection({ scene: viewer.scene });
      viewer.scene.primitives.add(collRef.current);
    }
    if (!imageRef.current) imageRef.current = makeDiscImage(rgb);
  }, [viewer, meta, rgb]);

  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !meta || !snapshot?.particles)
      return;
    if (!collRef.current || !imageRef.current) return;
    const coll = collRef.current;
    coll.removeAll();
    const [w, s, e, n] = meta.bbox;
    const lonStep = (e - w) / meta.width;
    const latStep = (n - s) / meta.height;
    const image = imageRef.current;
    const baseColor = Color.fromBytes(rgb[0], rgb[1], rgb[2], 255);
    for (let i = 0; i < snapshot.particles.length; i += 3) {
      const r = snapshot.particles[i];
      const c = snapshot.particles[i + 1];
      const age = snapshot.particles[i + 2];
      const lng = w + (c + 0.5) * lonStep;
      const lat = n - (r + 0.5) * latStep;
      const fade = Math.max(0.35, 1 - age / 500);
      coll.add({
        position: Cartesian3.fromDegrees(lng, lat),
        image,
        color: new Color(baseColor.red, baseColor.green, baseColor.blue, fade),
        width: 14,
        height: 14,
        pixelOffset: new Cartesian2(0, -7),
        heightReference: HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      });
    }
  }, [viewer, meta, snapshot, rgb]);

  useEffect(
    () => () => {
      if (collRef.current && viewer && !viewer.isDestroyed()) {
        viewer.scene.primitives.remove(collRef.current);
      }
      collRef.current = null;
    },
    [viewer],
  );

  return null;
}
