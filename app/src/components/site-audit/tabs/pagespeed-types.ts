/**
 * PageSpeed Insights tab — the data contract consumed by `PageSpeedTab.tsx`,
 * plus the two producers that fill it.
 *
 * The shape mirrors the object the prototype's `genPageSpeedData(url, strategy)`
 * returned (its keys are the contract), but every leaf is nullable: in
 * production the values come from a real PageSpeed Insights v5 response and may
 * be absent for a given URL. The adapter never fabricates a number — a missing
 * field becomes `null` and the tab renders its explicit "—" treatment.
 *
 * Two producers implement the contract:
 *  - `pagespeedFromLighthouse()` — real data, from a PSI v5 response.
 *  - `pagespeedMock()`            — DEV-only deterministic fixture, a faithful
 *                                   port of the prototype's `genPageSpeedData`.
 *
 * Normalization note: the prototype keyed its CrUX metrics by the API's
 * SCREAMING_CASE names (`loadingExperience.metrics.LARGEST_CONTENTFUL_PAINT`).
 * Here they are keyed by the canonical `CruxMetricId` ('lcp' | 'inp' | 'fcp' |
 * 'cls') so the shared `charts.tsx` helpers (`psClassify`, `formatMetric`) can
 * be reused verbatim — they take those ids, not the API names.
 */
import type { CruxMetricId, TinyBuckets } from '../charts';

export type PsStrategy = 'mobile' | 'desktop';

/** One Lighthouse category (Performance / Accessibility / Best Practices / SEO). */
export interface PsCategoryScore {
  /** Lighthouse's 0..1 score, or null when the category was not run. */
  score: number | null;
  title: string | null;
}

export interface PsCategories {
  performance: PsCategoryScore;
  accessibility: PsCategoryScore;
  'best-practices': PsCategoryScore;
  seo: PsCategoryScore;
}

/** One real-user (CrUX) metric: p75 percentile + good/needs/poor densities. */
export interface PsFieldMetric {
  percentile: number | null;
  /** Bucket densities 0..1, or null when the API returned no distribution. */
  buckets: TinyBuckets | null;
}

export interface PsFieldData {
  metrics: Partial<Record<CruxMetricId, PsFieldMetric>>;
}

/** One raw Lighthouse audit, normalized. Every field is nullable. */
export interface PsLabMetric {
  numericValue: number | null;
  /** Lighthouse's 0..1 score (null for informational audits). */
  score: number | null;
  /** Lighthouse's own human-readable value, e.g. "2.4 s" / "412 KB". */
  displayValue: string | null;
  /** Lighthouse's prose explanation of the audit (markdown stripped). */
  description: string | null;
  /** Sum of the audit's `metricSavings` map, when present (ms). */
  metricSavings: number | null;
  scoreDisplayMode: string | null;
  title: string | null;
}

export interface PsOpportunity {
  id: string;
  title: string;
  /** Estimated savings in ms (`details.overallSavingsMs`). */
  savings: number;
}

export interface PsDiagnostic {
  id: string;
  title: string;
  /** Lighthouse `displayValue` — free text, e.g. "412 KB" / "1,247 nodes". */
  value: string;
  /** Key into `PS_ICONS`; `gauge` is the fallback. */
  icon: string;
}

export interface PsPassedAudit {
  title: string;
  desc: string | null;
}

export interface PageSpeedTabData {
  /** `configSettings.formFactor` — which strategy Lighthouse ran. */
  formFactor: PsStrategy | null;
  /** The strategy the payload was produced with. */
  strategy: PsStrategy | null;
  timing: { total: number | null };
  finalUrl: string | null;
  finalDisplayedUrl: string | null;
  requestedUrl: string | null;
  /** Number of redirect hops, when derivable. */
  redirects: number | null;
  isHttps: boolean | null;
  runtimeError: string | null;
  /** Lighthouse `fetchTime` (ISO-8601) — drives the "Last audit" meta. */
  fetchTime: string | null;
  /** Data-URI of the rendered screenshot. */
  screenshot: string | null;
  categories: PsCategories;
  /** CrUX field data (top-level `loadingExperience`); null when unavailable. */
  loadingExperience: PsFieldData | null;
  lighthouseResult: { audits: Record<string, PsLabMetric> };
  opportunities: PsOpportunity[];
  diagnostics: PsDiagnostic[];
  passedAudits: PsPassedAudit[];
}

