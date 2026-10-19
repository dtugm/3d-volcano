"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import FpsOverlay from "@/components/fps-overlay";
import { createTerrainMesh } from "@/lib/half-3d/create-terrain-mesh";
import { loadGeoTiff } from "@/lib/half-3d/load-geotiff";
import type { EpochInfo } from "@/lib/half-3d/types";
import { useTranslation } from "@/lib/i18n";

import LayerControls from "./LayerControls";

interface TerrainViewerProps {
  epochs?: EpochInfo[];
}

export default function TerrainViewer({ epochs = [] }: TerrainViewerProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const epochsRef = useRef(epochs);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    meshes: THREE.Mesh[];
    animationId: number;
    invalidate: () => void;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [layerVisibility, setLayerVisibility] = useState<boolean[]>(() =>
    epochs.map(() => true),
  );
  const [verticalExaggeration, setVerticalExaggeration] = useState(1);
  const [layerSpacing, setLayerSpacing] = useState(0);
  const [showFps, setShowFps] = useState(false);
  const showFpsRef = useRef(showFps);
  const [fps, setFps] = useState(0);
  const [frameTime, setFrameTime] = useState(0);
  const fpsRef = useRef({ lastTime: 0, frames: 0 });

  useEffect(() => {
    showFpsRef.current = showFps;
    fpsRef.current = { lastTime: performance.now(), frames: 0 };
  }, [showFps]);

  const handleToggleLayer = useCallback((index: number) => {
    setLayerVisibility((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }, []);

  const handleSetAllLayers = useCallback(
    (visible: boolean) => {
      setLayerVisibility(epochs.map(() => visible));
    },
    [epochs],
  );

  // Initialize Three.js scene and load data
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0f1419);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      2000,
    );
    camera.position.set(80, 80, 80);
    camera.lookAt(0, 0, 0);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.target.set(0, 0, 0);

    // Lighting
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(50, 100, 50);
    scene.add(dirLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362d1b, 0.3);
    scene.add(hemisphereLight);

    // Render on demand: only draw when the camera moves or the scene changes.
    // controls.update() keeps running every frame so damping still settles.
    let needsRender = true;
    const invalidate = () => {
      needsRender = true;
    };
    controls.addEventListener("change", invalidate);

    // Store refs
    const state = {
      renderer,
      scene,
      camera,
      controls,
      meshes: [] as THREE.Mesh[],
      animationId: 0,
      invalidate,
    };
    sceneRef.current = state;

    // Animation loop with FPS tracking
    function animate() {
      state.animationId = requestAnimationFrame(animate);
      controls.update();

      // The FPS overlay measures a continuous loop.
      if (!needsRender && !showFpsRef.current) return;
      needsRender = false;
      renderer.render(scene, camera);

      if (!showFpsRef.current) return;
      const now = performance.now();
      fpsRef.current.frames++;
      const delta = now - fpsRef.current.lastTime;
      if (delta >= 500) {
        setFps(Math.round((fpsRef.current.frames * 1000) / delta));
        setFrameTime(delta / fpsRef.current.frames);
        fpsRef.current = { lastTime: now, frames: 0 };
      }
    }
    fpsRef.current = { lastTime: performance.now(), frames: 0 };
    animate();

    // Resize handling
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      invalidate();
    });
    resizeObserver.observe(container);

    // Load all GeoTIFFs
    let cancelled = false;
    (async () => {
      let count = 0;

      const promises = epochsRef.current.map(async (epoch) => {
        const data = await loadGeoTiff(epoch.url);
        if (cancelled) return data;
        count++;
        setLoadProgress(count);
        return data;
      });

      let results;
      try {
        results = await Promise.all(promises);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : String(err));
        }
        return;
      }
      if (cancelled) return;

      // Create meshes (geometry built once with exaggeration=1.0)
      const meshes: THREE.Mesh[] = [];
      results.forEach((data, i) => {
        const mesh = createTerrainMesh(data, epochsRef.current[i].color);
        mesh.name = epochsRef.current[i].id;
        mesh.scale.y = 1; // initial vertical exaggeration via scale
        mesh.position.y = 0; // initial spacing
        scene.add(mesh);
        meshes.push(mesh);
      });

      state.meshes = meshes;

      // Fit camera to all meshes
      const box = new THREE.Box3();
      meshes.forEach((m) => box.expandByObject(m));
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      controls.target.copy(center);
      camera.position.set(
        center.x + maxDim * 0.8,
        center.y + maxDim * 0.8,
        center.z + maxDim * 0.8,
      );
      camera.lookAt(center);
      controls.update();
      invalidate();

      setLoading(false);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(state.animationId);
      resizeObserver.disconnect();
      controls.removeEventListener("change", invalidate);
      controls.dispose();

      state.meshes.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });

      renderer.dispose();
      renderer.forceContextLoss();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, []);

  // Update layer visibility — just flips mesh.visible
  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    state.meshes.forEach((mesh, i) => {
      mesh.visible = layerVisibility[i];
    });
    state.invalidate();
  }, [layerVisibility, loading]);

  // Update vertical exaggeration — just changes mesh.scale.y (no geometry rebuild)
  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    state.meshes.forEach((mesh) => {
      mesh.scale.y = verticalExaggeration;
    });
    state.invalidate();
  }, [verticalExaggeration, loading]);

  // Update layer spacing — just changes mesh.position.y (no geometry rebuild)
  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    state.meshes.forEach((mesh, i) => {
      mesh.position.y = i * layerSpacing;
    });
    state.invalidate();
  }, [layerSpacing, loading]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F1419] px-6 text-center">
          {loadError ? (
            <>
              <div className="text-red-300 text-sm font-medium mb-1">
                {t.common.error}
              </div>
              <div className="text-white/50 text-xs max-w-sm break-words">
                {loadError}
              </div>
            </>
          ) : (
            <>
              <div className="text-white text-base font-medium mb-1">
                {t.slice.loading}
              </div>
              <div className="text-white/60 text-xs tabular-nums">
                {loadProgress} / {epochs.length} {t.slice.filesLoaded}
              </div>
              <div className="w-56 h-1 bg-white/15 rounded-full mt-4 overflow-hidden">
                <div
                  className="h-full bg-[#4285F4] rounded-full transition-all duration-300"
                  style={{ width: `${(loadProgress / epochs.length) * 100}%` }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {!loading && (
        <>
          <LayerControls
            epochs={epochs}
            layerVisibility={layerVisibility}
            onToggleLayer={handleToggleLayer}
            onSetAllLayers={handleSetAllLayers}
            verticalExaggeration={verticalExaggeration}
            onExaggerationChange={setVerticalExaggeration}
            layerSpacing={layerSpacing}
            onSpacingChange={setLayerSpacing}
          />
          <div className="pointer-events-none absolute bottom-4 left-4 hidden sm:block rounded-full bg-black/50 backdrop-blur-sm border border-white/10 px-3 py-1.5 text-[11px] text-white/70">
            {t.slice.hint}
          </div>
        </>
      )}

      <FpsOverlay
        fps={fps}
        frameTime={frameTime}
        visible={showFps}
        onToggle={() => setShowFps((v) => !v)}
      />
    </div>
  );
}
