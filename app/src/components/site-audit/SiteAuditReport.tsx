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
import { buildAuditViewModel, type CategoryId, type ReportFinding } from './report';
import type { SeverityFilter } from './SiteAuditFindings';
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

  // Start concise: expand only the highest-priority category that has actionable
  // issues, and collapse the rest so the report stays scannable.
  const [collapsed, setCollapsed] = useState<ReadonlySet<CategoryId>>(() => {
    const actionableCats = vm.categories.filter((c) => c.findings.some((f) => f.tone !== 'pass'));
    const firstCritical = actionableCats.find((c) => c.findings.some((f) => f.tone === 'high'));
    const keepOpenId = (firstCritical ?? actionableCats[0])?.id;
    return new Set(vm.categories.filter((c) => c.id !== keepOpenId).map((c) => c.id));
  });
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('actionable');
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

  // The hero's "View critical" button filters the table, expands matching
  // categories, and scrolls to it.
  const jumpToSeverity = useCallback((tone: SeverityFilter) => {
    setSeverityFilter(tone);
    if (tone === 'high' || tone === 'medium' || tone === 'low') {
      const matching = vm.categories
        .filter((c) => !c.findings.some((f) => f.tone === tone))
        .map((c) => c.id);
      setCollapsed(new Set(matching));
    }
    if (tone === 'high') {
      document.getElementById('issues')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [vm.categories]);

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
