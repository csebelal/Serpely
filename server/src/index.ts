import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be set and be at least 32 characters');
  process.exit(1);
}

import authRouter from './routes/auth';
import sectionsRouter from './routes/sections';
import navRouter from './routes/nav';
import footerRouter from './routes/footer';
import blogRouter from './routes/blog';
import pricingRouter from './routes/pricing';
import testimonialsRouter from './routes/testimonials';
import faqRouter from './routes/faq';
import settingsRouter from './routes/settings';
import uploadRouter from './routes/upload';
import clientAuthRouter from './routes/clientAuth';
import contactRouter from './routes/contact';
import subscribersRouter from './routes/subscribers';
import popupsRouter from './routes/popups';
import changelogRouter from './routes/changelog';
import seoRouter from './routes/seo';
import analyticsRouter from './routes/analytics';
import auditRouter from './routes/audit';
import backupRouter from './routes/backup';
import apiKeysRouter from './routes/apikeys';
import sitemapRouter from './routes/sitemap';
import AdminUser from './models/AdminUser';
import SiteSettings from './models/SiteSettings';
import BlogPost from './models/BlogPost';
import { getIndexNowKey } from './lib/searchEngines';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4000;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

app.use('/api/auth', authRouter);
app.use('/api/sections', sectionsRouter);
app.use('/api/nav', navRouter);
app.use('/api/footer', footerRouter);
app.use('/api/blog', blogRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/testimonials', testimonialsRouter);
app.use('/api/faq', faqRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/users', clientAuthRouter);
app.use('/api/contact', contactRouter);
app.use('/api/subscribers', subscribersRouter);
app.use('/api/popups', popupsRouter);
app.use('/api/changelog', changelogRouter);
app.use('/api/seo', seoRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/backup', backupRouter);
app.use('/api/keys', apiKeysRouter);

app.use('/api', sitemapRouter);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// IndexNow key-proof file (https://serpely.com/<key>.txt) — required by Bing
app.get('/:key.txt', (req, res) => {
  const key = getIndexNowKey();
  if (req.params.key === key) {
    res.type('text/plain').send(key);
  } else {
    res.status(404).send('');
  }
});

// ─── Frontend: Serve index.html with injected custom head code ──────────
const frontendDist = path.resolve(__dirname, '../../app/dist');
const indexHtmlPath = path.join(frontendDist, 'index.html');

interface SettingsCache { customHeadCode: string; updatedAt: number }
let settingsCache: SettingsCache | null = null;
const SETTINGS_CACHE_TTL = 60_000;

async function getCustomHeadCode(): Promise<string> {
  const now = Date.now();
  if (settingsCache && now - settingsCache.updatedAt < SETTINGS_CACHE_TTL) {
    return settingsCache.customHeadCode;
  }
  try {
    const s = await SiteSettings.findOne().lean();
    const code = (s as any)?.customHeadCode || '';
    settingsCache = { customHeadCode: code, updatedAt: now };
    return code;
  } catch {
    return settingsCache?.customHeadCode || '';
  }
}

// ─── Blog page cache (OG meta + full content for crawlers) ────────────
interface BlogPageData {
  title: string; excerpt: string; coverImage: string; slug: string;
  author: string; authorInitials: string; publishedAt: string;
  category: string; tagLabel: string; body: string;
  faq: { question: string; answer: string; order?: number }[];
  updatedAt: number;
}
const blogOgCache = new Map<string, BlogPageData>();
const BLOG_OG_CACHE_TTL = 60_000;

async function getBlogPageData(slug: string): Promise<BlogPageData | null> {
  const now = Date.now();
  const cached = blogOgCache.get(slug);
  if (cached && now - cached.updatedAt < BLOG_OG_CACHE_TTL) return cached;
  try {
    const p = await BlogPost.findOne({ slug, published: true }).lean() as any;
    if (!p) return null;
    const excerpt = p.excerpt || p.body?.replace(/<[^>]+>/g, '').slice(0, 160) || '';
    const data: BlogPageData = {
      title: p.title || '',
      excerpt,
      coverImage: p.coverImage || '',
      slug,
      author: p.author || '',
      authorInitials: p.authorInitials || '',
      publishedAt: p.publishedAt || '',
      category: p.category || '',
      tagLabel: p.tagLabel || '',
      body: p.body || '',
      faq: Array.isArray(p.faq) ? p.faq : [],
      updatedAt: now,
    };
    blogOgCache.set(slug, data);
    return data;
  } catch {
    return cached || null;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sanitizeBodyHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+=["'][^"']*["']/gi, '')
    .replace(/href="javascript:[^"]*"/gi, 'href="#"');
}

function replaceMeta(html: string, og: BlogPageData): string {
  const origin = 'https://serpely.com';
  const url = `${origin}/blog/${og.slug}`;
  const image = og.coverImage
    ? (og.coverImage.startsWith('http') ? og.coverImage : `${origin}${og.coverImage}`)
    : `${origin}/Serpely%20Logo%20PNG/Serpely%20-%20Logo_Logo%20-%20Main.png`;

  const set = (tag: string, content: string) => tag.replace(/content="[^"]*"/, `content="${content.replace(/"/g, '&quot;')}"`);

  // Replace <title>
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${og.title} — Serpely Blog</title>`);

  // Replace meta description
  html = html.replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${og.excerpt.replace(/"/g, '&quot;')}"`);

  // Replace OG tags
  html = html.replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${og.title.replace(/"/g, '&quot;')}"`);
  html = html.replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${og.excerpt.replace(/"/g, '&quot;')}"`);
  html = html.replace(/<meta property="og:type" content="[^"]*"/, `<meta property="og:type" content="article"`);
  html = html.replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${url}"`);
  html = html.replace(/<meta property="og:image" content="[^"]*"/, `<meta property="og:image" content="${image}"`);

  // Replace Twitter tags
  html = html.replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${og.title.replace(/"/g, '&quot;')}"`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${og.excerpt.replace(/"/g, '&quot;')}"`);
  html = html.replace(/<meta name="twitter:image" content="[^"]*"/, `<meta name="twitter:image" content="${image}"`);

  // Replace canonical
  html = html.replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${url}"`);

  return html;
}

// ─── Server-rendered content blocks for crawlers ─────────────────────
const STATIC_SEO_CONTENT: Record<string, { title: string; blocks: { h: string; p: string }[] }> = {
  '/': {
    title: 'Serpely — Agentic SEO for the AI-First Web',
    blocks: [
      { h: 'Agentic SEO, built for the AI-first web', p: 'A daily AI audit that tracks whether you are cited across ChatGPT, Perplexity, and Google AI Overviews, and tells you exactly what to fix next. Start your free trial now.' },
      { h: 'Track AI citations across every answer engine', p: 'See exactly where your brand appears in ChatGPT, Claude, Gemini, Google AI Mode, and Perplexity. Know when you are cited, when you are missing, and how to close the gap.' },
      { h: 'Daily AI audits and citation monitoring', p: 'Every page is scored 0–100 for AI visibility and citation eligibility. Continuous tracking, content gap analysis, and prioritized fix queues.' },
      { h: 'GEO and agentic SEO made simple', p: 'Agentic SEO platform built for the AI-first web. Dashboard analytics, AI audits, E-E-A-T signals, and technical SEO all in one platform.' },
    ],
  },
  '/features': {
    title: 'Features — Serpely',
    blocks: [
      { h: 'Rank higher in AI search', p: 'Track keyword rankings across Google and AI-driven search result engines including LLM answer engines. Real-time visibility shifts with intelligent alerts.' },
      { h: 'AI citation tracking', p: 'Monitor whether ChatGPT, Claude, Gemini, Perplexity, and Google AI Overviews cite your content, and see exactly where your brand appears.' },
      { h: 'Technical site audit', p: 'Continuously audit Core Web Vitals, crawl issues, indexing gaps, and schema errors, and prioritize fixes that directly impact AI visibility.' },
      { h: 'Content gaps and topic clusters', p: 'Discover missed opportunities with topic clusters, E-E-A-T signal tracking, and SERP intent analysis powered by agentic SEO.' },
    ],
  },
  '/pricing': {
    title: 'Pricing — Serpely',
    blocks: [
      { h: 'The right plan for every team', p: 'All plans include a 14-day free trial with no credit card required. Choose monthly or annual billing and scale as you grow.' },
      { h: 'AI visibility monitoring for every budget', p: 'Track citations in ChatGPT, Perplexity, and Google AI Overviews, run daily AI audits, and get everything you need for agentic SEO.' },
    ],
  },
  '/how-it-works': {
    title: 'How It Works — Serpely',
    blocks: [
      { h: 'Agentic SEO in 4 simple steps', p: 'Discover how Serpely transforms your SEO workflow from manual effort to automated growth with an AI-powered continuous audit loop.' },
      { h: 'From audit to action automatically', p: 'Serpely audits your site daily, scores every page for AI visibility and citation eligibility, and tells you exactly what to fix next.' },
    ],
  },
  '/product-tour': {
    title: 'Product Tour — Serpely',
    blocks: [
      { h: 'See Serpely in action', p: 'A full walkthrough of the agentic SEO platform: dashboard, AI audits, rank tracking, citation monitoring, and technical SEO tools.' },
      { h: 'One-click CMS integration', p: 'Connect WordPress, Webflow, and more with automatic setup, sitemap detection, and no coding required.' },
    ],
  },
  '/integrations': {
    title: 'Integrations — Serpely',
    blocks: [
      { h: 'Works with your entire SEO stack', p: 'Connect Serpely with WordPress, Webflow, Google Search Console, GA4, Ahrefs, Semrush, and the tools your marketing team already uses.' },
      { h: 'Get AI visibility data everywhere', p: 'Pull citation and rank data into your dashboards and reporting workflows across all major channels.' },
    ],
  },
  '/about': {
    title: 'About — Serpely',
    blocks: [
      { h: 'Building the future of organic search', p: 'Serpely is an agentic SEO platform built for the AI-first web, helping brands stay visible as search shifts to AI answer engines.' },
      { h: 'Our mission', p: 'Give every brand real-time clarity on where they appear in AI search, and the tools to win those citations.' },
    ],
  },
  '/faq': {
    title: 'FAQ — Serpely',
    blocks: [
      { h: 'Frequently asked questions', p: 'Answers about AI search visibility, daily audits, citation tracking across ChatGPT, Perplexity, and Google AI Overviews, and how Serpely compares to traditional SEO tools.' },
      { h: 'How is Serpely different from Semrush or Ahrefs?', p: 'Semrush and Ahrefs are data libraries. Serpely is a continuous workflow that audits daily, scores every page for AI visibility, monitors citations, and tells you exactly what to fix next.' },
    ],
  },
  '/contact': {
    title: 'Contact — Serpely',
    blocks: [
      { h: 'Get in touch', p: 'Contact the Serpely team about AI search visibility, agentic SEO, or a demo of the platform.' },
    ],
  },
  '/changelog': {
    title: 'What\'s New — Serpely',
    blocks: [
      { h: 'Product updates and changelog', p: 'Track the latest Serpely features, improvements, and fixes as we ship the agentic SEO platform.' },
    ],
  },
  '/compare': {
    title: 'Compare — Serpely',
    blocks: [
      { h: 'Serpely vs the competition', p: 'Compare Serpely against Semrush, Ahrefs, Moz, SE Ranking, Surfer SEO, and other SEO tools for the AI-first web.' },
      { h: 'Made for AI visibility, not just keywords', p: 'Only Serpely tracks your presence inside ChatGPT, Perplexity, Gemini, and Google AI Overviews with daily AI audits.' },
    ],
  },
};

const SSRCSS = '.seo-article{max-width:760px;margin:0 auto;padding:24px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;line-height:1.7}.seo-article h1{font-size:32px;line-height:1.15;letter-spacing:-.02em;margin:0 0 10px}.seo-article .seo-byline{font-size:13px;color:#64748b;margin:0 0 16px}.seo-article h2{font-size:22px;font-weight:700;margin:28px 0 8px}.seo-article p{margin:0 0 14px}.seo-article a{color:#00A868}.seo-article ul{margin:0 0 14px}.seo-article li{list-style:disc;margin-left:20px}';

function buildStaticSsr(path: string): string {
  const content = STATIC_SEO_CONTENT[path];
  if (!content) return '';
  const blocks = content.blocks.map(b => `<h2>${escapeHtml(b.h)}</h2><p>${escapeHtml(b.p)}</p>`).join('');
  return `<div class="seo-article"><h1>${escapeHtml(content.title.split(' — ')[0])}</h1>${blocks}</div>`;
}

async function buildBlogListSsr(): Promise<string> {
  try {
    const posts = await BlogPost.find({ published: true }, { title: 1, slug: 1, excerpt: 1 }).sort({ publishedAt: -1 }).limit(20).lean();
    const items = posts.map(p => {
      const raw = (p as any);
      const excerpt = raw.excerpt || '';
      return `<li><a href="/blog/${raw.slug}"><h2>${escapeHtml(raw.title || '')}</h2></a>${excerpt ? `<p>${escapeHtml(excerpt)}</p>` : ''}</li>`;
    }).join('');
    return `<div class="seo-article"><h1>Serpely Blog — AI Search & SEO Insights</h1><p>Latest articles about AI search visibility, citation tracking, and agentic SEO.</p><ul style="list-style:none;margin:0;padding:0">${items}</ul></div>`;
  } catch {
    return '';
  }
}

function buildBlogPostSsr(post: BlogPageData): string {
  const body = sanitizeBodyHtml(post.body || '');
  const date = post.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 10) : '';
  const byline = [post.author, date].filter(Boolean).join(' · ');
  const faq = (post.faq || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(f => `<h2>${escapeHtml(f.question)}</h2><p>${escapeHtml(f.answer)}</p>`).join('');
  return `<div class="seo-article">
  <h1>${escapeHtml(post.title)}</h1>
  ${byline ? `<p class="seo-byline">${escapeHtml(byline)}</p>` : ''}
  <ul style="list-style:none;margin:0 0 18px;padding:0"><li><a href="/blog">Serpely Blog</a></li></ul>
  ${post.excerpt ? `<p><strong>${escapeHtml(post.excerpt)}</strong></p>` : ''}
  ${body}
  ${faq ? `<section><h2>Frequently Asked Questions</h2>${faq}</section>` : ''}
</div>`;
}

function buildBlogPostHeadSchema(post: BlogPageData): string {
  const origin = 'https://serpely.com';
  const url = `${origin}/blog/${post.slug}`;
  const image = post.coverImage
    ? (post.coverImage.startsWith('http') ? post.coverImage : `${origin}${post.coverImage}`)
    : `${origin}/Serpely%20Logo%20PNG/Serpely%20-%20Logo_Logo%20-%20Main.png`;

  const schemas: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.excerpt,
      image: post.coverImage ? image : undefined,
      author: { '@type': 'Person', name: post.author || 'Serpely Team' },
      publisher: {
        '@type': 'Organization',
        name: 'Serpely',
        logo: { '@type': 'ImageObject', url: `${origin}/Serpely%20Logo%20PNG/Serpely%20-%20Logo_Logo%20-%20Main.png` },
      },
      datePublished: post.publishedAt || undefined,
      dateModified: post.publishedAt || undefined,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: origin },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${origin}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    },
  ];

  if (post.faq && post.faq.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: post.faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    });
  }

  return schemas.map(s => `<script type="application/ld+json">${JSON.stringify(s).replace(/</g, '\\u003c')}</script>`).join('\n');
}

const CRAWLER_RE = /googlebot|bingbot|duckduckbot|baiduspider|yandexbot|yandex|slurp|petalbot|semrushbot|ahrefsbot|majestic|rogerbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|gptbot|chatgpt-user|perplexitybot|claudebot|anthropic-ai|google-extended|ccbot|bingpreview|embedly|quora|pinterest|buffer|tumblr|isindex|gtmetrix|pingdom|screaming frog|sitebulb|google-sites-verification|googleinspectiontool/i;

app.use(async (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path.startsWith('/api/')) return next();
  if (req.path.startsWith('/uploads/')) return next();

  const previewMatch = req.path.startsWith('/blog/preview/');
  const adminMatch = req.path.startsWith('/sp-super-admin');
  const blogMatch = req.path.match(/^\/blog\/([a-z0-9-]+)$/);
  const isBlogList = req.path === '/blog' || req.path === '/blog/';
  const isCrawler = CRAWLER_RE.test(req.headers['user-agent'] || '');

  try {
    let html = fs.readFileSync(indexHtmlPath, 'utf-8');
    let serverSsr = '';

    // Inject blog post OG meta (everyone) + full content (crawlers)
    if (blogMatch && !previewMatch) {
      const post = await getBlogPageData(blogMatch[1]);
      if (post) {
        html = replaceMeta(html, post);
        if (isCrawler) {
          serverSsr = buildBlogPostSsr(post);
          html = html.replace('</head>', buildBlogPostHeadSchema(post) + '\n</head>');
        }
      }
    } else if (isBlogList && isCrawler) {
      serverSsr = await buildBlogListSsr();
    } else if (isCrawler && !adminMatch && !previewMatch) {
      serverSsr = buildStaticSsr(req.path);
    }

    if (serverSsr) {
      html = html.replace('<div id="root"></div>', `<div id="root">${serverSsr}</div>`);
      html = html.replace('</head>', `<style>${SSRCSS}</style>\n</head>`);
    }

    const code = await getCustomHeadCode();
    if (code) {
      html = html.replace('</head>', code + '\n</head>');
    }
    res.type('html').send(html);
  } catch {
    res.sendFile(indexHtmlPath);
  }
});

async function seedAdmin() {
  const existing = await AdminUser.findOne();
  if (!existing) {
    const email = process.env.ADMIN_EMAIL || 'admin@serpely.com';
    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
      console.error('FATAL: ADMIN_PASSWORD env var not set — cannot seed admin user');
      process.exit(1);
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await AdminUser.create({ email, passwordHash });
    console.log(`Admin user created: ${email}`);
  }
}

mongoose
  .connect(process.env.MONGO_URI || '', { family: 4 })
  .then(async () => {
    console.log('MongoDB connected');
    await seedAdmin();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
