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

float starLattice(vec2 p, float symmetry, float phase) {
  float angle = atan(p.y, p.x);
  float radius = length(p);
  float folded = cos(angle * symmetry + phase);
  float secondary = cos(angle * symmetry * 0.5 - phase * 0.7);
  float spokes = pow(abs(folded), 26.0);
  float petals = pow(abs(secondary), 10.0) * smoothstep(1.5, 0.08, radius);
  return spokes * 0.78 + petals * 0.42;
}

float harmonicField(vec2 p, float freq, float layers, float beat, float time) {
  float radius = length(p);
  float angle = atan(p.y, p.x);
  float field = 0.0;
  float weight = 1.0;

  for (int i = 1; i <= 12; i++) {
    float fi = float(i);
    if (fi <= layers) {
      float h = fi * freq;
      float wave = sin(radius * (15.0 + h * 6.0) - time * (0.6 + fi * 0.05));
      float braid = cos(angle * (fi + 2.0) + radius * h * 5.0 + time * (0.2 + beat));
      field += abs(wave * braid) * weight;
      weight *= 0.73;
    }
  }

  return field / max(1.0, layers * 0.34);
}

float nodeSparkles(vec2 p, float freq, float time) {
  vec2 grid = p * (8.0 + freq * 2.5);
  vec2 cell = floor(grid);
  vec2 local = fract(grid) - 0.5;
  float rnd = hash12(cell);
  float pulse = 0.5 + 0.5 * sin(time * (1.3 + rnd * 2.0) + rnd * TAU);
  float dotShape = smoothstep(0.08, 0.0, length(local));
  return dotShape * pulse * step(0.76, rnd);
}

vec3 aquaPalette(float t, float claim) {
  vec3 cyan = vec3(0.05, 0.94, 1.0);
  vec3 magenta = vec3(1.0, 0.08, 0.68);
  vec3 gold = vec3(1.0, 0.72, 0.18);
  vec3 violet = vec3(0.42, 0.22, 1.0);
  vec3 green = vec3(0.05, 1.0, 0.55);
  vec3 base = mix(magenta, cyan, smoothstep(0.05, 0.95, sin(t * PI) * 0.5 + 0.5));
  base = mix(base, gold, smoothstep(0.62, 1.0, fract(t * 1.7)) * 0.32);
  base = mix(base, violet, 0.2 + 0.16 * sin(t * 2.0));

  if (claim > 2.5) {
    base = mix(base, green, 0.28);
  } else if (claim > 1.5) {
    base = mix(base, gold, 0.18);
  }

  return base;
}

vec3 renderTopMandala(vec2 uv, float time, float freq, float beat) {
  vec2 p = rotate2d(time * (0.06 + u_spin * 0.22)) * uv;
  float radius = length(p);
  float angle = atan(p.y, p.x);
  float symmetry = max(3.0, u_symmetry);
  float layers = max(1.0, u_harmonics);
  float ring = harmonicField(p, freq, layers, beat, time);
  float lattice = starLattice(p, symmetry, time * 0.55);
  float petal = softLine(sin(angle * symmetry + radius * freq * 19.0 - time), 0.08 + beat * 0.04);
  float voidMask = smoothstep(0.16 + beat * 0.015, 0.23 + beat * 0.025, radius);
  float outerFade = smoothstep(1.35, 0.2, radius);
  float halo = exp(-abs(radius - 0.63 - 0.04 * sin(time * 0.5)) * 8.0);
  float sparks = nodeSparkles(p + vec2(time * 0.015), freq, time);
  float field = (ring * 0.65 + lattice * 0.95 + petal * 0.4 + halo * 0.5 + sparks * 0.8) * outerFade * voidMask;
  vec3 color = aquaPalette(field + radius * 0.35 + time * 0.03, u_claimMode);
  color *= field * (1.0 + u_bloom * 1.75);
  color += vec3(0.0, 0.8, 1.0) * sparks * 0.6;
  color += vec3(1.0, 0.08, 0.65) * halo * 0.18;
  return color;
}

