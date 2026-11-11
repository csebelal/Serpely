/* ===========================================================================
 * UrlTabs — the L2 URL-detail tabs backed by REAL collected data.
 *
 * The eight prototype tabs previously fabricated their contents from a
 * dev-only mock generator (`genUrlTabData`). That generator was removed:
 * every environment now renders only what the crawl actually stored.
 *
 * Tabs and their data sources in v1:
 *  - `check`   → per-URL crawl facts (`report.pageStats` via `UrlDetail.stat`)
 *  - `schema`  → JSON-LD types parsed from the page HTML (same source)
 *  - `links`   → internal link count + external link samples (same source)
 *  - `images`  → image counts, missing alt/dimensions/lazy (same source)
 *  - `search` / `gaps` / `insights` / `css` → no backend data yet → honest
 *    "Not collected yet" empty states (never mock data).
 * =========================================================================== */

import type { ReactElement } from 'react';
import type { AuditUrlCss } from '@/lib/api';
import type { UrlDetail, UrlTabId } from '../types';

/* Prototype EMPTY_ICON (line 2715). */
function EmptyIcon(): ReactElement {
  return (
    <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx={12} cy={12} r={10} />
      <line x1={12} y1={8} x2={12} y2={12} />
      <line x1={12} y1={16} x2={12.01} y2={16} />
    </svg>
  );
}

/** Honest empty state with per-tab copy. */
export function EmptyTab({ tabId, detail }: { tabId: UrlTabId; detail?: UrlDetail | null }): ReactElement {
  const labels: Partial<Record<UrlTabId, string>> = {
    check: 'URL check',
    css: 'CSS & critical requests',
  };
  const hints: Partial<Record<UrlTabId, string>> = {
    css: 'No stylesheet or render-blocking request chain data was returned for this URL.',
    check: detail
      ? 'This URL isn\'t in the stored page sample (the report keeps crawl facts for the first ~120 crawled pages).'
      : undefined,
  };
  return (
    <div className="url-tab active" data-tab={tabId}>
      <div className="url-empty">
        <EmptyIcon />
        <b>Not collected yet</b>
        <span>{hints[tabId] || `${labels[tabId] || 'This view'} data isn't collected by this audit yet.`}</span>
      </div>
    </div>
  );
}

/* A small KPI card using the prototype's `.tab-kpi` styling. */
function Kpi({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="tab-kpi">
      <div className="tab-kpi-head">
        <span className="tab-kpi-label">{label}</span>
      </div>
      <div className="tab-kpi-value">{value}</div>
    </div>
  );
}

/* Short path form for display. */
function pathOf(u: string): string {
  try {
    const parsed = new URL(u);
    return `${parsed.pathname}${parsed.search}` || '/';
  } catch {
    return u;
  }
}

/* Host of a stored link; '' when malformed (never renders false data). */
function hostOf(u: string): string {
  try {
    return new URL(u).hostname;
  } catch {
    return '';
  }
}

/* Status wording derived ONLY from the real stored status. */
function statusText(stat: { status: number; error?: string; offsite?: string }): string {
  if (stat.offsite) return 'Redirects off-site';
  if (stat.error) return `Not crawled — ${stat.error}`;
  if (stat.status === 200) return 'OK';
  if (stat.status >= 300 && stat.status < 400) return 'Redirect';
  if (stat.status === 0) return 'Not crawled';
  return `${stat.status}`;
}

/* ---------------------------------------------------------------------------
 * Tab — CSS & Critical Request Chains (real data from critical_request_chain.py)
 * ------------------------------------------------------------------------- */
