import { V2 } from './v2Theme';

export interface RadarCat { name: string; short: string; score: number; ghost: number; note: string }

// Radar/spider chart: solid = today, dashed = after Priority fixes.
export function RadarChart({ cats }: { cats: RadarCat[] }) {
  const n = Math.max(cats.length, 3);
  const cx = 200, cy = 190, R = 120;
  const ang = (i: number) => ((-90 + (360 / n) * i) * Math.PI) / 180;
  const pt = (i: number, r: number): [number, number] => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
  const f = (v: number) => v.toFixed(1);
  const poly = (vals: number[]) => vals.map((v, i) => { const p = pt(i, (v / 100) * R); return `${f(p[0])},${f(p[1])}`; }).join(' ');
  const rings = [0.25, 0.5, 0.75, 1]
    .map(lv => cats.map((_, i) => { const p = pt(i, R * lv); return `${i === 0 ? 'M' : 'L'}${f(p[0])} ${f(p[1])}`; }).join(' ') + ' Z')
    .join(' ');
  const spokes = cats.map((_, i) => { const p = pt(i, R); return `M${cx} ${cy} L${f(p[0])} ${f(p[1])}`; }).join(' ');
  const cur = cats.map(c => Math.min(100, Math.max(0, c.score)));
  const ghost = cats.map(c => Math.min(100, Math.max(0, c.ghost)));
  const dots = cur.map((v, i) => pt(i, (v / 100) * R));
  // Percentage positions so labels track the SVG at any rendered width.
  const labels = cats.map((c, i) => { const p = pt(i, R + 36); return { ...c, x: (p[0] / 400) * 100, y: (p[1] / 380) * 100 }; });
  return (
    <div style={{ position: 'relative', width: 400, maxWidth: '100%', margin: '0 auto' }}>
      <svg viewBox="0 0 400 380" role="img" aria-label="Radar chart of category scores"
        style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: '400 / 380' }}>
        <path d={rings} fill="none" stroke="#DDE6E1" strokeWidth="1" />
        <path d={spokes} fill="none" stroke="#DDE6E1" strokeWidth="1" />
        <polygon points={poly(ghost)} fill="rgba(0,185,107,0.06)" stroke="#00945A" strokeWidth="2" strokeDasharray="6 5" strokeLinejoin="round" />
        <polygon points={poly(cur)} fill="rgba(0,185,107,0.25)" stroke={V2.green} strokeWidth="3" strokeLinejoin="round" />
        {dots.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="5" fill={V2.green} stroke="#FFFFFF" strokeWidth="2" />
        ))}
      </svg>
      {labels.map(l => (
        <div key={l.short} style={{ position: 'absolute', left: `${l.x}%`, top: `${l.y}%`, transform: 'translate(-50%, -50%)', textAlign: 'center', fontSize: 13, fontWeight: 600, lineHeight: 1.2, width: 100, maxWidth: '30%', color: V2.ink }}>
          {l.name}
        </div>
      ))}
    </div>
  );
}
