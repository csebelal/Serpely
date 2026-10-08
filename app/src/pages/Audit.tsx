import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useSEOMeta } from '@/hooks/useSEOMeta';
import { injectSchema, removeSchema } from '@/lib/schema';
import { runPublicAudit, getPublicAudit, type PublicAuditReport, type PublicAuditIssue } from '@/lib/api';

const CATS = [
  { key: 'Technical SEO', short: 'Technical SEO', color: '#2563eb' },
  { key: 'AI Visibility / GEO', short: 'AI Visibility', color: '#7c3aed' },
  { key: 'Core Web Vitals', short: 'Speed', color: '#d97706' },
  { key: 'Security & HTTPS', short: 'Security', color: '#00875a' },
  { key: 'Mobile', short: 'Mobile', color: '#0e9f8a' },
];

const DRIVERS = [
  { name: 'Schema coverage', codes: ['faq-schema', 'org-schema', 'article-schema', 'breadcrumb-schema', 'speakable'] },
  { name: 'Crawl access', codes: ['robots-ai-allow', 'robots-indexable', 'sitemap', 'canonical', 'https'] },
  { name: 'Extractability', codes: ['title-present', 'meta-description', 'h1-one', 'og-tags', 'twitter-card', 'faq-html', 'img-alt'] },
];

function scoreColor(s: number) {
  if (s >= 85) return '#00C27A';
  if (s >= 65) return '#D9A400';
  return '#E5484D';
}

function sevColor(s: string) {
  if (s === 'critical') return '#E5484D';
  if (s === 'high') return '#f59e0b';
  if (s === 'medium') return '#D9A400';
  return '#94a3b8';
}

function calcScores(issues: PublicAuditIssue[], fixed: string[]) {
  const pass = (i: PublicAuditIssue) => i.passed || fixed.includes(i.code);
  const scores: Record<string, number> = {};
  for (const c of CATS) {
    const list = issues.filter(i => i.category === c.key);
    const lost = list.filter(i => !pass(i)).reduce((s, i) => s + i.impact, 0);
    scores[c.key] = Math.max(0, 100 - lost * 2);
  }
  const overall = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / CATS.length);
  return { scores, overall };
}

function Gauge({ value, suffix }: { value: number; suffix?: string }) {
  const r = 70;
  const circ = Math.PI * r;
  const off = circ * (1 - Math.min(100, Math.max(0, value)) / 100);
  const color = scoreColor(value);
  return (
    <svg viewBox="0 0 180 104" style={{ width: '100%', maxWidth: 230, margin: '0 auto', display: 'block' }}>
      <path d="M12 92 A68 68 0 0 1 168 92" fill="none" stroke="#e8e8e8" strokeWidth="14" strokeLinecap="round" />
      <path d="M12 92 A68 68 0 0 1 168 92" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x="90" y="78" textAnchor="middle" style={{ fontSize: 34, fontWeight: 900, fill: 'var(--text)' }}>
        {value}{suffix ? <tspan style={{ fontSize: 14 }}>{suffix}</tspan> : null}
      </text>
    </svg>
  );
}

const card: React.CSSProperties = { background: 'var(--card-bg)', border: '1px solid hsl(var(--border))', borderRadius: 16 };

const navRow = (active: boolean): React.CSSProperties => ({
  display: 'flex', width: '100%', alignItems: 'center', gap: 8, fontSize: 13,
  fontWeight: active ? 800 : 500, padding: '6px 8px', borderRadius: 8,
  border: 'none', cursor: 'pointer', background: active ? 'var(--bg)' : 'transparent', color: 'var(--text)',
});

const pill = (color: string): React.CSSProperties => ({
  fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999,
  background: `${color}1a`, color,
});

const fixBtn: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, padding: '6px 12px', borderRadius: 999,
  border: 'none', cursor: 'pointer', background: 'var(--text)', color: 'var(--bg)',
};

interface PsiFieldMeta { overall?: string; lcpS?: number; cls?: number; inpMs?: number; ttfbMs?: number }

interface PsiMeta {
  score: number; lcpS?: number; cls?: number; inpMs?: number;
  scores?: { performance: number; accessibility: number; bestPractices: number; seo: number };
  field?: PsiFieldMeta | null;
  origin?: PsiFieldMeta | null;
}

function parsePsiMeta(meta?: Record<string, string>): PsiMeta | null {
  try {
    const raw = meta?.psi;
    if (!raw) return null;
    return JSON.parse(raw) as PsiMeta;
  } catch { return null; }
}

function verdictColor(v?: string) {
  if (v === 'FAST') return '#00C27A';
  if (v === 'AVERAGE') return '#D9A400';
  if (v === 'SLOW') return '#E5484D';
  return 'var(--text-faint)';
}

function scoreVerdict(s: number) {
  if (s >= 90) return { t: 'Excellent', c: '#00C27A' };
  if (s >= 70) return { t: 'Good', c: '#00A868' };
  if (s >= 50) return { t: 'Needs work', c: '#D9A400' };
  return { t: 'Poor', c: '#E5484D' };
}

const STAGES = ['Fetching page', 'Running checks', 'Google lab data', 'Scoring'];

