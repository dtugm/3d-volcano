import { describe, expect, it } from "vitest";

import { laharzAreas } from "@/lib/lahar/laharz";
import { getProfile } from "@/lib/lahar/materials";

describe("laharzAreas", () => {
  const wet = getProfile("laharWet"); // A=0.05, B=200

  it("matches Iverson 1998 example: V=10^5 m³", () => {
    // A = 0.05 * V^(2/3) ; B = 200 * V^(2/3)
    // V^(2/3) for 1e5 = ~2154.43
    const { crossSectionArea, planimetricArea } = laharzAreas(1e5, wet);
    expect(crossSectionArea).toBeCloseTo(107.72, 1);
    expect(planimetricArea).toBeCloseTo(430886.94, 0);
  });

  it("scales with V^(2/3)", () => {
    const a1 = laharzAreas(1000, wet).planimetricArea;
    const a8 = laharzAreas(8000, wet).planimetricArea;
    // V multiplied by 8 -> V^(2/3) multiplied by 4
    expect(a8 / a1).toBeCloseTo(4, 5);
  });

  it("narrower envelope for andesitic lava (smaller B)", () => {
    const lava = getProfile("lavaAndesitic"); // B=30
    expect(laharzAreas(1e5, lava).planimetricArea)
      .toBeLessThan(laharzAreas(1e5, wet).planimetricArea);
  });
});
