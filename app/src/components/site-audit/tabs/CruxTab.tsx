/**
 * CrUX (Chrome UX Report) tab of the URL-detail drawer.
 *
 * Structural + class-for-class port of the prototype's `renderCruxTab(detail)`
 * (lines 3756-3962), with the interactions from `wireCruxToggles()` (lines
 * 4004-4059) reimplemented as React state instead of DOM mutation:
 *   - scope toggle      (`data-scope`)   → useState
 *   - device toggle     (`data-device`)  → useState
 *   - distribution pick (`data-metric`)  → useState
 *
 * Every `data-api` attribute name is preserved verbatim (e2e/debug contract).
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import type { UrlDetail } from '../types';
import { CRUX_THRESHOLDS, DistBars, MetricText, TimeSeriesChart, TinyHist, psClassify } from '../charts';
import type { CruxBucket, CruxMetricId, TinyBuckets } from '../charts';
import { PS_CRUX_ICONS } from './crux-icons';
import type { CruxApiMetricKey, CruxDevice, CruxScope, CruxTabData } from './crux-types';

interface MetricCard {
  id: CruxMetricId;
  key: CruxApiMetricKey;
  name: string;
  full: string;
}

const METRIC_CARDS: readonly MetricCard[] = [
  { id: 'lcp', key: 'largest_contentful_paint', name: 'LCP', full: 'Largest Contentful Paint' },
  { id: 'inp', key: 'interaction_to_next_paint', name: 'INP', full: 'Interaction to Next Paint' },
  { id: 'fcp', key: 'first_contentful_paint', name: 'FCP', full: 'First Contentful Paint' },
  { id: 'cls', key: 'cumulative_layout_shift', name: 'CLS', full: 'Cumulative Layout Shift' },
];

const DIST_KEY: Record<CruxMetricId, CruxApiMetricKey> = {
  lcp: 'largest_contentful_paint',
  inp: 'interaction_to_next_paint',
  fcp: 'first_contentful_paint',
  cls: 'cumulative_layout_shift',
};

const DIST_LABELS: readonly { id: CruxMetricId; label: string }[] = [
  { id: 'lcp', label: 'LCP' },
  { id: 'inp', label: 'INP' },
  { id: 'fcp', label: 'FCP' },
  { id: 'cls', label: 'CLS' },
];

const DEVICE_COLS: readonly { key: 'DESKTOP' | 'PHONE' | 'TABLET'; name: string; icon: 'monitor' | 'phone' | 'tablet' }[] = [
  { key: 'DESKTOP', name: 'Desktop', icon: 'monitor' },
  { key: 'PHONE', name: 'Phone', icon: 'phone' },
  { key: 'TABLET', name: 'Tablet', icon: 'tablet' },
];

const SCOPE_BUTTONS: readonly { scope: CruxScope; label: string }[] = [
  { scope: 'url', label: 'This URL' },
  { scope: 'origin', label: 'Origin' },
];

const DEVICE_BUTTONS: readonly { device: CruxDevice; label: string }[] = [
  { device: 'all', label: 'All' },
  { device: 'desktop', label: 'Desktop' },
  { device: 'phone', label: 'Phone' },
  { device: 'tablet', label: 'Tablet' },
];

const FRAC_CARDS = [
  { tier: 'good', key: 'good', label: 'Fast FCP', cap: 'Loads under 1.8s', api: 'crux.record.metrics.first_contentful_paint.histogram[0].density' },
  { tier: 'needs', key: 'needs', label: 'Moderate', cap: 'Loads 1.8 – 3.0s', api: 'crux.record.metrics.first_contentful_paint.histogram[1].density' },
  { tier: 'poor', key: 'poor', label: 'Slow FCP', cap: 'Loads over 3.0s', api: 'crux.record.metrics.first_contentful_paint.histogram[2].density' },
] as const;

const LCP_API = 'crux.record.metrics.largest_contentful_paint.percentiles.p75';

function pillLabel(tier: 'good' | 'needs' | 'poor'): string {
  return tier === 'good' ? 'Good' : tier === 'needs' ? 'Needs improvement' : 'Poor';
}

function originOf(url: string): string {
  try {
    return new URL(url).hostname || '';
  } catch {
    return '';
  }
}

/** Reuses the prototype's `.ps-device-empty` styling for sub-section empties. */
function EmptyNote({ children }: { children: string }): ReactElement {
  return <div className="ps-device-empty">{children}</div>;
}

