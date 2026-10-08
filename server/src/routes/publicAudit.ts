import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import AuditReport from '../models/AuditReport';
import { normalizeUrl, fetchPage, runChecks, scoreReport } from '../lib/publicAudit';
import { fetchPsi } from '../lib/pagespeed';

const router = Router();

// Free tier: 10 audits / hour / IP — no auth, no VPS changes needed.
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

// POST /api/public-audit/run { url }
router.post('/run', limiter, async (req: Request, res: Response) => {
  try {
    const normalized = normalizeUrl(String(req.body?.url || ''));
    const origin = new URL(normalized).origin;

    // Fresh-cache 24h per URL to avoid refetch abuse
    let cached = null;
    try {
      cached = await AuditReport.findOne({ normalizedUrl: normalized }).sort({ createdAt: -1 });
    } catch (dbErr) {
      console.error('[public-audit] cache lookup failed:', dbErr);
    }
    if (cached && Date.now() - cached.createdAt.getTime() < 24 * 3600 * 1000) {
      res.json({ id: cached._id, cached: true, overall: cached.overall, scores: cached.scores, forecast: cached.forecast });
      return;
    }

    let page;
    try {
      page = await fetchPage(normalized);
    } catch (fetchErr) {
      console.error('[public-audit] fetch failed for', normalized, fetchErr);
      res.status(400).json({ error: 'Could not fetch that URL (timeout / DNS / blocked). Try the full https:// URL.' });
      return;
    }
    if (!page.html || page.status >= 400) {
      res.status(400).json({ error: `Target returned HTTP ${page.status}. Audit needs a public 200 page.` });
      return;
    }

    // PSI lab fetch starts now so it runs in parallel with the static checks below.
    const psiPromise = fetchPsi(normalized, process.env.PAGESPEED_API_KEY);
    const { issues, meta } = await runChecks(page, normalized, psiPromise);
    const { scores, overall, forecast } = scoreReport(issues);
    const psi = await psiPromise;
    if (psi !== null) {
      const fieldShape = (f: typeof psi.field) => f ? {
        overall: f.overall,
        lcpS: f.lcpMs !== undefined ? Math.round((f.lcpMs / 1000) * 10) / 10 : undefined,
        cls: f.cls,
        inpMs: f.inpMs,
        ttfbMs: f.ttfbMs,
      } : null;
      meta.psi = JSON.stringify({
        score: psi.score,
        lcpS: psi.lcpMs !== undefined ? Math.round((psi.lcpMs / 1000) * 10) / 10 : undefined,
        cls: psi.cls,
        inpMs: psi.inpMs,
        strategy: psi.strategy,
        scores: psi.scores,
        field: fieldShape(psi.field),
        origin: fieldShape(psi.originField),
      });
    }

    let doc;
    try {
      doc = await AuditReport.create({
        url: String(req.body.url),
        normalizedUrl: normalized,
        status: 'done',
        scores,
        overall,
        forecast,
        issues,
        meta: { ...meta, finalUrl: page.finalUrl, origin },
      });
    } catch (dbErr) {
      console.error('[public-audit] save failed:', dbErr);
      res.status(500).json({ error: 'Audit ran but could not be saved (database error). Check server Mongo connection.' });
      return;
    }

    res.json({ id: doc._id, cached: false, overall, scores, forecast });
  } catch (e: unknown) {
    console.error('[public-audit] unexpected error:', e);
    const msg = e instanceof Error ? e.message : 'Audit failed';
    res.status(400).json({ error: msg });
  }
});

// GET /api/public-audit/ping — proves the NEW audit code is loaded (keep before /:id)
router.get('/ping', (_req: Request, res: Response) => {
  res.json({ ok: true, route: 'public-audit', time: new Date().toISOString() });
});

// GET /api/public-audit/:id — full report (public, shareable)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await AuditReport.findById(req.params.id).lean();
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
