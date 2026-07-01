import { routeSolver } from "../materials";
import type { TerrainGrid } from "../terrain/grid";
import type { MaterialProfile, SimSnapshot } from "../types";
import {
  DEPTH_INCREMENT,
  PARTICLES_PER_TICK,
  SNAPSHOT_INTERVAL,
} from "./constants";
import { D8Solver } from "./d8-solver";
import { DepthGrid } from "./depth-grid";
import { SweSolver } from "./swe-solver";

export class FluidEngine {
  readonly grid: TerrainGrid;
  props: MaterialProfile;
  depth: DepthGrid;
  step = 0;
  timeS = 0;
  budgetM3: number | null = null;
  injectedM3 = 0;
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
        this.swe.setSource(this.sourceR, this.sourceC, this.props.flowRate / 2);
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
    if (this.swe) this.swe.setSource(r, c, this.props.flowRate / 2);
    if (this.d8) this.d8.setSource(r, c);
  }

  setBudget(m3: number | null): void {
    this.budgetM3 = m3;
    this.applyInjectionGate();
  }

  reset(): void {
    this.depth.reset();
    this.step = 0;
    this.timeS = 0;
    this.injectedM3 = 0;
    this.initSolver();
    this.applyInjectionGate();
  }

  private applyInjectionGate(): void {
    const exhausted =
      this.budgetM3 !== null && this.injectedM3 >= this.budgetM3;
    if (this.swe) this.swe.injecting = !exhausted;
    if (this.d8) this.d8.injecting = !exhausted;
  }

  get injecting(): boolean {
    return this.swe?.injecting ?? this.d8?.injecting ?? true;
  }

  advance(steps: number): void {
    const cellArea = this.grid.cellSizeM * this.grid.cellSizeM;
    for (let i = 0; i < steps; i++) {
      this.applyInjectionGate();
      const injectingNow = this.injecting;
      if (this.swe) {
        const dt = this.swe.step();
        this.timeS += dt;
        if (injectingNow && this.sourceR >= 0) {
          this.injectedM3 += this.props.flowRate * dt;
        }
        // Sync SWE depth into shared depth grid for renderer
        for (let j = 0; j < this.depth.data.length; j++) {
          const v = this.swe.h[j];
          this.depth.data[j] = v;
          if (v > this.depth.maxDepth) this.depth.maxDepth = v;
        }
      } else if (this.d8) {
        this.d8.step();
        this.timeS += 1; // unitless tick for D8
        if (injectingNow && this.sourceR >= 0) {
          // Per-tick deposit estimate: each injected particle deposits
          // DEPTH_INCREMENT * spread of grid depth per step it survives.
          // Approximate per-tick injection volume as PARTICLES_PER_TICK
          // worth of one-step deposit. This is an under-estimate of
          // eventual deposit but stops infinite injection.
          this.injectedM3 +=
            PARTICLES_PER_TICK *
            DEPTH_INCREMENT *
            this.props.spread *
            cellArea;
        }
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
      injectedM3: this.injectedM3,
      budgetM3: this.budgetM3,
      injecting: this.injecting,
    };
  }

  shouldSnapshot(): boolean {
    return this.step % SNAPSHOT_INTERVAL === 0;
  }
}
