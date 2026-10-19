import { useState } from 'react';
import { compareAudit, type CompareSite } from '@/lib/api';
import { MOCKUP_ORDER, toMockupScores } from './grades';
import { TurnstileWidget } from '@/components/TurnstileWidget';

// Competitor compare — homepage-only checks (same engine, no crawl) for your
// site + up to 3 competitors. Best cell per row highlighted.
export function CompareCard({ defaultUrl, onAuditSite }: { defaultUrl: string; onAuditSite: (url: string) => void }) {
  const [comps, setComps] = useState<string[]>(['', '', '']);
  const [sites, setSites] = useState<CompareSite[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  let youOrigin = '';
  try { youOrigin = new URL(defaultUrl).origin; } catch { youOrigin = ''; }

  const run = async () => {
    const list = comps.map(c => c.trim()).filter(Boolean);
    if (!list.length) { setError('Add at least one competitor URL.'); return; }
    setError(''); setLoading(true); setSites(null);
    try {
      const r = await compareAudit(defaultUrl, list, turnstileToken);
      setSites(r.data.sites);
    } catch (e: unknown) {
      const m = e as { response?: { data?: { error?: string } }; code?: string };
      setError(m?.response?.data?.error || (m?.code === 'ECONNABORTED' ? 'Comparison timed out — try fewer competitors.' : 'Comparison failed. Try again.'));
    } finally { setLoading(false); }
  };

  const rows: { label: string; get: (s: CompareSite) => number | undefined; suffix?: string }[] = [
    { label: 'Overall', get: s => s.overall, suffix: '/100' },
    ...MOCKUP_ORDER.map(name => ({ label: name, get: (s: CompareSite) => toMockupScores(s.scores || {}, undefined)[name] })),
    { label: 'PSI speed', get: s => s.psiScore, suffix: '/100' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Competitor compare</h3>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#5B6B64', background: '#F1F5F3', borderRadius: 999, padding: '4px 10px' }}>
          Homepage checks · same engine
        </span>
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#5B6B64' }}>
        How your homepage stacks up against up to 3 competitors — same checks, same minute.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {comps.map((c, i) => (
          <input
            key={i} value={c} onChange={e => setComps(prev => prev.map((v, j) => (j === i ? e.target.value : v)))}
            placeholder={`Competitor ${i + 1} (e.g. rival.com)`} disabled={loading} aria-label={`Competitor ${i + 1} URL`}
            style={{ flex: '1 1 160px', border: '1px solid #DCE3DF', borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none', background: '#fff', color: '#0B1411' }}
          />
        ))}
        <button type="button" onClick={run} disabled={loading}
          className="btn-accent-s" style={{ fontSize: 13, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Comparing…' : 'Compare'}
        </button>
      </div>
      <TurnstileWidget onToken={setTurnstileToken} />
      {loading && <p style={{ fontSize: 13, color: '#7A8A83' }}>Running homepage checks on {1 + comps.filter(Boolean).length} sites — up to ~1 min.</p>}
      {error && <p style={{ color: '#E5484D', fontSize: 13 }}>{error}</p>}
      {sites && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 420 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px', color: '#5B6B64' }}></th>
                {sites.map(s => (
                  <th key={s.url} style={{ textAlign: 'center', padding: '8px', minWidth: 90 }}>
                    <div style={{ fontSize: 12, wordBreak: 'break-all' }}>{s.origin ? s.origin.replace(/^https?:\/\//, '') : s.url}</div>
                    {s.url === defaultUrl || (youOrigin && s.origin === youOrigin) ? (
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#00B96B' }}>YOU</span>
                    ) : (
                      <button type="button" onClick={() => onAuditSite(s.url)}
                        style={{ fontSize: 10, fontWeight: 700, color: '#2F7CF6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        Full audit →
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const vals = sites.map(s => (s.error ? undefined : r.get(s)));
                const best = Math.max(...vals.filter((v): v is number => v !== undefined), -1);
                return (
                  <tr key={r.label} style={{ borderTop: '1px solid #EEF3F1' }}>
                    <td style={{ padding: '8px', fontWeight: 700, color: '#33423C' }}>{r.label}</td>
                    {sites.map(s => {
                      const v = s.error ? undefined : r.get(s);
                      const isBest = v !== undefined && v === best && sites.filter(x => !x.error).length > 1;
                      return (
                        <td key={s.url} style={{
                          textAlign: 'center', padding: '8px', fontWeight: isBest ? 800 : 400,
                          background: isBest ? '#E9F9F0' : 'transparent', borderRadius: 8,
                        }}>
                          {s.error ? <span style={{ color: '#E5484D', fontSize: 12 }}>Failed</span>
                            : v === undefined ? <span style={{ color: '#9DB2A8' }}>—</span>
                            : `${v}${r.suffix || ''}`}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ fontSize: 11, color: '#9DB2A8', margin: '8px 0 0' }}>Homepage-only snapshot — full crawls may differ. Failed = site blocked the check.</p>
        </div>
      )}
    </div>
  );
}
