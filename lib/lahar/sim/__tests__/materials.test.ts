import { describe, expect, it } from "vitest";

import { getProfile, MATERIAL_PROFILES, profilesByKind, routeSolver } from "@/lib/lahar/materials";

describe("MATERIAL_PROFILES", () => {
  it("has all four profiles", () => {
    expect(Object.keys(MATERIAL_PROFILES).sort()).toEqual([
      "laharDry",
      "laharWet",
      "lavaAndesitic",
      "lavaBasaltic",
    ]);
  });

  it("lahar profiles route to SWE solver", () => {
    expect(routeSolver(getProfile("laharWet"))).toBe("swe");
    expect(routeSolver(getProfile("laharDry"))).toBe("swe");
  });

  it("lava profiles route to D8 solver", () => {
    expect(routeSolver(getProfile("lavaBasaltic"))).toBe("d8");
    expect(routeSolver(getProfile("lavaAndesitic"))).toBe("d8");
  });

  it("LAHARZ B coefficient is largest for wet lahar (most spreading)", () => {
    const wet = getProfile("laharWet").laharzB;
    const andesitic = getProfile("lavaAndesitic").laharzB;
    expect(wet).toBeGreaterThan(andesitic);
  });

  it("yield strength is zero for wet lahar and positive for lava", () => {
    expect(getProfile("laharWet").yieldStrength).toBeLessThanOrEqual(50);
    expect(getProfile("lavaAndesitic").yieldStrength).toBeGreaterThan(500);
  });

  it("profilesByKind filters profiles by kind", () => {
    const lahars = profilesByKind("lahar");
    const lavas = profilesByKind("lava");
    expect(lahars).toHaveLength(2);
    expect(lavas).toHaveLength(2);
    expect(lahars.every((p) => p.kind === "lahar")).toBe(true);
    expect(lavas.every((p) => p.kind === "lava")).toBe(true);
  });
});
