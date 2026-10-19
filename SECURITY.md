# Security

Serpely's security posture, the automated gate that protects it, and the
runbook for anything that needs a human.

## Automated gate

`.github/workflows/security.yml` runs on every push and pull request:

1. `server` — `npm ci`, `tsc`, `npm audit --omit=dev --audit-level=high`.
2. Seeds a throwaway MongoDB and starts the API.
3. `server/scripts/security-check.mjs` — **107 live assertions** (auth, roles,
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

- **Admin sessions are httpOnly cookies** (`serpely_admin`, `SameSite=Lax`,
  `Secure` in production). JavaScript can never read the session, so an XSS bug
  cannot exfiltrate a long-lived credential.
- The `Authorization: Bearer` header is still accepted for one release so
  cached frontends and scripts keep working; new sessions use cookies only.
- **CSRF**: cookie-authenticated state changes (anything but GET/HEAD/OPTIONS)
  must arrive from an allow-listed `Origin`. SameSite=Lax is the first lock, the
  origin check is the second.
- Tokens carry `typ: 'admin'`. A client-facing token (`typ: 'client'`) can never
  authorise an admin route.

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

Google Tag Manager / Analytics are **never** loaded — and no request is made to
Google at all:

- The consent UI was removed at the owner's request: the "Cookies & analytics"
  banner, the "Your cookie preferences" card on `/cookie-policy`, and the footer
  "Cookie settings" button are all gone.
- GTM is fetched by `app/src/lib/consent.ts` only after an opt-in, and no UI can
  opt in any more, so `googletagmanager.com` is never contacted.
- `index.html` still declares Google Consent Mode v2 defaults with every signal
  set to `denied` — it is the only Google-related code left in the shell and
  loads nothing.
- `app/src/lib/consent.ts` and `app/src/components/CookieConsent.tsx` are kept on
  disk but no longer mounted, so the gate can be restored by re-mounting the
  component alongside a control that calls `setConsent('granted')`.
- GTM's `<noscript>` iframe stays removed: without JavaScript there is no way to
  ask for consent, so nothing is loaded.

> Turning analytics on for all visitors would not require bringing the popup
> back, but Google requests would then happen with no consent gate — that is a
> **policy decision, not a technical one**. The Cookie Policy's "Analytics"
> category row still describes the consent-gated behaviour and must be updated if
> that decision is made.

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
| GA4/GTM never load | No opt-in UI remains, so `googletagmanager.com` is never contacted; Consent Mode v2 defaults stay `denied` in the shell. | Done (hardening) |
| Client-facing tokens still live in `localStorage` | Admin is migrated to cookies; the public client token is scoped to user data only. | Follow-up |
| Backup restore wipes collections | Now requires an explicit `confirm: "RESTORE"` string, a dry run, and writes a pre-restore snapshot. | Done (hardening) |
