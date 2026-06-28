import { useEffect, useRef } from 'react';

const vertexShaderSource = `#version 300 es
precision highp float;
const vec2 positions[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
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

mat2 rotate2d(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float softLine(float value, float width) {
  return 1.0 - smoothstep(0.0, width, abs(value));
}

float ringBand(float radius, float target, float width) {
  return exp(-abs(radius - target) / max(width, 0.001));
}

float sparkle(vec2 p, float time) {
  vec2 grid = p * (10.0 + u_sourceRings);
  vec2 cell = floor(grid);
  vec2 local = fract(grid) - 0.5;
  float rnd = hash12(cell);
  float pulse = 0.5 + 0.5 * sin(time * (1.1 + rnd * 2.4) + rnd * TAU);
  return smoothstep(0.075, 0.0, length(local)) * pulse * step(0.77, rnd);
}

float field2d(vec2 p, float time, float beat) {
  float r = length(p);
  float a = atan(p.y, p.x);
  float freq = clamp(u_frequency / 432.0, 0.08, 2.5);
  float sym = mix(u_symmetry, max(3.0, u_sourceSymmetry), u_sourceStrength);
  float sourceVoid = mix(0.18, u_sourceVoid, u_sourceStrength);
  float f = 0.0;
  float weight = 1.0;

  for (int i = 1; i <= 12; i++) {
    float fi = float(i);
    if (fi <= u_harmonics) {
      float wave = sin(r * (18.0 + freq * fi * 6.0) - time * (0.55 + fi * 0.07));
      float braid = cos(a * (sym + fi) + r * (8.0 + fi) + time * (0.22 + beat));
      f += abs(wave * braid) * weight;
      weight *= 0.73;
    }
  }

  for (int i = 1; i <= 8; i++) {
    float fi = float(i);
    if (fi <= max(1.0, u_sourceRings)) {
      float target = sourceVoid + fi * (0.76 - sourceVoid) / (max(1.0, u_sourceRings) + 1.0);
      f += ringBand(r, target, 0.025 + fi * 0.002) * u_sourceStrength * (0.8 / fi);
    }
  }

  f += pow(abs(cos(a * sym + time * 0.45)), 18.0) * 0.85;
  f += softLine(sin(a * sym + r * 24.0 - time), 0.095) * 0.35;
  f += sparkle(p + vec2(time * 0.012), time) * 0.55;
  f *= smoothstep(sourceVoid, sourceVoid + 0.08 + beat * 0.03, r);
  f *= smoothstep(1.45, 0.08, r);
  return f;
}

vec3 palette(float t) {
  vec3 cyan = vec3(0.03, 0.92, 1.0);
  vec3 pink = vec3(1.0, 0.06, 0.68);
  vec3 gold = vec3(1.0, 0.72, 0.18);
  vec3 violet = vec3(0.42, 0.18, 1.0);
  vec3 base = mix(pink, cyan, 0.5 + 0.5 * sin(t * PI));
  base = mix(base, gold, smoothstep(0.68, 1.0, fract(t * 1.7)) * 0.28);
  base = mix(base, violet, 0.16);
  return base;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  float time = u_time;
  float beat = clamp(u_amplitude * 0.55 + u_audioLevel * 1.75, 0.0, 1.7);

  if (u_viewMode > 0.5 && u_viewMode < 1.5) uv.y *= 1.45;
  if (u_viewMode > 1.5 && u_viewMode < 2.5) uv *= 1.0 + 0.18 * sin(time * 0.7);
  uv = rotate2d(time * (0.035 + u_spin * 0.22)) * uv;

  float f = field2d(uv, time, beat);
  float glow = pow(max(f, 0.0), 1.35);
  vec3 color = palette(f + length(uv) * 0.35 + time * 0.03) * glow * (1.15 + u_bloom * 2.15);
  color += vec3(0.05, 0.9, 1.0) * pow(f, 2.6) * 0.32;
  color *= smoothstep(1.58, 0.12, length(uv));
  color = color / (1.0 + color);
  color = pow(color, vec3(0.78));
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
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });

    if (!gl) {
      canvas.dataset.error = 'WebGL2 is not available in this browser.';
      return undefined;
    }

    let program;
    try {
      program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    } catch (err) {
      console.error(err);
      canvas.dataset.error = 'WebGL shader did not start.';
      return undefined;
    }

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
      <div className="webgl-fallback">WebGL2 is required for the live field engine.</div>
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
    throw new Error(info || 'shader compile problem');
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
    throw new Error(info || 'program link problem');
  }
  return program;
}
