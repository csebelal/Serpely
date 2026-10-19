#!/usr/bin/env node
/**
 * Security regression checks — run against a live API.
 *
 *   cd server && node scripts/security-check.mjs
 *   API_BASE=https://serpely.com node scripts/security-check.mjs   # production
 *
 * No secrets are stored in this file: it reads server/.env for the local
 * JWT_SECRET/DB only, to mint a short-lived admin token for the upload test.
 * Exit code 1 if any check fails.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, '..');
const env = Object.fromEntries(
  fs.readFileSync(path.join(serverDir, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter(l => l && !l.trim().startsWith('#') && l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const BASE = (process.env.API_BASE || `http://127.0.0.1:${env.PORT || 4000}`).replace(/\/$/, '');

// Per-run synthetic client IP (TEST-NET-3) so rate-limited endpoints get a fresh
// bucket each run instead of flaking out after repeated local runs.
const TEST_IP = `203.0.113.${1 + Math.floor(Math.random() * 250)}`;
const results = [];
let failed = 0;

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failed++;
}

const req = (method, p, { token, body, headers = {} } = {}) =>
  fetch(BASE + p, {
    method,
    headers: {
      'X-Forwarded-For': TEST_IP,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });

// ─── Public surface ─────────────────────────────────────────────────────────
{
  const r = await req('GET', '/api/health');
  check('GET /api/health returns 200', r.status === 200, `got ${r.status}`);
}

// ─── Auth: protected routes must reject anonymous + forged tokens ────────────
for (const p of ['/api/auth/users', '/api/backup', '/api/keys', '/api/seo', '/api/contact', '/api/subscribers']) {
  const r = await req('GET', p);
  check(`anonymous ${p} -> 401`, r.status === 401, `got ${r.status}`);
}

{
  const forged = jwt.sign({ id: new mongoose.Types.ObjectId().toString(), role: 'admin' }, env.JWT_SECRET, { expiresIn: '5m' });
  const r = await req('GET', '/api/auth/users', { token: forged });
  check('token for a non-existent admin -> 401 (DB check)', r.status === 401, `got ${r.status}`);
}
{
  const bogus = jwt.sign({ id: new mongoose.Types.ObjectId().toString(), role: 'admin' }, 'not-the-secret-' + crypto.randomBytes(8), { expiresIn: '5m' });
  const r = await req('GET', '/api/auth/users', { token: bogus });
  check('token signed with a wrong secret -> 401', r.status === 401, `got ${r.status}`);
}

// ─── OWASP headers / CORS ───────────────────────────────────────────────────
{
  const r = await req('GET', '/api/health');
  const h = r.headers;
  check('helmet: X-Content-Type-Options nosniff', h.get('x-content-type-options') === 'nosniff');
  check('helmet: CSP present', !!h.get('content-security-policy'));
  check('helmet: X-Frame-Options', !!h.get('x-frame-options'));
  check('helmet: HSTS', !!h.get('strict-transport-security'));
  check('helmet: no x-powered-by', !h.get('x-powered-by'));
}
{
  const r = await req('GET', '/api/health', { headers: { Origin: 'https://evil.example' } });
  check('CORS: evil origin gets no allow-origin header',
    !r.headers.get('access-control-allow-origin'), `got ${r.headers.get('access-control-allow-origin')}`);
  check('CORS: evil origin is not a 500', r.status < 500, `got ${r.status}`);
}

// ─── CSP: inline scripts must be nonce-gated (no 'unsafe-inline') ───────────
{
  const r = await req('GET', '/', { headers: { Accept: 'text/html' } });
  const csp = r.headers.get('content-security-policy') || '';
  check('csp: HTML response carries a nonce', /nonce-[A-Za-z0-9+/=]+/.test(csp), csp.slice(0, 140));
  check('csp: script-src uses strict-dynamic', /script-src[^;]*'strict-dynamic'/.test(csp));
  check('csp: script-src has no unsafe-inline', !/script-src[^;]*'unsafe-inline'/.test(csp), csp);
  check('csp: script-src-attr is none', /script-src-attr 'none'/.test(csp));
  check('csp: object-src is none', /object-src 'none'/.test(csp));
  check('csp: base-uri is self', /base-uri 'self'/.test(csp));
  check('csp: script-src allows Turnstile', /script-src[^;]*challenges\.cloudflare\.com/.test(csp));
  check('csp: frame-src allows Turnstile', /frame-src[^;]*challenges\.cloudflare\.com/.test(csp));

  if (r.status === 200 && /nonce-/.test(csp)) {
    const nonce = csp.match(/nonce-([A-Za-z0-9+/=]+)/)[1];
    const html = await r.text();
    const tags = html.match(/<script\b[^>]*>/gi) || [];
    check('csp: page contains script tags', tags.length > 0, `${tags.length}`);
    const unnonced = tags.filter(t => !t.includes(`nonce="${nonce}"`));
    check('csp: every script tag carries the nonce', unnonced.length === 0, unnonced.slice(0, 2).join(' | '));
  }
}

// ─── Consent: Google tags must never load before opt-in ────────────────────
{
  const r = await req('GET', '/', { headers: { Accept: 'text/html' } });
  check('consent: homepage served for HTML assertions', r.status === 200, `got ${r.status}`);
  if (r.status === 200) {
    const html = await r.text();
    check('consent: analytics_storage denied by default', /analytics_storage:\s*'denied'/.test(html));
    check('consent: ad_storage denied by default', /ad_storage:\s*'denied'/.test(html));
    check('consent: ad_user_data denied by default', /ad_user_data:\s*'denied'/.test(html));
    check('consent: GTM id handed to the app', /__SERPELY_GTM_ID\s*=\s*'GTM-/.test(html));
    check('consent: no eager gtm.js loader in the shell', !/gtm\.js\?id=/.test(html));
    check('consent: no GTM noscript iframe in the shell', !/googletagmanager\.com\/ns\.html/.test(html));
  }
}

// ─── Public write endpoints: validation ────────────────────────────────────
{
  const r = await req('POST', '/api/contact', { body: { name: 'x', email: 'not-an-email', message: 'hi' } });
  check('contact: invalid email -> 400', r.status === 400, `got ${r.status}`);
  const r2 = await req('POST', '/api/contact', { body: { name: 'x', email: 'a@b.co', message: 'x'.repeat(6000) } });
  check('contact: oversized message accepted but truncated (201)', r2.status === 201, `got ${r2.status}`);
  if (r2.status === 201) globalThis.__contactId = (await r2.json()).id;
}
{
  const r = await req('POST', '/api/subscribers', { body: { email: 'nope' } });
  check('subscribers: invalid email -> 400', r.status === 400, `got ${r.status}`);
}
{
  const r = await req('POST', '/api/analytics/track', { body: { path: { $ne: null } } });
  check('analytics: non-string path -> 400', r.status === 400, `got ${r.status}`);
}

// ─── Turnstile: must be a no-op until TURNSTILE_SECRET_KEY is configured ────
// If the guard were enabled without the client widget deployed, these two
// requests would start returning 403 and the suite would catch the regression.
{
  const c = await req('POST', '/api/contact', { body: { name: 'x', email: 'not-an-email', message: 'hi' } });
  check('turnstile: contact reaches validation while unconfigured', c.status === 400, `got ${c.status}`);
  const r = await req('POST', '/api/users/register', { body: { name: '', email: '', password: '' } });
  check('turnstile: register reaches validation while unconfigured', r.status === 400, `got ${r.status}`);
  const run = await req('POST', '/api/public-audit/run', { body: {} });
  check('turnstile: audit run reaches validation while unconfigured', run.status === 400, `got ${run.status}`);
  const cmp = await req('POST', '/api/public-audit/compare', { body: {} });
  check('turnstile: compare reaches validation while unconfigured', cmp.status === 400, `got ${cmp.status}`);
  const sm = await req('POST', '/api/sitemap-check/run', { body: {} });
  check('turnstile: sitemap run is not blocked while unconfigured', sm.status !== 403, `got ${sm.status}`);
}

// ─── Settings: admin-only HTML must not be public ──────────────────────────
{
  const full = await req('GET', '/api/settings');
  check('settings: anonymous full settings -> 401', full.status === 401, `got ${full.status}`);
  const p = await req('GET', '/api/settings/public');
  check('settings/public: 200', p.status === 200, `got ${p.status}`);
  let body = {};
  try { body = await p.json(); } catch { /* ignore */ }
  check('settings/public: no customHeadCode', !('customHeadCode' in body));
  check('settings/public: no googleAnalyticsId', !('googleAnalyticsId' in body));
  check('settings/public: exposes siteName', typeof body.siteName === 'string');
}

