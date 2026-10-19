/**
 * Site Audit cutover switch.
 *
 * `true`  → `/audit/:id` serves the redesigned report page
 *           (`components/site-audit`, i.e. `pages/AuditPreview`).
 * `false` → `/audit/:id` serves the legacy report page (`pages/Audit`).
 *
 * Nothing else changes with this flag: the `/audit` form, the API, the report
 * data and every component stay exactly as they are. Reverting the cutover is
 * therefore a one-line change — flip the value below and rebuild.
 *
 * Both branches are wired in `App.tsx`, which keeps the legacy page compiled
 * and reachable at all times.
 */
export const AUDIT_REDESIGN = true;
