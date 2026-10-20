/**
 * Site Audit report switch.
 *
 * `true`  → the redesigned report (`components/site-audit`) renders inside the
 *           public `/audit` page, below the hero form, right after a crawl
 *           finishes (and on shared `/audit/:id` links).
 * `false` → the legacy report body (`components/audit/AuditResults` plus the
 *           old issue summary / issues list) renders in the same place.
 *
 * The page around it — navbar, hero, form, progress, exports, GSC, compare,
 * crawler access — is identical either way, so this is a one-line rollback.
 * Both branches stay compiled and mounted.
 */
export const AUDIT_REDESIGN = true;
