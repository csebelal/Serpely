# Security

Serpely's security posture, the automated gate that protects it, and the
runbook for anything that needs a human.

## Automated gate

`.github/workflows/security.yml` runs on every push and pull request:

1. `server` — `npm ci`, `tsc`, `npm audit --omit=dev --audit-level=high`.
2. Seeds a throwaway MongoDB and starts the API.
3. `server/scripts/security-check.mjs` — **117 live assertions** (auth, roles,
   cookie sessions, CSRF, CSP nonce, consent defaults, Turnstile gating, email
   verification round-trip, headers, CORS, input validation, unguessable report
   ids, destructive-route guards, blog sanitisation, upload type/spoof checks).
4. `app` — `npm ci`, `npm audit --omit=dev --audit-level=high`, production build.

Run the same suite locally against any target:

```bash
cd server && node scripts/security-check.mjs
API_BASE=https://serpely.com node scripts/security-check.mjs   # production
```

Production dependencies must stay at **0** vulnerabilities; a failure here
blocks the build.

## Authentication

- **Admin & client sessions are httpOnly cookies** (`__Host-serpely_admin` / `serpely_admin` for admins; `__Host-serpely_client` / `serpely_client` for clients — `SameSite=Lax`, `Secure` in production, `Path=/`). JavaScript can never read either session, so an XSS bug cannot exfiltrate credentials.
- Both cookies use a sliding idle window (`8h` / `24h` cap for admins; `7d` / `30d` cap for clients), and `clearCookie` mirrors the `Secure` + `SameSite` attributes so `__Host-` cookies clear cleanly over HTTPS.
- The `Authorization: Bearer` header is still accepted for one release so cached frontends and scripts keep working; new browser sessions use cookies only.
- **CSRF**: cookie-authenticated state changes (admin or client, anything other than GET/HEAD/OPTIONS) must arrive from an allow-listed `Origin`. `SameSite=Lax` is the first lock, the origin check is the second.
- **Token scope & revocation**: Admin tokens carry `typ: 'admin'` and client tokens carry `typ: 'client'`; neither is accepted on the other's routes. Both `AdminUser` and `ClientUser` track `tokenVersion` (`tv` claim), incremented on password change to immediately revoke other active sessions.

### Roles

`owner | admin | editor`, stored on the account and read from the database on
every request (a demotion takes effect immediately, not at token expiry).

| Capability | owner | admin | editor |
| --- | :-: | :-: | :-: |
| Content (blog, pages, media) | ✅ | ✅ | ✅ |
| API keys, Google integration | ✅ | ✅ | — |
| Settings incl. custom head HTML | ✅ | — | — |
| Backup export / restore | ✅ | — | — |
| User management, login logs | ✅ | — | — |

The last active owner can never be deleted or demoted, and nobody can delete
their own account. Accounts created before roles existed are backfilled at
startup (`ensureAdminRoles`) — the oldest becomes owner, so the operator cannot
be locked out.

## Output sanitisation

Blog HTML is sanitised with an allowlist (`sanitize-html`) **on write and on
render**, and again in the browser with DOMPurify before it reaches
`dangerouslySetInnerHTML`. Inline SVG icon markup is sanitised with the SVG
profile. The allowlist matches what the editor can produce (headings, lists,
tables, images, links, colour/text-align) and strips scripts, event handlers,
`javascript:` URLs, iframes and protocol-relative URLs.

## Content Security Policy

HTML responses carry a fresh per-request nonce; inline scripts we emit (the GTM
bootstrap, admin custom head code) receive it, and `strict-dynamic` lets those
scripts load their own dependencies. `script-src` has **no `unsafe-inline`**,
`script-src-attr` is `'none'`, and `object-src`/`base-uri` are locked down.
(`style-src` keeps `'unsafe-inline'` because the app and CMS rely on inline
styles; styles are not a script vector.)

## Privacy & consent

Google Tag Manager / Analytics are **consent-gated** and never load before opt-in:

- `index.html` declares Google Consent Mode v2 defaults with every ad/analytics signal set to `denied` and omits GTM's `<noscript>` iframe.
- `CookieConsent` (`app/src/components/CookieConsent.tsx`) prompts public visitors and stores their policy-versioned choice (`serpely_consent_v1`); `app/src/lib/consent.ts` loads GTM only after `granted`.
- Visitors can re-open preferences and withdraw consent at any time via `"Cookie settings"` in the footer or `/cookie-policy` (`resetConsent()`).
- Decisions are logged server-side to `ConsentLog` (`POST /api/analytics/consent`) with only the choice, a random rotating `visitorId` (`serpely_vid`), page path, and truncated user-agent — never cookie values.

