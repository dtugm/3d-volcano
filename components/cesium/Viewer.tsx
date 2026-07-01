"use client";

import "cesium/Build/Cesium/Widgets/widgets.css";

import {
  ArcGisMapServerImageryProvider,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Cesium3DTileset as Cesium3DTilesetType,
  CesiumTerrainProvider,
  Color,
  EllipsoidTerrainProvider,
  HeadingPitchRange,
  ImageryLayer as CesiumImageryLayer,
  ImageryProvider,
  Ion,
  IonImageryProvider,
  LabelStyle,
  Math as CesiumMath,
  OpenStreetMapImageryProvider,
  ScreenSpaceEventType,
  SplitDirection,
  TerrainProvider,
  TileMapServiceImageryProvider,
  Viewer as CesiumViewer,
} from "cesium";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Cesium3DTileset,
  CesiumComponentRef,
  EllipseGraphics,
  Entity,
  ImageryLayer,
  LabelGraphics,
  PointGraphics,
  PolylineGraphics,
  ScreenSpaceEvent,
  ScreenSpaceEventHandler,
  Viewer,
} from "resium";

import FpsOverlay from "@/components/fps-overlay";
import LaharzEnvelope from "@/components/lahar/LaharzEnvelope";
import SimDepthRenderer from "@/components/lahar/SimDepthRenderer";
import SimParticleRenderer from "@/components/lahar/SimParticleRenderer";
import SimSourcePicker from "@/components/lahar/SimSourcePicker";
import StreamRenderer from "@/components/lahar/StreamRenderer";
import { useLaharData } from "@/lib/lahar";
import { getProfile } from "@/lib/lahar/materials";
import { useSimSnapshot } from "@/lib/lahar/snapshot-context";
import { useVolcano } from "@/lib/volcano";

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

const DEFAULT_HEADING_PITCH_RANGE = new HeadingPitchRange(
  CesiumMath.toRadians(270),
  CesiumMath.toRadians(-18),
  1500,
);

const FLY_DURATION = 1.5; // seconds

