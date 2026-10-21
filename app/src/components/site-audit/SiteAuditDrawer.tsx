/**
 * Site Audit detail drawer.
 *
 * Markup is ported verbatim from the prototype (L1 = one finding, L2 = one URL).
 * L1 is fully driven by the real report; L2's PageSpeed and CrUX tabs are driven
 * by a real PageSpeed Insights payload fetched from
 * `GET /api/public-audit/:shareToken/psi` (the Google key stays server-side and
 * the URL must already exist inside the report). The check/schema/links/images
 * tabs read the real per-page crawl facts (`report.pageStats`), and the tabs
 * with no backend data yet render explicit "Not collected yet" states — the
 * dev-only mock generators were removed, so no environment fabricates data.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { getAuditUrlPsi, type AuditUrlPsi } from '@/lib/api';
import type { AuditViewModel, ReportFinding, Tone } from './report';
import type { UrlDetail, UrlIssue, UrlTabId } from './types';
import { URL_TABS, statusTone } from './types';
import PageSpeedTab from './tabs/PageSpeedTab';
import { pagespeedFromLighthouse } from './tabs/pagespeed-types';
import CruxTab from './tabs/CruxTab';
import { cruxFromLoadingExperience } from './tabs/crux-types';
import { CheckTab, CssTab, EmptyTab, GapsTab, ImagesTab, InsightsTab, LinksTab, SchemaTab, SearchTab } from './tabs/UrlTabs';

/** Normalize a URL for matching (lowercase host, no trailing slash, no hash). *//**
 * PSI always answers with a `loadingExperience` object, but when Google has no
 * field data for the URL it carries only `initial_url` — no `metrics`. Passing
 * that to the CrUX adapter would render a full grid of empty cards, so treat a
 * metrics-less block as "no data" and let the tab show its honest empty state.
 */
function hasFieldMetrics(block: unknown): boolean {
  if (!block || typeof block !== 'object') return false;
  const metrics = (block as { metrics?: unknown }).metrics;
  return !!metrics && typeof metrics === 'object' && Object.keys(metrics as object).length > 0;
}

interface Props {
  vm: AuditViewModel;
  shareToken: string | null;
  finding: ReportFinding | null;
  open: boolean;
  onClose: () => void;
}

/** Normalize a URL for matching (lowercase host, no trailing slash, no hash). */
function normUrlFor(u: string): string {
  try {
    const parsed = new URL(u);
    return `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname.replace(/\/+$/, '')}`.toLowerCase();
  } catch {
    return u.replace(/\/+$/, '').toLowerCase();
  }
}

/** Find the stored crawl facts for one URL (real data from `report.pageStats`). */
function urlDetailFor(url: string, vm: AuditViewModel, finding: ReportFinding | null): UrlDetail {
  const norm = normUrlFor;
  const issues: UrlIssue[] = [];
  for (const category of vm.categories) {
    for (const f of category.findings) {
      if (f.affectedUrls.some((u) => norm(u) === norm(url))) {
        issues.push({
          id: f.key,
          severity: f.tone === 'high' ? 'high' : f.tone === 'medium' ? 'medium' : 'low',
          title: f.title,
          category: f.issue.category,
        });
      }
    }
  }
  if (issues.length === 0 && finding) {
    issues.push({
      id: finding.key,
      severity: finding.tone === 'high' ? 'high' : finding.tone === 'medium' ? 'medium' : 'low',
      title: finding.title,
      category: finding.issue.category,
    });
  }
  // Real crawl facts for THIS URL, when the report stored them.
  const target = norm(url);
  const stat = vm.pageStats.find((s) => norm(s.url) === target || norm(s.finalUrl || '') === target) ?? null;
  return {
    url,
    httpStatus: stat ? stat.status : null,
    contentType: null,
    pageScore: null,
    pageWeight: null,
    metaRobots: stat?.robotsMeta || null,
    robotsTxt: null,
    httpHeaders: [],
    issues,
    internalLinksCount: stat ? (typeof stat.internalCount === 'number' ? stat.internalCount : null) : null,
    imagesCount: stat ? stat.imgs : null,
    cssFilesCount: null,
    stat,
  };
}