Server-side page views (`/api/analytics/track`) are first-party, cookie-less and
aggregate — page path, referring URL, truncated user-agent. Documented as such in
the Cookie Policy.

## Abuse protection

Public write endpoints use Cloudflare Turnstile plus per-IP rate limits.

- Enabled by setting `TURNSTILE_SECRET_KEY` (server) and `VITE_TURNSTILE_SITE_KEY`
  (client). **Both must be set together** — the client widget must be deployed
  before the server starts enforcing, or legitimate submissions are rejected.
- While unset, `guardTurnstile()` is a no-op and the endpoints stay protected by
  their rate limiters, so local development and the pre-launch deploy keep working.
- Guarded: `POST /api/contact`, `POST /api/users/register`,
  `POST /api/public-audit/run`, `POST /api/public-audit/compare`,
  `POST /api/sitemap-check/run` — each has the widget on its form.
- **Not yet guarded:** `POST /api/subscribers` (the newsletter form renders in four
  places), which stays rate-limited at 5/hour/IP. Adding Turnstile there requires
  placing the widget in all four callers first.
- A verification failure fails **closed** (403), including when Cloudflare is
  unreachable.

## Public (unauthenticated) surface

Intentionally reachable without a token:

- `GET /api/health`, `GET /mcp/health`
- `GET /api/settings/public` — site name, meta defaults, maintenance flag only.
- `POST /api/contact`, `POST /api/subscribers`, `POST /api/analytics/track` — rate-limited + validated.
- `POST /api/public-audit/*`, `POST /api/sitemap-check/run` — rate-limited.

Everything else requires an admin session. Report read links use random 32-hex
`shareToken`s, **never raw Mongo `_id`s** — both `GET /api/public-audit/:id` and
`GET /api/sitemap-check/:id` return 404 for anything that isn't a 32-hex token.
Mongo `_id`s are semi-sequential (timestamp + counter), so accepting one would
have made other people's reports enumerable; returning 410 for a legacy `_id`
would still have confirmed that a given id was a real report. `GET /api/settings`
(full record incl. `customHeadCode`) is admin-only; the SSR shell injects
`customHeadCode` by reading the database directly, so the public site is
unaffected.

## Secrets

- Live values belong in `server/.env` (git-ignored). Never in the frontend, never
  in git. `app/**` must not contain any API key.
- Rotate everything with `node server/scripts/rotate-secrets.mjs` (JWT secret,
  Google token key, admin password hash). `GOOGLE_TOKEN_KEY_PREVIOUS` keeps
  existing Google tokens decryptable across a rotation.
- If a secret ever reaches git, treat the host as compromised: rotate, then
  audit `authorized_keys`, cron, and `pm2 list` before trusting it again.

## Environment notes

- `DNS_SERVERS` (optional, comma-separated) overrides the host resolver. Unset by
  default — the app no longer hardcodes a public resolver.
- Pre-restore database snapshots are written to `server/backups/` (git-ignored).
- `APP_URL` — the SaaS UI where users sign in (default `https://dev.serpely.com`).
  Emailed links land here. `serpely.com` is the marketing site; the two are
  separate hosts.
- `API_PUBLIC_URL` — public base of this API for links that must round-trip
  through the server (default `https://serpely.com`).
- `RESEND_API_KEY` / `EMAIL_FROM` — transactional email. Unset key = sending is
  skipped and the verification link is logged instead.
- `TURNSTILE_SECRET_KEY` (server) and `VITE_TURNSTILE_SITE_KEY` (client) — must be
  set together; see Abuse protection above.

## Email verification

Registration is **soft-gated**: the account is created and usable immediately,
and `emailVerified: false` drives a prompt on the profile page.

- A 32-byte token is minted and **persisted before the response is sent**, so it
  is durable even if the process dies; the email itself is sent in the background
  so a slow provider cannot delay signup.
- The emailed link points at `GET /api/users/verify-email?token=…`, which marks
  the address confirmed and redirects to `APP_URL/login?verified=1` (or
  `?verified=0` when the token is unknown or older than 24h). **No separate
  verification screen exists.**
- The token is not cleared on use, so repeated opens by mail scanners are
  harmless; it expires after 24 hours regardless.
- `verifyToken` is never serialised — `safeUser()` exposes only `emailVerified`.
- `POST /api/users/resend-verification` is authenticated and returns
  `sent: false` when no mail provider is configured.

