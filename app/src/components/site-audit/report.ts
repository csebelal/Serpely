/**
 * Maps a real `PublicAuditReport` (the shape returned by
 * `GET /api/public-audit/:shareToken`) onto the view model the redesigned Site
 * Audit page renders.
 *
 * The prototype hardcoded 17 findings, 6 categories and a pile of counts. Here
 * every number and every row comes from the report — nothing is invented. When a
 * value genuinely is not collected we surface `null` and the components show an
 * explicit empty treatment.
 */
import type { PublicAuditIssue, PublicAuditReport } from '@/lib/api';

export type Tone = 'high' | 'medium' | 'low' | 'pass';

export type CategoryId = 'crawl' | 'index' | 'onpage' | 'links' | 'schema' | 'performance';

export interface ReportFinding {
  /** Stable key for React lists. */
  key: string;
  title: string;
  desc: string;
  tone: Tone;
  severityLabel: string;
  typeLabel: string;
  affectedCount: number;
  /** First affected URL, rendered as a path. `null` when the issue has none. */
  affectedExample: string | null;
  /** Every affected URL we can list in the detail drawer. */
  affectedUrls: string[];
  /** A stored sample that is not a URL (bot name, timing, anchor text, …). */
  affectedSample: string | null;
  issue: PublicAuditIssue;
}

export interface ReportCategory {
  id: CategoryId;
  title: string;
  desc: string;
  findings: ReportFinding[];
}

export interface CoverageRow {
  id: CategoryId;
  name: string;
  detail: string;
  state: 'ok' | 'warn' | 'none';
  label: string;
}

export interface AuditViewModel {
  siteTitle: string;
  siteUrl: string;
  /** Real crawl timestamp, straight from `report.createdAt`. */
  generatedAt: Date | null;
  overall: number | null;
  /** Pages actually fetched during the crawl, when the report recorded it. */
  pagesCrawled: number | null;
  /** Pages discovered but not fetched, when the report recorded it. */
  pagesDiscovered: number | null;
  counts: { all: number; high: number; medium: number; low: number; pass: number };
  categories: ReportCategory[];
  /** Categories that actually have findings, in fixed display order. */
  coverage: CoverageRow[];
  /** Issues that were not passed — the ones a user has to act on. */
  actionable: number;
}

const CATEGORY_META: Record<CategoryId, { title: string; desc: string; coverage: string; detail: string }> = {
  crawl: {
    title: 'Crawlability & HTTP status',
    desc: 'Server responses, broken pages, redirect chains and crawl access',
    coverage: 'Crawlability & status codes',
    detail: 'Broken URLs, redirects, response codes',
  },
  index: {
    title: 'Indexing & canonicalization',
    desc: 'Indexability, canonical URLs, robots directives and sitemap consistency',
    coverage: 'Indexing & canonicalization',
    detail: 'Indexability, canonicals, robots directives',
  },
  onpage: {
    title: 'On-page SEO & content',
    desc: 'Page titles, meta descriptions, heading hierarchy and duplicate content',
    coverage: 'On-page SEO',
    detail: 'Titles, descriptions, headings',
  },
  links: {
    title: 'Internal links & site structure',
    desc: 'Internal linking, orphan pages, anchor text and navigation paths',
    coverage: 'Links & site structure',
    detail: 'Internal links and orphan pages',
  },
  schema: {
    title: 'Structured data & AI readiness',
    desc: 'Schema validation and machine-readable content signals',
    coverage: 'Structured data & AI readiness',
    detail: 'Schema markup and content discoverability',
  },
  performance: {
    title: 'Performance & page experience',
    desc: 'Page weight, loading behavior and user experience opportunities',
    coverage: 'Performance & page experience',
    detail: 'Core Web Vitals, page weight, loading',
  },
};

const CATEGORY_ORDER: CategoryId[] = ['crawl', 'index', 'onpage', 'links', 'schema', 'performance'];

/**
 * Route an issue into one of the six display categories.
 *
 * The prototype's categories do not line up 1:1 with the report's own
 * `AuditCategory` values, so we match on the issue code first and fall back to
 * the report category. Both are real data — this is presentation only.
 */
