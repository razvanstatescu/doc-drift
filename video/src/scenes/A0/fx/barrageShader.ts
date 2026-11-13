/**
 * The barrage "uber" pass: ONE WebGL2 fragment shader that does every distortion of the cold open in a single draw:
 * VHS line wave, wave warp (sway), fbm turbulence warp, RGB split, slice glitch, scanlines + rolling tracking band,
 * grain, vignette, directional (whip) blur, radial (zoom-punch) blur, a cold grade and a flash.
 *
 * Adapted from the Satchel film's H0 pass (src2/scenes/H0/fx/barrageShader.ts, same owner). Added for Doc Drift: the
 * grade's WARM SUPPRESSION (`warm`), which drains every red, orange and amber hue to grey, so no third-party page can
 * put amber on screen before the reveal (Hacker News' bar, The Register's masthead, the arXiv logo, GOV.UK's red box,
 * Stack Overflow's orange, a blurred avatar). The first amber pixel of the film is the slipped band at R.
 *
 * Deterministic: no clocks, no Math.random. Randomness is an integer PCG hash of (pixel, uSeed); the JS side derives
 * uSeed from the frame (stepped, so glitches hold for `hold` frames). Same frame → same pixels on every worker.
 *
 * Units: every px value is "px at 1080p"; the shader multiplies by uK = outputHeight / 1080, so a half-scale render
 * (or an effectsOutputSize change) keeps the same look.
 *
 * Used by barrageFx() (a Remotion createEffect on <HtmlInCanvas effects>).
 */

export type Vec3 = readonly [number, number, number];

export type BarrageLook = {
  /** Frame number (float). Drives wave phase and the rolling band. */
  time: number;
  /** Stepped seed for slices and grain (use stepSeed()). */
  seed: number;
  /** Fixed per-instance seed for the turbulence field (keep constant; animate warpEvo instead). */
  noiseSeed?: number;
  /** VHS line wave: horizontal offset (px) that varies along y. */
  wave?: number;
  /** Cycles of the line wave per frame height. */
  waveFreq?: number;
  /** Wave Warp (AE): vertical offset (px) as a sine of x. */
  sway?: number;
  swayLen?: number;
  /** Turbulent Displace (AE): fbm displacement in px. */
  warp?: number;
  warpSize?: number;
  warpEvo?: number;
  /** RGB split in px, its direction (radians) and how much it grows toward the edges (0 = uniform, 1 = lens-like). */
  rgb?: number;
  rgbAngle?: number;
  rgbRadial?: number;
  /** Slice glitch: share of displaced bands (0..1) and the max shift (px). */
  slices?: number;
  sliceShift?: number;
  /** Scanline darkness 0..1, line pitch (px), rolling tracking band 0..1. */
  scan?: number;
  scanGap?: number;
  roll?: number;
  /** Grain 0..1, vignette 0..1. */
  grain?: number;
  vignette?: number;
  /** Directional blur vector (px, the whole shutter), radial zoom blur (fraction of distance to centre) and its centre. */
  blurX?: number;
  blurY?: number;
  zoom?: number;
  centerX?: number;
  centerY?: number;
  /** Grade: warm-hue suppression 0..1 (reds, oranges and ambers to grey), desaturation 0..1, contrast -1..1, shadow
   *  tint multiplier, flash amount 0..1 and colour. */
  warm?: number;
  desat?: number;
  contrast?: number;
  shadowTint?: Vec3;
  flash?: number;
  flashColor?: Vec3;
  /** true: displaced samples clamp to the edge (full-frame plates). false: they become transparent (cards). */
  clampEdges?: boolean;
};

export const VS = `#version 300 es
layout(location = 0) in vec2 aPos;
layout(location = 1) in vec2 aUv;
out vec2 vUv;
void main() { vUv = aUv; gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const FS = `#version 300 es
precision highp float;
precision highp int;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSrc;
uniform vec2 uRes;
uniform float uK;
uniform float uTime;
uniform uint uSeed;
uniform uint uNoiseSeed;
uniform float uWave, uWaveFreq, uSway, uSwayLen;
uniform float uWarp, uWarpSize, uWarpEvo;
uniform float uRgb, uRgbAngle, uRgbRadial;
uniform float uSlices, uSliceShift;
uniform float uScan, uScanGap, uRoll;
uniform float uGrain, uVignette;
uniform vec2 uBlur;
uniform float uZoom;
uniform vec2 uCenter;
uniform float uWarm, uDesat, uContrast;
uniform vec3 uShadowTint;
uniform float uFlash;
uniform vec3 uFlashColor;
uniform int uClamp;

const float TAU = 6.28318530718;

