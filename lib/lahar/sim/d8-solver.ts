import type { TerrainGrid } from "../terrain/grid";
import type { MaterialProfile } from "../types";
import {
  DEPTH_INCREMENT,
  MAX_PARTICLE_AGE,
  MAX_PARTICLES,
  PARTICLES_PER_TICK,
  SPREAD_PROB,
} from "./constants";
import type { DepthGrid } from "./depth-grid";

const D8_DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [ 0, -1],          [ 0, 1],
  [ 1, -1], [ 1, 0], [ 1, 1],
] as const;
const D8_DIST = [Math.SQRT2, 1, Math.SQRT2, 1, 1, Math.SQRT2, 1, Math.SQRT2];

interface Particle {
  r: number;
  c: number;
  age: number;
}

export class D8Solver {
  readonly grid: TerrainGrid;
  readonly depth: DepthGrid;
  readonly props: MaterialProfile;
  particles: Particle[] = [];
  private sourceR = -1;
  private sourceC = -1;

  constructor(grid: TerrainGrid, depth: DepthGrid, props: MaterialProfile) {
    this.grid = grid;
    this.depth = depth;
    this.props = props;
  }

  setSource(r: number, c: number): void {
    this.sourceR = r;
    this.sourceC = c;
  }

  private downhill(r: number, c: number): { r: number; c: number } | null {
    const surf = (rr: number, cc: number) =>
      this.grid.heightAt(rr, cc) + this.depth.get(rr, cc);
    const me = surf(r, c);
    let bestSlope = 0;
    let best: { r: number; c: number } | null = null;
    for (let d = 0; d < 8; d++) {
      const [dr, dc] = D8_DIRS[d];
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= this.grid.rows || nc < 0 || nc >= this.grid.cols) continue;
      const s = (me - surf(nr, nc)) / (D8_DIST[d] * this.grid.cellSizeM);
      if (s > bestSlope) {
        bestSlope = s;
        best = { r: nr, c: nc };
      }
    }
    return best;
  }

  step(): void {
    // Inject
    if (this.sourceR >= 0 && this.particles.length < MAX_PARTICLES) {
      for (let i = 0; i < PARTICLES_PER_TICK; i++) {
        this.particles.push({ r: this.sourceR, c: this.sourceC, age: 0 });
      }
    }

    // Advance
    const survivors: Particle[] = [];
    for (const p of this.particles) {
      p.age++;
      if (p.age > MAX_PARTICLE_AGE) continue;

      this.depth.add(p.r, p.c, DEPTH_INCREMENT * this.props.spread);

      const nb = this.downhill(p.r, p.c);
      if (!nb) continue; // stuck in sink — drop particle

      // Lateral spread with probability proportional to viscosity^-1
      if (Math.random() < SPREAD_PROB) {
        const dr = nb.r - p.r;
        const dc = nb.c - p.c;
        // Perpendicular jitter
        const jr = dc === 0 ? (Math.random() < 0.5 ? -1 : 1) : 0;
        const jc = dr === 0 ? (Math.random() < 0.5 ? -1 : 1) : 0;
        const nr = p.r + jr;
        const nc = p.c + jc;
        if (
          nr >= 0 && nr < this.grid.rows &&
          nc >= 0 && nc < this.grid.cols
        ) {
          this.depth.add(nr, nc, DEPTH_INCREMENT * this.props.spread * 0.5);
        }
      }

      p.r = nb.r;
      p.c = nb.c;
      survivors.push(p);
    }
    this.particles = survivors;
  }
}