vec3 renderSideTorus(vec2 uv, float time, float freq, float beat) {
  vec2 p = uv;
  p.x *= 1.08;
  p.y *= 0.82;
  p = rotate2d(0.08 * sin(time * 0.32)) * p;

  float major = 0.68;
  float tube = length(vec2(abs(p.x) - major, p.y * 1.35));
  float shell = exp(-abs(tube - 0.22) * (18.0 + u_bloom * 22.0));
  float core = smoothstep(0.48, 0.64, abs(p.x)) * smoothstep(0.08, 0.45, abs(p.y) + 0.02);
  float braidAngle = atan(p.y * 1.8, abs(p.x) - major);
  float braid = abs(sin(braidAngle * u_symmetry * 0.5 + p.x * freq * 18.0 - time * (1.0 + u_spin)));
  float rings = abs(sin(tube * (80.0 + freq * 30.0) - time * 2.0));
  float sparks = nodeSparkles(p * 1.5, freq, time);
  float field = shell * (0.35 + braid * 0.7 + rings * 0.35) * (0.7 + core * 0.45) + sparks * 0.45;
  vec3 color = aquaPalette(field + tube + time * 0.04, u_claimMode) * field * (1.2 + beat + u_bloom);
  color += vec3(1.0, 0.25, 0.78) * shell * 0.35;
  color *= smoothstep(1.35, 0.1, length(uv * vec2(0.85, 1.1)));
  return color;
}

vec3 renderCenterDive(vec2 uv, float time, float freq, float beat) {
  vec2 p = uv;
  float radius = length(p);
  float angle = atan(p.y, p.x);
  float tunnel = 1.0 / max(0.08, radius);
  float z = tunnel + time * (0.32 + u_spin * 0.8);
  float spiral = sin(angle * u_symmetry + z * freq * 2.4);
  float rings = sin(z * 9.0 + radius * 26.0 - time * 1.8);
  float ribs = pow(abs(spiral), 9.0) + pow(abs(rings), 11.0);
  float voidMask = smoothstep(0.12, 0.36 + beat * 0.06, radius);
  float field = ribs * voidMask * smoothstep(1.45, 0.1, radius);
  field += nodeSparkles(p * tunnel * 0.35, freq, time) * 0.6;
  vec3 color = aquaPalette(field + z * 0.04, u_claimMode) * field * (0.95 + u_bloom * 1.7);
  color += vec3(1.0, 0.12, 0.72) * exp(-abs(radius - 0.35) * 11.0) * 0.35;
  return color;
}

vec3 renderFieldTunnel(vec2 uv, float time, float freq, float beat) {
  vec2 p = uv;
  float radius = length(p);
  float angle = atan(p.y, p.x);
  float fold = abs(sin(angle * u_symmetry * 0.5 + time * 0.4));
  float depth = sin(radius * (22.0 + freq * 12.0) - time * (2.0 + u_spin));
  float membrane = softLine(depth, 0.12) * smoothstep(1.4, 0.12, radius);
  float lattice = softLine(sin(angle * u_symmetry + radius * 19.0 + time), 0.1);
  float field = membrane * (0.5 + fold * 0.7) + lattice * 0.38;
  field *= smoothstep(0.08, 0.48, radius);
  field += nodeSparkles(p * 1.7, freq, time) * 0.65;
  vec3 color = aquaPalette(field + radius + time * 0.04, u_claimMode) * field * (1.0 + u_bloom * 1.45 + beat * 0.7);
  color += vec3(0.0, 0.8, 1.0) * lattice * 0.08;
  return color;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  float time = u_time;
  float freq = clamp(u_frequency / 432.0, 0.08, 2.6);
  float beat = clamp(u_amplitude * 0.55 + u_audioLevel * 1.9, 0.0, 1.8);
  vec3 color;

  if (u_viewMode < 0.5) {
    color = renderTopMandala(uv, time, freq, beat);
  } else if (u_viewMode < 1.5) {
    color = renderSideTorus(uv, time, freq, beat);
  } else if (u_viewMode < 2.5) {
    color = renderCenterDive(uv, time, freq, beat);
  } else {
    color = renderFieldTunnel(uv, time, freq, beat);
  }

  float vignette = smoothstep(1.55, 0.15, length(uv));
  color *= vignette;
  color = color / (1.0 + color);
  color = pow(color, vec3(0.82));
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
      claimMode: gl.getUniformLocation(program, 'u_claimMode')
    };

    let frameId;
    let start = performance.now();

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