uint pcg(uint v) {
  uint s = v * 747796405u + 2891336453u;
  uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
float rnd(uint a) { return float(pcg(a)) * (1.0 / 4294967295.0); }
float rnd2(uint a, uint b) { return rnd(a ^ pcg(b + 0x9e3779b9u)); }
float rnd3(uint a, uint b, uint c) { return rnd(a ^ pcg(b ^ pcg(c + 0x85ebca6bu))); }

float lattice(ivec3 i) { return rnd3(uint(i.x), uint(i.y), uint(i.z) ^ uNoiseSeed); }

float vnoise(vec3 p) {
  vec3 fi = floor(p);
  vec3 f = p - fi;
  ivec3 i = ivec3(fi);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float a = mix(lattice(i), lattice(i + ivec3(1, 0, 0)), u.x);
  float b = mix(lattice(i + ivec3(0, 1, 0)), lattice(i + ivec3(1, 1, 0)), u.x);
  float c = mix(lattice(i + ivec3(0, 0, 1)), lattice(i + ivec3(1, 0, 1)), u.x);
  float d = mix(lattice(i + ivec3(0, 1, 1)), lattice(i + ivec3(1, 1, 1)), u.x);
  return mix(mix(a, b, u.y), mix(c, d, u.y), u.z);
}

float fbm(vec3 p) {
  float s = 0.0;
  float amp = 0.5;
  for (int o = 0; o < 3; o++) {
    s += amp * vnoise(p);
    p = p * 2.03 + vec3(11.7, 3.1, 0.0);
    amp *= 0.5;
  }
  return s / 0.875;
}

vec2 toUv(vec2 pt) { return vec2(pt.x / uRes.x, 1.0 - pt.y / uRes.y); }

vec4 tap(vec2 pt) {
  vec2 uv = toUv(pt);
  if (uClamp == 0 && (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)) return vec4(0.0);
  return texture(uSrc, clamp(uv, vec2(0.0), vec2(1.0)));
}

void main() {
  // p0: the screen pixel (top-left origin). p: where we sample the content from.
  vec2 p0 = vec2(vUv.x, 1.0 - vUv.y) * uRes;
  vec2 p = p0;
  float yN = p0.y / uRes.y;

  // 1. Slice glitch: stepped random horizontal bands (coarse) and thin slivers (fine), shifted sideways.
  float sliceHit = 0.0;
  if (uSlices > 0.0) {
    float bands = 6.0 + floor(rnd2(uSeed, 11u) * 18.0);
    uint band = uint(floor(yN * bands));
    uint fine = uint(floor(yN * bands * 5.0));
    float shift = 0.0;
    if (rnd2(uSeed, band + 101u) < uSlices * 0.55) {
      shift += (rnd2(uSeed, band + 303u) * 2.0 - 1.0) * uSliceShift;
      sliceHit = 1.0;
    }
    if (rnd2(uSeed, fine + 7001u) < uSlices * 0.14) {
      shift += (rnd2(uSeed, fine + 909u) * 2.0 - 1.0) * uSliceShift * 0.45;
      sliceHit = 1.0;
    }
    p.x += floor(shift / 6.0) * 6.0 * uK; // snapped to a 6 px grid: digital, not liquid
  }

  // 2. VHS line wave + rolling tracking band (offset only inside the band).
  float rollY = mod(uTime * 16.0 * uK, uRes.y * 1.5) - uRes.y * 0.25;
  float rollBand = exp(-pow((p0.y - rollY) / (70.0 * uK), 2.0));
  if (uWave > 0.0 || uRoll > 0.0) {
    float w = sin(yN * uWaveFreq * TAU + uTime * 0.83) * 0.65 + sin(yN * uWaveFreq * 2.71 * TAU - uTime * 1.37) * 0.35;
    float lineJitter = rnd2(uSeed, uint(p0.y / max(2.0 * uK, 1.0))) - 0.5;
    p.x += (w * uWave + lineJitter * (uWave * 0.35 + uRoll * 18.0 * rollBand)) * uK;
  }

  // 3. Wave Warp: big soft vertical sway.
  if (uSway > 0.0) {
    p.y += sin(p.x / max(uSwayLen * uK, 1.0) * TAU + uTime * 0.35) * uSway * uK;
  }

  // 4. Turbulent displace: fbm vector field, evolution is the z axis (smooth when animated).
  if (uWarp > 0.0) {
    vec3 q = vec3(p / max(uWarpSize * uK, 1.0), uWarpEvo);
    vec2 d = vec2(fbm(q), fbm(q + vec3(17.3, 9.1, 3.7))) - 0.5;
    p += d * 2.0 * uWarp * uK;
  }

  // 5. Sampling: directional + radial blur taps, each tap with an RGB split.
  vec2 dir = vec2(cos(uRgbAngle), sin(uRgbAngle));
  vec2 fromC = (p0 / uRes - 0.5) * 2.0;
  float radial = mix(1.0, length(fromC) * 0.85, uRgbRadial);
  vec2 off = dir * uRgb * uK * radial * (1.0 + sliceHit * 1.5);
  vec2 centre = vec2(uCenter.x, uCenter.y) * uRes;
  float blurLen = max(length(uBlur) * uK, uZoom * length(p0 - centre));
  int n = int(clamp(blurLen / 2.5, 1.0, 40.0));
  float jitter = rnd3(uint(p0.x), uint(p0.y), uSeed ^ 0x51u) - 0.5;
  vec3 acc = vec3(0.0);
  float aAcc = 0.0;
  for (int i = 0; i < 40; i++) {
    if (i >= n) break;
    float t = n == 1 ? 0.0 : (float(i) + 0.5 + jitter) / float(n) - 0.5;
    vec2 pt = p + uBlur * uK * t;
    pt = centre + (pt - centre) * (1.0 - uZoom * (t + 0.5));
    vec4 sr = tap(pt + off);
    vec4 sg = tap(pt);
    vec4 sb = tap(pt - off);
    acc += vec3(sr.r, sg.g, sb.b);
    aAcc += max(max(sr.a, sg.a), sb.a);
  }
  vec4 col = vec4(acc, aAcc) / float(n);

  // 6. Grade in straight alpha.
  float a = col.a;
  vec3 c = a > 0.0001 ? col.rgb / a : vec3(0.0);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // Warm suppression: hue in degrees; reds through ambers (about -40 to 75 deg) go to grey, scaled by how saturated
  // the pixel is, so neutral greys and the page white are untouched and blues and teals keep their colour.
  if (uWarm > 0.0) {
    float mx = max(c.r, max(c.g, c.b));
    float mn = min(c.r, min(c.g, c.b));
    float d = mx - mn;
    if (d > 0.0001) {
      float h;
      if (mx == c.r) h = mod((c.g - c.b) / d, 6.0);
      else if (mx == c.g) h = (c.b - c.r) / d + 2.0;
      else h = (c.r - c.g) / d + 4.0;
      h *= 60.0;
      float hw = h > 180.0 ? h - 360.0 : h; // -180..180, red at 0
      float inBand = smoothstep(-55.0, -35.0, hw) * (1.0 - smoothstep(70.0, 90.0, hw));
      float s = d / max(mx, 0.0001);
      c = mix(c, vec3(l), uWarm * inBand * smoothstep(0.04, 0.18, s));
    }
  }
  c = mix(c, vec3(l), uDesat);
  c = (c - 0.5) * (1.0 + uContrast) + 0.5;
  c *= mix(uShadowTint, vec3(1.0), smoothstep(0.0, 0.75, l));

  // 7. Screen artefacts on the undistorted pixel: scanlines, rolling band glow, grain, vignette, flash.
  float gap = max(uScanGap * uK, 1.5);
  float s = 0.5 - 0.5 * cos(TAU * p0.y / gap);
  c *= 1.0 - uScan * s;
  c += uRoll * rollBand * 0.10;
  float g = rnd3(uint(p0.x), uint(p0.y), uSeed) - 0.5;
  c += g * uGrain * 0.32;
  vec2 v = (p0 / uRes - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  c *= 1.0 - uVignette * smoothstep(0.35, 1.05, length(v));
  c = mix(c, uFlashColor, uFlash);

  fragColor = vec4(clamp(c, 0.0, 1.0) * a, a);
}
`;

const UNIFORMS = [
  "uSrc", "uRes", "uK", "uTime", "uSeed", "uNoiseSeed", "uWave", "uWaveFreq", "uSway", "uSwayLen", "uWarp", "uWarpSize",
  "uWarpEvo", "uRgb", "uRgbAngle", "uRgbRadial", "uSlices", "uSliceShift", "uScan", "uScanGap", "uRoll", "uGrain",
  "uVignette", "uBlur", "uZoom", "uCenter", "uWarm", "uDesat", "uContrast", "uShadowTint", "uFlash", "uFlashColor", "uClamp",
] as const;
type UniformName = (typeof UNIFORMS)[number];

export type BarrageGl = {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  vbo: WebGLBuffer;
  tex: WebGLTexture;
  u: Record<UniformName, WebGLUniformLocation | null>;
};

const compile = (gl: WebGL2RenderingContext, type: number, src: string) => {
  const sh = gl.createShader(type);
  if (!sh) throw new Error("barrage: createShader failed");
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`barrage: shader compile failed: ${log}`);
  }
  return sh;
};

/** Compile the program on an existing WebGL2 context (from a <canvas> or the effect chain's pooled canvas). */
export const setupBarrage = (gl: WebGL2RenderingContext): BarrageGl => {
  const vs = compile(gl, gl.VERTEX_SHADER, VS);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FS);
  const program = gl.createProgram();
  if (!program) throw new Error("barrage: createProgram failed");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`barrage: link failed: ${gl.getProgramInfoLog(program)}`);
  const vao = gl.createVertexArray();
  const vbo = gl.createBuffer();
  const tex = gl.createTexture();
  if (!vao || !vbo || !tex) throw new Error("barrage: GL allocation failed");
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
  gl.bindVertexArray(null);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);
  const u = Object.fromEntries(UNIFORMS.map((n) => [n, gl.getUniformLocation(program, n)])) as Record<UniformName, WebGLUniformLocation | null>;
  return { gl, program, vao, vbo, tex, u };
};

export const cleanupBarrage = (s: BarrageGl) => {
  s.gl.deleteTexture(s.tex);
  s.gl.deleteBuffer(s.vbo);
  s.gl.deleteVertexArray(s.vao);
  s.gl.deleteProgram(s.program);
};

/** Upload a source (image, canvas, ImageBitmap) into the program's texture. Premultiplied, flipped for GL UVs. */
export const uploadBarrage = (s: BarrageGl, source: TexImageSource, flipY = true) => {
  const { gl } = s;
  gl.bindTexture(gl.TEXTURE_2D, s.tex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.bindTexture(gl.TEXTURE_2D, null);
};

/** Draw the pass into the context's default framebuffer at width × height. */
export const drawBarrage = (s: BarrageGl, width: number, height: number, L: BarrageLook) => {
  const { gl, u } = s;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(s.program);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, s.tex);
  gl.uniform1i(u.uSrc, 0);
  gl.uniform2f(u.uRes, width, height);
  gl.uniform1f(u.uK, height / 1080);
  gl.uniform1f(u.uTime, L.time);
  gl.uniform1ui(u.uSeed, (L.seed >>> 0) % 4294967295);
  gl.uniform1ui(u.uNoiseSeed, ((L.noiseSeed ?? 7) >>> 0) % 4294967295);
  gl.uniform1f(u.uWave, L.wave ?? 0);
  gl.uniform1f(u.uWaveFreq, L.waveFreq ?? 3);
  gl.uniform1f(u.uSway, L.sway ?? 0);
  gl.uniform1f(u.uSwayLen, L.swayLen ?? 700);
  gl.uniform1f(u.uWarp, L.warp ?? 0);
  gl.uniform1f(u.uWarpSize, L.warpSize ?? 260);
  gl.uniform1f(u.uWarpEvo, L.warpEvo ?? 0);
  gl.uniform1f(u.uRgb, L.rgb ?? 0);
  gl.uniform1f(u.uRgbAngle, L.rgbAngle ?? 0);
  gl.uniform1f(u.uRgbRadial, L.rgbRadial ?? 0);
  gl.uniform1f(u.uSlices, L.slices ?? 0);
  gl.uniform1f(u.uSliceShift, L.sliceShift ?? 120);
  gl.uniform1f(u.uScan, L.scan ?? 0);
  gl.uniform1f(u.uScanGap, L.scanGap ?? 4);
  gl.uniform1f(u.uRoll, L.roll ?? 0);
  gl.uniform1f(u.uGrain, L.grain ?? 0);
  gl.uniform1f(u.uVignette, L.vignette ?? 0);
  gl.uniform2f(u.uBlur, L.blurX ?? 0, L.blurY ?? 0);
  gl.uniform1f(u.uZoom, L.zoom ?? 0);
  gl.uniform2f(u.uCenter, L.centerX ?? 0.5, L.centerY ?? 0.5);
  gl.uniform1f(u.uWarm, L.warm ?? 0);
  gl.uniform1f(u.uDesat, L.desat ?? 0);
  gl.uniform1f(u.uContrast, L.contrast ?? 0);
  const t = L.shadowTint ?? [1, 1, 1];
  gl.uniform3f(u.uShadowTint, t[0], t[1], t[2]);
  gl.uniform1f(u.uFlash, L.flash ?? 0);
  const fc = L.flashColor ?? [1, 1, 1];
  gl.uniform3f(u.uFlashColor, fc[0], fc[1], fc[2]);
  gl.uniform1i(u.uClamp, L.clampEdges ? 1 : 0);
  gl.bindVertexArray(s.vao);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindVertexArray(null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.useProgram(null);
};
