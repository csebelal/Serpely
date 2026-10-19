import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import Subscriber from '../models/Subscriber';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import { logAction } from '../lib/audit';

const router = Router();

// Public signup: 5 / hour / IP.
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: 'Too many requests — please try again later.' }),
});
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// POST /api/subscribers (public, upsert)
router.post('/', signupLimiter, async (req: Request, res: Response) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 200) : '';
    const source = typeof req.body?.source === 'string' ? req.body.source.trim().slice(0, 60) : 'website';
    if (!email) { res.status(400).json({ error: 'Email required' }); return; }
    if (!EMAIL_RE.test(email)) { res.status(400).json({ error: 'Please enter a valid email address.' }); return; }
    await Subscriber.findOneAndUpdate(
      { email },
      { $set: { active: true, source }, $setOnInsert: { email } },
      { upsert: true, new: true },
    );
    res.status(201).json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/subscribers (auth)
router.get('/', verifyJWT, async (_req: AuthRequest, res: Response) => {
  try {
    const subscribers = await Subscriber.find().sort({ createdAt: -1 });
    const total = subscribers.length;
    const active = subscribers.filter(s => s.active).length;
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = subscribers.filter(s => s.createdAt > oneWeekAgo).length;
    res.json({ subscribers, stats: { total, active, thisWeek, unsubscribed: total - active } });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/subscribers/:id (auth) — toggle active
router.patch('/:id', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { active } = req.body as { active: boolean };
    const subscriber = await Subscriber.findByIdAndUpdate(req.params.id, { active }, { new: true });
    if (!subscriber) { res.status(404).json({ error: 'Not found' }); return; }
    await logAction(req, 'update', 'subscriber', `id:${req.params.id} active:${active}`);
    res.json(subscriber);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/subscribers/bulk (auth) — registered before /:id so 'bulk' isn't matched as an id
router.delete('/bulk', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids?.length) { res.status(400).json({ error: 'ids required' }); return; }
    await Subscriber.deleteMany({ _id: { $in: ids } });
    await logAction(req, 'delete', 'subscriber', `bulk:${ids.length}`);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/subscribers/:id (auth)
router.delete('/:id', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    await Subscriber.findByIdAndDelete(req.params.id);
    await logAction(req, 'delete', 'subscriber', `id:${req.params.id}`);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

function csvEscape(value: string): string {
  const str = String(value ?? '');
  const safe = str.replace(/^[=+\-@\t]/, "'$&");
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

// GET /api/subscribers/export (auth)
router.get('/export', verifyJWT, async (_req: AuthRequest, res: Response) => {
  try {
    const subscribers = await Subscriber.find({ active: true }).sort({ createdAt: -1 });
    const rows = [
      'email,source,createdAt',
      ...subscribers.map(s =>
        [csvEscape(s.email), csvEscape(s.source || ''), csvEscape(s.createdAt.toISOString())].join(',')
      ),
    ];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="subscribers.csv"');
    res.send(rows.join('\n'));
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