/** Real per-URL issues list (the one L2 tab backed by stored crawl data). */
function IssuesTab({ detail }: { detail: UrlDetail }): ReactElement {
  if (detail.issues.length === 0) {
    return (
      <div className="url-tab active" data-tab="issues">
        <div className="drawer-empty">
          <div>No recorded issues for this URL.</div>
        </div>
      </div>
    );
  }
  return (
    <div className="url-tab active" data-tab="issues">
      <ul className="url-issue-list">
        {detail.issues.map((issue) => (
          <li className={`url-issue ${issue.severity}`} key={issue.id}>
            <span className={`url-issue-dot ${issue.severity}`} aria-hidden="true" />
            <div>
              <div className="url-issue-title">{issue.title}</div>
              <div className="url-issue-meta">
                {issue.severity === 'high' ? 'Critical' : issue.severity === 'medium' ? 'Warning' : 'Notice'}
                {' · '}
                {issue.category}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TabNotice({ tabId, children }: { tabId: UrlTabId; children: ReactNode }): ReactElement {
  return (
    <div className="url-tab active" data-tab={tabId}>
      <div className="drawer-empty">
        <div>{children}</div>
      </div>
    </div>
  );
}

export default function SiteAuditDrawer({ vm, shareToken, finding, open, onClose }: Props): ReactElement {
  const [level, setLevel] = useState<1 | 2>(1);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<UrlTabId>('issues');
  const [toast, setToast] = useState<string | null>(null);

  const [psi, setPsi] = useState<AuditUrlPsi | null>(null);
  const [psiState, setPsiState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const toastTimer = useRef<number | null>(null);

  const detail = useMemo(
    () => (activeUrl ? urlDetailFor(activeUrl, vm, finding) : null),
    [activeUrl, vm, finding],
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  }, []);

  // Reset to L1 whenever a new finding is opened, and again when it closes.
  useEffect(() => {
    setLevel(1);
    setActiveUrl(null);
    setTab('issues');
    setPsi(null);
    setPsiState('idle');
    setToast(null);
  }, [finding?.key, open]);

  // Escape steps L2 → L1 → closed.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (level === 2) {
        setLevel(1);
        setActiveUrl(null);
      } else {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, level, onClose]);

  // Fetch real PageSpeed data only when a tab that needs it is actually open.
  // `psiAttempt` re-runs the fetch when the user clicks Retry after an error.
  const [psiAttempt, setPsiAttempt] = useState(0);
  useEffect(() => {
    if (!open || level !== 2 || !activeUrl || !shareToken) return;
    if (tab !== 'pagespeed' && tab !== 'crux') return;
    let alive = true;
    setPsiState('loading');
    getAuditUrlPsi(shareToken, activeUrl, 'mobile')
      .then((res) => {
        if (!alive) return;
        setPsi(res.data);
        setPsiState('ready');
      })
      .catch(() => {
        if (!alive) return;
        setPsi(null);
        setPsiState('error');
      });
    return () => {
      alive = false;
    };
  }, [open, level, activeUrl, tab, shareToken, psiAttempt]);

  const retryPsi = useCallback(() => setPsiAttempt((n) => n + 1), []);

  const openUrl = (url: string) => {
    setActiveUrl(url);
    setLevel(2);
    setTab('issues');
  };

  const backToL1 = () => {
    setLevel(1);
    setActiveUrl(null);
  };

  const close = () => {
    if (level === 2) {
      backToL1();
      return;
    }
    onClose();
  };

  const status = statusTone(detail?.httpStatus ?? null);
  const severityTone: Tone = finding?.tone ?? 'low';
  const severityClass = severityTone === 'pass' ? 'low' : severityTone;
  const urls = finding?.affectedUrls ?? [];
  const affectedCount = finding?.affectedCount ?? 0;

  // The affected-URLs panel is empty for two very different reasons: the check
  // is site-wide (no URL applies) or the report stored a count/sample but no
  // page URLs. Say which one instead of a generic "no sample".
  const affectedEmptyCopy = finding
    ? finding.tone === 'pass'
      ? 'No affected URLs — this check passed.'
      : affectedCount > 0
        ? `${affectedCount} affected ${affectedCount === 1 ? 'item' : 'items'}${finding.affectedSample ? ` (${finding.affectedSample})` : ''} — this report did not store page URLs for this check.`
        : 'This check applies to the whole site, so there are no individual page URLs to list.'
    : '';

  // The adapter accepts the whole PSI response so the PageSpeed tab's Field Data
  // section can read `loadingExperience` too. Both environments render only real
  // data; a failed PSI call renders the notice (with Retry) — nothing is mocked.
  const pagespeedData = psi ? pagespeedFromLighthouse(psi) : null;
  const cruxUrlData =
    psi && hasFieldMetrics(psi.loadingExperience)
      ? cruxFromLoadingExperience(psi.loadingExperience)
      : null;
  const cruxOriginData =
    psi && hasFieldMetrics(psi.originLoadingExperience)
      ? cruxFromLoadingExperience(psi.originLoadingExperience)
      : null;

  const renderTab = (): ReactElement => {
    if (!detail) return <EmptyTab tabId={tab} />;
    switch (tab) {
      case 'issues':
        return <IssuesTab detail={detail} />;
      case 'pagespeed':
        if (!shareToken) return <TabNotice tabId="pagespeed">PageSpeed data is unavailable for this report.</TabNotice>;
        if (psiState === 'loading') return <TabNotice tabId="pagespeed">Running PageSpeed Insights on this URL…</TabNotice>;
        if (psiState === 'error') {
          return (
            <TabNotice tabId="pagespeed">
              PageSpeed Insights did not return data for this URL — the site may be unreachable, rate-limited, or blocking
              the crawler.
              <button className="full-page-btn" type="button" style={{ margin: '10px auto 0', display: 'inline-flex' }} onClick={retryPsi}>
                Retry PageSpeed
              </button>
            </TabNotice>
          );
        }
        return <PageSpeedTab detail={detail} data={pagespeedData} />;
      case 'crux':
        if (!shareToken) return <TabNotice tabId="crux">CrUX field data is unavailable for this report.</TabNotice>;
        if (psiState === 'loading') return <TabNotice tabId="crux">Loading CrUX field data for this URL…</TabNotice>;
        if (psiState === 'error') {
          return (
            <TabNotice tabId="crux">
              CrUX field data could not be loaded (the same fetch as PageSpeed).
              <button className="full-page-btn" type="button" style={{ margin: '10px auto 0', display: 'inline-flex' }} onClick={retryPsi}>
                Retry
              </button>
            </TabNotice>
          );
        }
        return <CruxTab detail={detail} data={cruxUrlData} fieldData={cruxOriginData} />;
      case 'search':
        return <SearchTab detail={detail} />;
      case 'gaps':
        return <GapsTab detail={detail} />;
      case 'check':
        return <CheckTab detail={detail} />;
      case 'insights':
        return <InsightsTab detail={detail} />;
      case 'schema':
        return <SchemaTab detail={detail} />;
      case 'links':
        return <LinksTab detail={detail} />;
      case 'images':
        return <ImagesTab detail={detail} />;
      case 'css':
        return <CssTab detail={detail} />;
      default:
        return <EmptyTab tabId={tab} />;
    }
  };

  return (
    <>
      <div
        className={`drawer-overlay${open ? ' open' : ''}`}
        id="drawerOverlay"
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        className={`drawer${level === 2 ? ' level2' : ''}${open ? ' open' : ''}`}
        id="detailDrawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawerTitle"
        aria-hidden={!open}
        tabIndex={-1}
      >
        <header className="drawer-header drawer-header-l1" id="drawerHeader1">
          <div className="drawer-header-row">
            <button className="drawer-back" id="drawerBack" type="button" aria-label="Back to findings" onClick={close}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Back to findings</span>
            </button>
            <div className="drawer-mini-stats" id="drawerMiniStats" aria-hidden="true">
              <div className="mini-stat-group">
                <span className="mini-stat">
                  <b>{vm.pagesCrawled ?? '—'}</b>
                  <label>All HTML pages</label>
                </span>
                <span className="mini-stat">
                  <b>{vm.pagesDiscovered ?? '—'}</b>
                  <label>New pages</label>
                </span>
                <span className="mini-stat">
                  <b>—</b>
                  <label>External links</label>
                </span>
              </div>
              <div className="mini-stat-group">
                <span className="mini-stat">
                  <b>{vm.counts.high}</b>
                  <label>Critical issues</label>
                </span>
                <span className="mini-stat">
                  <b>{vm.counts.medium}</b>
                  <label>Warnings</label>
                </span>
              </div>
            </div>
          </div>
          <div className="drawer-meta">
            <span className="drawer-category" id="drawerCategory">{finding?.typeLabel ?? ''}</span>
            <h2 className="drawer-title" id="drawerTitle">{finding?.title ?? ''}</h2>
            <span className={`drawer-severity ${severityClass}`} id="drawerSeverity">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>{finding?.severityLabel ?? ''}</span>
            </span>
          </div>
        </header>

        <header className="drawer-header-l2" id="drawerHeader2">
          <button className="drawer-back2" id="drawerBack2" type="button" aria-label="Back to affected URLs" onClick={backToL1}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Back to affected URLs</span>
          </button>
          <div className="drawer-url-head">
            <span className="drawer-url-mono" id="drawerUrlMono">{activeUrl ?? ''}</span>
            <span className={`drawer-url-chip ${status}`} id="drawerUrlChip">
              {detail?.httpStatus ?? '—'}
            </span>
          </div>
        </header>

        <div className="drawer-body drawer-body-l1" id="drawerBody">
          <section className="drawer-section">
            <div className="drawer-label">Summary</div>
            <p className="drawer-summary" id="drawerSummary">{finding?.desc || ''}</p>
          </section>
          <section className="drawer-section">
            <div className="drawer-label">Impact</div>
            <p className="drawer-impact" id="drawerImpact">
              {finding?.issue.why || (affectedCount > 0 ? `This issue affects ${affectedCount} URL${affectedCount === 1 ? '' : 's'}.` : '')}
            </p>
          </section>
          <section className="drawer-section">
            <div className="drawer-label">Affected URLs</div>
            <div className="drawer-url-table" id="drawerUrlTable">
              {urls.length === 0 ? (
                <div className="drawer-empty">
                  <div>{affectedEmptyCopy}</div>
                </div>
              ) : (
                <>
                  <div className="drawer-url-thead">
                    <span>Page</span>
                    <span>Status</span>
                    <span>MB</span>
                    <span>Score</span>
                    <span>Discovered</span>
                    <span />
                  </div>
                  {urls.map((url) => {
                    const path = (() => {
                      try {
                        const u = new URL(url);
                        return `${u.pathname}${u.search}` || '/';
                      } catch {
                        return url;
                      }
                    })();
                    return (
                      <div
                        className="drawer-url-row"
                        data-url={url}
                        data-status="0"
                        data-finding={finding?.title ?? ''}
                        key={url}
                        onClick={() => openUrl(url)}
                      >
                        <span className="drawer-url-cell favicon">
                          <span className="drawer-url-favicon" aria-hidden="true">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          </span>
                          <span className="drawer-url-path" title={url}>{path}</span>
                        </span>
                        <span className="drawer-url-pill miss">—</span>
                        <span className="drawer-url-metric">—</span>
                        <span className="drawer-url-metric score">—</span>
                        <span className="drawer-url-date">—</span>
                        <button
                          className="full-page-btn"
                          type="button"
                          aria-label={`Open full page detail for ${url}`}
                          data-url={url}
                          data-status="0"
                          data-finding={finding?.title ?? ''}
                        >
                          Full page detail{' '}
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </section>
          <section className="drawer-section">
            <div className="drawer-label">Recommendation</div>
            <ul className="drawer-recs" id="drawerRecs">
              {finding?.issue.fix ? <li>{finding.issue.fix}</li> : null}
            </ul>
          </section>
          {!finding?.desc && !finding?.issue.fix ? (
            <div className="drawer-empty" id="drawerEmpty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>No details available for this finding.</div>
            </div>
          ) : null}
        </div>

        <div className="drawer-body-l2" id="drawerBody2">
          <nav className="url-nav" id="urlNav" aria-label="URL detail sections" role="tablist">
            {URL_TABS.map((entry) => {
              const err = detail?.issues.filter((i) => i.severity === 'high').length ?? 0;
              const warn = detail?.issues.filter((i) => i.severity === 'medium').length ?? 0;
              const isIssues = entry.id === 'issues';
              return (
                <button
                  className={`url-nav-item${tab === entry.id ? ' active' : ''}`}
                  data-tab={entry.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === entry.id}
                  key={entry.id}
                  onClick={() => setTab(entry.id)}
                >
                  <span className="url-nav-label">{entry.label}</span>
                  {isIssues && (err > 0 || warn > 0) ? (
                    <span className="url-nav-badge dual">
                      <span className="err">{err} err</span>
                      <span className="dot">·</span>
                      <span className="warn">{warn} warn</span>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
          <main className="url-main" id="urlMain">{renderTab()}</main>
        </div>

        <footer className="drawer-footer drawer-footer-l1" id="drawerFooter1">
          <div className="drawer-toast" id="drawerToast" role="status" aria-live="polite" hidden={!toast}>
            {toast ?? ''}
          </div>
          <div className="drawer-actions">
            <button
              className="btn"
              id="drawerResolve"
              type="button"
              onClick={() => showToast('Resolving findings in-app is not wired up yet — it will land in a later release.')}
            >
              Mark as resolved
            </button>
            <button
              className="btn primary"
              id="drawerRecrawl"
              type="button"
              onClick={() => showToast('Re-crawling a single URL is not wired up yet — run a new audit instead.')}
            >
              <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Re-crawl this URL
            </button>
          </div>
        </footer>

        <footer className="drawer-footer-l2" id="drawerFooter2">
          <div className="drawer-toast" id="drawerToast2" role="status" aria-live="polite" hidden={!toast}>
            {toast ?? ''}
          </div>
          <div className="drawer-actions">
            <button
              className="btn"
              id="drawerCopyUrl"
              type="button"
              onClick={() => {
                if (!activeUrl) return;
                navigator.clipboard?.writeText(activeUrl).then(
                  () => showToast('URL copied to clipboard.'),
                  () => showToast('Could not access the clipboard.'),
                );
              }}
            >
              <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy URL
            </button>
            <button
              className="btn primary"
              id="drawerRecrawlUrl"
              type="button"
              onClick={() => showToast('Re-crawling a single URL is not wired up yet — run a new audit instead.')}
            >
              <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Re-crawl this URL
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
}
