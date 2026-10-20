/**
 * CrUX (Chrome UX Report) tab data model + adapters.
 *
 * The prototype's `genCruxData(url, scope, device)` defines the presentation
 * contract. This file reproduces that shape from two sources:
 *
 *  1. `cruxFromLoadingExperience()` — the real path. The CrUX field data is
 *     served inside the PageSpeed Insights response's `loadingExperience` /
 *     `originLoadingExperience` block (`metrics[key].percentile`, `.category`,
 *     `.distributions[]`). The server also queries the CrUX API directly for the
 *     audit's field-data checks, but this tab renders from the PSI payload that
 *     the `/psi` endpoint returns. EVERY derived field is nullable; nothing is
 *     invented.
 *
 *  2. `cruxMock()` — a DEV-only, deterministic port of `genCruxData`. It is the
 *     only place numbers are fabricated, and it must only be called behind
 *     `import.meta.env.DEV`.
 *
 * NOTE ON SHAPE: `genCruxData` nested metrics under `record.metrics`. We flatten
 * `collectionPeriod` + `metrics` to the top level (the CrUX API's `record` wrapper
 * carries no other field we render) but keep the API metric key names verbatim so
 * the `data-api="crux.record.metrics.<key>..."` contract still lines up.
 */
import type { CruxBucket, CruxMetricId, TimeSeriesPoint } from '../charts';
import { psClassify } from '../charts';

/** Scope toggle: this URL vs. the whole origin. */
export type CruxScope = 'url' | 'origin';

/** Device toggle. */
export type CruxDevice = 'all' | 'desktop' | 'phone' | 'tablet';

/** The four metric keys used by the CrUX API / PSI loadingExperience. */
export type CruxApiMetricKey =
  | 'largest_contentful_paint'
  | 'interaction_to_next_paint'
  | 'first_contentful_paint'
  | 'cumulative_layout_shift';

/** fast/moderate/slow proportions (0..1) or null when unreported. */
export interface CruxFractions {
  good: number | null;
  needs: number | null;
  poor: number | null;
}

/** One metric's p75 + distribution. Mirrors `record.metrics[key]` (flattened). */
export interface CruxMetricData {
  /** p75 percentile. CLS is normalized to the 0..1 scale. Null when unreported. */
  percentile: number | null;
  /** CrUX category string (`FAST` | `AVERAGE` | `SLOW`) when the source provides it. */
  category: string | null;
  /** Up to 3 CrUX histogram buckets (`{min,max,proportion}`) or `[]`. */
  histogram: CruxBucket[];
  /** `fast`/`moderate`/`slow` mirrors of `histogram`, or all-null. */
  fractions: CruxFractions;
}

export interface CruxDeviceMetrics {
  lcp: number | null;
  inp: number | null;
  cls: number | null;
}

export interface CruxDeviceBreakdown {
  DESKTOP: CruxDeviceMetrics | null;
  PHONE: CruxDeviceMetrics | null;
  TABLET: CruxDeviceMetrics | null;
}

export interface CruxConnectionRow {
  name: string;
  lcp: number | null;
  tier: 'good' | 'needs' | 'poor' | null;
}

export interface CruxCountryRow {
  iso: string;
  flag: string;
  name: string;
  pct: number | null;
  lcp: number | null;
  inp: number | null;
  cls: number | null;
}

export interface CruxCollectionPeriod {
  startDate: string | null;
  endDate: string | null;
}

/** Presentation-ready CrUX tab payload. Every field is nullable / may be empty. */
export interface CruxTabData {
  collectionPeriod: CruxCollectionPeriod | null;
  metrics: Record<CruxApiMetricKey, CruxMetricData>;
  /** `overall_category` from the source, verbatim, or null. */
  overallCategory: string | null;
  /** Top-row fast/moderate/slow; sourced from FCP (per the CrUX spec). */
  fractions: CruxFractions;
  byDevice: CruxDeviceBreakdown | null;
  byConnection: CruxConnectionRow[];
  byCountry: CruxCountryRow[];
  timeSeries: TimeSeriesPoint[];
}

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

