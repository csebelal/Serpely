import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import PageView from '../models/PageView';
import { verifyJWT, AuthRequest } from '../middleware/auth';

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
    const last7dStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30dStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [today, last7d, last30d] = await Promise.all([
      PageView.countDocuments({ createdAt: { $gte: startOfToday } }),
      PageView.countDocuments({ createdAt: { $gte: last7dStart } }),
      PageView.countDocuments({ createdAt: { $gte: last30dStart } }),
    ]);

    const topPages = await PageView.aggregate([
      { $match: { createdAt: { $gte: last30dStart } } },
      { $group: { _id: '$path', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { path: '$_id', count: 1, _id: 0 } },
    ]);

    // Daily views for last 30 days
    const dailyViews = await PageView.aggregate([
      { $match: { createdAt: { $gte: last30dStart } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', count: 1, _id: 0 } },
    ]);

    res.json({ today, last7d, last30d, topPages, dailyViews });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
