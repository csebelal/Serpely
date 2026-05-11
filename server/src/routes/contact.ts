import { Router, Request, Response } from 'express';
import ContactSubmission from '../models/ContactSubmission';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import { logAction } from '../lib/audit';

const router = Router();

// POST /api/contact (public)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, company, website, topic, message } = req.body as Record<string, string>;
    if (!name || !email || !message) {
      res.status(400).json({ error: 'name, email, message required' });
      return;
    }
    const submission = await ContactSubmission.create({ name, email, company, website, topic, message });
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
    if (status) filter.status = status;
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
