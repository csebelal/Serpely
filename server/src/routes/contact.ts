import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import ContactSubmission from '../models/ContactSubmission';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import { logAction } from '../lib/audit';
import { guardTurnstile } from '../lib/turnstile';

const router = Router();

// Public form: 5 submissions / hour / IP.
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: 'Too many messages — please try again later.' }),
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// POST /api/contact (public)
router.post('/', submitLimiter, async (req: Request, res: Response) => {
  try {
    if (!(await guardTurnstile(req, res))) return;
    const name = str(req.body?.name, 120);
    const email = str(req.body?.email, 200);
    const message = str(req.body?.message, 5000);
    if (!name || !email || !message) {
      res.status(400).json({ error: 'name, email, message required' });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    const submission = await ContactSubmission.create({
      name,
      email,
      company: str(req.body?.company, 160),
      website: str(req.body?.website, 300),
      topic: str(req.body?.topic, 120),
      message,
    });
    res.status(201).json({ success: true, id: submission._id });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/contact (auth)
router.get('/', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { status, starred } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = {};
    if (typeof status === 'string' && status) filter.status = status;
    if (starred === 'true') filter.starred = true;
    const submissions = await ContactSubmission.find(filter).sort({ createdAt: -1 });
    const unreadCount = await ContactSubmission.countDocuments({ read: false });
    res.json({ submissions, unreadCount });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/contact/:id (auth)
router.patch('/:id', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { read, starred, status } = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (read !== undefined) update.read = read;
    if (starred !== undefined) update.starred = starred;
    if (status !== undefined) update.status = status;
    const submission = await ContactSubmission.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!submission) { res.status(404).json({ error: 'Not found' }); return; }
    await logAction(req, 'update', 'contact', `id:${req.params.id}`);
    res.json(submission);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/contact/:id (auth)
router.delete('/:id', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    await ContactSubmission.findByIdAndDelete(req.params.id);
    await logAction(req, 'delete', 'contact', `id:${req.params.id}`);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