/** Substrings that identify each metric in a loadingExperience key. */
const METRIC_KEY_HINTS: Record<CruxMetricId, string[]> = {
  lcp: ['LARGEST_CONTENTFUL_PAINT'],
  inp: ['INTERACTION_TO_NEXT_PAINT', 'FIRST_INPUT_DELAY'],
  fcp: ['FIRST_CONTENTFUL_PAINT'],
  cls: ['CUMULATIVE_LAYOUT_SHIFT'],
};

const NO_FRACTIONS: CruxFractions = { good: null, needs: null, poor: null };

function emptyMetric(): CruxMetricData {
  return { percentile: null, category: null, histogram: [], fractions: NO_FRACTIONS };
}

function fractionsFromHistogram(hist: CruxBucket[]): CruxFractions {
  if (hist.length < 3) return NO_FRACTIONS;
  return { good: hist[0].density, needs: hist[1].density, poor: hist[2].density };
}

function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/* -------------------------------------------------------------------------- */
/* Real path — PageSpeed loadingExperience                                     */
/* -------------------------------------------------------------------------- */

function readPercentile(raw: unknown, id: CruxMetricId): number | null {
  const v = numOrNull(raw);
  if (v === null) return null;
  // PSI reports the CLS percentile on the ×100 scale (1 → 0.01, 25 → 0.25).
  // `v > 1` would leave the very common 0.01 case as 1.00, so use `>= 1`.
  if (id === 'cls') {
    const n = v >= 1 ? v / 100 : v;
    return Math.round(n * 1000) / 1000;
  }
  return v;
}

/** `distributions[]` → up to 3 `{start,end,density}` buckets; `[]` if incomplete. */
function readHistogram(distributions: unknown): CruxBucket[] {
  if (!Array.isArray(distributions) || distributions.length < 3) return [];
  const out: CruxBucket[] = [];
  for (let i = 0; i < 3; i++) {
    const d = distributions[i] as { min?: unknown; max?: unknown; proportion?: unknown } | undefined;
    const proportion = d ? numOrNull(d.proportion) : null;
    if (proportion === null) return []; // partial distribution → treat as absent
    const start = d ? numOrNull(d.min) : null;
    const end = d ? numOrNull(d.max) : null;
    // start/end are not rendered (the explorer labels come from CRUX_THRESHOLDS),
    // but the CruxBucket type requires numbers → fall back to 0.
    out.push({ start: start ?? 0, end: end ?? 0, density: proportion });
  }
  return out;
}

function readMetric(metrics: Record<string, unknown>, id: CruxMetricId): CruxMetricData {
  const hints = METRIC_KEY_HINTS[id];
  const key = Object.keys(metrics).find((k) => hints.some((h) => k.toUpperCase().includes(h)));
  if (!key) return emptyMetric();
  const entry = metrics[key];
  if (!entry || typeof entry !== 'object') return emptyMetric();
  const e = entry as { percentile?: unknown; category?: unknown; distributions?: unknown };
  const histogram = readHistogram(e.distributions);
  return {
    percentile: readPercentile(e.percentile, id),
    category: typeof e.category === 'string' ? e.category : null,
    histogram,
    fractions: fractionsFromHistogram(histogram),
  };
}

/**
 * Adapt a PageSpeed `loadingExperience` (or `originLoadingExperience`) block into
 * the CrUX tab model. Never fabricates a value: anything absent comes back null.
 *
 * Returns a fully-empty `CruxTabData` when the input is not a usable object, so
 * callers that want the hard "not collected" state should pass `null` instead
 * (the `CruxTab` component renders its empty card for `data === null`).
 */
