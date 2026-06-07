import { Router, Request, Response } from 'express';
import FooterConfig from '../models/FooterConfig';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import { pick } from '../lib/utils';

const FOOTER_FIELDS = ['columns', 'socialLinks', 'bottomText'] as const;

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const config = await FooterConfig.findOne();
    if (config && !config.socialLinks.some(s => s.platform === 'YouTube')) {
      config.socialLinks.push({ platform: 'YouTube', href: '#' });
      await config.save();
    }
    res.json(config || {});
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const config = await FooterConfig.findOneAndUpdate({}, pick(req.body, FOOTER_FIELDS), { upsert: true, new: true });
    res.json(config);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
