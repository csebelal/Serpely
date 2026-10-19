import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSEOMeta } from '@/hooks/useSEOMeta';
import { injectSchema, removeSchema } from '@/lib/schema';
import { TurnstileWidget } from '@/components/TurnstileWidget';
import {
  runSitemapCheck, getSitemapCheck,
  type SitemapReport, type SitemapCheckedUrl,
} from '@/lib/api';

type Verdict = SitemapCheckedUrl['verdict'];

const VERDICTS: { key: Verdict | 'All'; label: string; color: string }[] = [
  { key: 'All', label: 'All', color: 'var(--text)' },
  { key: 'Healthy', label: 'Valid', color: '#00C27A' },
  { key: 'Broken', label: 'Broken', color: '#E5484D' },
  { key: 'Blocked', label: 'Blocked', color: '#f59e0b' },
  { key: 'Redirected', label: 'Redirected', color: '#D9A400' },
  { key: 'Non-canonical', label: 'Non-canonical', color: '#7c3aed' },
  { key: 'Slow', label: 'Slow', color: '#94a3b8' },
];

const card: React.CSSProperties = { background: 'var(--card-bg)', border: '1px solid hsl(var(--border))', borderRadius: 16 };

const pill = (color: string): React.CSSProperties => ({
  fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999,
  background: `${color}1a`, color, whiteSpace: 'nowrap',
});

const STAGES = ['Finding sitemap', 'Reading URLs', 'Checking each page', 'Scoring'];

// Row pill: fetch failures (no response at all) show as Not Available.
function rowPill(u: SitemapCheckedUrl): { text: string; color: string } {
  if (u.status === 0) return { text: 'NOT AVAILABLE', color: '#94a3b8' };
  if (u.verdict === 'Healthy') return { text: 'VALID', color: '#00C27A' };
  const v = VERDICTS.find(x => x.key === u.verdict) || VERDICTS[0];
  return { text: u.verdict.toUpperCase(), color: v.color };
}

function scoreColor(s: number) {
  if (s >= 85) return '#00C27A';
  if (s >= 65) return '#D9A400';
  return '#E5484D';
}