/** Prototype `EMPTY_ICON` (line 2715) — used by the not-collected card. */
function EmptyIcon(): ReactElement {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function bucketsOf(hist: CruxBucket[]): TinyBuckets | null {
  if (hist.length < 3) return null;
  return { good: hist[0].density, needs: hist[1].density, poor: hist[2].density };
}

export default function CruxTab(props: {
  detail: UrlDetail;
  data: CruxTabData | null;
  fieldData?: CruxTabData | null;
}): ReactElement {
  const { detail, data, fieldData = null } = props;

  const [scope, setScope] = useState<CruxScope>('url');
  const [device, setDevice] = useState<CruxDevice>('all');
  const [distMetric, setDistMetric] = useState<CruxMetricId>('lcp');

  const origin = originOf(detail.url);

  // URL scope uses `data`; origin scope uses `fieldData`. The dev-only mock
  // generator was removed — every environment renders only real CrUX data.
  const view: CruxTabData | null = scope === 'url' ? data : fieldData;

  // Hard "not collected" state — nothing was collected for the URL or its origin.
  if (view === null) {
    return (
      <div className="url-tab active" data-tab="crux">
        <div className="url-empty">
          <EmptyIcon />
          <b>No CrUX field data collected</b>
          <span>
            No real-user Chrome UX Report data (URL or origin) was available in the last collection window. This tab
            fills in once the URL has enough Chrome traffic.
          </span>
        </div>
      </div>
    );
  }

  const { metrics } = view;
  const distHist = metrics[DIST_KEY[distMetric]].histogram;

  return (
    <div className="url-tab active" data-tab="crux">
      {/* (1) Header strip — title + scope toggle + device toggle */}
      <div className="ps-header">
        <div className="ps-header-title">
          <PS_CRUX_ICONS.users />
          <h3>Chrome UX Report</h3>
          <div className="seg compact" id="cruxScope" role="group" aria-label="Scope">
            {SCOPE_BUTTONS.map((s) => (
              <button
                type="button"
                key={s.scope}
                data-scope={s.scope}
                className={scope === s.scope ? 'active' : undefined}
                onClick={() => setScope(s.scope)}
              >
                {s.scope === 'origin' ? `Origin (${origin})` : s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="ps-header-meta">
          <div className="seg compact" id="cruxDevice" role="group" aria-label="Device">
            {DEVICE_BUTTONS.map((d) => (
              <button
                type="button"
                key={d.device}
                data-device={d.device}
                className={device === d.device ? 'active' : undefined}
                onClick={() => setDevice(d.device)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* (2) Collection period caption */}
      <div className="ps-cap-strip" data-api="crux.record.collectionPeriod">
        <PS_CRUX_ICONS.calendar />
        {view.collectionPeriod ? (
          <span>
            Data collected: <b>{view.collectionPeriod.startDate}</b> – <b>{view.collectionPeriod.endDate}</b> · 28 days
          </span>
        ) : (
          <span>Collection period not reported for this record</span>
        )}
      </div>

      {/* (3) Top fractions row — fast / moderate / slow */}
      <div className="ps-frac-row">
        {FRAC_CARDS.map((card) => {
          const frac = view.fractions[card.key];
          const pct = frac === null ? null : (frac * 100).toFixed(1);
          return (
            <div className="ps-frac" data-tier={card.tier} data-api={card.api} key={card.key}>
              <div className="ps-frac-key">{card.label}</div>
              <div className="ps-frac-val">
                {pct === null ? '—' : <>{pct}<span className="unit">%</span></>}
              </div>
              <div className="ps-frac-bar">
                <span style={{ width: pct === null ? '0%' : `${pct}%` }} />
              </div>
              <div className="ps-frac-cap">{card.cap}</div>
            </div>
          );
        })}
      </div>

      {/* (4) p75 metrics row — 4 cards with histogram + bucket thresholds */}
      <div className="ps-section">
        <div className="ps-h">
          <span className="ps-h-title">p75 metrics</span>
          <span className="ps-h-sub">Real-user <b>p75</b> percentiles · distribution buckets below</span>
        </div>
        <div className="ps-metric-row">
          {METRIC_CARDS.map((m) => {
            const metric = metrics[m.key];
            const val = metric.percentile;
            const tier = val === null ? null : psClassify(m.id, val);
            const t = CRUX_THRESHOLDS[m.id];
            const dec = m.id === 'cls' ? 2 : 1;
            const suffix = t.display === 's' ? 's' : 'ms';
            const cap = `${t.label} buckets: good ≤ ${(t.goodMax / t.scale).toFixed(dec)}${suffix} · poor > ${(t.poorMin / t.scale).toFixed(dec)}${suffix}`;
            const buckets = bucketsOf(metric.histogram);
            return (
              <div className="ps-metric" data-api={`crux.record.metrics.${m.key}.percentiles.p75`} key={m.key}>
                <div className="ps-metric-name">{m.name} · {m.full}</div>
                <div className="ps-metric-val">
                  {val === null ? '—' : <MetricText metricId={m.id} value={val} />}
                </div>
                {tier === null ? (
                  <span className="ps-metric-pill">No data</span>
                ) : (
                  <span className={`ps-metric-pill ${tier}`}>{pillLabel(tier)}</span>
                )}
                {buckets === null ? <EmptyNote>No distribution data</EmptyNote> : <TinyHist buckets={buckets} />}
                <div className="ps-metric-cap">{cap}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* (5) By device breakdown — 3 columns */}
      <div className="ps-section">
        <div className="ps-h">
          <span className="ps-h-title">Performance by device</span>
          <span className="ps-h-sub">Separate queries · formFactor dimension</span>
        </div>
        <div className="ps-device-row">
          {DEVICE_COLS.map((d) => {
            const dd = view.byDevice ? view.byDevice[d.key] : null;
            const lcpCls = dd && dd.lcp !== null ? psClassify('lcp', dd.lcp) : null;
            const inpCls = dd && dd.inp !== null ? psClassify('inp', dd.inp) : null;
            return (
              <div className={`ps-device-col${dd ? '' : ' muted'}`} data-api={LCP_API} key={d.key}>
                <div className="ps-device-icon" aria-hidden="true">
                  {(() => {
                    const Icon = PS_CRUX_ICONS[d.icon];
                    return <Icon />;
                  })()}
                </div>
                <div className="ps-device-name">{d.name}</div>
                {dd ? (
                  <div className="ps-device-metrics">
                    <div className="ps-device-metric">
                      <span className="k">p75 LCP</span>
                      <span className={lcpCls ? `v ${lcpCls}` : 'v'}>
                        {dd.lcp === null ? '—' : `${(dd.lcp / 1000).toFixed(2)}s`}
                      </span>
                    </div>
                    <div className="ps-device-metric">
                      <span className="k">p75 INP</span>
                      <span className={inpCls ? `v ${inpCls}` : 'v'}>{dd.inp === null ? '—' : `${dd.inp}ms`}</span>
                    </div>
                  </div>
                ) : (
                  <div className="ps-device-empty">No data</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* (6) By connection type — horizontal bar chart */}
      <div className="ps-section">
        <div className="ps-h">
          <span className="ps-h-title">Performance by connection type</span>
          <span className="ps-h-sub">p75 LCP across effectiveConnectionType</span>
        </div>
        <div className="ps-conn-list">
          {view.byConnection.length === 0 ? (
            <EmptyNote>No connection-type data</EmptyNote>
          ) : (
            (() => {
              const connVals = view.byConnection.filter((c) => c.lcp !== null).map((c) => c.lcp as number);
              const connMax = connVals.length > 0 ? Math.max(...connVals) : 1;
              return view.byConnection.map((c) => {
                if (c.lcp === null) {
                  return (
                    <div className="ps-conn-row" data-tier="needs" data-api={LCP_API} key={c.name}>
                      <span className="ps-conn-name">{c.name}</span>
                      <span className="ps-conn-bar"><span style={{ width: '0%' }} /></span>
                      <span className="ps-conn-val">No data</span>
                    </div>
                  );
                }
                const pct = Math.max(6, Math.round((c.lcp / connMax) * 100));
                return (
                  <div className="ps-conn-row" data-tier={c.tier ?? 'needs'} data-api={LCP_API} key={c.name}>
                    <span className="ps-conn-name">{c.name}</span>
                    <span className="ps-conn-bar"><span style={{ width: `${pct}%` }} /></span>
                    <span className="ps-conn-val">
                      {(c.lcp / 1000).toFixed(2)}
                      <span className="unit">s</span>
                    </span>
                  </div>
                );
              });
            })()
          )}
        </div>
      </div>

      {/* (7) Top 5 countries table */}
      <div className="ps-section">
        <div className="ps-h">
          <span className="ps-h-title">Top 5 countries by traffic</span>
          <span className="ps-h-sub">ISO 3166-1 alpha-2 country dimension</span>
        </div>
        <div className="ps-country-table">
          <div className="ps-country-thead">
            <span></span><span>Country</span><span>Sessions %</span><span>LCP</span><span>INP</span>
          </div>
          {view.byCountry.length === 0 ? (
            <EmptyNote>No country data</EmptyNote>
          ) : (
            view.byCountry.map((c) => {
              const lcpCls = c.lcp !== null ? psClassify('lcp', c.lcp) : null;
              const inpCls = c.inp !== null ? psClassify('inp', c.inp) : null;
              return (
                <div className="ps-country-row" data-api={LCP_API} key={c.iso}>
                  <span className="ps-country-flag" aria-hidden="true">{c.flag}</span>
                  <span className="ps-country-iso">{c.iso} · {c.name}</span>
                  <span className="ps-country-pct">
                    {c.pct === null ? <b>—</b> : <><b>{c.pct}</b>%</>}
                  </span>
                  <span className={lcpCls ? `ps-country-metric ${lcpCls}` : 'ps-country-metric'} title="p75 LCP">
                    {c.lcp === null ? '—' : `${(c.lcp / 1000).toFixed(2)}s`}
                  </span>
                  <span className={inpCls ? `ps-country-metric ${inpCls}` : 'ps-country-metric'} title="p75 INP">
                    {c.inp === null ? '—' : `${c.inp}ms`}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* (8) Time series chart — 12-month p75 LCP line chart */}
      <div className="ps-section">
        <div className="ps-h">
          <span className="ps-h-title">12-month trend</span>
          <span className="ps-h-sub">p75 LCP · collected monthly</span>
        </div>
        <div className="ps-ts-wrap" data-api={LCP_API}>
          {view.timeSeries.length < 2 ? (
            <EmptyNote>No monthly trend data</EmptyNote>
          ) : (
            (() => {
              const tsVals = view.timeSeries.map((p) => p.lcp);
              const tsMin = Math.min(...tsVals);
              const tsMax = Math.max(...tsVals);
              const tsAvg = Math.round(tsVals.reduce((a, b) => a + b, 0) / tsVals.length);
              return (
                <>
                  <div className="ps-ts-cap">
                    <span className="ps-ts-cap-title">LCP p75 (ms)</span>
                    <span className="ps-ts-cap-stats">
                      <span><span className="lbl">min</span><b>{(tsMin / 1000).toFixed(2)}s</b></span>
                      <span><span className="lbl">avg</span><b>{(tsAvg / 1000).toFixed(2)}s</b></span>
                      <span><span className="lbl">max</span><b>{(tsMax / 1000).toFixed(2)}s</b></span>
                    </span>
                  </div>
                  <TimeSeriesChart points={view.timeSeries} width={640} height={180} />
                </>
              );
            })()
          )}
        </div>
      </div>

      {/* (9) Distribution explorer — metric picker + 3-bar histogram */}
      <div className="ps-section">
        <div className="ps-h">
          <span className="ps-h-title">Distribution explorer</span>
          <span className="ps-h-sub">Pick a metric · 3 histogram buckets</span>
        </div>
        <div className="ps-dist-wrap" data-api={`crux.record.metrics.${DIST_KEY[distMetric]}.histogram`}>
          <div className="ps-dist-picker" id="cruxDistPicker" role="group" aria-label="Distribution metric">
            {DIST_LABELS.map((p) => (
              <button
                className={`ps-dist-pill${distMetric === p.id ? ' active' : ''}`}
                type="button"
                key={p.id}
                data-metric={p.id}
                onClick={() => setDistMetric(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div id="cruxDistBars">
            {distHist.length < 3 ? <EmptyNote>No distribution data</EmptyNote> : <DistBars hist={distHist} metricId={distMetric} />}
          </div>
        </div>
      </div>
    </div>
  );
}