// ─── Audit reports: unguessable ids ────────────────────────────────────────
{
  const r24 = await req('GET', `/api/public-audit/${crypto.randomBytes(12).toString('hex')}`);
  check('report: random legacy ObjectId -> 404', r24.status === 404, `got ${r24.status}`);
  const r32 = await req('GET', `/api/public-audit/${crypto.randomBytes(16).toString('hex')}`);
  check('report: random shareToken -> 404', r32.status === 404, `got ${r32.status}`);
  const bad = await req('GET', '/api/public-audit/not-an-id');
  check('report: malformed id -> 404/400', bad.status === 404 || bad.status === 400, `got ${bad.status}`);

  // Sitemap reports follow the same unguessable-id policy.
  const s32 = await req('GET', `/api/sitemap-check/${crypto.randomBytes(16).toString('hex')}`);
  check('sitemap report: random token -> 404', s32.status === 404, `got ${s32.status}`);
  const s24 = await req('GET', `/api/sitemap-check/${crypto.randomBytes(12).toString('hex')}`);
  check('sitemap report: random legacy _id -> 404', s24.status === 404, `got ${s24.status}`);
}

// ─── Backup restore: destructive route must be guarded ─────────────────────
{
  const anon = await req('POST', '/api/backup/restore', { body: { confirm: 'RESTORE', backup: { settings: [] } } });
  check('backup restore: anonymous -> 401', anon.status === 401, `got ${anon.status}`);
}

