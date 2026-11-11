import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/* ---------------------------------------------------------------------------
   Shared runtime for every canvas-backed ambient background.
   One requestAnimationFrame per field, capped frame rate, and hard pauses:

   • prefers-reduced-motion  → never animates; renders ONE still frame so the
     composition still reads.
   • tab hidden (visibilitychange) → paused.
   • scrolled out of view (IntersectionObserver) → paused.
   • low-end devices (≤4 cores or ≤4GB deviceMemory) → quarter DPR, fewer
     particles. High-DPI screens are capped at 2× DPR.

   `setup` runs on attach + resize; `frame` runs each painting tick. `t` is
   accumulated seconds while awake — pausing never causes a visual jump
   because dt (not wall-clock) drives everything.
   --------------------------------------------------------------------------- */

export type DeviceTier = 'high' | 'low';

export function deviceTier(): DeviceTier {
  if (typeof navigator === 'undefined') return 'high';
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof mem === 'number' && mem > 0 && mem <= 4) return 'low';
  if ((navigator.hardwareConcurrency ?? 8) <= 4) return 'low';
  return 'high';
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface AmbientFrame {
  /**
   * `CanvasRenderingContext2D` for 2D fields, `WebGLRenderingContext` when
   * created with kind:'webgl'. Loosely typed so one runtime serves both.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  width: number;
  height: number;
  dpr: number;
  tier: DeviceTier;
  isStatic: boolean;
  rgb: string;
}

export type AmbientKind = '2d' | 'webgl';

interface AmbientOptions {
  fpsCap?: number;
  kind?: AmbientKind;
  themeVar?: 'flow' | 'mesh';
  cleanup?: () => void;
}

export function useAmbientCanvas(
  setup: (f: AmbientFrame) => void,
  frame: (f: AmbientFrame, t: number, dt: number) => void,
  { fpsCap = 30, kind = '2d', themeVar, cleanup }: AmbientOptions = {},
): RefObject<HTMLCanvasElement | null> {
  const ref = useRef<HTMLCanvasElement>(null);
  const setupRef = useRef(setup);
  setupRef.current = setup;
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const cleanupRef = useRef(cleanup);
  cleanupRef.current = cleanup;

  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = kind === 'webgl'
      ? canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true })
      : canvas.getContext('2d');
    if (!ctx) return;

    const tier = deviceTier();
    const reduced = prefersReducedMotion();
    const maxDpr = tier === 'low' ? 1.25 : 2;
    const minFrame = 1000 / Math.max(fpsCap, 10);

    const f: AmbientFrame = {
      ctx,
      width: 0,
      height: 0,
      dpr: 1,
      tier,
      isStatic: reduced,
      rgb: themeVar ? themeRgb(canvas, themeVar) : '0,194,122',
    };

    const syncTheme = () => {
      if (!themeVar) return;
      f.rgb = themeRgb(canvas, themeVar);
      if (reduced) frameRef.current(f, 0, 0);
    };
    const themeObserver = themeVar ? new MutationObserver(syncTheme) : null;
    themeObserver?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    let raf = 0;
    let running = false;
    let inView = true;
    let awake = !document.hidden;
    let t = 0;
    let last = 0;

    const resize = () => {
      f.width = parent.clientWidth;
      f.height = parent.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      f.dpr = dpr;
      canvas.width = Math.max(1, Math.round(f.width * dpr));
      canvas.height = Math.max(1, Math.round(f.height * dpr));
      if (kind === '2d') (ctx as CanvasRenderingContext2D).setTransform(dpr, 0, 0, dpr, 0, 0);
      setupRef.current(f);
      if (reduced) frameRef.current(f, 0, 0); // one still frame
    };

    const setRunning = (on: boolean) => {
      const should = on && !reduced;
      if (should && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      } else if (!should && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };

    const tick = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      if (now - last < minFrame) return; // frame-rate cap
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;
      frameRef.current(f, t, dt);
    };

    const io = new IntersectionObserver(([entry]) => {
      inView = !!entry?.isIntersecting;
      setRunning(inView && awake);
    }, { rootMargin: '120px' });
    io.observe(parent);

    const onVisibility = () => {
      awake = !document.hidden;
      setRunning(inView && awake);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      io.disconnect();
      ro.disconnect();
      themeObserver?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      cancelAnimationFrame(raf);
      running = false;
      cleanupRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}

/* Reads `--bg-anim-<name>-rgb` ("r, g, b") from the canvas' computed style so
   canvas fields theme themselves through the same tokens the CSS fields use. */
export function themeRgb(canvas: HTMLCanvasElement, name: 'flow' | 'mesh'): string {
  const v = getComputedStyle(canvas).getPropertyValue(`--bg-anim-${name}-rgb`).trim();
  return v || '0,194,122';
}
