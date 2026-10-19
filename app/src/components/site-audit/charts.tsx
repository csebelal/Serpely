/**
 * Ported from the prototype's `psBuildTimeSeriesSvg` / `psBuildDistBars` /
 * `psTinyHist` (which returned HTML strings) into real React SVG components.
 *
 * Geometry, classes and the `CRUX_THRESHOLDS` table are copied verbatim so the
 * rendered output is identical to the prototype. Shared by the PageSpeed and
 * CrUX tabs.
 */
import type { CSSProperties, ReactElement } from 'react';

export type CruxMetricId = 'lcp' | 'inp' | 'fcp' | 'cls';

export interface CruxThreshold {
  goodMax: number;
  poorMin: number;
  unit: string;
  display: string;
  scale: number;
  label: string;
}

/** CrUX API bucket definitions. Good ≤ goodMax, needs goodMax < v ≤ poorMin, poor > poorMin. */
export const CRUX_THRESHOLDS: Record<CruxMetricId, CruxThreshold> = {
  lcp: { goodMax: 2500, poorMin: 4000, unit: 'ms', display: 's', scale: 1000, label: 'LCP' },
  inp: { goodMax: 200, poorMin: 500, unit: 'ms', display: 'ms', scale: 1, label: 'INP' },
  fcp: { goodMax: 1800, poorMin: 3000, unit: 'ms', display: 's', scale: 1000, label: 'FCP' },
  cls: { goodMax: 100, poorMin: 250, unit: '', display: '', scale: 1000, label: 'CLS' },
};

export function psClassify(metricId: CruxMetricId, value: number): 'good' | 'needs' | 'poor' {
  const t = CRUX_THRESHOLDS[metricId];
  if (!t) return 'needs';
  if (value <= t.goodMax) return 'good';
  if (value > t.poorMin) return 'poor';
  return 'needs';
}

/** Category score tier: green ≥90, amber 50-89, red <50. */
export function psScoreTier(score01: number): 'good' | 'warn' | 'bad' {
  const s = Math.round(score01 * 100);
  if (s >= 90) return 'good';
  if (s >= 50) return 'warn';
  return 'bad';
}

/**
 * Format a metric: LCP/FCP as "Xs" (1 decimal, 2 in the explorer), INP/TBT as
 * "Xms", CLS as 0.XX. Split into text + unit so callers can render the unit in
 * its own <span class="unit">.
 */
export function formatMetric(metricId: CruxMetricId | string, val: number): { text: string; unit: string } {
  const t = CRUX_THRESHOLDS[metricId as CruxMetricId];
  if (!t) return { text: String(val), unit: '' };
  if (metricId === 'cls') return { text: val.toFixed(2), unit: '' };
  if (t.display === 's') return { text: (val / t.scale).toFixed(2), unit: 's' };
  return { text: String(Math.round(val)), unit: 'ms' };
}

