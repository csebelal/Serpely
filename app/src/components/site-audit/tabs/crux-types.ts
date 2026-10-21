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
 *  2. (The dev-only mock port of `genCruxData` was removed — the audit UI never
 *     fabricates CrUX metrics in any environment.)
 *
 * NOTE ON SHAPE: `genCruxData` nested metrics under `record.metrics`. We flatten
 * `collectionPeriod` + `metrics` to the top level (the CrUX API's `record` wrapper
 * carries no other field we render) but keep the API metric key names verbatim so
 * the `data-api="crux.record.metrics.<key>..."` contract still lines up.
 */
import type { CruxBucket, CruxMetricId, TimeSeriesPoint } from '../charts';

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
