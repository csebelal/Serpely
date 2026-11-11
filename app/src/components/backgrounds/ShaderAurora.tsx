import { useRef, useState } from 'react';
import { BackgroundField } from './BackgroundField';
import { AuroraDrift } from './AuroraDrift';
import { useAmbientCanvas } from './useAmbientCanvas';

/* ---------------------------------------------------------------------------
   "Aurora Flow" — the homepage hero shader. A single fullscreen triangle drawn
   with a hand-written WebGL fragment shader: two moving value-noise light
   bands warped around each other, brand green mixing into product teal,
   fading toward the bottom so hero copy keeps full contrast.

   • No external dependency, ~1 draw call per frame, 30fps cap, paused off
     screen / when the tab is hidden.
   • Reduced motion → renders one still frame of the same composition.
   • No/failing WebGL, or a compile error → silently falls back to the CSS
     AuroraDrift light field, so the hero never renders empty.
   --------------------------------------------------------------------------- */

const VERT_SRC = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = (aPos + 1.0) * 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG_SRC = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uRes;
uniform float uIntensity;
uniform vec3 uColA;
uniform vec3 uColB;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime * 0.055;

  /* Two counter-drifting noise fields warp each other into light bands */
  float w1 = fbm(p * 1.35 + vec2(t * 0.8, -t * 0.5));
  float w2 = fbm(p * 2.05 - vec2(t * 0.55, t * 0.38));
  float ray = fbm(vec2(p.x * (1.05 + w2 * 0.55), p.y * 0.85 - t * 0.75) + w1 * 0.85);
  float band = smoothstep(0.40, 0.92, ray);

  /* Keep the page floor readable — fade out toward the bottom */
  float vert = smoothstep(-0.15, 0.38, uv.y);

  vec3 col = mix(uColB, uColA, clamp(w1 * 1.4, 0.0, 1.0));

  float a = band * vert * uIntensity;
  a += smoothstep(0.55, 0.0, uv.y) * vert * 0.30 * uIntensity * w2;
  a = clamp(a, 0.0, 0.42);

  gl_FragColor = vec4(col * a, a);
}`;

const GL_CAPABLE: boolean | null = (() => {
  try {
    if (typeof document === 'undefined') return false;
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch {
    return false;
  }
})();

/* #00C27A / #2F8E92 in light, brightened toward #00FF88 in dark */
const COLS = {
  light: {
    a: [0.0, 0.76, 0.48] as const,
    b: [0.184, 0.557, 0.573] as const,
  },
  dark: {
    a: [0.0, 1.0, 0.533] as const,
    b: [0.18, 0.71, 0.615] as const,
  },
};

interface GLProgram {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  buf: WebGLBuffer | null;
  uTime: WebGLUniformLocation | null;
  uRes: WebGLUniformLocation | null;
  uIntensity: WebGLUniformLocation | null;
  uColA: WebGLUniformLocation | null;
  uColB: WebGLUniformLocation | null;
}

function compile(gl: WebGLRenderingContext): GLProgram | null {
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      void gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      return null;
    }
    return s;
  };

  const vs = sh(gl.VERTEX_SHADER, VERT_SRC);
  const fs = sh(gl.FRAGMENT_SHADER, FRAG_SRC);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  /* One triangle covering the viewport */
  gl.useProgram(program);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  gl.clearColor(0, 0, 0, 0);

  return {
    gl,
    program,
    buf,
    uTime: gl.getUniformLocation(program, 'uTime'),
    uRes: gl.getUniformLocation(program, 'uRes'),
    uIntensity: gl.getUniformLocation(program, 'uIntensity'),
    uColA: gl.getUniformLocation(program, 'uColA'),
    uColB: gl.getUniformLocation(program, 'uColB'),
  };
}

export interface ShaderAuroraProps {
  /** 0..1 opacity of the shader output */
  intensity?: number;
  className?: string;
}

export function ShaderAurora({ intensity = 1, className = '' }: ShaderAuroraProps) {
  const [broken, setBroken] = useState(false);
  const prog = useRef<GLProgram | null>(null);
  const glow = useRef(0); // smoothed toward the prop so edits don't pop

  const ref = useAmbientCanvas(
    (f) => {
      if (prog.current) return; // compile once per WebGL context, not on every resize
      try {
        const g = compile(f.ctx as WebGLRenderingContext);
        prog.current = g;
        if (!g) setBroken(true);
      } catch {
        setBroken(true);
      }
    },
    (f, t, dt) => {
      const p = prog.current;
      if (!p) {
        if (f.isStatic) setBroken(true);
        return;
      }
      const { gl } = p;
      const dark = (document.documentElement.getAttribute('data-theme') || '') === 'dark';
      const cols = dark ? COLS.dark : COLS.light;
      /* Ease TOWARD the prop so runtime edits don't pop; still frames (reduced
         motion) draw at full target since there is no motion to ease into. */
      if (f.isStatic || glow.current === 0) glow.current = intensity;
      else glow.current += (intensity - glow.current) * Math.min(Math.max(dt, 0), 1) * 6;

      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(p.program);
      if (p.uTime) gl.uniform1f(p.uTime, t);
      if (p.uRes) gl.uniform2f(p.uRes, f.width, f.height);
      if (p.uIntensity) gl.uniform1f(p.uIntensity, glow.current);
      if (p.uColA) gl.uniform3f(p.uColA, cols.a[0], cols.a[1], cols.a[2]);
      if (p.uColB) gl.uniform3f(p.uColB, cols.b[0], cols.b[1], cols.b[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    {
      kind: 'webgl',
      fpsCap: 30,
      cleanup: () => {
        const p = prog.current;
        if (!p) return;
        if (p.buf) p.gl.deleteBuffer(p.buf);
        p.gl.deleteProgram(p.program);
        prog.current = null;
      },
    },
  );

  if (broken || !GL_CAPABLE) {
    return <AuroraDrift className={className} intensity={Math.min(Math.max(intensity, 0), 1)} />;
  }

  return (
    <BackgroundField className={className}>
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
    </BackgroundField>
  );
}
