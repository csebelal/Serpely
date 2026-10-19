import { IAuditIssue, IAffected, AuditCategory, AuditSeverity } from '../models/AuditReport';
import { PsiResult, buildPsiIssues } from './pagespeed';
import { detectProtection, type ProtectionHit } from './protection';
import { collectPhase2 } from './phase2';

export interface FetchedPage {
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  html: string;
  loadMs: number;
  protection?: ProtectionHit | null;
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
        // Crawler UA: evaluates exactly what Googlebot sees (SSR/crawler variants included).
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    const html = await res.text().catch(() => '');
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    // undici fetch hides set-cookie from iteration — read it explicitly for bot-wall signals.
    try {
      const sc = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.();
      if (sc?.length) headers['set-cookie'] = sc.join('\n');
    } catch { /* ignore */ }
    const protection = detectProtection(res.status, headers, html);
    return { finalUrl: res.url || url, status: res.status, headers, html: html.slice(0, 1_500_000), loadMs: Date.now() - start, protection };
  } finally {
    clearTimeout(t);
  }
}

// ── Tiny HTML helpers (no extra deps: regex-based, static HTML only) ──
// Quote-agnostic: handles href="x", href='x' and bare href=x (minifiers drop quotes).
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
export function attrVal(tag: string, attr: string): string {
  const m = tag.match(new RegExp(`${attr}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return ((m?.[1] ?? m?.[2] ?? m?.[3]) || '').trim();
}
export function allTags(html: string, tag: string): string[] {
  return html.match(new RegExp(`<${tag}\\b[^>]*>`, 'gi')) || [];
}
function metaContent(html: string, attr: string, name: string): string {
  for (const t of allTags(html, 'meta')) {
    if (attrVal(t, attr).toLowerCase() === name.toLowerCase()) {
      const v = attrVal(t, 'content');
      if (v) return v;
    }
  }
  return '';
}
export function linkHref(html: string, rel: string): string {
  for (const t of allTags(html, 'link')) {
    const rels = attrVal(t, 'rel').toLowerCase().split(/\s+/);
    if (rels.includes(rel.toLowerCase())) {
      const href = attrVal(t, 'href');
      if (href) return href;
    }
  }
  return '';
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

export interface IndexGate { code: string; label: string; passed: boolean; detail: string }

// URL-normalizer shared by the gates (origin + path, lowercased, no trailing slash).
export function normUrl(u: string, origin: string): string {
  try {
    const p = new URL(u, origin);
    return (p.origin + p.pathname).toLowerCase().replace(/\/$/, '');
  } catch { return u.toLowerCase().replace(/\/$/, ''); }
}

// robots.txt path check (User-agent: * / Googlebot group, prefix match).
export function isDisallowedByRobots(robotsBody: string, urlPath: string): boolean {
  if (!robotsBody) return false; // no robots.txt = allowed by default
  const groups = robotsBody.split(/(?=user-agent:)/gi);
  // NB: \b does NOT match after "*", so anchor with \s*$ instead.
  const relevant = groups.filter(g => /^user-agent:\s*(\*|googlebot)\s*(?:#.*)?$/im.test(g));
  const scope = (relevant.length ? relevant : groups.filter(g => /^user-agent:/im.test(g))).join('\n');
  const disallows = [...scope.matchAll(/disallow:\s*(\S*)/gi)].map(m => (m[1] || '').trim());
  if (disallows.some(d => d === '')) return false; // empty Disallow = allow all
  return disallows.some(d => d !== '' && urlPath.startsWith(d));
}

export function countWords(html: string): number {
  const stripText = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return stripText.split(/\s+/).filter(Boolean).length;
}

// ── Google Index gates (indexability verdict, stored as meta.index) ──
// Same gates a crawler applies before indexing: 100% = fully indexable.
// Informational only (no score impact). Shared with the sitemap checker.
export function computeIndexGates(args: {
  page: FetchedPage; normalizedUrl: string; origin: string; robotsBody: string;
  sitemapLocs: string[]; sitemapHasUrls: boolean;
  title: string; desc: string; canonical: string; robots: string;
}): { gates: IndexGate[]; score: number } {
  const { page, normalizedUrl, origin, robotsBody, sitemapLocs, sitemapHasUrls, title, desc, canonical, robots } = args;
  const ssrWords = countWords(page.html || '');
  const finalUrl = page.finalUrl || normalizedUrl;
  const urlPath = (() => { try { return new URL(finalUrl).pathname || '/'; } catch { return '/'; } })();
  const robotsAllowed = !isDisallowedByRobots(robotsBody, urlPath);
  const xRobots = page.headers['x-robots-tag'] || '';
  const noNoindex = !/noindex|none/i.test(robots) && !/noindex|none/i.test(xRobots);
  const finalNorm = normUrl(finalUrl, origin);
  const selfCanonical = !!canonical && normUrl(canonical, origin) === finalNorm;
  const inSitemap = sitemapHasUrls && sitemapLocs.includes(finalNorm);
  const gates: IndexGate[] = [
    { code: 'http-200', label: 'Page opens correctly', passed: page.status === 200, detail: page.status === 200 ? (finalUrl !== normalizedUrl ? `Opens correctly (redirects to ${finalUrl})` : 'Opens correctly with no errors') : `Returned status ${page.status} — fix errors or redirect loops` },
    { code: 'robots-allow', label: 'Search engines allowed to visit', passed: robotsAllowed, detail: robotsAllowed ? 'Nothing in robots.txt blocks this page' : `robots.txt blocks ${urlPath} — remove the Disallow rule` },
    { code: 'no-noindex', label: 'Marked for Google to list', passed: noNoindex, detail: (robots || xRobots) ? `Page says: "${robots || xRobots}"` : 'Listing allowed (default setting)' },
    { code: 'self-canonical', label: 'Has one clear main address', passed: selfCanonical, detail: canonical || 'Missing — search engines may pick the wrong address' },
    { code: 'in-sitemap', label: 'Included in the sitemap', passed: inSitemap, detail: inSitemap ? 'Found in the sitemap' : 'Add this page to the sitemap' },
    { code: 'title', label: 'Has a page title', passed: title.length >= 10, detail: title ? title.slice(0, 80) : 'Missing page title' },
    { code: 'meta-description', label: 'Has a page description', passed: desc.length >= 50, detail: desc ? `${desc.length} characters` : 'Missing page description' },
    { code: 'ssr-words', label: 'Has enough readable text (300+ words)', passed: ssrWords >= 300, detail: `${ssrWords} readable words found` },
  ];
  const score = Math.round((gates.filter(g => g.passed).length / Math.max(1, gates.length)) * 100);
  return { gates, score };
}

export async function runChecks(page: FetchedPage, normalizedUrl: string, psi?: PsiResult | null | Promise<PsiResult | null>): Promise<{ issues: IAuditIssue[]; meta: Record<string, string> }> {
  const html = page.html || '';
  const lower = html.toLowerCase();
  const origin = new URL(normalizedUrl).origin;
  const issues: IAuditIssue[] = [];
  const meta: Record<string, string> = {};
  // Phase 2 probes (outbound links, asset headers, TLS) start now so they run
  // in parallel with the static fetches + PSI above. Never throws.
  const phase2Promise = collectPhase2(page, normalizedUrl, origin);

  const title = first(/<title[^>]*>([^<]*)<\/title>/i, html);
  const h1s = all(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, html).map(s => s.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
  const desc = metaContent(html, 'name', 'description');
  const robots = metaContent(html, 'name', 'robots');
  const canonical = linkHref(html, 'canonical');
  const viewport = metaContent(html, 'name', 'viewport');
  const ogTitle = metaContent(html, 'property', 'og:title');
  const ogDesc = metaContent(html, 'property', 'og:description');
  const ogImage = metaContent(html, 'property', 'og:image');
  const twCard = metaContent(html, 'name', 'twitter:card') || metaContent(html, 'property', 'twitter:card');
  const twImage = metaContent(html, 'name', 'twitter:image');
  const lang = attrVal(first(/<html[^>]*>/i, html), 'lang');
  const imgs = all(/<img[^>]*>/gi, html);
  const imgsNoAlt = imgs.filter(t => !/alt=/i.test(t)).length;
  const jsonLdBlocks: string[] = [];
  {
    const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let sm: RegExpExecArray | null;
    while ((sm = scriptRe.exec(html)) !== null) {
      const openTag = sm[0].slice(0, sm[0].indexOf('>') + 1);
      if (attrVal(openTag, 'type').toLowerCase() === 'application/ld+json') jsonLdBlocks.push(sm[1]);
    }
  }
  const jsonLd = jsonLdBlocks.join(' ');
  const has = (t: string) => jsonLd.includes(t) || lower.includes(t);

  meta.title = title; meta.description = desc; meta.h1 = h1s[0] || '';

  // ── Technical SEO ──
  issues.push(issue('title-present', 'Technical SEO', 'critical', 'Has a page title',
    title ? `Found: "${title.slice(0, 80)}"` : 'No page title found',
    'Add a unique <title> 50–60 chars with primary keyword first.', 8, 'quick', !!title));
  issues.push(issue('title-length', 'Technical SEO', 'medium', 'Title length 50–60 chars',
    `Length: ${title.length}`, 'Keep title 50–60 chars so it is not truncated in search results.', 3, 'quick', title.length >= 30 && title.length <= 65));
  issues.push(issue('meta-description', 'Technical SEO', 'high', 'Page description present (120–160 chars)',
    desc ? `Length: ${desc.length}` : 'Missing page description',
    'Add a unique meta description 150–160 chars with value prop + CTA.', 5, 'quick', desc.length >= 80 && desc.length <= 170));
  issues.push(issue('h1-one', 'Technical SEO', 'high', 'Single main heading on the page',
    h1s.length ? `${h1s.length} heading(s), first: "${(h1s[0] || '').slice(0, 80)}"` : 'No main heading found in the page HTML',
    'Include exactly one main heading (H1) per page containing the primary keyword.', 6, 'normal', h1s.length === 1));
  issues.push(issue('canonical', 'Technical SEO', 'medium', 'Has one clear main address',
    canonical || 'Missing — search engines may pick the wrong address', 'Add a canonical link pointing to the page itself: <link rel="canonical" href="...">.', 3, 'quick', !!canonical));
  issues.push(issue('robots-indexable', 'Technical SEO', 'critical', 'Google is allowed to list this page',
    robots || 'Listing allowed (default setting)', 'Remove any "noindex" setting from important pages.', 8, 'quick', !/noindex/i.test(robots)));
  if (page.protection) {
    issues.push(issue('human-challenge', 'Technical SEO', 'low', 'Human-verification challenge shown to automated checks',
      `${page.protection.provider} challenge detected (${page.protection.evidence}) — page content could not be fully verified`,
      'Human visitors are unaffected. In Cloudflare, add a WAF custom rule to skip managed challenges for trusted auditor IPs/user-agents and review Bot Fight Mode settings.',
      2, 'normal', true));
  }
  issues.push(issue('lang-attr', 'Technical SEO', 'low', 'HTML lang attribute',
    lang || 'Missing', 'Add <html lang="en"> for accessibility + i18n signals.', 1, 'quick', !!lang));
  issues.push(issue('img-alt', 'Technical SEO', 'medium', 'Image alt coverage',
    `${imgs.length} imgs, ${imgsNoAlt} missing alt`,
    'Add descriptive alt to every image; use modern formats + lazy loading.', 3, 'normal', imgs.length === 0 || imgsNoAlt === 0));
  const hrefs = allTags(html, 'a').map(t => attrVal(t, 'href')).filter(Boolean);
  const jsHrefs = hrefs.filter(h => /^\s*javascript:/i.test(h)).length;
  const hashHrefs = hrefs.filter(h => h.trim() === '#').length;
  issues.push(issue('link-hygiene', 'Technical SEO', 'medium', 'No risky JavaScript links',
    `${hrefs.length} links, ${jsHrefs} javascript: URLs, ${hashHrefs} empty "#" links`,
    'Replace javascript: hrefs with real buttons/handlers — they are an XSS vector and dead ends for crawlers.', 3, 'quick', jsHrefs === 0));
  const favicon = linkHref(html, 'icon');
  issues.push(issue('favicon', 'Technical SEO', 'low', 'Favicon present',
    favicon || 'No icon link found',
    'Add <link rel="icon"> (SVG + PNG fallback) so tabs, bookmarks and search results show your brand.', 1, 'quick', !!favicon));

  // robots.txt + sitemap + machine files (live fetch)
  const [robotsTxt, sitemapXml, sitemapRoot, llmsTxt] = await Promise.all([
    fetchText(origin + '/robots.txt'),
    fetchText(origin + '/api/sitemap.xml'),
    fetchText(origin + '/sitemap.xml'),
    fetchText(origin + '/llms.txt'),
  ]);
  const robotsBody = robotsTxt?.text || '';
  const aiBots = ['gptbot', 'chatgpt-user', 'perplexitybot', 'claudebot', 'google-extended'];
  const blockedBots = aiBots.filter(b => new RegExp(`user-agent:\\s*${b}[\\s\\S]{0,200}?disallow:\\s*/`, 'i').test(robotsBody));
  issues.push(issue('robots-ai-allow', 'AI Visibility / GEO', 'critical', 'AI crawlers allowed (GPTBot, PerplexityBot, Claude)',
    blockedBots.length ? `Blocked: ${blockedBots.join(', ')}` : 'AI bots allowed or robots.txt absent',
    'Allow GPTBot / ChatGPT-User / PerplexityBot / ClaudeBot / Google-Extended; block only CCBot for training.', 9, 'quick', blockedBots.length === 0));
  // Phase B: global block kills the whole site in one line
  {
    const groups = robotsBody.split(/(?=user-agent:)/gi);
    const wild = groups.filter(g => /^user-agent:\s*(\*|googlebot)\s*(?:#.*)?$/im.test(g)).join('\n');
    const globalBlock = /^disallow:\s*\/\s*(?:#.*)?$/im.test(wild);
    issues.push(issue('robots-global-block', 'Technical SEO', 'critical', 'Site not blocked for all crawlers',
      !robotsBody ? 'No robots.txt — nothing blocked (default allow)'
        : globalBlock ? 'robots.txt contains "Disallow: /" for Googlebot — the whole site is blocked'
        : 'No global Disallow: / — site is crawlable',
      'Remove the "Disallow: /" line for Googlebot; keep only specific admin/parameter blocks.', 9, 'quick', !globalBlock));
    const adminPaths = ['/admin/', '/wp-admin/', '/login/', '/wp-login.php'];
    const blockedAdmin = adminPaths.filter(p => {
      try {
        const u = new URL(p, origin);
        return isDisallowedByRobots(robotsBody, u.pathname);
      } catch { return false; }
    });
    issues.push(issue('robots-admin', 'Technical SEO', 'low', 'Admin / login pages excluded',
      !robotsBody ? 'No robots.txt — admin exclusion unverified'
        : blockedAdmin.length ? `Blocked: ${blockedAdmin.join(', ')}` : 'Admin/login paths look crawlable',
      'Disallow /admin/, /wp-admin/ and /login/ in robots.txt so crawlers never waste budget on them.', 1, 'quick',
      !robotsBody ? true : blockedAdmin.length > 0));
  }
  issues.push(issue('sitemap', 'Technical SEO', 'medium', 'Sitemap found',
    sitemapXml && /<url/i.test(sitemapXml.text) ? 'Found sitemap with page entries' : 'No sitemap found at /api/sitemap.xml',
    'Publish /api/sitemap.xml with canonical indexable URLs; reference it in robots.txt.', 3, 'quick', !!(sitemapXml && /<url/i.test(sitemapXml.text))));
  issues.push(issue('sitemap-ref', 'Technical SEO', 'low', 'Sitemap referenced in robots.txt',
    /sitemap:/i.test(robotsBody) ? 'robots.txt points crawlers at the sitemap' : 'No Sitemap: line in robots.txt',
    'Add "Sitemap: https://yoursite.com/sitemap.xml" to robots.txt so crawlers discover it without guessing.', 2, 'quick', /sitemap:/i.test(robotsBody)));
  issues.push(issue('llms-txt', 'AI Visibility / GEO', 'medium', 'AI info file (llms.txt)',
    llmsTxt && llmsTxt.text.length > 50 ? 'Found llms.txt' : 'Missing llms.txt',
    'Add /llms.txt describing product, audience, key URLs (see llmstxt.org).', 4, 'quick', !!(llmsTxt && llmsTxt.text.length > 50)));
  // Phase A: hreflang static validation (format + self-reference + duplicates)
  {
    const hreflangs = allTags(html, 'link')
      .filter(t => attrVal(t, 'rel').toLowerCase().split(/\s+/).includes('alternate') && attrVal(t, 'hreflang'))
      .map(t => ({ lang: attrVal(t, 'hreflang').trim(), href: attrVal(t, 'href').trim() }));
    if (!hreflangs.length) {
      issues.push(issue('hreflang-static', 'Technical SEO', 'low', 'Valid hreflang (if multi-language)',
        'No hreflang tags — fine for single-language sites',
        'For multi-language sites use ISO codes (en, en-GB) with self-referencing, reciprocal entries + x-default.', 0, 'quick', true));
    } else {
      const bad = hreflangs.filter(h => !/^(x-default|[a-z]{2}(-[a-z]{2})?)$/i.test(h.lang)).map(h => h.lang);
      const seen = new Set<string>(); const dupes: string[] = [];
      for (const h of hreflangs) {
        const k = h.lang.toLowerCase();
        if (seen.has(k)) dupes.push(h.lang); else seen.add(k);
      }
      const selfRef = hreflangs.some(h => { try { return normUrl(h.href, origin) === normUrl(normalizedUrl, origin); } catch { return false; } });
      const problems = [
        ...(bad.length ? [`invalid code(s): ${bad.slice(0, 3).join(', ')}`] : []),
        ...(dupes.length ? [`duplicate: ${dupes.slice(0, 3).join(', ')}`] : []),
        ...(!selfRef ? ['no self-referencing entry'] : []),
      ];
      issues.push(issue('hreflang-static', 'Technical SEO', 'low', 'Valid hreflang (if multi-language)',
        problems.length ? `${hreflangs.length} hreflang tag(s) — ${problems.join('; ')}` : `${hreflangs.length} hreflang tag(s), codes + self-reference look valid`,
        'Use ISO codes (en, en-GB — not en-UK), one entry per language, each page self-referencing, languages reciprocally linked + x-default.', 2, 'quick', problems.length === 0));
    }
  }


  const smBody = `${sitemapXml?.text || ''}\n${sitemapRoot?.text || ''}`;
  const smLocs = [...smBody.matchAll(/<loc>\s*([^<\s]+)\s*</gi)].map(m => normUrl(m[1], origin));
  const { gates, score } = computeIndexGates({
    page, normalizedUrl, origin, robotsBody,
    sitemapLocs: smLocs, sitemapHasUrls: /<url/i.test(smBody),
    title, desc, canonical, robots,
  });
  meta.index = JSON.stringify({ score, gates });

  // ── Security & HTTPS ──
  const isHttps = normalizedUrl.startsWith('https://');
  const hsts = page.headers['strict-transport-security'] || '';
  issues.push(issue('https', 'Security & HTTPS', 'critical', 'HTTPS served',
    isHttps ? 'URL is https' : 'Not https', 'Serve entire site over HTTPS with valid cert + http→https redirect.', 8, 'normal', isHttps));
  issues.push(issue('hsts', 'Security & HTTPS', 'low', 'HSTS header',
    hsts || 'Missing strict-transport-security', 'Add Strict-Transport-Security: max-age=31536000; includeSubDomains.', 1, 'quick', !!hsts));
  issues.push(issue('mixed-content', 'Security & HTTPS', 'medium', 'No mixed content',
    /src\s*=\s*["']?http:\/\//i.test(html) ? 'Found http:// asset on https page' : 'No http:// assets found',
    'Serve all assets over https; fix hardcoded http:// images/scripts.', 3, 'quick', !/src\s*=\s*["']?http:\/\//i.test(html)));
  // Phase A: http→https redirect + www canonicalization (one cheap probe each)
  if (isHttps) {
    try {
      const httpUrl = 'http://' + new URL(normalizedUrl).host + (new URL(normalizedUrl).pathname || '/');
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      let ok = false; let detail = '';
      try {
        const r = await fetch(httpUrl, { method: 'GET', signal: ctrl.signal, redirect: 'manual' });
        const loc = r.headers.get('location') || '';
        ok = (r.status >= 300 && r.status < 400 && /^https:\/\//i.test(new URL(loc, httpUrl).toString()));
        detail = ok ? `http:// redirects to https (${r.status})` : `http:// does not redirect to https (HTTP ${r.status})`;
        try { await r.arrayBuffer().catch(() => undefined); } catch { /* ignore */ }
      } finally { clearTimeout(t); }
      issues.push(issue('https-redirect', 'Security & HTTPS', 'high', 'HTTP redirects to HTTPS',
        detail || 'Could not verify',
        'Add a site-wide 301 from http:// to the https:// version (server or CDN rule).', 6, 'normal', ok));
    } catch {
      issues.push(issue('https-redirect', 'Security & HTTPS', 'high', 'HTTP redirects to HTTPS',
        'Probe failed — could not verify http:// behavior',
        'Add a site-wide 301 from http:// to the https:// version (server or CDN rule).', 0, 'normal', true));
    }
  }
  {
    // www vs non-www must not serve the same content twice (duplicate-content risk)
    let wwwOk = true; let wwwDetail = 'Single host version in use';
    try {
      const u = new URL(origin);
      const altHost = u.hostname.startsWith('www.') ? u.hostname.slice(4) : 'www.' + u.hostname;
      const altUrl = `${u.protocol}//${altHost}/`;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      try {
        const r = await fetch(altUrl, { signal: ctrl.signal, redirect: 'manual' });
        const loc = r.headers.get('location') || '';
        if (r.status >= 300 && r.status < 400 && loc) {
          const dest = new URL(loc, altUrl).hostname.replace(/^www\./, '');
          wwwOk = dest === u.hostname.replace(/^www\./, '');
          wwwDetail = wwwOk ? `Alternate host redirects to canonical (${r.status})` : `Alternate host redirects elsewhere: ${loc.slice(0, 80)}`;
        } else if (r.status === 200) {
          wwwOk = false;
          wwwDetail = `Both www and non-www serve content (HTTP 200) — pick one canonical host with a 301`;
        } else {
          wwwDetail = `Alternate host returns HTTP ${r.status} (no duplication)`;
        }
        try { await r.arrayBuffer().catch(() => undefined); } catch { /* ignore */ }
      } finally { clearTimeout(t); }
    } catch { /* DNS fail = no duplicate host, keep pass */ }
    issues.push(issue('www-canonical', 'Technical SEO', 'medium', 'Single canonical host (www vs non-www)',
      wwwDetail, 'Redirect the alternate host (www ↔ non-www) with a site-wide 301 to the canonical version.', 3, 'normal', wwwOk));
  }

  // ── Security headers (already captured — zero new requests) ──
  const csp = page.headers['content-security-policy'] || '';
  issues.push(issue('csp-header', 'Security & HTTPS', 'medium', 'Content Security Policy against XSS',
    csp ? `Present (${csp.slice(0, 80)}${csp.length > 80 ? '…' : ''})` : 'Missing content-security-policy',
    'Add a Content-Security-Policy header (start with report-only) to block injected scripts.', 4, 'normal', !!csp));
  const frameOpt = page.headers['x-frame-options'] || '';
  const frameAnc = /frame-ancestors/i.test(csp);
  issues.push(issue('x-frame', 'Security & HTTPS', 'low', 'Clickjacking protection',
    frameOpt || frameAnc ? (frameOpt || 'frame-ancestors in CSP') : 'Missing — page can be embedded anywhere',
    'Set X-Frame-Options: SAMEORIGIN (or frame-ancestors) so attackers cannot frame your pages.', 2, 'quick', !!(frameOpt || frameAnc)));
  const contentTypeOpt = page.headers['x-content-type-options'] || '';
  issues.push(issue('x-content-type', 'Security & HTTPS', 'low', 'MIME-sniffing protection',
    contentTypeOpt || 'Missing x-content-type-options',
    'Set X-Content-Type-Options: nosniff so browsers never guess executable content types.', 1, 'quick', /nosniff/i.test(contentTypeOpt)));
  const refPol = page.headers['referrer-policy'] || '';
  issues.push(issue('referrer-policy', 'Security & HTTPS', 'low', 'Referrer privacy policy',
    refPol || 'Missing referrer-policy',
    'Set Referrer-Policy (e.g. strict-origin-when-cross-origin) to stop leaking full URLs to third parties.', 1, 'quick', !!refPol));
  const permPol = page.headers['permissions-policy'] || page.headers['feature-policy'] || '';
  issues.push(issue('permissions-policy', 'Security & HTTPS', 'low', 'Browser feature permissions',
    permPol || 'Missing permissions-policy',
    'Set Permissions-Policy to disable camera/mic/geolocation you do not use.', 1, 'quick', !!permPol));
  const rawCookies = (page.headers['set-cookie'] || '').split('\n').map(s => s.trim()).filter(Boolean);
  const insecureCookies = isHttps ? rawCookies.filter(c => !/;\s*secure\b/i.test(c)).map(c => c.split('=')[0].trim()).filter(Boolean) : [];
  issues.push(issue('cookie-flags', 'Security & HTTPS', 'low', 'Secure cookies',
    !rawCookies.length ? 'No cookies set' : insecureCookies.length ? `Missing Secure flag: ${insecureCookies.slice(0, 3).join(', ')}` : `All ${rawCookies.length} cookie(s) use Secure`,
    'Mark cookies Secure (and HttpOnly + SameSite=Lax where possible) so they never travel over plain HTTP.', 2, 'quick', insecureCookies.length === 0));

  // ── Response hygiene: caching + compression (already captured) ──
  const cacheCtrl = page.headers['cache-control'] || '';
  const expiresHdr = page.headers['expires'] || '';
  issues.push(issue('cache-headers', 'Core Web Vitals', 'low', 'Deliberate caching strategy',
    cacheCtrl || expiresHdr ? (cacheCtrl || `expires ${expiresHdr}`) : 'No cache headers on the page',
    'Set Cache-Control (e.g. public, max-age for static; no-cache + ETag for HTML) so repeat visits skip the network.', 2, 'quick', !!(cacheCtrl || expiresHdr)));
  const contentEnc = page.headers['content-encoding'] || '';
  issues.push(issue('compression', 'Core Web Vitals', 'low', 'Response compression',
    contentEnc ? `Compressed with ${contentEnc}` : 'No content-encoding — page ships uncompressed',
    'Enable gzip or Brotli for HTML/CSS/JS on the server or CDN.', 2, 'quick', /gzip|br|zstd|deflate/i.test(contentEnc)));

  // ── Mobile ──
  issues.push(issue('viewport', 'Mobile', 'high', 'Fits mobile screens',
    viewport || 'Missing — page may look tiny on phones', 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.', 5, 'quick', !!viewport));
  // Phase A: viewport must not block pinch-zoom (WCAG + mobile usability)
  const viewportNoZoom = /user-scalable\s*=\s*no/i.test(viewport) || /maximum-scale\s*=\s*0*\.?1(\.0*)?\s*(,|$)/i.test(viewport);
  issues.push(issue('mobile-zoom', 'Mobile', 'medium', 'Pinch-zoom allowed on mobile',
    !viewport ? 'No viewport to evaluate' : viewportNoZoom ? `Viewport blocks zoom: "${viewport.slice(0, 100)}"` : 'Viewport allows pinch-zoom',
    'Remove user-scalable=no and maximum-scale=1 from the viewport tag so low-vision users can zoom.', 3, 'quick', !!viewport && !viewportNoZoom));
  // Phase A: static tiny-font scan (lab check via PSI when available)
  const tinyFonts = [
    ...html.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)\s*px/gi),
  ].filter(m => Number(m[1]) < 12).length + (html.match(/<font\b[^>]*\bsize\s*=\s*["']?[12]["']?/gi) || []).length;
  issues.push(issue('mobile-font-static', 'Mobile', 'low', 'Readable base font (no tiny inline text)',
    tinyFonts ? `${tinyFonts} inline tiny-font snippet(s) under 12px` : 'No tiny inline fonts detected',
    'Keep body text at 16px+; tiny inline fonts force mobile users to pinch-zoom and hurt indexability.', 2, 'quick', tinyFonts === 0));
  // Phase B: image dimension + lazy-load coverage (CLS + page weight)
  {
    const noDims = imgs.filter(t => !/\bwidth\s*=/i.test(t) && !/\bheight\s*=/i.test(t) && !/aspect-ratio/i.test(t)).length;
    issues.push(issue('img-dims', 'Performance', 'medium', 'Images reserve layout space',
      imgs.length ? (noDims ? `${noDims} of ${imgs.length} image(s) lack width/height` : `All ${imgs.length} image(s) declare dimensions`) : 'No images on this page',
      'Add width/height (or aspect-ratio CSS) to every <img> so loading never shifts the layout (CLS).', 3, 'quick', noDims === 0));
    const noLazy = imgs.filter(t => !/loading\s*=\s*["']?lazy/i.test(t)).length;
    issues.push(issue('img-lazy', 'Performance', 'low', 'Below-fold images lazy-load',
      imgs.length ? (noLazy > 1 ? `${noLazy} of ${imgs.length} image(s) load eagerly` : `${imgs.length} image(s) — lazy-loading looks fine`) : 'No images on this page',
      'Add loading="lazy" to below-fold images (keep the hero eager + preloaded) to cut initial page weight.', 2, 'quick', noLazy <= 1));
  }
  // Phase B: generic anchor text (static complement to PSI link-text)
  {
    const texts = all(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, html)
      .map(s => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().toLowerCase()).filter(Boolean);
    const generic = texts.filter(t => /^(click here|read more|learn more|here|more|link)([.…]*)$/.test(t)).length;
    issues.push(issue('anchor-generic', 'On-page content', 'low', 'Descriptive link text',
      texts.length ? (generic ? `${generic} of ${texts.length} link(s) use generic text ("click here", "read more")` : `${texts.length} link(s) — anchor text looks descriptive`) : 'No links on this page',
      'Replace "click here / read more" with entity-rich anchors describing the target page.', 2, 'quick', generic === 0));
  }

  // ── AI Visibility / GEO ──
  issues.push(issue('og-tags', 'AI Visibility / GEO', 'medium', 'Social preview tags',
    ogTitle && ogImage ? 'Title + image preview present' : `title:${!!ogTitle} description:${!!ogDesc} image:${!!ogImage}`,
    'Add og:title/description/image + twitter:card summary_large_image on every page.', 3, 'quick', !!(ogTitle && ogImage)));
  issues.push(issue('twitter-card', 'AI Visibility / GEO', 'low', 'Twitter preview card',
    twCard || 'Missing', 'Add <meta name="twitter:card" content="summary_large_image"> + image.', 1, 'quick', !!twCard && !!(twImage || ogImage)));
  // Phase A: og:image must actually load (HEAD check, no heavy download)
  if (ogImage) {
    let ogOk = false; let ogDetail = '';
    try {
      const abs = new URL(ogImage, origin).toString();
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      try {
        const hr = await fetch(abs, { method: 'HEAD', signal: ctrl.signal, redirect: 'follow' });
        const ct = hr.headers.get('content-type') || '';
        ogOk = hr.ok && (/image\//i.test(ct) || ct === '');
        ogDetail = hr.ok ? `og:image loads (${ct || 'unknown type'})` : `og:image returns HTTP ${hr.status}`;
        try { await hr.arrayBuffer().catch(() => undefined); } catch { /* ignore */ }
      } finally { clearTimeout(t); }
    } catch { ogDetail = 'og:image URL is malformed or unreachable'; }
    issues.push(issue('og-image-valid', 'AI Visibility / GEO', 'medium', 'Social preview image loads',
      ogDetail || 'Could not verify og:image',
      'Fix the og:image URL so it returns 200 with an image content-type (1200×630 JPG/PNG, absolute https URL).', 3, 'quick', ogOk));
  } else {
    issues.push(issue('og-image-valid', 'AI Visibility / GEO', 'medium', 'Social preview image loads',
      'No og:image to verify (see Social preview tags)',
      'Fix the og:image URL so it returns 200 with an image content-type (1200×630 JPG/PNG, absolute https URL).', 0, 'quick', true));
  }
  // Phase A: JSON-LD must parse + carry required properties per type
  {
    const parseErrors: string[] = [];
    const missingProps: string[] = [];
    const foundTypes = new Set<string>();
    const REQ: Record<string, string[]> = {
      organization: ['name'], website: ['name'],
      article: ['headline', 'author', 'datepublished'], blogposting: ['headline', 'author', 'datepublished'],
      newsarticle: ['headline', 'author', 'datepublished'],
      product: ['name', 'offers'], breadcrumblist: ['itemlistelement'], faqpage: ['mainentity'],
      softwareapplication: ['name'], localbusiness: ['name', 'address'],
    };
    const checkNode = (node: unknown) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(checkNode); return; }
      const o = node as Record<string, unknown>;
      if (o['@graph']) { checkNode(o['@graph']); return; }
      const t = String(o['@type'] ?? '').toLowerCase();
      if (!t) return;
      foundTypes.add(t);
      const req = REQ[t];
      if (req) {
        const keys = new Set(Object.keys(o).map(k => k.toLowerCase()));
        for (const r of req) {
          if (!keys.has(r)) missingProps.push(`${t} missing "${r}"`);
        }
      }
    };
    if (jsonLdBlocks.length) {
      for (const b of jsonLdBlocks) {
        try { checkNode(JSON.parse(b)); }
        catch { parseErrors.push('A JSON-LD block fails to parse'); break; }
      }
    }
    const schemaProblems = [...parseErrors, ...missingProps.slice(0, 3)];
    issues.push(issue('schema-valid', 'AI Visibility / GEO', 'high', 'Structured data parses with required fields',
      !jsonLdBlocks.length ? 'No JSON-LD to validate (see coverage checks)'
        : schemaProblems.length ? schemaProblems.join('; ') : `${foundTypes.size} type(s) valid: ${[...foundTypes].slice(0, 4).join(', ')}`,
      'Fix JSON-LD syntax errors and add required properties (Article: headline/author/datePublished, Product: name/offers, Organization: name).', 5, 'normal',
      !jsonLdBlocks.length ? true : schemaProblems.length === 0));
  }
  issues.push(issue('faq-schema', 'AI Visibility / GEO', 'high', 'FAQ code for Google',
    has('faqpage') ? 'FAQ code detected' : 'No FAQ code found in the page',
    'Add FAQ code directly in the page HTML (code added by JavaScript alone is invisible to crawlers).', 6, 'normal', has('faqpage')));
  issues.push(issue('org-schema', 'AI Visibility / GEO', 'high', 'Business info code',
    has('organization') ? 'Business info detected' : 'No business info code found',
    'Add business info code with logo + links (Wikipedia, Wikidata, LinkedIn, X).', 5, 'normal', has('organization')));
  issues.push(issue('article-schema', 'AI Visibility / GEO', 'medium', 'Article / product code',
    has('article') || has('softwareapplication') || has('product') ? 'Content code detected' : 'No article or product code found',
    'Add article code on blog posts, product code with offers + ratings on money pages.', 4, 'normal', has('article') || has('softwareapplication') || has('product')));
  issues.push(issue('breadcrumb-schema', 'AI Visibility / GEO', 'low', 'Breadcrumb code',
    has('breadcrumblist') ? 'Breadcrumb code detected' : 'No breadcrumb code found',
    'Add breadcrumb code + visible breadcrumb navigation.', 2, 'normal', has('breadcrumblist')));
  issues.push(issue('speakable', 'AI Visibility / GEO', 'low', 'Voice-answer code',
    has('speakable') ? 'Voice-answer code detected' : 'No voice-answer code found',
    'Add voice-answer code pointing at the summary + key headings for answer engines.', 2, 'normal', has('speakable')));
  issues.push(issue('faq-html', 'AI Visibility / GEO', 'medium', 'Visible FAQ or summary block',
    /faq|frequently asked|tl;dr|key takeaways/i.test(html) ? 'FAQ/summary copy found in the page' : 'No FAQ or summary block in the page',
    'Add a 40–60 word summary + FAQ with headings phrased as questions; lead each section with the direct answer.', 4, 'normal', /faq|frequently asked|tl;dr|key takeaways/i.test(html)));
  const bodyWords = countWords(html);
  issues.push(issue('content-depth', 'AI Visibility / GEO', 'high', 'Substantive readable content (300+ words)',
    `${bodyWords} readable words in static HTML`,
    'Thin pages rarely earn citations — expand with original detail, examples, data and FAQs that answer real queries.', 4, 'normal', bodyWords >= 300));

  // ── Core Web Vitals: real PSI lab data when available, heuristic fallback ──
  // psi may still be in-flight here — awaiting it here (after the static
  // fetches above) keeps total time at max(static, PSI) instead of the sum.
  const psiRes = await psi;
  if (psiRes) {
    issues.push(...buildPsiIssues(psiRes));
  } else {
    const scriptCount = all(/<script[^>]*>/gi, html).length;
    const heavy = page.loadMs > 2500 || scriptCount > 12;
    issues.push(issue('cwv-heuristic', 'Core Web Vitals', 'medium', 'Page weight check (speed test unavailable)',
      `fetch ${page.loadMs}ms, ${scriptCount} scripts — ${heavy ? 'likely slow to show content' : 'ok'}`,
      'The speed test was unavailable for this run; cut blocking JS, preload hero, compress images.', 3, 'normal', !heavy));
  }

  // ── Phase 2 findings: outbound links, asset hygiene, TLS (bounded probes) ──
  const p2 = await phase2Promise;
  if (p2.extTotal > 0) {
    const names = p2.brokenLinks.slice(0, 3).map(b => b.url.replace(/^https?:\/\//, '').slice(0, 50)).join(', ');
    issues.push(issue('ext-links', 'Technical SEO', 'medium', 'No broken outbound links',
      p2.brokenLinks.length
        ? `${p2.brokenLinks.length} of ${p2.extTotal} external links broken: ${names}${p2.unverifiable ? ` (${p2.unverifiable} block bots, skipped)` : ''}`
        : `${p2.extTotal} external links, all reachable${p2.unverifiable ? ` (${p2.unverifiable} block bots, skipped)` : ''}`,
      'Fix or remove dead outbound links — they waste crawl budget and erode visitor trust.', 4, 'normal', p2.brokenLinks.length === 0));
  }
  if (p2.assetTotal > 0) {
    const un = p2.uncached.slice(0, 3).map(a => a.url.split('/').pop()).join(', ');
    issues.push(issue('asset-caching', 'Core Web Vitals', 'low', 'Assets cached for repeat visits',
      p2.uncached.length
        ? `${p2.uncached.length} of ${p2.assetTotal} assets have no cache headers: ${un}`
        : `All ${p2.assetTotal} checked assets send cache headers`,
      'Add Cache-Control (max-age/immutable) + ETag to static assets so repeat visits skip the network.', 2, 'quick', p2.uncached.length === 0));
    const ov = p2.oversized.slice(0, 3).map(a => `${a.url.split('/').pop()} (${a.kb}KB)`).join(', ');
    issues.push(issue('asset-weight', 'Core Web Vitals', 'medium', 'No oversized single files',
      p2.oversized.length
        ? `Heavy files: ${ov}`
        : `Largest checked files are within budget`,
      'Split vendor bundles, compress hero images, lazy-load below-the-fold media.', 3, 'normal', p2.oversized.length === 0));
  }
  if (p2.tls) {
    const modern = p2.tls.protocol === 'TLSv1.3' || p2.tls.protocol === 'TLSv1.2';
    const fresh = Number.isFinite(p2.tls.daysLeft) ? p2.tls.daysLeft >= 30 : true;
    const ok = modern && fresh;
    issues.push(issue('tls-health', 'Security & HTTPS', 'high', 'Modern TLS, healthy certificate',
      `${p2.tls.protocol || 'unknown protocol'} · ${p2.tls.issuer}${Number.isFinite(p2.tls.daysLeft) ? ` · expires in ${p2.tls.daysLeft} days` : ''}`,
      !modern
        ? 'Disable TLS 1.0/1.1 on the server/CDN — they are deprecated and browsers flag them.'
        : 'Renew the certificate (automate with ACME/Let\'s Encrypt) before it expires.',
      5, 'normal', ok));
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

// ── V2 scoring (mockup categories) ─────────────────────────────────────
// Maps both legacy and v2 issue categories onto the 5 mockup buckets so old
// reports (30d TTL) keep rendering after the category rename.
const V2_CATS = ['Performance', 'Accessibility', 'Technical SEO', 'On-page content', 'AI citation readiness'] as const;

function toV2Cat(i: IAuditIssue): string {
  if ((V2_CATS as readonly string[]).includes(i.category)) return i.category;
  switch (i.code) {
    case 'title-present': case 'title-length': case 'meta-description': case 'h1-one':
    case 'link-hygiene': case 'psi-link-text': case 'psi-crawl-anchors':
    case 'anchor-generic':
      return 'On-page content';
    case 'viewport': case 'lang-attr': case 'img-alt': case 'psi-heading-order':
    case 'psi-link-name': case 'psi-font-size': case 'psi-tap-targets':
    case 'psi-contrast': case 'psi-form-labels': case 'psi-button-names':
    case 'psi-no-notif-spam': case 'psi-no-geo-spam': case 'psi-img-ratio':
    case 'mobile-zoom': case 'mobile-font-static':
      return 'Accessibility';
    case 'psi-score': case 'psi-lcp': case 'psi-cls': case 'psi-inp': case 'psi-ttfb':
    case 'psi-field-lcp': case 'psi-field-cls': case 'psi-field-inp':
    case 'img-dims': case 'img-lazy':
    case 'cwv-heuristic': case 'cache-headers': case 'compression':
    case 'asset-caching': case 'asset-weight': case 'psi-server-response':
    case 'psi-byte-weight': case 'psi-http2': case 'psi-render-blocking':
    case 'psi-unused-js': case 'psi-unminified-css': case 'psi-unminified-js':
    case 'psi-modern-images': case 'psi-responsive-images': case 'psi-optimized-images':
    case 'psi-efficient-anim': case 'psi-font-display': case 'psi-text-compression':
      return 'Performance';
    case 'robots-ai-allow': case 'llms-txt': case 'og-tags': case 'twitter-card':
    case 'faq-schema': case 'org-schema': case 'article-schema': case 'breadcrumb-schema':
    case 'speakable': case 'faq-html': case 'content-depth': case 'psi-robots-valid':
    case 'og-image-valid': case 'schema-valid':
      return 'AI citation readiness';
    default:
      return 'Technical SEO';
  }
}

export function scoreReportV2(issues: IAuditIssue[]) {  const scores: Record<string, number> = {};
  for (const c of V2_CATS) {
    const list = issues.filter(i => toV2Cat(i) === c);
    const lost = list.filter(i => !i.passed).reduce((s, i) => s + i.impact, 0);
    scores[c] = Math.max(0, 100 - lost * 2);
  }
  const overall = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / V2_CATS.length);
  const quick = issues.filter(i => !i.passed && i.effort === 'quick').reduce((s, i) => s + i.impact, 0);
  const all = issues.filter(i => !i.passed).reduce((s, i) => s + i.impact, 0);
  const critical = issues.filter(i => !i.passed && i.severity === 'critical').length;
  const warning = issues.filter(i => !i.passed && (i.severity === 'high' || i.severity === 'medium')).length;
  const notice = issues.filter(i => !i.passed && i.severity === 'low').length;
  const passed = issues.filter(i => i.passed).length;
  const top = [...issues].filter(i => !i.passed).sort((a, b) => b.impact - a.impact)[0];
  return {
    scores, overall,
    forecast: { now: overall, quickWins: Math.min(100, overall + Math.round(quick * 0.9)), allFixes: Math.min(100, overall + Math.round(all * 0.9)) },
    summary: { critical, warning, notice, passed },
    priority: top ? { code: top.code, title: top.title, fix: top.fix, impact: top.impact } : null,
  };
}

// ── V2 site-wide issues (mockup: 4 critical, 4 warnings, 3 notices) ────
// Built from crawl aggregates + homepage base checks + PSI. Each carries
// affected { count, examples } so the frontend can list example URLs.
export function buildSiteIssues(args: {
  agg: { total: number; crawled: number; errors: number;
    broken4xx: { url: string; status: number }[]; broken5xx: { url: string; status: number }[];
    duplicateTitles: { title: string; urls: string[] }[]; thinPages: { url: string; words: number }[];
    missingAltPages: { url: string; missing: number; total: number }[]; headingSkipPages: string[];
    canonicalConflicts: { url: string; canonical: string }[]; metaDescMissing: string[]; noSchemaPages: string[]; avgLoadMs: number;
    orphans: string[]; deepPages: { url: string; depth: number }[]; redirectChains: { url: string; hops: number; chain: string[] }[]; lowInbound: { url: string; inbound: number }[];
    dimsPages: { url: string; missing: number; total: number }[]; lazyPages: { url: string; nonLazy: number; total: number }[];
    heavyPages: { url: string; kb: number }[]; dupContent: { hash: string; urls: string[] }[]; dupDesc: { desc: string; urls: string[] }[];
    genericAnchors: { text: string; count: number }[]; nonIndexable: string[] };
  aiBlocked: string[]; llmsFound: boolean; schemaFound: boolean; psiLcpMs?: number; psiScore?: number;
}): IAuditIssue[] {
  const { agg, aiBlocked, llmsFound, schemaFound, psiLcpMs, psiScore } = args;
  const ex = (arr: string[]) => ({ count: arr.length, examples: arr.slice(0, 5) });
  const mk = (code: string, category: IAuditIssue['category'], severity: IAuditIssue['severity'],
    title: string, evidence: string, why: string, fix: string,
    impact: number, effort: 'quick' | 'normal', passed: boolean, affected?: IAffected): IAuditIssue =>
    ({ code, category, severity, title, evidence, fix, impact: passed ? 0 : impact, effort, passed, why, affected });
  const out: IAuditIssue[] = [
    mk('site-ai-blocked', 'AI citation readiness', 'critical', 'AI crawlers blocked',
      aiBlocked.length ? `Blocked: ${aiBlocked.join(', ')}` : 'All major AI bots allowed',
      'Blocked bots never see new pages, so ChatGPT / Perplexity cite competitors instead.',
      'Allow GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, Google-Extended in robots.txt; block only CCBot.',
      9, 'quick', aiBlocked.length === 0, ex(aiBlocked)),
    mk('site-404', 'Technical SEO', 'critical', 'Broken links (404)',
      agg.broken4xx.length ? `${agg.broken4xx.length} broken URL(s) found across ${agg.crawled} pages` : `No 404s across ${agg.crawled} crawled pages`,
      'Dead ends waste crawl budget and leak link equity — Google deprioritizes sites full of them.',
      'Remove, redirect (301) or fix each broken URL and update internal links pointing at it.',
      8, 'normal', agg.broken4xx.length === 0, ex(agg.broken4xx.map(b => `${b.url} (HTTP ${b.status})`))),
    mk('site-5xx', 'Technical SEO', 'critical', 'Server errors (5xx)',
      agg.broken5xx.length ? `${agg.broken5xx.length} server error(s)` : 'No server errors detected',
      'Intermittent 5xx makes crawlers back off and can drop pages from the index.',
      'Fix origin errors, check server logs / hosting limits, then re-run the audit.',
      8, 'normal', agg.broken5xx.length === 0, ex(agg.broken5xx.map(b => `${b.url} (HTTP ${b.status})`))),
    mk('site-canonical', 'Technical SEO', 'critical', 'Canonical conflicts',
      agg.canonicalConflicts.length ? `${agg.canonicalConflicts.length} page(s) canonicalize elsewhere` : 'Canonicals are self-referencing',
      'Conflicting canonicals tell Google to index a different URL — the wrong page ranks (or none does).',
      'Point each canonical at its own final URL; sitemap should list the same canonical.',
      7, 'quick', agg.canonicalConflicts.length === 0, ex(agg.canonicalConflicts.map(c => `${c.url} → ${c.canonical}`))),
    mk('site-meta-desc', 'On-page content', 'medium', 'Meta descriptions missing / short',
      agg.metaDescMissing.length ? `${agg.metaDescMissing.length} page(s) without a usable description` : 'Descriptions look complete',
      'Missing descriptions let Google write the snippet — CTR drops even when rankings hold.',
      'Write unique 150–160 char descriptions with value prop + CTA per page.',
      5, 'quick', agg.metaDescMissing.length === 0, ex(agg.metaDescMissing)),
    mk('site-alt', 'Accessibility', 'medium', 'Images missing alt text',
      agg.missingAltPages.length ? `${agg.missingAltPages.length} page(s) with images missing alt` : 'Alt coverage looks complete',
      'Screen readers skip imageless context and image search ignores the page entirely.',
      'Add descriptive alt to every meaningful image; mark decorative ones alt="".',
      4, 'normal', agg.missingAltPages.length === 0, ex(agg.missingAltPages.map(p => `${p.url} (${p.missing}/${p.total})`))),
    mk('site-schema', 'AI citation readiness', 'medium', 'Structured data (schema) coverage',
      schemaFound ? 'Schema detected on homepage' : `${agg.noSchemaPages.length} sampled page(s) without JSON-LD`,
      'Schema is how AI engines verify facts — no schema means fewer citations and rich results.',
      'Add Organization + WebSite sitewide; Article/FAQ/Breadcrumb per page via JSON-LD in HTML.',
      4, 'normal', schemaFound, ex(agg.noSchemaPages)),
    mk('site-lcp', 'Performance', 'medium', 'Largest Contentful Paint under 2.5s',
      psiLcpMs !== undefined ? `LCP ${(psiLcpMs / 1000).toFixed(1)}s (phone lab)` : `Avg fetch ${agg.avgLoadMs}ms across crawled pages`,
      'Slow hero content fails Core Web Vitals and AI crawlers deprioritize slow pages.',
      'Preload hero image, cut render-blocking JS, serve WebP/AVIF, enable CDN caching.',
      5, 'normal', psiLcpMs !== undefined ? psiLcpMs <= 2500 : agg.avgLoadMs <= 2500,
      { count: agg.crawled, examples: psiScore !== undefined && psiScore >= 0 ? [`PSI performance ${psiScore}/100`] : [`avg fetch ${agg.avgLoadMs}ms`] }),    mk('site-llms', 'AI citation readiness', 'low', 'llms.txt for AI agents',
      llmsFound ? 'llms.txt found' : 'No llms.txt — AI agents guess your key pages',
      'llms.txt is the fastest way to point answer engines at canonical, citable content.',
      'Publish /llms.txt with product summary, audience, key URLs (see llmstxt.org).',
      2, 'quick', llmsFound, ex(llmsFound ? [] : ['https://yoursite.com/llms.txt (missing)'])),
    mk('site-thin', 'On-page content', 'low', 'Thin content (<300 words)',
      agg.thinPages.length ? `${agg.thinPages.length} thin page(s)` : 'Content depth looks healthy',
      'Thin pages rarely rank or earn citations — they dilute crawl budget.',
      'Expand with original detail, examples, FAQs answering real queries (300+ words).',
      3, 'normal', agg.thinPages.length === 0, ex(agg.thinPages.map(p => `${p.url} (${p.words} words)`))),
    mk('site-headings', 'Accessibility', 'low', 'Logical heading order',
      agg.headingSkipPages.length ? `${agg.headingSkipPages.length} page(s) skip heading levels` : 'Headings are sequential',
      'Skipped levels confuse screen readers and section-by-section AI extraction.',
      'Keep one H1 then sequential H2 → H3 with no skipped levels.',
      2, 'quick', agg.headingSkipPages.length === 0, ex(agg.headingSkipPages)),
  ];
  if (agg.duplicateTitles.length) {
    out.push(mk('site-dup-titles', 'On-page content', 'medium', 'Duplicate page titles',
      `${agg.duplicateTitles.reduce((s, g) => s + g.urls.length, 0)} pages share ${agg.duplicateTitles.length} identical titles`,
      'Duplicate titles force Google to pick one — the rest never surface.',
      'Rewrite each title uniquely (50–60 chars, primary keyword first).',
      4, 'quick', false, ex(agg.duplicateTitles.flatMap(g => g.urls))));
  }
  // ── Phase A: link-graph issues ──
  const orphans = agg.orphans ?? [];
  out.push(mk('site-orphan', 'Technical SEO', 'high', 'Orphan pages (no internal links)',
    orphans.length ? `${orphans.length} page(s) in the sitemap get zero internal links` : `No orphans across ${agg.crawled} crawled pages`,
    'Orphan pages cannot be discovered by crawlers following links — they rarely get indexed or ranked.',
    'Link orphans from relevant category / hub pages with descriptive anchors; or remove them from the sitemap.',
    5, 'normal', orphans.length === 0, ex(orphans)));
  const deep = agg.deepPages ?? [];
  out.push(mk('site-depth', 'Technical SEO', 'medium', 'Important pages within 3 clicks',
    deep.length ? `${deep.length} page(s) sit more than 3 clicks from the homepage` : 'All crawled pages are within 3 clicks of home',
    'Deep pages get less crawl budget and less link equity — Google treats depth as a deprioritization signal.',
    'Flatten navigation: feature deep pages in menus, hubs and contextual links until depth ≤ 3.',
    4, 'normal', deep.length === 0, ex(deep.map(d => `${d.url} (${d.depth} clicks)`))));
  const chains = agg.redirectChains ?? [];
  out.push(mk('site-redirect-chain', 'Technical SEO', 'medium', 'No long redirect chains (2+ hops)',
    chains.length ? `${chains.length} URL(s) go through 2+ redirect hops` : 'No multi-hop redirect chains detected',
    'Every hop costs crawl budget and delays visitors — chains also break when one link in the middle changes.',
    'Point each redirect at the final URL directly; update internal links to skip the chain.',
    3, 'quick', chains.length === 0, ex(chains.map(c => `${c.url} (${c.hops} hops)`))));
  const lowIn = agg.lowInbound ?? [];
  out.push(mk('site-internal-links', 'Technical SEO', 'low', 'Pages have enough internal links (2+)',
    lowIn.length ? `${lowIn.length} page(s) get 0–1 internal links` : 'Internal link coverage looks healthy',
    'Pages with almost no inbound links receive little authority and are crawled rarely.',
    'Add contextual links from high-authority hub pages; use descriptive, varied anchor text.',
    3, 'normal', lowIn.length === 0, ex(lowIn.map(l => `${l.url} (${l.inbound} inbound)`))));
  // ── Phase B: indexability / images / weight / duplicates ──
  const nonIdx = agg.nonIndexable ?? [];
  const wastePct = agg.crawled ? Math.round((nonIdx.length / agg.crawled) * 100) : 0;
  out.push(mk('site-indexable', 'Technical SEO', 'high', 'Crawl budget spent on indexable pages',
    nonIdx.length ? `${nonIdx.length} of ${agg.crawled} crawled pages (${wastePct}%) will likely never index` : `All ${agg.crawled} crawled pages look indexable`,
    'Errors, noindex tags, conflicting canonicals and ultra-thin pages burn the crawl budget Google would spend on money pages.',
    'Fix errors, remove stray noindex, align canonicals with sitemap URLs, and noindex or merge ultra-thin pages.',
    6, 'normal', nonIdx.length === 0, ex(nonIdx)));
  const dims = agg.dimsPages ?? [];
  const lazy = agg.lazyPages ?? [];
  const imgPages = new Set([...dims.map(d => d.url), ...lazy.map(l => l.url)]);
  out.push(mk('site-images', 'Performance', 'medium', 'Images sized + lazy-loaded site-wide',
    imgPages.size ? `${imgPages.size} page(s) with unsized or eager-loaded images` : 'Image hygiene looks good across crawled pages',
    'Unsized images shift the layout (CLS) and eager images bloat first paint — both fail Core Web Vitals for real visitors.',
    'Add width/height to every <img>, loading="lazy" below the fold, and serve WebP/AVIF at responsive sizes.',
    4, 'normal', imgPages.size === 0,
    { count: imgPages.size, examples: [...dims.slice(0, 3).map(d => `${d.url} (${d.missing}/${d.total} unsized)`), ...lazy.slice(0, 2).map(l => `${l.url} (${l.nonLazy}/${l.total} eager)`)] }));
  const heavy = agg.heavyPages ?? [];
  out.push(mk('site-heavy', 'Performance', 'low', 'No bloated HTML pages (>150KB)',
    heavy.length ? `${heavy.length} page(s) ship over 150KB of HTML` : 'HTML weight looks lean across crawled pages',
    'Bloated HTML delays first paint and exhausts crawler budgets — usually inline scripts, page-builder markup or unpaginated content.',
    'Split vendor JS, paginate long listings, minify HTML and move inline data to deferred scripts.',
    3, 'normal', heavy.length === 0, ex(heavy.map(h => `${h.url} (${h.kb}KB HTML)`))));
  const dupC = agg.dupContent ?? [];
  const dupD = agg.dupDesc ?? [];
  const dupTotal = dupC.reduce((s, g) => s + g.urls.length, 0) + dupD.reduce((s, g) => s + g.urls.length, 0);
  out.push(mk('site-dup-content', 'On-page content', 'medium', 'Unique content per page',
    dupTotal ? `${dupC.length + dupD.length} duplicate group(s) covering ${dupTotal} pages` : 'No duplicate content clusters detected',
    'Near-identical pages force Google to pick one winner — the rest never surface and thin out topical authority.',
    'Differentiate each page with original detail and unique titles/descriptions, or consolidate with 301s + canonicals.',
    4, 'normal', dupTotal === 0,
    { count: dupTotal, examples: [...dupC.slice(0, 3).flatMap(g => g.urls.slice(0, 2)), ...dupD.slice(0, 2).flatMap(g => g.urls.slice(0, 2))].slice(0, 5) }));
  const genA = agg.genericAnchors ?? [];
  const genCount = genA.reduce((s, g) => s + g.count, 0);
  out.push(mk('site-anchors', 'On-page content', 'low', 'Descriptive internal anchor text',
    genA.length ? `${genCount} generic anchor(s): ${genA.slice(0, 3).map(g => `"${g.text}"`).join(', ')}` : 'Anchor text looks descriptive across crawled pages',
    'Generic anchors ("click here") tell neither users nor AI engines what the target page is about.',
    'Rewrite generic anchors with entity-rich text describing the destination page.',
    2, 'quick', genA.length === 0, ex(genA.map(g => `"${g.text}" ×${g.count}`))));
  return out;
}
