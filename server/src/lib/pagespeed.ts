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
  source?: 'psi' | 'crux-url' | 'crux-origin';
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
  details?: { items?: unknown[] };
}

const ms = (v: number): string => `~${Math.round(v)}ms`;
const kb = (v: number): string => `~${Math.round(v / 1024)}KB`;

/** Lighthouse SEO / Accessibility / Security / CWV audits mapped into our issue categories.
 *  Skips duplicates of our own static checks (title, meta, canonical, alt, lang, viewport, https). */
const SEO_MAP: {
  id: string; code: string; title: string; category: AuditCategory;
  impact: number; severity: AuditSeverity; fix: string;
  detail?: (v: number, a: LhrAudit) => string;
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
  { id: 'server-response-time', code: 'psi-server-response', title: 'Fast server response', category: 'Core Web Vitals', impact: 4, severity: 'medium', fix: 'AI crawlers time out on slow servers — cut TTFB with CDN, edge caching and faster hosting.', detail: v => `${ms(v)} server overhead` },
  { id: 'total-byte-weight', code: 'psi-byte-weight', title: 'Light page weight', category: 'Core Web Vitals', impact: 3, severity: 'medium', fix: 'Heavy pages exhaust AI crawler budgets — compress images, drop unused JS/CSS, stay lean.', detail: v => `${kb(v)} transferred` },
  { id: 'uses-http2', code: 'psi-http2', title: 'HTTP/2 enabled', category: 'Core Web Vitals', impact: 2, severity: 'low', fix: 'Enable HTTP/2 (or HTTP/3) so crawlers fetch your assets in parallel instead of queuing.' },
  { id: 'errors-in-console', code: 'psi-console-errors', title: 'No browser errors', category: 'Technical SEO', impact: 3, severity: 'medium', fix: 'JS console errors can break rendering for crawlers and AI readers — fix them so the page renders clean.' },
  // ── D. Wasted bytes & blocking work (lab-measured savings) ──
  { id: 'render-blocking-resources', code: 'psi-render-blocking', title: 'No render-blocking resources', category: 'Core Web Vitals', impact: 4, severity: 'medium', fix: 'Defer non-critical scripts, inline critical CSS — every blocked millisecond delays content and crawler rendering.', detail: v => `${ms(v)} render delay` },
  { id: 'unused-javascript', code: 'psi-unused-js', title: 'No unused JavaScript', category: 'Core Web Vitals', impact: 3, severity: 'medium', fix: 'Ship only the JS each page needs — split bundles, tree-shake, drop dead dependencies.', detail: v => `${kb(v)} unused` },
  { id: 'unminified-css', code: 'psi-unminified-css', title: 'Minified CSS', category: 'Core Web Vitals', impact: 2, severity: 'low', fix: 'Minify stylesheets in the build step to shave bytes off every visit.', detail: v => `${kb(v)} minifiable` },
  { id: 'unminified-javascript', code: 'psi-unminified-js', title: 'Minified JavaScript', category: 'Core Web Vitals', impact: 2, severity: 'low', fix: 'Minify scripts in the build step to shave bytes off every visit.', detail: v => `${kb(v)} minifiable` },
  { id: 'modern-image-formats', code: 'psi-modern-images', title: 'Modern image formats', category: 'Core Web Vitals', impact: 3, severity: 'medium', fix: 'Serve WebP/AVIF with JPEG/PNG fallback — typically 25–35% smaller for the same quality.', detail: v => `${kb(v)} savable with WebP/AVIF` },
  { id: 'uses-responsive-images', code: 'psi-responsive-images', title: 'Responsive images for every screen', category: 'Mobile', impact: 2, severity: 'low', fix: 'Use srcset/sizes so phones download small images instead of desktop-sized files.', detail: v => `${kb(v)} savable with responsive sizes` },
  { id: 'uses-optimized-images', code: 'psi-optimized-images', title: 'Compressed images', category: 'Core Web Vitals', impact: 3, severity: 'medium', fix: 'Run images through a compressor (Squoosh, Sharp, image CDN) at quality ~80.', detail: v => `${kb(v)} savable with compression` },
  { id: 'efficient-animated-content', code: 'psi-efficient-anim', title: 'Efficient animations', category: 'Core Web Vitals', impact: 2, severity: 'low', fix: 'Replace animated GIFs with muted looping video — far smaller and GPU-friendly.', detail: v => `${kb(v)} savable with video` },
  { id: 'font-display', code: 'psi-font-display', title: 'Fonts show text fast', category: 'Core Web Vitals', impact: 2, severity: 'low', fix: 'Add font-display: swap so text appears instantly instead of invisible blank text.', detail: v => `${ms(v)} invisible text` },
  { id: 'uses-text-compression', code: 'psi-text-compression', title: 'Text compression enabled', category: 'Core Web Vitals', impact: 3, severity: 'medium', fix: 'Enable gzip or Brotli for text assets on the server/CDN.', detail: v => `${kb(v)} savable with gzip/Brotli` },
  { id: 'redirects', code: 'psi-redirects', title: 'No redirect chains', category: 'Technical SEO', impact: 2, severity: 'low', fix: 'Link directly to final URLs — every redirect hop costs time and leaks a little link equity.', detail: v => `${ms(v)} lost to redirects` },
  // ── E. Accessibility (mobile users and AI readers hit these hardest) ──
  { id: 'color-contrast', code: 'psi-contrast', title: 'Readable text contrast', category: 'Mobile', impact: 3, severity: 'medium', fix: 'Raise text/background contrast to 4.5:1+ so content stays readable in sunlight and for low-vision users.' },
  { id: 'label', code: 'psi-form-labels', title: 'Labeled form fields', category: 'Mobile', impact: 2, severity: 'low', fix: 'Give every input a visible <label> — screen readers and autofill depend on it.' },
  { id: 'button-name', code: 'psi-button-names', title: 'Buttons have names', category: 'Mobile', impact: 2, severity: 'low', fix: 'Give icon-only buttons discernible text or aria-labels so assistive tech can announce them.' },
  { id: 'image-aspect-ratio', code: 'psi-img-ratio', title: 'Images keep aspect ratio', category: 'Core Web Vitals', impact: 2, severity: 'low', fix: 'Set width/height or aspect-ratio on images so layout does not jump while they load.' },
  { id: 'notification-on-start', code: 'psi-no-notif-spam', title: 'No permission prompts on load', category: 'Mobile', impact: 1, severity: 'low', fix: 'Ask for notifications only after a user gesture — on-load prompts drive visitors away.' },
  { id: 'geolocation-on-start', code: 'psi-no-geo-spam', title: 'No location prompts on load', category: 'Mobile', impact: 1, severity: 'low', fix: 'Request geolocation only when the user triggers a location feature.' },
  // ── F. Security signals from the lab ──
  { id: 'js-libraries', code: 'psi-js-libs', title: 'No vulnerable JavaScript libraries', category: 'Security & HTTPS', impact: 5, severity: 'high', fix: 'Update every flagged front-end library to a patched version — known CVEs get exploited automatically.', detail: (_v, a) => `${a.details?.items?.length ?? 0} third-party libraries found — update any flagged versions` },
  { id: 'password-inputs-can-be-pasted', code: 'psi-paste-password', title: 'Password paste allowed', category: 'Security & HTTPS', impact: 2, severity: 'low', fix: 'Blocking paste pushes users toward weak, memorable passwords — allow password managers to work.' },
  { id: 'external-anchors-use-rel', code: 'psi-external-rel', title: 'Safe external links', category: 'Security & HTTPS', impact: 3, severity: 'medium', fix: 'Add rel="noopener" to target=_blank links so opened pages cannot hijack the original tab.' },
];

