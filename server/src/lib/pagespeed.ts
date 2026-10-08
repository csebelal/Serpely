import type { IAuditIssue, AuditCategory, AuditSeverity } from '../models/AuditReport';

export interface PsiScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface PsiField {
  overall?: string; // FAST | AVERAGE | SLOW
  lcpMs?: number;
  cls?: number;
  inpMs?: number;
  ttfbMs?: number;
}

export interface PsiResult {
  score: number; // 0–100, mobile lab (performance)
  lcpMs?: number;
  cls?: number;
  inpMs?: number;
  ttfbMs?: number;
  strategy: string;
  scores?: PsiScores;
  field?: PsiField | null;
  originField?: PsiField | null;
  seoExtra?: SeoExtra[];
}

export interface SeoExtra {
  id: string;
  score: number;
  title: string;
  detail?: string;
}

interface LhrAudit {
  numericValue?: number;
  score?: number | null;
  scoreDisplayMode?: string;
  title?: string;
}

/** Lighthouse SEO + Accessibility audits mapped into our issue categories.
 *  Skips duplicates of our own static checks (title, meta, canonical, alt, lang). */
const SEO_MAP: {
  id: string; code: string; title: string; category: AuditCategory;
  impact: number; severity: AuditSeverity; fix: string;
}[] = [
  { id: 'crawlable-anchors', code: 'psi-crawl-anchors', title: 'Crawlable anchors', category: 'Technical SEO', impact: 3, severity: 'medium', fix: 'Make all links real <a href> anchors — crawlers and AI bots skip JS-only click handlers.' },
  { id: 'hreflang', code: 'psi-hreflang', title: 'Valid hreflang', category: 'Technical SEO', impact: 2, severity: 'low', fix: 'Fix invalid hreflang values; use ISO codes (e.g. en-GB, not en-UK) with self-referencing, reciprocal entries.' },
  { id: 'link-text', code: 'psi-link-text', title: 'Descriptive link text', category: 'AI Visibility / GEO', impact: 3, severity: 'medium', fix: 'Replace generic anchors (“click here”, “read more”) with descriptive, entity-rich link text so AI systems resolve what you reference.' },
  { id: 'robots-txt', code: 'psi-robots-valid', title: 'Valid robots.txt', category: 'AI Visibility / GEO', impact: 3, severity: 'medium', fix: 'Fix robots.txt syntax errors so AI crawlers (GPTBot, PerplexityBot) can parse and honor your allow rules.' },
  { id: 'heading-order', code: 'psi-heading-order', title: 'Logical heading order', category: 'AI Visibility / GEO', impact: 3, severity: 'medium', fix: 'Keep one H1 then sequential H2 → H3 with no skipped levels — AI engines extract answers section-by-section.' },
  { id: 'link-name', code: 'psi-link-name', title: 'Links have discernible names', category: 'AI Visibility / GEO', impact: 2, severity: 'low', fix: 'Give every link readable text or an aria-label — empty/icon-only links give AI systems nothing to cite.' },
  { id: 'font-size', code: 'psi-font-size', title: 'Legible font sizes', category: 'Mobile', impact: 2, severity: 'low', fix: 'Keep body text ≥12px (16px recommended) so mobile content stays readable and indexable.' },
  { id: 'tap-targets', code: 'psi-tap-targets', title: 'Tap targets sized', category: 'Mobile', impact: 3, severity: 'medium', fix: 'Size tap targets ≥48px with ≥8px spacing for mobile usability.' },
  // ── C. AI crawler budget: bots crawl with limited time — slow/broken pages get skipped ──
  { id: 'server-response-time', code: 'psi-server-response', title: 'Fast server response', category: 'Core Web Vitals', impact: 4, severity: 'medium', fix: 'AI crawlers time out on slow servers — cut TTFB with CDN, edge caching and faster hosting.' },
  { id: 'total-byte-weight', code: 'psi-byte-weight', title: 'Light page weight', category: 'Core Web Vitals', impact: 3, severity: 'medium', fix: 'Heavy pages exhaust AI crawler budgets — compress images, drop unused JS/CSS, stay lean.' },
  { id: 'uses-http2', code: 'psi-http2', title: 'HTTP/2 enabled', category: 'Core Web Vitals', impact: 2, severity: 'low', fix: 'Enable HTTP/2 (or HTTP/3) so crawlers fetch your assets in parallel instead of queuing.' },
  { id: 'errors-in-console', code: 'psi-console-errors', title: 'No browser errors', category: 'Technical SEO', impact: 3, severity: 'medium', fix: 'JS console errors can break rendering for crawlers and AI readers — fix them so the page renders clean.' },
];