// ─── MCP still reachable ───────────────────────────────────────────────────
{
  const r = await req('GET', '/mcp/health');
  check('GET /mcp/health -> 200', r.status === 200, `got ${r.status}`);
}

// ─── Upload: auth + content-type/extension enforcement ─────────────────────
let adminId = null;
let tokenedAuditId = null;
let tokenedAuditShareToken = null;
let tokenedSitemapId = null;
let tokenedSitemapShareToken = null;
if (env.MONGO_URI) {
  await mongoose.connect(env.MONGO_URI, { family: 4 });
  // Prefer a DB owner. The API reads the role from the database, never the token,
  // so minting a token for a non-owner makes every owner-only route test fail.
  const admin = await mongoose.connection.db.collection('adminusers').findOne({ role: 'owner', active: true })
    || await mongoose.connection.db.collection('adminusers').findOne({});
  adminId = admin?._id ? String(admin._id) : null;
  const tokenedReport = await mongoose.connection.db.collection('auditreports')
    .findOne({ shareToken: { $type: 'string', $ne: '' } });
  tokenedAuditId = tokenedReport?._id ? String(tokenedReport._id) : null;
  tokenedAuditShareToken = tokenedReport?.shareToken || null;
  const tokenedSitemap = await mongoose.connection.db.collection('sitemapreports')
    .findOne({ shareToken: { $type: 'string', $ne: '' } });
  tokenedSitemapId = tokenedSitemap?._id ? String(tokenedSitemap._id) : null;
  tokenedSitemapShareToken = tokenedSitemap?.shareToken || null;
  await mongoose.disconnect();
}
// ─── Email verification: minted server-side, redirected to /login, no leakage ─
if (env.MONGO_URI) {
  await mongoose.connect(env.MONGO_URI, { family: 4 });
  const users = mongoose.connection.db.collection('clientusers');
  const email = `verify-${crypto.randomBytes(4).toString('hex')}@example.com`;
  let userId = null;
  try {
    const r = await req('POST', '/api/users/register', { body: { name: 'Verify Probe', email, password: 'TestPass123' } });
    check('register: account created while email sending is unconfigured', r.status === 200, `got ${r.status}`);
    if (r.status === 200) {
      const data = await r.json();
      const token = data.token;
      userId = String(data.user._id);
      check('register: user starts unverified (soft gate)', data.user.emailVerified === false, String(data.user.emailVerified));
      check('register: response never exposes verifyToken', !JSON.stringify(data).includes('verifyToken'));

      const doc = await users.findOne({ _id: new mongoose.Types.ObjectId(userId) });
      const vt = doc?.verifyToken;
      check('register: a verification token was minted', typeof vt === 'string' && vt.length === 64, `len=${vt?.length}`);

      const bad = await req('GET', '/api/users/verify-email?token=0000');
      check('verify-email: unknown token -> 302 /login?verified=0',
        bad.status === 302 && /\/login\?verified=0$/.test(bad.headers.get('location') || ''),
        `${bad.status} ${bad.headers.get('location')}`);

      if (typeof vt === 'string' && vt.length === 64) {
        const good = await req('GET', `/api/users/verify-email?token=${vt}`);
        check('verify-email: valid token -> 302 /login?verified=1',
          good.status === 302 && /\/login\?verified=1$/.test(good.headers.get('location') || ''),
          `${good.status} ${good.headers.get('location')}`);
        const after = await users.findOne({ _id: new mongoose.Types.ObjectId(userId) });
        check('verify-email: account marked verified', after?.emailVerified === true, String(after?.emailVerified));
      }

      const resend = await req('POST', '/api/users/resend-verification', { token });
      check('resend-verification: authenticated call succeeds', resend.status === 200, `got ${resend.status}`);
      if (resend.status === 200) {
        const rd = await resend.json();
        check('resend-verification: reports alreadyVerified once confirmed', rd.alreadyVerified === true, JSON.stringify(rd));
      }

      const anonResend = await req('POST', '/api/users/resend-verification', {});
      check('resend-verification: anonymous -> 401', anonResend.status === 401, `got ${anonResend.status}`);
    }
  } finally {
    if (userId) await users.deleteOne({ _id: new mongoose.Types.ObjectId(userId) });
    await mongoose.disconnect();
  }
}

