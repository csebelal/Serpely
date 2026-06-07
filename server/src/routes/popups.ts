import { Router, Request, Response } from 'express';
import Popup from '../models/Popup';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import { logAction } from '../lib/audit';
import { pick } from '../lib/utils';

const POPUP_FIELDS = ['type', 'title', 'body', 'ctaText', 'ctaHref', 'bgColor', 'trigger', 'delay', 'active', 'startAt', 'endAt'] as const;

const router = Router();

// GET /api/popups (public — active only, within date range)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const popups = await Popup.find({
      active: true,
      $or: [{ startAt: { $exists: false } }, { startAt: null }, { startAt: { $lte: now } }],
    }).then(results => results.filter(p => !p.endAt || p.endAt >= now));
    res.json(popups);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/popups/all (auth)
router.get('/all', verifyJWT, async (_req: AuthRequest, res: Response) => {
  try {
    const popups = await Popup.find().sort({ createdAt: -1 });
    res.json(popups);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/popups (auth)
router.post('/', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const popup = await Popup.create(pick(req.body, POPUP_FIELDS));
    await logAction(req, 'create', 'popup', `name:${popup.title}`);
    res.status(201).json(popup);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/popups/:id (auth)
router.put('/:id', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const popup = await Popup.findByIdAndUpdate(req.params.id, pick(req.body, POPUP_FIELDS), { new: true });
    if (!popup) { res.status(404).json({ error: 'Not found' }); return; }
    await logAction(req, 'update', 'popup', `id:${req.params.id}`);
    res.json(popup);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/popups/:id (auth)
router.delete('/:id', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    await Popup.findByIdAndDelete(req.params.id);
    await logAction(req, 'delete', 'popup', `id:${req.params.id}`);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
