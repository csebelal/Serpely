import SiteAuditPage from '@/components/site-audit/SiteAuditPage';
import '@/styles/audit-preview-shell.css';

/**
 * Preview host for the redesigned Site Audit page.
 *
 * Deliberately mounted OUTSIDE the public shell (no marketing Navbar/Footer) —
 * the redesign ships its own topbar and footer, exactly like the prototype.
 *
 * Route: /audit-preview/:id  (id = audit report shareToken)
 * Once the design is approved this becomes /audit/:id.
 */
export default function AuditPreview() {
  return <SiteAuditPage />;
}
