"use client";

import {
  ImageryLayer,
  Rectangle,
  SingleTileImageryProvider,
  Viewer as CesiumViewer,
} from "cesium";
import { useEffect, useRef } from "react";

import type { SimSnapshot } from "@/lib/lahar/types";

interface Props {
  viewer: CesiumViewer | null;
  bbox: [number, number, number, number] | undefined;
  snapshot: SimSnapshot | null;
  rgb: [number, number, number];
}

export default function SimDepthRenderer({ viewer, bbox, snapshot, rgb }: Props) {
  const layerRef = useRef<ImageryLayer | null>(null);

  useEffect(() => {
    if (!viewer || !bbox || !snapshot) return;
    const canvas = document.createElement("canvas");
    canvas.width = snapshot.cols;
    canvas.height = snapshot.rows;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(snapshot.cols, snapshot.rows);
    const maxD = Math.max(snapshot.maxDepth, 0.5);
    for (let i = 0; i < snapshot.depth.length; i++) {
      const d = snapshot.depth[i];
      const a = d <= 0 ? 0 : Math.min(255, Math.round((d / maxD) * 220 + 30));
      img.data[i * 4] = rgb[0];
      img.data[i * 4 + 1] = rgb[1];
      img.data[i * 4 + 2] = rgb[2];
      img.data[i * 4 + 3] = a;
    }
    ctx.putImageData(img, 0, 0);
    const url = canvas.toDataURL("image/png");
    const [w, s, e, n] = bbox;
    const rect = Rectangle.fromDegrees(w, s, e, n);

    let alive = true;
    SingleTileImageryProvider.fromUrl(url, { rectangle: rect }).then((provider) => {
      if (!alive) return;
      if (layerRef.current) viewer.scene.imageryLayers.remove(layerRef.current);
      layerRef.current = viewer.scene.imageryLayers.addImageryProvider(provider);
    });
    return () => {
      alive = false;
      if (layerRef.current) {
        viewer.scene.imageryLayers.remove(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [viewer, bbox, snapshot, rgb]);

  return null;
}
