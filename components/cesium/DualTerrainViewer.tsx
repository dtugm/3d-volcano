"use client";

import "cesium/Build/Cesium/Widgets/widgets.css";

import {
  Cartesian3,
  CesiumTerrainProvider,
  EllipsoidTerrainProvider,
  ImageryProvider,
  Ion,
  Math as CesiumMath,
  TerrainProvider,
  TileMapServiceImageryProvider,
  Viewer as CesiumViewer,
} from "cesium";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Cesium3DTileset,
  CesiumComponentRef,
  ImageryLayer,
  Viewer,
} from "resium";

import { useVolcano } from "@/lib/volcano";

import { useCameraSync } from "./useCameraSync";

declare global {
  interface Window {
    CESIUM_BASE_URL: string;
  }
}

if (typeof window !== "undefined") {
  window.CESIUM_BASE_URL = "/cesium";

  const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
  if (token) {
    Ion.defaultAccessToken = token;
  }
}

export default function DualTerrainViewer() {
  const {
    activeMountain,
    layerVisibility,
    splitPosition,
    comparisonLeftYearData,
    comparisonRightYearData,
  } = useVolcano();

  const leftCesiumRef = useRef<CesiumViewer | null>(null);
  const rightCesiumRef = useRef<CesiumViewer | null>(null);
  const isInitialLoadRef = useRef(true);

  const [leftTerrainProvider, setLeftTerrainProvider] =
    useState<TerrainProvider | null>(null);
  const [rightTerrainProvider, setRightTerrainProvider] =
    useState<TerrainProvider | null>(null);
  const [leftOrthoProvider, setLeftOrthoProvider] =
    useState<ImageryProvider | null>(null);
  const [rightOrthoProvider, setRightOrthoProvider] =
    useState<ImageryProvider | null>(null);

  const [bothReady, setBothReady] = useState(false);

  // Camera sync between the two viewers
  useCameraSync(leftCesiumRef, rightCesiumRef, bothReady);

  // Ref callbacks to capture the raw Cesium Viewer instances
  const leftRefCallback = useCallback(
    (ref: CesiumComponentRef<CesiumViewer> | null) => {
      leftCesiumRef.current = ref?.cesiumElement ?? null;
      if (leftCesiumRef.current && rightCesiumRef.current) {
        setBothReady(true);
      }
    },
    [],
  );

  const rightRefCallback = useCallback(
    (ref: CesiumComponentRef<CesiumViewer> | null) => {
      rightCesiumRef.current = ref?.cesiumElement ?? null;
      if (leftCesiumRef.current && rightCesiumRef.current) {
        setBothReady(true);
      }
    },
    [],
  );

  // Fly to mountain on initial load (on the left viewer, right follows via sync)
  useEffect(() => {
    if (!bothReady || !activeMountain) return;
    const viewer = leftCesiumRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    if (!isInitialLoadRef.current) return;
    isInitialLoadRef.current = false;

    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        activeMountain.longitude + 0.04,
        activeMountain.latitude,
        5000,
      ),
      orientation: {
        heading: CesiumMath.toRadians(270),
        pitch: CesiumMath.toRadians(-45),
        roll: 0,
      },
      duration: 0,
    });
  }, [bothReady, activeMountain]);

  // Load left terrain provider
  useEffect(() => {
    let cancelled = false;

    if (comparisonLeftYearData?.terrainUrl) {
      CesiumTerrainProvider.fromUrl(comparisonLeftYearData.terrainUrl, {
        requestVertexNormals: true,
      }).then((provider) => {
        if (!cancelled) setLeftTerrainProvider(provider);
      });
    }

    return () => {
      cancelled = true;
      setLeftTerrainProvider(null);
    };
  }, [comparisonLeftYearData?.terrainUrl]);

  // Load right terrain provider
  useEffect(() => {
    let cancelled = false;

    if (comparisonRightYearData?.terrainUrl) {
      CesiumTerrainProvider.fromUrl(comparisonRightYearData.terrainUrl, {
        requestVertexNormals: true,
      }).then((provider) => {
        if (!cancelled) setRightTerrainProvider(provider);
      });
    }

    return () => {
      cancelled = true;
      setRightTerrainProvider(null);
    };
  }, [comparisonRightYearData?.terrainUrl]);

  // Load left ortho provider
  useEffect(() => {
    let cancelled = false;

    if (comparisonLeftYearData?.orthoUrl) {
      TileMapServiceImageryProvider.fromUrl(comparisonLeftYearData.orthoUrl, {
        fileExtension: "png",
        maximumLevel: 17,
        minimumLevel: 11,
      }).then((provider) => {
        if (!cancelled) setLeftOrthoProvider(provider);
      });
    }

    return () => {
      cancelled = true;
      setLeftOrthoProvider(null);
    };
  }, [comparisonLeftYearData?.orthoUrl]);

  // Load right ortho provider
  useEffect(() => {
    let cancelled = false;

    if (comparisonRightYearData?.orthoUrl) {
      TileMapServiceImageryProvider.fromUrl(comparisonRightYearData.orthoUrl, {
        fileExtension: "png",
        maximumLevel: 17,
        minimumLevel: 11,
      }).then((provider) => {
        if (!cancelled) setRightOrthoProvider(provider);
      });
    }

    return () => {
      cancelled = true;
      setRightOrthoProvider(null);
    };
  }, [comparisonRightYearData?.orthoUrl]);

  // Apply terrain providers to viewers
  useEffect(() => {
    const viewer = leftCesiumRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    if (layerVisibility.terrain && leftTerrainProvider) {
      viewer.scene.globe.terrainProvider = leftTerrainProvider;
    } else {
      viewer.scene.globe.terrainProvider = new EllipsoidTerrainProvider();
    }
  }, [layerVisibility.terrain, leftTerrainProvider]);

  useEffect(() => {
    const viewer = rightCesiumRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    if (layerVisibility.terrain && rightTerrainProvider) {
      viewer.scene.globe.terrainProvider = rightTerrainProvider;
    } else {
      viewer.scene.globe.terrainProvider = new EllipsoidTerrainProvider();
    }
  }, [layerVisibility.terrain, rightTerrainProvider]);

  // Performance: reduce tile cache on both viewers
  useEffect(() => {
    const left = leftCesiumRef.current;
    const right = rightCesiumRef.current;
    if (left && !left.isDestroyed()) {
      left.scene.globe.tileCacheSize = 50;
    }
    if (right && !right.isDestroyed()) {
      right.scene.globe.tileCacheSize = 50;
    }
  }, [bothReady]);

  const viewerProps = {
    full: true,
    timeline: false,
    animation: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
    shadows: false,
  } as const;

  return (
    <div className="relative w-full h-full">
      {/* Left viewer */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: `inset(0 ${(1 - splitPosition) * 100}% 0 0)`,
        }}
      >
        <Viewer ref={leftRefCallback} {...viewerProps}>
          {layerVisibility.ortho && leftOrthoProvider && (
            <ImageryLayer imageryProvider={leftOrthoProvider} />
          )}
          {layerVisibility.gaussianSplat &&
            comparisonLeftYearData?.gaussianSplatUrl && (
              <Cesium3DTileset
                key={comparisonLeftYearData.gaussianSplatUrl + "-splat-left"}
                url={comparisonLeftYearData.gaussianSplatUrl}
              />
            )}
        </Viewer>
      </div>

      {/* Right viewer */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: `inset(0 0 0 ${splitPosition * 100}%)`,
        }}
      >
        <Viewer ref={rightRefCallback} {...viewerProps}>
          {layerVisibility.ortho && rightOrthoProvider && (
            <ImageryLayer imageryProvider={rightOrthoProvider} />
          )}
          {layerVisibility.gaussianSplat &&
            comparisonRightYearData?.gaussianSplatUrl && (
              <Cesium3DTileset
                key={comparisonRightYearData.gaussianSplatUrl + "-splat-right"}
                url={comparisonRightYearData.gaussianSplatUrl}
              />
            )}
        </Viewer>
      </div>
    </div>
  );
}