export function bucketFor(issue: PublicAuditIssue): CategoryId {
  const hay = `${issue.code} ${issue.title}`.toLowerCase();
  const has = (re: RegExp) => re.test(hay);
  if (has(/canonical|noindex|indexab|robots|sitemap/)) return 'index';
  if (has(/crawl|404|410|5xx|broken|redirect|status|server|dns|https|ssl|mixed|downtime/)) return 'crawl';
  if (has(/anchor|orphan|inbound|internal|link/)) return 'links';
  if (has(/schema|structured|llms|json-?ld|ai-|citation|geo|extract/)) return 'schema';
  if (has(/lcp|cls|inp|ttfb|fcp|speed|weight|byte|img|image|render|unused|unminified|javascript|\bjs\b|css|font|compress|http2|console|performance|cwv|anim|block/)) {
    return 'performance';
  }
  if (has(/title|meta|desc|thin|heading|alt|content|word|contrast|label|button|aspect/)) return 'onpage';
  // Fall back to the report's own category.
  const fallback: Record<string, CategoryId> = {
    'Technical SEO': 'crawl',
    'Security & HTTPS': 'crawl',
    'Core Web Vitals': 'performance',
    Performance: 'performance',
    Mobile: 'performance',
    Accessibility: 'onpage',
    'On-page content': 'onpage',
    'AI Visibility / GEO': 'schema',
    'AI citation readiness': 'schema',
  };
  return fallback[issue.category] ?? 'crawl';
}

const TYPE_LABELS: Record<string, string> = {
  'site-404': 'Broken links',
  'site-5xx': 'HTTP status',
  'site-canonical': 'Canonical',
  'site-meta-desc': 'Meta description',
  'site-alt': 'Image alt',
  'site-schema': 'Structured data',
  'site-lcp': 'Core Web Vitals',
  'site-llms': 'llms.txt',
  'site-thin': 'Content depth',
  'site-headings': 'Headings',
  'site-ai-blocked': 'AI crawlers',
  'psi-score': 'Performance',
  'psi-lcp': 'LCP',
  'psi-cls': 'CLS',
  'psi-inp': 'INP',
  'psi-ttfb': 'TTFB',
};

export function severityLabelFor(tone: Tone): string {
  if (tone === 'high') return 'Critical';
  if (tone === 'medium') return 'Warning';
  if (tone === 'low') return 'Notice';
  return 'Passed';
}

export function toneFor(issue: PublicAuditIssue): Tone {
  if (issue.passed) return 'pass';
  // Mirrors the way the server builds `summary`: `critical` is the only level
  // reported as Critical, `high` and `medium` both roll up into Warnings, and
  // `low` is a Notice. Keeping them identical is what makes the metric cards
  // agree with `report.summary`.
  if (issue.severity === 'critical') return 'high';
  if (issue.severity === 'high' || issue.severity === 'medium') return 'medium';
  return 'low';
}

