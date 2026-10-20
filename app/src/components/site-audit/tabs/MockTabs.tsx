/* ===========================================================================
 * MockTabs — the eight L2 URL-detail tabs that have NO real backend data in v1.
 *
 * Ported markup-for-markup from the serpely_audit_redesign prototype render
 * functions (`renderSearchTab`, `renderGapsTab`, `renderCheckTab`,
 * `renderInsightsTab`, `renderSchemaTab`, `renderLinksTab`, `renderImagesTab`,
 * `renderCssTab`, plus `renderEmptyTab`).
 *
 * Every tab fabricates its contents from the dev-only mock generator
 * (`genUrlTabData`). Pass `collected={false}` — or run outside `import.meta.env.DEV`
 * — and the tab renders <EmptyTab/> instead, which is how production uses these
 * components until the real data source is wired up.
 * =========================================================================== */

import { Fragment } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { UrlDetail, UrlTabId } from '../types';
import { genUrlTabData, urlTopic } from './mock-data';
import { KPI_ICONS, NAV_ICONS } from './mock-icons';
import type { KpiIconKey } from './mock-icons';

export interface MockTabProps {
  detail: UrlDetail;
  /** Render real content only when the tab has actually been collected. Defaults to true. */
  collected?: boolean;
}

/* ---------------------------------------------------------------------------
 * Shared bits
 * ------------------------------------------------------------------------- */

/* Prototype EMPTY_ICON (line 2715) — the only icon this slice needs that is not
   part of NAV_ICONS / KPI_ICONS. */
function EmptyIcon(): ReactElement {
  return (
    <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx={12} cy={12} r={10} />
      <line x1={12} y1={8} x2={12} y2={12} />
      <line x1={12} y1={16} x2={12.01} y2={16} />
    </svg>
  );
}

/* Port of the prototype's `kpiCard()` helper (line 3130). */
export function KpiCard({
  label,
  value,
  foot,
  iconKey,
  footClass,
}: {
  label: string;
  value: ReactNode;
  foot?: ReactNode;
  iconKey?: KpiIconKey;
  footClass?: string;
}): ReactElement {
  const Icon = iconKey ? KPI_ICONS[iconKey] : undefined;
  return (
    <div className="tab-kpi">
      <div className="tab-kpi-head">
        <span className="tab-kpi-label">{label}</span>
        {Icon ? (
          <span className="tab-kpi-icon" aria-hidden="true">
            <Icon />
          </span>
        ) : null}
      </div>
      <div className="tab-kpi-value">{value}</div>
      {foot ? <div className={footClass ? 'tab-kpi-foot ' + footClass : 'tab-kpi-foot'}>{foot}</div> : null}
    </div>
  );
}

/* Port of the prototype's `renderEmptyTab()` (line 4380), with production copy:
   the prototype said "in this preview"/"in this prototype", which cannot ship
   to real users. The state itself is unchanged. */
