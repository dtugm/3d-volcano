"use client";

// @ts-expect-error - Cesium doesn't have proper types for the CSS import
import "cesium/Build/Cesium/Widgets/widgets.css";

import {
  Cartesian3,
  Cesium3DTileset as Cesium3DTilesetType,
  CesiumTerrainProvider,
  EllipsoidTerrainProvider,
  HeadingPitchRange,
  ImageryProvider,
  Ion,
  Math as CesiumMath,
  SplitDirection,
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

declare global {
  interface Window {
    CESIUM_BASE_URL: string;
  }
}

if (typeof window !== "undefined") {
  window.CESIUM_BASE_URL = "/cesium";

  // Set up Cesium Ion token if available
  const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
  if (token) {
    Ion.defaultAccessToken = token;
  }
}

const DEFAULT_HEADING_PITCH_RANGE = new HeadingPitchRange(
  CesiumMath.toRadians(270),
  CesiumMath.toRadians(-18),
  1500,
);

const FLY_DURATION = 1.5; // seconds

export default function CesiumViewerComponent() {
  const viewerRef = useRef<CesiumComponentRef<CesiumViewer>>(null);
  const {
    activeMountain,
    activeMountainId,
    layerVisibility,
    activeYear,
    activeYearData,
    comparisonEnabled,
    splitPosition,
    comparisonLeftYearData,
    comparisonRightYearData,
  } = useVolcano();
  const previousMountainIdRef = useRef<string | null>(null);
  const previousYearRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);
  const [viewerReady, setViewerReady] = useState(false);
  const [terrainProvider, setTerrainProvider] =
    useState<TerrainProvider | null>(null);
  const [orthoImageryProvider, setOrthoImageryProvider] =
    useState<ImageryProvider | null>(null);
  const [leftOrthoProvider, setLeftOrthoProvider] =
    useState<ImageryProvider | null>(null);
  const [rightOrthoProvider, setRightOrthoProvider] =
    useState<ImageryProvider | null>(null);

  // Track when the Cesium viewer is mounted
  const viewerRefCallback = useCallback(
    (ref: CesiumComponentRef<CesiumViewer> | null) => {
      (
        viewerRef as React.MutableRefObject<CesiumComponentRef<CesiumViewer> | null>
      ).current = ref;
      if (ref?.cesiumElement) {
        setViewerReady(true);
      }
    },
    [],
  );

  const handleTilesetReady = (tileset: Cesium3DTilesetType) => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || viewer.isDestroyed()) return;

    // Only fly camera if mountain changed, not just year
    const mountainChanged =
      previousMountainIdRef.current !== null &&
      previousMountainIdRef.current !== activeMountainId;
    const isYearOnlyChange =
      !mountainChanged &&
      previousYearRef.current !== null &&
      previousYearRef.current !== activeYear;

    // Skip camera flight for year-only changes
    if (isYearOnlyChange) return;

    // Cancel any pending camera flights
    viewer.camera.cancelFlight();

    try {
      if (!tileset.isDestroyed() && tileset.boundingSphere) {
        const duration = isInitialLoadRef.current ? 0 : FLY_DURATION;
        isInitialLoadRef.current = false;

        viewer.camera.flyToBoundingSphere(tileset.boundingSphere, {
          offset: DEFAULT_HEADING_PITCH_RANGE,
          duration,
        });
      }
    } catch {
      // Tileset was destroyed before it was ready
    }
  };

  // Fly to the active mountain on initial load and when mountain changes
  useEffect(() => {
    if (!viewerReady) return;
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || !activeMountain) return;

    const isInitial = previousMountainIdRef.current === null;
    const isSameMountain = previousMountainIdRef.current === activeMountainId;

    previousMountainIdRef.current = activeMountainId;

    // Skip if same mountain (year-only change)
    if (!isInitial && isSameMountain) return;

    // For mountains with tilesets, handleTilesetReady handles camera
    if (activeYearData?.tilesetUrl) return;

    // Fly to mountain coordinates (instant on initial load)
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
      duration: isInitial ? 0 : FLY_DURATION,
    });
  }, [viewerReady, activeMountain, activeMountainId, activeYearData]);

  // Track year changes
  useEffect(() => {
    previousYearRef.current = activeYear;
  }, [activeYear]);

  // Load terrain provider when active year data has terrain
  useEffect(() => {
    let cancelled = false;

    if (activeYearData?.terrainUrl) {
      CesiumTerrainProvider.fromUrl(activeYearData.terrainUrl, {
        requestVertexNormals: true,
      }).then((provider) => {
        if (!cancelled) {
          setTerrainProvider(provider);
        }
      });
    }

    return () => {
      cancelled = true;
      setTerrainProvider(null);
    };
  }, [activeYearData?.terrainUrl]);

  // Load ortho imagery provider when active year data has ortho
  useEffect(() => {
    let cancelled = false;

    if (activeYearData?.orthoUrl) {
      TileMapServiceImageryProvider.fromUrl(activeYearData.orthoUrl, {
        fileExtension: "png",
        maximumLevel: 17,
        minimumLevel: 11,
      }).then((provider) => {
        if (!cancelled) {
          setOrthoImageryProvider(provider);
        }
      });
    }

    return () => {
      cancelled = true;
      setOrthoImageryProvider(null);
    };
  }, [activeYearData?.orthoUrl]);

  // Load left ortho provider for comparison
  useEffect(() => {
    let cancelled = false;

    if (comparisonEnabled && comparisonLeftYearData?.orthoUrl) {
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
  }, [comparisonEnabled, comparisonLeftYearData?.orthoUrl]);

  // Load right ortho provider for comparison
  useEffect(() => {
    let cancelled = false;

    if (comparisonEnabled && comparisonRightYearData?.orthoUrl) {
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
  }, [comparisonEnabled, comparisonRightYearData?.orthoUrl]);

  // Update scene split position
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || viewer.isDestroyed()) return;

    if (comparisonEnabled) {
      viewer.scene.splitPosition = splitPosition;
    } else {
      viewer.scene.splitPosition = 0.5;
    }
  }, [comparisonEnabled, splitPosition]);

  // Update terrain provider based on visibility toggle
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || viewer.isDestroyed()) return;

    if (layerVisibility.terrain && terrainProvider) {
      viewer.scene.globe.terrainProvider = terrainProvider;
    } else {
      // Reset to default ellipsoid terrain (flat)
      viewer.scene.globe.terrainProvider = new EllipsoidTerrainProvider();
    }
  }, [layerVisibility.terrain, terrainProvider]);

  return (
    <Viewer
      ref={viewerRefCallback}
      full
      timeline={false}
      animation={false}
      geocoder={false}
      homeButton={false}
      sceneModePicker={false}
      baseLayerPicker={false}
      navigationHelpButton={false}
      fullscreenButton={false}
    >
      {comparisonEnabled && layerVisibility.ortho && leftOrthoProvider && (
        <ImageryLayer
          imageryProvider={leftOrthoProvider}
          splitDirection={SplitDirection.LEFT}
        />
      )}
      {comparisonEnabled && layerVisibility.ortho && rightOrthoProvider && (
        <ImageryLayer
          imageryProvider={rightOrthoProvider}
          splitDirection={SplitDirection.RIGHT}
        />
      )}
      {!comparisonEnabled && layerVisibility.ortho && orthoImageryProvider && (
        <ImageryLayer imageryProvider={orthoImageryProvider} />
      )}
      {layerVisibility.tiles3d && activeYearData?.tilesetUrl && (
        <Cesium3DTileset
          key={activeMountainId + activeYear}
          url={activeYearData.tilesetUrl}
          onReady={handleTilesetReady}
        />
      )}
    </Viewer>
  );
}