const PSI_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

function toIssue(
  code: string, title: string, evidence: string, fix: string,
  impact: number, severity: AuditSeverity, effort: 'quick' | 'normal', passed: boolean,
  category: AuditCategory = 'Core Web Vitals',
): IAuditIssue {
  return {
    code, category, severity, title, evidence, fix,
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

export type PsiStrategy = 'mobile' | 'desktop';

export interface PsiRawPayload {
  lighthouseResult: Record<string, unknown>;
  /** Field data (CrUX) for the requested URL, as returned by PSI. */
  loadingExperience?: Record<string, unknown> | null;
  /** Field data (CrUX) aggregated to the origin. */
  originLoadingExperience?: Record<string, unknown> | null;
  analysisUTCTimestamp?: string;
}

/**
 * Raw PSI payload for the redesigned audit UI.
 *
 * `fetchPsi` reduces the response to a handful of numbers; the redesign needs the
 * whole Lighthouse result (audits, diagnostics, timings) plus the CrUX field-data
 * blocks. Kept separate so the existing scoring path is untouched.
 *
 * Returns null on quota/timeout/runtime errors. Never call this with an
 * unvalidated URL — see the `/api/public-audit/:id/psi` route, which only allows
 * URLs already present in the report.
 */
export async function fetchPsiRaw(
  targetUrl: string,
  strategy: PsiStrategy = 'mobile',
  apiKey?: string,
): Promise<PsiRawPayload | null> {
  if (!apiKey) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 55000);
  try {
    const cats = ['performance', 'accessibility', 'best-practices', 'seo'].map(c => `&category=${c}`).join('');
    const u = `${PSI_URL}?url=${encodeURIComponent(targetUrl)}&strategy=${strategy}${cats}&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(u, { signal: ctrl.signal });
    if (!res.ok) {
      console.error('[psi-raw] HTTP', res.status, (await res.text().catch(() => '')).slice(0, 200));
      return null;
    }
    const j = (await res.json()) as {
      lighthouseResult?: Record<string, unknown>;
      loadingExperience?: Record<string, unknown> | null;
      originLoadingExperience?: Record<string, unknown> | null;
      analysisUTCTimestamp?: string;
    };
    const lhr = j?.lighthouseResult;
    if (!lhr) return null;
    if (lhr.runtimeError) {
      console.error('[psi-raw] lighthouse runtimeError');
      return null;
    }
    return {
      lighthouseResult: lhr,
      loadingExperience: j.loadingExperience ?? null,
      originLoadingExperience: j.originLoadingExperience ?? null,
      analysisUTCTimestamp: j.analysisUTCTimestamp,
    };
  } catch (e) {
    console.error('[psi-raw] failed', (e as Error)?.message);
    return null;
  } finally {
    clearTimeout(t);
  }
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
    const field = parseField(j.loadingExperience);
    const out: PsiResult = {
      score: perf,
      strategy: 'mobile',
      scores: {
        performance: perf,
        accessibility: cat('accessibility') ?? 0,
        bestPractices: cat('best-practices') ?? 0,
        seo: cat('seo') ?? 0,
      },
      field,
    };
    // Phase B: field TTFB was parsed but never exposed — copy it up so the
    // server-response check below uses real-visitor data instead of never firing.
    if (field?.ttfbMs !== undefined) out.ttfbMs = field.ttfbMs;
    const lcp = num('largest-contentful-paint');
    if (lcp !== undefined) out.lcpMs = Math.round(lcp);
    const cls = num('cumulative-layout-shift');
    if (cls !== undefined) out.cls = Math.round(cls * 1000) / 1000;
    const inpLab = num('interaction-to-next-paint');
    if (inpLab !== undefined) out.inpMs = Math.round(inpLab);
    // Collect mapped audits (skip non-binary outcomes).
    const extra: SeoExtra[] = [];
    for (const m of SEO_MAP) {
      const a = lhr.audits?.[m.id];
      if (!a || typeof a.score !== 'number' || typeof a.scoreDisplayMode !== 'string') continue;
      if (['notApplicable', 'informative', 'manual', 'error'].includes(a.scoreDisplayMode)) continue;
      let detail: string | undefined;
      if (typeof a.numericValue === 'number' && m.detail) {
        detail = m.detail(a.numericValue, a);
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
  // score < 0 = synthetic result (PSI unavailable, field data only) — no lab verdict.
  if (psi.score >= 0) {
    out.push(toIssue(
      'psi-score', 'Speed score of 90+ (phone test)',
      `Phone speed test score: ${psi.score}/100`,
      'Fix render-blocking scripts, compress/convert images to WebP/AVIF, preload hero assets, cut unused JS.',
      6, 'high', 'normal', psi.score >= 90,
    ));
  }
  if (psi.lcpMs !== undefined) {
    out.push(toIssue(
      'psi-lcp', 'Main content shows within 2.5s',
      `Shows after ${(psi.lcpMs / 1000).toFixed(1)}s on a phone test`,
      'Preload the main image, reduce server response time, remove render-blocking resources above the fold.',
      5, 'high', 'normal', psi.lcpMs <= 2500,
    ));
  }
  if (psi.cls !== undefined) {
    out.push(toIssue(
      'psi-cls', 'Page stays stable while loading',
      `Layout shift score: ${psi.cls} on a phone test`,
      'Set width/height on images and embeds, reserve space for ads/iframes, avoid late-injected content.',
      4, 'high', 'normal', psi.cls <= 0.1,
    ));
  }
  if (psi.inpMs !== undefined) {
    out.push(toIssue(
      'psi-inp', 'Page reacts to taps within 0.2s',
      `Reaction delay: ${psi.inpMs}ms`,
      'Break up long JS tasks, defer non-critical scripts, reduce main-thread blocking.',
      3, 'medium', 'normal', psi.inpMs <= 200,
    ));
  }
  if (psi.ttfbMs !== undefined) {
    out.push(toIssue(
      'psi-ttfb', 'Server answers within 0.8s',
      `Server response: ${psi.ttfbMs}ms (measured from real visitors)`,
      'Use CDN + edge caching, faster hosting, cache dynamic HTML where possible.',
      2, 'low', 'normal', psi.ttfbMs < 800,
    ));
  }
  // Phase B: CrUX field data — what real visitors experience (not lab simulation).
  // Only emitted when Chrome has enough traffic for this URL/origin.
  const f = psi.field;
  if (f && (f.lcpMs !== undefined || f.cls !== undefined || f.inpMs !== undefined)) {
    const scope = f.source === 'crux-origin' ? ' (site-wide origin average)' : '';
    if (f.lcpMs !== undefined) {
      out.push(toIssue(
        'psi-field-lcp', 'Real visitors see content within 2.5s',
        `Real-user LCP: ${(f.lcpMs / 1000).toFixed(1)}s${f.overall ? ` (Chrome rates this URL ${f.overall})` : ''}${scope}`,
        'Lab looks fine but users disagree — check slow geographies/devices, heavy ads, uncached HTML.',
        5, 'high', 'normal', f.lcpMs <= 2500, 'Performance',
      ));
    }
    if (f.cls !== undefined) {
      out.push(toIssue(
        'psi-field-cls', 'Real visitors see a stable page',
        `Real-user CLS: ${f.cls}${scope}`,
        'Reserve space for images/ads/embeds (width/height or aspect-ratio) so late loads never shift content.',
        4, 'high', 'normal', f.cls <= 0.1, 'Performance',
      ));
    }
    if (f.inpMs !== undefined) {
      out.push(toIssue(
        'psi-field-inp', 'Real visitors get fast taps',
        `Real-user interaction delay: ${f.inpMs}ms${scope}`,
        'Break up long JS tasks and defer third-party scripts that block the main thread on real devices.',
        3, 'medium', 'normal', f.inpMs <= 200, 'Performance',
      ));
    }
  }
  // Google's own SEO / Accessibility verdicts, mapped into our categories.
  for (const m of SEO_MAP) {
    const e = (psi.seoExtra ?? []).find(x => x.id === m.id);
    if (!e) continue;
    const passed = e.score >= 0.9;
    out.push(toIssue(
      m.code, m.title,
      `Google's own check "${e.title}": ${passed ? 'passed' : 'needs work'}${e.detail ? ` — ${e.detail}` : ''}`,
      m.fix, m.impact, m.severity, 'normal', passed, m.category,
    ));
  }
  return out;
}
