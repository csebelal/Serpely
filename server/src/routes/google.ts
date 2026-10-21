import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { google } from 'googleapis';
import ClientUser from '../models/ClientUser';
import GoogleConnection from '../models/GoogleConnection';
import GoogleSnapshot, { SNAPSHOT_TTL_MS } from '../models/GoogleSnapshot';
import {
  GOOGLE_SCOPES,
  makeOAuthClient,
  encryptToken,
  decryptToken,
  signState,
  verifyState,
  clientsFor,
  ensureAuthorizedProperty,
  pickGscSite,
  pickGaProperty,
  fmtDate,
} from '../lib/google';

const NOT_AUTHORIZED = { error: 'This property is not accessible with the connected Google account.' };

const router = Router();
const SECRET = () => process.env.JWT_SECRET as string;
const CLIENT_ORIGIN = () => String(process.env.CLIENT_ORIGIN || 'https://serpely.com').split(',')[0].trim().replace(/\/$/, '');

const dataLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

function clientIdFrom(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(header.split(' ')[1], SECRET()) as { clientId?: string };
    return payload.clientId || null;
  } catch {
    return null;
  }
}

async function getSnapshot(clientId: string, kind: 'gsc-summary' | 'gsc-index' | 'ga-sessions', key: string) {
  const doc = await GoogleSnapshot.findOne({ clientId, kind, key }).lean().catch(() => null);
  if (doc && Date.now() - new Date(doc.createdAt).getTime() < SNAPSHOT_TTL_MS) return doc.data as Record<string, unknown>;
  return null;
}

async function putSnapshot(clientId: string, kind: 'gsc-summary' | 'gsc-index' | 'ga-sessions', key: string, data: Record<string, unknown>) {
  await GoogleSnapshot.findOneAndUpdate(
    { clientId, kind, key },
    { clientId, kind, key, data, createdAt: new Date() },
    { upsert: true }
  ).catch(() => null);
}

// GET /api/google/connect-url — authed; returns the Google consent URL (frontend redirects).
router.get('/connect-url', async (req: Request, res: Response) => {
  try {
    const clientId = clientIdFrom(req);
    if (!clientId) { res.status(401).json({ error: 'Login required' }); return; }
    const oauth = makeOAuthClient();
    const url = oauth.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_SCOPES,
      state: signState(clientId),
    });
    res.json({ url });
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Google OAuth not configured' });
  }
});

