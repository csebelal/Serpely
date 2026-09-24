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
import publicAuditRouter from './routes/publicAudit';
import AdminUser from './models/AdminUser';
import SiteSettings from './models/SiteSettings';
import BlogPost from './models/BlogPost';
import { getIndexNowKey } from './lib/searchEngines';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4000;

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'script-src': [
        "'self'",
        "'unsafe-inline'",
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
        'https://www.googleadservices.com',
        'https://googleads.g.doubleclick.net',
      ],
      'connect-src': [
        "'self'",
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
        'https://stats.g.doubleclick.net',
        'https://*.google-analytics.com',
      ],
      'img-src': ["'self'", 'data:', 'https:'],
      'frame-src': ["'self'", 'https://www.googletagmanager.com', 'https://www.youtube.com'],
      'style-src': ["'self'", "'unsafe-inline'", 'https:', 'data:'],
      'font-src': ["'self'", 'https:', 'data:'],
      'script-src-attr': ["'unsafe-inline'"],
    },
  },
}));
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
app.use('/api/public-audit', publicAuditRouter);

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
// Serve built frontend assets directly (nginx also serves /assets/, this covers local/docker)
app.use(express.static(frontendDist, { index: false, maxAge: '1y', immutable: true }));

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
    : `${origin}/og-image.png`;

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
  if (!/og:image:alt/.test(html)) {
    html = html.replace(/<meta property="og:image"[^>]*>/, `$&\n    <meta property="og:image:alt" content="${og.title.replace(/"/g, '&quot;')}" />`);
  }
  if (!/twitter:image:alt/.test(html)) {
    html = html.replace(/<meta name="twitter:image"[^>]*>/, `$&\n    <meta name="twitter:image:alt" content="${og.title.replace(/"/g, '&quot;')}" />`);
  }

  // Replace Twitter tags
  html = html.replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${og.title.replace(/"/g, '&quot;')}"`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${og.excerpt.replace(/"/g, '&quot;')}"`);
  html = html.replace(/<meta name="twitter:image" content="[^"]*"/, `<meta name="twitter:image" content="${image}"`);

  // Replace canonical
  html = html.replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${url}"`);

  return html;
}

function replaceStaticMeta(html: string, path: string, content: { title: string; desc?: string; blocks: { h: string; p: string }[] }): string {
  const origin = 'https://serpely.com';
  const url = `${origin}${path === '/' ? '' : path}`;
  const desc = content.desc || content.blocks[0]?.p || '';
  const title = content.title.replace(/"/g, '&quot;');
  const safeDesc = escapeHtml(desc).slice(0, 160);

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${safeDesc}"`);
  html = html.replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${title}"`);
  html = html.replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${safeDesc}"`);
  html = html.replace(/<meta property="og:type" content="[^"]*"/, `<meta property="og:type" content="website"`);
  html = html.replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${url}"`);
  if (!/og:locale/.test(html)) {
    html = html.replace(/<meta property="og:url"[^>]*>/, `$&\n    <meta property="og:locale" content="en_US" />`);
  }
  if (!/og:image:alt/.test(html)) {
    html = html.replace(/<meta property="og:image"[^>]*>/, `$&\n    <meta property="og:image:alt" content="${title}" />`);
  }
  html = html.replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${title}"`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${safeDesc}"`);
  if (!/twitter:site/.test(html)) {
    html = html.replace(/<meta name="twitter:card"[^>]*>/, `$&\n    <meta name="twitter:site" content="@serpely" />`);
  }
  html = html.replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${url}"`);
  return html;
}

