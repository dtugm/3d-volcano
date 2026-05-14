import {
  booleanPointInPolygon,
  distance,
  nearestPointOnLine,
  point as turfPoint,
} from "@turf/turf";
import type {
  Feature,
  FeatureCollection,
  LineString,
  Polygon,
} from "geojson";

import type { LSPCandidate, LSPValidationResult } from "./types";

export interface LSPDataset {
  mainstem: FeatureCollection<LineString>;
  deposition: FeatureCollection<Polygon>;
  hazardCone: FeatureCollection<Polygon>;
  lspCandidates: LSPCandidate[];
}

export interface ValidateOptions {
  snapToleranceM: number;
  hazardConeOverride?: FeatureCollection<Polygon>;
}

export function validateLSPClick(
  click: { lng: number; lat: number },
  data: LSPDataset,
  opts: ValidateOptions,
): LSPValidationResult {
  const clickPt = turfPoint([click.lng, click.lat]);

  // 1. Snap to nearest mainstem segment vertex
  let bestSnap: { lng: number; lat: number; streamId: string; distM: number } | null = null;
  for (const stream of data.mainstem.features) {
    const snap = nearestPointOnLine(stream as Feature<LineString>, clickPt, {
      units: "kilometers",
    });
    const dKm = snap.properties.dist ?? Infinity;
    if (!bestSnap || dKm * 1000 < bestSnap.distM) {
      bestSnap = {
        lng: snap.geometry.coordinates[0],
        lat: snap.geometry.coordinates[1],
        streamId: String(stream.properties?.streamId ?? ""),
        distM: dKm * 1000,
      };
    }
  }
  if (!bestSnap || bestSnap.distM > opts.snapToleranceM) {
    return { ok: false, reason: "outside_stream" };
  }

  const snapped = { lng: bestSnap.lng, lat: bestSnap.lat };
  const snappedPt = turfPoint([snapped.lng, snapped.lat]);

  // 2. Must be inside hazard cone (upstream of proximal boundary)
  const cone = opts.hazardConeOverride ?? data.hazardCone;
  const insideCone = cone.features.some((p) =>
    booleanPointInPolygon(snappedPt, p as Feature<Polygon>),
  );
  if (!insideCone) return { ok: false, reason: "below_hazard_cone", snapped };

  // 3. Must be inside deposition polygon
  const insideDep = data.deposition.features.some((p) =>
    booleanPointInPolygon(snappedPt, p as Feature<Polygon>),
  );
  if (!insideDep) return { ok: false, reason: "not_in_deposition", snapped };

  // 4. Choose nearest LSP candidate on this stream (within 150 m)
  let candidate: LSPCandidate | undefined;
  let bestCandKm = Infinity;
  for (const c of data.lspCandidates) {
    if (c.streamId !== bestSnap.streamId) continue;
    const dKm = distance(snappedPt, turfPoint([c.lng, c.lat]), { units: "kilometers" });
    if (dKm < bestCandKm) {
      bestCandKm = dKm;
      candidate = c;
    }
  }
  if (candidate && bestCandKm * 1000 <= 150) {
    return { ok: true, snapped: { lng: candidate.lng, lat: candidate.lat }, candidate };
  }
  return { ok: true, snapped };
}