const PSI_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

function toIssue(
  code: string, title: string, evidence: string, fix: string,
  impact: number, severity: AuditSeverity, effort: 'quick' | 'normal', passed: boolean,
): IAuditIssue {
  return {
    code, category: 'Core Web Vitals' as AuditCategory, severity, title, evidence, fix,
    impact: passed ? 0 : impact, effort, passed,
  };
}

/** Parse Chrome real-user (CrUX) field data defensively — metric key names vary across API versions. */
function parseField(loadingExperience: unknown): PsiField | null {
  if (!loadingExperience || typeof loadingExperience !== 'object') return null;
  const lx = loadingExperience as { overall_category?: unknown; metrics?: Record<string, { percentile?: unknown }> };
  const metrics = lx.metrics ?? {};
  const find = (part: string): number | undefined => {
    const k = Object.keys(metrics).find(k => k.includes(part));
    const v = k ? metrics[k]?.percentile : undefined;
    return typeof v === 'number' ? v : undefined;
  };
  const normCls = (v: number | undefined): number | undefined => {
    if (v === undefined) return undefined;
    // Older API versions report CLS percentile ×100 — normalize back to 0–1 scale.
    const n = v > 1 ? v / 100 : v;
    return Math.round(n * 1000) / 1000;
  };
  const lcp = find('LARGEST_CONTENTFUL_PAINT');
  const clsRaw = find('CUMULATIVE_LAYOUT_SHIFT');
  const inp = find('INTERACTION_TO_NEXT_PAINT') ?? find('FIRST_INPUT_DELAY');
  const ttfb = find('TIME_TO_FIRST_BYTE');
  if (lcp === undefined && clsRaw === undefined && inp === undefined && ttfb === undefined && typeof lx.overall_category !== 'string') {
    return null; // no field data (low-traffic URL)
  }
  return {
    overall: typeof lx.overall_category === 'string' ? lx.overall_category : undefined,
    lcpMs: lcp !== undefined ? Math.round(lcp) : undefined,
    cls: normCls(clsRaw),
    inpMs: inp !== undefined ? Math.round(inp) : undefined,
    ttfbMs: ttfb !== undefined ? Math.round(ttfb) : undefined,
  };
}

