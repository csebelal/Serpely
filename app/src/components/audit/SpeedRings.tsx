import { V2 } from './v2Theme';

interface PsiFieldMeta { overall?: string; lcpS?: number; cls?: number; inpMs?: number; ttfbMs?: number }

export interface PsiMeta {
  score: number; lcpS?: number; cls?: number; inpMs?: number;
  scores?: { performance: number; accessibility: number; bestPractices: number; seo: number };
  field?: PsiFieldMeta | null;
  origin?: PsiFieldMeta | null;
}

export function parsePsiMeta(meta?: Record<string, string>): PsiMeta | null {
  try {
    const raw = meta?.psi;
    if (!raw) return null;
    return JSON.parse(raw) as PsiMeta;
  } catch { return null; }
}

function ringColor(v: number): string {
  if (v >= 90) return V2.green;
  if (v >= 50) return '#D9730D';
  return V2.red;
}

function verdict(good: boolean): { t: string; c: string } {
  return good ? { t: 'Good', c: '#006B43' } : { t: 'Needs work', c: '#8A4108' };
}

function MiniRing({ value, label }: { value: number; label: string }) {
  const r = 31;
  const C = 2 * Math.PI * r;
  const dash = ((Math.min(100, Math.max(0, value)) / 100) * C).toFixed(1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: '1 1 80px' }}>
      <div style={{ position: 'relative', width: 76, height: 76 }}>
        <svg width="76" height="76" viewBox="0 0 76 76" role="img" aria-label={`${label} ${value}`}>
          <circle cx="38" cy="38" r={r} fill="none" stroke="#E8EEEB" strokeWidth="7" />
          <circle cx="38" cy="38" r={r} fill="none" stroke={ringColor(value)} strokeWidth="7"
            strokeLinecap="round" strokeDasharray={`${dash} ${C.toFixed(1)}`} transform="rotate(-90 38 38)" />
        </svg>
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: V2.fontDisplay, fontWeight: 700, fontSize: 22, color: V2.ink }}>
          {value}
        </span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 500, textAlign: 'center', color: V2.ink }}>{label}</span>
    </div>
  );
}

// Lab scores on a simulated phone + real-visitor metrics.
export function SpeedRings({ meta }: { meta?: Record<string, string> }) {
  const pm = parsePsiMeta(meta);
  if (!pm?.scores) return null;
  const chips = [
    { name: 'Performance', v: pm.scores.performance },
    { name: 'Accessibility', v: pm.scores.accessibility },
    { name: 'Best practices', v: pm.scores.bestPractices },
    { name: 'SEO', v: pm.scores.seo },
  ];
  const rows = [
    { name: 'LCP', val: pm.lcpS !== undefined ? `${pm.lcpS} s` : '—', ...verdict((pm.lcpS ?? 99) <= 2.5) },
    { name: 'CLS', val: pm.cls !== undefined ? `${pm.cls}` : '—', ...verdict((pm.cls ?? 99) <= 0.1) },
    { name: 'INP', val: pm.inpMs !== undefined ? `${pm.inpMs} ms` : '—', ...verdict((pm.inpMs ?? 99999) <= 200) },
    { name: 'TTFB', val: pm.field?.ttfbMs !== undefined ? `${(pm.field.ttfbMs / 1000).toFixed(1)} s` : '—', ...verdict((pm.field?.ttfbMs ?? 99999) < 800) },
  ];
  return (
    <section aria-label="Speed test" style={{ flex: '1 1 460px', minWidth: 0, background: V2.cardBg, border: `1px solid ${V2.border}`, borderRadius: 24, padding: 28, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h2 style={{ margin: 0, fontFamily: V2.fontDisplay, fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em', color: V2.ink }}>Speed test</h2>
        <p style={{ margin: 0, color: V2.soft }}>Lab results on a simulated phone.</p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' }}>
        {chips.map(c => <MiniRing key={c.name} value={c.v} label={c.name} />)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingTop: 16, borderTop: `1px solid ${V2.border}` }}>
        {rows.map(r => (
          <div key={r.name} style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ color: V2.soft, fontSize: 13 }}>{r.name}</span>
            <span style={{ fontFamily: V2.fontMono, fontWeight: 500, color: V2.ink }}>{r.val}</span>
            <span style={{ color: r.c, fontSize: 13, fontWeight: 600 }}>{r.t}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