/** `<span>2.50<span class="unit">s</span></span>` equivalent. */
export function MetricText({ metricId, value }: { metricId: CruxMetricId | string; value: number }): ReactElement {
  const { text, unit } = formatMetric(metricId, value);
  return (
    <>
      {text}
      {unit ? <span className="unit">{unit}</span> : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Tiny 3-bucket histogram (inside metric cards)                              */
/* -------------------------------------------------------------------------- */

export interface TinyBuckets {
  good: number;
  needs: number;
  poor: number;
}

export function TinyHist({ buckets }: { buckets: TinyBuckets }): ReactElement {
  const g = Math.round(buckets.good * 100);
  const n = Math.round(buckets.needs * 100);
  const p = Math.round(buckets.poor * 100);
  const max = Math.max(g, n, p, 1);
  return (
    <>
      <div className="ps-hist">
        <span className="b-good" style={{ height: `${(g / max) * 100}%` }} title={`Good: ${g}%`} />
        <span className="b-needs" style={{ height: `${(n / max) * 100}%` }} title={`Needs improvement: ${n}%`} />
        <span className="b-poor" style={{ height: `${(p / max) * 100}%` }} title={`Poor: ${p}%`} />
      </div>
      <div className="ps-hist-labels">
        <span>{g}%</span>
        <span>{n}%</span>
        <span>{p}%</span>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Distribution explorer — 3 vertical bars                                    */
/* -------------------------------------------------------------------------- */

export interface CruxBucket {
  start: number;
  end: number;
  density: number;
}

const DIST_TIERS = ['good', 'needs', 'poor'] as const;
const DIST_NAMES = ['Good', 'Needs improvement', 'Poor'];

export function DistBars({ hist, metricId }: { hist: CruxBucket[]; metricId: CruxMetricId }): ReactElement {
  const t = CRUX_THRESHOLDS[metricId];
  const decimals = metricId === 'cls' ? 2 : 1;
  const suffix = t.display === 's' ? 's' : 'ms';
  const rangeLabels = [
    `≤ ${(t.goodMax / t.scale).toFixed(decimals)}${suffix}`,
    `${(t.goodMax / t.scale).toFixed(decimals)}${suffix} – ${(t.poorMin / t.scale).toFixed(decimals)}${suffix}`,
    `> ${(t.poorMin / t.scale).toFixed(decimals)}${suffix}`,
  ];
  const maxDensity = Math.max(hist[0].density, hist[1].density, hist[2].density, 0.5);

  return (
    <div className="ps-dist-bars">
      {[0, 1, 2].map((i) => {
        const pct = (hist[i].density * 100).toFixed(1);
        const hPct = Math.max(6, (hist[i].density / maxDensity) * 100);
        return (
          <div className="ps-dist-bar-col" key={DIST_TIERS[i]}>
            <div className="ps-dist-bar-val">{pct}%</div>
            <div
              className={`ps-dist-bar ${DIST_TIERS[i]}`}
              style={{ height: `${hPct}%` } as CSSProperties}
              title={`${DIST_NAMES[i]}: ${pct}%`}
            />
            <div className="ps-dist-bar-name">{DIST_NAMES[i]}</div>
            <div className="ps-dist-bar-range">{rangeLabels[i]}</div>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 12-month time-series line chart                                            */
/* -------------------------------------------------------------------------- */

export interface TimeSeriesPoint {
  month: string;
  lcp: number;
}

/**
 * Smooth (Catmull-Rom → cubic Bezier) p75 LCP line chart with area fill.
 * `gradientId` exists only so two instances can mount at once without id
 * collisions; the default matches the prototype exactly.
 */
export function TimeSeriesChart({
  points,
  width,
  height,
  gradientId = 'psTsGrad',
}: {
  points: TimeSeriesPoint[];
  width: number;
  height: number;
  gradientId?: string;
}): ReactElement {
  const PAD = { top: 14, right: 14, bottom: 24, left: 42 };
  const w = width;
  const h = height;
  const plotW = w - PAD.left - PAD.right;
  const plotH = h - PAD.top - PAD.bottom;
  const values = points.map((p) => p.lcp);
  let min = Math.min(...values);
  let max = Math.max(...values);
  min = Math.floor((min * 0.9) / 100) * 100;
  max = Math.ceil((max * 1.1) / 100) * 100;
  const range = max - min || 1;
  const x = (i: number) => PAD.left + (i / (points.length - 1)) * plotW;
  const y = (v: number) => PAD.top + plotH - ((v - min) / range) * plotH;

  let pathD = '';
  for (let i = 0; i < points.length; i++) {
    const cx = x(i);
    const cy = y(points[i].lcp);
    if (i === 0) {
      pathD += `M${cx},${cy}`;
      continue;
    }
    const px = x(i - 1);
    const py = y(points[i - 1].lcp);
    const cp1x = px + (cx - px) * 0.4;
    const cp1y = py;
    const cp2x = px + (cx - px) * 0.6;
    const cp2y = cy;
    pathD += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${cx},${cy}`;
  }
  const areaD = `${pathD} L${x(points.length - 1)},${PAD.top + plotH} L${x(0)},${PAD.top + plotH} Z`;

  return (
    <svg
      className="ps-ts-svg"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="12-month p75 LCP line chart"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(13,148,136,.32)" />
          <stop offset="100%" stopColor="rgba(13,148,136,0)" />
        </linearGradient>
      </defs>

      {[0, 1, 2, 3, 4].map((tick) => {
        const v = min + (range * tick) / 4;
        const yp = y(v);
        return (
          <g key={tick}>
            <text className="axis-label" x={PAD.left - 6} y={yp + 3} textAnchor="end">
              {(v / 1000).toFixed(1)}s
            </text>
            <line className="grid-line" x1={PAD.left} y1={yp} x2={w - PAD.right} y2={yp} />
          </g>
        );
      })}

      <path className="area" d={areaD} fill={`url(#${gradientId})`} />
      <path className="line" d={pathD} />

      {points.map((p, i) => (
        <circle className="dot" cx={x(i)} cy={y(p.lcp)} r={3} key={p.month}>
          <title>{`${p.month}: ${(p.lcp / 1000).toFixed(2)}s`}</title>
        </circle>
      ))}

      {points.map((p, i) =>
        i % 2 === 0 || i === points.length - 1 ? (
          <text
            className={`axis-label${i === points.length - 1 ? ' bold' : ''}`}
            x={x(i)}
            y={h - 6}
            textAnchor="middle"
            key={`x-${p.month}`}
          >
            {p.month}
          </text>
        ) : null,
      )}
    </svg>
  );
}