// GET /api/google/callback?code=&state= — Google redirects here (no JWT; state carries identity).
router.get('/callback', async (req: Request, res: Response) => {
  const fail = (msg: string) => res.redirect(`${CLIENT_ORIGIN()}/profile?google=error&msg=${encodeURIComponent(msg)}`);
  try {
    const clientId = verifyState(String(req.query.state || ''));
    if (!clientId) { fail('Invalid or expired sign-in request. Try Connect again.'); return; }
    const code = String(req.query.code || '');
    if (!code) { fail('Google did not return a code.'); return; }
    const oauth = makeOAuthClient();
    const { tokens } = await oauth.getToken(code);
    if (!tokens.refresh_token) {
      fail('Google did not issue a refresh token. Disconnect and reconnect, ticking all boxes.');
      return;
    }
    oauth.setCredentials(tokens);
    let email = '';
    try {
      const oi = google.oauth2({ version: 'v2', auth: oauth });
      const me = await oi.userinfo.get();
      email = String(me.data.email || '');
    } catch { /* email optional */ }

    await GoogleConnection.findOneAndUpdate(
      { clientId },
      {
        clientId,
        email,
        refreshTokenEnc: encryptToken(tokens.refresh_token),
        scope: (tokens.scope || GOOGLE_SCOPES.join(' ')),
        connectedAt: new Date(),
        lastUsedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Auto-pick GSC site matching the user's domains + first GA4 property (best-effort).
    try {
      const conn = await GoogleConnection.findOne({ clientId });
      const user = await ClientUser.findById(clientId).lean();
      if (conn) {
        const { auth, analyticsadmin } = await clientsFor(conn);
        const sc = google.searchconsole({ version: 'v1', auth });
        const domains = (user?.websites || []).map(w => String(w.domain || '')).filter(Boolean);
        const { site } = await pickGscSite(sc, domains);
        const { property } = await pickGaProperty(analyticsadmin);
        await GoogleConnection.updateOne({ _id: conn._id }, { gscSite: site, gaPropertyId: property });
      }
    } catch { /* auto-pick optional */ }

    res.redirect(`${CLIENT_ORIGIN()}/profile?google=connected`);
  } catch (e: unknown) {
    fail(e instanceof Error ? e.message : 'Google connection failed');
  }
});

// GET /api/google/status — authed; never exposes tokens.
router.get('/status', async (req: Request, res: Response) => {
  try {
    const clientId = clientIdFrom(req);
    if (!clientId) { res.status(401).json({ error: 'Login required' }); return; }
    const conn = await GoogleConnection.findOne({ clientId }).lean();
    if (!conn) { res.json({ connected: false }); return; }
    res.json({
      connected: true,
      email: conn.email,
      gscSite: conn.gscSite,
      gaPropertyId: conn.gaPropertyId,
      connectedAt: conn.connectedAt,
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/google/disconnect — authed; revokes + deletes.
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const clientId = clientIdFrom(req);
    if (!clientId) { res.status(401).json({ error: 'Login required' }); return; }
    const conn = await GoogleConnection.findOne({ clientId });
    if (conn) {
      try {
        const oauth = makeOAuthClient();
        // revokeCredentials needs credentials set; a fresh client silently no-ops.
        // Best-effort: local deletion still happens if the Google-side revoke fails.
        oauth.setCredentials({ refresh_token: decryptToken(conn.refreshTokenEnc) });
        await oauth.revokeCredentials().catch(() => null);
      } catch { /* ignore */ }
      await GoogleConnection.deleteOne({ _id: conn._id });
      await GoogleSnapshot.deleteMany({ clientId });
    }
    res.json({ connected: false });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/google/gsc/sites — authed; properties the Google account can access.
router.get('/gsc/sites', dataLimiter, async (req: Request, res: Response) => {
  try {
    const clientId = clientIdFrom(req);
    if (!clientId) { res.status(401).json({ error: 'Login required' }); return; }
    const conn = await GoogleConnection.findOne({ clientId });
    if (!conn) { res.status(400).json({ error: 'Connect Google first' }); return; }
    const { searchconsole } = await clientsFor(conn);
    const { site, all } = await pickGscSite(searchconsole, []);
    res.json({ sites: all, current: conn.gscSite || site });
  } catch (e: unknown) {
    res.status(502).json({ error: e instanceof Error ? e.message : 'GSC request failed' });
  }
});

// POST /api/google/property { gscSite?, gaPropertyId? } — authed; pin selections.
// Values must belong to the connected account (403 otherwise); empty strings
// explicitly clear a stored selection.
router.post('/property', async (req: Request, res: Response) => {
  try {
    const clientId = clientIdFrom(req);
    if (!clientId) { res.status(401).json({ error: 'Login required' }); return; }
    const conn = await GoogleConnection.findOne({ clientId });
    if (!conn) { res.status(400).json({ error: 'Connect Google first' }); return; }
    const { gscSite, gaPropertyId } = req.body as { gscSite?: string; gaPropertyId?: string };
    if (typeof gscSite !== 'string' && typeof gaPropertyId !== 'string') {
      res.status(400).json({ error: 'Nothing to update' });
      return;
    }
    const patch: Record<string, string> = {};
    if (typeof gscSite === 'string') {
      if (gscSite) {
        const { auth } = await clientsFor(conn);
        if (!(await ensureAuthorizedProperty(auth, 'gsc', gscSite))) { res.status(403).json(NOT_AUTHORIZED); return; }
        patch.gscSite = gscSite.slice(0, 200);
      } else {
        patch.gscSite = '';
      }
    }
    if (typeof gaPropertyId === 'string') {
      if (gaPropertyId) {
        const { auth } = await clientsFor(conn);
        if (!(await ensureAuthorizedProperty(auth, 'ga', gaPropertyId))) { res.status(403).json(NOT_AUTHORIZED); return; }
        patch.gaPropertyId = gaPropertyId.slice(0, 60);
      } else {
        patch.gaPropertyId = '';
      }
    }
    await GoogleConnection.updateOne({ clientId }, patch);
    res.json({ ok: true, ...patch });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/google/gsc/summary?site=&days=28 — clicks/impressions/CTR/position + top queries.
router.get('/gsc/summary', dataLimiter, async (req: Request, res: Response) => {
  try {
    const clientId = clientIdFrom(req);
    if (!clientId) { res.status(401).json({ error: 'Login required' }); return; }
    const conn = await GoogleConnection.findOne({ clientId });
    if (!conn) { res.status(400).json({ error: 'Connect Google first' }); return; }
    const site = String(req.query.site || conn.gscSite || '');
    if (!site) { res.status(400).json({ error: 'No GSC property selected' }); return; }
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 28));
    // The requested property must belong to the connected account — check before
    // serving anything (cache included).
    const { searchconsole, auth } = await clientsFor(conn);
    if (!(await ensureAuthorizedProperty(auth, 'gsc', site))) { res.status(403).json(NOT_AUTHORIZED); return; }
    const cacheKey = `${site}|${days}|v3`;
    const cached = await getSnapshot(clientId, 'gsc-summary', cacheKey);
    if (cached) { res.json({ ...cached, cached: true }); return; }

    const now = new Date();
    const end = fmtDate(new Date(now.getTime() - 3 * 86400000)); // GSC lags ~3 days
    const start = fmtDate(new Date(now.getTime() - (3 + days) * 86400000));
    const prevEnd = fmtDate(new Date(now.getTime() - (3 + days + 1) * 86400000));
    const prevStart = fmtDate(new Date(now.getTime() - (3 + days * 2 + 1) * 86400000));

    const [cur, prev, top, daily, devices, countries] = await Promise.all([
      searchconsole.searchanalytics.query({ siteUrl: site, requestBody: { startDate: start, endDate: end } }),
      searchconsole.searchanalytics.query({ siteUrl: site, requestBody: { startDate: prevStart, endDate: prevEnd } }),
      searchconsole.searchanalytics.query({
        siteUrl: site,
        requestBody: { startDate: start, endDate: end, dimensions: ['query'], rowLimit: 10 },
      }),
      searchconsole.searchanalytics.query({
        siteUrl: site,
        requestBody: { startDate: start, endDate: end, dimensions: ['date'], rowLimit: 100 },
      }),
      searchconsole.searchanalytics.query({
        siteUrl: site,
        requestBody: { startDate: start, endDate: end, dimensions: ['device'], rowLimit: 8 },
      }),
      searchconsole.searchanalytics.query({
        siteUrl: site,
        requestBody: { startDate: start, endDate: end, dimensions: ['country'], rowLimit: 8 },
      }),
    ]);
    // No rows means Search Console genuinely has no data — keep totals null
    // instead of fabricating zeros so the UI can show an honest empty state.
    const tot = (r: typeof cur) => {
      const row = r.data.rows?.[0];
      if (!row) return null;
      return {
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: row.ctr ?? 0,
        position: row.position ?? 0,
      };
    };
    const totals = tot(cur);
    const prevTotals = tot(prev);
    const byDevice = (devices.data.rows || []).map(r => ({
      device: r.keys?.[0] ?? '',
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
    }));
    const byCountry = (countries.data.rows || []).map(r => ({
      country: r.keys?.[0] ?? '',
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
    }));
    const out = {
      site,
      range: { start, end, prevStart, prevEnd },
      totals,
      prev: prevTotals,
      hasData: totals !== null,
      topQueries: (top.data.rows || []).map(r => ({
        query: r.keys?.[0] ?? '',
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
        position: r.position ?? 0,
      })),
      daily: (daily.data.rows || []).map(r => ({
        date: r.keys?.[0] ?? '',
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
      })),
      byDevice,
      byCountry,
    };
    await putSnapshot(clientId, 'gsc-summary', cacheKey, out);
    res.json(out);
  } catch (e: unknown) {
    res.status(502).json({ error: e instanceof Error ? e.message : 'GSC request failed' });
  }
});

// GET /api/google/gsc/index?site= — true indexed/not via URL Inspection (≤25 URLs, cached).
router.get('/gsc/index', dataLimiter, async (req: Request, res: Response) => {
  try {
    const clientId = clientIdFrom(req);
    if (!clientId) { res.status(401).json({ error: 'Login required' }); return; }
    const conn = await GoogleConnection.findOne({ clientId });
    if (!conn) { res.status(400).json({ error: 'Connect Google first' }); return; }
    const site = String(req.query.site || conn.gscSite || '');
    if (!site) { res.status(400).json({ error: 'No GSC property selected' }); return; }
    // The requested property must belong to the connected account.
    const { urlinspection, auth } = await clientsFor(conn);
    if (!(await ensureAuthorizedProperty(auth, 'gsc', site))) { res.status(403).json(NOT_AUTHORIZED); return; }
    const cached = await getSnapshot(clientId, 'gsc-index', site);
    if (cached) { res.json({ ...cached, cached: true }); return; }

    // Collect candidate URLs from the site's own sitemap(s).
    const origin = site.startsWith('sc-domain:')
      ? `https://${site.replace(/^sc-domain:/, '')}`
      : site.replace(/\/$/, '');
    let locs: string[] = [];
    for (const sm of [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`, `${origin}/api/sitemap.xml`]) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const r = await fetch(sm, { signal: ctrl.signal });
        clearTimeout(t);
        if (!r.ok) continue;
        const xml = await r.text();
        locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*</gi)].map(m => m[1]).slice(0, 25);
        if (locs.length) break;
      } catch { /* try next */ }
    }
    if (!locs.length) { res.status(400).json({ error: 'Could not read a sitemap for this property' }); return; }

    const results: { url: string; verdict: string; coverage: string }[] = [];
    for (const u of locs) {
      try {
        const r = await urlinspection.urlInspection.index.inspect({
          requestBody: { inspectionUrl: u, siteUrl: site },
        });
        const vr = r.data.inspectionResult?.indexStatusResult;
        results.push({
          url: u,
          verdict: String(vr?.verdict || 'UNKNOWN'),
          coverage: String(vr?.coverageState || ''),
        });
      } catch {
        results.push({ url: u, verdict: 'ERROR', coverage: '' });
      }
    }
    const indexed = results.filter(x => x.verdict === 'PASS').length;
    const out = { site, checked: results.length, indexed, results };
    await putSnapshot(clientId, 'gsc-index', site, out);
    res.json(out);
  } catch (e: unknown) {
    res.status(502).json({ error: e instanceof Error ? e.message : 'Index inspection failed' });
  }
});

// GET /api/google/ga/sessions?property=&days=28 — sessions by channel.
router.get('/ga/sessions', dataLimiter, async (req: Request, res: Response) => {
  try {
    const clientId = clientIdFrom(req);
    if (!clientId) { res.status(401).json({ error: 'Login required' }); return; }
    const conn = await GoogleConnection.findOne({ clientId });
    if (!conn) { res.status(400).json({ error: 'Connect Google first' }); return; }
    const property = String(req.query.property || conn.gaPropertyId || '');
    if (!property) { res.status(400).json({ error: 'No GA4 property selected' }); return; }
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 28));
    // The requested property must belong to the connected account.
    const { analyticsdata, auth } = await clientsFor(conn);
    if (!(await ensureAuthorizedProperty(auth, 'ga', property))) { res.status(403).json(NOT_AUTHORIZED); return; }
    const cacheKey = `${property}|${days}|v2`;
    const cached = await getSnapshot(clientId, 'ga-sessions', cacheKey);
    if (cached) { res.json({ ...cached, cached: true }); return; }

    const end = 'yesterday';
    const start = `${days - 1}daysAgo`;
    const [cur, channels] = await Promise.all([
      analyticsdata.properties.runReport({
        property,
        requestBody: { dateRanges: [{ startDate: start, endDate: end }], metrics: [{ name: 'sessions' }, { name: 'totalUsers' }] },
      }),
      analyticsdata.properties.runReport({
        property,
        requestBody: {
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: '8',
        },
      }),
    ]);
    // No report rows means no data for this window — null, not a fabricated 0.
    const metric = (idx: number): number | null => {
      const v = cur.data.rows?.[0]?.metricValues?.[idx]?.value;
      return v == null || v === '' ? null : Number(v);
    };
    const out = {
      property,
      days,
      sessions: metric(0),
      users: metric(1),
      byChannel: (channels.data.rows || []).map(r => ({
        channel: r.dimensionValues?.[0]?.value || '',
        sessions: Number(r.metricValues?.[0]?.value || 0),
      })),
    };
    await putSnapshot(clientId, 'ga-sessions', cacheKey, out);
    res.json(out);
  } catch (e: unknown) {
    res.status(502).json({ error: e instanceof Error ? e.message : 'GA request failed' });
  }
});

export default router;
