import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { googleStatus, googleGscSites, googleGscSummary, googleConnectUrl, type GscSummary } from '@/lib/api';

// GSC insights inside the audit — real Search Console data for the audited
// domain. Logged-out visitors get a login CTA; logged-in users without Google
// connected get a Connect button; connected users see totals + top queries.
function normSite(s: string): string {
  return s.toLowerCase().replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
}

export function GscInsights({ origin }: { origin: string }) {
  const [state, setState] = useState<'checking' | 'login' | 'connect' | 'loading' | 'ready' | 'nomatch' | 'error'>('checking');
  const [sites, setSites] = useState<string[]>([]);
  const [site, setSite] = useState('');
  const [data, setData] = useState<GscSummary | null>(null);
  const [msg, setMsg] = useState('');

  const loadSummary = async (s: string) => {
    setState('loading');
    try {
      const r = await googleGscSummary(s || undefined, 28);
      setData(r.data); setSite(r.data.site); setState('ready');
    } catch {
      setMsg('Could not load Search Console data for this property.');
      setState('error');
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('serpely_client_token')) { setState('login'); return; }
    googleStatus()
      .then(r => {
        if (!r.data.connected) { setState('connect'); return; }
        return googleGscSites()
          .then(s => {
            const all = s.data.sites || [];
            setSites(all);
            const host = normSite(origin);
            const hit = all.find(x => normSite(x) === host || normSite(x) === `www.${host}` || host === `www.${normSite(x)}`)
              || (r.data.gscSite && all.includes(r.data.gscSite) ? r.data.gscSite : '');
            if (hit) { void loadSummary(hit); }
            else if (all.length) { setSite(all[0]); setState('nomatch'); }
            else { setMsg('Your Google account has no Search Console properties.'); setState('error'); }
          })
          .catch(() => { setMsg('Could not reach Search Console.'); setState('error'); });
      })
      .catch(() => setState('login'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin]);

  const connect = async () => {
    try {
      const r = await googleConnectUrl();
      window.location.href = r.data.url;
    } catch { setMsg('Could not start Google connect.'); setState('error'); }
  };

  if (state === 'checking' || state === 'loading') {
    return (
      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>Search performance</h3>
        <p style={{ margin: 0, fontSize: 13, color: '#7A8A83' }}>
          {state === 'checking' ? 'Checking Google connection…' : 'Loading Search Console data…'}
        </p>
      </div>
    );
  }

  if (state === 'login') {
    return (
      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>Search performance</h3>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#5B6B64' }}>
          Connect Google to see this site's real clicks, impressions and top queries from Search Console.
        </p>
        <Link to="/login" className="btn-accent-s inline-flex" style={{ fontSize: 12, textDecoration: 'none' }}>Login to connect Google</Link>
      </div>
    );
  }

  if (state === 'connect') {
    return (
      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>Search performance</h3>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#5B6B64' }}>
          One click connects Search Console — then this card shows real queries bringing visitors.
        </p>
        <button type="button" onClick={connect} className="btn-accent-s" style={{ fontSize: 12 }}>Connect Google</button>
      </div>
    );
  }

  if (state === 'nomatch') {
    return (
      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>Search performance</h3>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#5B6B64' }}>
          {origin.replace(/^https?:\/\//, '')} isn't in your Search Console properties — pick one to preview:
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={site} onChange={e => setSite(e.target.value)}
            style={{ flex: '1 1 200px', border: '1px solid #DCE3DF', borderRadius: 10, padding: '9px 12px', fontSize: 13, background: '#fff', color: '#0B1411' }}>
            {sites.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="button" onClick={() => site && loadSummary(site)} className="btn-accent-s" style={{ fontSize: 12 }}>Load</button>
        </div>
      </div>
    );
  }

  if (state === 'error' || !data) {
    return (
      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>Search performance</h3>
        <p style={{ margin: 0, fontSize: 13, color: '#7A8A83' }}>{msg || 'Search Console data unavailable.'}</p>
      </div>
    );
  }

  const t = data.totals; const p = data.prev;
  const dClicks = t.clicks - p.clicks; const dImpr = t.impressions - p.impressions;
  const cells = [
    { label: 'Clicks · 28d', value: t.clicks.toLocaleString(), delta: dClicks },
    { label: 'Impressions', value: t.impressions.toLocaleString(), delta: dImpr },
    { label: 'Avg CTR', value: `${(t.ctr * 100).toFixed(1)}%`, delta: null },
    { label: 'Avg position', value: t.position ? t.position.toFixed(1) : '—', delta: null },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Search performance</h3>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#5B6B64', background: '#F1F5F3', borderRadius: 999, padding: '4px 10px' }}>
          Google Search Console · 28d{data.cached ? ' · cached' : ''}
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#7A8A83', marginBottom: 10, wordBreak: 'break-all' }}>{data.site}</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        {cells.map(c => (
          <div key={c.label} style={{ flex: '1 1 110px', background: '#F8FAF9', borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#5B6B64' }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{c.value}</div>
            {c.delta !== null && c.delta !== 0 && (
              <div style={{ fontSize: 11, fontWeight: 700, color: c.delta > 0 ? '#00B96B' : '#E5484D' }}>
                {c.delta > 0 ? '▲' : '▼'} {Math.abs(c.delta).toLocaleString()} vs prior
              </div>
            )}
          </div>
        ))}
      </div>
      {!!data.topQueries.length && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 440 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#5B6B64' }}>
                <th style={{ padding: '6px 8px' }}>Top query</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Clicks</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Impr.</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Pos.</th>
              </tr>
            </thead>
            <tbody>
              {data.topQueries.slice(0, 8).map(q => (
                <tr key={q.query} style={{ borderTop: '1px solid #EEF3F1' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 600 }}>{q.query}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{q.clicks.toLocaleString()}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{q.impressions.toLocaleString()}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700,
                    color: q.position <= 3 ? '#00B96B' : q.position <= 10 ? '#D9A400' : '#5B6B64' }}>
                    {q.position ? q.position.toFixed(1) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
