import { IAuditIssue, AuditCategory, AuditSeverity } from '../models/AuditReport';
import { PsiResult, buildPsiIssues } from './pagespeed';

export interface FetchedPage {
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  html: string;
  loadMs: number;
}

export function normalizeUrl(input: string): string {
  let u = (input || '').trim().toLowerCase();
  if (!u) throw new Error('Enter a website URL');
  if (!/^https?:\/\//.test(u)) u = 'https://' + u;
  const parsed = new URL(u);
  if (!/^https?:$/.test(parsed.protocol)) throw new Error('Only http(s) URLs allowed');
  // Block private / local targets (no SSRF from audit form)
  const host = parsed.hostname;
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    host.startsWith('172.16.') ||
    host === '127.0.0.1' ||
    host === '0.0.0.0'
  ) {
    throw new Error('Local / private URLs are not allowed');
  }
  parsed.hash = '';
  return parsed.toString();
}

async function fetchText(url: string, timeoutMs = 9000): Promise<{ text: string; status: number; headers: Record<string, string> } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'SerpelyAuditBot/1.0 (+https://serpely.com/audit)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    const text = await res.text().catch(() => '');
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    return { text, status: res.status, headers };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchPage(url: string): Promise<FetchedPage> {
  const start = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'SerpelyAuditBot/1.0 (+https://serpely.com/audit)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    const html = await res.text().catch(() => '');
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    return { finalUrl: res.url || url, status: res.status, headers, html: html.slice(0, 1_500_000), loadMs: Date.now() - start };
  } finally {
    clearTimeout(t);
  }
}

// ── Tiny HTML helpers (no extra deps: regex-based, static HTML only) ──
function first(regex: RegExp, html: string): string {
  const m = html.match(regex);
  return (m?.[1] || '').trim();
}
function all(regex: RegExp, html: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const r = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  while ((m = r.exec(html)) !== null) out.push(m[1] ?? m[0]);
  return out;
}
function metaContent(html: string, attr: string, name: string): string {
  const r1 = new RegExp(`<meta[^>]*${attr}="${name}"[^>]*content="([^"]*)"`, 'i');
  const r2 = new RegExp(`<meta[^>]*content="([^"]*)"[^>]*${attr}="${name}"`, 'i');
  return first(r1, html) || first(r2, html);
}

export interface AuditInput {
  page: FetchedPage;
  origin: string;
}

function issue(
  code: string, category: AuditCategory, severity: AuditSeverity,
  title: string, evidence: string, fix: string,
  impact: number, effort: 'quick' | 'normal', passed: boolean,
): IAuditIssue {
  return { code, category, severity, title, evidence, fix, impact: passed ? 0 : impact, effort, passed };
}

