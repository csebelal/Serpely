import { Router, Request, Response } from 'express';
import Subscriber from '../models/Subscriber';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import { logAction } from '../lib/audit';

const router = Router();

// POST /api/subscribers (public, upsert)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, source } = req.body as { email: string; source?: string };
    if (!email) { res.status(400).json({ error: 'Email required' }); return; }
    await Subscriber.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { $set: { active: true, source: source || 'website' }, $setOnInsert: { email: email.toLowerCase().trim() } },
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

// DELETE /api/subscribers/bulk (auth)
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

// GET /api/subscribers/export (auth)
router.get('/export', verifyJWT, async (_req: AuthRequest, res: Response) => {
  try {
    const subscribers = await Subscriber.find({ active: true }).sort({ createdAt: -1 });
    const rows = ['email,source,createdAt', ...subscribers.map(s => `${s.email},${s.source},${s.createdAt.toISOString()}`)];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="subscribers.csv"');
    res.send(rows.join('\n'));
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
