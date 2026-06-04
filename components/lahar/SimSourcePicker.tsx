"use client";

import {
  Cartesian2,
  Cartographic,
  Math as CesiumMath,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer as CesiumViewer,
} from "cesium";
import { useEffect } from "react";

import type { LaharDataBundle } from "@/lib/lahar/hooks/use-lahar-data";
import { validateLSPClick } from "@/lib/lahar/lsp-validator";
import { useVolcano } from "@/lib/volcano";

interface Props {
  viewer: CesiumViewer | null;
  data: LaharDataBundle | undefined;
}

export default function SimSourcePicker({ viewer, data }: Props) {
  const { simulationMode, setSelectedLSP, setSimStatus, setSimRejection } =
    useVolcano();

  useEffect(() => {
    if (!viewer || !data || simulationMode === "off") return;
    const handler = new ScreenSpaceEventHandler(viewer.canvas);

    const runValidation = (lng: number, lat: number) => {
      const result = validateLSPClick(
        { lng, lat },
        {
          mainstem: data.mainstem,
          deposition: data.deposition,
          hazardCone: data.hazardCone,
          lspCandidates: data.lspCandidates,
        },
        { snapToleranceM: 250 },
      );

      if (!result.ok) {
        setSimRejection(result.reason ?? null);
        setSimStatus("error");
        return;
      }
      setSimRejection(null);
      setSelectedLSP({
        lng: result.snapped!.lng,
        lat: result.snapped!.lat,
        candidate: result.candidate,
      });
      setSimStatus("idle");
    };

    handler.setInputAction((evt: { position: Cartesian2 }) => {
      const ray = viewer.camera.getPickRay(evt.position);
      if (!ray) return;
      const cart = viewer.scene.globe.pick(ray, viewer.scene);
      if (!cart) return;
      const carto = Cartographic.fromCartesian(cart);
      runValidation(
        CesiumMath.toDegrees(carto.longitude),
        CesiumMath.toDegrees(carto.latitude),
      );
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => handler.destroy();
  }, [
    viewer,
    data,
    simulationMode,
    setSelectedLSP,
    setSimStatus,
    setSimRejection,
  ]);

  return null;
}