const osmImageryProvider = new OpenStreetMapImageryProvider({
  url: "https://a.tile.openstreetmap.org/",
});

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
    basemap,
    simulationMode,
    materialProfile,
    selectedLSP,
    volumeInput,
    activeMeasurementMode,
    measuredData,
    setMeasuredData,
    isSimulatingVolume,
    simulationWaterLevel,
    simulationType,
  } = useVolcano();
  const simSnapshot = useSimSnapshot();
  const { data: laharData } = useLaharData(activeYearData?.laharData);
  const materialProfileObj = getProfile(materialProfile);
  const previousMountainIdRef = useRef<string | null>(null);
  const previousYearRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);
  const [viewerReady, setViewerReady] = useState(false);
  const [showFps, setShowFps] = useState(false);
  const [fps, setFps] = useState(0);
  const [frameTime, setFrameTime] = useState(0);
  const fpsRef = useRef({ lastTime: 0, frames: 0 });

  const [terrainProvider, setTerrainProvider] =
    useState<TerrainProvider | null>(null);
  const [orthoImageryProvider, setOrthoImageryProvider] =
    useState<ImageryProvider | null>(null);
  const [leftOrthoProvider, setLeftOrthoProvider] =
    useState<ImageryProvider | null>(null);
  const [rightOrthoProvider, setRightOrthoProvider] =
    useState<ImageryProvider | null>(null);
  const baseLayerRef = useRef<CesiumImageryLayer | null>(null);

  const [clickedPoints, setClickedPoints] = useState<Cartesian3[]>([]);

  // Reset local clickedPoints when measurement mode or mountain changes
  useEffect(() => {
    setClickedPoints([]);
  }, [activeMeasurementMode, activeMountainId]);

  // Change cursor to crosshair when measurement mode is active
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || viewer.isDestroyed()) return;
    const canvas = viewer.canvas;
    if (canvas) {
      if (activeMeasurementMode !== "none") {
        canvas.style.cursor = "crosshair";
      } else {
        canvas.style.cursor = "default";
      }
    }
  }, [activeMeasurementMode]);

  const handleLeftClick = (movement: { position?: Cartesian2; startPosition?: Cartesian2; endPosition?: Cartesian2 }) => {
    if (activeMeasurementMode === "none") return;
    const position = movement.position;
    if (!position) return;
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    let cartesian;
    if (viewer.scene.pickPositionSupported) {
      cartesian = viewer.scene.pickPosition(position);
    }
    
    if (!cartesian) {
      const ray = viewer.camera.getPickRay(position);
      if (ray) {
        cartesian = viewer.scene.globe.pick(ray, viewer.scene);
      }
    }

    if (!cartesian) return;

    setClickedPoints((prev) => {
      let nextPoints = [...prev];
      if (nextPoints.length >= 2) {
        nextPoints = [cartesian];
        setMeasuredData((d) => ({
          ...d,
          diameter: null,
          depth: null,
        }));
      } else {
        nextPoints.push(cartesian);
      }

      if (nextPoints.length === 2) {
        const p1 = nextPoints[0];
        const p2 = nextPoints[1];

        if (activeMeasurementMode === "ruler") {
          const distance3D = Cartesian3.distance(p1, p2);
          setMeasuredData((d) => ({
            ...d,
            diameter: Math.round(distance3D),
          }));
        } else if (activeMeasurementMode === "depth") {
          const c1 = Cartographic.fromCartesian(p1);
          const c2 = Cartographic.fromCartesian(p2);
          const depthVal = Math.abs(c1.height - c2.height);
          setMeasuredData((d) => ({
            ...d,
            depth: Math.round(depthVal),
          }));
        }
      }

      return nextPoints;
    });
  };

  const currentSimulatedRadius = useMemo(() => {
    if (!isSimulatingVolume || !activeMountain?.craterDetails) return 0;
    const { floorElevation, rimElevation, minRadius, maxRadius } = activeMountain.craterDetails;
    const fraction = Math.max(
      0,
      Math.min(1, (simulationWaterLevel - floorElevation) / (rimElevation - floorElevation))
    );
    return minRadius + fraction * (maxRadius - minRadius);
  }, [isSimulatingVolume, activeMountain, simulationWaterLevel]);

  // FPS tracking via Cesium postRender event
  useEffect(() => {
    if (!viewerReady || !showFps) return;
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || viewer.isDestroyed()) return;

    fpsRef.current = { lastTime: performance.now(), frames: 0 };

    const handler = () => {
      const now = performance.now();
      const delta = now - fpsRef.current.lastTime;
      fpsRef.current.frames++;
      if (delta >= 500) {
        const currentFps = Math.round((fpsRef.current.frames * 1000) / delta);
        setFps(currentFps);
        setFrameTime(delta / fpsRef.current.frames);
        fpsRef.current = { lastTime: now, frames: 0 };
      }
    };

    viewer.scene.postRender.addEventListener(handler);
    return () => {
      if (!viewer.isDestroyed()) {
        viewer.scene.postRender.removeEventListener(handler);
      }
    };
  }, [viewerReady, showFps]);

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

  // Swap base imagery layer imperatively to keep it at index 0
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || viewer.isDestroyed()) return;

    let cancelled = false;

    const applyBaseLayer = (provider: ImageryProvider) => {
      if (cancelled || viewer.isDestroyed()) return;
      const layers = viewer.imageryLayers;
      if (baseLayerRef.current) {
        layers.remove(baseLayerRef.current, true);
      }
      const newLayer = layers.addImageryProvider(provider, 0);
      baseLayerRef.current = newLayer;
    };

    switch (basemap) {
      case "osm":
        applyBaseLayer(osmImageryProvider);
        break;
      case "cesium":
        IonImageryProvider.fromAssetId(2).then((provider) => {
          applyBaseLayer(provider);
        });
        break;
      case "esri":
        ArcGisMapServerImageryProvider.fromUrl(
          "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
        ).then((provider) => {
          applyBaseLayer(provider);
        });
        break;
    }

    return () => {
      cancelled = true;
    };
  }, [basemap, viewerReady]);

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
    <div className="relative w-full h-full">
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
      baseLayer={false}
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
      {layerVisibility.gaussianSplat && activeYearData?.gaussianSplatUrl && (
        <Cesium3DTileset
          key={activeMountainId + activeYear + "-splat"}
          url={activeYearData.gaussianSplatUrl}
          onReady={handleTilesetReady}
        />
      )}
      {simulationMode !== "off" && laharData ? (
        <SimSourcePicker
          viewer={viewerRef.current?.cesiumElement ?? null}
          data={laharData}
        />
      ) : null}
      {simulationMode !== "off" && laharData ? (
        <StreamRenderer
          viewer={viewerRef.current?.cesiumElement ?? null}
          mainstem={laharData.mainstem}
          branches={laharData.branches}
          lspCandidates={laharData.lspCandidates}
          selectedLSP={selectedLSP}
        />
      ) : null}
      {simulationMode !== "off" && laharData ? (
        <SimDepthRenderer
          viewer={viewerRef.current?.cesiumElement ?? null}
          bbox={laharData.heightmapMeta.bbox}
          snapshot={simSnapshot}
          rgb={materialProfileObj.color}
        />
      ) : null}
      {simulationMode === "lava" && laharData ? (
        <SimParticleRenderer
          viewer={viewerRef.current?.cesiumElement ?? null}
          meta={laharData.heightmapMeta}
          snapshot={simSnapshot}
          rgb={materialProfileObj.color}
        />
      ) : null}
      {simulationMode !== "off" && selectedLSP ? (
        <LaharzEnvelope
          viewer={viewerRef.current?.cesiumElement ?? null}
          origin={selectedLSP}
          volume={volumeInput}
          profile={materialProfileObj}
        />
      ) : null}

      {/* Screen-space handler for picking measurement coordinates */}
      {activeMeasurementMode !== "none" && (
        <ScreenSpaceEventHandler>
          <ScreenSpaceEvent
            action={handleLeftClick}
            type={ScreenSpaceEventType.LEFT_CLICK}
          />
        </ScreenSpaceEventHandler>
      )}

      {/* Pins showing the clicked points */}
      {clickedPoints.map((point, index) => (
        <Entity
          key={`dimension-pin-${index}`}
          position={point}
        >
          <PointGraphics
            pixelSize={10}
            color={Color.YELLOW}
            outlineColor={Color.BLACK}
            outlineWidth={2}
            disableDepthTestDistance={Number.POSITIVE_INFINITY}
          />
          <LabelGraphics
            text={index === 0 ? "Titik A" : "Titik B"}
            font="bold 12px Outfit, Inter, sans-serif"
            fillColor={Color.WHITE}
            outlineColor={Color.BLACK}
            outlineWidth={3}
            style={LabelStyle.FILL_AND_OUTLINE}
            pixelOffset={new Cartesian2(0, -20)}
            disableDepthTestDistance={Number.POSITIVE_INFINITY}
          />
        </Entity>
      ))}

      {/* Glow polyline between two measurement points */}
      {clickedPoints.length === 2 && (
        <Entity>
          <PolylineGraphics
            positions={clickedPoints}
            width={4}
            material={Color.YELLOW}
          />
          <Entity position={Cartesian3.midpoint(clickedPoints[0], clickedPoints[1], new Cartesian3())}>
            <LabelGraphics
              text={
                activeMeasurementMode === "ruler"
                  ? `${measuredData.diameter ?? 0} m`
                  : `Selisih Ketinggian (Kedalaman): ${measuredData.depth ?? 0} m`
              }
              font="bold 14px Outfit, Inter, sans-serif"
              fillColor={Color.YELLOW}
              outlineColor={Color.BLACK}
              outlineWidth={3}
              style={LabelStyle.FILL_AND_OUTLINE}
              pixelOffset={new Cartesian2(0, -12)}
              disableDepthTestDistance={Number.POSITIVE_INFINITY}
            />
          </Entity>
        </Entity>
      )}

      {/* Real-time translucent water-lake or lava-dome visual volume simulator */}
      {isSimulatingVolume && activeMountain?.craterDetails && (
        <Entity
          position={Cartesian3.fromDegrees(
            activeMountain.craterDetails.craterCenter.longitude,
            activeMountain.craterDetails.craterCenter.latitude,
            simulationWaterLevel
          )}
        >
          <EllipseGraphics
            semiMajorAxis={currentSimulatedRadius}
            semiMinorAxis={currentSimulatedRadius}
            height={simulationWaterLevel}
            material={
              simulationType === "water"
                ? Color.AQUA.withAlpha(0.4)
                : Color.ORANGE.withAlpha(0.5)
            }
            outline={true}
            outlineColor={
              simulationType === "water" ? Color.AQUA : Color.ORANGE
            }
            outlineWidth={2}
          />
        </Entity>
      )}
    </Viewer>
    <FpsOverlay
      fps={fps}
      frameTime={frameTime}
      visible={showFps}
      onToggle={() => setShowFps((v) => !v)}
    />
    </div>
  );
}
