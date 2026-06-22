import { Router, Request, Response } from 'express';
import SiteSettings from '../models/SiteSettings';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import { pick } from '../lib/utils';

const SETTINGS_FIELDS = ['siteName', 'siteUrl', 'defaultMetaTitle', 'defaultMetaDescription', 'ogImage', 'faviconUrl', 'googleAnalyticsId', 'maintenanceMode', 'systemStatus', 'customHeadCode'] as const;

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
    const settings = await SiteSettings.findOneAndUpdate({}, pick(req.body, SETTINGS_FIELDS), { upsert: true, new: true });
    res.json(settings);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
