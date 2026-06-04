import { Router, Request, Response } from 'express';
import BlogPost from '../models/BlogPost';

const router = Router();

const STATIC_PAGES = [
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/features', priority: '0.9', changefreq: 'monthly' },
  { loc: '/pricing', priority: '0.9', changefreq: 'monthly' },
  { loc: '/blog', priority: '0.9', changefreq: 'daily' },
  { loc: '/integrations', priority: '0.8', changefreq: 'monthly' },
  { loc: '/how-it-works', priority: '0.8', changefreq: 'monthly' },
  { loc: '/product-tour', priority: '0.8', changefreq: 'monthly' },
  { loc: '/compare', priority: '0.8', changefreq: 'monthly' },
  { loc: '/compare/semrush', priority: '0.9', changefreq: 'monthly' },
  { loc: '/compare/ahrefs', priority: '0.9', changefreq: 'monthly' },
  { loc: '/compare/moz', priority: '0.8', changefreq: 'monthly' },
  { loc: '/compare/se-ranking', priority: '0.8', changefreq: 'monthly' },
  { loc: '/compare/surfer-seo', priority: '0.8', changefreq: 'monthly' },
  { loc: '/compare/serpstat', priority: '0.8', changefreq: 'monthly' },
  { loc: '/compare/nightwatch', priority: '0.7', changefreq: 'monthly' },
  { loc: '/compare/rankability', priority: '0.7', changefreq: 'monthly' },
  { loc: '/about', priority: '0.7', changefreq: 'monthly' },
  { loc: '/faq', priority: '0.7', changefreq: 'monthly' },
  { loc: '/changelog', priority: '0.6', changefreq: 'weekly' },
  { loc: '/contact', priority: '0.5', changefreq: 'yearly' },
];

const BASE_URL = 'https://serpely.com';

// GET /api/sitemap.xml — full dynamic sitemap
router.get('/sitemap.xml', async (_req: Request, res: Response) => {
  try {
    const posts = await BlogPost.find({ published: true }, { slug: 1, publishedAt: 1, updatedAt: 1 }).lean();

    const staticUrls = STATIC_PAGES.map(p => `
  <url>
    <loc>${BASE_URL}${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('');

    const blogUrls = posts.map(p => {
      const lastmod = (p.updatedAt || p.publishedAt)
        ? new Date(p.updatedAt || p.publishedAt).toISOString().split('T')[0]
        : '';
      return `
  <url>
    <loc>${BASE_URL}/blog/${p.slug}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticUrls}${blogUrls}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch {
    res.status(500).send('Sitemap generation failed');
  }
});

export default router;
