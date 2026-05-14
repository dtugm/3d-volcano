import { describe, expect, it } from "vitest";

import { TerrainGrid } from "@/lib/lahar/terrain/grid";

function makeGrid(cols: number, rows: number, fill: (r: number, c: number) => number) {
  const heights = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) heights[r * cols + c] = fill(r, c);
  return new TerrainGrid({
    heights,
    cols,
    rows,
    cellSizeM: 10,
    bbox: [0, 0, cols * 10, rows * 10],
  });
}

describe("TerrainGrid", () => {
  it("retrieves height by (r,c)", () => {
    const g = makeGrid(4, 3, (r, c) => r * 100 + c);
    expect(g.heightAt(2, 3)).toBe(203);
  });

  it("returns 0 outside bounds", () => {
    const g = makeGrid(4, 3, () => 100);
    expect(g.heightAt(-1, 0)).toBe(0);
    expect(g.heightAt(10, 10)).toBe(0);
  });

  it("converts lng/lat to (r,c) over equirectangular bbox", () => {
    const g = makeGrid(10, 10, () => 0);
    // bbox = [0,0,100,100]; cellSize=10
    // lng=55 -> col 5; lat=45 -> row 5 (row 0 = north = lat=100)
    const rc = g.lngLatToRc(55, 45);
    expect(rc.c).toBe(5);
    expect(rc.r).toBe(5);
  });
});