/* -------------------------------------------------------------------------- */
/* Defensive accessors — nothing here ever invents a value                    */
/* -------------------------------------------------------------------------- */

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

/** True only for the two values Lighthouse's `configSettings.formFactor` can take. */
function asStrategy(v: unknown): PsStrategy | null {
  return v === 'mobile' || v === 'desktop' ? v : null;
}

/**
 * CrUX reports the CLS percentile on a 0..1 scale in current API versions and
 * on a ×100 scale in older ones. Same normalization the server already applies
 * (`server/src/lib/psi` → `parseField.normCls`): >1 means ×100.
 */
function normalizeClsPercentile(v: number | null): number | null {
  if (v === null) return null;
  const n = v > 1 ? v / 100 : v;
  return Math.round(n * 1000) / 1000;
}

/** CrUX returns three ordered distributions (good / needs-improvement / poor). */
function bucketsFromDistributions(v: unknown): TinyBuckets | null {
  if (!Array.isArray(v) || v.length < 3) return null;
  const props = v.slice(0, 3).map((d) => num(asRecord(d)?.proportion));
  const [good, needs, poor] = props;
  if (good === null || needs === null || poor === null) return null;
  return { good, needs, poor };
}

/** `overallSavingsMs` when present, otherwise the sum of the `metricSavings` map. */
function savingsOf(audit: Record<string, unknown> | null): number | null {
  const details = asRecord(audit?.details);
  const overall = num(details?.overallSavingsMs);
  if (overall !== null) return Math.round(overall);
  const map = asRecord(audit?.metricSavings);
  if (!map) return null;
  let sum = 0;
  let found = false;
  for (const v of Object.values(map)) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      sum += v;
      found = true;
    }
  }
  return found ? Math.round(sum) : null;
}

/** Data-URI of the rendered screenshot (`final-screenshot`, then `full-page-screenshot`). */
function screenshotData(audits: Record<string, unknown>): string | null {
  const finalDetails = asRecord(asRecord(audits['final-screenshot'])?.details);
  const direct = str(finalDetails?.data);
  if (direct) return direct;
  const fullDetails = asRecord(asRecord(audits['full-page-screenshot'])?.details);
  const shot = fullDetails?.screenshot;
  const fromString = str(shot);
  if (fromString) return fromString;
  return str(asRecord(shot)?.data);
}

/** UI decoration only — a presentation icon per known diagnostic audit id. */
const DIAGNOSTIC_ICONS: Record<string, string> = {
  'total-byte-weight': 'weight',
  'dom-size': 'tree',
  'mainthread-work-breakdown': 'cpu',
  'bootup-time': 'cpu',
  'uses-long-cache-ttl': 'clock',
  'font-display': 'font',
  'network-requests': 'tree',
  'network-rtt': 'clock',
  'network-server-latency': 'clock',
  'critical-request-chains': 'gauge',
  'largest-contentful-paint-element': 'gauge',
  'layout-shift-elements': 'gauge',
  'third-party-summary': 'tree',
  'uses-rel-preconnect': 'gauge',
  redirects: 'redirect',
  'unminified-css': 'weight',
  'unminified-javascript': 'weight',
  'legacy-javascript': 'weight',
  'server-response-time': 'clock',
};

/**
 * Strip the light markdown Lighthouse puts in audit descriptions so the copy
 * reads as plain text in the drawer. No wording is added or removed.
 */
function plainText(v: string | null): string | null {
  if (!v) return null;
  const s = v
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return s.length > 0 ? s : null;
}

