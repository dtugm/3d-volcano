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

/**
 * Render the SWE/D8 depth grid as a draped imagery layer on the terrain.
 *
 * Hot-path optimisations vs. the original implementation:
 *  - Reuses a single offscreen canvas + ImageData instead of allocating
 *    per snapshot.
 *  - Encodes via `canvas.toBlob` + `URL.createObjectURL` (raw PNG bytes,
 *    no base64) instead of `toDataURL` — about 30-50% faster and zero
 *    string allocation.
 *  - Skips re-render when `maxDepth === 0` (no material on the ground yet).
 *  - Revokes the previous object URL once the new layer is in place to
 *    avoid retaining megabytes of PNG blobs.
 */
export default function SimDepthRenderer({
  viewer,
  bbox,
  snapshot,
  rgb,
}: Props) {
  const layerRef = useRef<ImageryLayer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !bbox || !snapshot) return;
    if (snapshot.maxDepth <= 0) return; // nothing to draw yet

    // Lazily build the canvas + ImageData and reuse across frames.
    if (
      !canvasRef.current ||
      canvasRef.current.width !== snapshot.cols ||
      canvasRef.current.height !== snapshot.rows
    ) {
      canvasRef.current = document.createElement("canvas");
      canvasRef.current.width = snapshot.cols;
      canvasRef.current.height = snapshot.rows;
      imageDataRef.current = null;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (!imageDataRef.current) {
      imageDataRef.current = ctx.createImageData(snapshot.cols, snapshot.rows);
    }
    const img = imageDataRef.current;
    const data = img.data;
    const depth = snapshot.depth;
    // Normalise opacity against a fixed visual ceiling, not the raw running
    // max. Tying it to maxDepth meant a single deep cell dragged every other
    // cell's alpha toward zero, so the flow looked invisible. A ~5 m ceiling
    // keeps shallow flow (decimetres to a few metres) clearly visible while
    // still saturating for genuinely deep channels.
    const maxD = Math.min(Math.max(snapshot.maxDepth, 0.5), 5);
    const r = rgb[0];
    const g = rgb[1];
    const b = rgb[2];
    // Tight inner loop — keep allocation out, use bit-shifts for index.
    for (let i = 0; i < depth.length; i++) {
      const d = depth[i];
      const j = i << 2;
      if (d <= 0) {
        data[j + 3] = 0;
        continue;
      }
      const a = Math.min(255, ((d / maxD) * 195 + 60) | 0);
      data[j] = r;
      data[j + 1] = g;
      data[j + 2] = b;
      data[j + 3] = a;
    }
    ctx.putImageData(img, 0, 0);

    let alive = true;
    canvas.toBlob((blob) => {
      if (!alive || !blob || !viewer || viewer.isDestroyed()) return;
      const url = URL.createObjectURL(blob);
      const [w, s, e, n] = bbox;
      const rect = Rectangle.fromDegrees(w, s, e, n);
      SingleTileImageryProvider.fromUrl(url, { rectangle: rect })
        .then((provider) => {
          if (!alive || viewer.isDestroyed()) {
            URL.revokeObjectURL(url);
            return;
          }
          const prevLayer = layerRef.current;
          const prevUrl = objectUrlRef.current;
          const newLayer = viewer.scene.imageryLayers.addImageryProvider(
            provider,
          );
          layerRef.current = newLayer;
          objectUrlRef.current = url;
          if (prevLayer) viewer.scene.imageryLayers.remove(prevLayer);
          if (prevUrl) URL.revokeObjectURL(prevUrl);
        })
        .catch(() => URL.revokeObjectURL(url));
    }, "image/png");

    return () => {
      alive = false;
    };
  }, [viewer, bbox, snapshot, rgb]);

  // Cleanup on unmount.
  useEffect(
    () => () => {
      if (layerRef.current && viewer && !viewer.isDestroyed()) {
        viewer.scene.imageryLayers.remove(layerRef.current);
      }
      layerRef.current = null;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    },
    [viewer],
  );

  return null;
}
