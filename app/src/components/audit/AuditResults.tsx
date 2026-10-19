import { MOCKUP_COLORS, MOCKUP_ORDER, formatReportDate, gradeTagline, scoreToGrade, toMockupScores } from './grades';
import { RadarChart, type RadarCat } from './RadarChart';

export interface GoogleMeasures {
  score?: number;
  lcpS?: number; cls?: number; inpMs?: number;
  field?: { overall?: string; lcpMs?: number; cls?: number; inpMs?: number; ttfbMs?: number; source?: string } | null;
}

export function parsePsiMeta(meta: Record<string, string> | undefined): GoogleMeasures | null {
  try {
    const raw = meta?.psi;
    if (!raw) return null;
    return JSON.parse(raw) as GoogleMeasures;
  } catch { return null; }
}

function Ring({ score, size, stroke, color, labelSize }: { score: number; size: number; stroke: number; color: string; labelSize: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const grade = scoreToGrade(score);
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${grade} ${score} out of 100`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF3F1" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <strong style={{ fontSize: labelSize, fontWeight: 800, color: '#3E4B46', letterSpacing: '-0.02em' }}>{grade}</strong>
      </div>
    </div>
  );
}

type Verdict = 'good' | 'ni' | 'poor';
const VC: Record<Verdict, string> = { good: '#00B96B', ni: '#D9A400', poor: '#E5484D' };
const vLcp = (s: number): Verdict => (s <= 2.5 ? 'good' : s <= 4 ? 'ni' : 'poor');
const vCls = (n: number): Verdict => (n <= 0.1 ? 'good' : n <= 0.25 ? 'ni' : 'poor');
const vInp = (ms: number): Verdict => (ms <= 200 ? 'good' : ms <= 500 ? 'ni' : 'poor');

export function AuditResults({
  scores,
  issues,
  overall,
  failedCount,
  createdAt,
  ghostOverall,
  psi,
}: {
  scores: Record<string, number>;
  issues?: { code: string; passed: boolean; impact: number }[];
  overall: number;
  failedCount: number;
  createdAt: string;
  ghostOverall?: number;
  psi?: GoogleMeasures | null;
}) {
  const mockup = toMockupScores(scores, issues);
  // Performance ring shows the REAL PageSpeed lab score when available.
  const perf = psi && typeof psi.score === 'number' && psi.score >= 0 ? Math.round(psi.score) : mockup.Performance;
  const withPerf = { ...mockup, Performance: perf };
  const grade = scoreToGrade(overall);
  const tagline = gradeTagline(grade);
  const radarCats: RadarCat[] = MOCKUP_ORDER.map((name) => ({
    name,
    short: name,
    score: withPerf[name],
    ghost: Math.min(100, withPerf[name] + 12),
    note: '',
  }));
  const f = psi?.field;
  const showMeasures = psi && (psi.score !== undefined || psi.lcpS !== undefined || f);

  return (
    <div style={{ background: '#fff', color: '#0B1411', border: '1px solid #E7EEEA', borderRadius: 16, padding: 20 }}>
      {/* Compact header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0F1F19' }}>Site Health</h2>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#5B6B64', background: '#F1F5F3', borderRadius: 999, padding: '4px 10px' }}>
          {overall}/100 · {grade}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#E11D48', background: '#FDE8EE', borderRadius: 999, padding: '4px 12px' }}>
          {failedCount} to fix
        </span>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Left: overall */}
        <div style={{ flex: '0 0 180px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', margin: '0 auto' }}>
          <Ring score={overall} size={124} stroke={13} color="#3B82F6" labelSize={36} />
          <div style={{ marginTop: 8, fontSize: 14, fontWeight: 800, color: '#1E2B26', lineHeight: 1.35 }}>{tagline}</div>
          <div style={{ marginTop: 6, fontSize: 11, color: '#7A8A83', fontWeight: 600 }}>
            {formatReportDate(createdAt)}
            {typeof ghostOverall === 'number' && ghostOverall > overall && (
              <span style={{ color: '#00945A' }}> · → {ghostOverall}</span>
            )}
          </div>
        </div>

        {/* Right: categories + radar */}
        <div style={{ flex: '1 1 300px', minWidth: 0 }}>
          <div
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))',
              gap: 10, alignItems: 'start',
            }}
          >
            {MOCKUP_ORDER.map((name) => (
              <div
                key={name}
                title={`${name}: ${withPerf[name]}/100${name === 'Performance' && psi?.score !== undefined ? ' (Google lab)' : ''}`}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '8px 4px', borderRadius: 12, background: '#F8FAF9' }}
              >
                <Ring score={withPerf[name]} size={58} stroke={8} color={MOCKUP_COLORS[name]} labelSize={17} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#33423C', textAlign: 'center', lineHeight: 1.25 }}>{name}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: MOCKUP_COLORS[name] }}>{withPerf[name]}</span>
              </div>
            ))}
          </div>
          {showMeasures && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, fontSize: 11, color: '#5B6B64' }}>
              <span style={{ fontWeight: 800, color: '#33423C' }}>Measured by Google:</span>
              {psi?.score !== undefined && psi.score >= 0 && <span>Lab <strong style={{ color: VC[psi.score >= 90 ? 'good' : psi.score >= 50 ? 'ni' : 'poor'] }}>{psi.score}/100</strong></span>}
              {psi?.lcpS !== undefined && <span>LCP <strong style={{ color: VC[vLcp(psi.lcpS)] }}>{psi.lcpS}s</strong></span>}
              {psi?.cls !== undefined && <span>CLS <strong style={{ color: VC[vCls(psi.cls)] }}>{psi.cls}</strong></span>}
              {psi?.inpMs !== undefined && <span>INP <strong style={{ color: VC[vInp(psi.inpMs)] }}>{psi.inpMs}ms</strong></span>}
              {f?.lcpMs !== undefined && <span>Visitors LCP <strong style={{ color: VC[vLcp(f.lcpMs / 1000)] }}>{(f.lcpMs / 1000).toFixed(1)}s</strong></span>}
              {f?.cls !== undefined && <span>Visitors CLS <strong style={{ color: VC[vCls(f.cls)] }}>{f.cls}</strong></span>}
              {f?.overall && (
                <span style={{ fontWeight: 800, borderRadius: 999, padding: '1px 8px', color: '#fff',
                  background: f.overall === 'FAST' ? '#00B96B' : f.overall === 'AVERAGE' ? '#D9A400' : '#E5484D' }}>
                  {f.overall}
                </span>
              )}
            </div>
          )}
          <details style={{ marginTop: 10, borderTop: '1px solid #EEF3F1', paddingTop: 8 }}>
            <summary style={{ fontSize: 12, fontWeight: 700, color: '#5B6B64', cursor: 'pointer' }}>Shape of site health</summary>
            <div style={{ maxWidth: 300, margin: '4px auto 0' }}>
              <RadarChart cats={radarCats} />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