/** Trailing-slash/hash-insensitive URL comparison, for the redirect fallback. */
function sameUrl(a: string, b: string): boolean {
  const strip = (u: string): string => u.replace(/#.*$/, '').replace(/\/+$/, '');
  return strip(a) === strip(b);
}

function emptyCategories(): PsCategories {
  return {
    performance: { score: null, title: null },
    accessibility: { score: null, title: null },
    'best-practices': { score: null, title: null },
    seo: { score: null, title: null },
  };
}

/** An all-null payload — what the tab renders for "not collected". */
export function emptyPageSpeedData(): PageSpeedTabData {
  return {
    formFactor: null,
    strategy: null,
    timing: { total: null },
    finalUrl: null,
    finalDisplayedUrl: null,
    requestedUrl: null,
    redirects: null,
    isHttps: null,
    runtimeError: null,
    fetchTime: null,
    screenshot: null,
    categories: emptyCategories(),
    loadingExperience: null,
    lighthouseResult: { audits: {} },
    opportunities: [],
    diagnostics: [],
    passedAudits: [],
  };
}

/* -------------------------------------------------------------------------- */
/* Real data — PageSpeed Insights v5                                          */
/* -------------------------------------------------------------------------- */

/**
 * Build the tab payload from a real PageSpeed Insights v5 response.
 *
 * Accepts either the whole PSI response (`{ lighthouseResult, loadingExperience,
 * originLoadingExperience }`) or a bare `lighthouseResult`. Field data only
 * exists at the top level of the PSI response, so pass the whole response when
 * you have it. Anything unrecognized yields an all-null payload rather than an
 * exception, and no field is ever defaulted to a number.
 */
export function pagespeedFromLighthouse(lighthouseResult: unknown): PageSpeedTabData {
  const root = asRecord(lighthouseResult);
  if (!root) return emptyPageSpeedData();

  const lhr = asRecord(root.lighthouseResult) ?? root;
  const out = emptyPageSpeedData();

  if (!lhr) return out;

  const auditsRaw = asRecord(lhr.audits) ?? {};
  const auditById = (id: string): Record<string, unknown> | null => asRecord(auditsRaw[id]);

  /* URL facts ------------------------------------------------------------- */
  const finalUrl = str(lhr.finalUrl);
  const finalDisplayedUrl = str(lhr.finalDisplayedUrl);
  const requestedUrl = str(lhr.requestedUrl);
  out.finalUrl = finalUrl;
  out.finalDisplayedUrl = finalDisplayedUrl;
  out.requestedUrl = requestedUrl;
  out.fetchTime = str(lhr.fetchTime);

  const protocolOf = (u: string | null): string | null => {
    if (!u) return null;
    try {
      return new URL(u).protocol;
    } catch {
      return null;
    }
  };
  const protocol = protocolOf(finalUrl) ?? protocolOf(requestedUrl);
  out.isHttps = protocol === null ? null : protocol === 'https:';

  /* Redirect hops: the `redirects` audit lists each hop. When that audit has no
     item list (it is `notApplicable` when nothing redirected) we can still say
     "zero" only if Lighthouse confirmed it ended on the URL it was asked for. */
  const redirectItems = asRecord(auditById('redirects')?.details)?.items;
  if (Array.isArray(redirectItems)) {
    out.redirects = redirectItems.length;
  } else if (finalUrl !== null && requestedUrl !== null && sameUrl(finalUrl, requestedUrl)) {
    out.redirects = 0;
  }

  /* Runtime error --------------------------------------------------------- */
  const runtimeError = asRecord(lhr.runtimeError);
  if (runtimeError) {
    out.runtimeError = str(runtimeError.code) ?? str(runtimeError.message) ?? 'runtimeError';
  }

  /* Lighthouse run metadata ---------------------------------------------- */
  out.formFactor = asStrategy(asRecord(lhr.configSettings)?.formFactor);
  out.strategy = out.formFactor;
  out.timing = { total: num(asRecord(lhr.timing)?.total) };
  out.screenshot = screenshotData(auditsRaw);

  /* Categories ------------------------------------------------------------ */
  const categories = asRecord(lhr.categories);
  const categoriesOut = emptyCategories();
  for (const key of Object.keys(categoriesOut) as (keyof PsCategories)[]) {
    const cat = asRecord(categories?.[key]);
    categoriesOut[key] = { score: num(cat?.score), title: str(cat?.title) };
  }
  out.categories = categoriesOut;

  /* Every audit, normalized ---------------------------------------------- */
  const audits: Record<string, PsLabMetric> = {};
  for (const [id, raw] of Object.entries(auditsRaw)) {
    const a = asRecord(raw);
    audits[id] = {
      numericValue: num(a?.numericValue),
      score: num(a?.score),
      displayValue: str(a?.displayValue),
      description: plainText(str(a?.description)),
      metricSavings: savingsOf(a),
      scoreDisplayMode: str(a?.scoreDisplayMode),
      title: str(a?.title),
    };
  }
  out.lighthouseResult = { audits };

  /* Opportunities — audits that expose `details.type === 'opportunity'` and a
     positive estimated saving. Sorted by impact, like the prototype. */
  for (const [id, raw] of Object.entries(auditsRaw)) {
    const a = asRecord(raw);
    if (asRecord(a?.details)?.type !== 'opportunity') continue;
    const score = num(a?.score);
    if (score !== null && score >= 1) continue;
    const savings = savingsOf(a);
    if (savings === null || savings <= 0) continue;
    out.opportunities.push({ id, title: str(a?.title) ?? id, savings });
  }
  out.opportunities.sort((a, b) => b.savings - a.savings);

  const opportunityIds = new Set(out.opportunities.map((o) => o.id));

  /* Passed audits — audits Lighthouse scored exactly 1.
     `notApplicable`, `manual` and `error` audits are neither passed nor
     diagnostics: they carry no verdict about this page, so they are dropped. */
  for (const id of Object.keys(audits)) {
    if (opportunityIds.has(id)) continue;
    const audit = audits[id];
    if (audit.score !== 1) continue;
    out.passedAudits.push({ title: audit.title ?? id, desc: audit.description });
  }

  /* Diagnostics — informational audits that report a displayValue but offer no
     estimated savings. */
  for (const id of Object.keys(audits)) {
    if (opportunityIds.has(id)) continue;
    const audit = audits[id];
    const mode = audit.scoreDisplayMode;
    if (mode === null || mode === 'notApplicable' || mode === 'manual' || mode === 'error') continue;
    if (audit.score === 1) continue;
    if (asRecord(auditById(id)?.details)?.type === 'opportunity') continue;
    const value = audit.displayValue;
    if (value === null) continue;
    out.diagnostics.push({ id, title: audit.title ?? id, value, icon: DIAGNOSTIC_ICONS[id] ?? 'gauge' });
  }

  /* Field data (CrUX) ---------------------------------------------------- */
  const loadingExperience = asRecord(root.loadingExperience) ?? asRecord(lhr.loadingExperience);
  const leMetrics = asRecord(loadingExperience?.metrics);
  if (leMetrics) {
    const keys = Object.keys(leMetrics);
    const pick = (part: string): Record<string, unknown> | null => {
      const key = keys.find((k) => k.includes(part));
      return key ? asRecord(leMetrics[key]) : null;
    };
    const fieldMetric = (parts: string[], cls: boolean): PsFieldMetric => {
      let raw: Record<string, unknown> | null = null;
      for (const part of parts) {
        raw = pick(part);
        if (raw) break;
      }
      if (!raw) return { percentile: null, buckets: null };
      const percentile = num(raw.percentile);
      return {
        percentile: cls ? normalizeClsPercentile(percentile) : percentile,
        buckets: bucketsFromDistributions(raw.distributions),
      };
    };
    out.loadingExperience = {
      metrics: {
        lcp: fieldMetric(['LARGEST_CONTENTFUL_PAINT'], false),
        inp: fieldMetric(['INTERACTION_TO_NEXT_PAINT', 'FIRST_INPUT_DELAY'], false),
        fcp: fieldMetric(['FIRST_CONTENTFUL_PAINT'], false),
        cls: fieldMetric(['CUMULATIVE_LAYOUT_SHIFT'], true),
      },
    };
  }

  /* Passed-audit descriptions come from Lighthouse's own `description`. */

  return out;
}

/* -------------------------------------------------------------------------- */
/* DEV-only mock — faithful port of the prototype's `genPageSpeedData`         */
/* -------------------------------------------------------------------------- */

/** Prototype's djb2-ish string hash (lines 2830-2834). */
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const MOCK_OPPORTUNITIES: { id: string; title: string; base: number; spread: number }[] = [
  { id: 'render-blocking-resources', title: 'Eliminate render-blocking resources', base: 1240, spread: 800 },
  { id: 'unused-css-rules', title: 'Remove unused CSS', base: 540, spread: 700 },
  { id: 'unused-javascript', title: 'Remove unused JavaScript', base: 780, spread: 900 },
  { id: 'modern-image-formats', title: 'Serve images in next-gen formats', base: 410, spread: 600 },
  { id: 'uses-optimized-images', title: 'Efficiently encode images', base: 280, spread: 500 },
  { id: 'uses-text-compression', title: 'Enable text compression', base: 150, spread: 400 },
  { id: 'preconnect-required', title: 'Preconnect to required origins', base: 90, spread: 200 },
];

const MOCK_PASSED_AUDITS: { title: string; desc: string }[] = [
  { title: 'Uses HTTPS', desc: 'All resources loaded over a secure transport.' },
  { title: 'Uses HTTP/2', desc: 'Server supports multiplexed connections.' },
  { title: 'Image aspect-ratio', desc: 'All images declare explicit width and height.' },
  { title: 'Avoids enormous content size', desc: 'Page weight falls within typical range.' },
  { title: 'Document title', desc: 'Title element is present and non-empty.' },
  { title: 'Meta description', desc: 'Page has a meta description.' },
  { title: 'Viewport meta tag', desc: 'Mobile viewport is properly configured.' },
  { title: 'Valid hreflang tags', desc: 'No hreflang errors detected.' },
  { title: 'Valid robots.txt', desc: 'Crawl directives parse without errors.' },
  { title: 'Descriptive anchor text', desc: 'No generic "click here" anchors.' },
  { title: 'Mobile friendly', desc: 'Lays out within the configured viewport.' },
  { title: 'No console errors', desc: 'No JavaScript errors logged on load.' },
  { title: 'Responsive images', desc: 'srcset provides appropriate sizes.' },
  { title: 'Crawlable anchors', desc: 'All internal anchors use <a href>.' },
  { title: 'No broken external links', desc: 'All outbound links return 2xx.' },
  { title: 'Structured data is valid', desc: 'JSON-LD parses with zero errors.' },
];

function mockLabAudit(numericValue: number, score: number): PsLabMetric {
  return {
    numericValue,
    score,
    displayValue: null,
    description: null,
    metricSavings: null,
    scoreDisplayMode: 'numeric',
    title: null,
  };
}

/**
 * Deterministic PageSpeed fixture, a line-for-line port of the prototype's
 * `genPageSpeedData(url, strategy)`. DEV-only — never call this in a real
 * data path (it fabricates numbers by design).
 */
export function pagespeedMock(url: string, strategy: PsStrategy = 'mobile'): PageSpeedTabData {
  const salt = strategy === 'desktop' ? '|desktop' : '|mobile';
  const seed = hashStr(`${url}|pagespeed${salt}`);
  /* Desktop tends to render better numbers — the boost makes the toggle visible. */
  const desktopBoost = strategy === 'desktop' ? 0.1 : 0;
  const fboost = (v: number): number => (strategy === 'desktop' ? Math.max(0.4, v * 0.85) : v);

  /* 4 category scores: range 0.45–0.99 (desktop bumped up by ~10%) */
  const perf = Math.min(0.99, 0.45 + (seed % 55) / 100 + desktopBoost);
  const a11y = Math.min(0.99, 0.55 + (seed % 45) / 100 + desktopBoost * 0.6);
  const bp = Math.min(0.99, 0.5 + (seed % 49) / 100 + desktopBoost * 0.5);
  const seo = Math.min(0.99, 0.65 + (seed % 35) / 100 + desktopBoost * 0.3);

  /* Field data (CrUX real-user p75): LCP 1800-4500, INP 100-350, FCP 1400-3200, CLS 0.05-0.25 */
  const lcpMs = fboost(1800 + (seed % 2701));
  const inpMs = fboost(100 + ((seed >> 3) % 251));
  const fcpMs = fboost(1400 + ((seed >> 5) % 1801));
  const clsVal = Number(
    Math.max(0.03, 0.05 + ((seed >> 7) % 21) / 100 - (strategy === 'desktop' ? 0.03 : 0)).toFixed(3),
  );

  /* Histogram bucket helper: 3 densities {good,needs,poor} summing to ~1.0 */
  const buckets = (p75: number, goodMax: number, poorMin: number): TinyBuckets => {
    let good: number;
    let poor: number;
    if (p75 <= goodMax) {
      good = 0.65 + ((seed >> 4) % 20) / 100;
      poor = 0.05 + ((seed >> 8) % 8) / 100;
    } else if (p75 > poorMin) {
      good = 0.12 + ((seed >> 4) % 15) / 100;
      poor = 0.38 + ((seed >> 8) % 25) / 100;
    } else {
      good = 0.35 + ((seed >> 4) % 20) / 100;
      poor = 0.18 + ((seed >> 8) % 20) / 100;
    }
    const needs = Math.max(0, 1 - good - poor);
    return { good: Number(good.toFixed(3)), needs: Number(needs.toFixed(3)), poor: Number(poor.toFixed(3)) };
  };

  /* Lab data — Lighthouse simulated metrics in ms (or CLS score) */
  const labFCP = fboost(1200 + ((seed >> 2) % 2101));
  const labLCP = fboost(1600 + ((seed >> 4) % 3001));
  const labTBT = fboost(200 + ((seed >> 6) % 1101));
  const labCLS = Number(
    Math.max(0.01, 0.02 + ((seed >> 8) % 25) / 100 - (strategy === 'desktop' ? 0.04 : 0)).toFixed(3),
  );
  const labSI = fboost(1800 + ((seed >> 10) % 3401));
  const labTTI = fboost(3500 + ((seed >> 12) % 4001));

  /* Lab audit score: 0..1 (green ≥0.9, amber 0.5-0.89, red <0.5) */
  const labScore = (val: number, good: number, poor: number): number => {
    if (val <= good) return 0.9 + (seed % 10) / 100;
    if (val >= poor) return 0.3 + (seed % 15) / 100;
    return 0.5 + (1 - (val - good) / (poor - good)) * 0.4;
  };

  const oppCount = 5 + (seed % 2);
  const opportunities = MOCK_OPPORTUNITIES.slice(0, oppCount)
    .map((o) => ({ id: o.id, title: o.title, savings: o.base + (seed % o.spread) }))
    .sort((a, b) => b.savings - a.savings);

  const diagnostics: PsDiagnostic[] = [
    { id: 'total-byte-weight', title: 'Total page weight', value: `${412 + (seed % 600)} KB`, icon: 'weight' },
    { id: 'dom-size', title: 'DOM size', value: `${1247 + (seed % 1200)} nodes`, icon: 'tree' },
    { id: 'mainthread-work-breakdown', title: 'Main thread work', value: `${(2 + (seed % 5) / 1).toFixed(1)}s`, icon: 'cpu' },
    { id: 'uses-long-cache-ttl', title: 'Cache lifetime', value: `${8 + (seed % 24)}h`, icon: 'clock' },
    { id: 'font-display', title: 'Font display swap', value: seed % 3 === 0 ? 'missing' : 'swap', icon: 'font' },
  ];

  const passedCount = 12 + (seed % 5);

  const data = emptyPageSpeedData();
  data.formFactor = strategy;
  data.strategy = strategy;
  data.timing = { total: 4500 + (seed % 3500) };
  data.finalUrl = url;
  data.finalDisplayedUrl = url;
  data.requestedUrl = url;
  data.redirects = (seed >> 3) % 2;
  data.isHttps = true;
  data.runtimeError = null;
  /* The prototype hard-codes "Last audit: Oct 18, 2026" — the mock pins the same
     day so the DEV rendering matches it. */
  data.fetchTime = '2026-10-18T09:00:00.000Z';
  data.categories = {
    performance: { score: Number(perf.toFixed(2)), title: 'Performance' },
    accessibility: { score: Number(a11y.toFixed(2)), title: 'Accessibility' },
    'best-practices': { score: Number(bp.toFixed(2)), title: 'Best Practices' },
    seo: { score: Number(seo.toFixed(2)), title: 'SEO' },
  };
  data.loadingExperience = {
    metrics: {
      lcp: { percentile: lcpMs, buckets: buckets(lcpMs, 2500, 4000) },
      inp: { percentile: inpMs, buckets: buckets(inpMs, 200, 500) },
      fcp: { percentile: fcpMs, buckets: buckets(fcpMs, 1800, 3000) },
      cls: { percentile: clsVal, buckets: buckets(clsVal * 1000, 100, 250) },
    },
  };
  data.lighthouseResult = {
    audits: {
      'first-contentful-paint': mockLabAudit(labFCP, labScore(labFCP, 1800, 3000)),
      'largest-contentful-paint': mockLabAudit(labLCP, labScore(labLCP, 2500, 4000)),
      'total-blocking-time': mockLabAudit(labTBT, labScore(labTBT, 200, 600)),
      'cumulative-layout-shift': mockLabAudit(labCLS, labScore(labCLS * 1000, 100, 250)),
      'speed-index': mockLabAudit(labSI, labScore(labSI, 3300, 5800)),
      interactive: mockLabAudit(labTTI, labScore(labTTI, 3800, 7300)),
    },
  };
  data.opportunities = opportunities;
  data.diagnostics = diagnostics;
  data.passedAudits = MOCK_PASSED_AUDITS.slice(0, passedCount).map((p) => ({ title: p.title, desc: p.desc }));
  return data;
}
