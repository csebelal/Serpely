import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSEOMeta } from '@/hooks/useSEOMeta';
import {
  googleStatus, googleGscSites, googleSetProperty,
  googleGscSummary, googleGscIndex, googleGaSessions,
  type GoogleStatus, type GscSummary, type GscIndex, type GaSessions,
} from '@/lib/api';

const card: React.CSSProperties = { background: 'var(--card-bg)', border: '1px solid hsl(var(--border))', borderRadius: 16 };

function delta(cur: number, prev: number, invert = false): { t: string; c: string } {
  if (!prev) return { t: '—', c: 'var(--text-faint)' };
  const pct = ((cur - prev) / prev) * 100;
  if (Math.abs(pct) < 0.05) return { t: '0%', c: 'var(--text-faint)' };
  const good = invert ? pct < 0 : pct > 0;
  return { t: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`, c: good ? '#00A868' : '#E5484D' };
}

export function GoogleDashboard() {
  useSEOMeta('dashboard', {
    title: 'Search Dashboard — Serpely',
    description: 'Google Search Console and Analytics performance: impressions, clicks, rankings and indexed pages.',
  });
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [sites, setSites] = useState<string[]>([]);
  const [site, setSite] = useState('');
  const [days, setDays] = useState(28);
  const [summary, setSummary] = useState<GscSummary | null>(null);
  const [index, setIndex] = useState<GscIndex | null>(null);
  const [sessions, setSessions] = useState<GaSessions | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    googleStatus().then(r => {
      setStatus(r.data);
      if (r.data.connected) {
        setSite(r.data.gscSite || '');
        void loadAll(r.data.gscSite || '', days);
        googleGscSites().then(s => setSites(s.data.sites || [])).catch(() => {});
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll(s: string, d: number) {
    setLoading(true); setErr('');
    try {
      const [sm, ix, ga] = await Promise.all([
        googleGscSummary(s || undefined, d).catch(() => null),
        googleGscIndex(s || undefined).catch(() => null),
        googleGaSessions(undefined, d).catch(() => null),
      ]);
      if (sm) { setSummary(sm.data); if (sm.data.site) setSite(sm.data.site); }
      if (ix) setIndex(ix.data);
      if (ga) setSessions(ga.data);
      if (!sm && !ix && !ga) setErr('No search data yet — new properties and fresh connections can take a day to populate.');
    } finally {
      setLoading(false);
    }
  }

  async function changeSite(s: string) {
    setSite(s);
    try { await googleSetProperty({ gscSite: s }); } catch { /* selection persists server-side best-effort */ }
    setStatus(prev => (prev ? { ...prev, gscSite: s } : prev));
    setSummary(null); setIndex(null);
    void loadAll(s, days);
  }

  async function changeDays(d: number) {
    setDays(d);
    setSummary(null);
    void loadAll(site, d);
  }

  if (!status && loading) {
    return (
      <div className="min-h-screen px-4 py-16" style={{ background: 'var(--bg)' }}>
        <div className="max-w-6xl mx-auto" style={{ color: 'var(--text-faint)', fontSize: 14 }}>Loading search dashboard…</div>
      </div>
    );
  }

  if (status && !status.connected) {
    return (
      <div className="min-h-screen px-4 py-16" style={{ background: 'var(--bg)' }}>
        <div className="max-w-2xl mx-auto text-center" style={{ ...card, padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔌</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', marginBottom: 8 }}>Connect Google to unlock this dashboard</h1>
          <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 20 }}>
            Pull Search Console impressions, clicks, rankings and indexed pages plus GA4 sessions — read-only, revocable anytime.
          </p>
          <Link to="/profile" className="btn-accent-s" style={{ padding: '10px 22px', fontSize: 14, textDecoration: 'none' }}>
            Go to Profile → Connect Google
          </Link>
        </div>
      </div>
    );
  }

  const t = summary?.totals;
  const p = summary?.prev;
  const stats = t && p ? [
    { label: 'Impressions', value: t.impressions.toLocaleString(), d: delta(t.impressions, p.impressions) },
    { label: 'Clicks', value: t.clicks.toLocaleString(), d: delta(t.clicks, p.clicks) },
    { label: 'Avg CTR', value: `${(t.ctr * 100).toFixed(1)}%`, d: delta(t.ctr, p.ctr) },
    { label: 'Avg Position', value: t.position.toFixed(1), d: delta(t.position, p.position, true) },
  ] : [];

  const failing = (index?.results || []).filter(r => r.verdict !== 'PASS');

  return (
    <div className="min-h-screen px-4 sm:px-6 py-16" style={{ background: 'var(--bg)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>Search Dashboard</h1>
            <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
              {status?.email ? `Connected as ${status.email}` : 'Google connected'}
              {summary?.cached ? ' · cached (refreshes daily)' : ''}
            </div>
          </div>
          <span style={{ flex: 1 }} />
          {sites.length > 1 && (
            <select value={site} onChange={e => void changeSite(e.target.value)}
              style={{ padding: '8px 12px', fontSize: 12, borderRadius: 10, border: '1px solid hsl(var(--border))', background: 'var(--card-bg)', color: 'var(--text)', cursor: 'pointer' }}
              aria-label="Search Console property">
              {sites.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {[7, 28, 90].map(d => (
            <button key={d} onClick={() => void changeDays(d)}
              style={{ padding: '8px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: '1px solid hsl(var(--border))', cursor: 'pointer', background: days === d ? 'var(--text)' : 'var(--card-bg)', color: days === d ? 'var(--bg)' : 'var(--text-soft)' }}>
              {d}d
            </button>
          ))}
        </div>

        {err && (
          <div style={{ ...card, padding: '12px 18px', marginBottom: 16, fontSize: 13, color: 'var(--text-soft)' }}>{err}</div>
        )}

        {loading ? (
          <div style={{ color: 'var(--text-faint)', fontSize: 14 }}>Loading search data…</div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {stats.map(s => (
                <div key={s.label} style={{ ...card, padding: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: 'var(--text-faint)' }}>{s.label.toUpperCase()}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text)', marginTop: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: s.d.c, marginTop: 2 }}>{s.d.t} <span style={{ color: 'var(--text-faint)', fontWeight: 600 }}>vs prior {days}d</span></div>
                </div>
              ))}
              <div style={{ ...card, padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: 'var(--text-faint)' }}>SESSIONS (GA4)</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text)', marginTop: 4 }}>
                  {sessions ? sessions.sessions.toLocaleString() : '—'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>
                  {sessions ? `${sessions.users.toLocaleString()} users · ${sessions.days}d` : 'No GA4 property linked'}
                </div>
              </div>
            </div>

            {/* Trend */}
            <div style={{ ...card, padding: 20, marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>Search performance trend</div>
              {(summary?.daily?.length || 0) > 0 ? (
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={summary!.daily} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" tickFormatter={(v: string) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                      <Line type="monotone" dataKey="impressions" name="Impressions" stroke="#2563eb" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="clicks" name="Clicks" stroke="#00C27A" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>Daily trend appears once Search Console returns date rows for this property.</div>
              )}
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              {/* Top queries */}
              <div style={{ ...card, padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>Top queries</div>
                {(summary?.topQueries?.length || 0) > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: 'var(--text-faint)', fontSize: 11 }}>
                          <th style={{ padding: '6px 8px' }}>Query</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Clicks</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Impr.</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Pos.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary!.topQueries.map(q => (
                          <tr key={q.query} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                            <td style={{ padding: '8px', fontWeight: 600, color: 'var(--text)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.query}</td>
                            <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-soft)' }}>{q.clicks.toLocaleString()}</td>
                            <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-soft)' }}>{q.impressions.toLocaleString()}</td>
                            <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-soft)' }}>{q.position.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>No query data for this period.</div>
                )}
              </div>

              {/* Index coverage + channels */}
              <div>
                <div style={{ ...card, padding: 20, marginBottom: 16 }}>
                  <div className="flex items-center" style={{ marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>Google Index coverage</span>
                    <span style={{ flex: 1 }} />
                    {index && (
                      <span style={{ fontSize: 22, fontWeight: 900, color: index.checked && index.indexed === index.checked ? '#00C27A' : '#D9A400' }}>
                        {index.indexed}<span style={{ fontSize: 13, color: 'var(--text-faint)' }}>/{index.checked}</span>
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 12 }}>live URL Inspection · max 25 sitemap URLs · cached daily</div>
                  {!index ? (
                    <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>Index check has not run for this property yet.</div>
                  ) : failing.length === 0 ? (
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#00A868' }}>✓ All {index.checked} checked URLs indexed — 100%.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {failing.slice(0, 8).map(f => (
                        <div key={f.url} style={{ fontSize: 12, border: '1px solid hsl(var(--border))', borderRadius: 10, padding: '8px 12px' }}>
                          <div style={{ fontWeight: 700, color: '#E5484D' }}>{f.verdict}{f.coverage ? ` · ${f.coverage}` : ''}</div>
                          <div style={{ color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.url}</div>
                        </div>
                      ))}
                      {failing.length > 8 && (
                        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>+{failing.length - 8} more — fix or request indexing in Search Console.</div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ ...card, padding: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>Sessions by channel (GA4)</div>
                  {(sessions?.byChannel?.length || 0) > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {sessions!.byChannel.map(c => {
                        const pct = sessions!.sessions ? Math.round((c.sessions / sessions!.sessions) * 100) : 0;
                        return (
                          <div key={c.channel}>
                            <div className="flex" style={{ fontSize: 12, marginBottom: 4 }}>
                              <span style={{ fontWeight: 700, color: 'var(--text)' }}>{c.channel || 'Direct'}</span>
                              <span style={{ flex: 1 }} />
                              <span style={{ color: 'var(--text-faint)' }}>{c.sessions.toLocaleString()} · {pct}%</span>
                            </div>
                            <div style={{ height: 6, borderRadius: 999, background: 'hsl(var(--border))' }}>
                              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: '#00C27A' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>No GA4 channel data — link a GA4 property or wait for traffic.</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
