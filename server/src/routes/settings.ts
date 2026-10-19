import { Router, Request, Response } from 'express';
import SiteSettings from '../models/SiteSettings';
import { verifyJWT, requireRole, AuthRequest } from '../middleware/auth';
import { pick } from '../lib/utils';

const SETTINGS_FIELDS = ['siteName', 'siteUrl', 'defaultMetaTitle', 'defaultMetaDescription', 'ogImage', 'faviconUrl', 'googleAnalyticsId', 'maintenanceMode', 'systemStatus', 'customHeadCode'] as const;

// Everything a public visitor legitimately needs. customHeadCode and
// googleAnalyticsId stay admin-only: customHeadCode is raw HTML and must never
// be readable by anonymous clients.
const router = Router();

// GET /api/settings/public (public, safe subset)
router.get('/public', async (_req: Request, res: Response) => {
  try {
    const settings = (await SiteSettings.findOne().lean()) as Record<string, unknown> | null;
    const s = settings || {};
    res.set('Cache-Control', 'public, max-age=60');
    res.json({
      siteName: s.siteName ?? 'Serpely',
      siteUrl: s.siteUrl ?? '',
      defaultMetaTitle: s.defaultMetaTitle ?? '',
      defaultMetaDescription: s.defaultMetaDescription ?? '',
      ogImage: s.ogImage ?? '',
      faviconUrl: s.faviconUrl ?? '',
      maintenanceMode: Boolean(s.maintenanceMode),
      systemStatus: s.systemStatus ?? 'operational',
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/settings (auth — full document, incl. customHeadCode)
router.get('/', verifyJWT, async (_req: AuthRequest, res: Response) => {
  try {
    const settings = await SiteSettings.findOne();
    res.json(settings || {});
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/settings (owner — can inject raw head HTML and analytics config)
router.put('/', verifyJWT, requireRole('owner'), async (req: AuthRequest, res: Response) => {
  try {
    const settings = await SiteSettings.findOneAndUpdate({}, pick(req.body, SETTINGS_FIELDS), { upsert: true, new: true });
    res.json(settings);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
