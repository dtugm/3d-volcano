"use client";

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
  TerrainProvider,
  TileMapServiceImageryProvider,
  Viewer as CesiumViewer,
} from "cesium";
import { useEffect, useRef, useState } from "react";
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
  const { activeMountain, activeMountainId, layerVisibility } = useVolcano();
  const previousMountainIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);
  const [terrainProvider, setTerrainProvider] =
    useState<TerrainProvider | null>(null);
  const [orthoImageryProvider, setOrthoImageryProvider] =
    useState<ImageryProvider | null>(null);

  const handleTilesetReady = (tileset: Cesium3DTilesetType) => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || viewer.isDestroyed()) return;

    // Cancel any pending camera flights
    viewer.camera.cancelFlight();

    // Use flyToBoundingSphere instead of zoomTo to avoid the updateTransform issue
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

  // Fly to the active mountain when it changes (only for mountains without tilesets)
  useEffect(() => {
    // Skip if this is the initial mount or same mountain
    if (
      previousMountainIdRef.current === null ||
      previousMountainIdRef.current === activeMountainId
    ) {
      previousMountainIdRef.current = activeMountainId;
      return;
    }

    previousMountainIdRef.current = activeMountainId;

    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || !activeMountain) return;

    // Only fly to coordinates if the mountain doesn't have a tileset
    // (mountains with tilesets will trigger handleTilesetReady when loaded)
    if (!activeMountain.tilesetUrl) {
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(
          activeMountain.longitude,
          activeMountain.latitude,
          5000,
        ),
        orientation: {
          heading: CesiumMath.toRadians(270),
          pitch: CesiumMath.toRadians(-18),
          roll: 0,
        },
      });
    }
  }, [activeMountain, activeMountainId]);

  // Load terrain provider when active mountain has terrain data
  useEffect(() => {
    let cancelled = false;

    if (activeMountain?.terrainUrl) {
      CesiumTerrainProvider.fromUrl(activeMountain.terrainUrl, {
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
  }, [activeMountain?.terrainUrl]);

  // Load ortho imagery provider when active mountain has ortho data
  useEffect(() => {
    let cancelled = false;

    if (activeMountain?.orthoUrl) {
      TileMapServiceImageryProvider.fromUrl(activeMountain.orthoUrl, {
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
  }, [activeMountain?.orthoUrl]);

  // Update terrain provider based on visibility toggle
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || viewer.isDestroyed()) return;

    if (layerVisibility.terrain && terrainProvider) {
      viewer.scene.globe.terrainProvider = terrainProvider;
    } else {
      // Reset to default ellipsoid terrain (flat)
      viewer.scene.globe.terrainProvider =
        new EllipsoidTerrainProvider();
    }
  }, [layerVisibility.terrain, terrainProvider]);

  return (
    <Viewer
      ref={viewerRef}
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
      {layerVisibility.ortho && orthoImageryProvider && (
        <ImageryLayer imageryProvider={orthoImageryProvider} />
      )}
      {layerVisibility.tiles3d && activeMountain?.tilesetUrl && (
        <Cesium3DTileset
          key={activeMountainId}
          url={activeMountain.tilesetUrl}
          onReady={handleTilesetReady}
        />
      )}
    </Viewer>
  );
}
