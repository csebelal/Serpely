import { Router, Request, Response } from 'express';
import NavItem from '../models/NavItem';
import { verifyJWT, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/nav  (public)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const items = await NavItem.find().sort('order');
    res.json(items);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/nav  (replace all, auth)
router.put('/', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const items = req.body as typeof NavItem[];
    await NavItem.deleteMany({});
    const saved = await NavItem.insertMany(items);
    res.json(saved);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
