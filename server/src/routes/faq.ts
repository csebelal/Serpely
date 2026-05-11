import { Router, Request, Response } from 'express';
import FaqItem from '../models/FaqItem';
import { verifyJWT, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const filter: Record<string, unknown> = { isVisible: true };
    if (req.query.section) filter.section = req.query.section;
    const items = await FaqItem.find(filter).sort('order');
    res.json(items);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/all', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.section) filter.section = req.query.section;
    const items = await FaqItem.find(filter).sort('order');
    res.json(items);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const items = req.body as Array<Record<string, unknown>>;
    await FaqItem.deleteMany({});
    const saved = await FaqItem.insertMany(items);
    res.json(saved);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
