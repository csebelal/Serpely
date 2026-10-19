/**
 * PageSpeed Insights tab of the URL-detail drawer.
 *
 * Ported 1:1 from the prototype's `renderPageSpeedTab(detail)` (lines
 * 3583-3751) and `wirePagespeedToggles()` (lines 3967-4002). Every `data-api`
 * attribute is preserved verbatim (they are the e2e/debug contract) and the
 * element nesting matches the prototype section for section.
 *
 * Two behavioural differences, both forced by the component boundary:
 *  - the Mobile/Desktop toggle re-renders from React state instead of
 *    re-generating the payload (this component gets `data` as a prop, so it
 *    cannot refetch). The toggle therefore drives the Lab Data sub-label, which
 *    is exactly what `psStrategy` drove in the prototype's markup.
 *  - "Recrawl" shows the drawer toast inline (the prototype called the
 *    drawer-level `showL2Toast`, which lives outside this tab).
 */
import { useEffect, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { MetricText, psClassify, psScoreTier, TinyHist } from '../charts';
import type { CruxMetricId } from '../charts';
import type { UrlDetail } from '../types';
import { isPsIconKey, PS_ICONS, PsEmptyIcon, PsToastIcon } from './pagespeed-icons';
import type { PageSpeedTabData, PsCategories, PsStrategy } from './pagespeed-types';

/** Category gauges, in the prototype's order, with its exact data-api strings. */
const CATEGORY_CARDS: { key: keyof PsCategories; label: string; api: string }[] = [
  { key: 'performance', label: 'Performance', api: 'pagespeed.lighthouseResult.categories.performance.score' },
  { key: 'accessibility', label: 'Accessibility', api: 'pagespeed.lighthouseResult.categories.accessibility.score' },
  { key: 'best-practices', label: 'Best Practices', api: 'pagespeed.lighthouseResult.categories.best-practices.score' },
  { key: 'seo', label: 'SEO', api: 'pagespeed.lighthouseResult.categories.seo.score' },
];

const FIELD_METRICS: { id: CruxMetricId; api: string; name: string; full: string }[] = [
  {
    id: 'lcp',
    api: 'pagespeed.loadingExperience.metrics.LARGEST_CONTENTFUL_PAINT.percentile',
    name: 'LCP',
    full: 'Largest Contentful Paint',
  },
  {
    id: 'inp',
    api: 'pagespeed.loadingExperience.metrics.INTERACTION_TO_NEXT_PAINT.percentile',
    name: 'INP',
    full: 'Interaction to Next Paint',
  },
  {
    id: 'fcp',
    api: 'pagespeed.loadingExperience.metrics.FIRST_CONTENTFUL_PAINT.percentile',
    name: 'FCP',
    full: 'First Contentful Paint',
  },
  {
    id: 'cls',
    api: 'pagespeed.loadingExperience.metrics.CUMULATIVE_LAYOUT_SHIFT.percentile',
    name: 'CLS',
    full: 'Cumulative Layout Shift',
  },
];

/** `id` is a display-format id passed to `MetricText` (fcp/lcp/tbt/cls/si/tti). */
const LAB_METRICS: { id: string; audit: string; name: string; full: string; desc: string }[] = [
  {
    id: 'fcp',
    audit: 'first-contentful-paint',
    name: 'FCP',
    full: 'First Contentful Paint',
    desc: 'Time to first paint of text or image.',
  },
  {
    id: 'lcp',
    audit: 'largest-contentful-paint',
    name: 'LCP',
    full: 'Largest Contentful Paint',
    desc: 'Render time of largest image/text block.',
  },
  {
    id: 'tbt',
    audit: 'total-blocking-time',
    name: 'TBT',
    full: 'Total Blocking Time',
    desc: 'Sum of long-task blocking time on main thread.',
  },
  {
    id: 'cls',
    audit: 'cumulative-layout-shift',
    name: 'CLS',
    full: 'Cumulative Layout Shift',
    desc: 'Visual stability — measure of layout shift.',
  },
  {
    id: 'si',
    audit: 'speed-index',
    name: 'SI',
    full: 'Speed Index',
    desc: 'How quickly content is visually complete.',
  },
  {
    id: 'tti',
    audit: 'interactive',
    name: 'TTI',
    full: 'Time to Interactive',
    desc: 'Time until main thread is reliably responsive.',
  },
];

const DASH = '—';

function pillLabel(cls: 'good' | 'needs' | 'poor'): string {
  if (cls === 'good') return 'Good';
  if (cls === 'needs') return 'Needs improvement';
  return 'Poor';
}

/** The prototype's `.ps-metric-dot` tri-state, derived from a 0..1 score. */
function scoreDot(score: number | null): 'good' | 'needs' | 'poor' | null {
  if (score === null) return null;
  const tier = psScoreTier(score);
  if (tier === 'good') return 'good';
  if (tier === 'warn') return 'needs';
  return 'poor';
}

/** "Oct 18, 2026" from Lighthouse's `fetchTime`; null when it is absent/invalid. */
function formatFetchTime(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(t);
}

export interface PageSpeedTabProps {
  detail: UrlDetail;
  data: PageSpeedTabData | null;
}

export default function PageSpeedTab({ detail, data }: PageSpeedTabProps): ReactElement {
  /* Toggle state. `override` wins, so late-arriving props still seed the toggle
     the first time (the prototype's `psStrategy` was initialised to 'mobile'). */
  const [strategyOverride, setStrategyOverride] = useState<PsStrategy | null>(null);
  const strategy: PsStrategy = strategyOverride ?? data?.formFactor ?? 'mobile';

  const [passedExpanded, setPassedExpanded] = useState(false);

  /* Recrawl toast — two-stage hide, matching `showL2Toast` (2500ms + 200ms). */
  const [toastSeq, setToastSeq] = useState(0);
  const [toastState, setToastState] = useState<'idle' | 'shown' | 'hiding'>('idle');
  useEffect(() => {
    if (toastSeq === 0) return undefined;
    setToastState('shown');
    const hide = window.setTimeout(() => setToastState('hiding'), 2500);
    const clear = window.setTimeout(() => setToastState('idle'), 2700);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(clear);
    };
  }, [toastSeq]);

  if (!data) {
    return (
      <div className="url-tab active" data-tab="pagespeed">
        <div className="url-empty">
          <PsEmptyIcon />
          <b>PageSpeed Insights has not been collected for this URL</b>
          <span>
            No Lighthouse run is stored for {detail.url}. PageSpeed data is collected on demand — use Recrawl to
            request a fresh audit.
          </span>
        </div>
      </div>
    );
  }

  const Speedometer = PS_ICONS.speedometer;
  const Refresh = PS_ICONS.refresh;
  const Bolt = PS_ICONS.bolt;
  const TrendingDown = PS_ICONS.trending_down;
  const CheckCircle = PS_ICONS.check_circle;
  const Chevron = PS_ICONS.chevron;
  const ImagePlaceholder = PS_ICONS.image_placeholder;

  const fetchLabel = formatFetchTime(data.fetchTime);
  const durationLabel = data.timing.total === null ? DASH : `${(data.timing.total / 1000).toFixed(1)}s`;
  const redirectLabel =
    data.redirects === null
      ? DASH
      : data.redirects === 0
        ? 'None'
        : `${data.redirects} hop${data.redirects > 1 ? 's' : ''}`;
  const passedCount = data.passedAudits.length;
  const maxSavings = data.opportunities.length > 0 ? data.opportunities[0].savings : 0;
  const savingsDenominator = maxSavings > 0 ? maxSavings : 1;

  return (
    <div className="url-tab active" data-tab="pagespeed">
      {toastState !== 'idle' ? (
        <div
          className={`drawer-toast${toastState === 'hiding' ? ' hiding' : ''}`}
          role="status"
          aria-live="polite"
        >
          <PsToastIcon />
          <span>PageSpeed recrawl queued for this URL</span>
        </div>
      ) : null}

      {/* (1) Header strip — title + Mobile/Desktop toggle + last audit + Recrawl */}
      <div className="ps-header">
        <div className="ps-header-title">
          <Speedometer />
          <h3>PageSpeed Insights</h3>
          <div className="seg compact" id="psStrategy" role="group" aria-label="Strategy">
            <button
              type="button"
              data-strat="mobile"
              className={strategy === 'mobile' ? 'active' : undefined}
              onClick={() => setStrategyOverride('mobile')}
            >
              Mobile
            </button>
            <button
              type="button"
              data-strat="desktop"
              className={strategy === 'desktop' ? 'active' : undefined}
              onClick={() => setStrategyOverride('desktop')}
            >
              Desktop
            </button>
          </div>
        </div>
        <div className="ps-header-meta">
          <span className="ps-meta-text">
            Last audit: <strong>{fetchLabel ?? DASH}</strong>
          </span>
          <span className="ps-meta-text">
            Lighthouse <strong>{durationLabel}</strong>
          </span>
          <button
            className="ps-ghost-btn"
            type="button"
            id="psRecrawl"
            onClick={() => setToastSeq((n) => n + 1)}
          >
            <Refresh />
            Recrawl
          </button>
        </div>
      </div>

      {/* (2) Score gauges — 4 large circular gauges */}
      <div className="ps-section">
        <div className="ps-h">
          <span className="ps-h-title">Lighthouse scores</span>
          <span className="ps-h-sub">
            Lighthouse v10 · formFactor: <b>{data.formFactor ?? DASH}</b>
          </span>
        </div>
        <div className="ps-gauges">
          {CATEGORY_CARDS.map((c) => {
            const score = data.categories[c.key].score;
            const displayScore = score === null ? null : Math.round(score * 100);
            const tier = score === null ? null : psScoreTier(score);
            return (
              <div
                className="ps-gauge-card"
                key={c.key}
                data-tier={tier ?? undefined}
                data-api={c.api}
                title={`${c.label} score: ${displayScore === null ? DASH : `${displayScore}/100`}`}
              >
                <div className="ps-gauge" style={{ '--score': displayScore ?? 0 } as CSSProperties}>
                  <b>{displayScore === null ? DASH : displayScore}</b>
                </div>
                <span className="ps-gauge-label">{c.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* (3) Field Data — CrUX real-user p75 metrics (LCP, INP, FCP, CLS) */}
      <div className="ps-section">
        <div className="ps-h">
          <span className="ps-h-title">Field Data</span>
          <span className="ps-h-sub">
            Real Chrome users · last <b>28 days</b> · p75
          </span>
        </div>
        <div className="ps-metric-row">
          {FIELD_METRICS.map((m) => {
            const metric = data.loadingExperience?.metrics[m.id] ?? null;
            const value = metric?.percentile ?? null;
            const cls = value === null ? null : psClassify(m.id, value);
            return (
              <div className="ps-metric" key={m.id} data-api={m.api}>
                <div className="ps-metric-name">
                  {m.name} · {m.full}
                </div>
                <div className="ps-metric-val">
                  {value === null ? DASH : <MetricText metricId={m.id} value={value} />}
                </div>
                {cls === null ? null : <span className={`ps-metric-pill ${cls}`}>{pillLabel(cls)}</span>}
                {metric?.buckets ? <TinyHist buckets={metric.buckets} /> : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* (4) Lab Data — Lighthouse simulated metrics (FCP, LCP, TBT, CLS, SI, TTI) */}
      <div className="ps-section">
        <div className="ps-h">
          <span className="ps-h-title">Lab Data</span>
          <span className="ps-h-sub">
            Lighthouse simulated <b>{strategy === 'desktop' ? 'desktop' : 'mobile'}</b> · Motorola Moto G Power / 4×
            CPU throttle
          </span>
        </div>
        <div className="ps-metric-row lab">
          {LAB_METRICS.map((m) => {
            const audit = data.lighthouseResult.audits[m.audit] ?? null;
            const value = audit?.numericValue ?? null;
            const score = audit?.score ?? null;
            const display = audit?.displayValue ?? null;
            const dot = scoreDot(score);
            return (
              <div className="ps-metric" key={m.audit} data-api={`pagespeed.lighthouseResult.audits.${m.audit}.numericValue`}>
                <div className="ps-metric-name">
                  {m.name} · {m.full}
                </div>
                <div className="ps-metric-val">
                  {display !== null ? display : value === null ? DASH : <MetricText metricId={m.id} value={value} />}
                </div>
                {dot === null ? null : (
                  <div
                    className={`ps-metric-dot ${dot}`}
                    title={`Score: ${score === null ? DASH : Math.round(score * 100)}/100`}
                  />
                )}
                <div className="ps-metric-cap">{m.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* (5) Opportunities — estimated savings, sorted desc */}
      <div className="ps-section">
        <div className="ps-h">
          <span className="ps-h-title">Opportunities</span>
          <span className="ps-h-sub">Estimated savings · sorted by impact</span>
        </div>
        <div className="ps-opp-list">
          {data.opportunities.length === 0 ? (
            <div className="ps-metric-cap">No opportunities reported by Lighthouse.</div>
          ) : (
            data.opportunities.map((o) => {
              const pct = Math.max(8, Math.round((o.savings / savingsDenominator) * 100));
              return (
                <div
                  className="ps-opp"
                  key={o.id}
                  data-api={`pagespeed.lighthouseResult.audits.${o.id}.details.overallSavingsMs`}
                >
                  <span className="ps-opp-icon" aria-hidden="true">
                    <Bolt />
                  </span>
                  <span className="ps-opp-title" title={o.title}>
                    {o.title}
                  </span>
                  <span className="ps-opp-bar">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                  <span className="ps-opp-savings">
                    <TrendingDown />
                    {o.savings.toLocaleString('en-US')} ms
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* (6) Diagnostics — informational */}
      <div className="ps-section">
        <div className="ps-h">
          <span className="ps-h-title">Diagnostics</span>
          <span className="ps-h-sub">Informational · no savings applied</span>
        </div>
        <div className="ps-diag-list">
          {data.diagnostics.length === 0 ? (
            <div className="ps-metric-cap">No diagnostics reported by Lighthouse.</div>
          ) : (
            data.diagnostics.map((d) => {
              const Icon = isPsIconKey(d.icon) ? PS_ICONS[d.icon] : PS_ICONS.gauge;
              return (
                <div className="ps-diag" key={d.id} data-api={`pagespeed.lighthouseResult.audits.${d.id}.displayValue`}>
                  <span className="ps-diag-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <span className="ps-diag-title" title={d.title}>
                    {d.title}
                  </span>
                  <span className="ps-diag-val">{d.value}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* (7) Passed audits — collapsible (collapsed by default) */}
      <div className="ps-section">
        <div className="ps-h">
          <span className="ps-h-title">Passed audits</span>
          <button
            className={`ps-passed-toggle${passedExpanded ? ' expanded' : ''}`}
            type="button"
            id="psPassedToggle"
            aria-expanded={passedExpanded ? 'true' : 'false'}
            onClick={() => setPassedExpanded((v) => !v)}
          >
            <Chevron />
            {passedExpanded ? 'Collapse' : 'Expand'}
            <span className="count">{passedCount} checks</span>
          </button>
        </div>
        <div className={`ps-passed-list${passedExpanded ? ' expanded' : ''}`} id="psPassedList">
          {data.passedAudits.map((p, i) => (
            <div className="ps-passed" key={`${p.title}-${i}`} data-api="pagespeed.lighthouseResult.audits.passed">
              <span className="ps-passed-check" aria-hidden="true">
                <CheckCircle />
              </span>
              <span className="ps-passed-text">
                <b>{p.title}</b>{' '}
                {p.desc === null ? null : <span className="desc">— {p.desc}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* (8) Rendered screenshot */}
      <div className="ps-section">
        <div className="ps-h">
          <span className="ps-h-title">Rendered screenshot</span>
          <span className="ps-h-sub">Captured at final URL</span>
        </div>
        <div className="ps-shot" data-api="pagespeed.lighthouseResult.screenshot">
          {data.screenshot === null ? (
            <>
              <ImagePlaceholder />
              <span className="ps-shot-cap">
                Captured at: <b>{data.finalUrl ?? DASH}</b>
              </span>
            </>
          ) : (
            <img
              src={data.screenshot}
              alt={`Rendered screenshot of ${data.finalUrl ?? detail.url}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
            />
          )}
        </div>
      </div>

      {/* (9) URL info cards — Final URL / Redirects / HTTPS */}
      <div className="ps-section">
        <div className="ps-h">
          <span className="ps-h-title">URL info</span>
          <span className="ps-h-sub">Lighthouse finalUrl + redirects</span>
        </div>
        <div className="ps-url-row">
          <div className="ps-url-card" data-api="pagespeed.lighthouseResult.finalUrl">
            <div className="key">Final URL</div>
            <div className="val mono">{data.finalUrl ?? DASH}</div>
          </div>
          <div className="ps-url-card" data-api="pagespeed.lighthouseResult.redirects">
            <div className="key">Redirects</div>
            <div className="val">{redirectLabel}</div>
          </div>
          <div className="ps-url-card" data-api="pagespeed.lighthouseResult.finalUrl">
            <div className="key">HTTPS</div>
            <div className="val">
              {data.isHttps === null ? (
                DASH
              ) : data.isHttps ? (
                <>
                  <span className="check">
                    <CheckCircle />
                  </span>
                  <span className="ok">Secure</span>
                </>
              ) : (
                'Insecure'
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
