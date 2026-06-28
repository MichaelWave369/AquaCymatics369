import { useEffect, useRef } from 'react';

const vertexShaderSource = `#version 300 es
precision highp float;
const vec2 positions[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2(3.0, -1.0),
  vec2(-1.0, 3.0)
);

void main() {
  gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_frequency;
uniform float u_amplitude;
uniform float u_symmetry;
uniform float u_harmonics;
uniform float u_bloom;
uniform float u_spin;
uniform float u_audioLevel;
uniform float u_viewMode;
uniform float u_claimMode;
uniform float u_sourceStrength;
uniform float u_sourceSymmetry;
uniform float u_sourceRings;
uniform float u_sourceVoid;

#define PI 3.141592653589793
#define TAU 6.283185307179586

mat2 rot(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float line(float value, float width) {
  return 1.0 - smoothstep(0.0, width, abs(value));
}

float ring(float r, float target, float width) {
  return exp(-abs(r - target) / max(0.001, width));
}

float sparkle(vec2 p, float time, float density) {
  vec2 grid = p * density;
  vec2 cell = floor(grid);
  vec2 local = fract(grid) - 0.5;
  float rnd = hash12(cell);
  float pulse = 0.45 + 0.55 * sin(time * (1.2 + rnd * 2.6) + rnd * TAU);
  return smoothstep(0.075, 0.0, length(local)) * pulse * step(0.77, rnd);
}

float harmonic(vec2 p, float freq, float time, float beat) {
  float r = length(p);
  float a = atan(p.y, p.x);
  float sum = 0.0;
  float weight = 1.0;
  for (int i = 1; i <= 12; i++) {
    float fi = float(i);
    if (fi <= u_harmonics) {
      float wave = sin(r * (16.0 + freq * fi * 6.0) - time * (0.42 + fi * 0.08));
      float braid = cos(a * (fi + 2.0) + r * freq * (5.0 + fi) + time * (0.18 + beat));
      sum += abs(wave * braid) * weight;
      weight *= 0.74;
    }
  }
  return sum / max(1.0, u_harmonics * 0.36);
}

float lattice(vec2 p, float symmetry, float time) {
  float r = length(p);
  float a = atan(p.y, p.x);
  float spokes = pow(abs(cos(a * symmetry + time * 0.55)), 20.0);
  float petals = pow(abs(cos(a * symmetry * 0.5 - time * 0.34)), 9.0) * smoothstep(1.42, 0.08, r);
  float flower = line(sin(a * symmetry + r * 18.0 - time * 0.9), 0.085);
  return spokes * 0.72 + petals * 0.35 + flower * 0.22;
}

float sourceSignature(vec2 p, float time) {
  float r = length(p);
  float a = atan(p.y, p.x);
  float sig = 0.0;
  float sym = mix(u_symmetry, max(3.0, u_sourceSymmetry), u_sourceStrength);
  float rings = max(1.0, u_sourceRings);
  float void = mix(0.18, u_sourceVoid, u_sourceStrength);

  for (int i = 1; i <= 8; i++) {
    float fi = float(i);
    if (fi <= rings) {
      float target = void + fi * (0.74 - void) / (rings + 1.0);
      sig += ring(r, target, 0.018 + fi * 0.002) * (1.0 / fi);
    }
  }

  sig += line(sin(a * sym + r * 28.0 + time * 0.45), 0.075) * 0.55;
  sig += line(sin(a * sym * 0.5 - r * 17.0 - time * 0.22), 0.1) * 0.32;
  return sig * u_sourceStrength;
}

vec3 palette(float t, float claim) {
  vec3 cyan = vec3(0.03, 0.92, 1.0);
  vec3 magenta = vec3(1.0, 0.07, 0.68);
  vec3 gold = vec3(1.0, 0.74, 0.2);
  vec3 violet = vec3(0.45, 0.2, 1.0);
  vec3 green = vec3(0.08, 1.0, 0.55);
  vec3 base = mix(magenta, cyan, 0.5 + 0.5 * sin(t * PI));
  base = mix(base, gold, smoothstep(0.64, 1.0, fract(t * 1.71)) * 0.34);
  base = mix(base, violet, 0.18 + 0.12 * sin(t * 2.4));
  if (claim > 2.5) base = mix(base, green, 0.3);
  if (claim > 1.5 && claim < 2.5) base = mix(base, gold, 0.18);
  return base;
}

vec3 renderTop(vec2 uv, float time, float freq, float beat) {
  vec2 p = rot(time * (0.05 + u_spin * 0.22)) * uv;
  float r = length(p);
  float sym = mix(u_symmetry, max(3.0, u_sourceSymmetry), u_sourceStrength * 0.72);
  float voidRadius = mix(0.2, u_sourceVoid, u_sourceStrength * 0.65);
  float voidMask = smoothstep(voidRadius + beat * 0.01, voidRadius + 0.075 + beat * 0.018, r);
  float fade = smoothstep(1.42, 0.08, r);
  float field = harmonic(p, freq, time, beat) * 0.58;
  field += lattice(p, sym, time) * 0.82;
  field += sourceSignature(p, time) * 0.9;
  field += ring(r, 0.64 + 0.04 * sin(time * 0.42), 0.055) * 0.42;
  field += sparkle(p + vec2(time * 0.014), time, 9.0 + freq * 2.0) * 0.65;
  field *= fade * voidMask;
  vec3 color = palette(field + r * 0.35 + time * 0.03, u_claimMode) * field * (1.05 + u_bloom * 2.2);
  color += vec3(0.1, 1.0, 1.0) * pow(field, 2.4) * 0.32;
  return color;
}

vec3 renderTorus(vec2 uv, float time, float freq, float beat) {
  vec2 p = uv;
  p.x *= 1.08;
  p.y *= 0.82;
  p = rot(0.1 * sin(time * 0.28)) * p;
  float major = 0.68;
  float tube = length(vec2(abs(p.x) - major, p.y * 1.36));
  float shell = exp(-abs(tube - 0.22) * (18.0 + u_bloom * 24.0));
  float braidAngle = atan(p.y * 1.8, abs(p.x) - major);
  float sym = mix(u_symmetry, max(3.0, u_sourceSymmetry), u_sourceStrength * 0.5);
  float braid = abs(sin(braidAngle * sym * 0.5 + p.x * freq * 18.0 - time * (1.0 + u_spin)));
  float rings = abs(sin(tube * (78.0 + freq * 32.0 + u_sourceRings * 3.0) - time * 2.0));
  float field = shell * (0.34 + braid * 0.84 + rings * 0.38);
  field += sparkle(p * 1.5, time, 11.0 + u_sourceRings) * 0.42;
  vec3 color = palette(field + tube + time * 0.04, u_claimMode) * field * (1.35 + beat + u_bloom);
  color += vec3(1.0, 0.22, 0.76) * shell * 0.38;
  color *= smoothstep(1.38, 0.1, length(uv * vec2(0.86, 1.08)));
  return color;
}

vec3 renderDive(vec2 uv, float time, float freq, float beat) {
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  float sym = mix(u_symmetry, max(3.0, u_sourceSymmetry), u_sourceStrength * 0.65);
  float tunnel = 1.0 / max(0.08, r);
  float z = tunnel + time * (0.34 + u_spin * 0.82);
  float spiral = sin(a * sym + z * freq * 2.5);
  float rings = sin(z * (8.0 + u_sourceRings * 0.5) + r * 26.0 - time * 1.8);
  float ribs = pow(abs(spiral), 8.0) + pow(abs(rings), 10.0);
  float voidMask = smoothstep(0.1, 0.34 + beat * 0.07, r);
  float field = ribs * voidMask * smoothstep(1.45, 0.08, r);
  field += sourceSignature(uv, time) * 0.35;
  field += sparkle(uv * tunnel * 0.35, time, 10.0) * 0.62;
  vec3 color = palette(field + z * 0.04, u_claimMode) * field * (1.0 + u_bloom * 1.9);
  color += vec3(1.0, 0.1, 0.72) * ring(r, 0.34, 0.06) * 0.34;
  return color;
}

vec3 renderTunnel(vec2 uv, float time, float freq, float beat) {
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  float sym = mix(u_symmetry, max(3.0, u_sourceSymmetry), u_sourceStrength * 0.5);
  float fold = abs(sin(a * sym * 0.5 + time * 0.4));
  float depth = sin(r * (22.0 + freq * 12.0 + u_sourceRings) - time * (2.0 + u_spin));
  float membrane = line(depth, 0.12) * smoothstep(1.4, 0.12, r);
  float net = line(sin(a * sym + r * 19.0 + time), 0.1);
  float field = membrane * (0.52 + fold * 0.76) + net * 0.42 + sourceSignature(uv, time) * 0.32;
  field *= smoothstep(0.08, 0.48, r);
  field += sparkle(uv * 1.7, time, 13.0) * 0.65;
  vec3 color = palette(field + r + time * 0.04, u_claimMode) * field * (1.0 + u_bloom * 1.6 + beat * 0.75);
  return color;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  float time = u_time;
  float freq = clamp(u_frequency / 432.0, 0.08, 2.6);
  float beat = clamp(u_amplitude * 0.55 + u_audioLevel * 1.9, 0.0, 1.8);
  vec3 color;

  if (u_viewMode < 0.5) color = renderTop(uv, time, freq, beat);
  else if (u_viewMode < 1.5) color = renderTorus(uv, time, freq, beat);
  else if (u_viewMode < 2.5) color = renderDive(uv, time, freq, beat);
  else color = renderTunnel(uv, time, freq, beat);

  float vignette = smoothstep(1.56, 0.14, length(uv));
  color *= vignette;
  color = color / (1.0 + color);
  color = pow(color, vec3(0.76));
  outColor = vec4(color, 1.0);
}
`;