export function cruxFromLoadingExperience(loadingExperience: unknown): CruxTabData {
  const root =
    loadingExperience && typeof loadingExperience === 'object'
      ? (loadingExperience as { overall_category?: unknown; metrics?: unknown })
      : null;
  const rawMetrics =
    root && root.metrics && typeof root.metrics === 'object' ? (root.metrics as Record<string, unknown>) : {};

  const metrics: Record<CruxApiMetricKey, CruxMetricData> = {
    largest_contentful_paint: readMetric(rawMetrics, 'lcp'),
    interaction_to_next_paint: readMetric(rawMetrics, 'inp'),
    first_contentful_paint: readMetric(rawMetrics, 'fcp'),
    cumulative_layout_shift: readMetric(rawMetrics, 'cls'),
  };

  return {
    // loadingExperience carries no collection period (only the raw CrUX API does).
    collectionPeriod: null,
    metrics,
    overallCategory: root && typeof root.overall_category === 'string' ? root.overall_category : null,
    // FCP is the canonical fast/moderate/slow source per the CrUX spec.
    fractions: metrics.first_contentful_paint.fractions,
    byDevice: null,
    byConnection: [],
    byCountry: [],
    timeSeries: [],
  };
}

/* -------------------------------------------------------------------------- */
/* DEV-only mock — faithful port of the prototype's `genCruxData`              */
/* -------------------------------------------------------------------------- */

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** CrUX-style category from a p75 value (CLS is handled on the ×1000 scale). */
function crCategory(id: CruxMetricId, value: number): string {
  const tier = psClassify(id, id === 'cls' ? value * 1000 : value);
  return tier === 'good' ? 'FAST' : tier === 'needs' ? 'AVERAGE' : 'SLOW';
}

function categoryRank(cat: string): number {
  return cat === 'SLOW' ? 2 : cat === 'AVERAGE' ? 1 : 0;
}

