import SiteAuditPage from '@/components/site-audit/SiteAuditPage';
import { useSEOMeta } from '@/hooks/useSEOMeta';
import '@/styles/audit-preview-shell.css';

/**
 * Standalone host for the redesigned Site Audit report.
 *
 * Mounted OUTSIDE the public shell (no marketing Navbar/Footer) so the full
 * prototype page can be reviewed on its own.
 *
 * Route: `/audit-preview/:id`  (id = audit report shareToken)
 *
 * The live `/audit` page renders the same report (`SiteAuditReport`) embedded
 * below its hero form, after a crawl finishes or when opened via `/audit/:id`.
 */
export default function AuditPreview() {
  useSEOMeta('audit', {
    title: 'Free Full-Site SEO & AI Visibility Audit — Serpely',
    description: 'Crawl up to 300 pages with Google lab data: Performance, Accessibility, Technical SEO, On-page content and AI citation readiness.',
  });
  return <SiteAuditPage />;
}
