/**
 * Decoding of Gaussian splat tiles: glTF (GLB) with
 * `KHR_gaussian_splatting_compression_spz_2`, whose buffer view holds a
 * standard gzip'd SPZ file (https://github.com/nianticlabs/spz), versions 2–3.
 *
 * The output keeps SPZ's quantised streams, in the layout PlayCanvas'
 * `GSplatSpzResource` uploads to the GPU as-is (~20 bytes per splat):
 * 24-bit positions, 8-bit alpha / colour / log-scale and smallest-three
 * rotations. Spherical harmonics are dropped: for aerial volcano captures
 * they cost 2–3× the memory for barely visible view-dependent shading.
 */

const NGSP_MAGIC = 0x5053474e;
const SH_DIM_FOR_DEGREE = [0, 3, 8, 15, 24];

export interface SpzSplats {
  numSplats: number;
  fractionalBits: number;
  antialiased: boolean;
  /** 3 × 24-bit little-endian fixed point per splat. */
  positions: Uint8Array;
  /** Opacity with the sigmoid applied, 1 byte per splat. */
  alphas: Uint8Array;
  /** SH DC colour (c · 0.15 + 0.5), 3 bytes per splat. */
  colors: Uint8Array;
  /** Log scale (s / 16 − 10), 3 bytes per splat. */
  scales: Uint8Array;
  /** Smallest-three quaternion, 4 bytes per splat. */
  rotations: Uint8Array;
}

export interface SplatTile {
  splats: SpzSplats;
  /** Column-major node matrix of the splat primitive (glTF space). */
  nodeMatrix: number[] | null;
}

const GLB_MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;

interface GltfJson {
  meshes?: { primitives: { extensions?: Record<string, { extensions?: Record<string, { bufferView: number }> }> }[] }[];
  nodes?: { mesh?: number; matrix?: number[]; children?: number[] }[];
  bufferViews?: { buffer: number; byteOffset?: number; byteLength: number }[];
}

/** Finds the SPZ payload and its node matrix in a GLB. */
function extractSpz(glb: ArrayBuffer): { spz: Uint8Array; nodeMatrix: number[] | null } {
  const view = new DataView(glb);
  if (view.getUint32(0, true) !== GLB_MAGIC) throw new Error("Not a GLB file");
  let offset = 12;
  let json: GltfJson | null = null;
  let bin: Uint8Array | null = null;
  while (offset < glb.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (start + length > glb.byteLength) {
      throw new Error(`Truncated GLB: chunk ends at ${start + length}, file has ${glb.byteLength} bytes`);
    }
    if (type === CHUNK_JSON) json = JSON.parse(new TextDecoder().decode(new Uint8Array(glb, start, length)));
    else if (type === CHUNK_BIN) bin = new Uint8Array(glb, start, length);
    offset = start + length;
  }
  if (!json || !bin) throw new Error("GLB without JSON or BIN chunk");

  const meshIndex = json.meshes?.findIndex((m) =>
    m.primitives.some((p) => p.extensions?.KHR_gaussian_splatting),
  );
  if (meshIndex === undefined || meshIndex < 0) throw new Error("No KHR_gaussian_splatting primitive");
  const primitive = json.meshes![meshIndex].primitives.find((p) => p.extensions?.KHR_gaussian_splatting)!;
  const spzExt = primitive.extensions!.KHR_gaussian_splatting.extensions?.KHR_gaussian_splatting_compression_spz_2;
  if (!spzExt) throw new Error("Splat primitive is not SPZ-compressed");
  const bufferView = json.bufferViews![spzExt.bufferView];
  const spz = bin.subarray(bufferView.byteOffset ?? 0, (bufferView.byteOffset ?? 0) + bufferView.byteLength);

  const node = json.nodes?.find((n) => n.mesh === meshIndex);
  return { spz, nodeMatrix: node?.matrix ?? null };
}

async function gunzip(data: Uint8Array): Promise<ArrayBuffer> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

/**
 * SPZ v2 stores rotations as the first three components of a w ≥ 0
 * quaternion (byte / 127.5 − 1); v3 already uses smallest-three. Re-pack v2
 * to smallest-three: the largest component's index in the top two bits,
 * the other three as 9-bit magnitude (scaled by 1/√2) + sign bit, the highest
 * index in the lowest bits.
 */
