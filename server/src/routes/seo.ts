import { Router, Request, Response } from 'express';
import SEOPage from '../models/SEOPage';
import SiteSettings from '../models/SiteSettings';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import { logAction } from '../lib/audit';
import { pick } from '../lib/utils';

const SEO_FIELDS = ['title', 'description', 'ogImage', 'noIndex'] as const;

const router = Router();

// GET /api/seo (auth — all pages)
router.get('/', verifyJWT, async (_req: AuthRequest, res: Response) => {
  try {
    const pages = await SEOPage.find().sort({ pageKey: 1 });
    res.json(pages);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/seo/:key (public) — merges per-page SEO with SiteSettings defaults
router.get('/:key', async (req: Request, res: Response) => {
  try {
    const [page, settings] = await Promise.all([
      SEOPage.findOne({ pageKey: req.params.key }),
      SiteSettings.findOne().lean(),
    ]);

    const d = settings || {} as any;
    const out: Record<string, any> = {
      metaTitle:       page?.metaTitle       || d.defaultMetaTitle       || '',
      metaDescription: page?.metaDescription || d.defaultMetaDescription || '',
      ogImage:         page?.ogImage         || d.ogImage                || '',
      canonicalUrl:    page?.canonicalUrl    || '',
      noIndex:         page?.noIndex         || false,
      customSchema:    page?.customSchema    || '',
      faviconUrl:      d.faviconUrl          || '',
      siteName:        d.siteName            || 'Serpely',
      siteUrl:         d.siteUrl             || '',
    };

    res.json(out);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/seo/:key (auth — upsert)
router.put('/:key', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...pick(req.body, SEO_FIELDS), pageKey: req.params.key, updatedAt: new Date() };
    const page = await SEOPage.findOneAndUpdate(
      { pageKey: req.params.key },
      data,
      { upsert: true, new: true },
    );
    await logAction(req, 'update', 'seo', `key:${req.params.key}`);
    res.json(page);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
