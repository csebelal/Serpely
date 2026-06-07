import { Router, Request, Response } from 'express';
import Testimonial from '../models/Testimonial';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import { pick } from '../lib/utils';

const TESTIMONIAL_FIELDS = ['name', 'role', 'company', 'avatar', 'content', 'rating', 'isVisible', 'order'] as const;

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const items = await Testimonial.find({ isVisible: true }).sort('order');
    res.json(items);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/all', verifyJWT, async (_req: AuthRequest, res: Response) => {
  try {
    const items = await Testimonial.find().sort('order');
    res.json(items);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const items = (req.body as Record<string, unknown>[]).map(item => pick(item, TESTIMONIAL_FIELDS));
    await Testimonial.deleteMany({});
    const saved = await Testimonial.insertMany(items);
    res.json(saved);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
