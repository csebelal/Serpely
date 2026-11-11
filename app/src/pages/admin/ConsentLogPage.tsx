import { useEffect, useState } from 'react';
import { getConsentLog, type ConsentLogData, type ConsentLogStats } from '../../lib/api';

const CHOICE_COLORS: Record<'granted' | 'denied', string> = { granted: '#00C27A', denied: '#64748b' };

/** Minimal browser/OS detection for display. */
function parseUA(ua: string): string {
  if (!ua) return '—';
  const browser = ua.includes('Edg/') ? 'Edge'
    : ua.includes('OPR/') ? 'Opera'
    : ua.includes('Chrome') ? 'Chrome'
    : ua.includes('Firefox') ? 'Firefox'
    : ua.includes('Safari') ? 'Safari'
    : 'Other';
  const os = /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : 'Other';
  return `${browser} · ${os}`;
}

export function ConsentLogPage() {
  const [logs, setLogs] = useState<ConsentLogData[]>([]);
  const [stats, setStats] = useState<ConsentLogStats | null>(null);
  const [filterChoice, setFilterChoice] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params: { choice?: string; from?: string; to?: string } = {};
      if (filterChoice) params.choice = filterChoice;
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await getConsentLog(params);
      setLogs(res.data.logs);
      setStats(res.data.stats);
    } catch {
      setError('Could not load consent logs. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterChoice, from, to]);

  // ── Daily stacked bars (last 30 days) ──
  const days = Array.from(new Set((stats?.byDay || []).map(d => d._id.day))).sort();
  const maxDay = days.reduce((m, d) => {
    const c = (stats?.byDay || []).filter(x => x._id.day === d).reduce((s, x) => s + x.count, 0);
    return Math.max(m, c);
  }, 1);

  return (
    <div style={{ padding: 'clamp(20px, 4vw, 36px) clamp(16px, 4vw, 44px)', maxWidth: 1050 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 6px', color: '#0f172a' }}>
        Cookie Consent Log
      </h1>
      <p style={{ margin: '0 0 24px', color: '#475569', fontSize: 13.5 }}>
        Every cookie-banner decision from the public site. Only the choice, an anonymous visitor
        id, and the page path are stored — never cookie values.
      </p>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Total decisions', value: stats?.total ?? '—', color: '#0f172a' },
          { label: 'Accepted', value: stats?.granted ?? '—', color: '#008753' },
          { label: 'Rejected', value: stats?.denied ?? '—', color: '#475569' },
          { label: 'Accept rate', value: stats?.acceptRate != null ? `${stats.acceptRate}%` : '—', color: '#4f46e5' },
          { label: 'Today', value: stats?.today ?? '—', color: '#b45309' },
          { label: 'Last 30 days', value: stats?.last30d ?? '—', color: '#0369a1' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '15px 16px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 3, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Daily chart */}
      {stats && days.length > 0 && (
        <div
          role="img"
          aria-label={`Daily cookie consent decisions across ${days.length} days`}
          style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)', marginBottom: 22 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Decisions per day (30d)</p>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#475569' }}>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#00C27A', marginRight: 5 }} />Accepted</span>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#cbd5e1', marginRight: 5 }} />Rejected</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 96 }}>
            {days.map(d => {
              const granted = (stats.byDay.find(x => x._id.day === d && x._id.choice === 'granted')?.count) || 0;
              const denied = (stats.byDay.find(x => x._id.day === d && x._id.choice === 'denied')?.count) || 0;
              const gh = `${(granted / maxDay) * 100}%`;
              const dh = `${(denied / maxDay) * 100}%`;
              return (
                <div key={d} title={`${d}: ${granted} accepted, ${denied} rejected`} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, height: '100%', justifyContent: 'flex-end', minWidth: 6 }}>
                  <div style={{ height: gh, background: '#00C27A', borderRadius: 3 }} />
                  <div style={{ height: dh, background: '#cbd5e1', borderRadius: 3 }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#475569' }}>
            <span>{days[0]}</span>
            <span>{days[days.length - 1]}</span>
          </div>
        </div>
      )}

      {/* Top decision pages */}
      {stats && stats.byPage.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)', marginBottom: 22 }}>
          <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Where banners are answered (30d)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.byPage.map(p => (
              <div key={p.page}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12.5, color: '#334155' }}>{p.page || '(unknown page)'}</span>
                  <span style={{ fontSize: 12.5, color: '#475569', fontWeight: 600 }}>{p.count}</span>
                </div>
                <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2 }}>
                  <div style={{ height: '100%', background: '#00C27A', borderRadius: 2, width: `${(p.count / (stats.byPage[0].count || 1)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          aria-label="Filter by consent choice"
          value={filterChoice}
          onChange={e => setFilterChoice(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1', background: '#f8fafc', fontSize: 13, color: '#0f172a', cursor: 'pointer' }}
        >
          <option value="">All choices</option>
          <option value="granted">Accepted</option>
          <option value="denied">Rejected</option>
        </select>
        <input aria-label="From date" type="date" value={from} onChange={e => setFrom(e.target.value)} style={inputStyle} />
        <input aria-label="To date" type="date" value={to} onChange={e => setTo(e.target.value)} style={inputStyle} />
        {(filterChoice || from || to) && (
          <button
            type="button"
            onClick={() => { setFilterChoice(''); setFrom(''); setTo(''); }}
            style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#e2e8f0', color: '#334155', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span>{error}</span>
          <button type="button" onClick={() => void load()} style={{ background: '#fff', border: '1px solid #fca5a5', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#991b1b', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {loading ? <p style={{ color: '#475569', fontSize: 14 }}>Loading…</p> : !error && (
        <div style={{ background: '#fff', borderRadius: 14, overflowX: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #f1f5f9' }}>
                {['Choice', 'Visitor', 'Page', 'Browser', 'Time'].map(h => (
                  <th key={h} scope="col" style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l._id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '11px 16px', textAlign: 'left' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${CHOICE_COLORS[l.choice]}20`, color: l.choice === 'granted' ? '#007A4D' : '#334155' }}>
                      {l.choice === 'granted' ? 'Accepted' : 'Rejected'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px', color: '#475569', fontFamily: 'monospace', fontSize: 12 }}>{l.visitorId ? `${l.visitorId.slice(0, 8)}…` : '—'}</td>
                  <td style={{ padding: '11px 16px', color: '#334155' }}>{l.page || '—'}</td>
                  <td style={{ padding: '11px 16px', color: '#475569', whiteSpace: 'nowrap' }}>{parseUA(l.ua)}</td>
                  <td style={{ padding: '11px 16px', color: '#475569' }}>{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#475569', fontSize: 14 }}>No consent decisions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1', background: '#f8fafc', fontSize: 13, color: '#0f172a',
};