function packSmallestThree(src: Uint8Array, count: number): Uint8Array {
  const out = new Uint8Array(count * 4);
  const view = new DataView(out.buffer);
  const q = new Float64Array(4);
  const SCALE = 511 / Math.SQRT1_2;
  for (let i = 0; i < count; i++) {
    q[0] = src[i * 3] / 127.5 - 1;
    q[1] = src[i * 3 + 1] / 127.5 - 1;
    q[2] = src[i * 3 + 2] / 127.5 - 1;
    q[3] = Math.sqrt(Math.max(0, 1 - q[0] * q[0] - q[1] * q[1] - q[2] * q[2]));
    const len = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
    let largest = 0;
    for (let k = 1; k < 4; k++) if (Math.abs(q[k]) > Math.abs(q[largest])) largest = k;
    const sign = q[largest] < 0 ? -1 : 1;
    let word = 0;
    let shift = 0;
    for (let k = 3; k >= 0; k--) {
      if (k === largest) continue;
      const v = (q[k] / len) * sign;
      const magnitude = Math.min(511, Math.round(Math.abs(v) * SCALE));
      word |= (magnitude | (v < 0 ? 0x200 : 0)) << shift;
      shift += 10;
    }
    word |= largest << 30;
    view.setUint32(i * 4, word >>> 0, true);
  }
  return out;
}

/**
 * Keeps the `max` most important splats: opacity × footprint (exp of the
 * mean log scale, squared). Tiny or faint splats barely show from aerial
 * distances but cost as much to sort and draw as any other.
 */
function decimate(s: SpzSplats, max: number): SpzSplats {
  const n = s.numSplats;
  if (n <= max) return s;
  const importance = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const logScale = (s.scales[i * 3] + s.scales[i * 3 + 1] + s.scales[i * 3 + 2]) / 48 - 10;
    importance[i] = (s.alphas[i] / 255) * Math.exp(2 * logScale);
  }
  // Threshold from a sorted sample (O(n) instead of sorting everything).
  const sampleSize = Math.min(n, 65536);
  const sample = new Float32Array(sampleSize);
  for (let k = 0; k < sampleSize; k++) sample[k] = importance[Math.floor((k * n) / sampleSize)];
  sample.sort();
  const threshold = sample[Math.floor((1 - max / n) * (sampleSize - 1))];

  const keep: number[] = [];
  for (let i = 0; i < n && keep.length < max; i++) if (importance[i] >= threshold) keep.push(i);
  const m = keep.length;
  const out: SpzSplats = {
    ...s,
    numSplats: m,
    positions: new Uint8Array(m * 9),
    alphas: new Uint8Array(m),
    colors: new Uint8Array(m * 3),
    scales: new Uint8Array(m * 3),
    rotations: new Uint8Array(m * 4),
  };
  for (let j = 0; j < m; j++) {
    const i = keep[j];
    out.positions.set(s.positions.subarray(i * 9, i * 9 + 9), j * 9);
    out.alphas[j] = s.alphas[i];
    out.colors.set(s.colors.subarray(i * 3, i * 3 + 3), j * 3);
    out.scales.set(s.scales.subarray(i * 3, i * 3 + 3), j * 3);
    out.rotations.set(s.rotations.subarray(i * 4, i * 4 + 4), j * 4);
  }
  return out;
}

/** Decodes a splat tile GLB (runs in a worker). */
export async function decodeSplatTile(glb: ArrayBuffer, maxSplats = Infinity): Promise<SplatTile> {
  const { spz, nodeMatrix } = extractSpz(glb);
  const raw = spz[0] === 0x1f && spz[1] === 0x8b ? await gunzip(spz) : spz.slice().buffer;
  const view = new DataView(raw);
  if (view.getUint32(0, true) !== NGSP_MAGIC) throw new Error("Invalid SPZ header");
  const version = view.getUint32(4, true);
  if (version < 2 || version > 3) throw new Error(`Unsupported SPZ version ${version}`);
  const numSplats = view.getUint32(8, true);
  const shDegree = view.getUint8(12);
  const fractionalBits = view.getUint8(13);
  const flags = view.getUint8(14);

  let o = 16;
  const take = (n: number) => {
    const out = new Uint8Array(raw, o, n);
    o += n;
    return out;
  };
  const positions = take(numSplats * 9);
  const alphas = take(numSplats);
  const colors = take(numSplats * 3);
  const scales = take(numSplats * 3);
  const rotations =
    version >= 3 ? take(numSplats * 4) : packSmallestThree(take(numSplats * 3), numSplats);
  // SH bytes (numSplats × dim × 3) follow and are skipped.
  void SH_DIM_FOR_DEGREE[shDegree];

  const splats: SpzSplats = {
    numSplats,
    fractionalBits,
    antialiased: (flags & 1) !== 0,
    positions,
    alphas,
    colors,
    scales,
    rotations,
  };
  const kept = decimate(splats, maxSplats);
  // Copy into tight buffers so the (large) decompressed SH data can be freed.
  return {
    nodeMatrix,
    splats:
      kept === splats
        ? {
            ...splats,
            positions: positions.slice(),
            alphas: alphas.slice(),
            colors: colors.slice(),
            scales: scales.slice(),
            rotations: version >= 3 ? rotations.slice() : rotations,
          }
        : kept,
  };
}
