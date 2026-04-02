"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { createTerrainMesh } from "@/lib/half-3d/create-terrain-mesh";
import { loadGeoTiff } from "@/lib/half-3d/load-geotiff";
import { EPOCHS } from "@/lib/half-3d/types";

import LayerControls from "./LayerControls";

export default function TerrainViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    meshes: THREE.Mesh[];
    animationId: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [layerVisibility, setLayerVisibility] = useState<boolean[]>(() =>
    EPOCHS.map(() => true),
  );
  const [verticalExaggeration, setVerticalExaggeration] = useState(1);
  const [layerSpacing, setLayerSpacing] = useState(0);

  const handleToggleLayer = useCallback((index: number) => {
    setLayerVisibility((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }, []);

  // Initialize Three.js scene and load data
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
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

    // Store refs
    const state = {
      renderer,
      scene,
      camera,
      controls,
      meshes: [] as THREE.Mesh[],
      animationId: 0,
    };
    sceneRef.current = state;

    // Animation loop
    function animate() {
      state.animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
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
    });
    resizeObserver.observe(container);

    // Load all GeoTIFFs
    let cancelled = false;
    (async () => {
      let count = 0;

      const promises = EPOCHS.map(async (epoch) => {
        const data = await loadGeoTiff(epoch.url);
        if (cancelled) return data;
        count++;
        setLoadProgress(count);
        return data;
      });

      const results = await Promise.all(promises);
      if (cancelled) return;

      // Create meshes (geometry built once with exaggeration=1.0)
      const meshes: THREE.Mesh[] = [];
      results.forEach((data, i) => {
        const mesh = createTerrainMesh(data, EPOCHS[i].color);
        mesh.name = EPOCHS[i].id;
        mesh.scale.y = 1; // initial vertical exaggeration via scale
        mesh.position.y = i * 0; // initial spacing
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

      setLoading(false);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(state.animationId);
      resizeObserver.disconnect();
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
  }, [layerVisibility]);

  // Update vertical exaggeration — just changes mesh.scale.y (no geometry rebuild)
  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    state.meshes.forEach((mesh) => {
      mesh.scale.y = verticalExaggeration;
    });
  }, [verticalExaggeration]);

  // Update layer spacing — just changes mesh.position.y (no geometry rebuild)
  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    state.meshes.forEach((mesh, i) => {
      mesh.position.y = i * layerSpacing;
    });
  }, [layerSpacing]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F1419]">
          <div className="text-white text-lg mb-2">Loading Terrain Data...</div>
          <div className="text-white/60 text-sm">
            {loadProgress} / {EPOCHS.length} files loaded
          </div>
          <div className="w-48 h-1 bg-white/20 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${(loadProgress / EPOCHS.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {!loading && (
        <LayerControls
          layerVisibility={layerVisibility}
          onToggleLayer={handleToggleLayer}
          verticalExaggeration={verticalExaggeration}
          onExaggerationChange={setVerticalExaggeration}
          layerSpacing={layerSpacing}
          onSpacingChange={setLayerSpacing}
        />
      )}
    </div>
  );
}
