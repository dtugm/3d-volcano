"use client";

import { TilesRenderer } from "3d-tiles-renderer";
import { type CustomLayerInterface, MercatorCoordinate } from "maplibre-gl";
import {
  Application,
  Color,
  Entity,
  FILLMODE_NONE,
  type GSplatResourceBase,
  Quat as PcQuat,
  RESOLUTION_AUTO,
} from "playcanvas";
import { useEffect } from "react";
import { Group, Matrix4, PerspectiveCamera, Quaternion, Vector3 } from "three";

import { isMapAlive, SLOTS, useMapContext } from "@/components/map";
import type { SplatAdjust } from "@/lib/catalog";
import { useTwin } from "@/lib/twin/store";

import { multiply } from "./matrix";
import { decodeInWorker } from "./splat/decode-pool";
import { fetchCached } from "./splat/ranged-fetch";
import { createSpzResource } from "./splat/spz-resource";

/** After the camera stops, keep drawing this long: the splat sort finishes a few frames later. */
const SETTLE_MS = 700;
/** Screen error (px) a tile may show before a finer one loads. */
const ERROR_TARGET = 16;
/** Quantised splats cost ~20 bytes each on the GPU (no spherical harmonics). */
const BYTES_PER_SPLAT = 20;
const CACHE_BYTES = 600 * 1024 * 1024;
/**
 * Splats are fill-rate bound: every one is a blended quad. A 1× canvas is
 * 2.25× fewer pixels than 1.5× and looks the same on soft splats.
 */
const MAX_PIXEL_RATIO = 1;
/**
 * Most important splats kept per tile (see `decimate`). The Agung tiles hold
 * 1.3–3.5 M each with no coarser level; ~1.2 M each keeps the total (and the
 * per-move sort) around 5 M without visible loss from aerial views.
 */
const MAX_SPLATS_PER_TILE = 1_200_000;

// ------------------------------------------------------------ geodesy (WGS84)

const D = Math.PI / 180;
const A = 6378137;
const F = 1 / 298.257223563;
const E2 = F * (2 - F);

function geodeticFromEcef(x: number, y: number, z: number): [number, number, number] {
  const b = A * (1 - F);
  const ep2 = (A * A - b * b) / (b * b);
  const p = Math.hypot(x, y);
  const th = Math.atan2(z * A, p * b);
  const lon = Math.atan2(y, x);
  const lat = Math.atan2(z + ep2 * b * Math.sin(th) ** 3, p - E2 * A * Math.cos(th) ** 3);
  const N = A / Math.sqrt(1 - E2 * Math.sin(lat) ** 2);
  return [lon / D, lat / D, p / Math.cos(lat) - N];
}

/** East-north-up frame at a point, as a matrix to ECEF. */
function enuToEcef(lng: number, lat: number, h: number): Matrix4 {
  const l = lng * D;
  const f = lat * D;
  const N = A / Math.sqrt(1 - E2 * Math.sin(f) ** 2);
  const pos = new Vector3(
    (N + h) * Math.cos(f) * Math.cos(l),
    (N + h) * Math.cos(f) * Math.sin(l),
    (N * (1 - E2) + h) * Math.sin(f),
  );
  const east = new Vector3(-Math.sin(l), Math.cos(l), 0);
  const north = new Vector3(-Math.sin(f) * Math.cos(l), -Math.sin(f) * Math.sin(l), Math.cos(f));
  const up = new Vector3(Math.cos(f) * Math.cos(l), Math.cos(f) * Math.sin(l), Math.sin(f));
  return new Matrix4().makeBasis(east, north, up).setPosition(pos);
}

/** The catalogue correction as a matrix in the tileset's ENU frame. */
function adjustMatrix(adjust: SplatAdjust | undefined): Matrix4 {
  const m = new Matrix4();
  if (!adjust) return m;
  const [rx, ry, rz] = (adjust.rotate ?? [0, 0, 0]).map((deg) => deg * D);
  const s = adjust.scale ?? 1;
  return m
    .makeRotationZ(rz)
    .multiply(new Matrix4().makeRotationY(ry))
    .multiply(new Matrix4().makeRotationX(rx))
    .premultiply(new Matrix4().makeScale(s, s, s))
    .premultiply(new Matrix4().makeTranslation(...adjust.translate));
}

/**
 * MapLibre's matrix (mercator → clip) taken apart into a camera in the
 * splats' frame (metres, x east, y north, z up): world-from-camera matrix and
 * a canonical perspective projection.
 */
