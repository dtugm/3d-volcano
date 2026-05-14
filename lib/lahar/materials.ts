import type { MaterialProfile, MaterialProfileId } from "./types";

/**
 * Material profiles for lahar and lava simulation.
 *
 * Density / viscosity / yield strength values from:
 *   - Iverson, R.M. (1997). The physics of debris flows.
 *   - Iverson & George (2014). Depth-averaged debris-flow model.
 *   - Manville et al. (2009). Lahar physical properties.
 *   - Harris & Rowland (2015). Lava flows: types, dynamics, rheology.
 *
 * LAHARZ coefficients A, B follow Iverson, Schilling & Vallance (1998),
 * with material-dependent adjustments inspired by Bernard et al. (2021)
 * for fire-related debris flows (narrower channels, longer runout for
 * coarser material).
 */
export const MATERIAL_PROFILES: Record<MaterialProfileId, MaterialProfile> = {
  laharWet: {
    id: "laharWet",
    kind: "lahar",
    displayName: "Lahar (wet, hyperconcentrated)",
    density: 1800,
    viscosity: 200,
    yieldStrength: 30,
    manningN: 0.08,
    flowRate: 50,
    spread: 5,
    color: [120, 80, 40],
    laharzA: 0.05,
    laharzB: 200,
  },
  laharDry: {
    id: "laharDry",
    kind: "lahar",
    displayName: "Lahar (dry, debris-rich)",
    density: 2000,
    viscosity: 600,
    yieldStrength: 200,
    manningN: 0.12,
    flowRate: 30,
    spread: 3,
    color: [110, 70, 35],
    laharzA: 0.07,
    laharzB: 160,
  },
  lavaBasaltic: {
    id: "lavaBasaltic",
    kind: "lava",
    displayName: "Lava (basaltic)",
    density: 2800,
    viscosity: 1e5,
    yieldStrength: 300,
    manningN: 0.15,
    flowRate: 10,
    spread: 2,
    color: [255, 90, 0],
    laharzA: 0.10,
    laharzB: 80,
  },
  lavaAndesitic: {
    id: "lavaAndesitic",
    kind: "lava",
    displayName: "Lava (andesitic)",
    density: 2500,
    viscosity: 1e7,
    yieldStrength: 2000,
    manningN: 0.18,
    flowRate: 4,
    spread: 1,
    color: [200, 60, 0],
    laharzA: 0.20,
    laharzB: 30,
  },
};

export function getProfile(id: MaterialProfileId): MaterialProfile {
  return MATERIAL_PROFILES[id];
}

export function routeSolver(profile: MaterialProfile): "swe" | "d8" {
  return profile.kind === "lahar" ? "swe" : "d8";
}

export function profilesByKind(kind: MaterialProfile["kind"]): MaterialProfile[] {
  return Object.values(MATERIAL_PROFILES).filter((p) => p.kind === kind);
}