// ─── Server-rendered content blocks for crawlers ─────────────────────
const STATIC_SEO_CONTENT: Record<string, { title: string; desc?: string; blocks: { h: string; p: string }[] }> = {
  '/': {
    title: 'Serpely — Agentic SEO for the AI-First Web | GEO & AI Citation Tracking',
    desc: 'Serpely is an agentic SEO platform for the AI-first web. Track GEO score, AI citations across ChatGPT, Perplexity & Google AI Overviews with daily audits. Start free.',
    blocks: [
      { h: 'Agentic SEO, built for the AI-first web', p: 'A daily AI audit that tracks whether you are cited across ChatGPT, Perplexity, and Google AI Overviews, and tells you exactly what to fix next. Start your free trial now.' },
      { h: 'Track AI citations across every answer engine', p: 'See exactly where your brand appears in ChatGPT, Claude, Gemini, Google AI Mode, and Perplexity. Know when you are cited, when you are missing, and how to close the gap.' },
      { h: 'Daily AI audits and citation monitoring', p: 'Every page is scored 0–100 for AI visibility and citation eligibility. Continuous tracking, content gap analysis, and prioritized fix queues.' },
      { h: 'GEO and agentic SEO made simple', p: 'Agentic SEO platform built for the AI-first web. Dashboard analytics, AI audits, E-E-A-T signals, and technical SEO all in one platform.' },
    ],
  },
  '/features': {
    title: 'AI SEO Features: GEO Score, Citation Tracking & Site Audit | Serpely',
    desc: 'Explore Serpely features: GEO scoring, AI citation monitoring for ChatGPT & Perplexity, rank tracking, technical audits, keyword research and white-label reports.',
    blocks: [
      { h: 'Rank higher in AI search', p: 'Track keyword rankings across Google and AI-driven search result engines including LLM answer engines. Real-time visibility shifts with intelligent alerts.' },
      { h: 'AI citation tracking', p: 'Monitor whether ChatGPT, Claude, Gemini, Perplexity, and Google AI Overviews cite your content, and see exactly where your brand appears.' },
      { h: 'Technical site audit', p: 'Continuously audit Core Web Vitals, crawl issues, indexing gaps, and schema errors, and prioritize fixes that directly impact AI visibility.' },
      { h: 'Content gaps and topic clusters', p: 'Discover missed opportunities with topic clusters, E-E-A-T signal tracking, and SERP intent analysis powered by agentic SEO.' },
    ],
  },
  '/pricing': {
    title: 'Pricing: Free AI SEO Plan to $99 Agency Plan | Serpely',
    desc: 'Serpely pricing starts free. Professional $49/mo, Business $99/mo with GEO dashboard, AI citation monitor, API access and white-label reports. 14-day free trial.',
    blocks: [
      { h: 'The right plan for every team', p: 'All plans include a 14-day free trial with no credit card required. Choose monthly or annual billing and scale as you grow.' },
      { h: 'AI visibility monitoring for every budget', p: 'Track citations in ChatGPT, Perplexity, and Google AI Overviews, run daily AI audits, and get everything you need for agentic SEO.' },
    ],
  },
  '/how-it-works': {
    title: 'How Agentic SEO Works in 4 Steps: Audit, Score, Fix, Track | Serpely',
    desc: 'See how Serpely automates SEO: daily site audit, GEO 0-100 scoring, AI citation tracking and prioritized fixes for ChatGPT, Perplexity and Google AI Overviews.',
    blocks: [
      { h: 'Agentic SEO in 4 simple steps', p: 'Discover how Serpely transforms your SEO workflow from manual effort to automated growth with an AI-powered continuous audit loop.' },
      { h: 'From audit to action automatically', p: 'Serpely audits your site daily, scores every page for AI visibility and citation eligibility, and tells you exactly what to fix next.' },
    ],
  },
  '/product-tour': {
    title: 'Product Tour: Dashboard, Audits & AI Citation Monitor | Serpely',
    desc: 'Take a tour of Serpely: SEO dashboard, daily AI audits, keyword tracking, backlink monitor and WordPress/Webflow one-click integration. No code required.',
    blocks: [
      { h: 'See Serpely in action', p: 'A full walkthrough of the agentic SEO platform: dashboard, AI audits, rank tracking, citation monitoring, and technical SEO tools.' },
      { h: 'One-click CMS integration', p: 'Connect WordPress, Webflow, and more with automatic setup, sitemap detection, and no coding required.' },
    ],
  },
  '/integrations': {
    title: 'Integrations: WordPress, GSC, GA4, Ahrefs, Semrush | Serpely',
    desc: 'Connect Serpely with WordPress, Webflow, Google Search Console, GA4, Ahrefs and Semrush. Sync GEO, rank and citation data into your reporting stack.',
    blocks: [
      { h: 'Works with your entire SEO stack', p: 'Connect Serpely with WordPress, Webflow, Google Search Console, GA4, Ahrefs, Semrush, and the tools your marketing team already uses.' },
      { h: 'Get AI visibility data everywhere', p: 'Pull citation and rank data into your dashboards and reporting workflows across all major channels.' },
    ],
  },
  '/about': {
    title: 'About Serpely: Agentic SEO for AI Search Visibility',
    desc: 'Serpely by CieloOps builds agentic SEO for the AI-first web — helping brands get cited by ChatGPT, Perplexity, Gemini and Google AI Overviews.',
    blocks: [
      { h: 'Building the future of organic search', p: 'Serpely is an agentic SEO platform built for the AI-first web, helping brands stay visible as search shifts to AI answer engines.' },
      { h: 'Our mission', p: 'Give every brand real-time clarity on where they appear in AI search, and the tools to win those citations.' },
    ],
  },
  '/faq': {
    title: 'FAQ: GEO, AI Citations, Pricing & Semrush Alternatives | Serpely',
    desc: 'FAQ about Serpely: GEO scoring, AI citation tracking for ChatGPT & Perplexity, daily audits, pricing, free trial and differences vs Semrush/Ahrefs.',
    blocks: [
      { h: 'Frequently asked questions', p: 'Answers about AI search visibility, daily audits, citation tracking across ChatGPT, Perplexity, and Google AI Overviews, and how Serpely compares to traditional SEO tools.' },
      { h: 'How is Serpely different from Semrush or Ahrefs?', p: 'Semrush and Ahrefs are data libraries. Serpely is a continuous workflow that audits daily, scores every page for AI visibility, monitors citations, and tells you exactly what to fix next.' },
    ],
  },
  '/contact': {
    title: 'Contact Serpely: Demo, Support & Sales',
    desc: 'Contact Serpely for an AI visibility demo, support or sales. Get help with GEO tracking, audits and agentic SEO setup.',
    blocks: [
      { h: 'Get in touch', p: 'Contact the Serpely team about AI search visibility, agentic SEO, or a demo of the platform.' },
    ],
  },
  '/changelog': {
    title: 'Changelog: New GEO & AI Search Features | Serpely',
    desc: 'Follow Serpely product updates: GEO scoring, AI citation monitor, audits, rank tracking and reporting improvements.',
    blocks: [
      { h: 'Product updates and changelog', p: 'Track the latest Serpely features, improvements, and fixes as we ship the agentic SEO platform.' },
    ],
  },
  '/compare': {
    title: 'Compare Serpely vs Semrush, Ahrefs, Moz & Surfer for AI Search',
    desc: 'Compare Serpely vs Semrush, Ahrefs, Moz, SE Ranking, Surfer SEO and more. Only Serpely adds GEO scoring, AI citation monitoring and agentic workflows.',
    blocks: [
      { h: 'Serpely vs the competition', p: 'Compare Serpely against Semrush, Ahrefs, Moz, SE Ranking, Surfer SEO, and other SEO tools for the AI-first web.' },
      { h: 'Made for AI visibility, not just keywords', p: 'Only Serpely tracks your presence inside ChatGPT, Perplexity, Gemini, and Google AI Overviews with daily AI audits.' },
    ],
  },
  '/audit': {
    title: 'Free SEO & AI Visibility Audit: GEO, Core Web Vitals & Schema',
    desc: 'Run a free SEO and AI visibility audit. Check technical SEO, Core Web Vitals, schema, mobile and ChatGPT/Perplexity citation readiness in seconds.',
    blocks: [
      { h: 'Get discovered wherever people search', p: 'Enter any website for an instant Technical SEO, Core Web Vitals, Security, Mobile and AI Visibility audit with a prioritized fix plan.' },
      { h: 'From URL to action plan in seconds', p: 'Every audit scores 5 categories, forecasts score after quick wins, and shows exactly what to fix for ChatGPT, Perplexity and Google AI Overviews.' },
    ],
  },
  '/compare/semrush': {
    title: 'Serpely vs Semrush — AI-First SEO vs Traditional SEO',
    blocks: [
      { h: 'Serpely vs Semrush', p: 'Semrush is the industry standard for traditional SEO. Serpely is built for what comes next — AI-driven search where ChatGPT and Perplexity decide who gets cited.' },
      { h: 'Semrush was built for Google\'s 10 blue links', p: 'AI Overviews now appear in 45% of searches. ChatGPT and Perplexity answer millions of queries daily. Semrush has no tools to track or improve your visibility in these new AI-powered answer engines.' },
      { h: '6× the price, 0× the AI visibility', p: 'Semrush starts at $119/month. Serpely starts free. For teams that need both traditional SEO and AI search visibility, Serpely costs a fraction of the price without sacrificing coverage.' },
      { h: 'Agentic vs manual', p: "Semrush tells you what's wrong. Serpely's AI agents actively fix it. The platform runs autonomous SEO workflows — no manual prioritization, no guesswork about what to do next." },
    ],
  },
  '/compare/ahrefs': {
    title: 'Serpely vs Ahrefs — AI-Powered SEO vs Backlink Intelligence',
    blocks: [
      { h: 'Serpely vs Ahrefs', p: 'Ahrefs is the gold standard for backlink intelligence and content research. But backlinks don\'t get you cited by ChatGPT — content structure, authority signals, and GEO optimization do.' },
      { h: 'Ahrefs optimizes for link graphs. AI search works differently', p: 'AI systems like Perplexity and ChatGPT select sources based on content structure, E-E-A-T signals, and entity clarity — not just backlinks. Ahrefs has no tools for the signals that actually drive AI citations.' },
      { h: 'No free plan, higher entry point', p: 'Ahrefs starts at $99/month with no free option. Serpely is free to start and covers AI visibility from day one.' },
      { h: 'Manual SEO vs agentic SEO', p: 'Ahrefs surfaces data and leaves action to you. Serpely\'s agentic AI actively prioritizes and implements SEO improvements.' },
    ],
  },
  '/compare/moz': {
    title: 'Serpely vs Moz — AI-First SEO vs Traditional SEO Platform',
    blocks: [
      { h: 'Serpely vs Moz', p: 'Moz invented Domain Authority and has shaped SEO thinking for over a decade. But Domain Authority doesn\'t predict whether ChatGPT will cite you — and that\'s what Serpely was built to measure.' },
      { h: 'Domain Authority measures link graphs. AI search measures content quality', p: 'AI search systems evaluate content structure, expertise signals, and factual accuracy. Serpely\'s GEO Score measures the actual signals that drive AI citations — something DA was never designed to do.' },
      { h: 'No free plan, no AI visibility, higher price', p: 'Moz starts at $99/month with no free option and no AI search visibility features. Serpely starts free, covers traditional SEO, and adds GEO Scoring and AI Citation Monitoring.' },
      { h: 'Serpely includes white-label reports. Moz doesn\'t', p: "Serpely's Business plan ($99/month) includes full white-label client dashboards and automated reports." },
    ],
  },
  '/compare/se-ranking': {
    title: 'Serpely vs SE Ranking — AI-First SEO vs All-in-One SEO Platform',
    blocks: [
      { h: 'Serpely vs SE Ranking', p: 'SE Ranking covers the traditional SEO bases at a competitive price. Serpely covers the same ground plus the AI search layer that\'s reshaping how brands get discovered.' },
      { h: 'SE Ranking covers Google. Serpely covers Google + AI search', p: 'SE Ranking has no tools for the fastest-growing search channel: AI engines. Serpely\'s GEO Score and AI Citation Monitor give you visibility SE Ranking cannot provide.' },
      { h: 'Agentic AI vs manual workflows', p: 'Serpely acts on data through agentic AI workflows that autonomously prioritize and execute SEO improvements — saving teams 5-10 hours per week.' },
      { h: 'Better AI-era content prioritization', p: 'Serpely\'s content prioritization engine scores pages by traffic decay, GEO visibility, and keyword movement to give you a ranked action queue.' },
    ],
  },
  '/compare/surfer-seo': {
    title: 'Serpely vs Surfer SEO — Agentic SEO vs Content Optimizer',
    blocks: [
      { h: 'Serpely vs Surfer SEO', p: 'Surfer SEO is one of the most popular content optimization tools for Google. But optimizing for Google\'s NLP algorithm is different from getting cited by ChatGPT and Perplexity — and only Serpely does the latter.' },
      { h: 'Surfer optimizes for Google\'s algorithm. AI search has different rules', p: 'Getting cited by ChatGPT and Perplexity depends on content structure, authority signals, and E-E-A-T — factors Serpely\'s GEO Score measures directly.' },
      { h: 'Content optimization without rank tracking is incomplete', p: 'Serpely closes the loop: create, track, measure AI citations, reprioritize — the full content performance cycle in one platform.' },
      { h: 'Higher price, narrower scope', p: 'Surfer SEO starts at $69/month and focuses solely on content optimization. Serpely starts free and covers rank tracking, technical audits, and AI visibility.' },
    ],
  },
  '/compare/serpstat': {
    title: 'Serpely vs SERPStat — AI-First SEO vs Traditional SEO Platform',
    blocks: [
      { h: 'Serpely vs SERPStat', p: 'SERPStat is a full-featured SEO platform with strong keyword and competitor intelligence. Serpely covers the same traditional SEO bases while adding the AI search visibility layer SERPStat doesn\'t have.' },
      { h: 'Same traditional SEO features, plus AI visibility', p: 'Serpely adds GEO Scoring and AI Citation Monitoring — the layer SERPStat has no equivalent for.' },
      { h: 'Agentic workflows vs manual analysis', p: 'Serpely\'s AI agents act on the data — running autonomous SEO workflows that surface the right fixes without digging through reports manually.' },
      { h: 'Free to start, scales affordably', p: 'SERPStat starts at $69/month with no free option. Serpely starts free and scales to agency-level features at $99/month.' },
    ],
  },
  '/compare/nightwatch': {
    title: 'Serpely vs Nightwatch — Full Agentic SEO vs Rank Tracker',
    blocks: [
      { h: 'Serpely vs Nightwatch', p: 'Nightwatch does rank tracking well. But in 2026, knowing where you rank in Google is only half the picture — you also need to know whether AI engines are citing you at all.' },
      { h: 'Rank tracking is necessary but not sufficient', p: 'Serpely shows your Google rankings AND your AI search visibility — GEO Score, citations across ChatGPT/Perplexity/Gemini, and hallucination alerts.' },
      { h: 'Serpely is a full SEO platform', p: 'Nightwatch focuses on rank tracking. Serpely includes technical audits, backlink monitoring, content prioritization, and agentic AI workflows.' },
      { h: 'Same agency features, lower price', p: 'Serpely\'s Business plan at $99/month includes unlimited sites, white-label reports, AND full AI visibility coverage.' },
    ],
  },
  '/compare/rankability': {
    title: 'Serpely vs Rankability — Agentic SEO vs Content Optimizer',
    desc: 'Compare Serpely and Rankability. Rankability scores content for Google. Serpely adds rank tracking, audits, GEO scoring and AI citation monitoring.',
    blocks: [
      { h: 'Serpely vs Rankability', p: 'Rankability helps you optimize content for Google rankings. Serpely helps you rank in Google AND get cited by ChatGPT, Perplexity, and Gemini.' },
      { h: 'Content optimization is one piece of the SEO puzzle', p: 'Serpely does content optimization AND tracks your rankings, monitors backlinks, runs daily technical audits, and measures your AI citation visibility.' },
      { h: 'AI content scoring ≠ AI search visibility', p: 'Serpely\'s GEO Score measures actual AI visibility, not just on-page optimization signals.' },
      { h: 'No rank tracking in Rankability', p: 'Serpely closes the loop — it measures whether optimizations actually moved rankings and AI citations.' },
    ],
  },
  '/compare/frase': {
    title: 'Serpely vs Frase — Full SEO Platform vs AI Content Briefs',
    desc: 'Compare Serpely and Frase. Frase builds content briefs for Google. Serpely adds rank tracking, technical audits, GEO scoring and ChatGPT citation monitoring.',
    blocks: [
      { h: 'Serpely vs Frase', p: 'Frase is strong for AI content briefs and SERP research. Serpely covers the full SEO loop plus AI search visibility that Frase does not track.' },
      { h: 'Briefs without tracking leave ROI unproven', p: 'Frase helps you write. Serpely proves it worked — with rank tracking, GEO scores and AI citation monitoring across ChatGPT, Perplexity and Gemini.' },
      { h: 'One platform instead of two tools', p: 'Serpely starts free and includes audits, backlinks, keyword research and white-label reports alongside AI visibility.' },
    ],
  },
  '/compare/clearscope': {
    title: 'Serpely vs Clearscope — Agentic SEO vs Content Grading',
    desc: 'Compare Serpely and Clearscope. Clearscope grades content for Google NLP. Serpely adds audits, rank tracking, GEO scoring and AI citation visibility.',
    blocks: [
      { h: 'Serpely vs Clearscope', p: 'Clearscope optimizes individual pages for Google relevance. Serpely optimizes your whole site for Google and AI answer engines.' },
      { h: 'Content grade is not a citation guarantee', p: 'ChatGPT and Perplexity cite well-structured, authoritative content. Serpely GEO Score measures exactly those signals.' },
      { h: 'Broader coverage at lower cost', p: 'Clearscope starts at $189/month for content only. Serpely starts free with tracking, audits, backlinks and AI monitoring.' },
    ],
  },
  '/compare/marketmuse': {
    title: 'Serpely vs MarketMuse — Agile SEO vs Enterprise Content Planning',
    desc: 'Compare Serpely and MarketMuse. MarketMuse plans enterprise content. Serpely executes daily SEO with audits, tracking, GEO scoring and AI citations.',
    blocks: [
      { h: 'Serpely vs MarketMuse', p: 'MarketMuse excels at large-scale content inventory and planning. Serpely turns plans into daily action with audits and prioritized fixes.' },
      { h: 'Planning needs measurement', p: 'Serpely tracks rankings and AI citations so content investments show ROI in Google and AI answers.' },
      { h: 'Accessible without enterprise contracts', p: 'Serpely starts free and scales to $99/month agency plans with white-label reporting included.' },
    ],
  },
  '/compare/seobility': {
    title: 'Serpely vs Seobility — AI-First SEO vs Site Audit Suite',
    desc: 'Compare Serpely and Seobility. Both audit technical SEO. Serpely adds GEO scoring, AI citation monitoring and agentic workflows for AI search.',
    blocks: [
      { h: 'Serpely vs Seobility', p: 'Seobility is a solid technical audit and rank tracker. Serpely adds the AI search layer Seobility lacks.' },
      { h: 'Audits should improve AI citations', p: 'Serpely prioritizes fixes by GEO impact, not just technical severity — so work moves both rankings and citations.' },
      { h: 'Free to start', p: 'Serpely free plan includes GEO scoring and weekly audits. Paid plans add daily tracking and API access.' },
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
    : `${origin}/og-image.png`;

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
        logo: { '@type': 'ImageObject', url: `${origin}/og-image.png` },
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

function buildStaticHeadSchema(path: string): string {
  const origin = 'https://serpely.com';
  const content = STATIC_SEO_CONTENT[path];
  if (!content) return '';
  const url = `${origin}${path === '/' ? '' : path}`;
  const desc = content.desc || content.blocks[0]?.p || '';
  const logo = `${origin}/og-image.png`;
  const schemas: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Serpely',
      url: origin,
      logo,
      sameAs: ['https://twitter.com/serpely', 'https://linkedin.com/company/serpely'],
      contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', url: `${origin}/contact` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Serpely',
      url: origin,
      potentialAction: { '@type': 'SearchAction', target: `${origin}/blog?q={query}`, 'query-input': 'required name=query' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: origin },
        ...(path === '/' ? [] : [{ '@type': 'ListItem', position: 2, name: content.title.split('—')[0].split('|')[0].trim(), item: url }]),
      ],
    },
  ];

  if (path === '/') {
    schemas.push(
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Serpely',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: origin,
        description: desc,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Free trial available' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: content.title,
        url,
        description: desc,
        speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', 'h2'] },
      },
    );
  }

  if (path === '/faq') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: content.blocks.map(b => ({
        '@type': 'Question',
        name: b.h,
        acceptedAnswer: { '@type': 'Answer', text: b.p },
      })),
    });
  }

  if (path === '/how-it-works') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: content.title,
      description: desc,
      step: content.blocks.map(b => ({ '@type': 'HowToStep', name: b.h, text: b.p })),
    });
  }

  if (path.startsWith('/compare/')) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: content.title,
      description: desc,
      author: { '@type': 'Organization', name: 'Serpely' },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    });
  }

  return schemas.map(s => `<script type="application/ld+json">${JSON.stringify(s).replace(/</g, '\\u003c')}</script>`).join('\n');
}

