import { useEffect, useRef } from 'react';
import { BackgroundField } from './BackgroundField';
import { useAmbientCanvas, type AmbientFrame } from './useAmbientCanvas';

/* ---------------------------------------------------------------------------
   Concept B · "Neural Mesh" — sparse nodes drifting slowly, edges appearing
   only between near neighbours, with occasional signal pulses travelling
   along a link (citations connecting sources). Optional light pointer
   repulsion that never blocks clicks — listners live on window, and the
   canvas itself stays pointer-events:none.
   --------------------------------------------------------------------------- */

interface MeshNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hub: boolean;
}

interface MeshPulse {
  i: number;
  j: number;
  t: number;
  dur: number;
}

export interface NeuralMeshProps {
  /** 'low' = calmer field for hero bands, 'high' = denser feature field */
  density?: 'low' | 'high';
  interactive?: boolean;
  className?: string;
}

export function NeuralMesh({ density = 'low', interactive = false, className = '' }: NeuralMeshProps) {
  const nodes = useRef<MeshNode[]>([]);
  const pulses = useRef<MeshPulse[]>([]);
  const pointer = useRef({ x: -9999, y: -9999, active: false });
  const LINK = density === 'high' ? 190 : 150;

  const ref = useAmbientCanvas(
    (f: AmbientFrame) => {
      const tierScale = f.tier === 'low' ? 0.55 : 1;
      const area = Math.max(f.width * f.height, 1);
      const count = Math.round(
        Math.min(38, Math.max(16, area / 42000))
        * (density === 'high' ? 1.35 : 1)
        * tierScale,
      );
      if (nodes.current.length === count) {
        for (const n of nodes.current) {
          if (n.x > f.width + 20) n.x = Math.random() * f.width;
          if (n.y > f.height + 20) n.y = Math.random() * f.height;
        }
        return;
      }
      nodes.current = Array.from({ length: count }, () => ({
        x: Math.random() * f.width,
        y: Math.random() * f.height,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        hub: Math.random() < 0.16,
      }));
      pulses.current = [];
    },
    (f, _t, dt) => {
      const { ctx, width, height, isStatic, rgb } = f;
      ctx.clearRect(0, 0, width, height);
      const ns = nodes.current;

      if (!isStatic) {
        for (const n of ns) {
          if (pointer.current.active) {
            const dx = n.x - pointer.current.x;
            const dy = n.y - pointer.current.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 124 * 124 && d2 > 1) {
              const d = Math.sqrt(d2);
              const push = ((124 - d) / 124) * 16 * dt;
              n.x += (dx / d) * push;
              n.y += (dy / d) * push;
            }
          }
          n.x += n.vx * dt;
          n.y += n.vy * dt;
          if (n.x < -20) n.x = width + 20;
          else if (n.x > width + 20) n.x = -20;
          if (n.y < -20) n.y = height + 20;
          else if (n.y > height + 20) n.y = -20;
        }

        /* Spawn a pulse along a random near-neighbour edge at ~0.8/s */
        if (ns.length > 6 && Math.random() < dt * 0.8) {
          const i = Math.floor(Math.random() * ns.length);
          const a = ns[i];
          let j = -1;
          let bestD2 = LINK * LINK;
          for (let k = 0; k < ns.length; k++) {
            if (k === i) continue;
            const dx = a.x - ns[k].x;
            const dy = a.y - ns[k].y;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestD2) { bestD2 = d2; j = k; }
          }
          if (j >= 0) pulses.current.push({ i, j, t: 0, dur: 0.9 + Math.random() * 0.7 });
        }
        for (const p of pulses.current) p.t += dt;
        pulses.current = pulses.current.filter(p => p.t < p.dur);
      }

      /* Edges */
      ctx.lineWidth = 1;
      for (let a = 0; a < ns.length; a++) {
        for (let b = a + 1; b < ns.length; b++) {
          const dx = ns[a].x - ns[b].x;
          const dy = ns[a].y - ns[b].y;
          const d2 = dx * dx + dy * dy;
          if (d2 > LINK * LINK) continue;
          const alpha = (1 - Math.sqrt(d2) / LINK) * 0.16;
          ctx.strokeStyle = `rgba(${rgb},${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(ns[a].x, ns[a].y);
          ctx.lineTo(ns[b].x, ns[b].y);
          ctx.stroke();
        }
      }

      /* Pulses travelling along links */
      for (const p of pulses.current) {
        const a = ns[p.i];
        const b = ns[p.j];
        if (!a || !b) continue;
        const k = p.t / p.dur;
        const x = a.x + (b.x - a.x) * k;
        const y = a.y + (b.y - a.y) * k;
        ctx.fillStyle = `rgba(${rgb},${(Math.sin(Math.PI * k) * 0.8).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      /* Nodes */
      for (const n of ns) {
        ctx.fillStyle = `rgba(${rgb},${n.hub ? 0.55 : 0.35})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.hub ? 3.2 : 1.9, 0, Math.PI * 2);
        ctx.fill();
        if (n.hub) {
          ctx.strokeStyle = `rgba(${rgb},0.18)`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 7, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    },
    { fpsCap: 30, themeVar: 'mesh' },
  );

  /* Pointer repulsion — window-level, so the pointer-events:none field never
     interferes with what page elements receive. */
  useEffect(() => {
    if (!interactive) return;
    const canvas = ref.current;
    const doc = canvas?.parentElement?.ownerDocument;
    if (!canvas || !doc) return;

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.current = { x: e.clientX - r.left, y: e.clientY - r.top, active: true };
    };
    const onLeave = () => { pointer.current.active = false; };
    window.addEventListener('pointermove', onMove, { passive: true });
    doc.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      doc.removeEventListener('pointerleave', onLeave);
      pointer.current.active = false;
    };
  }, [interactive, ref]);

  return (
    <BackgroundField className={className}>
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
    </BackgroundField>
  );
}
