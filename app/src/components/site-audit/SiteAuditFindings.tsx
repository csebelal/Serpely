/**
 * The findings table — the main body of the redesigned Site Audit page.
 *
 * Markup is the prototype's, driven entirely by a real `PublicAuditReport`
 * (mapped through `buildAuditViewModel`). Counts, categories, filters and rows
 * are all derived from the report; nothing is hardcoded.
 */
import { useMemo, useState } from 'react';
import type { CategoryId, ReportCategory, ReportFinding, Tone } from './report';
import { CATEGORY_ICONS, CAT_CHEVRON, DETAIL_ARROW, FINDING_STATE_ICONS } from './categoryIcons';

const TONE_STATE: Record<Tone, keyof typeof FINDING_STATE_ICONS> = {
  high: 'bad',
  medium: 'warn',
  low: 'info',
  pass: 'good',
};

const FILTERS: { id: 'all' | Tone; label: string }[] = [
  { id: 'all', label: 'All findings' },
  { id: 'high', label: 'Critical' },
  { id: 'medium', label: 'Warnings' },
  { id: 'low', label: 'Opportunities' },
  { id: 'pass', label: 'Passed' },
];

interface Props {
  categories: ReportCategory[];
  onOpenFinding: (finding: ReportFinding) => void;
  /** Categories the user has collapsed. Owned by the page so it survives drawer use. */
  collapsed: ReadonlySet<CategoryId>;
  onToggleCategory: (id: CategoryId) => void;
  onSetCollapsed: (ids: CategoryId[]) => void;
  /** Severity filter is owned by the page so the hero can jump to "critical". */
  severityFilter: 'all' | Tone;
  onSeverityFilter: (tone: 'all' | Tone) => void;
}

