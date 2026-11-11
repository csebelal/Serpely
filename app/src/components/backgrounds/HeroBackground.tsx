import { useEffect, useRef } from 'react';
import { useAmbientCanvas } from './useAmbientCanvas';
import { useMotionPrefs } from '../motion/useMotionPrefs';

interface Spark {
  x: number;
  y: number;
  vy: number;
  vx: number;
  r: number;
  alpha: number;
  phase: number;
}

/**
 * Dedicated layered background for HeroSection:
 * 1. Base mask over the global body grid so the hero sits on a clean canvas
 *    and dissolves seamlessly into the next section at the bottom.
 * 2. 4 separated, transform-only aurora lights using existing brand tokens.
 * 3. Radial-masked fine dot/line grid concentrated behind the dashboard +
 *    cursor-following spotlight (desktop pointer only).
 * 4. Focused light beam directly behind the dashboard mockup.
 * 5. Subtle low-opacity grain texture to prevent gradient banding.
 * 6. Gentle upward-drifting sparks around the dashboard (desktop only, pauses
 *    when hidden/off-screen, respects prefers-reduced-motion).
 */
export function HeroBackground() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const spotGridRef = useRef<HTMLDivElement>(null);
  const sparksRef = useRef<Spark[]>([]);
  const { reducedMotion, isTouch } = useMotionPrefs();

  // Cursor-following grid spotlight (desktop pointer devices only)
  useEffect(() => {
    if (reducedMotion || isTouch) return;
    const host = wrapRef.current;
    if (!host) return;
    let raf = 0;
    let lx = 0;
    let ly = 0;

    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      lx = e.clientX - r.left;
      ly = e.clientY - r.top;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (spotGridRef.current) {
          spotGridRef.current.style.setProperty('--hero-spot-x', `${lx}px`);
          spotGridRef.current.style.setProperty('--hero-spot-y', `${ly}px`);
          spotGridRef.current.style.opacity = '1';
        }
      });
    };

    const onLeave = () => {
      if (spotGridRef.current) spotGridRef.current.style.opacity = '0';
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion, isTouch]);

  // Lightweight upward-drifting sparks around the dashboard (desktop only)
  const canvasRef = useAmbientCanvas(
    (f) => {
      if (reducedMotion || isTouch || f.width < 768) {
        sparksRef.current = [];
        return;
      }
      const count = f.tier === 'low' ? 14 : 22;
      sparksRef.current = Array.from({ length: count }, () => ({
        x: f.width * (0.42 + Math.random() * 0.56),
        y: f.height * (0.12 + Math.random() * 0.78),
        vy: 10 + Math.random() * 18,
        vx: (Math.random() - 0.5) * 6,
        r: 0.9 + Math.random() * 1.4,
        alpha: 0.16 + Math.random() * 0.30,
        phase: Math.random() * Math.PI * 2,
      }));
    },
    (f, t, dt) => {
      const { ctx, width, height, isStatic, rgb } = f;
      ctx.clearRect(0, 0, width, height);
      if (isStatic || isTouch || width < 768) return;
      for (const s of sparksRef.current) {
        s.y -= s.vy * dt;
        s.x += (s.vx + Math.sin(t * 0.9 + s.phase) * 3) * dt;
        if (s.y < height * 0.06) {
          s.y = height * 0.88;
          s.x = width * (0.42 + Math.random() * 0.56);
        }
        const edgeFade = Math.min(1, s.y / (height * 0.25)) * Math.min(1, (height - s.y) / (height * 0.25));
        const a = Math.max(0, s.alpha * edgeFade);
        ctx.fillStyle = `rgba(${rgb},${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    { fpsCap: 30, themeVar: 'flow' },
  );

  return (
    <div ref={wrapRef} aria-hidden="true" className="hero-bg-root pointer-events-none select-none">
      {/* Covers the flat global body grid inside the hero, fading smoothly at the bottom */}
      <div className="hero-bg-base" />

      {/* Masked layer stack — dissolves gently into the page background at the bottom */}
      <div className="hero-bg-stage">
        {/* 1. Soft 4-node aurora mesh (transform-only 22-30s loops, separated for crisp text contrast) */}
        <div className="hero-aurora-orb hero-aurora-1" />
        <div className="hero-aurora-orb hero-aurora-2" />
        <div className="hero-aurora-orb hero-aurora-3" />
        <div className="hero-aurora-orb hero-aurora-4" />

        {/* 2. Focused directional light beam directly behind the dashboard mockup */}
        <div className="hero-mockup-beam" />

        {/* 3. Radial-masked fine dot/line grid focused around the dashboard */}
        <div className="hero-fine-grid" />

        {/* 4. Cursor-illuminated brighter grid spotlight (desktop pointer only) */}
        {!reducedMotion && !isTouch && (
          <div ref={spotGridRef} className="hero-fine-grid-spot" />
        )}

        {/* 5. Gentle upward-drifting sparks around the dashboard (desktop only) */}
        {!reducedMotion && !isTouch && (
          <canvas ref={canvasRef} className="hidden md:block absolute inset-0 w-full h-full" />
        )}

        {/* 6. Subtle grain overlay to remove gradient banding */}
        <div className="hero-grain" />
      </div>

      {/* Long bottom gradient dissolve into page background — zero visible seam */}
      <div className="hero-bottom-fade" />
    </div>
  );
}