if (!adminId) {
  check('upload tests skipped (no admin user in DB)', true);
} else {
  const token = jwt.sign({ id: adminId, role: 'admin' }, env.JWT_SECRET, { expiresIn: '5m' });

  const anon = await req('POST', '/api/upload');
  check('upload: anonymous -> 401', anon.status === 401, `got ${anon.status}`);

  // Backup restore: confirmation + shape validation, and a dry run that writes nothing.
  const noConfirm = await req('POST', '/api/backup/restore', { token, body: { sections: [] } });
  check('backup restore: missing confirm -> 400', noConfirm.status === 400, `got ${noConfirm.status}`);
  const badShape = await req('POST', '/api/backup/restore?dryRun=1', { token, body: { confirm: 'RESTORE', backup: { sections: 'nope' } } });
  check('backup restore: non-array collection -> 400', badShape.status === 400, `got ${badShape.status}`);
  const noCollections = await req('POST', '/api/backup/restore?dryRun=1', { token, body: { confirm: 'RESTORE', backup: {} } });
  check('backup restore: no known collections -> 400', noCollections.status === 400, `got ${noCollections.status}`);
  {
    const before = await (await req('GET', '/api/backup', { token })).json();
    const dry = await req('POST', '/api/backup/restore?dryRun=1', { token, body: { confirm: 'RESTORE', backup: { settings: [] } } });
    check('backup restore: dry run -> 200', dry.status === 200, `got ${dry.status}`);
    const after = await (await req('GET', '/api/backup', { token })).json();
    check('backup restore: dry run left data untouched',
      JSON.stringify(before.settings) === JSON.stringify(after.settings));
  }

  // Blog body is sanitised on write — stored payloads must be inert.
  {
    const payload = '<p>safe</p><script>alert(1)</script><img src="x" onerror="alert(2)"><a href="javascript:alert(3)">j</a>';
    const created = await req('POST', '/api/blog', {
      token,
      body: { title: 'sec-check', slug: `sec-check-${crypto.randomBytes(4).toString('hex')}`, excerpt: 'x', body: payload, published: false },
    });
    check('blog: create with payload -> 201', created.status === 201, `got ${created.status}`);
    if (created.status === 201) {
      const post = await created.json();
      const stored = String(post.body || '');
      check('blog: stored body has no <script>', !/<script/i.test(stored));
      check('blog: stored body has no onerror', !/onerror/i.test(stored));
      check('blog: stored body has no javascript: URI', !/javascript:/i.test(stored));
      check('blog: safe markup preserved', /<p>safe<\/p>/.test(stored));
      const del = await req('DELETE', `/api/blog/${post._id}`, { token });
      check('blog: test post cleaned up', del.status === 200, `got ${del.status}`);
    }
  }

  // ── Roles: a non-owner must not reach owner-only routes ──
  {
    const email = `sec-editor-${crypto.randomBytes(4).toString('hex')}@example.com`;
    const password = 'EditorPass' + crypto.randomBytes(3).toString('hex');
    const created = await req('POST', '/api/auth/users', { token, body: { email, password, role: 'editor' } });
    check('roles: owner creates an editor -> 200', created.status === 200, `got ${created.status}`);
    if (created.status === 200) {
      const editorId = (await created.json())._id;
      const login = await req('POST', '/api/auth/login', { body: { email, password } });
      check('roles: editor can log in -> 200', login.status === 200, `got ${login.status}`);
      if (login.status === 200) {
        const editorToken = (await login.json()).token;
        for (const p of ['/api/auth/users', '/api/backup', '/api/auth/logs']) {
          const r = await req('GET', p, { token: editorToken });
          check(`roles: editor GET ${p} -> 403`, r.status === 403, `got ${r.status}`);
        }
        const putSettings = await req('PUT', '/api/settings', { token: editorToken, body: { siteName: 'x' } });
        check('roles: editor PUT /api/settings -> 403', putSettings.status === 403, `got ${putSettings.status}`);
        const restore = await req('POST', '/api/backup/restore?dryRun=1', { token: editorToken, body: { confirm: 'RESTORE', backup: { settings: [] } } });
        check('roles: editor backup restore -> 403', restore.status === 403, `got ${restore.status}`);
        const content = await req('POST', '/api/blog/preview', { token: editorToken, body: { title: 't', body: '<p>x</p>' } });
        check('roles: editor still has content access -> 200', content.status === 200, `got ${content.status}`);
      }
      const del = await req('DELETE', `/api/auth/users/${editorId}`, { token });
      check('roles: owner deletes the editor -> 200', del.status === 200, `got ${del.status}`);
    }
  }
  {
    const del = await req('DELETE', `/api/auth/users/${adminId}`, { token });
    check('roles: cannot delete your own account -> 400', del.status === 400, `got ${del.status}`);
  }

  // ── Cookie sessions + CSRF ──
  {
    const email = `sec-cookie-${crypto.randomBytes(4).toString('hex')}@example.com`;
    const password = 'CookiePass' + crypto.randomBytes(3).toString('hex');
    const created = await req('POST', '/api/auth/users', { token, body: { email, password, role: 'owner' } });
    check('cookie: temp owner created -> 200', created.status === 200, `got ${created.status}`);
    if (created.status === 200) {
      const ownerId = (await created.json())._id;
      const loginRes = await req('POST', '/api/auth/login', { body: { email, password } });
      check('cookie: login -> 200', loginRes.status === 200, `got ${loginRes.status}`);
      const setCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [];
      const raw = setCookies.find(c => c.startsWith('serpely_admin='));
      check('cookie: login sets serpely_admin', Boolean(raw));
      if (raw) {
        const cookie = raw.split(';')[0];
        check('cookie: HttpOnly flag set', /httponly/i.test(raw));
        check('cookie: SameSite=Lax', /samesite=lax/i.test(raw));

        // The cookie alone authenticates — no Authorization header at all.
        const me = await req('GET', '/api/auth/me', { headers: { Cookie: cookie } });
        check('cookie: /api/auth/me via cookie -> 200', me.status === 200, `got ${me.status}`);
        if (me.status === 200) {
          const meBody = await me.json();
          check('cookie: /me reports owner role', meBody.role === 'owner', `got ${meBody.role}`);
        }

        // CSRF: cookie + foreign origin is rejected on a state-changing call.
        const evil = await req('POST', '/api/blog/preview', {
          headers: { Cookie: cookie, Origin: 'https://evil.example' },
          body: { title: 'x', body: '<p>x</p>' },
        });
        check('csrf: cookie write with evil Origin -> 403', evil.status === 403, `got ${evil.status}`);

        // Cookie + allowed origin is accepted.
        const good = await req('POST', '/api/blog/preview', {
          headers: { Cookie: cookie, Origin: 'http://localhost:5500' },
          body: { title: 'x', body: '<p>x</p>' },
        });
        check('csrf: cookie write with allowed Origin -> 200', good.status === 200, `got ${good.status}`);

        // Bearer clients keep working during the transition (no Origin needed).
        const bearer = await req('POST', '/api/blog/preview', { token, body: { title: 'x', body: '<p>x</p>' } });
        check('dual-mode: Bearer write without Origin -> 200', bearer.status === 200, `got ${bearer.status}`);

        const out = await req('POST', '/api/auth/logout', { headers: { Cookie: cookie } });
        check('cookie: logout -> 200', out.status === 200, `got ${out.status}`);
        const cleared = out.headers.getSetCookie ? out.headers.getSetCookie().join(';') : '';
        check('cookie: logout clears the session', /serpely_admin=($|;)/.test(cleared), cleared);
      }
      const del = await req('DELETE', `/api/auth/users/${ownerId}`, { token });
      check('cookie: temp owner cleaned up', del.status === 200, `got ${del.status}`);
    }
  }

  // Reports are addressed only by their random 32-hex shareToken. A bare _id is
  // semi-sequential, so answering it — even with a 410 — would confirm that a
  // given id is a real report, and (for sitemaps) used to return its contents.
  if (tokenedAuditId && tokenedAuditShareToken) {
    const byId = await req('GET', `/api/public-audit/${tokenedAuditId}`);
    check('report: real _id without token -> 404', byId.status === 404, `got ${byId.status}`);
    const byToken = await req('GET', `/api/public-audit/${tokenedAuditShareToken}`);
    check('report: shareToken still resolves -> 200', byToken.status === 200, `got ${byToken.status}`);
  } else {
    check('report shareToken checks skipped (none in DB)', true);
  }
  if (tokenedSitemapId && tokenedSitemapShareToken) {
    const byId = await req('GET', `/api/sitemap-check/${tokenedSitemapId}`);
    check('sitemap report: real _id -> 404 (contents not readable)', byId.status === 404, `got ${byId.status}`);
    const byToken = await req('GET', `/api/sitemap-check/${tokenedSitemapShareToken}`);
    check('sitemap report: shareToken still resolves -> 200', byToken.status === 200, `got ${byToken.status}`);
  } else {
    check('sitemap shareToken checks skipped (none in DB)', true);
  }

  if (globalThis.__contactId) {
    const del = await req('DELETE', `/api/contact/${globalThis.__contactId}`, { token });
    check('contact: test row cleaned up', del.status === 200, `got ${del.status}`);
  }

  const form = new FormData();
  form.append('file', new Blob(['<script>alert(1)</script>'], { type: 'text/html' }), 'evil.html');
  const htmlUpload = await fetch(BASE + '/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  check('upload: text/html rejected -> 400', htmlUpload.status === 400, `got ${htmlUpload.status}`);

  // Spoofed mime type: png declared, HTML content. Extension must still be .png.
  const form2 = new FormData();
  form2.append('file', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'evil.html');
  const spoof = await fetch(BASE + '/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form2 });
  if (spoof.status === 200) {
    const data = await spoof.json();
    check('upload: stored filename forced to .png (no .html)', /\.png$/i.test(data.url), data.url);
    const del = await req('DELETE', `/api/upload?publicId=${encodeURIComponent(data.publicId)}`, { token });
    check('upload: cleanup -> 200', del.status === 200, `got ${del.status}`);
  } else {
    // Also acceptable: the magic-byte check refuses it outright.
    check('upload: spoofed image/png with HTML body rejected', spoof.status === 400, `got ${spoof.status}`);
  }
}

// ─── Report ────────────────────────────────────────────────────────────────
console.log('\nSecurity checks');
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok || !r.detail ? '' : `  (${r.detail})`}`);
}
console.log(`\n${results.length - failed}/${results.length} passed\n`);
process.exit(failed ? 1 : 0);