export function CssTab({ data }: { detail: UrlDetail; data: AuditUrlCss | null }): ReactElement {
  if (!data) return <EmptyTab tabId="css" />;
  if (data.fetch_error) {
    return (
      <div className="url-tab active" data-tab="css">
        <div className="url-empty">
          <EmptyIcon />
          <b>Could not inspect stylesheets</b>
          <span>{data.fetch_error}</span>
        </div>
      </div>
    );
  }
  const chains = data.chains ?? [];
  const stylesheets = chains.filter((c) => c.type === 'stylesheet');
  const scripts = chains.filter((c) => c.type === 'script');
  const blockingScripts = scripts.filter((s) => s.blocking);
  const issues = data.issues ?? [];

  return (
    <div className="url-tab active" data-tab="css">
      <div className="url-section">
        <div className="url-section-label">Render-blocking summary</div>
        <div className="tab-kpi-grid">
          <Kpi label="Stylesheets" value={String(stylesheets.length)} />
          <Kpi label="Critical blocking requests" value={String(data.critical_request_count ?? 0)} />
          <Kpi label="Scripts in head/body" value={String(scripts.length)} />
          <Kpi label="Parser-blocking scripts" value={String(blockingScripts.length)} />
        </div>
      </div>

      {stylesheets.length > 0 ? (
        <div className="url-section">
          <div className="url-section-label">Stylesheets ({stylesheets.length})</div>
          <ul className="url-issue-list">
            {stylesheets.map((sheet, i) => {
              const tags = [
                sheet.blocking ? 'Render-blocking' : 'Non-blocking',
                sheet.preloaded ? 'Preloaded' : null,
                sheet.cross_origin ? (sheet.preconnected ? 'Cross-origin (preconnected)' : 'Cross-origin (no preconnect)') : 'Same-origin',
                sheet.children && sheet.children.length > 0 ? `${sheet.children.length} @import(s)` : null,
              ].filter(Boolean);
              return (
                <li className={`url-issue ${sheet.blocking && !sheet.preloaded ? 'medium' : 'low'}`} key={`${sheet.url}-${i}`}>
                  <span className={`url-issue-dot ${sheet.blocking && !sheet.preloaded ? 'medium' : 'low'}`} aria-hidden="true" />
                  <div style={{ minWidth: 0 }}>
                    <div className="url-issue-title" style={{ wordBreak: 'break-all' }}>{pathOf(sheet.url)}</div>
                    <div className="url-issue-meta">{tags.join(' · ')}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="url-section">
          <div className="ps-device-empty">No external &lt;link rel=&quot;stylesheet&quot;&gt; resources detected on this URL.</div>
        </div>
      )}

      {blockingScripts.length > 0 && (
        <div className="url-section">
          <div className="url-section-label">Parser-blocking scripts ({blockingScripts.length})</div>
          <ul className="url-issue-list">
            {blockingScripts.map((script, i) => (
              <li className="url-issue high" key={`${script.url}-${i}`}>
                <span className="url-issue-dot high" aria-hidden="true" />
                <div style={{ minWidth: 0 }}>
                  <div className="url-issue-title" style={{ wordBreak: 'break-all' }}>{pathOf(script.url)}</div>
                  <div className="url-issue-meta">
                    Missing async/defer{script.cross_origin ? ' · Cross-origin' : ''}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {issues.length > 0 && (
        <div className="url-section">
          <div className="url-section-label">Optimization notes ({issues.length})</div>
          <ul className="url-issue-list">
            {issues.slice(0, 12).map((iss, idx) => (
              <li className={`url-issue ${iss.severity === 'warning' ? 'medium' : 'low'}`} key={`${iss.message}-${idx}`}>
                <span className={`url-issue-dot ${iss.severity === 'warning' ? 'medium' : 'low'}`} aria-hidden="true" />
                <div style={{ minWidth: 0 }}>
                  <div className="url-issue-title">{iss.message}</div>
                  {iss.url && <div className="url-issue-meta" style={{ wordBreak: 'break-all' }}>{pathOf(iss.url)}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Tab — URL check (real crawl facts)
 * ------------------------------------------------------------------------- */
export function CheckTab({ detail }: { detail: UrlDetail }): ReactElement {
  const stat = detail.stat;
  if (!stat) return <EmptyTab tabId="check" detail={detail} />;
  if (stat.offsite) {
    return (
      <div className="url-tab active" data-tab="check">
        <div className="url-empty">
          <EmptyIcon />
          <b>Redirects to another site</b>
          <span>
            This URL redirects to <b>{stat.offsite}</b>, so its content was not crawled and it does not belong to this audit's
            findings.
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="url-tab active" data-tab="check">
      <div className="url-section">
        <div className="url-section-label">Response</div>
        <div className="tab-kpi-grid">
          <Kpi label="HTTP status" value={String(stat.status || detail.httpStatus || 0) || '—'} />
          <Kpi label="Redirect hops" value={String(stat.hops)} />
          <Kpi label="Crawl depth" value={String(stat.depth)} />
          <Kpi label="Fetch time" value={stat.loadMs > 0 ? `${(stat.loadMs / 1000).toFixed(1)}s` : '—'} />
        </div>
      </div>
      <div className="url-section">
        <div className="url-section-label">Metadata</div>
        <div className="tab-kpi-grid">
          <Kpi label="Title" value={stat.title ? `"${stat.title}"` : 'Missing'} />
          <Kpi label="Title length" value={stat.title ? `${stat.title.length} chars` : '—'} />
          <Kpi label="Meta description" value={stat.descLen > 0 ? `${stat.descLen} chars` : 'Missing'} />
          <Kpi label="H1 tags" value={String(stat.h1Count)} />
          <Kpi label="Canonical" value={stat.canonical ? pathOf(stat.canonical) : 'None'} />
          <Kpi label="Meta robots" value={stat.robotsMeta || 'None'} />
          <Kpi label="Word count" value={String(stat.words)} />
          <Kpi label="Internal links" value={String(stat.internalCount)} />
        </div>
      </div>
      <div className="url-section">
        <div className="url-section-label">Verdict</div>
        <div className="ps-device-empty">{statusText(stat)} — crawled as {pathOf(stat.finalUrl || stat.url)}</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Tab — Schema (real JSON-LD types parsed from the page)
 * ------------------------------------------------------------------------- */
export function SchemaTab({ detail }: { detail: UrlDetail }): ReactElement {
  const stat = detail.stat;
  if (!stat || stat.offsite) return <EmptyTab tabId="check" detail={detail} />;
  const types = stat.schemaTypes ?? [];
  return (
    <div className="url-tab active" data-tab="schema">
      <div className="url-section">
        <div className="url-section-label">Structured data on this page</div>
        {types.length === 0 ? (
          <div className="ps-device-empty">No structured data (JSON-LD) was found on this page.</div>
        ) : (
          <ul className="url-issue-list">
            {types.map((t) => (
              <li className="url-issue low" key={t}>
                <span className="url-issue-dot low" aria-hidden="true" />
                <div>
                  <div className="url-issue-title">{t}</div>
                  <div className="url-issue-meta">JSON-LD · parsed from page HTML</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Tab — Links (real internal count + real external link samples)
 * ------------------------------------------------------------------------- */
export function LinksTab({ detail }: { detail: UrlDetail }): ReactElement {
  const stat = detail.stat;
  if (!stat || stat.offsite) return <EmptyTab tabId="check" detail={detail} />;
  const external = stat.externalLinks ?? [];
  const internal = typeof stat.internalCount === 'number' ? stat.internalCount : detail.internalLinksCount;
  return (
    <div className="url-tab active" data-tab="links">
      <div className="url-section">
        <div className="url-section-label">Links on this page</div>
        <div className="tab-kpi-grid">
          <Kpi label="Internal links" value={internal !== null ? String(internal) : '—'} />
          <Kpi label="External link hosts (sampled)" value={String(external.length)} />
        </div>
      </div>
      {external.length > 0 ? (
        <div className="url-section">
          <div className="url-section-label">External links (first {external.length})</div>
          <ul className="url-issue-list">
            {external.map((link) => (
              <li className="url-issue low" key={link}>
                <span className="url-issue-dot low" aria-hidden="true" />
                <div>
                  <div className="url-issue-title">{pathOf(link)}</div>
                  <div className="url-issue-meta">{hostOf(link)}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Tab — Images (real image counts from the crawl)
 * ------------------------------------------------------------------------- */
export function ImagesTab({ detail }: { detail: UrlDetail }): ReactElement {
  const stat = detail.stat;
  if (!stat || stat.offsite) return <EmptyTab tabId="check" detail={detail} />;
  return (
    <div className="url-tab active" data-tab="images">
      <div className="url-section">
        <div className="url-section-label">Images on this page</div>
        <div className="tab-kpi-grid">
          <Kpi label="Images" value={String(stat.imgs)} />
          <Kpi label="Missing alt" value={String(stat.imgsNoAlt)} />
          <Kpi label="Missing dimensions" value={String(stat.imgsMissingDims)} />
          <Kpi label="No lazy loading" value={String(stat.imgsNoLazy)} />
        </div>
      </div>
      <div className="url-section">
        <div className="url-section-label">Verdict</div>
        <div className="ps-device-empty">
          {stat.imgs === 0
            ? 'No <img> elements were found on this page.'
            : stat.imgsNoAlt === 0
              ? 'All sampled images carry alt attributes.'
              : `${stat.imgsNoAlt} of ${stat.imgs} images are missing alt attributes.`}
        </div>
      </div>
    </div>
  );
}