export default function VisualizerCanvas({ params }) {
  const canvasRef = useRef(null);
  const paramsRef = useRef(params);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl2', {
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });

    if (!gl) {
      canvas.dataset.error = 'WebGL2 is not available in this browser.';
      return undefined;
    }

    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    const uniforms = {
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      time: gl.getUniformLocation(program, 'u_time'),
      frequency: gl.getUniformLocation(program, 'u_frequency'),
      amplitude: gl.getUniformLocation(program, 'u_amplitude'),
      symmetry: gl.getUniformLocation(program, 'u_symmetry'),
      harmonics: gl.getUniformLocation(program, 'u_harmonics'),
      bloom: gl.getUniformLocation(program, 'u_bloom'),
      spin: gl.getUniformLocation(program, 'u_spin'),
      audioLevel: gl.getUniformLocation(program, 'u_audioLevel'),
      viewMode: gl.getUniformLocation(program, 'u_viewMode'),
      claimMode: gl.getUniformLocation(program, 'u_claimMode'),
      sourceStrength: gl.getUniformLocation(program, 'u_sourceStrength'),
      sourceSymmetry: gl.getUniformLocation(program, 'u_sourceSymmetry'),
      sourceRings: gl.getUniformLocation(program, 'u_sourceRings'),
      sourceVoid: gl.getUniformLocation(program, 'u_sourceVoid')
    };

    let frameId;
    const start = performance.now();

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(canvas.clientWidth * pixelRatio));
      const height = Math.max(1, Math.floor(canvas.clientHeight * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const render = (now) => {
      resize();
      const p = paramsRef.current;
      const source = p.reconstruction;
      gl.useProgram(program);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.time, (now - start) * 0.001);
      gl.uniform1f(uniforms.frequency, p.frequency);
      gl.uniform1f(uniforms.amplitude, p.amplitude);
      gl.uniform1f(uniforms.symmetry, p.symmetry);
      gl.uniform1f(uniforms.harmonics, p.harmonics);
      gl.uniform1f(uniforms.bloom, p.bloom);
      gl.uniform1f(uniforms.spin, p.spin);
      gl.uniform1f(uniforms.audioLevel, p.audioLevel);
      gl.uniform1f(uniforms.viewMode, p.viewMode);
      gl.uniform1f(uniforms.claimMode, p.claimMode);
      gl.uniform1f(uniforms.sourceStrength, source ? Math.max(0.2, source.confidence) : 0);
      gl.uniform1f(uniforms.sourceSymmetry, source ? source.dominantSymmetry : p.symmetry);
      gl.uniform1f(uniforms.sourceRings, source ? Math.max(1, source.ringCount) : 4);
      gl.uniform1f(uniforms.sourceVoid, source ? Math.max(0.08, Math.min(0.45, source.voidRadius)) : 0.18);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <div className="visualizer-frame">
      <canvas ref={canvasRef} className="visualizer-canvas" aria-label="AquaCymatics WebGL visualizer" />
      <div className="webgl-fallback">
        WebGL2 is required for the live field engine. Try a modern desktop browser with hardware acceleration enabled.
      </div>
    </div>
  );
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${info}`);
  }

  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link failed: ${info}`);
  }

  return program;
}
