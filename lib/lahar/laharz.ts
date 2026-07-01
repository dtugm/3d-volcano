import type { MaterialProfile, VolumeTriple } from "./types";

/**
 * LAHARZ empirical scaling (Iverson, Schilling & Vallance 1998):
 *
 *   A = a · V^(2/3)   (cross-sectional inundation area, m²)
 *   B = b · V^(2/3)   (planimetric inundation area, m²)
 *
 * Defaults a=0.05, b=200 are the original Iverson 1998 calibration for
 * volcanic lahars. Coefficients are stored per-material on
 * MATERIAL_PROFILES (Bernard et al. 2021 approach).
 */
export function laharzAreas(volumeM3: number, profile: MaterialProfile) {
  const v23 = Math.pow(Math.max(0, volumeM3), 2 / 3);
  return {
    crossSectionArea: profile.laharzA * v23,
    planimetricArea: profile.laharzB * v23,
  };
}

/**
 * 3-level hazard envelope: low/medium/high probability use V_max/V_likely/V_min
 * respectively. Low probability has the largest spatial footprint because
 * it uses the upper volume bound (Schilling 2014 confidence-level
 * methodology, implemented in LAHARZ as LDZCL).
 */
export interface HazardEnvelope {
  high: { crossSectionArea: number; planimetricArea: number };
  medium: { crossSectionArea: number; planimetricArea: number };
  low: { crossSectionArea: number; planimetricArea: number };
}

export function hazardEnvelope(
  v: VolumeTriple,
  profile: MaterialProfile,
): HazardEnvelope {
  return {
    high: laharzAreas(v.min, profile),
    medium: laharzAreas(v.likely, profile),
    low: laharzAreas(v.max, profile),
  };
}
