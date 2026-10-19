import type { LavaField } from "./lava-field";

/** Output pixels per grid cell; the canvas is re-uploaded every frame. */
const MAX_CANVAS = 1280;
const MAX_SCALE = 4;

const VERTEX = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  // Row 0 of the grid (north) at the top of the canvas.
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAGMENT = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uField; // r arrival, g mask, b halo, a core heat
uniform sampler2D uFlow;  // rg downstream direction
uniform vec2 uGrid;
uniform float uTime;
uniform float uFront;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

// Black-body-ish ramp: cooled crust → red → orange → yellow → white hot.
vec3 ramp(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c0 = vec3(0.10, 0.015, 0.0);
  vec3 c1 = vec3(0.62, 0.05, 0.0);
  vec3 c2 = vec3(1.0, 0.33, 0.02);
  vec3 c3 = vec3(1.0, 0.70, 0.16);
  vec3 c4 = vec3(1.0, 0.96, 0.74);
  if (t < 0.25) return mix(c0, c1, t / 0.25);
  if (t < 0.5) return mix(c1, c2, (t - 0.25) / 0.25);
  if (t < 0.75) return mix(c2, c3, (t - 0.5) / 0.25);
  return mix(c3, c4, (t - 0.75) / 0.25);
}

// Dark crust plates split by glowing molten veins.
float crust(vec2 p) {
  float n = fbm(p);
  float veins = pow(1.0 - abs(n * 2.0 - 1.0), 6.0);
  float blobs = fbm(p * 0.45 + 3.1);
  return clamp(veins * 0.95 + (blobs - 0.35) * 0.6, 0.0, 1.0);
}

void main() {
  vec4 f = texture2D(uField, vUv);
  vec2 dir = texture2D(uFlow, vUv).rg * 2.0 - 1.0;
  vec2 cell = vUv * uGrid;

  // Lobed, irregular flow front.
  float arrival = f.r + (fbm(cell * 0.09 + uTime * 0.08) - 0.5) * 0.04;
  float revealed = 1.0 - smoothstep(uFront - 0.02, uFront + 0.004, arrival);
  float age = max(uFront - arrival, 0.0);

  // Flow-map advection: two offset phases cross-faded, so the texture
  // streams downstream forever without stretching.
  float t = uTime * 0.32;
  float ph0 = fract(t);
  float ph1 = fract(t + 0.5);
  float blend = abs((0.5 - ph0) / 0.5);
  vec2 p = cell / 4.5;
  float pattern = mix(crust(p - dir * ph0 * 1.8), crust(p - dir * ph1 * 1.8 + 7.3), blend);

  float body = smoothstep(0.40, 0.58, f.g) * revealed;
  float interior = smoothstep(0.55, 0.97, f.g);

  float temp = 0.16 + 0.30 * interior + 0.22 * f.a + 0.50 * pattern * (0.35 + 0.65 * interior);
  temp -= 0.16 * smoothstep(0.0, 0.5, age);                  // cools behind the front
  temp += 0.55 * exp(-pow(age / 0.03, 2.0)) * revealed;     // incandescent leading edge
  temp *= 0.93 + 0.07 * sin(uTime * 1.9 + arrival * 45.0);  // slow pulsing
  vec3 lava = ramp(temp);

  // Glow spilling over the ground around the flow.
  float flicker = 0.85 + 0.15 * sin(uTime * 2.6 + cell.x * 0.07 + cell.y * 0.05);
  float glow = pow(f.b, 1.6) * revealed * flicker * (1.0 - body);
  vec3 glowColor = vec3(1.0, 0.36, 0.05);

  float bodyA = body * 0.97;
  float glowA = glow * 0.7;
  vec3 color = lava * bodyA + glowColor * glowA * (1.0 - bodyA);
  float alpha = bodyA + glowA * (1.0 - bodyA);
  gl_FragColor = vec4(color, alpha); // premultiplied
}`;

/**
 * Renders the animated lava into its own canvas, which MapLibre drapes on
 * the terrain as a `canvas` source. GL resources are created lazily so the
 * renderer survives React's mount → unmount → mount in development.
 */
export class LavaRenderer {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private textures: WebGLTexture[] = [];
  private buffer: WebGLBuffer | null = null;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};

  constructor(private readonly data: LavaField) {
    const scale = Math.max(1, Math.min(MAX_SCALE, MAX_CANVAS / Math.max(data.width, data.height)));
    this.canvas = document.createElement("canvas");
    this.canvas.width = Math.round(data.width * scale);
    this.canvas.height = Math.round(data.height * scale);
  }

  /** Map corners of the canvas (NW, NE, SE, SW). */
  get coordinates() {
    return this.data.coordinates;
  }

  private init(): boolean {
    const gl =
      this.gl ??
      this.canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        premultipliedAlpha: true,
        // MapLibre reads the canvas after the frame has been composited.
        preserveDrawingBuffer: true,
      });
    if (!gl) return false;
    this.gl = gl;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
      return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link");
    this.program = program;

    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const upload = (pixels: Uint8Array) => {
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.data.width, this.data.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return texture;
    };
    this.textures = [upload(this.data.field), upload(this.data.flow)];
    for (const name of ["uField", "uFlow", "uGrid", "uTime", "uFront"]) {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }
    return true;
  }

  /** `front`: 0 → 1 reveals the flow in arrival order. */
  render(time: number, front: number) {
    if (!this.program && !this.init()) return;
    const gl = this.gl!;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    const position = gl.getAttribLocation(this.program!, "aPos");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[1]);
    gl.uniform1i(this.uniforms.uField, 0);
    gl.uniform1i(this.uniforms.uFlow, 1);
    gl.uniform2f(this.uniforms.uGrid, this.data.width, this.data.height);
    gl.uniform1f(this.uniforms.uTime, time);
    gl.uniform1f(this.uniforms.uFront, front);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Frees the GL objects; a later `render` re-creates them. */
  dispose() {
    const gl = this.gl;
    if (!gl) return;
    for (const texture of this.textures) gl.deleteTexture(texture);
    if (this.buffer) gl.deleteBuffer(this.buffer);
    if (this.program) gl.deleteProgram(this.program);
    this.textures = [];
    this.buffer = null;
    this.program = null;
  }
}
