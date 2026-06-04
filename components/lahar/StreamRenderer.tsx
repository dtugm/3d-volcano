"use client";

import {
  Cartesian3,
  Color,
  Entity,
  HeightReference,
  PolylineGlowMaterialProperty,
  Viewer as CesiumViewer,
} from "cesium";
import type { FeatureCollection, LineString } from "geojson";
import { useEffect } from "react";

import type { LSPCandidate } from "@/lib/lahar/types";

interface Props {
  viewer: CesiumViewer | null;
  mainstem: FeatureCollection<LineString> | undefined;
  branches: FeatureCollection<LineString> | undefined;
  lspCandidates: LSPCandidate[] | undefined;
  selectedLSP: { lng: number; lat: number } | null;
}

function lineStringPositions(coords: number[][]): Cartesian3[] {
  return coords.map(([lng, lat]) => Cartesian3.fromDegrees(lng, lat));
}

export default function StreamRenderer({
  viewer,
  mainstem,
  branches,
  lspCandidates,
  selectedLSP,
}: Props) {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;
    const added: Entity[] = [];

    const mainstemMat = new PolylineGlowMaterialProperty({
      glowPower: 0.4,
      taperPower: 1.0,
      color: Color.fromCssColorString("#22d3ee"), // cyan-400
    });
    const branchMat = new PolylineGlowMaterialProperty({
      glowPower: 0.3,
      taperPower: 1.0,
      color: Color.fromCssColorString("#67e8f9").withAlpha(0.85), // cyan-300
    });

    if (mainstem) {
      for (const f of mainstem.features) {
        if (f.geometry.type !== "LineString") continue;
        // Width 10 ground-clamped polyline gives a fat hit area for picking.
        added.push(
          viewer.entities.add({
            polyline: {
              positions: lineStringPositions(f.geometry.coordinates),
              width: 10,
              material: mainstemMat,
              clampToGround: true,
              zIndex: 10,
            },
          }),
        );
      }
    }

    if (branches) {
      for (const f of branches.features) {
        if (f.geometry.type !== "LineString") continue;
        added.push(
          viewer.entities.add({
            polyline: {
              positions: lineStringPositions(f.geometry.coordinates),
              width: 4,
              material: branchMat,
              clampToGround: true,
              zIndex: 9,
            },
          }),
        );
      }
    }

    if (lspCandidates && lspCandidates.length) {
      for (const cand of lspCandidates) {
        // Use a billboard-like ellipse clamped to ground so the dot sits on
        // the terrain (does not parallax) and stays visible from any angle.
        added.push(
          viewer.entities.add({
            position: Cartesian3.fromDegrees(cand.lng, cand.lat),
            point: {
              pixelSize: 11,
              color: Color.fromCssColorString("#fde047"), // yellow-300
              outlineColor: Color.fromCssColorString("#1e293b"),
              outlineWidth: 2,
              // CLAMP_TO_GROUND on point ties the screen position to the
              // terrain surface; the dot will not float when the camera
              // orbits.
              heightReference: HeightReference.CLAMP_TO_GROUND,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          }),
        );
      }
    }

    if (selectedLSP) {
      added.push(
        viewer.entities.add({
          position: Cartesian3.fromDegrees(selectedLSP.lng, selectedLSP.lat),
          point: {
            pixelSize: 18,
            color: Color.fromCssColorString("#f97316"), // orange-500
            outlineColor: Color.WHITE,
            outlineWidth: 3,
            heightReference: HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          ellipse: {
            semiMajorAxis: 120,
            semiMinorAxis: 120,
            material: Color.fromCssColorString("#f97316").withAlpha(0.2),
            outline: true,
            outlineColor: Color.fromCssColorString("#f97316"),
            outlineWidth: 2,
            height: 0,
            heightReference: HeightReference.CLAMP_TO_GROUND,
          },
        }),
      );
    }

    return () => {
      for (const e of added) {
        if (!viewer.isDestroyed()) viewer.entities.remove(e);
      }
    };
  }, [viewer, mainstem, branches, lspCandidates, selectedLSP]);

  return null;
}
