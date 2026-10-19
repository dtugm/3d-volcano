import * as THREE from "three";

import { ElevationData } from "./types";

const NORMALIZED_SIZE = 100;

/**
 * Longest side of the generated grid, in vertices. Rasters larger than this
 * are decimated: every epoch is drawn as a translucent, double-sided surface,
 * so a full-resolution grid per epoch quickly reaches millions of triangles
 * without visibly improving the stacked view.
 */
const MAX_GRID_SIZE = 512;

/**
 * Creates a terrain mesh with exaggeration baked at 1.0x.
 * Use mesh.scale.y to change vertical exaggeration at runtime.
 * Use mesh.position.y to change layer offset at runtime.
 */
export function createTerrainMesh(
  data: ElevationData,
  color: string,
): THREE.Mesh {
  const { width, height, elevations, bounds, minElevation, noDataValue } = data;

  const extentX = bounds.maxX - bounds.minX;
  const extentY = bounds.maxY - bounds.minY;
  const longestAxis = Math.max(extentX, extentY);
  const scale = NORMALIZED_SIZE / longestAxis;

  const planeWidth = extentX * scale;
  const planeHeight = extentY * scale;

  const stride = Math.max(1, Math.ceil(Math.max(width, height) / MAX_GRID_SIZE));
  const cols = Math.ceil(width / stride);
  const rows = Math.ceil(height / stride);

  const geometry = new THREE.PlaneGeometry(
    planeWidth,
    planeHeight,
    cols - 1,
    rows - 1,
  );

  const positions = geometry.attributes.position;
  const elevRange = data.maxElevation - minElevation || 1;

  for (let i = 0; i < positions.count; i++) {
    const col = Math.min((i % cols) * stride, width - 1);
    const row = Math.min(Math.floor(i / cols) * stride, height - 1);
    const rasterIdx = row * width + col;

    let elev = elevations[rasterIdx];
    if ((noDataValue !== null && elev === noDataValue) || !isFinite(elev)) {
      elev = minElevation;
    }

    // Normalize elevation to scene units (exaggeration 1.0x baked in)
    const normalizedElev =
      ((elev - minElevation) / elevRange) * NORMALIZED_SIZE * 0.3;
    positions.setZ(i, normalizedElev);
  }

  // Rotate so terrain lies in XZ plane (Y = up)
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();

  const material = new THREE.MeshPhongMaterial({
    color,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    flatShading: false,
  });

  return new THREE.Mesh(geometry, material);
}
