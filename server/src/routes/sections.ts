import { Router, Request, Response } from 'express';
import SiteSection from '../models/SiteSection';
import { verifyJWT, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/sections/:name  (public)
router.get('/:name', async (req: Request, res: Response) => {
  try {
    const doc = await SiteSection.findOne({ section: req.params.name });
    if (!doc) { res.status(404).json({ error: 'Section not found' }); return; }
    res.json(doc);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/sections/:name  (auth) — merges with existing data so per-tab saves don't clobber each other
router.put('/:name', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await SiteSection.findOne({ section: req.params.name });
    const merged = { ...(existing?.data as Record<string, unknown> || {}), ...(req.body.data as Record<string, unknown>) };
    const doc = await SiteSection.findOneAndUpdate(
      { section: req.params.name },
      { data: merged, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(doc);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/sections  (list all section names)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const docs = await SiteSection.find({}, 'section updatedAt');
    res.json(docs);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
