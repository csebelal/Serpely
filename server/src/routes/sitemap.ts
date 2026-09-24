import { Router, Request, Response } from 'express';
import BlogPost from '../models/BlogPost';

const router = Router();

const BASE_URL = 'https://serpely.com';
const today = () => new Date().toISOString().split('T')[0];

const STATIC_PAGES = [
  { loc: '/', priority: '1.0', changefreq: 'weekly', image: '/og-image.png' },
  { loc: '/features', priority: '0.9', changefreq: 'monthly', image: '/og-image.png' },
  { loc: '/pricing', priority: '0.9', changefreq: 'monthly' },
  { loc: '/blog', priority: '0.9', changefreq: 'daily' },
  { loc: '/integrations', priority: '0.8', changefreq: 'monthly' },
  { loc: '/how-it-works', priority: '0.8', changefreq: 'monthly' },
  { loc: '/product-tour', priority: '0.8', changefreq: 'monthly', image: '/dashboard-home.jpg' },
  { loc: '/compare', priority: '0.8', changefreq: 'monthly' },
  { loc: '/audit', priority: '0.9', changefreq: 'weekly' },
  { loc: '/compare/semrush', priority: '0.9', changefreq: 'monthly' },
  { loc: '/compare/ahrefs', priority: '0.9', changefreq: 'monthly' },
  { loc: '/compare/moz', priority: '0.8', changefreq: 'monthly' },
  { loc: '/compare/se-ranking', priority: '0.8', changefreq: 'monthly' },
  { loc: '/compare/surfer-seo', priority: '0.8', changefreq: 'monthly' },
  { loc: '/compare/serpstat', priority: '0.8', changefreq: 'monthly' },
  { loc: '/compare/nightwatch', priority: '0.7', changefreq: 'monthly' },
  { loc: '/compare/rankability', priority: '0.7', changefreq: 'monthly' },
  { loc: '/compare/frase', priority: '0.7', changefreq: 'monthly' },
  { loc: '/compare/clearscope', priority: '0.7', changefreq: 'monthly' },
  { loc: '/compare/marketmuse', priority: '0.7', changefreq: 'monthly' },
  { loc: '/compare/seobility', priority: '0.7', changefreq: 'monthly' },
  { loc: '/about', priority: '0.7', changefreq: 'monthly', image: '/team-photo.jpg' },
  { loc: '/faq', priority: '0.7', changefreq: 'monthly' },
  { loc: '/changelog', priority: '0.6', changefreq: 'weekly' },
  { loc: '/contact', priority: '0.5', changefreq: 'yearly' },
  { loc: '/blog/category/llm-seo', priority: '0.6', changefreq: 'weekly' },
  { loc: '/blog/category/agentic-seo', priority: '0.6', changefreq: 'weekly' },
  { loc: '/blog/category/technical-seo', priority: '0.6', changefreq: 'weekly' },
  { loc: '/blog/category/ai-seo-tools', priority: '0.6', changefreq: 'weekly' },
  { loc: '/blog/category/geo-aeo', priority: '0.6', changefreq: 'weekly' },
];

// GET /api/sitemap.xml — full dynamic sitemap
router.get('/sitemap.xml', async (_req: Request, res: Response) => {
  try {
    const posts = await BlogPost.find({ published: true }, { slug: 1, publishedAt: 1, updatedAt: 1, coverImage: 1 }).lean();

    const staticUrls = STATIC_PAGES.map(p => {
      const imageTag = (p as any).image
        ? `\n    <image:image><image:loc>${BASE_URL}${(p as any).image}</image:loc></image:image>`
        : '';
      return `
  <url>
    <loc>${BASE_URL}${p.loc}</loc>
    <lastmod>${today()}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>${imageTag}
  </url>`;
    }).join('');

    const blogUrls = posts.map(p => {
      const lastmod = (p.updatedAt || p.publishedAt)
        ? new Date(p.updatedAt || p.publishedAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      const rawImage = (p as any).coverImage as string | undefined;
      const imageTag = rawImage
        ? `\n    <image:image><image:loc>${rawImage.startsWith('http') ? rawImage : `${BASE_URL}${rawImage}`}</image:loc></image:image>`
        : '';
      return `
  <url>
    <loc>${BASE_URL}/blog/${p.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>${imageTag}
  </url>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${staticUrls}${blogUrls}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch {
    res.status(500).send('Sitemap generation failed');
  }
});

export default router;
