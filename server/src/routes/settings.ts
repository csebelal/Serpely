import { Router, Request, Response } from 'express';
import SiteSettings from '../models/SiteSettings';
import { verifyJWT, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const settings = await SiteSettings.findOne();
    res.json(settings || {});
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await SiteSettings.findOneAndUpdate({}, req.body, { upsert: true, new: true });
    res.json(settings);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
