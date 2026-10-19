import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import AuditReport from '../models/AuditReport';
import AuditSnapshot from '../models/AuditSnapshot';
import { createJob, getJob, maybeRefreshStale } from '../lib/auditJobs';
import { normalizeUrl, fetchPage, runChecks, scoreReportV2 } from '../lib/publicAudit';
import { fetchPsi, fetchPsiRaw, type PsiRawPayload, type PsiStrategy } from '../lib/pagespeed';
import { fetchCrux } from '../lib/crux';
import { guardTurnstile } from '../lib/turnstile';

const router = Router();

// Full crawl is heavy (~250 fetches + 1 PSI): 3 audits / hour / IP.
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 3, standardHeaders: true, legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: 'Too many audits — full-site crawls are heavy. Please wait a bit and try again.' }),
});

// POST /api/public-audit/run { url } → async, returns { jobId } fast
router.post('/run', limiter, async (req: Request, res: Response) => {
  try {
    if (!(await guardTurnstile(req, res))) return;
    const ip = String((req as unknown as { ip?: string }).ip || req.headers['x-forwarded-for'] || 'unknown');
    const { job, cachedReportId } = await createJob(String(req.body?.url || ''), ip);
    if (cachedReportId) {
      res.json({ jobId: job.id, cached: true, reportId: cachedReportId, status: 'done' });
      return;
    }
    res.status(202).json({ jobId: job.id, cached: false, status: job.status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Audit failed';
    res.status(400).json({ error: msg });
  }
});

// GET /api/public-audit/status/:jobId — poll every 2s
router.get('/status/:jobId', async (req: Request, res: Response) => {
  const job = getJob(String(req.params.jobId));
  if (!job) { res.status(404).json({ error: 'Job not found or expired (server restarted). Please run a new audit.' }); return; }
  res.json({ status: job.status, stage: job.stage, pagesDone: job.pagesDone, pagesTotal: job.pagesTotal, reportId: job.reportId, error: job.error });
});

// GET /api/public-audit/ping — proves the NEW audit code is loaded (keep before /:id)
router.get('/ping', (_req: Request, res: Response) => {
  res.json({ ok: true, route: 'public-audit', time: new Date().toISOString() });
});

// Homepage-only compare is lighter than a full crawl but still costs up to
// 4 PSI + 4 CrUX calls: 5 compares / hour / IP.
const compareLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: 'Too many comparisons — please wait a bit and try again.' }),
});

// POST /api/public-audit/compare { url, competitors: string[] } — sync, homepage-only.
// Same engine as full audits (fetchPage + runChecks + PSI/CrUX) but no crawl,
// no DB writes. Max 1 + 3 sites so it finishes inside proxy timeouts.
router.post('/compare', compareLimiter, async (req: Request, res: Response) => {
  try {
    if (!(await guardTurnstile(req, res))) return;
    const raw = [String(req.body?.url || ''), ...((req.body?.competitors || []) as unknown[])];
    const normalized: string[] = [];
    const seen = new Set<string>();
    for (const r of raw.slice(0, 4)) {
      let n = '';
      try { n = normalizeUrl(String(r || '')); } catch { continue; }
      const key = new URL(n).origin.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      normalized.push(n);
    }
    if (normalized.length < 2) { res.status(400).json({ error: 'Enter your site plus at least one competitor.' }); return; }

    const sites = await Promise.all(normalized.map(async (n) => {
      try {
        const page = await fetchPage(n);
        const psiPromise = (async () => {
          const [psi, cruxField] = await Promise.all([
            fetchPsi(n, process.env.PAGESPEED_API_KEY),
            fetchCrux(n, process.env.CRUX_API_KEY),
          ]);
          if (psi) {
            if (!psi.field && cruxField) psi.field = cruxField;
            if (psi.ttfbMs === undefined && cruxField?.ttfbMs !== undefined) psi.ttfbMs = cruxField.ttfbMs;
            return psi;
          }
          if (cruxField) return { score: -1, strategy: 'mobile', field: cruxField, ttfbMs: cruxField.ttfbMs };
          return null;
        })();
        const { issues } = await runChecks(page, n, psiPromise);
        const psi = await psiPromise;
        const { scores, overall, summary } = scoreReportV2(issues);
        return {
          url: n, origin: new URL(n).origin, overall, scores, summary,
          psiScore: psi && psi.score >= 0 ? psi.score : undefined,
          issueCount: issues.filter(i => !i.passed).length,
        };
      } catch (e: unknown) {
        return { url: n, origin: '', overall: 0, scores: {}, summary: null, error: e instanceof Error ? e.message : 'Check failed' };
      }
    }));
    res.json({ sites });
  } catch {
    res.status(500).json({ error: 'Comparison failed' });
  }
});

// GET /api/public-audit/trend?origin=https://x — 30-day snapshots
router.get('/trend', async (req: Request, res: Response) => {
  try {
    const origin = String(Array.isArray(req.query.origin) ? req.query.origin[0] : req.query.origin || '');
    if (!origin) { res.status(400).json({ error: 'origin required' }); return; }
    const snaps = await AuditSnapshot.find({ origin }).sort({ date: 1 }).limit(30).lean();
    res.json({ origin, points: snaps.map(s => ({ date: s.date, overall: s.overall, scores: s.scores })) });
  } catch { res.status(500).json({ error: 'Trend lookup failed' }); }
});

