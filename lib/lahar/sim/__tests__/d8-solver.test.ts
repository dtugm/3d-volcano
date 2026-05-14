import { describe, expect, it } from "vitest";

import { getProfile } from "@/lib/lahar/materials";
import { D8Solver } from "@/lib/lahar/sim/d8-solver";
import { DepthGrid } from "@/lib/lahar/sim/depth-grid";
import { TerrainGrid } from "@/lib/lahar/terrain/grid";

function southSlope(cols: number, rows: number) {
  const heights = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) heights[r * cols + c] = rows - r;
  return new TerrainGrid({
    heights, cols, rows, cellSizeM: 5,
    bbox: [0, 0, cols * 5, rows * 5],
  });
}

describe("D8Solver", () => {
  it("particles travel downhill (row index increases)", () => {
    const grid = southSlope(20, 20);
    const depth = new DepthGrid(20, 20);
    const s = new D8Solver(grid, depth, getProfile("lavaBasaltic"));
    s.setSource(2, 10);
    for (let i = 0; i < 30; i++) s.step();
    const avgRow =
      s.particles.reduce((sum, p) => sum + p.r, 0) / s.particles.length;
    expect(avgRow).toBeGreaterThan(2);
  });

  it("deposits non-zero depth along path", () => {
    const grid = southSlope(20, 20);
    const depth = new DepthGrid(20, 20);
    const s = new D8Solver(grid, depth, getProfile("lavaBasaltic"));
    s.setSource(2, 10);
    for (let i = 0; i < 30; i++) s.step();
    expect(depth.wettedCount()).toBeGreaterThan(5);
  });
});
