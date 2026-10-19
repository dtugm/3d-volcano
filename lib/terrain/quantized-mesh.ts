/**
 * Minimal quantized-mesh-1.0 decoder (Cesium terrain format).
 * Spec: https://github.com/CesiumGS/quantized-mesh
 *
 * Only what is needed to rasterise heights is decoded: header heights,
 * vertices and triangle indices. Edge lists and extensions are ignored.
 */

export interface QuantizedMesh {
  minHeight: number;
  maxHeight: number;
  /** 0..32767 across the tile, west → east. */
  u: Uint16Array;
  /** 0..32767 across the tile, south → north. */
  v: Uint16Array;
  /** Heights in metres. */
  heights: Float32Array;
  indices: Uint16Array | Uint32Array;
}

const HEADER_BYTES = 88;
const MAX_QUANTIZED = 32767;

function zigZagDecode(value: number) {
  return (value >> 1) ^ -(value & 1);
}

export function decodeQuantizedMesh(buffer: ArrayBuffer): QuantizedMesh {
  const view = new DataView(buffer);
  let offset = 24; // skip center (3 × float64)

  const minHeight = view.getFloat32(offset, true);
  const maxHeight = view.getFloat32(offset + 4, true);
  offset = HEADER_BYTES;

  const vertexCount = view.getUint32(offset, true);
  offset += 4;

  const u = new Uint16Array(vertexCount);
  const v = new Uint16Array(vertexCount);
  const heights = new Float32Array(vertexCount);

  // u, v and h buffers are zig-zag + delta encoded.
  let uAcc = 0;
  let vAcc = 0;
  let hAcc = 0;
  const uOffset = offset;
  const vOffset = uOffset + vertexCount * 2;
  const hOffset = vOffset + vertexCount * 2;
  const range = maxHeight - minHeight;
  for (let i = 0; i < vertexCount; i++) {
    uAcc += zigZagDecode(view.getUint16(uOffset + i * 2, true));
    vAcc += zigZagDecode(view.getUint16(vOffset + i * 2, true));
    hAcc += zigZagDecode(view.getUint16(hOffset + i * 2, true));
    u[i] = uAcc;
    v[i] = vAcc;
    heights[i] = minHeight + (hAcc / MAX_QUANTIZED) * range;
  }
  offset = hOffset + vertexCount * 2;

  const use32 = vertexCount > 65536;
  const indexBytes = use32 ? 4 : 2;
  // Index data is aligned to its element size.
  if (offset % indexBytes !== 0) offset += indexBytes - (offset % indexBytes);

  const triangleCount = view.getUint32(offset, true);
  offset += 4;

  const count = triangleCount * 3;
  const indices = use32 ? new Uint32Array(count) : new Uint16Array(count);
  // High-water-mark encoding.
  let highest = 0;
  for (let i = 0; i < count; i++) {
    const code = use32
      ? view.getUint32(offset + i * 4, true)
      : view.getUint16(offset + i * 2, true);
    indices[i] = highest - code;
    if (code === 0) highest++;
  }

  return { minHeight, maxHeight, u, v, heights, indices };
}

export const QUANTIZED_MAX = MAX_QUANTIZED;
