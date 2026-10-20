/**
 * Site Audit page chrome — topbar, hero, summary and footer.
 *
 * The markup is ported verbatim from the prototype and rewired to real report
 * data. The findings table and the detail drawer are separate components.
 *
 * Two rendering modes:
 *  - standalone (`embedded` false): the prototype's full page, with its own
 *    workspace topbar and footer. Used by `/audit-preview/:id`.
 *  - embedded (`embedded` true): the report only — the workspace topbar and
 *    footer are dropped because the host page (public `/audit`) already has
 *    the marketing navbar around it.
 *
 * Affordances wired to real behaviour: the brand links home, “Run new audit”
 * returns to the audit form (or focuses it when embedded), and “Export report”
 * prints the report exactly like the prototype did. The remaining prototype
 * chrome (nav links, Help/Settings) is inert by design.
 */
import type { CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SiteAuditFindings from './SiteAuditFindings';
import SiteAuditDrawer from './SiteAuditDrawer';
import type { AuditViewModel, CategoryId, ReportFinding, Tone } from './report';
import '../../styles/audit-prototype.css';

interface Props {
  vm: AuditViewModel;
  collapsed: ReadonlySet<CategoryId>;
  onToggleCategory: (id: CategoryId) => void;
  onSetCollapsed: (ids: CategoryId[]) => void;
  severityFilter: 'all' | Tone;
  onSeverityFilter: (tone: 'all' | Tone) => void;
  onOpenFinding: (finding: ReportFinding) => void;
  onCloseFinding: () => void;
  openFinding: ReportFinding | null;
  shareToken: string | null;
  /** Render the report inside a host page instead of as a full page. */
  embedded?: boolean;
}

export default function SiteAuditShell({
  vm,
  collapsed,
  onToggleCategory,
  onSetCollapsed,
  severityFilter,
  onSeverityFilter,
  onOpenFinding,
  onCloseFinding,
  openFinding,
  shareToken,
  embedded = false,
}: Props) {
  const navigate = useNavigate();
  const overallScore = vm.overall ?? 0;
  const passRate = vm.counts.all > 0 ? Math.round((vm.counts.pass / vm.counts.all) * 100) : 0;
  const scoreLabel =
    overallScore >= 90 ? 'Excellent' : overallScore >= 75 ? 'Good' : overallScore >= 50 ? 'Needs attention' : 'Poor';
  const lastCrawled = vm.generatedAt
    ? vm.generatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Not recorded';

  // Embedded: the form is right above us, so bring it into view instead of
  // navigating to `/audit` (which would be a same-page route change).
  const runNewAudit = () => {
    if (!embedded) {
      navigate('/audit');
      return;
    }
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Website URL to audit"]');
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input?.focus({ preventScroll: true });
  };

  return (
    <div className={`sa-root${embedded ? ' sa-embedded' : ''}`}>
      {!embedded && (
      <header className="topbar" role="banner"> 
        <Link to="/" className="brand" aria-label="Serpely home"> 
          <span className="brand-icon" aria-hidden="true">S
          </span> 
          <span>serpely
          </span> 
        </Link> 
        <nav className="nav" aria-label="Primary"> 
          <a href="#">Overview
          </a> 
          <a href="#" className="active" aria-current="page">Site Audit
          </a> 
          <a href="#">AI Visibility
          </a> 
          <a href="#">Rank Tracking
          </a> 
          <a href="#">Reports
          </a> 
        </nav> 
        <div className="right-nav"> 
          <button className="btn" type="button"> 
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5" />
              <circle cx="12" cy="17" r=".5" fill="currentColor" />
            </svg>
            Help center

          </button> 
          <button className="btn" type="button"> 
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings

          </button> 
          <div className="avatar" aria-label="Account: Bella">B
          </div> 
        </div> 
      </header>
      )}
      <main className="container"> 
        <nav className="breadcrumb" aria-label="Breadcrumb"> 
          <span>Workspace
          </span> 
          <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg> 
          <span>Projects
          </span> 
          <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg> 
          <b>Site Audit
          </b> 
        </nav> 
        <section className="page-heading"> 
          <div> 
            <h1>Site Audit
            </h1> 
            <p className="subtitle">A clear view of your website's technical health. Browse findings by category, filter what matters, and open details without losing context.
            </p> 
          </div> 
          <div className="heading-actions"> 
            <button className="btn" id="exportBtn" type="button" onClick={() => window.print()}> 
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export report

            </button> 
            <button className="btn primary" id="runAudit" type="button" onClick={runNewAudit}> 
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Run new audit

            </button> 
          </div> 
        </section> 
        <section className="site-card" aria-label="Audited site"> 
          <div className="site-left"> 
            <div className="site-icon" aria-hidden="true"> 
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg> 
            </div> 
            <div> 
              <div className="site-title">{vm.siteTitle}
              </div> 
              <div className="site-url">{vm.siteUrl}
              </div> 
            </div> 
            <span className="status">
              <i className="status-dot" aria-hidden="true">
              </i> Audit results available
            </span> 
          </div> 
          <div className="site-right"> 
            <span>Last crawled: 
              <strong>{lastCrawled}
              </strong>
            </span> 
          </div> 
        </section> 
        <section className="summary" aria-label="Audit summary"> 
          <article className="card metric overall"> 
            <div className="metric-label">Overall health 
              <span className="small-label">Score
              </span>
            </div> 
            <div className="overall-row"> 
              <div className="gauge" style={{ "--score": String(overallScore) } as CSSProperties}>
                <b>{overallScore}
                </b>
              </div> 
              <div> 
                <div className="metric-value">{overallScore}
                  <span style={{ "fontSize": "12px", "color": "var(--muted-2)", "fontWeight": 600 }}> / 100
                  </span>
                </div> 
                <div className="metric-foot">{scoreLabel}
                </div> 
              </div> 
            </div> 
          </article> 
          <article className="card metric"> 
            <div className="metric-label">Critical issues 
              <span className="metric-symbol" aria-hidden="true"> 
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg> 
              </span>
            </div> 
            <div className="metric-value critical" data-metric="high">{vm.counts.high}
            </div> 
            <div className="metric-foot">Resolve these first
            </div> 
          </article> 
          <article className="card metric"> 
            <div className="metric-label">Warnings 
              <span className="metric-symbol" style={{ "color": "var(--warning-2)", "background": "linear-gradient(150deg, var(--warning-bg) 0%, #fde8c2 100%)", "boxShadow": "inset 0 0 0 1px var(--warning-border)" }} aria-hidden="true"> 
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg> 
              </span>
            </div> 
            <div className="metric-value warning" data-metric="medium">{vm.counts.medium}
            </div> 
            <div className="metric-foot">Worth reviewing
            </div> 
          </article> 
          <article className="card metric"> 
            <div className="metric-label">Opportunities 
              <span className="metric-symbol" style={{ "color": "var(--info-2)", "background": "linear-gradient(150deg, var(--info-bg) 0%, #d8e3fa 100%)", "boxShadow": "inset 0 0 0 1px var(--info-border)" }} aria-hidden="true"> 
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg> 
              </span>
            </div> 
            <div className="metric-value" style={{ "color": "var(--info-2)" }} data-metric="low">{vm.counts.low}
            </div> 
            <div className="metric-foot">Potential improvements
            </div> 
          </article> 
          <article className="card metric"> 
            <div className="metric-label">Passed checks 
              <span className="metric-symbol" aria-hidden="true"> 
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg> 
              </span>
            </div> 
            <div className="metric-value passed" data-metric="pass">{vm.counts.pass}
            </div> 
            <div className="metric-foot">Checks passed successfully
            </div> 
          </article> 
        </section> 
        <section className="top-grid"> 
          <article className="card panel"> 
            <div className="panel-header"> 
              <div> 
                <h3>Audit summary
                </h3> 
                <p>See the distribution of findings before diving into detail.
                </p> 
              </div> 
              <span className="small-label">Crawl overview
              </span> 
            </div> 
            <div className="issue-stats"> 
              <div className="issue-stat">
                <b className="critical">{vm.counts.high}
                </b>
                <span>Critical
                </span>
              </div> 
              <div className="issue-stat">
                <b className="warning">{vm.counts.medium}
                </b>
                <span>Warnings
                </span>
              </div> 
              <div className="issue-stat">
                <b style={{ "color": "var(--info-2)" }}>{vm.counts.low}
                </b>
                <span>Opportunities
                </span>
              </div> 
              <div className="issue-stat">
                <b className="passed">{vm.counts.pass}
                </b>
                <span>Passed
                </span>
              </div> 
            </div> 
            <div className="progress-label">
              <span>Checks passed
              </span>
              <strong>{passRate}% passed
              </strong>
            </div> 
            <div className="progress">
              <span style={{ width: `${passRate}%` }}>
              </span>
            </div> 
            <div className="action-strip"> 
              <div className="action-icon" aria-hidden="true"> 
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg> 
              </div> 
              <div className="action-text">
                <b>Start with the {vm.counts.high} critical issues
                </b>
                <span>Fix high-impact crawl and indexing blockers first.
                </span>
              </div> 
              <button className="btn" data-jump="high" type="button" onClick={() => onSeverityFilter('high')}>View critical
              </button> 
            </div> 
          </article> 
          <article className="card panel"> 
            <div className="panel-header"> 
              <div> 
                <h3>Audit coverage
                </h3> 
                <p>Quick status across key SEO areas.
                </p> 
              </div> 
              <button className="btn" style={{ "padding": "6px 11px" }} id="expandAll" type="button"> 
                <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="4 9 12 16 20 9" />
                </svg>
                Expand all

              </button> 
            </div> 
            <div className="coverage-list">
              {vm.coverage.map((row) => (
                <div className="coverage-item" key={row.id}>
                  <div>
                    <div className="coverage-name">{row.name}</div>
                    <div className="coverage-detail">{row.detail}</div>
                  </div>
                  <span className={`coverage-state ${row.state}`}>{row.label}</span>
                </div>
              ))}
            </div>
          </article> 
        </section> 
      <SiteAuditFindings
        categories={vm.categories}
        collapsed={collapsed}
        onToggleCategory={onToggleCategory}
        onSetCollapsed={onSetCollapsed}
        severityFilter={severityFilter}
        onSeverityFilter={onSeverityFilter}
        onOpenFinding={onOpenFinding}
      />
      </main>
      {!embedded && (
      <footer> 
        <span>© 2026 Serpely · Website intelligence
        </span> 
        <div className="footer-links">
          <span>Documentation
          </span>
          <span>Privacy
          </span>
          <span>Support
          </span>
        </div> 
      </footer>
      )} 
      <SiteAuditDrawer vm={vm} shareToken={shareToken} finding={openFinding} open={openFinding !== null} onClose={onCloseFinding} />
    </div>
  );
}
