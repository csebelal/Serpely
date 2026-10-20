/**
 * The redesigned Site Audit report body.
 *
 * Both hosts render this from an already-loaded report, so there is exactly one
 * implementation of the report UI:
 *  - `SiteAuditPage` — standalone `/audit-preview/:id` (own workspace chrome)
 *  - `pages/Audit`   — embedded below the `/audit` form (`embedded`), which is
 *                      where `AUDIT_REDESIGN` puts it for real visitors
 *
 * All state that has to survive a drawer round-trip (collapsed categories,
 * severity filter, the open finding) lives here.
 */
import { useCallback, useMemo, useState } from 'react';
import type { PublicAuditReport } from '@/lib/api';
import { buildAuditViewModel, type CategoryId, type ReportFinding, type Tone } from './report';
import SiteAuditShell from './SiteAuditShell';
import '@/styles/audit-preview-shell.css';

interface Props {
  report: PublicAuditReport;
  /** Public share token; falls back to the one carried by the report. */
  shareToken?: string | null;
  /** Render inside a host page (no workspace topbar/footer). */
  embedded?: boolean;
}

export default function SiteAuditReport({ report, shareToken, embedded = false }: Props) {
  const vm = useMemo(() => buildAuditViewModel(report), [report]);

  const [collapsed, setCollapsed] = useState<ReadonlySet<CategoryId>>(() => new Set());
  const [severityFilter, setSeverityFilter] = useState<'all' | Tone>('all');
  const [openFinding, setOpenFinding] = useState<ReportFinding | null>(null);

  const toggleCategory = useCallback((categoryId: CategoryId) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  const setCollapsedIds = useCallback((ids: CategoryId[]) => setCollapsed(new Set(ids)), []);

  // The hero's "View critical" button filters the table and scrolls to it.
  const jumpToSeverity = useCallback((tone: 'all' | Tone) => {
    setSeverityFilter(tone);
    document.getElementById('issues')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const closeFinding = useCallback(() => setOpenFinding(null), []);

  return (
    <SiteAuditShell
      vm={vm}
      collapsed={collapsed}
      onToggleCategory={toggleCategory}
      onSetCollapsed={setCollapsedIds}
      severityFilter={severityFilter}
      onSeverityFilter={jumpToSeverity}
      onOpenFinding={setOpenFinding}
      openFinding={openFinding}
      onCloseFinding={closeFinding}
      shareToken={shareToken ?? report.shareToken ?? null}
      embedded={embedded}
    />
  );
}
