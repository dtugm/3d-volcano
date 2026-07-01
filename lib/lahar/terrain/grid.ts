export interface TerrainGridInit {
  heights: Float32Array;
  cols: number;
  rows: number;
  cellSizeM: number;
  bbox: [number, number, number, number]; // [w, s, e, n]
}

export class TerrainGrid {
  readonly heights: Float32Array;
  readonly cols: number;
  readonly rows: number;
  readonly cellSizeM: number;
  readonly bbox: [number, number, number, number];

  constructor(init: TerrainGridInit) {
    this.heights = init.heights;
    this.cols = init.cols;
    this.rows = init.rows;
    this.cellSizeM = init.cellSizeM;
    this.bbox = init.bbox;
  }

  get cellWidthM(): number {
    return this.cellSizeM;
  }
  get cellHeightM(): number {
    return this.cellSizeM;
  }

  heightAt(r: number, c: number): number {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return 0;
    return this.heights[r * this.cols + c];
  }

  lngLatToRc(lng: number, lat: number): { r: number; c: number } {
    const [w, s, e, n] = this.bbox;
    const c = Math.floor(((lng - w) / (e - w)) * this.cols);
    const r = Math.floor(((n - lat) / (n - s)) * this.rows);
    return { r, c };
  }

  rcToLngLat(r: number, c: number): { lng: number; lat: number } {
    const [w, s, e, n] = this.bbox;
    const lng = w + ((c + 0.5) / this.cols) * (e - w);
    const lat = n - ((r + 0.5) / this.rows) * (n - s);
    return { lng, lat };
  }
}
