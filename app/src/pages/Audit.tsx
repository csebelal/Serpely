import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSEOMeta } from '@/hooks/useSEOMeta';
import { injectSchema, removeSchema } from '@/lib/schema';
import { runPublicAudit, getPublicAudit, getAuditStatus, clientGetMe, type PublicAuditReport } from '@/lib/api';
import { AuditResults, parsePsiMeta } from '@/components/audit/AuditResults';
import { AUDIT_REDESIGN } from '@/config/audit';
import SiteAuditReport from '@/components/site-audit/SiteAuditReport';
import { CompareCard } from '@/components/audit/CompareCard';
import { GscInsights } from '@/components/audit/GscInsights';
import { CrawlerAccess } from '@/components/audit/CrawlerAccess';
import { TurnstileWidget } from '@/components/TurnstileWidget';
import '../components/audit/print.css';
import { IssuesList } from '@/components/audit/IssuesList';

const card: React.CSSProperties = { background: '#fff', color: '#0B1411', border: '1px solid #E3E9E6', borderRadius: 20, padding: 28 };

function exportJson(report: PublicAuditReport) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `audit-${report.normalizedUrl.replace(/[^a-z0-9]+/gi, '-')}.json`;
  a.click();
}

function stageIndex(stage: string, pagesTotal: number): number {
  if (/scoring/i.test(stage)) return 3;
  if (/google|lab/i.test(stage)) return 2;
  if (/crawl/i.test(stage) || pagesTotal > 0) return 1;
  return 0;
}

function overallChip(score: number): string {
  return score >= 80 ? '#00B96B' : score >= 55 ? '#D9A400' : '#E5484D';
}

