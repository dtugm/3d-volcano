"use client";

import type { BoundingBox, GraphicsDevice, GSplatResourceBase } from "playcanvas";
import { GSplatSpzResource } from "playcanvas/scripts/esm/parsers/spz-parser.mjs";

import type { SpzSplats } from "@/lib/splat/spz";

/**
 * The data object PlayCanvas' `GSplatSpzResource` reads (same shape as the
 * engine's own SPZ parser output), without spherical harmonics.
 */
class SpzData {
  readonly shBands = 0;
  readonly shDim = 0;
  readonly sh = null;
  constructor(private readonly s: SpzSplats) {}
  get numSplats() {
    return this.s.numSplats;
  }
  get fractionalBits() {
    return this.s.fractionalBits;
  }
  get antialiased() {
    return this.s.antialiased;
  }
  get positions() {
    return this.s.positions;
  }
  get alphas() {
    return this.s.alphas;
  }
  get colors() {
    return this.s.colors;
  }
  get scales() {
    return this.s.scales;
  }
  get rotations() {
    return this.s.rotations;
  }

  /** Float centres for the sorter. */
  getCenters() {
    const { numSplats, positions } = this.s;
    const scale = 1 / (1 << this.s.fractionalBits);
    const centers = new Float32Array(numSplats * 3);
    for (let i = 0; i < numSplats * 3; i++) {
      const o = i * 3;
      const v = ((positions[o] | (positions[o + 1] << 8) | (positions[o + 2] << 16)) << 8) >> 8;
      centers[i] = v * scale;
    }
    return centers;
  }

  calcAabb(aabb: BoundingBox) {
    const c = this.getCenters();
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < c.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        if (c[i + k] < min[k]) min[k] = c[i + k];
        if (c[i + k] > max[k]) max[k] = c[i + k];
      }
    }
    aabb.center.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
    aabb.halfExtents.set((max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2);
  }
}

/** GPU resource keeping the quantised SPZ streams as uploaded textures. */
export function createSpzResource(device: GraphicsDevice, splats: SpzSplats): GSplatResourceBase {
  return new GSplatSpzResource(device, new SpzData(splats), { prepareCenters: true });
}