export function EmptyTab({ tabId }: { tabId: UrlTabId }): ReactElement {
  const labels: Partial<Record<UrlTabId, string>> = {
    search: 'Search metrics',
    gaps: 'Keyword gaps',
    check: 'URL check',
    insights: 'GA4 Insights',
    schema: 'Structured data',
    links: 'Internal links',
    images: 'Images',
    css: 'CSS files',
  };
  return (
    <div className="url-tab active" data-tab={tabId}>
      <div className="url-empty">
        <EmptyIcon />
        <b>Not collected yet</b>
        <span>{labels[tabId] || 'This view'} data isn't collected by this audit yet.</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Tab 1 — Search metrics (prototype `renderSearchTab`, line 4392)
 * ------------------------------------------------------------------------- */

export function SearchTab({ detail, collected = true }: MockTabProps): ReactElement {
  if (!collected || !import.meta.env.DEV) return <EmptyTab tabId="search" />;
  const d = genUrlTabData(detail, 'search');
  return (
    <div className="url-tab active" data-tab="search">
      {/* KPI cards 2x2 */}
      <div className="url-section">
        <div className="url-section-label">Search performance</div>
        <div className="tab-kpi-grid">
          <KpiCard label="Impressions" value={d.impressions.toLocaleString()} foot="Last 28 days" iconKey="impressions" />
          <KpiCard
            label="Clicks"
            value={d.clicks.toLocaleString()}
            foot={
              <>
                <strong>+{d.clicksDelta}%</strong> vs prev period
              </>
            }
            iconKey="clicks"
          />
          <KpiCard
            label="Avg. position"
            value={'#' + d.position.toFixed(1)}
            foot={
              <>
                Improved <strong>{d.posDelta}</strong> spots
              </>
            }
            iconKey="position"
          />
          <KpiCard
            label="CTR"
            value={
              <>
                {d.ctr.toFixed(2)}
                <span className="unit">%</span>
              </>
            }
            foot={
              <>
                Industry avg <strong>3.1%</strong>
              </>
            }
            iconKey="ctr"
          />
        </div>
      </div>
      {/* Top queries table */}
      <div className="url-section">
        <div className="url-section-label">Top queries</div>
        <div className="tab-table">
          <div className="tab-table-thead">
            <span>Query</span>
            <span>Position</span>
            <span>Impressions</span>
            <span>Clicks</span>
          </div>
          {d.queries.map((q, i) => (
            <div className="tab-table-row" key={q.kw + '-' + i}>
              <span className="tab-table-q">{q.kw}</span>
              <span className="tab-table-n pos">#{q.pos}</span>
              <span className="tab-table-n">{q.imp.toLocaleString()}</span>
              <span className="tab-table-n">{q.clicks.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Top countries pills */}
      <div className="url-section">
        <div className="url-section-label">Top countries</div>
        <div className="tab-pill-row">
          {d.countries.map((c) => (
            <span className="tab-pill" key={c.name}>
              {c.name} <b>{c.pct}%</b>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Tab 2 — Keyword gaps (prototype `renderGapsTab`, line 4436)
 * ------------------------------------------------------------------------- */

export function GapsTab({ detail, collected = true }: MockTabProps): ReactElement {
  if (!collected || !import.meta.env.DEV) return <EmptyTab tabId="gaps" />;
  const d = genUrlTabData(detail, 'gaps');
  return (
    <div className="url-tab active" data-tab="gaps">
      <div className="tab-summary">
        <KPI_ICONS.flag />
        <span>
          <b>{d.gaps.length} keyword gaps</b> identified vs. {d.competitorCount} competitors
        </span>
      </div>
      {d.gaps.map((g, i) => (
        <div className="tab-gap-row" key={g.kw + '-' + i}>
          <span className="tab-gap-kw" title={g.kw}>
            {g.kw}
          </span>
          <span className="tab-gap-comp" title={g.comp}>
            {g.comp}
          </span>
          <span className="tab-gap-pos">#{g.pos}</span>
          <span className="tab-gap-vol">
            {g.vol.toLocaleString()}
            <span style={{ color: 'var(--muted-2)', fontWeight: 500 }}>/mo</span>
          </span>
          <button className="tab-track-btn" type="button" data-kw={g.kw}>
            Track
          </button>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Tab 3 — URL check (prototype `renderCheckTab`, line 4457)
 * ------------------------------------------------------------------------- */

export function CheckTab({ detail, collected = true }: MockTabProps): ReactElement {
  if (!collected || !import.meta.env.DEV) return <EmptyTab tabId="check" />;
  const d = genUrlTabData(detail, 'check');
  const sCls = d.isError ? 'bad' : d.isRedirect ? 'warn' : 'ok';
  const sLabel = d.isError ? 'Error' : d.isRedirect ? 'Redirect' : 'OK';
  return (
    <div className="url-tab active" data-tab="check">
      {/* Canonical chain visualization */}
      <div className="url-section">
        <div className="url-section-label">Canonical chain</div>
        <div className="tab-chain">
          <span className="tab-chain-node" title={d.requestedUrl}>
            {d.requestedUrl}
          </span>
          <span className="tab-chain-arrow" aria-hidden="true">
            <KPI_ICONS.arrow_right />
            <span className={'tab-chain-status ' + sCls}>
              {d.httpStatus} {sLabel}
            </span>
          </span>
          <span className="tab-chain-node canonical" title={d.canonicalUrl}>
            {d.canonicalUrl}
          </span>
        </div>
      </div>
      {/* 3 status cards */}
      <div className="url-section">
        <div className="url-section-label">Response overview</div>
        <div className="tab-status-cards">
          <div className="tab-status-card">
            <div className="key">HTTP status</div>
            <div className={'val ' + sCls}>{d.httpStatus}</div>
          </div>
          <div className="tab-status-card">
            <div className="key">Redirects</div>
            <div className="val">{d.redirects}</div>
          </div>
          <div className="tab-status-card">
            <div className="key">Final URL</div>
            <div className="val mono" title={d.finalUrl}>
              {d.finalUrl}
            </div>
          </div>
        </div>
      </div>
      {/* Robots directives code block */}
      <div className="url-section">
        <div className="url-section-label">Robots directives</div>
        <div className="tab-code-block">
          <div className="tab-code-head">
            <span className="lang">robots.txt</span>
            <button className="tab-code-toggle" type="button" aria-label="Toggle robots.txt block">
              <KPI_ICONS.chevron_down /> Rules
            </button>
          </div>
          <pre className="tab-code">
            {d.robotsRules.map((rule, i) => {
              const idx = rule.indexOf(':');
              if (idx < 0) {
                return (
                  <Fragment key={i}>
                    {i > 0 ? '\n' : null}
                    <span className="t">{rule}</span>
                  </Fragment>
                );
              }
              const key = rule.substring(0, idx + 1);
              const val = rule.substring(idx + 1);
              const isDisallow = /^Disallow/i.test(key);
              const isAllow = /^Allow/i.test(key);
              return (
                <Fragment key={i}>
                  {i > 0 ? '\n' : null}
                  <span className="k">{key}</span>
                  <span className={isDisallow ? 's' : isAllow ? 't' : 'p'}>{val}</span>
                </Fragment>
              );
            })}
          </pre>
        </div>
      </div>
      {/* Canonical tag mini section */}
      <div className="url-section">
        <div className="url-section-label">Canonical tag</div>
        <div className="tab-code-block">
          <div className="tab-code-head">
            <span className="lang">HTML</span>
            <span className="tab-code-meta">{'<link rel="canonical">'}</span>
          </div>
          <pre className="tab-code">{d.canonicalTag}</pre>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Tab 4 — GA4 Insights (prototype `renderInsightsTab`, line 4518)
 * ------------------------------------------------------------------------- */

export function InsightsTab({ detail, collected = true }: MockTabProps): ReactElement {
  if (!collected || !import.meta.env.DEV) return <EmptyTab tabId="insights" />;
  const d = genUrlTabData(detail, 'insights');
  return (
    <div className="url-tab active" data-tab="insights">
      <div className="tab-summary">
        <KPI_ICONS.spark />
        <span>
          Last <b>28 days</b> · GA4 analytics
        </span>
      </div>
      {/* KPI cards 2x2 */}
      <div className="url-section">
        <div className="url-section-label">Engagement</div>
        <div className="tab-kpi-grid">
          <KpiCard
            label="Sessions"
            value={d.sessions.toLocaleString()}
            foot={
              <>
                <strong>12.4%</strong> vs prev 28d
              </>
            }
            iconKey="sessions"
          />
          <KpiCard
            label="Users"
            value={d.users.toLocaleString()}
            foot={
              <>
                <strong>{Math.round((d.users / d.sessions) * 100)}%</strong> of sessions
              </>
            }
            iconKey="users"
          />
          <KpiCard
            label="Bounce rate"
            value={
              <>
                {d.bounce.toFixed(1)}
                <span className="unit">%</span>
              </>
            }
            foot={
              <>
                Above <strong>50%</strong> target
              </>
            }
            iconKey="bounce"
            footClass="warn"
          />
          <KpiCard label="Avg. session" value={d.avgDur} foot="Engaged sessions" iconKey="duration" />
        </div>
      </div>
      {/* Top landing paths */}
      <div className="url-section">
        <div className="url-section-label">Top landing paths</div>
        <div className="tab-table">
          <div className="tab-table-thead">
            <span>Path</span>
            <span>Sessions</span>
            <span>Conv. rate</span>
            <span style={{ visibility: 'hidden' }}>.</span>
          </div>
          {d.landingPaths.map((p, i) => (
            <div className="tab-table-row" key={p.path + '-' + i}>
              <span className="tab-table-q" title={p.path}>
                {p.path}
              </span>
              <span className="tab-table-n">{p.sessions.toLocaleString()}</span>
              <span className="tab-table-n pos">{p.convRate.toFixed(1)}%</span>
              <span style={{ visibility: 'hidden' }} />
            </div>
          ))}
        </div>
      </div>
      {/* Top traffic sources */}
      <div className="url-section">
        <div className="url-section-label">Top traffic sources</div>
        <div className="tab-pill-row">
          {d.sources.map((s) => (
            <span className="tab-pill" key={s.name}>
              {s.name} <b>{s.pct}%</b>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Tab 5 — Structured data (prototype `renderSchemaTab`, line 4566)
 * ------------------------------------------------------------------------- */

export function SchemaTab({ detail, collected = true }: MockTabProps): ReactElement {
  if (!collected || !import.meta.env.DEV) return <EmptyTab tabId="schema" />;
  const d = genUrlTabData(detail, 'schema');
  return (
    <div className="url-tab active" data-tab="schema">
      {/* Schema rows */}
      <div className="url-section">
        <div className="url-section-label">Detected schema</div>
        {d.schemas.map((s, i) => (
          <div className="tab-schema-row" key={s.type + '-' + i}>
            <span className="tab-schema-type">{s.type}</span>
            <span className="tab-schema-props">
              <b>{s.props}</b> properties
            </span>
            <span className={'tab-schema-status ' + s.status}>{s.status === 'valid' ? 'Valid' : 'Warning'}</span>
          </div>
        ))}
      </div>
      {/* Validation issues */}
      {d.validationIssues.length ? (
        <div className="url-section">
          <div className="url-section-label">Validation issues</div>
          <div className="tab-validation">
            <div className="tab-validation-head">
              <KPI_ICONS.warning />
              <span>
                {d.validationIssues.length} issue{d.validationIssues.length > 1 ? 's' : ''} need attention
              </span>
            </div>
            {d.validationIssues.map((v, i) => (
              <div className="tab-validation-issue" key={v.schema + '.' + v.property + '-' + i}>
                <span className="prop">
                  {v.schema}.{v.property}
                </span>
                <span className="sug">→ Provide {v.suggestion} for this property.</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {/* JSON-LD code preview (collapsible-looking, with toggle) */}
      <div className="url-section">
        <div className="url-section-label">JSON-LD preview</div>
        <div className="tab-code-block">
          <div className="tab-code-head">
            <span className="lang">application/ld+json</span>
            <button className="tab-code-toggle" type="button" aria-label="Toggle JSON-LD block">
              <KPI_ICONS.chevron_down /> Expand
            </button>
          </div>
          <pre className="tab-code">
            {d.schemas.map((s, i) => (
              <Fragment key={s.type + '-' + i}>
                {i > 0 ? '\n' : null}
                <span className="c">{'// Schema #' + (i + 1) + ' — ' + s.type}</span>
                {'\n'}
                <span className="p">{'{'}</span>
                {'\n  '}
                <span className="k">{'"@context"'}</span>
                {': '}
                <span className="s">{'"https://schema.org"'}</span>
                {','}
                {'\n  '}
                <span className="k">{'"@type"'}</span>
                {': '}
                <span className="s">{'"' + s.type + '"'}</span>
                {','}
                {'\n  '}
                <span className="k">{'"name"'}</span>
                {': '}
                <span className="s">{'"' + urlTopic(detail.url) + ' guide"'}</span>
                {/* Prototype writes `(s.props>4?',':',')` — both branches are ','. */}
                {','}
                {'\n  '}
                <span className="k">{'"datePublished"'}</span>
                {': '}
                <span className="s">{'"2026-09-14"'}</span>
                {'\n'}
                <span className="p">{'}'}</span>
              </Fragment>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Tab 6 — Internal links (prototype `renderLinksTab`, line 4623)
 * ------------------------------------------------------------------------- */

export function LinksTab({ detail, collected = true }: MockTabProps): ReactElement {
  if (!collected || !import.meta.env.DEV) return <EmptyTab tabId="links" />;
  const d = genUrlTabData(detail, 'links');
  return (
    <div className="url-tab active" data-tab="links">
      {/* Top linking pages highlight */}
      <div className="tab-highlight">
        <KPI_ICONS.star />
        <span>
          Top linking page: <b>{d.top.src}</b> · strength {d.top.strength}/10
        </span>
        <span className="right">Anchor: “{d.top.anchor}”</span>
      </div>
      {/* Header summary */}
      <div className="tab-summary">
        {/* The prototype references `KPI_ICONS.links`, which does not exist and
            therefore rendered the literal text "undefined". Using the identical
            'links' icon from NAV_ICONS instead. */}
        <NAV_ICONS.links />
        <span>
          <b>{d.count} internal links</b> point to this URL
        </span>
      </div>
      {/* Link rows */}
      {d.sources.map((s, i) => {
        const pct = s.strength * 10;
        const followPill = s.follow ? <span className="tab-link-pill follow">follow</span> : <span className="tab-link-pill nofollow">nofollow</span>;
        return (
          <div className="tab-link-row" key={s.src + '-' + i}>
            <span className="tab-link-src" title={s.src}>
              {s.src}
            </span>
            <span className="tab-link-anchor" title={s.anchor}>
              {s.anchor}
            </span>
            <span className="tab-link-strength">
              <span className="tab-strength-bar">
                <span style={{ width: pct + '%' }} />
              </span>
              <span className="tab-strength-num">{s.strength}/10</span>
            </span>
            {followPill}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Tab 7 — Images (prototype `renderImagesTab`, line 4658)
 * ------------------------------------------------------------------------- */

export function ImagesTab({ detail, collected = true }: MockTabProps): ReactElement {
  if (!collected || !import.meta.env.DEV) return <EmptyTab tabId="images" />;
  const d = genUrlTabData(detail, 'images');
  return (
    <div className="url-tab active" data-tab="images">
      {/* Missing-alt warning callout (if any) */}
      {d.missingAlt > 0 ? (
        <div className="tab-callout">
          <KPI_ICONS.warning />
          <span>
            <b>
              {d.missingAlt} image{d.missingAlt > 1 ? 's' : ''}
            </b>{' '}
            {d.missingAlt > 1 ? 'need' : 'needs'} alt text — fix for accessibility &amp; image SEO.
          </span>
        </div>
      ) : null}
      {/* Summary */}
      <div className="tab-summary">
        <KPI_ICONS.image />
        <span>
          <b>{d.count} images</b> on this page
        </span>
      </div>
      {/* Image cards */}
      <div className="tab-image-grid">
        {d.images.map((im, i) => {
          const altPill =
            im.alt === 'present' ? (
              <span className="tab-image-alt present">alt: present</span>
            ) : im.alt === 'missing' ? (
              <span className="tab-image-alt missing">alt: missing</span>
            ) : (
              <span className="tab-image-alt empty">alt: empty</span>
            );
          return (
            <div className="tab-image-card" key={im.file + '-' + i}>
              <span className="tab-image-thumb" aria-hidden="true">
                <KPI_ICONS.image />
              </span>
              <div className="tab-image-info">
                <div className="tab-image-file" title={im.file}>
                  {im.file}
                </div>
                <div className="tab-image-meta">
                  <span>
                    {im.w}×{im.h}
                  </span>
                  <span className="sep">·</span>
                  <span>{im.size} KB</span>
                </div>
              </div>
              {altPill}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Tab 8 — CSS files (prototype `renderCssTab`, line 4699)
 * ------------------------------------------------------------------------- */

export function CssTab({ detail, collected = true }: MockTabProps): ReactElement {
  if (!collected || !import.meta.env.DEV) return <EmptyTab tabId="css" />;
  const d = genUrlTabData(detail, 'css');
  return (
    <div className="url-tab active" data-tab="css">
      {/* Header summary */}
      <div className="tab-summary">
        <KPI_ICONS.css />
        <span>
          <b>{d.count} CSS files</b> · {d.blockingCount} render-blocking
        </span>
      </div>
      {/* CSS rows */}
      {d.files.map((f, i) => {
        const renderPill = f.blocking ? <span className="tab-css-render yes">Blocking</span> : <span className="tab-css-render no">Non-blocking</span>;
        return (
          <div className="tab-css-row" key={f.file + '-' + i}>
            <span className="tab-css-file" title={f.file}>
              {f.file}
            </span>
            <span className="tab-css-size">{f.size} KB</span>
            {renderPill}
            <span className="tab-css-time">{f.responseTime} ms</span>
            <span className="tab-css-status">{f.status}</span>
          </div>
        );
      })}
    </div>
  );
}
