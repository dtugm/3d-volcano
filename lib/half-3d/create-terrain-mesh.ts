import * as THREE from "three";

import { ElevationData } from "./types";

const NORMALIZED_SIZE = 100;

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

  const geometry = new THREE.PlaneGeometry(
    planeWidth,
    planeHeight,
    width - 1,
    height - 1,
  );

  const positions = geometry.attributes.position;
  const elevRange = data.maxElevation - minElevation || 1;

  for (let i = 0; i < positions.count; i++) {
    const col = i % width;
    const row = Math.floor(i / width);
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