export function SitemapChecker() {
  useSEOMeta('sitemap-checker', {
    title: 'Free Sitemap Checker — Serpely',
    description: 'Paste any website to check its XML sitemap: broken links, redirects, blocked pages and Google listing readiness for every URL.',
  });
  const { id } = useParams<{ id: string }>();
  const [url, setUrl] = useState('');
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [report, setReport] = useState<SitemapReport | null>(null);
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    injectSchema('schema-sitemap-checker', {
      '@context': 'https://schema.org', '@type': 'WebPage',
      name: 'Free Sitemap Checker — Serpely', url: 'https://serpely.com/sitemap-checker',
      description: 'Check any XML sitemap for broken, redirected, blocked and non-canonical URLs with plain-language fixes.',
    });
    return () => removeSchema('schema-sitemap-checker');
  }, []);

  useEffect(() => {
    if (id) {
      setRunning(true);
      getSitemapCheck(id).then(r => setReport(r.data)).catch(() => setErr('Report not found or expired.')).finally(() => setRunning(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (running) {
      const t0 = Date.now();
      setElapsed(0);
      timer.current = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 500);
      return () => { if (timer.current) clearInterval(timer.current); };
    }
  }, [running]);

  async function start(u: string) {
    setErr(''); setReport(null);
    const v = (u || url).trim();
    if (!v) { setErr('Enter your website, e.g. example.com'); return; }
    setRunning(true);
    try {
      const full = await runSitemapCheck(v, turnstileToken);
      const rep = await getSitemapCheck(full.data.id);
      setReport(rep.data);
      window.history.replaceState(null, '', `/sitemap-checker/${full.data.id}`);
    } catch (e: unknown) {
      const r = (e as { response?: { data?: { error?: string }; status?: number } })?.response;
      setErr(r?.data?.error || 'Check failed. The site may block automated checks or have no sitemap.');
    } finally {
      setRunning(false);
    }
  }

  function exportCsv() {
    if (!report) return;
    const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
    const lines = ['URL,Status,Verdict,Title,Load ms,Final URL,Detail'];
    for (const u of report.urls) {
      lines.push([q(u.url), u.status, q(u.verdict), q(u.title), u.loadMs, q(u.finalUrl), q(u.detail)].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sitemap-check-${report.origin.replace(/^https?:\/\//, '').replace(/[^a-z0-9.-]/gi, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const filtered = useMemo(() => {
    if (!report) return [];
    const s = search.trim().toLowerCase();
    return report.urls.filter(u =>
      (filter === 'All' || u.verdict === filter) &&
      (!s || `${u.url} ${u.title} ${u.detail}`.toLowerCase().includes(s)));
  }, [report, filter, search]);

  const s = report?.summary;
  const stageIdx = elapsed < 8 ? 0 : elapsed < 18 ? 1 : elapsed < 60 ? 2 : 3;
  const noSitemap = err.toLowerCase().includes('no sitemap found');

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <section className="pt-32 pb-12 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,194,122,0.12) 0%, transparent 70%)' }} />
        <div className="max-w-3xl mx-auto relative z-10">
          <span className="pill-s mb-5 inline-block">Free Online Sitemap Checker</span>
          <h1 className="font-display font-black mb-8" style={{ fontSize: 'clamp(2.4rem,6vw,4rem)', letterSpacing: '-0.05em', lineHeight: 1.02 }}>
            XML Sitemap <span className="text-gradient">Finder & Checker</span>
          </h1>
          <form onSubmit={e => { e.preventDefault(); void start(url); }}
            style={{ display: 'flex', gap: 8, maxWidth: 560, margin: '0 auto', background: 'var(--card-bg)', border: '1px solid hsl(var(--border))', borderRadius: 999, padding: 6 }}>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Enter your website"
              inputMode="url" disabled={running} aria-label="Website to check"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '12px 20px', fontSize: 15, color: 'var(--text)', opacity: running ? 0.6 : 1 }} />
            <button type="submit" disabled={running} className="btn-accent-s" style={{ borderRadius: 999, opacity: running ? 0.6 : 1 }}>
              {running ? 'Checking…' : 'Check My Sitemap'}
            </button>
          </form>
          <div style={{ maxWidth: 560, margin: '12px auto 0', display: 'flex', justifyContent: 'center' }}>
            <TurnstileWidget onToken={setTurnstileToken} />
          </div>
          {running && (
            <div style={{ ...card, maxWidth: 560, margin: '16px auto 0', padding: '14px 18px', textAlign: 'left' }} role="status" aria-live="polite">
              <div className="flex items-center" style={{ gap: 10, marginBottom: 10 }}>
                <span className="w-4 h-4 rounded-full border-2 border-current animate-spin shrink-0" style={{ borderTopColor: 'transparent', color: '#00A868' }} />
                <strong style={{ fontSize: 13 }}>Checking… {elapsed}s</strong>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>up to 1,000 URLs per run</span>
              </div>
              <div className="flex" style={{ gap: 6 }}>
                {STAGES.map((t, i) => (
                  <div key={t} style={{ flex: 1, fontSize: 10, fontWeight: 700, color: i === stageIdx ? 'var(--text)' : i < stageIdx ? '#00A868' : 'var(--text-faint)' }}>
                    <div style={{ height: 4, borderRadius: 999, marginBottom: 4, background: i <= stageIdx ? '#00C27A' : 'hsl(var(--border))', opacity: i < stageIdx ? 0.5 : 1 }} />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          )}
          {err && !noSitemap && <p style={{ color: '#E5484D', marginTop: 12, fontSize: 14 }}>{err}</p>}
          {err && noSitemap && (
            <div style={{ ...card, maxWidth: 560, margin: '16px auto 0', padding: 28, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🗺️</div>
              <div style={{ fontWeight: 900, fontSize: 17, color: 'var(--text)', marginBottom: 6 }}>
                No sitemap found on this website
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 14 }}>
                The website may not have a sitemap, or it may be in a non-standard location.
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)', textAlign: 'left', background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: '12px 16px', marginBottom: 14, lineHeight: 1.8 }}>
                <div>• Most sites keep it at <strong>/sitemap.xml</strong> — try opening that address directly.</div>
                <div>• WordPress sites (Yoast / Rank Math) usually use <strong>/sitemap_index.xml</strong>; Shopify always has <strong>/sitemap.xml</strong>.</div>
                <div>• If it lives elsewhere, ask the developer to link it in <strong>robots.txt</strong> so Google can find it too.</div>
              </div>
              <Link to="/audit" style={{ fontSize: 13, fontWeight: 800, color: '#00A868', textDecoration: 'none' }}>
                Still want a health check? Run the full site audit →
              </Link>
            </div>
          )}
          <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-faint)' }}>Free Online Sitemap Checker • XML Validation • Technical SEO Analysis</p>
        </div>
      </section>

      {report && s && (
        <section className="px-4 sm:px-6 pb-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span style={{ ...card, padding: '8px 14px', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: scoreColor(s.healthScore) }} />
                {s.origin}
              </span>
              <span style={{ flex: 1 }} />
              <button onClick={exportCsv} style={{ ...card, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--text)' }}>
                ⬇ Export CSV
              </button>
              <button onClick={() => void start(report.origin)} disabled={running}
                style={{ ...card, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--text)', opacity: running ? 0.6 : 1 }}>
                ↻ Re-check
              </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div style={{ ...card, padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: 'var(--text-faint)' }}>SITEMAP HEALTH</div>
                <div style={{ fontSize: 40, fontWeight: 900, color: scoreColor(s.healthScore) }}>{s.healthScore}<span style={{ fontSize: 16 }}>%</span></div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{s.totalUrls.toLocaleString()} URLs discovered · {s.healthy} of {s.checked} valid{s.truncated ? ` · first ${s.checked} shown` : ''}</div>
              </div>
              {[
                { label: 'Broken', value: s.broken, color: '#E5484D' },
                { label: 'Blocked', value: s.blocked, color: '#f59e0b' },
                { label: 'Redirected', value: s.redirected, color: '#D9A400' },
                { label: 'Non-canonical', value: s.nonCanonical, color: '#7c3aed' },
                { label: 'Slow', value: s.slow, color: '#94a3b8' },
                { label: 'Sitemaps found', value: s.sitemaps.filter(x => x.ok).length, color: 'var(--text)' },
                { label: 'Lastmod set', value: `${s.lastmodCoverage}%`, color: 'var(--text)' },
                { label: 'Duplicates', value: s.duplicateUrls.length, color: s.duplicateUrls.length ? '#E5484D' : '#00A868' },
              ].slice(0, 3).map(c => (
                <div key={c.label} style={{ ...card, padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: 'var(--text-faint)' }}>{c.label.toUpperCase()}</div>
                  <div style={{ fontSize: 40, fontWeight: 900, color: typeof c.value === 'number' ? c.color : 'var(--text)' }}>{c.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{c.label === 'Broken' ? 'fix or remove these' : c.label === 'Blocked' ? 'Google can never list these' : 'should list the final URL'}</div>
                </div>
              ))}
            </div>

            {/* Sitemaps found + index / XML / lastmod status */}
            {(s.variantNotes.length > 0 || s.duplicateUrls.length > 0 || s.sitemaps.length > 0) && (
              <div style={{ ...card, padding: 20, marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>Sitemaps Found</div>
                <div style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 4 }}>
                  {s.sitemaps.filter(x => x.ok).map(x => x.url.replace(s.origin, '') || '/sitemap.xml').join(', ') || '—'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 4 }}>
                  Sitemap Index Status: {s.sitemaps.filter(x => x.ok).length > 1
                    ? `index with ${s.sitemaps.filter(x => x.ok).length} files`
                    : 'single file'}
                  {' · '}XML Validation: passed for {s.sitemaps.filter(x => x.ok).length} of {s.sitemaps.length} files
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 8 }}>
                  Last Modified Data: {s.lastmodCoverage}% of URLs include dates
                </div>
                {s.duplicateUrls.slice(0, 5).map(u => (
                  <div key={u} style={{ fontSize: 12, color: '#E5484D', marginBottom: 4 }}>⛔ Listed more than once: {u}</div>
                ))}
                {s.variantNotes.slice(0, 6).map((n, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 4 }}>⚠️ {n}</div>
                ))}
              </div>
            )}

            {/* Site-wide findings (cross-page rollups) */}
            {(s.siteIssues?.length || 0) > 0 && (
              <div style={{ ...card, padding: 20, marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>Site-wide findings</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 12 }}>
                  Patterns across all checked pages — duplicates, thin or stale content, broken internal links, unlinked pages.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {s.siteIssues.map(issue => (
                    <div key={issue.code} style={{ border: '1px solid hsl(var(--border))', borderRadius: 12, padding: '12px 14px' }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{issue.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 6 }}>{issue.detail}</div>
                      {issue.urls.slice(0, 5).map(u => (
                        <div key={u} style={{ fontSize: 11, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>• {u}</div>
                      ))}
                      {issue.urls.length > 5 && (
                        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>+{issue.urls.length - 5} more</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detected issues */}
            <div className="flex flex-wrap items-end gap-2 mb-1">
              <span style={{ fontWeight: 800, fontSize: 14 }}>Detected Issues</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>URL accessibility per URL</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 10 }}>
              Valid: no issues detected · Warning: needs review (redirected, non-canonical, slow) · Error: needs attention (broken, blocked) · Not Available: page could not be retrieved
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {VERDICTS.map(v => {
                const n = v.key === 'All' ? report.urls.length : report.urls.filter(u => u.verdict === v.key).length;
                return (
                  <button key={v.key} onClick={() => setFilter(v.key)}
                    style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: '1px solid hsl(var(--border))', cursor: 'pointer', background: filter === v.key ? 'var(--text)' : 'var(--card-bg)', color: filter === v.key ? 'var(--bg)' : 'var(--text-soft)' }}>
                    {v.label} · {n}
                  </button>
                );
              })}
              <span style={{ flex: 1 }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search URLs…"
                style={{ ...card, padding: '8px 14px', fontSize: 12, outline: 'none', minWidth: 170, color: 'var(--text)' }} />
            </div>

            <div style={{ ...card, padding: 8 }}>
              {filtered.length === 0 && (
                <p style={{ fontSize: 13, color: '#00A868', fontWeight: 700, padding: 16 }}>
                  {filter === 'All' ? 'No URLs found.' : `✓ No ${(VERDICTS.find(v => v.key === filter) || VERDICTS[0]).label.toLowerCase()} URLs — nice work.`}
                </p>
              )}
              {filtered.slice(0, 100).map(u => {
                const p = rowPill(u);
                return (
                <div key={u.url} style={{ padding: '12px 12px', borderTop: '1px solid hsl(var(--border))' }}>
                  <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
                    <span style={pill(p.color)}>{p.text}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{u.url}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                      {u.status ? `HTTP ${u.status}` : 'no response'} · {(u.loadMs / 1000).toFixed(1)}s · {u.score}% ready
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 4 }}>{u.detail}</div>
                  {u.finalUrl !== u.url && (
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>→ {u.finalUrl}</div>
                  )}
                </div>
                );
              })}
            </div>

            {/* Recommended fixes */}
            <div style={{ ...card, padding: 20, marginTop: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>Recommended Fixes</div>
              <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 10 }}>
                {s.healthy} Valid URLs · {s.checked - s.healthy} URLs with Issues
              </div>
              <div style={{ display: 'grid', gap: 8, fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.6 }}>
                <div><strong style={{ color: '#E5484D' }}>Broken</strong> — remove the URL from the sitemap or redirect it to a live page.</div>
                <div><strong style={{ color: '#f59e0b' }}>Blocked</strong> — remove the noindex tag or allow the path in robots.txt; otherwise remove the URL from the sitemap.</div>
                <div><strong style={{ color: '#D9A400' }}>Redirected</strong> — replace the sitemap entry with the final destination address.</div>
                <div><strong style={{ color: '#7c3aed' }}>Non-canonical</strong> — list the canonical address in the sitemap instead.</div>
                <div><strong style={{ color: '#94a3b8' }}>Slow</strong> — speed up the page (compress images, enable caching, faster hosting) so crawlers don't skip it.</div>
              </div>
            </div>
            <p className="text-center" style={{ marginTop: 16, fontSize: 12, color: 'var(--text-faint)' }}>
              Want every page scored in depth? <Link to="/audit" style={{ color: '#00A868', fontWeight: 800 }}>Run the full site audit →</Link>
            </p>
          </div>
        </section>
      )}

      {/* What the audit analyzes */}
      <section className="px-4 sm:px-6 py-14">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-center font-black mb-3" style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)', letterSpacing: '-0.03em', color: 'var(--text)' }}>
            What Does Serpely Sitemap Checker Analyze?
          </h2>
          <p className="text-center mb-8" style={{ color: 'var(--text-soft)', fontSize: 15 }}>
            Six deep checks against XML sitemap standards and Google Search requirements.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '🔍', title: 'Sitemap Discovery', desc: 'Automatically discover your sitemap through /sitemap.xml, robots.txt, and common sitemap locations.' },
              { icon: '🗂️', title: 'Sitemap Structure', desc: 'Identify whether your sitemap uses a URL set or sitemap index and check its overall structure.' },
              { icon: '✅', title: 'XML Validation', desc: 'Detect malformed XML, invalid elements, and namespace configuration issues.' },
              { icon: '🔢', title: 'URL Limit Validation', desc: 'Check sitemap URL counts against the standard limit of 50,000 URLs per sitemap file.' },
              { icon: '🔗', title: 'Child Sitemap & URL Availability', desc: 'Check child sitemap accessibility and sample URLs to identify potential availability issues.' },
              { icon: '🏷️', title: 'URL & Metadata Checks', desc: 'Review lastmod values, HTTP/HTTPS consistency, external domains, and URL formatting.' },
            ].map(c => (
              <div key={c.title} style={{ ...card, padding: 24 }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{c.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>{c.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.65 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 sm:px-6 py-14" style={{ background: 'var(--bg-subtle)' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-center font-black mb-3" style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)', letterSpacing: '-0.03em', color: 'var(--text)' }}>
            How the Sitemap Audit Works
          </h2>
          <p className="text-center mb-10" style={{ color: 'var(--text-soft)', fontSize: 15 }}>
            Check your sitemap in four simple steps.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { n: '1', title: 'Enter Your Website URL', desc: 'Enter your website address, and Serpely will attempt to discover your XML sitemap automatically.' },
              { n: '2', title: 'Analyze Your Sitemap', desc: 'Serpely checks XML structure, sitemap indexes, child sitemaps, URL limits, and sampled URL availability.' },
              { n: '3', title: 'Review Your Results', desc: 'Get a detailed report showing sitemap status, discovered URLs, detected errors, severity levels, and recommended fixes.' },
              { n: '4', title: 'Fix & Recheck', desc: 'Follow the recommendations to correct sitemap issues. Run another check to verify the changes and confirm that the sitemap is accessible.' },
            ].map(s => (
              <div key={s.n} style={{ ...card, padding: 24, textAlign: 'center' }}>
                <div className="mx-auto mb-4 flex items-center justify-center rounded-full text-lg font-black"
                  style={{ width: 44, height: 44, background: '#00C27A', color: '#fff' }}>{s.n}</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-4 sm:px-6 py-20">
        <div className="max-w-5xl mx-auto text-center" style={{ ...card, borderRadius: 20, padding: '72px 48px', position: 'relative', overflow: 'hidden' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(0,194,122,0.14) 0%, rgba(14,165,233,0.07) 45%, transparent 75%)' }} />
          <div className="relative z-10">
            <h2 className="font-display font-black mb-4" style={{ fontSize: 'clamp(2rem,5vw,3.2rem)', letterSpacing: '-0.03em', color: 'var(--text)' }}>
              Make Your Sitemap Search-Engine Ready
            </h2>
            <p className="mb-8 mx-auto" style={{ color: 'var(--text-soft)', fontSize: 17, lineHeight: 1.7, maxWidth: 640 }}>
              Find sitemap errors, improve URL discovery, and keep your XML sitemap technically healthy with Serpely.
            </p>
            <div className="flex flex-wrap justify-center" style={{ gap: 12 }}>
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="btn-accent-s inline-flex" style={{ padding: '14px 36px', fontSize: 16, cursor: 'pointer' }}>
                Check Sitemap Now
              </button>
              <Link to="/audit" className="btn-secondary-s inline-flex" style={{ padding: '14px 36px', fontSize: 16, textDecoration: 'none' }}>
                Explore Technical SEO
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
