import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import PageView from '../models/PageView';
import ConsentLog from '../models/ConsentLog';
import AuditReport from '../models/AuditReport';
import SitemapReport from '../models/SitemapReport';
import ClientUser from '../models/ClientUser';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import { parseDateRange } from '../lib/dateRange';

const router = Router();

const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/analytics/track (public)
router.post('/track', trackLimiter, async (req: Request, res: Response) => {
  try {
    const { path: rawPath, referrer: rawReferrer } = req.body as { path?: unknown; referrer?: unknown };
    const path = typeof rawPath === 'string' ? rawPath.slice(0, 512) : '';
    const referrer = typeof rawReferrer === 'string' ? rawReferrer.slice(0, 512) : '';
    if (!path || !path.startsWith('/')) { res.status(400).json({ error: 'path required' }); return; }
    const ua = String(req.headers['user-agent'] || '').slice(0, 512);
    await PageView.create({ path, referrer, ua });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/analytics/summary (auth)
router.get('/summary', verifyJWT, async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const last7dStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prev7dStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const last30dStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      today,
      yesterday,
      last7d,
      prev7d,
      last30d,
      topPages,
      topReferrers,
      dailyViews,
      totalAudits,
      auditsLast7d,
      avgScoreAgg,
      recentAudits,
      totalSitemapChecks,
      totalClients,
      clientsLast7d,
      verifiedClients,
      planAgg,
    ] = await Promise.all([
      PageView.countDocuments({ createdAt: { $gte: startOfToday } }),
      PageView.countDocuments({ createdAt: { $gte: startOfYesterday, $lt: startOfToday } }),
      PageView.countDocuments({ createdAt: { $gte: last7dStart } }),
      PageView.countDocuments({ createdAt: { $gte: prev7dStart, $lt: last7dStart } }),
      PageView.countDocuments({ createdAt: { $gte: last30dStart } }),
      PageView.aggregate([
        { $match: { createdAt: { $gte: last30dStart } } },
        { $group: { _id: '$path', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { path: '$_id', count: 1, _id: 0 } },
      ]),
      PageView.aggregate([
        { $match: { createdAt: { $gte: last30dStart }, referrer: { $ne: '' } } },
        { $group: { _id: '$referrer', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
        { $project: { referrer: '$_id', count: 1, _id: 0 } },
      ]),
      PageView.aggregate([
        { $match: { createdAt: { $gte: last30dStart } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', count: 1, _id: 0 } },
      ]),
      AuditReport.countDocuments({ status: 'done' }),
      AuditReport.countDocuments({ status: 'done', createdAt: { $gte: last7dStart } }),
      AuditReport.aggregate([
        { $match: { status: 'done', overall: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$overall' } } },
      ]),
      AuditReport.find({ status: 'done' })
        .sort({ createdAt: -1 })
        .limit(6)
        .select('normalizedUrl overall pages summary shareToken createdAt')
        .lean(),
      SitemapReport.countDocuments({}),
      ClientUser.countDocuments({}),
      ClientUser.countDocuments({ createdAt: { $gte: last7dStart } }),
      ClientUser.countDocuments({ emailVerified: true }),
      ClientUser.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }]),
    ]);

    const plans = { starter: 0, pro: 0, business: 0 };
    for (const row of planAgg as { _id?: string; count: number }[]) {
      if (row._id === 'starter' || row._id === 'pro' || row._id === 'business') {
        plans[row._id] = row.count;
      }
    }

    res.json({
      today,
      yesterday,
      last7d,
      prev7d,
      last30d,
      topPages,
      topReferrers,
      dailyViews,
      audits: {
        total: totalAudits,
        last7d: auditsLast7d,
        avgScore: avgScoreAgg[0]?.avg ? Math.round(avgScoreAgg[0].avg) : null,
        recent: (recentAudits as Array<{
          normalizedUrl?: string;
          overall?: number;
          pages?: { crawled?: number };
          summary?: { critical?: number; warning?: number };
          shareToken?: string;
          createdAt?: Date;
        }>).map(a => ({
          url: a.normalizedUrl || '',
          overall: a.overall ?? 0,
          pagesCrawled: a.pages?.crawled ?? 0,
          critical: a.summary?.critical ?? 0,
          warning: a.summary?.warning ?? 0,
          shareToken: a.shareToken || '',
          createdAt: a.createdAt,
        })),
      },
      sitemaps: { total: totalSitemapChecks },
      clients: {
        total: totalClients,
        last7d: clientsLast7d,
        verified: verifiedClients,
        plans,
      },
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/analytics/consent (public) — log a cookie-banner decision
router.post('/consent', trackLimiter, async (req: Request, res: Response) => {
  try {
    const body = req.body as { choice?: unknown; visitorId?: unknown; page?: unknown };
    const choice = body.choice === 'granted' || body.choice === 'denied' ? body.choice : null;
    if (!choice) { res.status(400).json({ error: 'invalid choice' }); return; }
    await ConsentLog.create({
      choice,
      // Stored as-is but length-capped; it is a random id, not a tracking cookie.
      visitorId: typeof body.visitorId === 'string' ? body.visitorId.slice(0, 64) : '',
      ua: String(req.headers['user-agent'] || '').slice(0, 256),
      page: typeof body.page === 'string' && body.page.startsWith('/') ? body.page.slice(0, 512) : '',
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/analytics/consent-log (auth) — admin view of banner decisions
router.get('/consent-log', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { choice, from, to } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = {};
    if (choice === 'granted' || choice === 'denied') filter.choice = choice;
    const { range, error } = parseDateRange(from, to);
    if (error) { res.status(400).json({ error }); return; }
    if (range) filter.createdAt = range;

    const logs = await ConsentLog.find(filter).sort({ createdAt: -1 }).limit(300);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last30dStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [total, granted, denied, today, last30d, byDay, byPage] = await Promise.all([
      ConsentLog.countDocuments({}),
      ConsentLog.countDocuments({ choice: 'granted' }),
      ConsentLog.countDocuments({ choice: 'denied' }),
      ConsentLog.countDocuments({ createdAt: { $gte: startOfToday } }),
      ConsentLog.countDocuments({ createdAt: { $gte: last30dStart } }),
      ConsentLog.aggregate([
        { $match: { createdAt: { $gte: last30dStart } } },
        {
          $group: {
            _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, choice: '$choice' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.day': 1 } },
      ]),
      ConsentLog.aggregate([
        { $match: { createdAt: { $gte: last30dStart }, page: { $ne: '' } } },
        { $group: { _id: '$page', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { page: '$_id', count: 1, _id: 0 } },
      ]),
    ]);

    res.json({
      logs,
      stats: {
        total, granted, denied, today, last30d,
        acceptRate: total > 0 ? Math.round((granted / total) * 100) : null,
        byDay,
        byPage,
      },
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