## Known accepted risks

These are documented rather than fixed; each has an owner and a planned phase.

| Risk | Why it's accepted | Planned |
| --- | --- | --- |
| Dev-only advisories: `braces` (via chokidar) and `postcss-selector-parser` (via Tailwind 3) | Build tooling only; no fix without a Tailwind 4 migration. Production deps are clean. | Tailwind 4 branch |
| No email verification on client registration | Implemented but dormant: works once `RESEND_API_KEY` is set. Until then the token is minted and logged, not emailed. | Supply keys |
| Turnstile is wired but unkeyed | `TURNSTILE_SECRET_KEY` / `VITE_TURNSTILE_SITE_KEY` are unset, so the guard is a no-op and forms rely on rate limits. | Supply keys |
| GA4/GTM consent-gated | Consent Mode v2 defaults stay `denied`; GTM loads only after explicit opt-in via `CookieConsent`. | Done (hardening) |
| Client-facing tokens live in `httpOnly` cookies | Migrated from `localStorage` to `__Host-serpely_client` with CSRF origin checks and `tokenVersion` revocation. | Done (hardening) |
| Backup restore wipes collections | Now requires an explicit `confirm: "RESTORE"` string, a dry run, and writes a pre-restore snapshot. | Done (hardening) |

## Audit Log (2026-11-11)

- 🟢 **Passed — Secrets & `.gitignore`**: Live secrets reside in `server/.env` (git-ignored); `JWT_SECRET` length (>= 32 chars) is enforced at startup (`server/src/index.ts`); no API keys or private tokens found in `app/src/`.
- 🟢 **Passed — Dependencies (`npm audit --omit=dev`)**: 0 production vulnerabilities in both `server` and `app`.
- 🟢 **Passed — Auth, Roles & CSRF**: Admin and client sessions use `httpOnly` `__Host-` cookies with `SameSite=Lax`, CSRF origin validation on state-changing requests, `tokenVersion` revocation, and DB-backed role checks (`verifyJWT`, `requireRole`).
- 🟢 **Passed — XSS & CSP**: Blog HTML is sanitized server-side (`sanitize-html`) and client-side (`DOMPurify` in `app/src/lib/sanitize.ts`); HTML responses use per-request CSP nonces with `strict-dynamic` and no `unsafe-inline` in `script-src`.
- 🟢 **Passed — SSRF & Process Execution**: `execFile` (argument-array, no shell) is used in `server/src/lib/agenticSeo.ts`; `GET /api/public-audit/:id/css` was hardened with a dedicated `cssLimiter` (15 req/min) and `assertPublicTarget(target)` DNS/SSRF re-validation; `Open URL` in `SiteAuditDrawer.tsx` restricts `href` to `^https?://`.
- 🟡 **Warning — External Script Directory & GitHub Security Workflow**: `Agentic-SEO-Skill-main/scripts` is not currently present on disk (`resolveScriptsDir()` degrades gracefully to `null`), and `.github/workflows/security.yml` is currently deleted in the working tree (`git status`).

## Audit Log (2026-11-12)

- 🟢 **Passed — Secrets & Supply Chain**: `npm audit --omit=dev --audit-level=high` reports 0 vulnerabilities in both `server` and `app`; `.env*`, `server/uploads/`, and `server/backups/` remain git-ignored with no hardcoded secrets.
- 🟢 **Fixed — Role-Based Access Control (OWASP A01)**: Added `requireRole('owner', 'admin')` to `server/src/routes/apikeys.ts`, `audit.ts`, `analytics.ts` (`/consent-log`), `subscribers.ts` (admin endpoints), and `contact.ts` (admin endpoints), plus `ObjectId` and `boolean` type validation in `subscribers.ts` and `apikeys.ts`.
- 🟢 **Fixed — SSRF Redirect Hop Validation (OWASP A10)**: Added `safeFetch()` in `server/src/lib/publicAudit.ts` using `redirect: 'manual'` and re-validating every 3xx `Location` hop with `assertPublicTarget()`, replacing `redirect: 'follow'` across `publicAudit.ts`, `crawler.ts`, `phase2.ts`, `auditJobs.ts`, and `sitemapCheck.ts`.
- 🟢 **Fixed — Error Sanitization**: Replaced raw `err.message` on 500 responses with generic `'Server error'` / `'Internal error'` in `server/src/routes/upload.ts` and `server/src/routes/mcp.ts`.


