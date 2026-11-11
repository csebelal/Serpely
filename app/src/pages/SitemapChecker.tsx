import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Hash,
  Layers,
  Link2,
  Map as MapIcon,
  RefreshCw,
  Search,
  ShieldCheck,
  Tag,
  X,
} from 'lucide-react';
import { useSEOMeta } from '@/hooks/useSEOMeta';
import { PageBackground } from '@/components/backgrounds/PageBackground';
import { injectSchema, removeSchema } from '@/lib/schema';
import { TurnstileWidget } from '@/components/TurnstileWidget';
import {
  runSitemapCheck,
  getSitemapCheck,
  type SitemapReport,
  type SitemapCheckedUrl,
  type SiteIssue,
} from '@/lib/api';

type Verdict = SitemapCheckedUrl['verdict'];
type FilterKey = 'Issues' | 'All' | Verdict;

const PAGE_SIZE = 15;

const VERDICT_META: {
  key: Verdict;
  label: string;
  pillText: string;
  color: string;
  fix: string;
}[] = [
  {
    key: 'Broken',
    label: 'Broken',
    pillText: 'BROKEN',
    color: '#DC2626',
    fix: 'Remove the URL from the sitemap or redirect it to a live 200 page.',
  },
  {
    key: 'Blocked',
    label: 'Blocked',
    pillText: 'BLOCKED',
    color: '#D97706',
    fix: 'Remove the noindex tag or allow the path in robots.txt; otherwise drop it from the sitemap.',
  },
  {
    key: 'Redirected',
    label: 'Redirected',
    pillText: 'REDIRECTED',
    color: '#B45309',
    fix: 'Replace the sitemap entry with the final destination URL.',
  },
  {
    key: 'Non-canonical',
    label: 'Non-canonical',
    pillText: 'NON-CANONICAL',
    color: '#7C3AED',
    fix: 'List the canonical URL in the sitemap instead of an alternate variant.',
  },
  {
    key: 'Slow',
    label: 'Slow',
    pillText: 'SLOW',
    color: 'var(--text-soft)',
    fix: 'Improve page response time (caching, image compression, server latency) so crawlers do not drop it.',
  },
  {
    key: 'Healthy',
    label: 'Valid',
    pillText: 'VALID',
    color: 'var(--accent-text)',
    fix: 'No action needed — URL returns 200, is indexable, and matches its canonical.',
  },
];

const STAGES = ['Finding sitemap', 'Reading URLs', 'Checking each page', 'Scoring'];

const FEATURE_CARDS = [
  {
    icon: Search,
    title: 'Sitemap Discovery',
    desc: 'Automatically locates sitemaps via robots.txt directives and standard fallback paths.',
  },
  {
    icon: Layers,
    title: 'Sitemap Structure',
    desc: 'Detects single URL sets vs. sitemap indexes and verifies child sitemap references.',
  },
  {
    icon: ShieldCheck,
    title: 'XML Validation',
    desc: 'Checks XML structure, valid loc entries, and duplicate or malformed URL patterns.',
  },
  {
    icon: Hash,
    title: 'URL Limit Validation',
    desc: 'Verifies URL volume against the 50,000-URL per-file protocol limit.',
  },
  {
    icon: Link2,
    title: 'Live Availability Checks',
    desc: 'Tests URLs for 4xx/5xx errors, redirect chains, noindex tags, and canonical mismatches.',
  },
  {
    icon: Tag,
    title: 'Metadata & Freshness',
    desc: 'Audits lastmod date coverage, HTTPS consistency, and cross-page SEO signals.',
  },
];

const AUDIT_STEPS = [
  {
    n: '01',
    title: 'Enter Website URL',
    desc: 'Paste your domain and Serpely automatically locates your XML sitemap.',
  },
  {
    n: '02',
    title: 'Validate Structure',
    desc: 'We parse sitemap indexes, XML formatting, lastmod tags, and URL counts.',
  },
  {
    n: '03',
    title: 'Inspect Live URLs',
    desc: 'Each URL is checked for status codes, redirects, robots rules, and canonicals.',
  },
  {
    n: '04',
    title: 'Fix & Verify',
    desc: 'Address prioritized issues, export CSV reports, and re-check in one click.',
  },
];

/** Resolve a sitemap reference into a full absolute URL using the checked site's origin. */
function toFullSitemapUrl(rawUrl: string, origin: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return origin ? `${origin.replace(/\/$/, '')}/sitemap.xml` : '';
  try {
    return new URL(trimmed, origin).href;
  } catch {
    return trimmed;
  }
}