/** @internal DEV only. Deterministic mock mirroring the prototype's genCruxData. */
export function cruxMock(url: string, scope: CruxScope, device: CruxDevice): CruxTabData {
  const salt = `|crux|${scope}|${device}`;
  const seed = hashStr(url + salt);
  /* Origin-level aggregates more sessions, so the LCP distribution tends to be
     slightly worse — bump the p75 by ~5%. */
  const originBoost = scope === 'origin' ? 0.05 : 0;
  /* Device filter: desktop pushes LCP/INP down; phone pushes them up. */
  const deviceMul = device === 'desktop' ? 0.85 : device === 'phone' ? 1.1 : 1.0;

  /* p75 metrics — LCP 1800-4500, INP 100-350, FCP 1400-3200, CLS 0.05-0.25 */
  const lcp = Math.round((1800 + (seed % 2701)) * (1 + originBoost) * deviceMul);
  const inp = Math.round((100 + ((seed >> 3) % 251)) * deviceMul);
  const fcp = Math.round((1400 + ((seed >> 5) % 1801)) * (1 + originBoost) * deviceMul);
  const cls = +Math.max(0.03, 0.05 + ((seed >> 7) % 21) / 100 + (scope === 'origin' ? 0.03 : 0)).toFixed(3);

  /* Histogram (3 buckets {start,end,density}) — each density sums to ~1.0 */
  function histogram(p75: number, goodMax: number, poorMin: number, maxValue: number): CruxBucket[] {
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
    return [
      { start: 0, end: goodMax, density: +good.toFixed(3) },
      { start: goodMax, end: poorMin, density: +needs.toFixed(3) },
      { start: poorMin, end: maxValue, density: +poor.toFixed(3) },
    ];
  }
  const lcpHist = histogram(lcp, 2500, 4000, 25000);
  const inpHist = histogram(inp, 200, 500, 5000);
  const fcpHist = histogram(fcp, 1800, 3000, 25000);
  const clsHist = histogram(cls * 1000, 100, 250, 1000);

  function mockMetric(id: CruxMetricId, percentile: number, hist: CruxBucket[]): CruxMetricData {
    return {
      percentile,
      category: crCategory(id, percentile),
      histogram: hist,
      fractions: fractionsFromHistogram(hist),
    };
  }

  /* Per-device breakdown — Desktop / Phone / Tablet (tablet sometimes null) */
  const deviceData: CruxDeviceBreakdown = {
    DESKTOP: {
      lcp: Math.max(1400, lcp - 300 - (seed % 200)),
      inp: Math.max(80, inp - 60 - (seed % 40)),
      cls: +Math.max(0.03, cls - 0.05).toFixed(3),
    },
    PHONE: { lcp: lcp + 100 + (seed % 200), inp: inp + 50 + (seed % 50), cls },
    TABLET:
      seed % 3 === 0
        ? null
        : { lcp: lcp + (seed % 100) - 50, inp: inp + (seed % 40) - 20, cls: +(cls + 0.02).toFixed(3) },
  };

  /* Per-connection — 4G, 3G, 2G, slow-2G, offline (no data for offline) */
  const connBase = lcp;
  const byConnection: CruxConnectionRow[] = [
    { name: '4G', lcp: connBase, tier: psClassify('lcp', connBase) },
    { name: '3G', lcp: connBase + 1500 + (seed % 800), tier: 'needs' },
    { name: '2G', lcp: connBase + 4000 + (seed % 1200), tier: 'poor' },
    { name: 'slow-2G', lcp: connBase + 6500 + (seed % 1500), tier: 'poor' },
    { name: 'offline', lcp: null, tier: null },
  ];

  /* Top 5 countries — US, GB, IN, DE, CA with varied values */
  const byCountry: CruxCountryRow[] = [
    { iso: 'US', flag: '\u{1F1FA}\u{1F1F8}', name: 'United States', pct: 35 + (seed % 15), lcp: Math.max(1400, lcp - 100), inp: Math.max(80, inp - 20), cls },
    { iso: 'GB', flag: '\u{1F1EC}\u{1F1E7}', name: 'United Kingdom', pct: 10 + ((seed >> 2) % 12), lcp: Math.max(1400, lcp - 200), inp: Math.max(80, inp - 30), cls: +Math.max(0.03, cls - 0.02).toFixed(3) },
    { iso: 'IN', flag: '\u{1F1EE}\u{1F1F3}', name: 'India', pct: 6 + ((seed >> 3) % 10), lcp: lcp + 800, inp: inp + 60, cls: +(cls + 0.05).toFixed(3) },
    { iso: 'DE', flag: '\u{1F1E9}\u{1F1EA}', name: 'Germany', pct: 4 + ((seed >> 4) % 8), lcp: Math.max(1400, lcp - 250), inp: Math.max(80, inp - 40), cls: +Math.max(0.03, cls - 0.03).toFixed(3) },
    { iso: 'CA', flag: '\u{1F1E8}\u{1F1E6}', name: 'Canada', pct: 3 + ((seed >> 5) % 6), lcp: Math.max(1400, lcp - 150), inp: Math.max(80, inp - 10), cls },
  ];

  /* 12-month time series — gentle downward trend toward the current LCP */
  const months = ['Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026'];
  let prev = lcp + 600;
  const timeSeries: TimeSeriesPoint[] = months.map((m, i) => {
    const noise = ((seed >> (i % 8)) % 200) - 100;
    prev = Math.max(1800, prev - 80 + noise);
    return { month: m, lcp: prev };
  });
  timeSeries[timeSeries.length - 1].lcp = lcp;

  /* `overall_category` is not part of genCruxData; derive it the CrUX way (worst
     of LCP/INP/CLS) so the field is populated for the field-data surface. */
  const overallRank = Math.max(
    categoryRank(crCategory('lcp', lcp)),
    categoryRank(crCategory('inp', inp)),
    categoryRank(crCategory('cls', cls)),
  );
  const overallCategory = overallRank === 2 ? 'SLOW' : overallRank === 1 ? 'AVERAGE' : 'FAST';

  return {
    collectionPeriod: { startDate: '2026-09-01', endDate: '2026-09-29' },
    metrics: {
      largest_contentful_paint: mockMetric('lcp', lcp, lcpHist),
      interaction_to_next_paint: mockMetric('inp', inp, inpHist),
      first_contentful_paint: mockMetric('fcp', fcp, fcpHist),
      cumulative_layout_shift: mockMetric('cls', cls, clsHist),
    },
    overallCategory,
    // FCP is the canonical fast/moderate/slow source per the CrUX spec.
    fractions: fractionsFromHistogram(fcpHist),
    byDevice: deviceData,
    byConnection,
    byCountry,
    timeSeries,
  };
}