/** Real lab metrics via Google PageSpeed Insights. Returns null on any failure (quota, timeout, Lighthouse error) — caller falls back to heuristic. */
export async function fetchPsi(targetUrl: string, apiKey?: string): Promise<PsiResult | null> {
  if (!apiKey) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 55000);
  try {
    const cats = ['performance', 'accessibility', 'best-practices', 'seo'].map(c => `&category=${c}`).join('');
    const u = `${PSI_URL}?url=${encodeURIComponent(targetUrl)}&strategy=mobile${cats}&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(u, { signal: ctrl.signal });
    if (!res.ok) {
      console.error('[psi] HTTP', res.status, (await res.text().catch(() => '')).slice(0, 200));
      return null;
    }
    const j = (await res.json()) as {
      lighthouseResult?: {
        categories?: Record<string, { score?: number }>;
        audits?: Record<string, LhrAudit>;
        runtimeError?: unknown;
      };
      loadingExperience?: unknown;
      originLoadingExperience?: unknown;
    };
    const lhr = j?.lighthouseResult;
    if (!lhr) return null;
    // Lighthouse-run error (e.g. ERRORED / NO_FCP) → treat as unavailable, not as failure.
    if (lhr.runtimeError) {
      console.error('[psi] lighthouse runtimeError');
      return null;
    }
    const num = (id: string): number | undefined => {
      const v = lhr.audits?.[id]?.numericValue;
      return typeof v === 'number' ? v : undefined;
    };
    const cat = (id: string): number | undefined => {
      const v = lhr.categories?.[id]?.score;
      return typeof v === 'number' ? Math.round(v * 100) : undefined;
    };
    const perf = cat('performance') ?? 0;
    const out: PsiResult = {
      score: perf,
      strategy: 'mobile',
      scores: {
        performance: perf,
        accessibility: cat('accessibility') ?? 0,
        bestPractices: cat('best-practices') ?? 0,
        seo: cat('seo') ?? 0,
      },
      field: parseField(j.loadingExperience),
    };
    const lcp = num('largest-contentful-paint');
    if (lcp !== undefined) out.lcpMs = Math.round(lcp);
    const cls = num('cumulative-layout-shift');
    if (cls !== undefined) out.cls = Math.round(cls * 1000) / 1000;
    const inpLab = num('interaction-to-next-paint');
    if (inpLab !== undefined) out.inpMs = Math.round(inpLab);
    // Collect mapped SEO / Accessibility / crawler-budget audits (skip non-binary outcomes).
    const extra: SeoExtra[] = [];
    for (const m of SEO_MAP) {
      const a = lhr.audits?.[m.id];
      if (!a || typeof a.score !== 'number' || typeof a.scoreDisplayMode !== 'string') continue;
      if (['notApplicable', 'informative', 'manual', 'error'].includes(a.scoreDisplayMode)) continue;
      let detail: string | undefined;
      if (m.id === 'server-response-time' && typeof a.numericValue === 'number') {
        detail = `~${Math.round(a.numericValue)}ms server overhead`;
      } else if (m.id === 'total-byte-weight' && typeof a.numericValue === 'number') {
        detail = `~${Math.round(a.numericValue / 1024)}KB transferred`;
      }
      extra.push({ id: m.id, score: a.score, title: typeof a.title === 'string' && a.title ? a.title : m.title, detail });
    }
    out.seoExtra = extra;
    out.originField = parseField(j.originLoadingExperience);
    return out;
  } catch (e) {
    console.error('[psi] fetch failed:', e instanceof Error ? e.message : e);
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Real Core Web Vitals checks from PSI lab data. Skips a check when that metric is missing. */
export function buildPsiIssues(psi: PsiResult): IAuditIssue[] {
  const out: IAuditIssue[] = [];
  out.push(toIssue(
    'psi-score', 'Performance score ≥ 90 (PSI lab)',
    `PSI mobile lab score: ${psi.score}/100`,
    'Fix render-blocking scripts, compress/convert images to WebP/AVIF, preload hero assets, cut unused JS.',
    6, 'high', 'normal', psi.score >= 90,
  ));
  if (psi.lcpMs !== undefined) {
    out.push(toIssue(
      'psi-lcp', 'LCP ≤ 2.5s (PSI lab)',
      `LCP: ${(psi.lcpMs / 1000).toFixed(1)}s (mobile lab)`,
      'Preload LCP image, reduce server response time, remove render-blocking resources above the fold.',
      5, 'high', 'normal', psi.lcpMs <= 2500,
    ));
  }
  if (psi.cls !== undefined) {
    out.push(toIssue(
      'psi-cls', 'CLS ≤ 0.1 (PSI lab)',
      `CLS: ${psi.cls} (mobile lab)`,
      'Set width/height on images and embeds, reserve space for ads/iframes, avoid late-injected content.',
      4, 'high', 'normal', psi.cls <= 0.1,
    ));
  }
  if (psi.inpMs !== undefined) {
    out.push(toIssue(
      'psi-inp', 'INP ≤ 200ms (PSI)',
      `INP: ${psi.inpMs}ms`,
      'Break up long JS tasks, defer non-critical scripts, reduce main-thread blocking.',
      3, 'medium', 'normal', psi.inpMs <= 200,
    ));
  }
  if (psi.ttfbMs !== undefined) {
    out.push(toIssue(
      'psi-ttfb', 'TTFB < 800ms (field)',
      `TTFB: ${psi.ttfbMs}ms (Chrome field data)`,
      'Use CDN + edge caching, faster hosting, cache dynamic HTML where possible.',
      2, 'low', 'normal', psi.ttfbMs < 800,
    ));
  }
  // Google's own SEO / Accessibility verdicts, mapped into our categories.
  for (const m of SEO_MAP) {
    const e = (psi.seoExtra ?? []).find(x => x.id === m.id);
    if (!e) continue;
    const passed = e.score >= 0.9;
    out.push(toIssue(
      m.code, `${m.title} (Google)`,
      `Lighthouse audit "${e.title}": ${passed ? 'pass' : 'fail'} (score ${e.score})${e.detail ? ` — ${e.detail}` : ''}`,
      m.fix, m.impact, m.severity, 'normal', passed,
    ));
  }
  return out;
}