/** Path of an absolute URL, or the string itself when it does not parse. */
export function urlPath(url: string): string {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}` || '/';
  } catch {
    return url;
  }
}

/** All affected URLs we can extract from an issue's examples (server caps at 5). */
export function affectedUrls(issue: PublicAuditIssue): string[] {
  const out: string[] = [];
  for (const raw of issue.affected?.examples ?? []) {
    const token = raw.split(/\s+/)[0];
    if (/^https?:\/\//i.test(token)) out.push(token);
  }
  return out;
}

/**
 * The page the homepage-level checks actually ran against.
 *
 * Reports created before the crawl stored an `affected` block for these checks
 * have no per-issue URL, but they were all run against exactly one page — the
 * homepage — so this is the URL that needs the fix.
 */
function checkedHomepage(report: PublicAuditReport): string | null {
  const meta = report.meta as Record<string, string> | undefined;
  const candidates = [meta?.finalUrl, report.normalizedUrl, report.url, report.origin];
  return candidates.find((v) => typeof v === 'string' && /^https?:\/\//i.test(v)) ?? null;
}

/**
 * Crawler-wide checks are the only issues built from the whole crawl (`site-*`
 * codes). Everything else comes from `runChecks`, which inspects the homepage.
 */
const isCrawlWide = (issue: PublicAuditIssue) => issue.code.startsWith('site-');


export function buildAuditViewModel(report: PublicAuditReport): AuditViewModel {
  const issues = Array.isArray(report.issues) ? report.issues : [];
  const homepage = checkedHomepage(report);

  const counts = { all: issues.length, high: 0, medium: 0, low: 0, pass: 0 };
  const grouped = new Map<CategoryId, ReportFinding[]>();

  issues.forEach((issue, index) => {
    const tone = toneFor(issue);
    counts[tone] += 1;
    const bucket = bucketFor(issue);

    // Real URL examples first. When a failing homepage-level check stored none,
    // attach the homepage it was run against so the report never shows a blank
    // "affected" cell for a check that does have a page.
    const storedUrls = affectedUrls(issue);
    const fallbackUrl =
      storedUrls.length === 0 && !issue.passed && !isCrawlWide(issue) ? homepage : null;
    const urls = storedUrls.length > 0 ? storedUrls : fallbackUrl ? [fallbackUrl] : [];
    const storedSample =
      (issue.affected?.examples ?? [])
        .map((e) => e.trim())
        .find((e) => e && !/^https?:\/\//i.test(e.split(/\s+/)[0])) ?? null;

    const finding: ReportFinding = {
      key: `${issue.code}-${index}`,
      title: issue.title,
      desc: issue.evidence || issue.why || '',
      tone,
      severityLabel: severityLabelFor(tone),
      typeLabel: TYPE_LABELS[issue.code] ?? issue.category,
      affectedCount: issue.affected?.count ?? (fallbackUrl ? 1 : 0),
      affectedExample: urls.length > 0 ? urlPath(urls[0]) : null,
      affectedUrls: urls,
      affectedSample: storedSample,
      issue,
    };
    const list = grouped.get(bucket);
    if (list) list.push(finding);
    else grouped.set(bucket, [finding]);
  });

  // Severity first (critical → notice → passed), then title, so the most urgent
  // rows are always at the top of each category.
  const rank: Record<Tone, number> = { high: 0, medium: 1, low: 2, pass: 3 };
  const categories: ReportCategory[] = [];
  for (const id of CATEGORY_ORDER) {
    const findings = grouped.get(id);
    if (!findings || findings.length === 0) continue;
    findings.sort((a, b) => rank[a.tone] - rank[b.tone] || a.title.localeCompare(b.title));
    categories.push({ id, ...CATEGORY_META[id], findings });
  }

  const coverage: CoverageRow[] = CATEGORY_ORDER.map((id) => {
    const findings = grouped.get(id) ?? [];
    const failing = findings.filter((f) => f.tone !== 'pass');
    const critical = failing.filter((f) => f.tone === 'high').length;
    const state: CoverageRow['state'] = critical > 0 ? 'warn' : failing.length > 0 ? 'none' : 'ok';
    const label = critical > 0 ? 'Needs review' : failing.length > 0 ? 'Review recommended' : 'Mostly healthy';
    return { id, name: CATEGORY_META[id].coverage, detail: CATEGORY_META[id].detail, state, label };
  }).filter((row) => (grouped.get(row.id) ?? []).length > 0);

  let siteTitle = report.origin ?? '';
  try {
    const src = report.normalizedUrl || report.url || report.origin || '';
    const host = /^https?:\/\//i.test(src) ? new URL(src).hostname : src;
    siteTitle = host.replace(/^www\./, '') || siteTitle;
  } catch {
    /* keep whatever we had */
  }

  const created = report.createdAt ? new Date(report.createdAt) : null;
  const overall = typeof report.overall === 'number' && report.overall > 0 ? report.overall : null;
  const pagesCrawled = typeof report.pages?.crawled === 'number' ? report.pages.crawled : null;
  const pagesDiscovered = typeof report.pages?.discovered === 'number' ? report.pages.discovered : null;

  return {
    siteTitle,
    siteUrl: report.origin || report.normalizedUrl || report.url || '',
    generatedAt: created && !Number.isNaN(created.getTime()) ? created : null,
    overall,
    pagesCrawled,
    pagesDiscovered,
    counts,
    categories,
    coverage,
    actionable: counts.all - counts.pass,
  };
}

export const CATEGORY_ICON_KEYS = CATEGORY_META;