const CRAWLER_RE = /googlebot|bingbot|duckduckbot|baiduspider|yandexbot|yandex|slurp|petalbot|semrushbot|ahrefsbot|majestic|rogerbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|gptbot|chatgpt-user|perplexitybot|claudebot|anthropic-ai|google-extended|ccbot|bingpreview|embedly|quora|pinterest|buffer|tumblr|isindex|gtmetrix|pingdom|screaming frog|sitebulb|google-sites-verification|googleinspectiontool/i;

// Real HTTP 404 page for genuinely-missing blog slugs (prevents Google soft-404 verdicts)
const NOT_FOUND_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>404 — Page Not Found | Serpely</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #e5e7eb; display: flex; align-items: center; justify-content: center; min-height: 80vh; margin: 0; padding: 24px; text-align: center; }
      .wrap { max-width: 480px; }
      h1 { font-size: 72px; margin: 0; color: #6366f1; }
      p { font-size: 18px; line-height: 1.6; color: #9ca3af; }
      a { display: inline-block; margin-top: 24px; color: #fff; background: #6366f1; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>404</h1>
      <p>This page doesn't exist or was removed.</p>
      <a href="/">Back to Serpely</a>
    </div>
  </body>
</html>
`;

app.use(async (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path.startsWith('/api/')) return next();
  if (req.path.startsWith('/uploads/')) return next();
  // Let static files (js/css/img/manifest/robots) pass through to express.static / nginx
  if (/\.[a-z0-9]+$/i.test(req.path)) return next();

  // Normalize trailing slash: /features/ -> /features (except root)
  const normPath = req.path.length > 1 ? req.path.replace(/\/+$/, '') : req.path;
  if (normPath !== req.path) {
    res.redirect(301, normPath);
    return;
  }

  const previewMatch = normPath.startsWith('/blog/preview/');
  const adminMatch = normPath.startsWith('/sp-super-admin');
  const blogMatch = normPath.match(/^\/blog\/([a-z0-9-]+)$/);
  const isBlogList = normPath === '/blog';
  const isCrawler = CRAWLER_RE.test(req.headers['user-agent'] || '');
  const AUTH_PAGES = new Set(['/login', '/register', '/profile']);

  try {
    let html = fs.readFileSync(indexHtmlPath, 'utf-8');
    let serverSsr = '';

    // Inject blog post OG meta + schema (everyone) + full content (crawlers/social)
    if (blogMatch && !previewMatch) {
      const post = await getBlogPageData(blogMatch[1]);
      if (post) {
        html = replaceMeta(html, post);
        html = html.replace('</head>', buildBlogPostHeadSchema(post) + '\n</head>');
        if (isCrawler) {
          serverSsr = buildBlogPostSsr(post);
        }
      } else {
        // Genuinely-missing slug → real 404, not soft-404 (avoids Google "soft 404" verdict)
        res.status(404).type('html').send(NOT_FOUND_HTML);
        return;
      }
    } else if (isBlogList) {
      html = replaceStaticMeta(html, '/blog', {
        title: 'Serpely Blog — AI Search, GEO & LLM Visibility Insights',
        desc: 'Latest guides on AI search visibility, GEO scoring, ChatGPT/Perplexity citation tracking and agentic SEO workflows.',
        blocks: [{ h: 'Serpely Blog', p: 'Latest articles about AI search visibility, citation tracking, and agentic SEO.' }],
      });
      if (isCrawler) {
        serverSsr = await buildBlogListSsr();
      }
    } else if (!adminMatch && !previewMatch) {
      // Static pages: inject per-route canonical + OG + JSON-LD for everyone, SSR content for crawlers
      const staticContent = STATIC_SEO_CONTENT[normPath];
      if (staticContent) {
        html = replaceStaticMeta(html, normPath, staticContent);
        html = html.replace('</head>', buildStaticHeadSchema(normPath) + '\n</head>');
        if (isCrawler) {
          serverSsr = buildStaticSsr(normPath);
        }
      } else if (AUTH_PAGES.has(normPath)) {
        // Auth pages exist but must never index
        html = html.replace(/<meta name="robots" content="[^"]*"/, '<meta name="robots" content="noindex,nofollow"');
      } else if (normPath.startsWith('/blog/category/')) {
        const cat = normPath.split('/')[3] || '';
        const KNOWN_CATS = new Set(['geo-aeo', 'agentic-seo', 'ai-seo-tools', 'technical-seo', 'keyword-strategy', 'llm-seo', 'reporting', 'case-studies', 'product-updates']);
        if (!KNOWN_CATS.has(cat)) {
          res.status(404).type('html').send(NOT_FOUND_HTML);
          return;
        }
        html = replaceStaticMeta(html, '/blog', {
          title: `Serpely Blog: ${cat} guides — GEO & AI Search`,
          desc: `Latest ${cat} articles on GEO scoring, AI citation tracking and agentic SEO workflows.`,
          blocks: [{ h: 'Serpely Blog', p: 'Latest articles about AI search visibility, citation tracking, and agentic SEO.' }],
        });
        html = html.replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="https://serpely.com${normPath}"`);
        if (isCrawler) serverSsr = await buildBlogListSsr();
      } else if (normPath.startsWith('/author/')) {
        const authorSlug = normPath.split('/')[2] || '';
        if (!/^[a-z0-9-]+$/.test(authorSlug)) {
          res.status(404).type('html').send(NOT_FOUND_HTML);
          return;
        }
        const authorName = authorSlug.replace(/-/g, ' ');
        html = replaceStaticMeta(html, '/blog', {
          title: `Articles by ${authorName} | Serpely Blog`,
          desc: `Read SEO and GEO articles by ${authorName} on Serpely blog: AI visibility, citations and agentic SEO.`,
          blocks: [{ h: 'Serpely Blog', p: 'Latest articles about AI search visibility, citation tracking, and agentic SEO.' }],
        });
        html = html.replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="https://serpely.com${normPath}"`);
        if (isCrawler) serverSsr = await buildBlogListSsr();
      } else if (normPath.startsWith('/compare/') || normPath.startsWith('/blog/')) {
        // Unknown compare/author/category slug -> real 404 (frontend would redirect, avoid soft-404)
        res.status(404).type('html').send(NOT_FOUND_HTML);
        return;
      } else {
        // Truly unknown route -> real 404 instead of SPA 200 soft-404
        res.status(404).type('html').send(NOT_FOUND_HTML);
        return;
      }
    } else if (adminMatch || previewMatch) {
      html = html.replace(/<meta name="robots" content="[^"]*"/, '<meta name="robots" content="noindex,nofollow"');
    }

    if (serverSsr) {
      // Inject SSR article OUTSIDE #root so React's createRoot(…).render() never wipes it
      // (Googlebot + renderers see the content even if client-side JS fails to hydrate)
      html = html.replace('<div id="root"></div>', `<div id="root"></div>\n${serverSsr}`);
      html = html.replace('</head>', `<style>${SSRCSS}</style>\n</head>`);
    }

    const code = await getCustomHeadCode();
    if (code) {
      html = html.replace('</head>', code + '\n</head>');
    }
    res.setHeader('Link', '<https://serpely.com/llms.txt>; rel="alternate"; type="text/plain"; title="LLM docs"');
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
