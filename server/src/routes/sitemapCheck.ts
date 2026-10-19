import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import SitemapReport from '../models/SitemapReport';
import { normalizeUrl } from '../lib/publicAudit';
import { runSitemapCheck } from '../lib/sitemapCheck';
import { guardTurnstile } from '../lib/turnstile';

const router = Router();

// Free tier: 10 sitemap checks / hour / IP — no auth, same policy as the audit.
// JSON handler so the frontend shows the real reason instead of a generic failure.
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: 'Too many sitemap checks — please wait a few minutes and try again.' }),
});

// POST /api/sitemap-check/run { url }
router.post('/run', limiter, async (req: Request, res: Response) => {
  try {
    if (!(await guardTurnstile(req, res))) return;
    const normalized = normalizeUrl(String(req.body?.url || ''));
    const origin = new URL(normalized).origin;

    let cached = null;
    try {
      cached = await SitemapReport.findOne({ origin }).sort({ createdAt: -1 });
    } catch (dbErr) {
      console.error('[sitemap-check] cache lookup failed:', dbErr);
    }
    if (cached && Date.now() - cached.createdAt.getTime() < 24 * 3600 * 1000) {
      // Public links are shareTokens only, so adopt a pre-token cache entry rather
      // than handing back an _id that can no longer be read. If adopting fails we
      // treat it as a cache miss and re-run.
      if (!cached.shareToken) {
        try {
          cached.shareToken = crypto.randomBytes(16).toString('hex');
          await cached.save();
        } catch (dbErr) {
          console.error('[sitemap-check] could not adopt pre-token cache entry:', dbErr);
          cached = null;
        }
      }
      if (cached) {
        res.json({ id: String(cached.shareToken), cached: true, summary: cached.summary });
        return;
      }
    }

    const { sitemaps, urls, summary, challengeProvider } = await runSitemapCheck(normalized);
    if (!sitemaps.some(s => s.ok)) {
      if (challengeProvider) {
        res.status(400).json({ error: `Sitemap unreachable — the site shows a ${challengeProvider} human-verification challenge. Allowlist the checker in the site's bot protection, or check robots.txt manually.` });
      } else {
        res.status(400).json({ error: 'No sitemap found - checked robots.txt plus /sitemap.xml, /sitemap_index.xml, /sitemap-index.xml and /wp-sitemap.xml.' });
      }
      return;
    }

    let doc;
    try {
      doc = await SitemapReport.create({ origin, sitemaps, summary, urls, shareToken: crypto.randomBytes(16).toString('hex') });
    } catch (dbErr) {
      console.error('[sitemap-check] save failed:', dbErr);
      res.status(500).json({ error: 'Check ran but could not be saved (database error).' });
      return;
    }
    res.json({ id: String(doc.shareToken), cached: false, summary });
  } catch (e: unknown) {
    console.error('[sitemap-check] unexpected error:', e);
    const msg = e instanceof Error ? e.message : 'Sitemap check failed';
    res.status(400).json({ error: msg });
  }
});

// GET /api/sitemap-check/ping — proves the NEW code is loaded (keep before /:id)
router.get('/ping', (_req: Request, res: Response) => {
  res.json({ ok: true, route: 'sitemap-check', time: new Date().toISOString() });
});

// Public read limiter — stops mass enumeration of report ids.
const readLimiter = rateLimit({
  windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: 'Too many requests — slow down.' }),
});

// GET /api/sitemap-check/:id — full report (public, shareable).
// Reports are addressed only by their random 32-hex shareToken. A Mongo _id is
// semi-sequential (timestamp + counter), so accepting one would let anyone
// enumerate other people's reports.
router.get('/:id', readLimiter, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || '');
    const doc = /^[a-f0-9]{32}$/i.test(id)
      ? await SitemapReport.findOne({ shareToken: id }).lean()
      : null;
    if (!doc) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    res.json(doc);
  } catch {
    res.status(400).json({ error: 'Invalid report id' });
  }
});

export default router;