function pillStyle(color: string): React.CSSProperties {
  return {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '0.04em',
    padding: '3px 8px',
    borderRadius: 999,
    background: `color-mix(in srgb, ${color} 12%, transparent)`,
    color,
    whiteSpace: 'nowrap',
  };
}

function rowPill(u: SitemapCheckedUrl): { text: string; color: string } {
  if (u.status === 0) return { text: 'NOT AVAILABLE', color: 'var(--text-soft)' };
  const meta = VERDICT_META.find(v => v.key === u.verdict);
  return { text: meta?.pillText ?? u.verdict.toUpperCase(), color: meta?.color ?? 'var(--text)' };
}

function scoreColor(score: number): string {
  if (score >= 85) return 'var(--accent-text)';
  if (score >= 65) return '#D97706';
  return '#DC2626';
}

function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore clipboard denial */
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
      style={{
        background: 'var(--tag-bg)',
        border: '1px solid hsl(var(--border))',
        color: copied ? 'var(--accent-text)' : 'var(--text-soft)',
      }}
      aria-label={`${label} ${value}`}
    >
      {copied ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
}

function SiteIssueRow({ issue }: { issue: SiteIssue }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl transition-colors"
      style={{ border: '1px solid hsl(var(--border))', background: 'var(--bg-subtle)' }}
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-start gap-3 p-3.5 text-left cursor-pointer"
      >
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#D97706' }} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{issue.title}</span>
            <span
              className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--tag-bg)', color: 'var(--text-soft)', border: '1px solid hsl(var(--border))' }}
            >
              {issue.urls.length} {issue.urls.length === 1 ? 'URL' : 'URLs'}
            </span>
          </div>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-soft)' }}>
            {issue.detail}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 shrink-0 mt-1 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-faint)' }}
          aria-hidden="true"
        />
      </button>
      {open && issue.urls.length > 0 && (
        <div className="px-3.5 pb-3.5 pt-1 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
          <ul className="space-y-1.5 mt-2">
            {issue.urls.map(u => (
              <li key={u} className="text-xs font-mono truncate" style={{ color: 'var(--text-soft)' }} title={u}>
                {u}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SitemapChecker() {
  useSEOMeta('sitemap-checker', {
    title: 'Free Sitemap Checker — Serpely',
    description:
      'Paste any website to check its XML sitemap: broken links, redirects, blocked pages and Google listing readiness for every URL.',
  });

  const { id } = useParams<{ id: string }>();
  const [url, setUrl] = useState('');
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [report, setReport] = useState<SitemapReport | null>(null);
  const [filter, setFilter] = useState<FilterKey>('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAllSitemaps, setShowAllSitemaps] = useState(false);
  const [showSitemapNotes, setShowSitemapNotes] = useState(false);
  const [showUrlsTable, setShowUrlsTable] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const urlListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    injectSchema('schema-sitemap-checker', {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Free Sitemap Checker — Serpely',
      url: 'https://serpely.com/sitemap-checker',
      description: 'Check any XML sitemap for broken, redirected, blocked and non-canonical URLs with plain-language fixes.',
    });
    return () => removeSchema('schema-sitemap-checker');
  }, []);

  const applyReportState = (rep: SitemapReport) => {
    setReport(rep);
    const issueCount = rep.urls.filter(u => u.verdict !== 'Healthy').length;
    setFilter(issueCount > 0 ? 'Issues' : 'All');
    setShowUrlsTable(issueCount > 0);
    setSearch('');
    setPage(1);
    setShowAllSitemaps(false);
    setShowSitemapNotes(false);
  };

  useEffect(() => {
    if (id) {
      setRunning(true);
      getSitemapCheck(id)
        .then(r => applyReportState(r.data))
        .catch(() => setErr('Report not found or expired.'))
        .finally(() => setRunning(false));
    }
  }, [id]);

  useEffect(() => {
    if (!running) return;
    const t0 = Date.now();
    setElapsed(0);
    timer.current = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 500);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running]);

  async function start(u: string) {
    setErr('');
    setReport(null);
    const v = (u || url).trim();
    if (!v) {
      setErr('Enter your website, e.g. example.com');
      return;
    }
    setRunning(true);
    try {
      const full = await runSitemapCheck(v, turnstileToken);
      const rep = await getSitemapCheck(full.data.id);
      applyReportState(rep.data);
      window.history.replaceState(null, '', `/sitemap-checker/${full.data.id}`);
    } catch (e: unknown) {
      const r = (e as { response?: { data?: { error?: string } } })?.response;
      setErr(r?.data?.error || 'Check failed. The site may block automated checks or have no sitemap.');
    } finally {
      setRunning(false);
    }
  }

  function exportCsv() {
    if (!report) return;
    const q = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;
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

  function jumpToFilter(target: FilterKey) {
    setFilter(target);
    setShowUrlsTable(true);
    setPage(1);
    setTimeout(() => urlListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }

  const issueCount = useMemo(
    () => (report ? report.urls.filter(u => u.verdict !== 'Healthy').length : 0),
    [report],
  );

  const filtered = useMemo(() => {
    if (!report) return [];
    const q = search.trim().toLowerCase();
    return report.urls.filter(u => {
      const matchesFilter =
        filter === 'All'
          ? true
          : filter === 'Issues'
            ? u.verdict !== 'Healthy'
            : u.verdict === filter;
      const matchesQuery = !q || `${u.url} ${u.title} ${u.detail}`.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [report, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedUrls = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  const s = report?.summary;
  const stageIdx = elapsed < 8 ? 0 : elapsed < 18 ? 1 : elapsed < 60 ? 2 : 3;
  const noSitemap = err.toLowerCase().includes('no sitemap found');

  const okSitemaps = useMemo(() => {
    if (!s) return [];
    return s.sitemaps
      .filter(x => x.ok)
      .map(x => ({
        ...x,
        fullUrl: toFullSitemapUrl(x.url, s.origin),
      }));
  }, [s]);

  const activeIssueFixes = useMemo(() => {
    if (!s) return [];
    const counts: Record<Verdict, number> = {
      Broken: s.broken,
      Blocked: s.blocked,
      Redirected: s.redirected,
      'Non-canonical': s.nonCanonical,
      Slow: s.slow,
      Healthy: s.healthy,
    };
    return VERDICT_META.filter(v => v.key !== 'Healthy' && counts[v.key] > 0).map(v => ({
      ...v,
      count: counts[v.key],
    }));
  }, [s]);

  const filterTabs = useMemo(() => {
    if (!report) return [];
    const tabs: { key: FilterKey; label: string; count: number }[] = [];
    if (issueCount > 0) {
      tabs.push({ key: 'Issues', label: 'Issues', count: issueCount });
    }
    tabs.push({ key: 'All', label: 'All URLs', count: report.urls.length });
    const validCount = report.urls.filter(u => u.verdict === 'Healthy').length;
    tabs.push({ key: 'Healthy', label: 'Valid', count: validCount });
    for (const v of VERDICT_META) {
      if (v.key === 'Healthy') continue;
      const n = report.urls.filter(u => u.verdict === v.key).length;
      if (n > 0) tabs.push({ key: v.key, label: v.label, count: n });
    }
    return tabs;
  }, [report, issueCount]);

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Hero */}
      <section className="pt-32 pb-12 px-4 sm:px-6 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,194,122,0.12) 0%, transparent 70%)' }}
        />
        <PageBackground variant="flow" />
        <div className="max-w-3xl mx-auto relative z-10">
          <span className="pill-s mb-5 inline-flex">
            <ShieldCheck className="w-4 h-4" style={{ color: 'var(--accent-text)' }} aria-hidden="true" />
            Free Online Sitemap Checker
          </span>
          <h1
            className="font-display font-black mb-4"
            style={{ fontSize: 'clamp(2.25rem,5.5vw,3.75rem)', letterSpacing: '-0.05em', lineHeight: 1.04 }}
          >
            XML Sitemap <span className="text-gradient">Finder &amp; Checker</span>
          </h1>
          <p className="mx-auto mb-8 text-sm sm:text-base max-w-xl" style={{ color: 'var(--text-soft)', lineHeight: 1.6 }}>
            Locate your XML sitemap, verify validation status, and surface broken, blocked, or redirected URLs in seconds.
          </p>

          <form
            onSubmit={e => {
              e.preventDefault();
              void start(url);
            }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-xl mx-auto p-1.5 rounded-2xl sm:rounded-full transition-shadow focus-within:ring-2 focus-within:ring-[#00C27A]/40"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid hsl(var(--border))',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div className="flex items-center flex-1 min-w-0 pl-3.5 pr-2">
              <Globe className="w-4 h-4 shrink-0 mr-2.5" style={{ color: 'var(--text-faint)' }} aria-hidden="true" />
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="Enter your website (e.g. serpely.com)"
                inputMode="url"
                disabled={running}
                aria-label="Website to check"
                className="w-full bg-transparent border-none py-2.5 text-sm sm:text-[15px] font-medium"
                style={{ color: 'var(--text)', opacity: running ? 0.6 : 1, outline: 'none' }}
              />
            </div>
            <button
              type="submit"
              disabled={running}
              className="btn-accent-s justify-center rounded-xl sm:rounded-full shrink-0"
              style={{ opacity: running ? 0.65 : 1 }}
            >
              {running ? 'Checking…' : 'Check Sitemap'}
              {!running && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
            </button>
          </form>

          <div className="max-w-xl mx-auto mt-3 flex justify-center">
            <TurnstileWidget onToken={setTurnstileToken} />
          </div>

          {running && (
            <div
              className="card-s max-w-xl mx-auto mt-5 p-4 text-left"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <span
                  className="w-4 h-4 rounded-full border-2 border-current animate-spin shrink-0"
                  style={{ borderTopColor: 'transparent', color: 'var(--accent-text)' }}
                />
                <strong className="text-sm font-bold">Scanning sitemap… {elapsed}s</strong>
                <span className="flex-1" />
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-faint)' }}>
                  up to 1,000 URLs
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {STAGES.map((t, i) => (
                  <div
                    key={t}
                    className="text-[11px] font-semibold"
                    style={{
                      color:
                        i === stageIdx
                          ? 'var(--text)'
                          : i < stageIdx
                            ? 'var(--accent-text)'
                            : 'var(--text-faint)',
                    }}
                  >
                    <div
                      className="h-1 rounded-full mb-1.5 transition-opacity"
                      style={{
                        background: i <= stageIdx ? '#00C27A' : 'hsl(var(--border))',
                        opacity: i < stageIdx ? 0.55 : 1,
                      }}
                    />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          )}

          {err && !noSitemap && (
            <div
              role="alert"
              className="max-w-xl mx-auto mt-4 px-4 py-3 rounded-xl text-sm font-medium text-left flex items-start gap-2.5"
              style={{
                background: 'color-mix(in srgb, #DC2626 8%, var(--card-bg))',
                border: '1px solid color-mix(in srgb, #DC2626 25%, transparent)',
                color: '#DC2626',
              }}
            >
              <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{err}</span>
            </div>
          )}

          {err && noSitemap && (
            <div className="card-s max-w-xl mx-auto mt-5 p-6 sm:p-7 text-center">
              <div className="icon-badge-s mx-auto mb-3" style={{ color: 'var(--accent-text)' }}>
                <MapIcon className="w-5 h-5" aria-hidden="true" />
              </div>
              <h2 className="font-bold text-lg mb-1.5" style={{ color: 'var(--text)' }}>
                No sitemap found on this website
              </h2>
              <p className="text-sm mb-4" style={{ color: 'var(--text-soft)' }}>
                The site may not publish an XML sitemap, or it lives at a non-standard path.
              </p>
              <div
                className="text-xs text-left rounded-xl p-3.5 mb-4 space-y-1.5 leading-relaxed"
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid hsl(var(--border))',
                  color: 'var(--text-soft)',
                }}
              >
                <div>
                  Most sites serve it at <code className="font-mono font-semibold">/sitemap.xml</code> or{' '}
                  <code className="font-mono font-semibold">/sitemap_index.xml</code>.
                </div>
                <div>
                  If it uses a custom path, reference it inside <code className="font-mono font-semibold">robots.txt</code> so search engines can discover it.
                </div>
              </div>
              <Link
                to="/audit"
                className="inline-flex items-center gap-1.5 text-sm font-bold link-accent-s no-underline"
              >
                Run the full site audit instead <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          )}

          <p className="mt-4 text-xs font-medium" style={{ color: 'var(--text-faint)' }}>
            XML Validation · Index Discovery · Live Status &amp; Indexability Check
          </p>
        </div>
      </section>

      {/* Results Dashboard */}
      {report && s && (
        <section className="px-4 sm:px-6 pb-14" aria-label="Sitemap check results">
          <div className="max-w-5xl mx-auto space-y-4">
            {/* Top Report Toolbar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold font-mono"
                style={{ background: 'var(--card-bg)', border: '1px solid hsl(var(--border))' }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: scoreColor(s.healthScore) }}
                  aria-hidden="true"
                />
                <span className="truncate max-w-[240px] sm:max-w-md">{s.origin}</span>
              </div>

              <span className="flex-1" />

              <CopyButton value={window.location.href} label="Share link" />

              <button
                type="button"
                onClick={exportCsv}
                className="btn-secondary-s !py-2 !px-3.5 !text-xs !rounded-xl"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                Export CSV
              </button>

              <button
                type="button"
                onClick={() => void start(report.origin)}
                disabled={running}
                className="btn-secondary-s !py-2 !px-3.5 !text-xs !rounded-xl"
                style={{ opacity: running ? 0.6 : 1 }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} aria-hidden="true" />
                Re-check
              </button>
            </div>

            {/* Primary 4 KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="card-s p-4 sm:p-5">
                <div className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-faint)' }}>
                  Sitemap Health
                </div>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-3xl sm:text-4xl font-black tabular-nums" style={{ color: scoreColor(s.healthScore) }}>
                    {s.healthScore}
                  </span>
                  <span className="text-sm font-bold" style={{ color: scoreColor(s.healthScore) }}>%</span>
                </div>
                <div className="text-xs mt-1.5" style={{ color: 'var(--text-soft)' }}>
                  <span className="font-mono font-semibold">{s.healthy}</span>/{s.checked} valid
                  {s.totalUrls > s.checked ? ` (${s.totalUrls.toLocaleString()} total)` : ''}
                </div>
              </div>

              {[
                {
                  label: 'Broken',
                  filterKey: 'Broken' as FilterKey,
                  value: s.broken,
                  color: s.broken > 0 ? '#DC2626' : 'var(--text)',
                  sub: s.broken > 0 ? '4xx / 5xx / unreachable' : 'No broken URLs',
                },
                {
                  label: 'Blocked',
                  filterKey: 'Blocked' as FilterKey,
                  value: s.blocked,
                  color: s.blocked > 0 ? '#D97706' : 'var(--text)',
                  sub: s.blocked > 0 ? 'noindex or robots.txt' : 'No blocked URLs',
                },
                {
                  label: 'Redirected',
                  filterKey: 'Redirected' as FilterKey,
                  value: s.redirected,
                  color: s.redirected > 0 ? '#B45309' : 'var(--text)',
                  sub: s.redirected > 0 ? 'Update to final URL' : 'No redirect chains',
                },
              ].map(kpi => {
                const interactive = kpi.value > 0;
                return (
                  <button
                    key={kpi.label}
                    type="button"
                    disabled={!interactive}
                    onClick={() => interactive && jumpToFilter(kpi.filterKey)}
                    className={`card-s p-4 sm:p-5 text-left ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-faint)' }}>
                      {kpi.label}
                    </div>
                    <div className="text-3xl sm:text-4xl font-black font-mono tabular-nums" style={{ color: kpi.color }}>
                      {kpi.value}
                    </div>
                    <div className="text-xs mt-1.5" style={{ color: 'var(--text-soft)' }}>
                      {kpi.sub}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Extra subtle notice only if Non-canonical or Slow URLs were detected */}
            {(s.nonCanonical > 0 || s.slow > 0) && (
              <div
                className="flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl text-xs"
                style={{ background: 'var(--kpi-bg)', border: '1px solid hsl(var(--border))' }}
              >
                <span className="font-bold" style={{ color: 'var(--text-mid)' }}>Additional signals:</span>
                {s.nonCanonical > 0 && (
                  <button
                    type="button"
                    onClick={() => jumpToFilter('Non-canonical')}
                    className="font-mono font-bold cursor-pointer underline-offset-2 hover:underline"
                    style={{ color: '#7C3AED' }}
                  >
                    {s.nonCanonical} non-canonical
                  </button>
                )}
                {s.slow > 0 && (
                  <button
                    type="button"
                    onClick={() => jumpToFilter('Slow')}
                    className="font-mono font-bold cursor-pointer underline-offset-2 hover:underline"
                    style={{ color: 'var(--text-soft)' }}
                  >
                    {s.slow} slow (&gt;3s)
                  </button>
                )}
              </div>
            )}

            {/* Sitemaps Found — Focused, Full URL(s) + Essential Stats */}
            <div className="card-s p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4" style={{ color: 'var(--accent-text)' }} aria-hidden="true" />
                  <h2 className="text-sm font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
                    Sitemaps Found
                  </h2>
                </div>

                {/* Essential inline stats */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="tag-s text-xs font-semibold"
                  >
                    {okSitemaps.length > 1 ? `Index (${okSitemaps.length} files)` : 'Single file'}
                  </span>
                  <span
                    className="tag-s text-xs font-semibold"
                    style={{
                      color:
                        okSitemaps.length === s.sitemaps.length
                          ? 'var(--accent-text)'
                          : '#D97706',
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    XML: {okSitemaps.length}/{s.sitemaps.length} valid
                  </span>
                  <span className="tag-s text-xs font-semibold font-mono">
                    Lastmod: {s.lastmodCoverage}%
                  </span>
                </div>
              </div>

              {okSitemaps.length === 0 ? (
                <p className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>—</p>
              ) : (
                <div className="space-y-2">
                  {(showAllSitemaps ? okSitemaps : okSitemaps.slice(0, 1)).map(sm => (
                    <div
                      key={sm.fullUrl}
                      className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl"
                      style={{
                        background: 'var(--bg-subtle)',
                        border: '1px solid hsl(var(--border))',
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <a
                          href={sm.fullUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs sm:text-sm font-mono font-semibold truncate hover:underline inline-flex items-center gap-1.5"
                          style={{ color: 'var(--accent-text)' }}
                          title={sm.fullUrl}
                        >
                          <span className="truncate">{sm.fullUrl}</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        </a>
                        <span
                          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0"
                          style={{
                            background: 'var(--tag-bg)',
                            color: 'var(--text-faint)',
                            border: '1px solid hsl(var(--border))',
                          }}
                        >
                          {sm.source === 'robots' ? 'robots.txt' : 'discovered'}
                        </span>
                      </div>
                      <CopyButton value={sm.fullUrl} />
                    </div>
                  ))}

                  {okSitemaps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setShowAllSitemaps(v => !v)}
                      className="inline-flex items-center gap-1 text-xs font-bold cursor-pointer pt-1"
                      style={{ color: 'var(--accent-text)' }}
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllSitemaps ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                      {showAllSitemaps ? 'Hide child sitemaps' : `Show all ${okSitemaps.length} sitemap files`}
                    </button>
                  )}
                </div>
              )}

              {/* Compact collapsible warnings only if duplicates or formatting notes exist */}
              {(s.duplicateUrls.length > 0 || s.variantNotes.length > 0) && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                  <button
                    type="button"
                    onClick={() => setShowSitemapNotes(v => !v)}
                    aria-expanded={showSitemapNotes}
                    className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer"
                    style={{ color: '#D97706' }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>
                      {s.duplicateUrls.length + s.variantNotes.length} sitemap{' '}
                      {s.duplicateUrls.length + s.variantNotes.length === 1 ? 'warning' : 'warnings'}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${showSitemapNotes ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                  {showSitemapNotes && (
                    <div className="mt-2 space-y-1 text-xs" style={{ color: 'var(--text-soft)' }}>
                      {s.duplicateUrls.slice(0, 5).map(u => (
                        <div key={u} className="font-mono truncate" style={{ color: '#DC2626' }}>
                          Duplicate: {u}
                        </div>
                      ))}
                      {s.variantNotes.slice(0, 6).map((note, idx) => (
                        <div key={idx} className="font-mono truncate">
                          {note}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Site-Wide Findings (Compact Accordion — only shown if issues exist) */}
            {(s.siteIssues?.length || 0) > 0 && (
              <div className="card-s p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h2 className="text-sm font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
                      Site-Wide Findings
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
                      Cross-page signals detected during the scan. Click any item to inspect affected URLs.
                    </p>
                  </div>
                  <span className="tag-s text-xs font-mono font-bold">
                    {s.siteIssues.length} {s.siteIssues.length === 1 ? 'finding' : 'findings'}
                  </span>
                </div>
                <div className="space-y-2">
                  {s.siteIssues.map(issue => (
                    <SiteIssueRow key={issue.code} issue={issue} />
                  ))}
                </div>
              </div>
            )}

            {/* Contextual Recommended Fixes — only render categories that have > 0 issues */}
            {activeIssueFixes.length > 0 && (
              <div className="card-s p-5">
                <h2 className="text-sm font-extrabold tracking-tight mb-3" style={{ color: 'var(--text)' }}>
                  Priority Fixes ({issueCount} {issueCount === 1 ? 'URL' : 'URLs'})
                </h2>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {activeIssueFixes.map(item => (
                    <div
                      key={item.key}
                      className="p-3 rounded-xl flex items-start gap-2.5"
                      style={{ background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))' }}
                    >
                      <span style={pillStyle(item.color)}>{item.pillText} · {item.count}</span>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-soft)' }}>
                        {item.fix}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* URL Inspector — Progressive Disclosure */}
            <div ref={urlListRef} className="card-s p-5">
              {issueCount === 0 && !showUrlsTable ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: 'color-mix(in srgb, #00C27A 14%, transparent)',
                        color: 'var(--accent-text)',
                      }}
                    >
                      <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="text-sm font-extrabold" style={{ color: 'var(--text)' }}>
                        All {report.urls.length} checked URLs are valid and indexable
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-soft)' }}>
                        No broken, blocked, redirected, or non-canonical URLs were found.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUrlsTable(true)}
                    className="btn-secondary-s !py-2 !px-3.5 !text-xs !rounded-xl"
                  >
                    View Discovered URLs ({report.urls.length})
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <h2 className="text-sm font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
                        {issueCount > 0 ? 'URL Inspector' : `Discovered URLs (${report.urls.length})`}
                      </h2>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
                        Showing important status, HTTP code, and load speed per URL.
                      </p>
                    </div>
                    {issueCount === 0 && (
                      <button
                        type="button"
                        onClick={() => setShowUrlsTable(false)}
                        className="text-xs font-bold cursor-pointer"
                        style={{ color: 'var(--text-faint)' }}
                      >
                        Collapse list
                      </button>
                    )}
                  </div>

                  {/* Filter Pills + Search */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {filterTabs.map(tab => {
                      const active = filter === tab.key;
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => {
                            setFilter(tab.key);
                            setPage(1);
                          }}
                          className="px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-colors"
                          style={{
                            background: active ? 'var(--text)' : 'var(--bg-subtle)',
                            color: active ? 'var(--bg)' : 'var(--text-soft)',
                            border: '1px solid hsl(var(--border))',
                          }}
                        >
                          {tab.label} · {tab.count}
                        </button>
                      );
                    })}
                    <span className="flex-1" />
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl w-full sm:w-56 transition-shadow focus-within:ring-2 focus-within:ring-[#00C27A]/40"
                      style={{ background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))' }}
                    >
                      <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-faint)' }} aria-hidden="true" />
                      <input
                        value={search}
                        onChange={e => {
                          setSearch(e.target.value);
                          setPage(1);
                        }}
                        placeholder="Filter URLs…"
                        aria-label="Filter discovered URLs"
                        className="w-full bg-transparent border-none text-xs"
                        style={{ color: 'var(--text)', outline: 'none' }}
                      />
                      {search && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearch('');
                            setPage(1);
                          }}
                          className="cursor-pointer"
                          aria-label="Clear search"
                          style={{ color: 'var(--text-faint)' }}
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Compact Table Rows */}
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid hsl(var(--border))', background: 'var(--bg-subtle)' }}
                  >
                    {paginatedUrls.length === 0 ? (
                      <div className="p-6 text-center text-xs font-semibold" style={{ color: 'var(--text-faint)' }}>
                        No URLs match your current filter.
                      </div>
                    ) : (
                      paginatedUrls.map((u, idx) => {
                        const badge = rowPill(u);
                        const hasDetail = u.verdict !== 'Healthy' || u.finalUrl !== u.url;
                        return (
                          <div
                            key={u.url}
                            className="px-3.5 py-2.5 transition-colors"
                            style={{
                              borderTop: idx === 0 ? 'none' : '1px solid hsl(var(--border))',
                            }}
                          >
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span style={pillStyle(badge.color)}>{badge.text}</span>
                              <a
                                href={u.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-mono font-medium truncate max-w-full sm:max-w-[540px] hover:underline"
                                style={{ color: 'var(--text)' }}
                                title={u.url}
                              >
                                {u.url}
                              </a>
                              <span className="flex-1" />
                              <span className="text-[11px] font-mono tabular-nums shrink-0" style={{ color: 'var(--text-faint)' }}>
                                {u.status ? `HTTP ${u.status}` : 'No response'} · {(u.loadMs / 1000).toFixed(1)}s
                              </span>
                            </div>

                            {hasDetail && (
                              <div className="mt-1.5 pl-1 space-y-0.5">
                                {u.verdict !== 'Healthy' && (
                                  <div className="text-xs" style={{ color: 'var(--text-soft)' }}>
                                    {u.detail}
                                  </div>
                                )}
                                {u.finalUrl !== u.url && (
                                  <div className="text-[11px] font-mono truncate" style={{ color: 'var(--text-faint)' }}>
                                    → {u.finalUrl}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Pagination */}
                  {filtered.length > PAGE_SIZE && (
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-xs" style={{ color: 'var(--text-faint)' }}>
                      <span className="font-mono">
                        Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={safePage <= 1}
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))', color: 'var(--text)' }}
                        >
                          <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                          Prev
                        </button>
                        <button
                          type="button"
                          disabled={safePage >= totalPages}
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))', color: 'var(--text)' }}
                        >
                          Next
                          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <p className="text-center pt-2 text-xs" style={{ color: 'var(--text-faint)' }}>
              Want deeper page-by-page diagnostics?{' '}
              <Link to="/audit" className="link-accent-s no-underline hover:underline">
                Run the full site audit →
              </Link>
            </p>
          </div>
        </section>
      )}

      {/* What Does Serpely Sitemap Checker Analyze */}
      <section className="px-4 sm:px-6 py-14">
        <div className="max-w-5xl mx-auto">
          <h2
            className="font-display text-center font-black mb-3"
            style={{ fontSize: 'clamp(1.6rem,3.6vw,2.25rem)', letterSpacing: '-0.03em', color: 'var(--text)' }}
          >
            What Does Serpely Sitemap Checker Analyze?
          </h2>
          <p className="text-center mb-9 text-sm sm:text-base max-w-xl mx-auto" style={{ color: 'var(--text-soft)' }}>
            Six focused checks against XML sitemap specifications and Google Search indexing guidelines.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURE_CARDS.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="card-s p-6">
                  <div className="icon-badge-s mb-4" style={{ color: 'var(--accent-text)' }}>
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-base mb-1.5" style={{ color: 'var(--text)' }}>
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-soft)' }}>
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How the Sitemap Audit Works */}
      <section className="px-4 sm:px-6 py-14" style={{ background: 'var(--bg-subtle)' }}>
        <div className="max-w-5xl mx-auto">
          <h2
            className="font-display text-center font-black mb-3"
            style={{ fontSize: 'clamp(1.6rem,3.6vw,2.25rem)', letterSpacing: '-0.03em', color: 'var(--text)' }}
          >
            How the Sitemap Audit Works
          </h2>
          <p className="text-center mb-10 text-sm sm:text-base" style={{ color: 'var(--text-soft)' }}>
            Verify your XML sitemap health in four quick steps.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AUDIT_STEPS.map(step => (
              <div key={step.n} className="card-s p-6">
                <div
                  className="w-10 h-10 rounded-full inline-flex items-center justify-center font-mono text-sm font-black mb-4"
                  style={{ background: '#00C27A', color: 'var(--accent-on-brand)' }}
                >
                  {step.n}
                </div>
                <h3 className="font-bold text-base mb-1.5" style={{ color: 'var(--text)' }}>
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-soft)' }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div
          className="card-accent-s max-w-5xl mx-auto text-center px-6 py-14 sm:px-12 sm:py-16 relative overflow-hidden"
          style={{ borderRadius: 20 }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(0,194,122,0.12) 0%, rgba(14,165,233,0.06) 50%, transparent 80%)' }}
          />
          <div className="relative z-10">
            <h2
              className="font-display font-black mb-4"
              style={{ fontSize: 'clamp(1.8rem,4.5vw,2.9rem)', letterSpacing: '-0.03em', color: 'var(--text)' }}
            >
              Make Your Sitemap Search-Engine Ready
            </h2>
            <p className="mb-8 mx-auto text-sm sm:text-base max-w-xl leading-relaxed" style={{ color: 'var(--text-soft)' }}>
              Find sitemap errors, improve URL discovery, and keep your XML sitemap technically healthy with Serpely.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="btn-accent-s !px-7 !py-3.5 !text-sm"
              >
                Check Sitemap Now
              </button>
              <Link
                to="/audit"
                className="btn-secondary-s !px-7 !py-3.5 !text-sm no-underline"
              >
                Explore Technical SEO
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
