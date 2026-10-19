import SiteAuditPage from '@/components/site-audit/SiteAuditPage';
import { useSEOMeta } from '@/hooks/useSEOMeta';
import '@/styles/audit-preview-shell.css';

/**
 * Host for the redesigned Site Audit page.
 *
 * Deliberately mounted OUTSIDE the public shell (no marketing Navbar/Footer) —
 * the redesign ships its own topbar and footer, exactly like the prototype.
 *
 * Routes: `/audit/:id`          — live while `AUDIT_REDESIGN` is on
 *         `/audit-preview/:id`  — kept for side-by-side review
 * `id` is the audit report shareToken.
 *
 * The SEO call below mirrors what the legacy report page did (same page key,
 * same fallback copy), so the report view keeps the title, description,
 * canonical and robots treatment it had before the cutover.
 */
export default function AuditPreview() {
  useSEOMeta('audit', {
    title: 'Free Full-Site SEO & AI Visibility Audit — Serpely',
    description: 'Crawl up to 300 pages with Google lab data: Performance, Accessibility, Technical SEO, On-page content and AI citation readiness.',
  });
  return <SiteAuditPage />;
}
