import { useRef } from 'react';
import { BackgroundField } from './BackgroundField';
import { useAmbientCanvas, type AmbientFrame } from './useAmbientCanvas';

/* ---------------------------------------------------------------------------
   Concept D · "Index Stream" — thin data ticks flowing through the field like
   URLs being parsed into an index. Dashes (not dots), gentle sinusoidal sway,
   soft alpha tail. ~20–44 particles scaled by width and device tier. Canvas
   2D through the shared ambient runtime (paused off-screen / hidden tab /
   reduced motion).
   --------------------------------------------------------------------------- */

interface DataTick {
  bx: number;      // base x
  x: number;
  y: number;
  v: number;       // px/s
  len: number;
  amp: number;     // sway amplitude
  spd: number;     // sway speed
  phase: number;
  alpha: number;
  w: number;
}

export interface DataStreamProps {
  direction?: 'up' | 'down';
  /** 0.4…1.6 density multiplier */
  density?: number;
  className?: string;
}

export function DataStream({ direction = 'down', density = 1, className = '' }: DataStreamProps) {
  const ticks = useRef<DataTick[]>([]);

  const ref = useAmbientCanvas(
    (f: AmbientFrame) => {
      const base = (f.width / 24) * Math.min(Math.max(density, 0.4), 1.6);
      const count = Math.round(Math.min(44, Math.max(16, base)) * (f.tier === 'low' ? 0.55 : 1));
      if (ticks.current.length === count) {
        for (const p of ticks.current) {
          if (p.bx > f.width) p.bx = Math.random() * f.width;
          if (p.y > f.height) p.y = Math.random() * f.height;
        }
        return;
      }
      ticks.current = Array.from({ length: count }, () => ({
        bx: Math.random() * f.width,
        x: 0,
        y: Math.random() * f.height,
        v: 22 + Math.random() * 46,
        len: 6 + Math.random() * 9,
        amp: 8 + Math.random() * 22,
        spd: 0.25 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.22 + Math.random() * 0.5,
        w: Math.random() > 0.86 ? 2 : 1,
      }));
    },
    (f, t, dt) => {
      const { ctx, width, height, isStatic, rgb } = f;
      ctx.clearRect(0, 0, width, height);
      const sign = direction === 'down' ? 1 : -1;
      for (const p of ticks.current) {
        if (!isStatic) {
          p.y += p.v * dt * sign;
          if (p.y > height + p.len) p.y = -p.len;
          else if (p.y < -p.len) p.y = height + p.len;
          p.x = p.bx + Math.sin(t * p.spd + p.phase) * p.amp;
        } else {
          p.x = p.bx + Math.sin(p.phase) * p.amp;
        }
        const y2 = p.y + p.len * sign;
        const grad = ctx.createLinearGradient(p.x, p.y, p.x, y2);
        grad.addColorStop(0, `rgba(${rgb},${p.alpha.toFixed(3)})`);
        grad.addColorStop(1, `rgba(${rgb},0)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = p.w;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, y2);
        ctx.stroke();
      }
    },
    { fpsCap: 30, themeVar: 'flow' },
  );

  return (
    <BackgroundField className={className}>
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
    </BackgroundField>
  );
}
