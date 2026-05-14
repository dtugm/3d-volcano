import { routeSolver } from "../materials";
import type { TerrainGrid } from "../terrain/grid";
import type { MaterialProfile, SimSnapshot } from "../types";
import { SNAPSHOT_INTERVAL } from "./constants";
import { D8Solver } from "./d8-solver";
import { DepthGrid } from "./depth-grid";
import { SweSolver } from "./swe-solver";

export class FluidEngine {
  readonly grid: TerrainGrid;
  props: MaterialProfile;
  depth: DepthGrid;
  step = 0;
  timeS = 0;
  private mode: "swe" | "d8";
  private swe: SweSolver | null = null;
  private d8: D8Solver | null = null;
  private sourceR = -1;
  private sourceC = -1;

  constructor(grid: TerrainGrid, props: MaterialProfile) {
    this.grid = grid;
    this.props = props;
    this.depth = new DepthGrid(grid.cols, grid.rows);
    this.mode = routeSolver(props);
    this.initSolver();
  }

  private initSolver(): void {
    if (this.mode === "swe") {
      this.swe = new SweSolver(this.grid, this.props);
      this.d8 = null;
      if (this.sourceR >= 0) {
        this.swe.setSource(this.sourceR, this.sourceC, this.props.flowRate / 1000);
      }
    } else {
      this.d8 = new D8Solver(this.grid, this.depth, this.props);
      this.swe = null;
      if (this.sourceR >= 0) this.d8.setSource(this.sourceR, this.sourceC);
    }
  }

  setProps(props: MaterialProfile): void {
    this.props = props;
    const next = routeSolver(props);
    if (next !== this.mode) {
      this.mode = next;
      this.depth.reset();
      this.step = 0;
      this.timeS = 0;
    }
    this.initSolver();
  }

  setSource(r: number, c: number): void {
    this.sourceR = r;
    this.sourceC = c;
    if (this.swe) this.swe.setSource(r, c, this.props.flowRate / 1000);
    if (this.d8) this.d8.setSource(r, c);
  }

  reset(): void {
    this.depth.reset();
    this.step = 0;
    this.timeS = 0;
    this.initSolver();
  }

  advance(steps: number): void {
    for (let i = 0; i < steps; i++) {
      if (this.swe) {
        const dt = this.swe.step();
        this.timeS += dt;
        // Sync SWE depth into shared depth grid for renderer
        for (let j = 0; j < this.depth.data.length; j++) {
          const v = this.swe.h[j];
          this.depth.data[j] = v;
          if (v > this.depth.maxDepth) this.depth.maxDepth = v;
        }
      } else if (this.d8) {
        this.d8.step();
        this.timeS += 1; // unitless tick for D8
      }
      this.step++;
    }
  }

  snapshot(): SimSnapshot {
    let particles: Float32Array | undefined;
    if (this.d8 && this.d8.particles.length) {
      particles = new Float32Array(this.d8.particles.length * 3);
      for (let i = 0; i < this.d8.particles.length; i++) {
        const p = this.d8.particles[i];
        particles[i * 3] = p.r;
        particles[i * 3 + 1] = p.c;
        particles[i * 3 + 2] = p.age;
      }
    }
    return {
      step: this.step,
      timeS: this.timeS,
      cols: this.grid.cols,
      rows: this.grid.rows,
      depth: new Float32Array(this.depth.data),
      particles,
      maxDepth: this.depth.maxDepth,
      wettedCells: this.depth.wettedCount(),
    };
  }

  shouldSnapshot(): boolean {
    return this.step % SNAPSHOT_INTERVAL === 0;
  }
}