function decomposeClip(clip: Float64Array) {
  const combined = new Matrix4().fromArray(clip);
  const inverse = combined.clone().invert();
  const e = inverse.elements;
  const eye = new Vector3(e[8], e[9], e[10]).divideScalar(e[11]);
  const c = combined.elements;
  const back = new Vector3(-c[3], -c[7], -c[11]).normalize();
  const row0 = new Vector3(c[0], c[4], c[8]);
  const right = row0.addScaledVector(back, -row0.dot(back)).normalize();
  const up = new Vector3().crossVectors(back, right);
  const view = new Matrix4().makeBasis(right, up, back).setPosition(eye);
  let projection = combined.clone().multiply(view);
  if (projection.elements[5] < 0) {
    up.negate();
    view.makeBasis(right, up, back).setPosition(eye);
    projection = combined.clone().multiply(view);
  }
  const p = projection.elements;
  const w = -p[11];
  for (let i = 0; i < 16; i++) p[i] /= w;
  p[3] = p[7] = p[15] = 0;
  p[11] = -1;
  return { view, projection };
}

interface SplatEngineData {
  scene?: Group;
  geometry?: unknown[];
  materials?: unknown[];
  textures?: unknown[];
  transform?: Matrix4;
  pcEntity?: Entity;
  pcResource?: GSplatResourceBase;
  splatCount?: number;
}

/**
 * Gaussian splats (3D Tiles 1.1, glTF KHR_gaussian_splatting + SPZ), drawn
 * with the PlayCanvas engine — the renderer behind SuperSplat — in a canvas
 * laid over the map's.
 *
 * - `3d-tiles-renderer` only picks which tiles are needed (LOD, culling,
 *   cache); nothing is drawn with three.js.
 * - Tiles are decoded in workers and kept quantised on the GPU
 *   (`GSplatSpzResource`, ~20 B/splat instead of ~250 B with SH), and every
 *   tile shows as soon as it is ready instead of waiting for its siblings.
 * - PlayCanvas' unified renderer sorts all tiles together; the map's camera
 *   drives it every frame and rendering stops when the camera is still.
 *
 * Volcano tilesets are georeferenced through Cesium ion: the root transform
 * carries a scale and a tilted frame, so the ECEF placement is re-expressed in
 * an east-north-up frame at the tileset origin.
 */
