import { Router, Request, Response } from 'express';
import Changelog from '../models/Changelog';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import { logAction } from '../lib/audit';
import { pick } from '../lib/utils';

const CHANGELOG_FIELDS = ['title', 'slug', 'body', 'published', 'publishedAt', 'tags'] as const;

const router = Router();

// GET /api/changelog (public — published only)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const entries = await Changelog.find({ published: true }).sort({ publishedAt: -1 });
    res.json(entries);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/changelog/all (auth)
router.get('/all', verifyJWT, async (_req: AuthRequest, res: Response) => {
  try {
    const entries = await Changelog.find().sort({ createdAt: -1 });
    res.json(entries);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/changelog (auth)
router.post('/', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const data = pick(req.body, CHANGELOG_FIELDS) as Record<string, unknown>;
    if (data.published && !data.publishedAt) data.publishedAt = new Date();
    const entry = await Changelog.create(data);
    await logAction(req, 'create', 'changelog', `slug:${entry.slug}`);
    res.status(201).json(entry);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/changelog/:id (auth)
router.put('/:id', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const data = pick(req.body, CHANGELOG_FIELDS) as Record<string, unknown>;
    data.updatedAt = new Date();
    if (data.published && !data.publishedAt) data.publishedAt = new Date();
    const entry = await Changelog.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!entry) { res.status(404).json({ error: 'Not found' }); return; }
    await logAction(req, 'update', 'changelog', `id:${req.params.id}`);
    res.json(entry);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/changelog/:id (auth)
router.delete('/:id', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    await Changelog.findByIdAndDelete(req.params.id);
    await logAction(req, 'delete', 'changelog', `id:${req.params.id}`);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