export function Audit() {
  useSEOMeta('audit', {
    title: 'Free SEO & AI Visibility Audit — Serpely',
    description: 'Enter any website for an instant Technical SEO, Security, Mobile and AI Visibility audit with a prioritized fix plan.',
  });
  const { id } = useParams<{ id: string }>();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<PublicAuditReport | null>(null);
  const [fixed, setFixed] = useState<string[]>([]);
  const [planned, setPlanned] = useState<string[]>([]);
  const [activeCat, setActiveCat] = useState('All');
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'checks' | 'issues'>('dashboard');
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('All');
  const [effortFilter, setEffortFilter] = useState('All');
  const [elapsed, setElapsed] = useState(0);
  const resultsRef = useRef<HTMLElement>(null);

  // Elapsed timer while an audit runs — drives the staged progress display.
  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const t0 = Date.now();
    const t = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(t);
  }, [loading]);

  const resetFilters = () => { setSearch(''); setSevFilter('All'); setEffortFilter('All'); setActiveCat('All'); };

  useEffect(() => {
    injectSchema('schema-audit', {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Free SEO & AI Visibility Audit — Serpely',
      url: 'https://serpely.com/audit',
      description: 'Instant audit across Technical SEO, Core Web Vitals, Security, Mobile and AI Visibility with a prioritized fix plan.',
    });
    return () => removeSchema('schema-audit');
  }, []);

  const loadReport = (data: PublicAuditReport) => {
    setReport(data);
    setFixed([]);
    setPlanned([]);
    setActiveCat('All');
    setView('dashboard');
    setSearch('');
    setSevFilter('All');
    setEffortFilter('All');
    setShowAll(false);
    setExpanded(null);
    // Audit done → bring the dashboard into view automatically.
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getPublicAudit(id)
      .then(r => loadReport(r.data))
      .catch(() => setError('Report not found or expired (free reports expire after 30 days).'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const runAudit = async (target: string) => {
    setError('');
    if (!target.trim()) { setError('Enter your website, e.g. example.com'); return; }
    setLoading(true);
    setReport(null);
    try {
      try {
        await getPublicAudit('ping');
      } catch (pingErr) {
        const s = (pingErr as { response?: { status?: number } })?.response?.status;
        setError(
          s
            ? `Backend API answered ${s} on /ping — the new audit route may not be loaded. Restart backend (\`npm run dev\` in server/) so it picks up the latest code, then retry.`
            : 'Backend API not reachable (ping failed). Start exactly ONE backend: `npm run dev` in server/, wait for "Server running on port 4000", leave that window open, then retry.',
        );
        setLoading(false);
        return;
      }
      const r = await runPublicAudit(target.trim());
      const full = await getPublicAudit(r.data.id);
      loadReport(full.data);
      window.history.replaceState(null, '', `/audit/${r.data.id}`);
    } catch (err: unknown) {
      console.error('[audit] run failed:', err);
      const axiosErr = err as { response?: { status?: number; data?: { error?: string } }; request?: unknown };
      const serverMsg = axiosErr?.response?.data?.error;
      const status = axiosErr?.response?.status;
      if (serverMsg) {
        setError(status ? `Error ${status}: ${serverMsg}` : serverMsg);
      } else if (axiosErr?.response) {
        setError(`Server returned ${status} with no error body — is the backend running the new /api/public-audit route? Check server console.`);
      } else if (axiosErr?.request) {
        setError('No response from API — backend not reachable. Keep `npm run dev` running in server/ (port 4000), restart the frontend (`npm run dev` in app/) so the /api proxy loads, then retry.');
      } else {
        setError('Audit failed. Check the URL and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const submit = (e: React.FormEvent) => { e.preventDefault(); runAudit(url); };
  const reAudit = () => { if (report) { setUrl(report.normalizedUrl); runAudit(report.normalizedUrl); } };

  const markFixed = (code: string) => {
    setFixed(f => (f.includes(code) ? f : [...f, code]));
    setPlanned(p => p.filter(c => c !== code));
  };
  const undoFixed = (code: string) => setFixed(f => f.filter(c => c !== code));
  const planQuickWins = () => {
    if (!report) return;
    const quicks = report.issues.filter(i => !i.passed && !fixed.includes(i.code) && i.effort === 'quick').map(i => i.code);
    setPlanned(quicks);
  };

  const d = useMemo(() => {
    if (!report) return null;
    const pass = (i: PublicAuditIssue) => i.passed || fixed.includes(i.code);
    const failing = report.issues.filter(i => !pass(i));
    const { scores, overall } = calcScores(report.issues, fixed);
    const plannedImpact = failing.filter(i => planned.includes(i.code)).reduce((s, i) => s + i.impact, 0);
    const allImpact = failing.reduce((s, i) => s + i.impact, 0);
    const estPlan = Math.min(100, overall + Math.round(plannedImpact * 0.9));
    const estAll = Math.min(100, overall + Math.round(allImpact * 0.9));
    const critical = failing.filter(i => i.severity === 'critical').length;
    const warnings = failing.filter(i => i.severity === 'high' || i.severity === 'medium').length;
    const geo = scores['AI Visibility / GEO'] ?? 0;
    const healthCats = CATS.filter(c => c.key !== 'AI Visibility / GEO');
    const health = Math.round(healthCats.reduce((s, c) => s + (scores[c.key] ?? 0), 0) / healthCats.length);
    const catStats = CATS.map(c => {
      const list = report.issues.filter(i => i.category === c.key);
      const open = list.filter(i => !pass(i));
      return {
        ...c,
        total: list.length,
        passed: list.length - open.length,
        open: open.length,
        pts: open.reduce((s, i) => s + i.impact, 0),
      };
    });
    const ordered = [...failing].sort((a, b) =>
      a.effort === b.effort ? b.impact - a.impact : a.effort === 'quick' ? -1 : 1,
    );
    return { failing, scores, overall, estPlan, estAll, critical, warnings, geo, health, catStats, ordered,
      passedCount: report.issues.length - failing.length, totalCount: report.issues.length };
  }, [report, fixed, planned]);

  const chartData = useMemo(() => {
    if (!d) return [];
    let q = d.overall;
    let a = d.overall;
    const pts: { step: string; quick: number; all: number }[] = [{ step: 'Now', quick: q, all: a }];
    d.ordered.forEach((it, idx) => {
      const gain = Math.round(it.impact * 0.9);
      a = Math.min(100, a + gain);
      if (it.effort === 'quick') q = Math.min(100, q + gain);
      pts.push({ step: `${idx + 1}`, quick: q, all: a });
    });
    return pts;
  }, [d]);

  const visibleFixes = useMemo(() => {
    if (!d) return [];
    const list = activeCat === 'All' ? d.ordered : d.ordered.filter(i => i.category === activeCat);
    return showAll ? list : list.slice(0, 5);
  }, [d, activeCat, showAll]);

  const fixedItems = useMemo(() => {
    if (!report) return [];
    return report.issues.filter(i => fixed.includes(i.code));
  }, [report, fixed]);

  const domain = report ? report.normalizedUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Hero */}
      <section className="pt-32 pb-12 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,194,122,0.12) 0%, transparent 70%)' }} />
        <div className="max-w-3xl mx-auto relative z-10">
          <span className="pill-s mb-5 inline-block">Free instant audit</span>
          <h1 className="font-display font-black mb-5" style={{ fontSize: 'clamp(2.4rem,6vw,4rem)', letterSpacing: '-0.05em', lineHeight: 1.02 }}>
            Get discovered wherever <span className="text-gradient">people search</span>
          </h1>
          <p className="text-lg mb-8" style={{ color: 'var(--text-soft)' }}>
            One platform to grow, track, and measure brand visibility across virtually every digital channel.
          </p>
          <form onSubmit={submit} style={{ display: 'flex', gap: 8, maxWidth: 560, margin: '0 auto', background: 'var(--card-bg)', border: '1px solid hsl(var(--border))', borderRadius: 999, padding: 6 }}>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="Enter your website"
              inputMode="url"
              disabled={loading}
              aria-label="Website URL to audit"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '12px 20px', fontSize: 15, color: 'var(--text)', opacity: loading ? 0.6 : 1 }}
            />
            <button type="submit" disabled={loading} className="btn-accent-s" style={{ borderRadius: 999, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Auditing…' : 'Get audit'}
            </button>
          </form>
          {loading && (
            <div style={{ ...card, maxWidth: 560, margin: '16px auto 0', padding: '14px 18px', textAlign: 'left' }} role="status" aria-live="polite">
              <div className="flex items-center" style={{ gap: 10, marginBottom: 10 }}>
                <span className="w-4 h-4 rounded-full border-2 border-current animate-spin shrink-0" style={{ borderTopColor: 'transparent', color: '#00A868' }} />
                <strong style={{ fontSize: 13 }}>Auditing… {elapsed}s</strong>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>typically 30–60s first run</span>
              </div>
              <div className="flex" style={{ gap: 6 }}>
                {STAGES.map((s, i) => {
                  const activeIdx = elapsed < 8 ? 0 : elapsed < 20 ? 1 : elapsed < 45 ? 2 : 3;
                  const done = i < activeIdx;
                  const active = i === activeIdx;
                  return (
                    <div key={s} style={{ flex: 1, fontSize: 10, fontWeight: 700, color: active ? 'var(--text)' : done ? '#00A868' : 'var(--text-faint)' }}>
                      <div style={{ height: 4, borderRadius: 999, marginBottom: 4, background: active || done ? '#00C27A' : 'hsl(var(--border))', opacity: done ? 0.5 : 1 }} />
                      {done ? '✓ ' : ''}{s}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 8 }}>Please keep this tab open — Google lab data takes a moment.</div>
            </div>
          )}
          {error && <p style={{ color: '#E5484D', marginTop: 12, fontSize: 14 }}>{error}</p>}
          <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-faint)' }}>Free audit · no credit card · results in ~30 seconds</p>
        </div>
      </section>

      {report && d && (
        <section ref={resultsRef} className="px-4 sm:px-6 pb-10" style={{ scrollMarginTop: 90 }}>
          <div className="max-w-7xl mx-auto">
            {/* Utility strip */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span style={{ ...card, padding: '8px 14px', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#00C27A' }} />
                {domain}
              </span>
              <span style={{ flex: 1 }} />
              <button onClick={planQuickWins} style={{ ...card, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✦ Plan quick wins</button>
              <button onClick={reAudit} disabled={loading} style={{ ...card, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>↻ Re-audit</button>
              <button onClick={() => window.print()} style={{ ...card, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>⤓ PDF</button>
              <Link to="/pricing" className="btn-accent-s" style={{ padding: '8px 14px', fontSize: 12 }}>+ Upgrade</Link>
            </div>

            {/* Passed banner */}
            <div className="flex flex-wrap items-center gap-2 mb-4" style={{ ...card, padding: '10px 16px', fontSize: 12, background: 'rgba(0,194,122,0.07)', borderColor: 'rgba(0,194,122,0.3)' }}>
              <span>✓ {d.passedCount} checks passed · {d.failing.length} need attention</span>
              <span style={{ flex: 1 }} />
              <Link to="/register" style={{ fontWeight: 800, color: '#00A868', textDecoration: 'none' }}>Track daily →</Link>
            </div>

            <div className="flex gap-4 items-start">
              {/* Sidebar */}
              <aside className="hidden lg:block shrink-0" style={{ width: 200 }}>
                <div style={{ ...card, padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', letterSpacing: '0.08em', marginBottom: 8 }}>ALL SITES</div>
                  <button onClick={() => setView('dashboard')} style={navRow(view === 'dashboard')}>
                    <span style={{ flex: 1, textAlign: 'left' }}>◔ Dashboard</span>
                  </button>
                  <button onClick={() => setView('checks')} style={navRow(view === 'checks')}>
                    <span style={{ flex: 1, textAlign: 'left' }}>All checks</span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{d.passedCount} of {d.totalCount}</span>
                  </button>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', letterSpacing: '0.08em', margin: '12px 0 4px' }}>CATEGORIES</div>
                  <button onClick={() => { setActiveCat('All'); setView('issues'); }} style={navRow(view === 'issues' && activeCat === 'All')}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--text)' }} />
                    <span style={{ flex: 1, textAlign: 'left' }}>All issues</span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{d.failing.length}</span>
                  </button>
                  {d.catStats.map(c => (
                    <button key={c.key} onClick={() => { setActiveCat(c.key); setView('issues'); }} style={navRow(view === 'issues' && activeCat === c.key)}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: c.color }} />
                      <span style={{ flex: 1, textAlign: 'left' }}>{c.short}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{c.open}</span>
                    </button>
                  ))}
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', letterSpacing: '0.08em', margin: '12px 0 4px' }}>TOOLS</div>
                  <Link to="/product-tour" style={{ display: 'block', fontSize: 13, padding: '6px 8px', color: 'var(--text-soft)', textDecoration: 'none' }}>◷ Score Tracking</Link>
                  <Link to="/compare" style={{ display: 'block', fontSize: 13, padding: '6px 8px', color: 'var(--text-soft)', textDecoration: 'none' }}>⇄ Compare</Link>
                </div>
              </aside>

              {/* Main */}
              <div className="flex-1 min-w-0">
                {view === 'dashboard' && (
                <>
                {/* Mobile category chips */}
                <div className="lg:hidden flex gap-2 overflow-x-auto mb-3" style={{ paddingBottom: 4 }}>
                  {['All', ...CATS.map(c => c.key)].map(k => (
                    <button key={k} onClick={() => setActiveCat(k)}
                      style={{ whiteSpace: 'nowrap', padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: '1px solid hsl(var(--border))', background: activeCat === k ? 'var(--text)' : 'var(--card-bg)', color: activeCat === k ? 'var(--bg)' : 'var(--text-soft)', cursor: 'pointer' }}>
                      {k === 'All' ? 'All issues' : CATS.find(c => c.key === k)?.short}
                    </button>
                  ))}
                </div>

                {/* Top gauges */}
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div style={{ ...card, padding: 20, textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>AI Visibility Index</div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 8 }}>score {d.geo} · on-page signals</div>
                    <Gauge value={d.geo} />
                    <div style={{ fontSize: 11, fontWeight: 800, color: scoreVerdict(d.geo).c, marginTop: -4 }}>{scoreVerdict(d.geo).t}</div>
                    <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-faint)', fontWeight: 700 }}>INDEX NOW</div>
                    <div className="flex" style={{ marginTop: 12, borderTop: '1px solid hsl(var(--border))', paddingTop: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#00A868' }}>{d.estPlan}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 700 }}>EST. IF PLAN SHIPS</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 20, fontWeight: 900 }}>{d.estAll}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 700 }}>EST. IF ALL FIXED</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ ...card, padding: 20, textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>Site Health</div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 8 }}>technical crawl health</div>
                    <Gauge value={d.health} suffix="%" />
                    <div style={{ fontSize: 11, fontWeight: 800, color: scoreVerdict(d.health).c, marginTop: -4 }}>{scoreVerdict(d.health).t}</div>
                    <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-faint)', fontWeight: 700 }}>FIRST AUDIT</div>
                    {(() => {
                      try {
                        const p = report.meta?.psi ? JSON.parse(report.meta.psi) as { score: number; lcpS?: number; cls?: number; inpMs?: number } : null;
                        if (!p) return <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 6 }}>Lab unavailable — heuristic estimate</div>;
                        return (
                          <div style={{ fontSize: 10, color: 'var(--text-soft)', marginTop: 6, fontWeight: 600 }}>
                            Lab (PSI mobile) · {p.score}{p.lcpS !== undefined ? ` · LCP ${p.lcpS}s` : ''}{p.cls !== undefined ? ` · CLS ${p.cls}` : ''}{p.inpMs !== undefined ? ` · INP ${p.inpMs}ms` : ''}
                          </div>
                        );
                      } catch { return null; }
                    })()}
                    <div className="flex" style={{ marginTop: 12, borderTop: '1px solid hsl(var(--border))', paddingTop: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#00A868' }}>{d.health}%</div>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 700 }}>YOUR SITE</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: d.critical ? '#E5484D' : 'var(--text)' }}>{d.critical}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 700 }}>CRITICAL</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 20, fontWeight: 900 }}>{d.warnings}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 700 }}>WARNINGS</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ ...card, padding: 20 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>AI score breakdown</div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 12 }}>what drives your visibility score</div>
                    {DRIVERS.map(dr => {
                      const total = dr.codes.length;
                      const ok = dr.codes.filter(code => {
                        const it = report.issues.find(i => i.code === code);
                        return it && (it.passed || fixed.includes(code));
                      }).length;
                      const pct = Math.round((ok / total) * 100);
                      return (
                        <div key={dr.name} style={{ marginBottom: 12 }}>
                          <div className="flex" style={{ fontSize: 12, marginBottom: 4 }}>
                            <span style={{ fontWeight: 700 }}>{dr.name}</span>
                            <span style={{ flex: 1 }} />
                            <span style={{ color: 'var(--text-faint)' }}>{ok}/{total} · {pct}%</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 999, background: 'hsl(var(--border))' }}>
                            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: '#7c3aed', transition: 'width 0.5s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>Computed live from your {d.totalCount} checks</div>
                  </div>
                </div>

                {/* Category cards */}
                <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-4">
                  {d.catStats.map(c => (
                    <button key={c.key} onClick={() => setActiveCat(activeCat === c.key ? 'All' : c.key)}
                      style={{ ...card, padding: 16, textAlign: 'left', cursor: 'pointer', outline: activeCat === c.key ? '2px solid #00C27A' : 'none' }}>
                      <div className="flex items-center" style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: c.color, marginRight: 6 }} />
                        {c.short}
                        <span style={{ flex: 1 }} />
                        <span style={{ color: 'var(--text-faint)' }}>→</span>
                      </div>
                      <div className="flex items-end">
                        <span style={{ fontSize: 30, fontWeight: 900 }}>{c.open}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 4, marginBottom: 5 }}>open</span>
                        <span style={{ flex: 1 }} />
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#00A868' }}>+{c.pts} pts</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 999, background: 'hsl(var(--border))', marginTop: 8 }}>
                        <div style={{ width: `${c.total ? Math.round((c.passed / c.total) * 100) : 100}%`, height: '100%', borderRadius: 999, background: c.color, transition: 'width 0.5s ease' }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 6 }}>{c.passed} of {c.total} checks</div>
                    </button>
                  ))}
                </div>

                {/* Lighthouse scores + real-user field data */}
                {(() => {
                  const pm = parsePsiMeta(report.meta);
                  if (!pm?.scores) return null;
                  const chips = [
                    { name: 'Performance', v: pm.scores.performance },
                    { name: 'Accessibility', v: pm.scores.accessibility },
                    { name: 'Best Practices', v: pm.scores.bestPractices },
                    { name: 'SEO', v: pm.scores.seo },
                  ];
                  const f = pm.field ?? undefined;
                  const rows = [
                    { name: 'LCP', lab: pm.lcpS !== undefined ? `${pm.lcpS}s` : '—', field: f?.lcpS !== undefined ? `${f.lcpS}s` : '—' },
                    { name: 'CLS', lab: pm.cls !== undefined ? `${pm.cls}` : '—', field: f?.cls !== undefined ? `${f.cls}` : '—' },
                    { name: 'INP', lab: pm.inpMs !== undefined ? `${pm.inpMs}ms` : '—', field: f?.inpMs !== undefined ? `${f.inpMs}ms` : '—' },
                    { name: 'TTFB', lab: '—', field: f?.ttfbMs !== undefined ? `${f.ttfbMs}ms` : '—' },
                  ];
                  return (
                    <div style={{ ...card, padding: 20, marginBottom: 16 }}>
                      <div className="flex flex-wrap items-center" style={{ gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, fontSize: 14 }}>Google Lighthouse + field data</span>
                        <span style={{ flex: 1 }} />
                        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>PSI mobile · lab + Chrome real-user (CrUX)</span>
                      </div>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3" style={{ marginTop: 12 }}>
                        {chips.map(c => (
                          <div key={c.name} style={{ border: '1px solid hsl(var(--border))', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                            <div style={{ fontSize: 26, fontWeight: 900, color: scoreColor(c.v) }}>{c.v}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 700 }}>{c.name}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 14, borderTop: '1px solid hsl(var(--border))', paddingTop: 12 }}>
                        <div className="flex items-center" style={{ marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 800 }}>Real-user field data</span>
                          <span style={{ flex: 1 }} />
                          {f?.overall
                            ? <span style={{ fontSize: 11, fontWeight: 800, color: verdictColor(f.overall) }}>● {f.overall}</span>
                            : <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Not enough traffic — lab only</span>}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {rows.map(r => (
                            <div key={r.name} style={{ fontSize: 12 }}>
                              <div style={{ fontWeight: 800 }}>{r.name}</div>
                              <div style={{ color: 'var(--text-soft)' }}>Lab <strong style={{ color: 'var(--text)' }}>{r.lab}</strong></div>
                              <div style={{ color: 'var(--text-soft)' }}>Field <strong style={{ color: 'var(--text)' }}>{r.field}</strong></div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ marginTop: 14, borderTop: '1px solid hsl(var(--border))', paddingTop: 12 }}>
                        <div className="flex items-center" style={{ marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 800 }}>Site-wide field data (origin)</span>
                          <span style={{ flex: 1 }} />
                          {pm.origin?.overall
                            ? <span style={{ fontSize: 11, fontWeight: 800, color: verdictColor(pm.origin.overall) }}>● {pm.origin.overall}</span>
                            : <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>No origin data</span>}
                        </div>
                        {pm.origin ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ fontSize: 12 }}>
                            <div><span style={{ fontWeight: 800 }}>LCP </span><strong>{pm.origin.lcpS !== undefined ? `${pm.origin.lcpS}s` : '—'}</strong></div>
                            <div><span style={{ fontWeight: 800 }}>CLS </span><strong>{pm.origin.cls !== undefined ? `${pm.origin.cls}` : '—'}</strong></div>
                            <div><span style={{ fontWeight: 800 }}>INP </span><strong>{pm.origin.inpMs !== undefined ? `${pm.origin.inpMs}ms` : '—'}</strong></div>
                            <div><span style={{ fontWeight: 800 }}>TTFB </span><strong>{pm.origin.ttfbMs !== undefined ? `${pm.origin.ttfbMs}ms` : '—'}</strong></div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Whole-domain real-user data appears once the site has enough Chrome traffic.</div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Start here — single biggest next action */}
                {(() => {
                  const t = d.ordered[0];
                  if (!t) return null;
                  return (
                    <div style={{ ...card, padding: '14px 18px', marginBottom: 16, borderColor: 'rgba(0,194,122,0.4)', background: 'rgba(0,194,122,0.06)' }}>
                      <div className="flex flex-wrap items-center" style={{ gap: 10 }}>
                        <span className="w-2 h-2 rounded-full inline-block animate-pulse shrink-0" style={{ background: '#00C27A' }} />
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: '#00A868' }}>START HERE · BIGGEST QUICK IMPACT</div>
                          <div style={{ fontWeight: 800, fontSize: 14 }}>{t.title} <span style={{ fontSize: 12, color: '#00A868' }}>+{t.impact} pts{t.effort === 'quick' ? ' · Quick win' : ''}</span></div>
                        </div>
                        <button onClick={() => { setShowAll(true); setExpanded(t.code); }} style={{ fontSize: 12, fontWeight: 700, background: 'none', border: '1px solid hsl(var(--border))', borderRadius: 999, padding: '7px 14px', cursor: 'pointer', color: 'var(--text)' }} aria-label={`Show details for ${t.title}`}>Details</button>
                        <button onClick={() => markFixed(t.code)} style={fixBtn} aria-label={`Mark fixed: ${t.title}`}>Fix now ⚡</button>
                      </div>
                    </div>
                  );
                })()}

                {/* Fixes + impact */}
                <div className="grid lg:grid-cols-2 gap-4">
                  <div style={{ ...card, padding: 20 }}>
                    <div className="flex items-center" style={{ marginBottom: 4 }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>Top priority fixes</div>
                      <span style={{ flex: 1 }} />
                      <button onClick={() => setShowAll(s => !s)} style={{ fontSize: 12, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>
                        {showAll ? 'Show less' : 'View all →'}
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 12 }}>
                      ranked by points per unit of effort{activeCat !== 'All' ? ` · filtered: ${activeCat}` : ''}
                    </div>
                    {visibleFixes.length === 0 && <p style={{ fontSize: 13, color: '#00A868', fontWeight: 700 }}>✓ All clear{activeCat !== 'All' ? ' in this category' : ''} — nice work.</p>}
                    {visibleFixes.map(i => (
                      <div key={i.code} style={{ padding: '10px 0', borderTop: '1px solid hsl(var(--border))' }}>
                        <div className="flex items-center" style={{ gap: 10 }}>
                          <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: sevColor(i.severity) }} />
                          <button onClick={() => setExpanded(expanded === i.code ? null : i.code)}
                            style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', padding: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{i.title}</div>
                            <div style={{ fontSize: 11, color: i.effort === 'quick' ? '#00A868' : 'var(--text-faint)', fontWeight: 600 }}>
                              ★ {CATS.find(c => c.key === i.category)?.short ?? i.category}{i.effort === 'quick' ? ' · Quick win' : ''}{planned.includes(i.code) ? ' · In plan' : ''}
                            </div>
                          </button>
                          <span style={{ fontSize: 11, fontWeight: 800 }}>+{i.impact} pts</span>
                          <button onClick={() => markFixed(i.code)} aria-label={`Mark fixed: ${i.title}`}
                            style={{ fontSize: 11, fontWeight: 800, padding: '6px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--text)', color: 'var(--bg)' }}>
                            Fix ⚡
                          </button>
                        </div>
                        {expanded === i.code && (
                          <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 8, paddingLeft: 18, lineHeight: 1.6 }}>
                            <div><strong>Found:</strong> {i.evidence}</div>
                            <div><strong>Fix:</strong> {i.fix}</div>
                          </div>
                        )}
                      </div>
                    ))}
                    {fixedItems.length > 0 && (
                      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-faint)' }}>
                        ✓ Fixed this session ({fixedItems.length}): {fixedItems.map(i => i.title).join(' · ')}{' '}
                        <button onClick={() => setFixed([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', textDecoration: 'underline', fontSize: 12 }}>reset</button>
                        {fixedItems.slice(0, 5).map(i => (
                          <button key={i.code} onClick={() => undoFixed(i.code)} style={{ marginLeft: 6, fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', textDecoration: 'underline' }}>undo {i.code}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ ...card, padding: 20 }}>
                    <div className="flex items-center">
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>Fix impact</div>
                        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>projected score by effort track</div>
                      </div>
                      <span style={{ flex: 1 }} />
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#00A868' }}>{fixed.length}/{d.failing.length + fixed.length} fixed</span>
                    </div>
                    <div style={{ height: 260, marginTop: 8 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="step" tick={{ fontSize: 10 }} interval="preserveStartEnd" label={{ value: 'fixes applied →', position: 'insideBottomRight', fontSize: 10 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="quick" name="Quick wins" stroke="#00C27A" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="all" name="All fixed" stroke="#E5484D" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                </>)}

                {view === 'checks' && (
                <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>All checks</div>
                  <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                    <span style={{ color: '#00A868', fontWeight: 700 }}>{d.passedCount} passing</span>
                    {' · '}
                    <span style={{ color: '#E5484D', fontWeight: 700 }}>{d.failing.length} need attention</span>
                    {' — every check this audit ran, grouped by category.'}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {d.catStats.map(c => {
                    const list = (report?.issues ?? []).filter(i => i.category === c.key);
                    return (
                      <div key={c.key} style={{ ...card, padding: 16 }}>
                        <div className="flex items-center" style={{ marginBottom: 4 }}>
                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: c.color, marginRight: 6 }} />
                          <span style={{ fontWeight: 800, fontSize: 13 }}>{c.short}</span>
                          <span style={{ flex: 1 }} />
                          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{c.passed} of {c.total}</span>
                        </div>
                        {list.map(i => {
                          const ok = i.passed || fixed.includes(i.code);
                          const isOpen = expanded === i.code;
                          return (
                            <div key={i.code} style={{ padding: '10px 8px', borderTop: '1px solid hsl(var(--border))', borderRadius: 8, background: ok ? 'transparent' : 'rgba(229,72,77,0.06)' }}>
                              <button onClick={() => setExpanded(isOpen ? null : i.code)}
                                style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', padding: 0, textAlign: 'left' }}>
                                <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{ok ? '✓ ' : ''}{i.title}</span>
                                <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: ok ? 'rgba(0,194,122,0.12)' : 'rgba(229,72,77,0.12)', color: ok ? '#00A868' : '#E5484D' }}>
                                  {ok ? '✓ pass' : i.severity}
                                </span>
                              </button>
                              {isOpen && (
                                <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 6, lineHeight: 1.6 }}>
                                  <div><strong>Found:</strong> {i.evidence || '—'}</div>
                                  {!ok && <div><strong>Fix:</strong> {i.fix}</div>}
                                  {!ok && (
                                    <button onClick={() => markFixed(i.code)} style={{ ...fixBtn, marginTop: 8 }} aria-label={`Mark fixed: ${i.title}`}>Fix ⚡ · +{i.impact} pts</button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
                </>)}

                {view === 'issues' && (
                <>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search issues…"
                    style={{ ...card, padding: '8px 14px', fontSize: 12, outline: 'none', minWidth: 170, color: 'var(--text)' }} />
                  <select value={sevFilter} onChange={e => setSevFilter(e.target.value)}
                    style={{ ...card, padding: '8px 12px', fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>
                    {['All', 'critical', 'high', 'medium', 'low'].map(s => <option key={s} value={s}>{s === 'All' ? 'All severity' : s}</option>)}
                  </select>
                  <select value={effortFilter} onChange={e => setEffortFilter(e.target.value)}
                    style={{ ...card, padding: '8px 12px', fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>
                    <option value="All">All effort</option>
                    <option value="quick">Quick win</option>
                    <option value="normal">Standard</option>
                  </select>
                  <select value={activeCat} onChange={e => setActiveCat(e.target.value)}
                    style={{ ...card, padding: '8px 12px', fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>
                    <option value="All">All categories</option>
                    {CATS.map(c => <option key={c.key} value={c.key}>{c.short}</option>)}
                  </select>
                </div>
                {(() => {
                  const q = search.trim().toLowerCase();
                  const match = (i: PublicAuditIssue) =>
                    (activeCat === 'All' || i.category === activeCat) &&
                    (sevFilter === 'All' || i.severity === sevFilter) &&
                    (effortFilter === 'All' || i.effort === effortFilter) &&
                    (!q || `${i.title} ${i.evidence} ${i.fix} ${i.code}`.toLowerCase().includes(q));
                  const urg = d.ordered.filter(i => (i.severity === 'critical' || i.severity === 'high') && match(i));
                  const fnd = d.ordered.filter(i => !(i.severity === 'critical' || i.severity === 'high') && match(i));
                  const sum = (l: PublicAuditIssue[]) => l.reduce((s, i) => s + i.impact, 0);
                  const passed = (report?.issues ?? []).filter(i => i.passed && (activeCat === 'All' || i.category === activeCat) && (!q || `${i.title} ${i.evidence} ${i.code}`.toLowerCase().includes(q)));
                  const colHead = (t: string, n: number, pts?: number) => (
                    <div className="flex items-center" style={{ marginBottom: 10 }}>
                      <span style={{ fontWeight: 800, fontSize: 13 }}>{t}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 6 }}>({n})</span>
                      <span style={{ flex: 1 }} />
                      {pts !== undefined && <span style={{ fontSize: 11, fontWeight: 800 }}>+{pts} pts</span>}
                    </div>
                  );
                  const issueCard = (i: PublicAuditIssue) => {
                    const cc = CATS.find(c => c.key === i.category);
                    return (
                      <div key={i.code} style={{ ...card, padding: 12, marginBottom: 10 }}>
                        <div className="flex items-start" style={{ gap: 8 }}>
                          <span style={pill(cc?.color ?? '#888')}>● {(cc?.short ?? i.category)}</span>
                          <span style={{ flex: 1 }} />
                          <span style={{ fontSize: 11, fontWeight: 800 }}>+{i.impact} pts</span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 13, marginTop: 6 }}>{i.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>▲ {i.evidence?.slice(0, 110) || i.fix?.slice(0, 110)}</div>
                        <div className="flex items-center" style={{ marginTop: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>site-wide · {i.effort === 'quick' ? 'Quick win' : 'Standard'}</span>
                          <span style={{ flex: 1 }} />
                          <button onClick={() => markFixed(i.code)} style={fixBtn} aria-label={`Mark fixed: ${i.title}`}>Fix ⚡</button>
                        </div>
                      </div>
                    );
                  };
                  return (
                    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                      <div>
                        {colHead('Issues Found', fnd.length, sum(fnd))}
                        {fnd.map(issueCard)}
                        {fnd.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>No matches — <button onClick={resetFilters} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', textDecoration: 'underline', fontSize: 12, padding: 0 }}>clear filters</button></p>}
                      </div>
                      <div>
                        {colHead('Urgent', urg.length, sum(urg))}
                        {urg.map(issueCard)}
                        {urg.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>No matches — <button onClick={resetFilters} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', textDecoration: 'underline', fontSize: 12, padding: 0 }}>clear filters</button></p>}
                      </div>
                      <div>
                        {colHead('Fixed', fixedItems.length)}
                        {fixedItems.map(i => (
                          <div key={i.code} style={{ ...card, padding: 12, marginBottom: 10 }}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>✓ {i.title}</div>
                            <button onClick={() => undoFixed(i.code)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', textDecoration: 'underline', fontSize: 11, padding: 0, marginTop: 4 }}>undo</button>
                          </div>
                        ))}
                        {fixedItems.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>Re-audit verifies fixes here</p>}
                      </div>
                      <div>
                        {colHead('Passed', passed.length)}
                        {passed.map(i => {
                          const cc = CATS.find(c => c.key === i.category);
                          return (
                            <div key={i.code} style={{ ...card, padding: 12, marginBottom: 10 }}>
                              <div className="flex items-start" style={{ gap: 8 }}>
                                <span style={pill(cc?.color ?? '#888')}>● {(cc?.short ?? i.category)}</span>
                                <span style={{ flex: 1 }} />
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#00A868' }}>✓ pass</span>
                              </div>
                              <div style={{ fontWeight: 700, fontSize: 13, marginTop: 6 }}>{i.title}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{i.evidence?.slice(0, 110)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                </>)}

              </div>
            </div>
          </div>
        </section>
      )}

      {/* Static explainer for SEO */}
      <section className="px-6 py-12">
        <div className="max-w-3xl mx-auto" style={{ color: 'var(--text-soft)', fontSize: 14, lineHeight: 1.7 }}>
          <h2 style={{ color: 'var(--text)', fontWeight: 800, marginBottom: 8 }}>Run it. Read it. Fix it.</h2>
          <p>Every audit covers Technical SEO, Core Web Vitals, Security, Mobile and AI Visibility — in one run. Critical blockers float to the top in Detected, drag them to Priority, mark them Fixed as you ship.</p>
        </div>
      </section>

      {report && d && (
        <section className="px-4 sm:px-6 pb-12">
          <div className="max-w-3xl mx-auto">
            <div className="card-accent-s text-center" style={{ padding: '40px 24px', position: 'relative', overflow: 'hidden' }}>
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(0,194,122,0.10) 0%, transparent 70%)' }} />
              <div className="relative z-10" style={{ maxWidth: 560, margin: '0 auto' }}>
                <span className="pill-s mb-4 inline-block">Serpely Pro</span>
                <h2 className="font-display text-2xl font-bold mb-3">Want daily tracking + <span className="text-gradient">AI citation monitoring?</span></h2>
                <p className="text-sm mb-5" style={{ color: 'var(--text-soft)', lineHeight: 1.7 }}>
                  Serpely monitors GEO Score, ChatGPT / Perplexity citations and technical health every day — automatically.
                </p>
                <div className="flex flex-wrap justify-center" style={{ gap: 8, marginBottom: 20 }}>
                  {['Daily GEO audits', 'Citation alerts', 'White-label reports'].map(t => (
                    <span key={t} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-soft)' }}>✓ {t}</span>
                  ))}
                </div>
                <div className="flex flex-wrap justify-center" style={{ gap: 10 }}>
                  <Link to="/register" className="btn-accent-s inline-flex">Start Free Trial</Link>
                  <Link to="/pricing" className="btn-secondary-s inline-flex">See plans</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
