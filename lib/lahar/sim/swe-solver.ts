import type { TerrainGrid } from "../terrain/grid";
import type { MaterialProfile } from "../types";
import { CFL, G, H_MIN, MAX_DEPTH, MAX_DT } from "./constants";

// Absolute ceiling on the per-width flux (m²/s). Stops a single cell's
// momentum from exploding if the terrain gradient is pathological.
const Q_MAX = MAX_DEPTH * 30;

/**
 * 2D shallow-water (Saint-Venant) solver, explicit first-order upwind.
 * State per cell: h (depth), qx (x-flux), qy (y-flux), row-major.
 *
 * Adds a Bingham yield-stress term (Iverson & George 2014): if the bed
 * shear stress τ = ρ·g·h·|∇z| is below the yield strength τ_y, the
 * momentum flux is zeroed for that cell. This produces the realistic
 * "stop on low slope" behaviour that distinguishes lahar from water.
 *
 * Row 0 is the northernmost row.
 */
export class SweSolver {
  readonly grid: TerrainGrid;
  readonly props: MaterialProfile;

  h: Float32Array;
  qx: Float32Array;
  qy: Float32Array;
  private hNew: Float32Array;
  private qxNew: Float32Array;
  private qyNew: Float32Array;

  injecting = true;
  private sourceR = -1;
  private sourceC = -1;
  private sourceQ = 0; // m³/s

  constructor(grid: TerrainGrid, props: MaterialProfile) {
    this.grid = grid;
    this.props = props;
    const size = grid.cols * grid.rows;
    this.h = new Float32Array(size);
    this.qx = new Float32Array(size);
    this.qy = new Float32Array(size);
    this.hNew = new Float32Array(size);
    this.qxNew = new Float32Array(size);
    this.qyNew = new Float32Array(size);
  }

  setSource(r: number, c: number, Q: number): void {
    this.sourceR = r;
    this.sourceC = c;
    this.sourceQ = Q;
  }

  depositAt(r: number, c: number, depthM: number): void {
    const i = r * this.grid.cols + c;
    this.h[i] += depthM;
  }

  fluxAt(r: number, c: number): number {
    const i = r * this.grid.cols + c;
    return Math.hypot(this.qx[i], this.qy[i]);
  }

  totalVolumeM3(): number {
    const area = this.grid.cellSizeM * this.grid.cellSizeM;
    let v = 0;
    for (let i = 0; i < this.h.length; i++) v += this.h[i];
    return v * area;
  }

  private computeDt(): number {
    let hMax = 0;
    for (let i = 0; i < this.h.length; i++) if (this.h[i] > hMax) hMax = this.h[i];
    if (hMax < H_MIN) return 1.0;
    const wave = Math.sqrt(G * hMax);
    return Math.min(MAX_DT, (CFL * this.grid.cellSizeM) / wave);
  }

  step(): number {
    const { cols, rows, cellSizeM } = this.grid;
    const { density, manningN, yieldStrength } = this.props;
    const dt = this.computeDt();
    const dx = cellSizeM;
    const dy = cellSizeM;

    // Source injection
    if (this.injecting && this.sourceR >= 0 && this.sourceQ > 0) {
      const cellArea = dx * dy;
      this.h[this.sourceR * cols + this.sourceC] += (this.sourceQ * dt) / cellArea;
    }

    this.hNew.set(this.h);
    this.qxNew.set(this.qx);
    this.qyNew.set(this.qy);

    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const i = r * cols + c;
        const hC = this.h[i];

        // Continuity via conservative donor-cell (first-order upwind) flux
        // differencing. Face fluxes are taken from the upwind cell based on
        // the sign of the flux at the face, which is stable under the CFL
        // timestep without the heavy smearing of Lax-Friedrichs. The previous
        // centred FTCS form (hC - dt*centred-divergence) had no dissipation,
        // was unconditionally unstable, and let depth blow up to >1000 m —
        // which washed the renderer's depth-normalised opacity to nothing.
        // qy is positive toward +row (south, since row 0 is north).
        const fE = this.qx[i] + this.qx[i + 1] >= 0 ? this.qx[i] : this.qx[i + 1];
        const fW = this.qx[i - 1] + this.qx[i] >= 0 ? this.qx[i - 1] : this.qx[i];
        const fS =
          this.qy[i] + this.qy[i + cols] >= 0 ? this.qy[i] : this.qy[i + cols];
        const fN =
          this.qy[i - cols] + this.qy[i] >= 0 ? this.qy[i - cols] : this.qy[i];
        let hn = hC - dt * ((fE - fW) / dx + (fS - fN) / dy);
        if (hn < 0) hn = 0;
        else if (hn > MAX_DEPTH) hn = MAX_DEPTH;
        this.hNew[i] = hn;

        if (hC < H_MIN) {
          this.qxNew[i] = 0;
          this.qyNew[i] = 0;
          continue;
        }

        // Free-surface gradient
        const zE = this.grid.heightAt(r, c + 1);
        const zW = this.grid.heightAt(r, c - 1);
        const zS = this.grid.heightAt(r + 1, c);
        const zN = this.grid.heightAt(r - 1, c);
        const dHdx = (zE + this.h[i + 1] - zW - this.h[i - 1]) / (2 * dx);
        const dHdy = (zS + this.h[i + cols] - zN - this.h[i - cols]) / (2 * dy);
        const slopeMag = Math.hypot(dHdx, dHdy);

        // Bingham yield: bed shear stress must exceed yield strength to flow
        const tau = density * G * hC * slopeMag;
        if (tau < yieldStrength) {
          this.qxNew[i] = 0;
          this.qyNew[i] = 0;
          continue;
        }

        // Momentum: gravity drive − friction
        const u = this.qx[i] / Math.max(hC, H_MIN);
        const v = this.qy[i] / Math.max(hC, H_MIN);
        const speed = Math.hypot(u, v);
        const hPow = Math.pow(Math.max(hC, H_MIN), 4 / 3);
        const friction = (G * manningN * manningN * speed) / hPow;
        const frictionFactor = Math.min(friction * dt, 1.0); // clamp to avoid sign flip
        let nqx = this.qx[i] * (1 - frictionFactor) + dt * (-G * hC * dHdx);
        let nqy = this.qy[i] * (1 - frictionFactor) + dt * (-G * hC * dHdy);
        if (nqx > Q_MAX) nqx = Q_MAX;
        else if (nqx < -Q_MAX) nqx = -Q_MAX;
        if (nqy > Q_MAX) nqy = Q_MAX;
        else if (nqy < -Q_MAX) nqy = -Q_MAX;
        this.qxNew[i] = nqx;
        this.qyNew[i] = nqy;
      }
    }

    this.h.set(this.hNew);
    this.qx.set(this.qxNew);
    this.qy.set(this.qyNew);
    return dt;
  }
}