export default function GaussianSplatLayer({
  url,
  heightOffset = 0,
  adjust,
  layerId = "dt:gaussian-splat",
  reportStatus = true,
}: {
  url: string;
  /** Metres added to the ellipsoidal height when draped on terrain (−geoid). */
  heightOffset?: number;
  /** Per-epoch georeference correction from the catalogue. */
  adjust?: SplatAdjust;
  layerId?: string;
  reportStatus?: boolean;
}) {
  const { map, ready, styleRevision } = useMapContext();
  const setSplat = useTwin((s) => s.setSplat);

  useEffect(() => {
    if (!ready) return;
    let disposed = false;

    // ---------------------------------------------------------- PlayCanvas
    const canvas = document.createElement("canvas");
    canvas.className = "dt-gaussian-splats";
    Object.assign(canvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
    });
    map.getCanvas().after(canvas);

    const app = new Application(canvas, {
      graphicsDeviceOptions: { alpha: true, antialias: false, premultipliedAlpha: true, depth: false },
    });
    app.setCanvasFillMode(FILLMODE_NONE);
    app.setCanvasResolution(RESOLUTION_AUTO);
    app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    app.autoRender = false;
    // PlayCanvas drops splats smaller than 2 px, tuned for close-up views.
    // From map distances most surface splats are sub-pixel, and dropping
    // them leaves the surface see-through: keep them all.
    app.scene.gsplat.minPixelSize = 0;
    app.start();

    const cameraEntity = new Entity("camera");
    cameraEntity.addComponent("camera", {
      clearColor: new Color(0, 0, 0, 0),
      nearClip: 0.5,
      farClip: 60000,
    });
    app.root.addChild(cameraEntity);
    const projectionData = new Float32Array(16);
    cameraEntity.camera!.calculateProjection = (mat) => {
      mat.set(Array.from(projectionData));
    };

    // Splats live under this root (frame: ENU at the tileset origin).
    const splatRoot = new Entity("splats");
    app.root.addChild(splatRoot);

    // ---------------------------------------------------------- tiles
    const selectionCamera = new PerspectiveCamera(50, 1, 0.5, 60000);
    const tiles = new TilesRenderer(url);
    tiles.errorTarget = ERROR_TARGET;
    tiles.lruCache.minBytesSize = CACHE_BYTES * 0.75;
    tiles.lruCache.maxBytesSize = CACHE_BYTES;
    tiles.setCamera(selectionCamera);

    const origin = { lng: 0, lat: 0, h: 0, ready: false };
    let enuInverse = new Matrix4();
    let flat = false;
    const loaded = new Set<{ engineData: SplatEngineData }>();

    tiles.addEventListener("load-tileset", () => {
      const root = tiles.root as {
        transform?: number[];
        content?: unknown;
        children?: { geometricError?: number; children?: unknown[] }[];
      } | null;
      if (origin.ready) return;
      if (!root?.transform) {
        // Local coordinates only: nothing to place it with.
        if (root && reportStatus) setSplat({ loading: false, progress: 0, error: "unplaced" });
        return;
      }
      // "Flat" tilesets (empty root, leaf children with geometric error 0 —
      // the Agung captures) have no coarser level: always refine the root,
      // and show each child as soon as it has loaded.
      flat =
        !root.content &&
        !!root.children?.length &&
        root.children.every((c) => !c.geometricError && !c.children?.length);
      if (flat) tiles.errorTarget = 0.01;
      const t = root.transform;
      const [lng, lat, h] = geodeticFromEcef(t[12], t[13], t[14]);
      Object.assign(origin, { lng, lat, h, ready: true });
      // ECEF → ENU at the origin, then the catalogue's correction.
      enuInverse = adjustMatrix(adjust).multiply(enuToEcef(lng, lat, h).invert());
      // Tile culling and LOD run in the same ENU frame as the camera.
      tiles.group.matrix.copy(enuInverse);
      tiles.group.matrixAutoUpdate = false;
      tiles.group.updateMatrixWorld(true);
      repaint();
    });

    const sceneMatrix = new Matrix4();
    const position = new Vector3();
    const quaternion = new Quaternion();
    const scale = new Vector3();

    const bytes = { loaded: 0, total: 0 };
    tiles.registerPlugin({
      name: "PLAYCANVAS_SPLAT_PLUGIN",
      priority: 1,
      fetchData: (fetchUrl: string, options: { signal?: AbortSignal }) => {
        if (!/\.glb(\?|$)/i.test(fetchUrl)) return null;
        return fetchCached(fetchUrl, options.signal, (delta) => {
          bytes.loaded += delta.loaded;
          bytes.total += delta.total;
          repaint();
        });
      },
      parseTile: (buffer: ArrayBuffer, tile: { engineData: SplatEngineData }, extension: string, _uri: string, signal: AbortSignal) => {
        if (!/^glb$/i.test(extension)) return null;
        return (async () => {
          const decoded = await decodeInWorker(buffer.slice(0), MAX_SPLATS_PER_TILE);
          if (disposed || signal.aborted) return null;
          const resource = createSpzResource(app.graphicsDevice, decoded.splats);
          const entity = new Entity("tile");
          entity.addComponent("gsplat", {});
          entity.gsplat!.resource = resource;
          entity.enabled = false;

          // tile → ECEF (glTF Y-up → 3D Tiles Z-up → tile transform) → ENU.
          sceneMatrix.identity();
          if (decoded.nodeMatrix) sceneMatrix.fromArray(decoded.nodeMatrix);
          sceneMatrix.premultiply((tiles as unknown as { _upRotationMatrix: Matrix4 })._upRotationMatrix);
          if (tile.engineData.transform) sceneMatrix.premultiply(tile.engineData.transform);
          sceneMatrix.premultiply(enuInverse);
          sceneMatrix.decompose(position, quaternion, scale);
          entity.setLocalPosition(position.x, position.y, position.z);
          entity.setLocalRotation(new PcQuat(quaternion.x, quaternion.y, quaternion.z, quaternion.w));
          entity.setLocalScale(scale.x, scale.y, scale.z);
          splatRoot.addChild(entity);

          const group = new Group();
          tile.engineData.scene = group;
          // 3d-tiles-renderer disposes these lists itself; nothing in three.js to free.
          tile.engineData.geometry = [];
          tile.engineData.materials = [];
          tile.engineData.textures = [];
          tile.engineData.pcEntity = entity;
          tile.engineData.pcResource = resource;
          tile.engineData.splatCount = decoded.splats.numSplats;
          loaded.add(tile);
          // Keep drawing while the new tile's first sort is in flight.
          movedAt = performance.now();
          repaint();
          return group;
        })();
      },
      disposeTile: (tile: { engineData: SplatEngineData }) => {
        const { pcEntity, pcResource } = tile.engineData;
        loaded.delete(tile);
        pcEntity?.destroy();
        pcResource?.destroy();
        tile.engineData.pcEntity = undefined;
        tile.engineData.pcResource = undefined;
      },
      calculateBytesUsed: (tile: { engineData: SplatEngineData }) =>
        (tile.engineData.splatCount ?? 0) * BYTES_PER_SPLAT,
    });

    // ---------------------------------------------------------- drawing
    let movedAt = 0;
    let frame: Float64Array | null = null;
    let lastReported = -1;
    const repaint = () => {
      if (!disposed && isMapAlive(map)) map.triggerRepaint();
    };
    const onMove = () => {
      movedAt = performance.now();
    };
    const fit = () => app.resizeCanvas();
    const report = () => {
      if (!reportStatus) return;
      // Byte progress of the tile downloads (the bulk of the wait), capped
      // below 1 until the tiles are also decoded.
      const byteShare = bytes.total ? bytes.loaded / bytes.total : 0;
      const raw = tiles.loadProgress < 1 ? Math.min(0.99, byteShare) : 1;
      const progress = Math.round(raw * 100) / 100;
      if (progress === lastReported) return;
      lastReported = progress;
      setSplat({ loading: progress < 1, progress });
    };
    if (reportStatus) setSplat({ loading: true, progress: 0 });
    map.on("move", onMove);
    map.on("resize", fit);
    // Sorting runs in a worker and its result is applied on the next render:
    // without a repaint, a freshly loaded tile stays undrawn until the map moves.
    app.scene.on("gsplat:sorted", repaint);

    const draw = () => {
      if (disposed || !frame) return;
      const { view, projection } = decomposeClip(frame);

      // Tile selection with an equivalent three.js camera.
      view.decompose(selectionCamera.position, selectionCamera.quaternion, selectionCamera.scale);
      selectionCamera.matrix.copy(view);
      selectionCamera.matrixWorld.copy(view);
      selectionCamera.matrixWorldInverse.copy(view).invert();
      selectionCamera.projectionMatrix.copy(projection);
      selectionCamera.projectionMatrixInverse.copy(projection).invert();
      const { width, height } = app.graphicsDevice;
      tiles.setResolution(selectionCamera, width, height);
      tiles.update();

      // Show what the selection wants. Flat tilesets have no coarser level to
      // fall back to, and 3d-tiles-renderer would hide every child until the
      // last sibling arrives: show each tile as soon as it is decoded.
      for (const tile of loaded) {
        const entity = tile.engineData.pcEntity;
        if (entity) entity.enabled = flat || tiles.visibleTiles.has(tile as never);
      }

      // PlayCanvas camera = the map's camera.
      projectionData.set(projection.elements);
      view.decompose(position, quaternion, scale);
      cameraEntity.setPosition(position.x, position.y, position.z);
      cameraEntity.setRotation(new PcQuat(quaternion.x, quaternion.y, quaternion.z, quaternion.w));
      app.render();

      report();
      // Still streaming, or the sort catching up with a move: draw again.
      if (tiles.loadProgress < 1 || performance.now() - movedAt < SETTLE_MS) repaint();
    };

    // Draws nothing in the map's context: it hands the frame's camera over.
    const model = new Array<number>(16).fill(0);
    const layer: CustomLayerInterface = {
      id: layerId,
      type: "custom",
      renderingMode: "3d",
      render(_gl, options) {
        if (!origin.ready) {
          // Let 3d-tiles-renderer fetch the tileset before we know where it is.
          tiles.setResolution(selectionCamera, 1, 1);
          tiles.update();
          return;
        }
        const anchor = MercatorCoordinate.fromLngLat([origin.lng, origin.lat], 0);
        const metres = anchor.meterInMercatorCoordinateUnits();
        // On terrain the frame sits at its true height; on the flat map its
        // origin plane goes to 0, where everything else is.
        const lift = map.getTerrain() ? 1 : 0;
        const z = (origin.h + heightOffset) * lift * metres;
        // Splat metres (x east, y north, z up) → mercator (x east, y south, z up).
        model.splice(0, 16, metres, 0, 0, 0, 0, -metres, 0, 0, 0, 0, metres, 0, anchor.x, anchor.y, z, 1);
        // Combined in double precision, so the splats do not jitter close up.
        frame = multiply(options.defaultProjectionData.mainMatrix as ArrayLike<number>, model);
        draw();
      },
    };
    map.addLayer(layer, map.getLayer(SLOTS.top) ? SLOTS.top : undefined);

    return () => {
      disposed = true;
      if (reportStatus) setSplat({ loading: false, progress: 0 });
      map.off("move", onMove);
      map.off("resize", fit);
      if (isMapAlive(map) && map.getLayer(layerId)) map.removeLayer(layerId);
      tiles.dispose();
      app.destroy();
      canvas.remove();
    };
  }, [map, ready, styleRevision, url, heightOffset, adjust, layerId, reportStatus, setSplat]);

  return null;
}