export async function runChecks(page: FetchedPage, normalizedUrl: string, psi?: PsiResult | null | Promise<PsiResult | null>): Promise<{ issues: IAuditIssue[]; meta: Record<string, string> }> {
  const html = page.html || '';
  const lower = html.toLowerCase();
  const origin = new URL(normalizedUrl).origin;
  const issues: IAuditIssue[] = [];
  const meta: Record<string, string> = {};

  const title = first(/<title[^>]*>([^<]*)<\/title>/i, html);
  const h1s = all(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, html).map(s => s.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
  const desc = metaContent(html, 'name', 'description');
  const robots = metaContent(html, 'name', 'robots');
  const canonical = first(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i, html);
  const viewport = metaContent(html, 'name', 'viewport');
  const ogTitle = metaContent(html, 'property', 'og:title');
  const ogDesc = metaContent(html, 'property', 'og:description');
  const ogImage = metaContent(html, 'property', 'og:image');
  const twCard = metaContent(html, 'name', 'twitter:card') || metaContent(html, 'property', 'twitter:card');
  const twImage = metaContent(html, 'name', 'twitter:image');
  const lang = first(/<html[^>]*lang="([^"]*)"/i, html);
  const imgs = all(/<img[^>]*>/gi, html);
  const imgsNoAlt = imgs.filter(t => !/alt=/i.test(t)).length;
  const jsonLdBlocks = all(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi, html);
  const jsonLd = jsonLdBlocks.join(' ');
  const has = (t: string) => jsonLd.includes(t) || lower.includes(t);

  meta.title = title; meta.description = desc; meta.h1 = h1s[0] || '';

  // ── Technical SEO ──
  issues.push(issue('title-present', 'Technical SEO', 'critical', 'Title tag present',
    title ? `Found: "${title.slice(0, 80)}"` : 'No <title> in static HTML',
    'Add a unique <title> 50–60 chars with primary keyword first.', 8, 'quick', !!title));
  issues.push(issue('title-length', 'Technical SEO', 'medium', 'Title length 50–60 chars',
    `Length: ${title.length}`, 'Keep title 50–60 chars so it is not truncated in SERPs.', 3, 'quick', title.length >= 30 && title.length <= 65));
  issues.push(issue('meta-description', 'Technical SEO', 'high', 'Meta description present (120–160 chars)',
    desc ? `Length: ${desc.length}` : 'Missing meta description',
    'Add a unique meta description 150–160 chars with value prop + CTA.', 5, 'quick', desc.length >= 80 && desc.length <= 170));
  issues.push(issue('h1-one', 'Technical SEO', 'high', 'Single H1 in static HTML',
    h1s.length ? `${h1s.length} H1(s), first: "${(h1s[0] || '').slice(0, 80)}"` : 'No <h1> in static HTML (CSR sites fail here)',
    'Server-render one H1 per page containing the primary keyword. See server SSR blocks.', 6, 'normal', h1s.length === 1));
  issues.push(issue('canonical', 'Technical SEO', 'medium', 'Canonical tag present',
    canonical || 'Missing canonical', 'Add self-referencing canonical: <link rel="canonical" href="...">.', 3, 'quick', !!canonical));
  issues.push(issue('robots-indexable', 'Technical SEO', 'critical', 'Page indexable (no noindex)',
    robots || 'index,follow (default)', 'Remove noindex from important pages; keep robots "index,follow".', 8, 'quick', !/noindex/i.test(robots)));
  issues.push(issue('lang-attr', 'Technical SEO', 'low', 'HTML lang attribute',
    lang || 'Missing', 'Add <html lang="en"> for accessibility + i18n signals.', 1, 'quick', !!lang));
  issues.push(issue('img-alt', 'Technical SEO', 'medium', 'Image alt coverage',
    `${imgs.length} imgs, ${imgsNoAlt} missing alt`,
    'Add descriptive alt to every image; use modern formats + lazy loading.', 3, 'normal', imgs.length === 0 || imgsNoAlt === 0));

  // robots.txt + sitemap + machine files (live fetch)
  const [robotsTxt, sitemapXml, llmsTxt] = await Promise.all([
    fetchText(origin + '/robots.txt'),
    fetchText(origin + '/api/sitemap.xml'),
    fetchText(origin + '/llms.txt'),
  ]);
  const robotsBody = robotsTxt?.text || '';
  const aiBots = ['gptbot', 'chatgpt-user', 'perplexitybot', 'claudebot', 'google-extended'];
  const blockedBots = aiBots.filter(b => new RegExp(`user-agent:\\s*${b}[\\s\\S]{0,200}?disallow:\\s*/`, 'i').test(robotsBody));
  issues.push(issue('robots-ai-allow', 'AI Visibility / GEO', 'critical', 'AI crawlers allowed (GPTBot, PerplexityBot, Claude)',
    blockedBots.length ? `Blocked: ${blockedBots.join(', ')}` : 'AI bots allowed or robots.txt absent',
    'Allow GPTBot / ChatGPT-User / PerplexityBot / ClaudeBot / Google-Extended; block only CCBot for training.', 9, 'quick', blockedBots.length === 0));
  issues.push(issue('sitemap', 'Technical SEO', 'medium', 'XML sitemap reachable',
    sitemapXml && /<url/i.test(sitemapXml.text) ? 'Found sitemap with <url> entries' : 'No sitemap at /api/sitemap.xml',
    'Publish /api/sitemap.xml with canonical indexable URLs; reference it in robots.txt.', 3, 'quick', !!(sitemapXml && /<url/i.test(sitemapXml.text))));
  issues.push(issue('llms-txt', 'AI Visibility / GEO', 'medium', 'llms.txt for AI agents',
    llmsTxt && llmsTxt.text.length > 50 ? 'Found llms.txt' : 'Missing llms.txt',
    'Add /llms.txt describing product, audience, key URLs (see llmstxt.org).', 4, 'quick', !!(llmsTxt && llmsTxt.text.length > 50)));

  // ── Security & HTTPS ──
  const isHttps = normalizedUrl.startsWith('https://');
  const hsts = page.headers['strict-transport-security'] || '';
  issues.push(issue('https', 'Security & HTTPS', 'critical', 'HTTPS served',
    isHttps ? 'URL is https' : 'Not https', 'Serve entire site over HTTPS with valid cert + http→https redirect.', 8, 'normal', isHttps));
  issues.push(issue('hsts', 'Security & HTTPS', 'low', 'HSTS header',
    hsts || 'Missing strict-transport-security', 'Add Strict-Transport-Security: max-age=31536000; includeSubDomains.', 1, 'quick', !!hsts));
  issues.push(issue('mixed-content', 'Security & HTTPS', 'medium', 'No mixed content',
    /src="http:\/\//i.test(html) ? 'Found http:// asset on https page' : 'No http:// assets found',
    'Serve all assets over https; fix hardcoded http:// images/scripts.', 3, 'quick', !/src="http:\/\//i.test(html)));

  // ── Mobile ──
  issues.push(issue('viewport', 'Mobile', 'high', 'Viewport meta configured',
    viewport || 'Missing viewport', 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.', 5, 'quick', !!viewport));

  // ── AI Visibility / GEO ──
  issues.push(issue('og-tags', 'AI Visibility / GEO', 'medium', 'Open Graph tags (for AI)',
    ogTitle && ogImage ? 'og:title + og:image present' : `og:title:${!!ogTitle} og:desc:${!!ogDesc} og:image:${!!ogImage}`,
    'Add og:title/description/image + twitter:card summary_large_image on every page.', 3, 'quick', !!(ogTitle && ogImage)));
  issues.push(issue('twitter-card', 'AI Visibility / GEO', 'low', 'Twitter Card',
    twCard || 'Missing', 'Add <meta name="twitter:card" content="summary_large_image"> + image.', 1, 'quick', !!twCard && !!(twImage || ogImage)));
  issues.push(issue('faq-schema', 'AI Visibility / GEO', 'high', 'FAQPage schema',
    has('faqpage') ? 'FAQPage detected' : 'No FAQPage JSON-LD in static HTML',
    'Add FAQPage JSON-LD server-side (JS-injected schema is invisible to static crawlers).', 6, 'normal', has('faqpage')));
  issues.push(issue('org-schema', 'AI Visibility / GEO', 'high', 'Organization schema + sameAs',
    has('organization') ? 'Organization detected' : 'No Organization JSON-LD',
    'Add Organization with logo + sameAs (wikipedia, wikidata, linkedin, x).', 5, 'normal', has('organization')));
  issues.push(issue('article-schema', 'AI Visibility / GEO', 'medium', 'Article / Product / SoftwareApplication schema',
    has('article') || has('softwareapplication') || has('product') ? 'Content schema detected' : 'No Article/Product/SoftwareApplication schema',
    'Add Article on blog, Product/SoftwareApplication with offers + aggregateRating on money pages.', 4, 'normal', has('article') || has('softwareapplication') || has('product')));
  issues.push(issue('breadcrumb-schema', 'AI Visibility / GEO', 'low', 'BreadcrumbList schema',
    has('breadcrumblist') ? 'BreadcrumbList detected' : 'Missing BreadcrumbList',
    'Add BreadcrumbList JSON-LD + visible breadcrumb nav.', 2, 'normal', has('breadcrumblist')));
  issues.push(issue('speakable', 'AI Visibility / GEO', 'low', 'Speakable schema (voice/AI answers)',
    has('speakable') ? 'Speakable detected' : 'Missing SpeakableSpecification',
    'Add SpeakableSpecification pointing at TL;DR + key headings for answer engines.', 2, 'normal', has('speakable')));
  issues.push(issue('faq-html', 'AI Visibility / GEO', 'medium', 'Visible FAQ / TL;DR block (extractable)',
    /faq|frequently asked|tl;dr|key takeaways/i.test(html) ? 'FAQ/TL;DR copy found in HTML' : 'No FAQ or TL;DR block in static HTML',
    'Add a 40–60 word TL;DR + FAQ with H2s phrased as queries; lead each section with the direct answer.', 4, 'normal', /faq|frequently asked|tl;dr|key takeaways/i.test(html)));

  // ── Core Web Vitals: real PSI lab data when available, heuristic fallback ──
  // psi may still be in-flight here — awaiting it here (after the static
  // fetches above) keeps total time at max(static, PSI) instead of the sum.
  const psiRes = await psi;
  if (psiRes) {
    issues.push(...buildPsiIssues(psiRes));
  } else {
    const scriptCount = all(/<script[^>]*>/gi, html).length;
    const heavy = page.loadMs > 2500 || scriptCount > 12;
    issues.push(issue('cwv-heuristic', 'Core Web Vitals', 'medium', 'Page weight heuristic (PSI unavailable)',
      `fetch ${page.loadMs}ms, ${scriptCount} scripts — ${heavy ? 'likely LCP risk' : 'ok'}`,
      'PSI lab data was unavailable for this run; cut blocking JS, preload hero, compress images.', 3, 'normal', !heavy));
  }

  return { issues, meta };
}

export function scoreReport(issues: IAuditIssue[]) {
  const cats = ['Technical SEO', 'Security & HTTPS', 'Mobile', 'AI Visibility / GEO', 'Core Web Vitals'];
  const scores: Record<string, number> = {};
  for (const c of cats) {
    const list = issues.filter(i => i.category === c);
    const lost = list.filter(i => !i.passed).reduce((s, i) => s + i.impact, 0);
    scores[c] = Math.max(0, 100 - lost * 2);
  }
  const overall = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / cats.length);
  const quick = issues.filter(i => !i.passed && i.effort === 'quick').reduce((s, i) => s + i.impact, 0);
  const all = issues.filter(i => !i.passed).reduce((s, i) => s + i.impact, 0);
  return {
    scores,
    overall,
    forecast: {
      now: overall,
      quickWins: Math.min(100, overall + Math.round(quick * 0.9)),
      allFixes: Math.min(100, overall + Math.round(all * 0.9)),
    },
  };
}
