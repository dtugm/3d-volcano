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

import { useTranslation } from "@/lib/i18n/useTranslation";
import type { LaharDataBundle } from "@/lib/lahar/hooks/use-lahar-data";
import { validateLSPClick } from "@/lib/lahar/lsp-validator";
import { useVolcano } from "@/lib/volcano";

interface Props {
  viewer: CesiumViewer | null;
  data: LaharDataBundle | undefined;
}

export default function SimSourcePicker({ viewer, data }: Props) {
  const { simulationMode, setSelectedLSP, setSimStatus } = useVolcano();
  const { t } = useTranslation();

  useEffect(() => {
    if (!viewer || !data || simulationMode === "off") return;
    const handler = new ScreenSpaceEventHandler(viewer.canvas);

    handler.setInputAction((evt: { position: Cartesian2 }) => {
      const ray = viewer.camera.getPickRay(evt.position);
      if (!ray) return;
      const cart = viewer.scene.globe.pick(ray, viewer.scene);
      if (!cart) return;
      const carto = Cartographic.fromCartesian(cart);
      const lng = CesiumMath.toDegrees(carto.longitude);
      const lat = CesiumMath.toDegrees(carto.latitude);

      const result = validateLSPClick(
        { lng, lat },
        {
          mainstem: data.mainstem,
          deposition: data.deposition,
          hazardCone: data.hazardCone,
          lspCandidates: data.lspCandidates,
        },
        { snapToleranceM: 80 },
      );

      if (!result.ok) {
        const msgMap = {
          outside_stream: t.simulation.rejection.outsideStream,
          below_hazard_cone: t.simulation.rejection.belowHazardCone,
          not_in_deposition: t.simulation.rejection.notInDeposition,
        } as const;
        console.warn("[LSP click rejected]", result.reason && msgMap[result.reason]);
        setSimStatus("error");
        return;
      }
      setSelectedLSP({
        lng: result.snapped!.lng,
        lat: result.snapped!.lat,
        candidate: result.candidate,
      });
      setSimStatus("idle");
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => handler.destroy();
  }, [viewer, data, simulationMode, setSelectedLSP, setSimStatus, t]);

  return null;
}