function ProgressSteps({ target, stage, pagesDone, pagesTotal }: { target: string; stage: string; pagesDone: number; pagesTotal: number }) {
  const active = stageIndex(stage, pagesTotal);
  const pct = pagesTotal > 0 ? Math.round((pagesDone / Math.max(1, pagesTotal)) * 100) : 0;
  return (
    <div style={{ ...card, maxWidth: 600, margin: '20px auto 0', padding: '18px 22px', textAlign: 'left' }} role="status" aria-live="polite">
      <strong style={{ display: 'block', fontSize: 15, marginBottom: 4 }}>
        The site audit for {target || 'your site'} is now in progress…
      </strong>
      <div style={{ fontSize: 12, color: '#5B6B64', marginBottom: 12 }}>
        {pagesTotal > 0 ? `${pagesDone}/${pagesTotal} pages · ${pct}%` : 'Warming up the crawler…'}
      </div>
      <div style={{ height: 8, borderRadius: 999, background: '#E8EEEB', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${active >= 3 ? 100 : active === 2 ? 78 : active === 1 ? pct * 0.7 : 8}%`, background: 'linear-gradient(90deg,#00B96B,#3BE39A)', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function exportCsv(report: PublicAuditReport) {
  const rows = [['code', 'category', 'severity', 'title', 'passed', 'evidence', 'fix'],
    ...report.issues.map(i => [i.code, i.category, i.severity, `"${i.title.replace(/"/g, '""')}"`, String(i.passed), `"${(i.evidence || '').replace(/"/g, '""')}"`, `"${(i.fix || '').replace(/"/g, '""')}"`])];
  const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'audit-issues.csv';
  a.click();
}

export function Audit() {
  useSEOMeta('audit', {
    title: 'Free Full-Site SEO & AI Visibility Audit — Serpely',
    description: 'Crawl up to 300 pages with Google lab data: Performance, Accessibility, Technical SEO, On-page content and AI citation readiness.',
  });
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [, setJobId] = useState<string | null>(null);
  const [stage, setStage] = useState('');
  const [pagesDone, setPagesDone] = useState(0);
  const [pagesTotal, setPagesTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [auditTarget, setAuditTarget] = useState('');
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [report, setReport] = useState<PublicAuditReport | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    injectSchema('schema-audit', {
      '@context': 'https://schema.org', '@type': 'WebPage',
      name: 'Free Full-Site SEO & AI Visibility Audit — Serpely',
      url: 'https://serpely.com/audit',
      description: 'Full-site crawl audit with Google lab data across Performance, Accessibility, Technical SEO, On-page content and AI citation readiness.',
    });
    return () => removeSchema('schema-audit');
  }, []);

  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  useEffect(() => stopPoll, []);

  // Competitor compare is a paid feature — hidden unless Pro/Business.
  useEffect(() => {
    if (!localStorage.getItem('serpely_client_token')) return;
    clientGetMe().then(r => setPlan(r.data.plan || null)).catch(() => {});
  }, []);

  const loadReport = (data: PublicAuditReport) => {
    setReport(data);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  };

  const pollJob = (jid: string) => {
    stopPoll();
    pollRef.current = setInterval(async () => {
      try {
        const r = await getAuditStatus(jid);
        const s = r.data;
        setStage(s.stage); setPagesDone(s.pagesDone); setPagesTotal(s.pagesTotal);
        if (s.status === 'done' && s.reportId) {
          stopPoll(); setLoading(false);
          const full = await getPublicAudit(s.reportId);
          loadReport(full.data);
          navigate(`/audit/${s.reportId}`, { replace: true });
        } else if (s.status === 'failed') {
          stopPoll(); setLoading(false);
          setError(s.error || 'Audit failed. Try again.');
        }
      } catch { /* keep polling */ }
    }, 2000);
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getPublicAudit(id)
      .then(r => { loadReport(r.data); setLoading(false); })
      .catch(() => {
        setError('Report not found or expired (free reports expire after 30 days).');
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const runAudit = async (target: string) => {
    setError('');
    if (!target.trim()) { setError('Enter your website, e.g. example.com'); return; }
    setAuditTarget(target.trim().replace(/^https?:\/\//, '').replace(/\/$/, ''));
    setLoading(true); setReport(null); setJobId(null); setPagesDone(0); setPagesTotal(0); setStage('Starting…');
    try {
      const r = await runPublicAudit(target.trim(), turnstileToken);
      if (r.data.cached && r.data.reportId) {
        const full = await getPublicAudit(r.data.reportId);
        loadReport(full.data); setLoading(false);
        navigate(`/audit/${r.data.reportId}`, { replace: true });
        return;
      }
      setJobId(r.data.jobId);
      pollJob(r.data.jobId);
    } catch (err: unknown) {
      setLoading(false);
      const m = err as { response?: { status?: number; data?: { error?: string } } };
      setError(m?.response?.data?.error || 'Audit failed. Check the URL and try again.');
    }
  };

  const submit = (e: React.FormEvent) => { e.preventDefault(); runAudit(url); };
  const reAudit = () => { if (report) { setUrl(report.normalizedUrl); runAudit(report.normalizedUrl); } };
  const auditSite = (target: string) => { setUrl(target); runAudit(target); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const domain = report ? report.normalizedUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
  const completedAt = report ? new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  void completedAt;
  const delta = report?.trend?.length && report.trend.length > 1
    ? report.overall - report.trend[report.trend.length - 2].overall : null;
  void delta;
  const s = report?.summary;
  const failedCount = s ? (s.critical + s.warning + s.notice) : (report?.issues.filter((i) => !i.passed).length ?? 0);

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <section className="pt-32 pb-12 px-6 text-center relative overflow-hidden no-print">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,194,122,0.12) 0%, transparent 70%)' }} />
        <div className="max-w-3xl mx-auto relative z-10">
          <span className="pill-s mb-5 inline-block">Free full-site audit</span>
          <h1 className="font-display font-black mb-4" style={{ fontSize: 'clamp(2.4rem,6vw,4rem)', letterSpacing: '-0.05em', lineHeight: 1.02 }}>
            Get discovered wherever <span className="text-gradient">people search</span>
          </h1>
          <p className="mx-auto mb-7" style={{ color: 'var(--text-soft)', fontSize: 16, lineHeight: 1.65, maxWidth: 560 }}>
            One scan checks your whole site for Google rankings and AI answers — then tells you exactly what to fix first.
          </p>
          <form onSubmit={submit} style={{ display: 'flex', gap: 8, maxWidth: 600, margin: '0 auto', background: 'var(--card-bg)', border: '1px solid hsl(var(--border))', borderRadius: 20, padding: 8, boxShadow: '0 12px 40px rgba(0,60,35,0.10)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', paddingLeft: 14, color: 'var(--text-faint)', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
            </span>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Enter your website, e.g. example.com"
              inputMode="url" disabled={loading} aria-label="Website URL to audit"
              style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', padding: '12px 8px', fontSize: 16, color: 'var(--text)', opacity: loading ? 0.6 : 1 }} />
            <button type="submit" disabled={loading} className="btn-accent-s" style={{ borderRadius: 14, padding: '12px 28px', fontSize: 15, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Auditing…' : 'Get audit'}
            </button>
          </form>
          <div style={{ maxWidth: 600, margin: '12px auto 0', display: 'flex', justifyContent: 'center' }}>
            <TurnstileWidget onToken={setTurnstileToken} />
          </div>
          {loading && <ProgressSteps target={auditTarget} stage={stage} pagesDone={pagesDone} pagesTotal={pagesTotal} />}
          {error && <p style={{ color: '#E5484D', marginTop: 12, fontSize: 14 }}>{error}</p>}
          {report && !loading && (
            <div role="status" style={{ maxWidth: 640, margin: '48px auto 0', textAlign: 'center' }}>
              <strong style={{ display: 'block', fontSize: 30, fontWeight: 800, color: '#1F3A4D', letterSpacing: '-0.01em' }}>Your FREE WEBSITE audit report is ready!</strong>
              <p style={{ margin: '10px 0 0', fontSize: 17, color: '#5B6B74', lineHeight: 1.6 }}>
                You can download the PDF and start making changes. Or, share it with your SEO so they can work on the report.
              </p>
            </div>
          )}
        </div>
      </section>

      {report && (
        <section ref={resultsRef} className="px-4 sm:px-6 pb-10 audit-report" style={{ scrollMarginTop: 90, background: '#F7F9F8', color: '#0B1411', colorScheme: 'light', paddingTop: 28 }}>
          <div className="mx-auto" style={{ maxWidth: 1296 }}>
            <div className="flex flex-wrap items-center no-print" style={{ gap: 10, marginBottom: 16, position: 'sticky', top: 64, zIndex: 30, background: 'rgba(247,249,248,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: '10px 12px', borderRadius: 16, border: '1px solid #E3E9E6' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 16px', minHeight: 40, borderRadius: 999, background: '#fff', border: '1px solid #DCE3DF', fontSize: 14, fontWeight: 700 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#19D987', display: 'inline-block' }} />
                {domain}
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', background: overallChip(report.overall), borderRadius: 999, padding: '6px 12px' }}>
                {report.overall}/100
              </span>
              <span style={{ flex: 1 }} />
              <button type="button" onClick={() => report && exportJson(report)} style={{ minHeight: 38, padding: '0 16px', borderRadius: 999, border: '1px solid #C9D4CE', background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>JSON</button>
              <button type="button" onClick={() => report && exportCsv(report)} style={{ minHeight: 38, padding: '0 16px', borderRadius: 999, border: '1px solid #C9D4CE', background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>CSV</button>
              <button type="button" onClick={() => window.print()} style={{ minHeight: 38, padding: '0 16px', borderRadius: 999, border: '1px solid #C9D4CE', background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>PDF</button>
              <button type="button" onClick={() => navigator.clipboard?.writeText(window.location.href)} style={{ minHeight: 38, padding: '0 16px', borderRadius: 999, border: '1px solid #C9D4CE', background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Share</button>
              <button type="button" onClick={reAudit} disabled={loading} style={{ minHeight: 38, padding: '0 16px', borderRadius: 999, background: '#0B1411', color: '#fff', border: '1px solid #0B1411', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>Re-run</button>
            </div>
            <div className="print-only" style={{ marginBottom: 16, fontSize: 22, fontWeight: 800 }}>
              {domain} — Website Audit Report
            </div>

            {AUDIT_REDESIGN ? (
              <>
                <div style={{ marginBottom: 20 }}>
                  <SiteAuditReport report={report} shareToken={report.shareToken ?? id ?? null} embedded />
                </div>
                {report.priority && (
                  <div style={{ ...card, marginBottom: 20 }}>
                    <div style={{ padding: 16, borderRadius: 14, background: '#0A1410', color: '#fff' }}>
                      <div style={{ fontSize: 12, color: '#3BE39A', fontWeight: 800 }}>FIX FIRST · +{report.priority.impact} PTS</div>
                      <div style={{ fontSize: 16, fontWeight: 800, margin: '6px 0' }}>{report.priority.title}</div>
                      <div style={{ fontSize: 13, color: '#B6C7BE' }}>{report.priority.fix}</div>
                      <Link to="/register" className="btn-accent-s inline-flex" style={{ marginTop: 12 }}>Fix with Serpely agent</Link>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <AuditResults
                    scores={report.scores}
                    issues={report.issues}
                    overall={report.overall}
                    failedCount={failedCount}
                    createdAt={report.createdAt}
                    ghostOverall={report.forecast?.allFixes}
                    psi={parsePsiMeta(report.meta)}
                  />
                </div>

                <div style={{ ...card, marginBottom: 20 }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 800 }}>Issue summary</h3>
                    <div style={{ height: 14, borderRadius: 999, overflow: 'hidden', display: 'flex', background: '#E8EEEB', marginBottom: 10 }}>
                      {!!s?.critical && <div style={{ width: `${(s.critical / Math.max(1, s.critical + s.warning + s.notice)) * 100}%`, background: '#E5484D' }} />}
                      {!!s?.warning && <div style={{ width: `${(s.warning / Math.max(1, s.critical + s.warning + s.notice)) * 100}%`, background: '#D9A400' }} />}
                      {!!s?.notice && <div style={{ width: `${(s.notice / Math.max(1, s.critical + s.warning + s.notice)) * 100}%`, background: '#0E9AA7' }} />}
                    </div>
                    <div style={{ fontSize: 13, color: '#55655D' }}>
                      {s?.critical ?? 0} critical · {s?.warning ?? 0} warnings · {s?.notice ?? 0} notices · {s?.passed ?? 0} checks passed
                    </div>
                    {report.priority && (
                      <div style={{ marginTop: 16, padding: 16, borderRadius: 14, background: '#0A1410', color: '#fff' }}>
                        <div style={{ fontSize: 12, color: '#3BE39A', fontWeight: 800 }}>FIX FIRST · +{report.priority.impact} PTS</div>
                        <div style={{ fontSize: 16, fontWeight: 800, margin: '6px 0' }}>{report.priority.title}</div>
                        <div style={{ fontSize: 13, color: '#B6C7BE' }}>{report.priority.fix}</div>
                        <Link to="/register" className="btn-accent-s inline-flex" style={{ marginTop: 12 }}>Fix with Serpely agent</Link>
                      </div>
                    )}
                </div>
              </>
            )}

            <div style={{ ...card, marginBottom: 20 }}>
              <CrawlerAccess crawlers={report.aiCrawlers || []} />
            </div>

            {(plan === 'pro' || plan === 'business') && (
              <div className="no-print" style={{ ...card, marginBottom: 20 }}>
                <CompareCard defaultUrl={report.normalizedUrl} onAuditSite={auditSite} />
              </div>
            )}

            <div className="no-print" style={{ ...card, marginBottom: 20 }}>
              <GscInsights origin={report.origin || report.normalizedUrl} />
            </div>

            {!AUDIT_REDESIGN && (
              <div style={{ ...card }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 800 }}>Issues</h3>
                <IssuesList issues={report.issues} />
              </div>
            )}

            <div style={{ ...card, marginTop: 20, textAlign: 'center' }}>
              <span className="pill-s mb-4 inline-block">Serpely Pro</span>
              <h2 className="font-display text-2xl font-bold mb-3">Want daily tracking + <span className="text-gradient">AI citation monitoring?</span></h2>
              <div className="flex flex-wrap justify-center" style={{ gap: 10 }}>
                <Link to="/register" className="btn-accent-s inline-flex">Start Free Trial</Link>
                <Link to="/pricing" className="btn-secondary-s inline-flex">See plans</Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="px-4 sm:px-6 py-14 no-print">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="font-display font-black mb-3" style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)', letterSpacing: '-0.03em', color: 'var(--text)' }}>
            Run it. Read it. Fix it.
          </h2>
          <p className="mx-auto mb-8" style={{ color: 'var(--text-soft)', fontSize: 15, lineHeight: 1.7, maxWidth: 640 }}>
            Three steps between you and a site Google and AI engines love.
          </p>
          <div className="grid sm:grid-cols-3" style={{ gap: 14, textAlign: 'left' }}>
            {[
              { n: '01', t: 'Run the scan', d: 'Drop in any URL. We crawl up to 300 pages and pull Google lab + real-visitor data.' },
              { n: '02', t: 'Read the grades', d: 'Five letter grades — SEO, GEO, Links, Usability, Performance — with every issue explained.' },
              { n: '03', t: 'Fix what matters', d: 'Start with the Fix-First box or hand issues to the Serpely agent one by one.' },
            ].map(s => (
              <div key={s.n} style={{ background: 'var(--card-bg)', border: '1px solid hsl(var(--border))', borderRadius: 18, padding: 22 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#00A868' }}>{s.n}</div>
                <div style={{ fontSize: 17, fontWeight: 800, margin: '6px 0', color: 'var(--text)' }}>{s.t}</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-soft)' }}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
