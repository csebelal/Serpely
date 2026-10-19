/**
 * Redesigned Site Audit page (the `/audit-preview/:id` host).
 *
 * Loads a real `PublicAuditReport` by its public share token and renders the
 * ported prototype UI. All state that has to survive a drawer round-trip
 * (collapsed categories, severity filter, the open finding) lives here.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPublicAudit, type PublicAuditReport } from '@/lib/api';
import { buildAuditViewModel, type CategoryId, type ReportFinding, type Tone } from './report';
import SiteAuditShell from './SiteAuditShell';

type LoadState = 'loading' | 'ready' | 'missing' | 'error';

function StatusCard({
  tone,
  title,
  body,
}: {
  tone: 'loading' | 'error';
  title: string;
  body: string;
}) {
  return (
    <div className="sa-root">
      <div className="url-empty" style={{ margin: '18vh auto', maxWidth: 520, padding: '0 20px' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>{title}</div>
        <div style={{ marginTop: 8, color: 'var(--ink-3)', lineHeight: 1.6 }}>{body}</div>
        {tone === 'error' && (
          <div style={{ marginTop: 18 }}>
            <Link className="btn primary" to="/audit">
              Run a new audit
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SiteAuditPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<PublicAuditReport | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    if (!id) {
      setReport(null);
      setState('missing');
      return;
    }
    let alive = true;
    setState('loading');
    getPublicAudit(id)
      .then((res) => {
        if (!alive) return;
        setReport(res.data);
        setState('ready');
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setReport(null);
        const status = (err as { response?: { status?: number } })?.response?.status;
        setState(status === 404 ? 'missing' : 'error');
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const vm = useMemo(() => (report ? buildAuditViewModel(report) : null), [report]);

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

  if (state === 'loading') {
    return <StatusCard tone="loading" title="Loading audit…" body="Fetching this report." />;
  }

  if (!vm || state !== 'ready') {
    return (
      <StatusCard
        tone="error"
        title={state === 'missing' ? 'We could not find that report.' : 'That report could not be loaded.'}
        body={
          state === 'missing'
            ? 'Audit links are only valid for 30 days, and reports are addressed by a random token. Run a fresh audit to generate a new one.'
            : 'Something went wrong while fetching the report. Please try again.'
        }
      />
    );
  }

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
      shareToken={report?.shareToken ?? id ?? null}
    />
  );
}
