import { MAX_DEPTH } from "./constants";

export class DepthGrid {
  readonly cols: number;
  readonly rows: number;
  readonly data: Float32Array;
  maxDepth = 0;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.data = new Float32Array(cols * rows);
  }

  get(r: number, c: number): number {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return 0;
    return this.data[r * this.cols + c];
  }

  add(r: number, c: number, dh: number): void {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return;
    const i = r * this.cols + c;
    const v = Math.min(MAX_DEPTH, this.data[i] + dh);
    this.data[i] = v;
    if (v > this.maxDepth) this.maxDepth = v;
  }

  reset(): void {
    this.data.fill(0);
    this.maxDepth = 0;
  }

  wettedCount(): number {
    let n = 0;
    for (let i = 0; i < this.data.length; i++) if (this.data[i] > 0) n++;
    return n;
  }
}