export default function SiteAuditFindings({
  categories,
  onOpenFinding,
  collapsed,
  onToggleCategory,
  onSetCollapsed,
  severityFilter,
  onSeverityFilter,
}: Props) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | CategoryId>('all');
  const [sortBy, setSortBy] = useState<'severity' | 'name'>('severity');

  const query = search.trim().toLowerCase();

  // One pass: apply the non-severity filters once, then derive everything from it.
  const scoped = useMemo(() => {
    return categories
      .filter((c) => categoryFilter === 'all' || c.id === categoryFilter)
      .map((c) => ({
        ...c,
        findings: c.findings.filter((f) => {
          if (severityFilter !== 'all' && f.tone !== severityFilter) return false;
          if (!query) return true;
          return (
            f.title.toLowerCase().includes(query) ||
            f.desc.toLowerCase().includes(query) ||
            f.typeLabel.toLowerCase().includes(query) ||
            (f.affectedExample ?? '').toLowerCase().includes(query)
          );
        }),
      }));
  }, [categories, categoryFilter, severityFilter, query]);

  const pillCounts = useMemo(() => {
    const out: Record<'all' | Tone, number> = { all: 0, high: 0, medium: 0, low: 0, pass: 0 };
    for (const c of categories) {
      if (categoryFilter !== 'all' && c.id !== categoryFilter) continue;
      for (const f of c.findings) {
        if (query && !(f.title.toLowerCase().includes(query) || f.desc.toLowerCase().includes(query))) continue;
        out.all += 1;
        out[f.tone] += 1;
      }
    }
    return out;
  }, [categories, categoryFilter, query]);

  const visible = useMemo(() => {
    const rows = scoped.filter((c) => c.findings.length > 0);
    if (sortBy === 'name') {
      return [...rows].sort((a, b) => a.title.localeCompare(b.title));
    }
    const rank: Record<Tone, number> = { high: 0, medium: 1, low: 2, pass: 3 };
    return [...rows].sort((a, b) => {
      const aMin = Math.min(...a.findings.map((f) => rank[f.tone]));
      const bMin = Math.min(...b.findings.map((f) => rank[f.tone]));
      return aMin - bMin;
    });
  }, [scoped, sortBy]);

  const visibleCount = useMemo(() => visible.reduce((n, c) => n + c.findings.length, 0), [visible]);
  const totalCount = useMemo(() => categories.reduce((n, c) => n + c.findings.length, 0), [categories]);
  const hasFilters = Boolean(query) || categoryFilter !== 'all' || severityFilter !== 'all';

  const expandAll = () => onSetCollapsed([]);
  const collapseAll = () => onSetCollapsed(categories.map((c) => c.id));
  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    onSeverityFilter('all');
  };

  if (categories.length === 0) {
    return (
      <section className="audit-area" id="issues" aria-label="Audit findings">
        <div className="audit-head">
          <div>
            <h2>Audit findings</h2>
            <p>Detailed results are grouped into collapsible categories to keep long reports easy to scan.</p>
          </div>
        </div>
        <div className="no-results" id="noResults">
          This report did not record any findings. Run a new audit to collect results.
        </div>
      </section>
    );
  }

  return (
    <section className="audit-area" id="issues" aria-label="Audit findings">
      <div className="audit-head">
        <div>
          <h2>Audit findings</h2>
          <p>Detailed results are grouped into collapsible categories to keep long reports easy to scan.</p>
        </div>
        <div className="audit-head-right">
          <button className="btn" id="collapseAll" type="button" onClick={collapseAll}>
            <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="4 15 12 8 20 15" />
            </svg>
            Collapse all
          </button>
          <button className="btn" id="showAll" type="button" onClick={() => { clearFilters(); expandAll(); }}>
            <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="4 9 12 16 20 9" />
            </svg>
            Show all findings
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="filters" role="tablist" aria-label="Filter by severity">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`filter${severityFilter === f.id ? ' active' : ''}`}
              data-filter={f.id}
              type="button"
              role="tab"
              aria-selected={severityFilter === f.id}
              onClick={() => onSeverityFilter(f.id)}
            >
              {f.label} <span id={f.id === 'all' ? 'allCount' : undefined}>{pillCounts[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="controls">
          <div className="search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              className="search"
              id="search"
              type="search"
              placeholder="Search issue, page URL…"
              aria-label="Search audit findings"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="select"
            id="categoryFilter"
            aria-label="Filter category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'all' | CategoryId)}
          >
            <option value="all">All categories</option>
            <option value="crawl">Crawlability</option>
            <option value="index">Indexing</option>
            <option value="onpage">On-page SEO</option>
            <option value="links">Internal links</option>
            <option value="schema">Structured data</option>
            <option value="performance">Performance</option>
          </select>
          <select
            className="select"
            id="sortBy"
            aria-label="Sort findings"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'severity' | 'name')}
          >
            <option value="severity">Sort: Severity</option>
            <option value="name">Sort: Name A–Z</option>
          </select>
        </div>
      </div>

      <div className="result-meta">
        <span>
          <strong id="visibleCount">{visibleCount}</strong> visible findings in this report
        </span>
        <span>Click a category to expand or collapse · Use Search to locate a specific issue</span>
      </div>

      <div id="categoryList">
        {visible.map((category) => {
          const isCollapsed = collapsed.has(category.id);
          const critical = category.findings.filter((f) => f.tone === 'high').length;
          const warnings = category.findings.filter((f) => f.tone === 'medium' || f.tone === 'low').length;
          const passed = category.findings.filter((f) => f.tone === 'pass').length;
          return (
            <section className="category" data-category={category.id} key={category.id}>
              <button
                className="category-head"
                aria-expanded={!isCollapsed}
                type="button"
                onClick={() => onToggleCategory(category.id)}
              >
                <span className="cat-chevron" aria-hidden="true">{CAT_CHEVRON}</span>
                <span className="cat-icon" aria-hidden="true">{CATEGORY_ICONS[category.id]}</span>
                <span className="cat-copy">
                  <span className="cat-title">{category.title}</span>
                  <span className="cat-desc">{category.desc}</span>
                </span>
                <span className="cat-counts">
                  {critical > 0 && <span className="count-pill red">{critical} critical</span>}
                  {warnings > 0 && <span className="count-pill amber">{warnings} warnings</span>}
                  {passed > 0 && <span className="count-pill green">{passed} passed</span>}
                </span>
              </button>
              <div className="findings" hidden={isCollapsed}>
                {category.findings.map((finding) => (
                  <div
                    className="finding"
                    data-severity={finding.tone}
                    data-title={finding.title}
                    data-category={category.id}
                    key={finding.key}
                  >
                    <div className="finding-main">
                      <span className={`finding-state ${TONE_STATE[finding.tone]}`} aria-hidden="true">
                        {FINDING_STATE_ICONS[TONE_STATE[finding.tone]]}
                      </span>
                      <div>
                        <div className="finding-title">{finding.title}</div>
                        <div className="finding-desc">{finding.desc}</div>
                      </div>
                    </div>
                    <span className={`severity ${finding.tone}`}>{finding.severityLabel}</span>
                    <span className="finding-type">{finding.typeLabel}</span>
                    {finding.tone === 'pass' ? (
                      <div className="affected">
                        <strong>—</strong>
                        <span>No action needed</span>
                      </div>
                    ) : finding.affectedExample ? (
                      <div className="affected">
                        <strong>{finding.affectedExample}</strong>
                        <span>{finding.affectedCount} affected URL{finding.affectedCount === 1 ? '' : 's'}</span>
                      </div>
                    ) : finding.affectedSample ? (
                      <div className="affected">
                        <strong>{finding.affectedSample}</strong>
                        <span>{finding.affectedCount > 0 ? `${finding.affectedCount} affected` : 'Affected sample'}</span>
                      </div>
                    ) : finding.affectedCount > 0 ? (
                      <div className="affected">
                        <strong>{finding.affectedCount} page{finding.affectedCount === 1 ? '' : 's'}</strong>
                        <span>No URL sample recorded</span>
                      </div>
                    ) : (
                      <div className="affected">
                        <strong>Site-wide</strong>
                        <span>No individual URLs</span>
                      </div>
                    )}
                    <button className="detail-btn" type="button" onClick={() => onOpenFinding(finding)}>
                      View details {DETAIL_ARROW}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div className="no-results" id="noResults">
          No findings match your current filters. Try another search or clear the filters.
        </div>
      )}

      <div className="pagination">
        <span>
          Showing <strong id="showing">{visibleCount}</strong> of {totalCount} findings in this report
        </span>
        <div className="pagination-actions">
          <button className="btn" id="clearFilters" type="button" onClick={clearFilters} disabled={!hasFilters}>
            Clear filters
          </button>
          <button className="btn" id="expandMore" type="button" onClick={expandAll}>
            Expand visible categories
          </button>
        </div>
      </div>
    </section>
  );
}
