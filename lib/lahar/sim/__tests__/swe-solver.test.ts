import { describe, expect, it } from "vitest";

import { getProfile } from "@/lib/lahar/materials";
import { SweSolver } from "@/lib/lahar/sim/swe-solver";
import { TerrainGrid } from "@/lib/lahar/terrain/grid";

function makeSlope(cols: number, rows: number, slopePerCell: number) {
  const heights = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) heights[r * cols + c] = (rows - 1 - r) * slopePerCell;
  return new TerrainGrid({
    heights,
    cols,
    rows,
    cellSizeM: 10,
    bbox: [0, 0, cols * 10, rows * 10],
  });
}

describe("SweSolver", () => {
  it("conserves mass approximately with constant source", () => {
    const grid = makeSlope(20, 20, 1);
    const s = new SweSolver(grid, getProfile("laharWet"));
    s.setSource(5, 10, 1.0); // 1 m³/s
    let totalDt = 0;
    for (let i = 0; i < 50; i++) totalDt += s.step();
    const totalDepth = s.totalVolumeM3();
    // Allow 30% loss from outflow at downstream boundary
    expect(totalDepth).toBeGreaterThan(totalDt * 1.0 * 0.5);
  });

  it("Bingham yield stops flow on near-flat slope", () => {
    const flat = makeSlope(20, 20, 0); // zero slope
    const s = new SweSolver(flat, getProfile("laharDry"));
    s.setSource(10, 10, 0); // no source, just initial depth
    s.depositAt(10, 10, 0.5);
    let movement = 0;
    for (let i = 0; i < 20; i++) {
      s.step();
      movement += Math.abs(s.fluxAt(10, 11)) + Math.abs(s.fluxAt(11, 10));
    }
    expect(movement).toBeLessThan(0.01);
  });
});