// Public read limiter — stops mass enumeration of report ids.
const readLimiter = rateLimit({
  windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: 'Too many requests — slow down.' }),
});

// ── Per-URL PageSpeed / CrUX data for the redesigned audit UI ──────────────
// PSI is a scarce shared quota (roughly 1 QPS), so responses are cached briefly
// and — crucially — the requested URL has to already be part of the referenced
// report. This must never become an open proxy that lets anyone point it at an
// arbitrary host.
const psiLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: 'Too many PageSpeed requests — try again in a minute.' }),
});

const PSI_CACHE_TTL_MS = 30 * 60 * 1000;
const PSI_CACHE_MAX = 60;
const psiCache = new Map<string, { at: number; payload: PsiRawPayload }>();

/** Every absolute URL the report already knows about (site + affected examples). */
function collectReportUrls(doc: { url?: unknown; normalizedUrl?: unknown; issues?: unknown }): Set<string> {
  const urls = new Set<string>();
  const add = (value: unknown): void => {
    if (typeof value !== 'string') return;
    const token = value.split(/\s+/)[0];
    if (!/^https?:\/\//i.test(token)) return;
    urls.add(token.replace(/\/+$/, ''));
  };
  add(doc.url);
  add(doc.normalizedUrl);
  const issues = Array.isArray(doc.issues) ? doc.issues : [];
  for (const issue of issues) {
    const examples = (issue as { affected?: { examples?: unknown } })?.affected?.examples;
    if (Array.isArray(examples)) examples.forEach(add);
  }
  return urls;
}

/** Drop the payloads that would bloat the response (PSI inlines base64 screenshots). */
function trimPsi(payload: PsiRawPayload): PsiRawPayload {
  const audits = (payload.lighthouseResult as { audits?: Record<string, unknown> }).audits;
  if (!audits || typeof audits !== 'object') return payload;
  const cleaned: Record<string, unknown> = { ...audits };
  // Lighthouse embeds a full-page JPEG here; the much smaller final-screenshot stays.
  delete cleaned['full-page-screenshot'];
  return { ...payload, lighthouseResult: { ...payload.lighthouseResult, audits: cleaned } };
}

// GET /api/public-audit/:id/psi?url=<absolute>&strategy=mobile|desktop
router.get('/:id/psi', psiLimiter, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || '');
    const raw = String(req.query.url || '');
    const strategy: PsiStrategy = req.query.strategy === 'desktop' ? 'desktop' : 'mobile';
    if (!/^[a-f0-9]{32}$/i.test(id) || !/^https?:\/\//i.test(raw)) {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }
    const doc = await AuditReport.findOne({ shareToken: id }).select('url normalizedUrl issues').lean();
    if (!doc) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    const target = raw.replace(/\/+$/, '');
    if (!collectReportUrls(doc as object).has(target)) {
      res.status(403).json({ error: 'That URL is not part of this report' });
      return;
    }
    const key = `${target}|${strategy}`;
    const hit = psiCache.get(key);
    if (hit && Date.now() - hit.at < PSI_CACHE_TTL_MS) {
      res.json({ ...hit.payload, cached: true });
      return;
    }
    const payload = await fetchPsiRaw(target, strategy, process.env.PAGESPEED_API_KEY);
    if (!payload) {
      res.status(502).json({ error: 'PageSpeed Insights did not return data for that URL' });
      return;
    }
    const trimmed = trimPsi(payload);
    psiCache.set(key, { at: Date.now(), payload: trimmed });
    if (psiCache.size > PSI_CACHE_MAX) {
      const oldest = [...psiCache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (oldest) psiCache.delete(oldest[0]);
    }
    res.json({ ...trimmed, cached: false });
  } catch {
    res.status(400).json({ error: 'Invalid request' });
  }
});

// GET /api/public-audit/:id — full report (public, shareable).
// Reports are addressed only by their random 32-hex shareToken. A Mongo _id is
// semi-sequential, so answering one — even with a 410 — would confirm that a
// given id is a real report.
router.get('/:id', readLimiter, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || '');
    const doc = /^[a-f0-9]{32}$/i.test(id)
      ? await AuditReport.findOne({ shareToken: id }).lean()
      : null;
    if (!doc) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    const d = doc as unknown as { origin?: string; createdAt?: Date };
    if (d.origin && d.createdAt) maybeRefreshStale(d.origin, new Date(d.createdAt));
    const snaps = d.origin
      ? await AuditSnapshot.find({ origin: d.origin }).sort({ date: 1 }).limit(30).lean().catch(() => [])
      : [];
    res.json({ ...(doc as object), trend: snaps.map(s => ({ date: s.date, overall: s.overall, scores: s.scores })) });
  } catch {
    res.status(400).json({ error: 'Invalid report id' });
  }
});

export default router;
