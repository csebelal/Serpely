import { fetchPage, normalizeUrl, normUrl, countWords, attrVal, allTags, linkHref, assertPublicTarget, isDisallowedByRobots, stableHost, CRAWLER_UA } from './publicAudit';

export const AUDIT_MAX_URLS = Number(process.env.AUDIT_MAX_URLS || 300);
const DISCOVERY_TIMEOUT_MS = 12000;
const PAGE_TIMEOUT_MS = 10000;
const CRAWL_CONCURRENCY = 5;

export interface CrawledPage {
  url: string;
  finalUrl: string;
  status: number;
  title: string;
  desc: string;
  h1: string;
  h1Count: number;
  canonical: string;
  robotsMeta: string;
  wordCount: number;
  imgs: number;
  imgsNoAlt: number;
  headingSkip: boolean;
  jsonLdTypes: string[];
  loadMs: number;
  internalLinks: string[];
  headers: Record<string, string>;
  redirectHops: number;
  redirectChain: string[];
  // Phase B: image + content signals (static, zero extra requests)
  imgsMissingDims: number;
  imgsNoLazy: number;
  anchors: { text: string; href: string }[];
  bodyHash: string;
  htmlBytes: number;
  /** Absolute external (other-domain) hrefs, capped — powers the Links tab. */
  externalLinks: string[];
  error?: string;
  /** Set when the redirect chain left the requested site; content is NOT crawled. */
  offsite?: string;
}

function first(regex: RegExp, html: string): string {
  const m = html.match(regex);
  return (m?.[1] || '').trim();
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

async function fetchXml(url: string): Promise<string | null> {
  try {
    await assertPublicTarget(url);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), DISCOVERY_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: ctrl.signal, redirect: 'follow',
      headers: { 'User-Agent': CRAWLER_UA, Accept: 'application/xml,text/xml,*/*' },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const text = await res.text().catch(() => '');
    if (!text || !/<(urlset|sitemapindex)/i.test(text)) return null;
    return text.slice(0, 8 * 1024 * 1024);
  } catch { return null; }
}

function parseLocs(xml: string): string[] {
  const out: string[] = [];
  const blocks = xml.match(/<(?:url|sitemap)[\s\S]*?<\/(?:url|sitemap)>/gi) || [];
  for (const b of blocks) {
    const loc = first(/<loc>\s*([^<\s]+)\s*</i, b);
    if (loc) out.push(loc);
  }
  return out;
}

export async function discoverUrls(origin: string, robotsBody: string): Promise<{ urls: string[]; sitemaps: string[] }> {
  const refs = [...robotsBody.matchAll(/sitemap:\s*(\S+)/gi)].map(m => m[1].trim()).filter(u => /^https?:\/\//i.test(u));
  const fallbacks = ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml'].map(p => origin + p);
  const candidates = [...refs, ...fallbacks].slice(0, 12);
  const sitemaps: string[] = [];
  let locs: string[] = [];
  for (const c of candidates) {
    let safe = '';
    try { safe = normalizeUrl(c); } catch { continue; }
    const xml = await fetchXml(safe);
    if (!xml) continue;
    sitemaps.push(safe);
    if (/<sitemapindex/i.test(xml)) {
      for (const child of parseLocs(xml).slice(0, 10)) {
        let cs = '';
        try { cs = normalizeUrl(child); } catch { continue; }
        const cxml = await fetchXml(cs);
        if (cxml) { sitemaps.push(cs); locs.push(...parseLocs(cxml)); }
        if (locs.length >= AUDIT_MAX_URLS) break;
      }
    } else {
      locs.push(...parseLocs(xml));
    }
    if (locs.length > 0) break;
  }
  // Same-origin only, SSRF-safe, deduped
  const seen = new Set<string>();
  const urls: string[] = [];
  const oHost = (() => { try { return new URL(origin).hostname.replace(/^www\./, ''); } catch { return ''; } })();
  for (const l of locs) {
    let u: URL;
    try { u = new URL(l); normalizeUrl(l); } catch { continue; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
    if (u.hostname.replace(/^www\./, '') !== oHost) continue;
    const k = normUrl(l, origin);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    urls.push(l);
    if (urls.length >= AUDIT_MAX_URLS) break;
  }
  return { urls, sitemaps };
}

function parsePage(url: string, html: string, status: number, finalUrl: string, loadMs: number, headers: Record<string, string>, origin: string): CrawledPage {
  const title = first(/<title[^>]*>([^<]*)<\/title>/i, html);
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);
  const desc = metaContent(html, 'name', 'description');
  const robotsMeta = metaContent(html, 'name', 'robots');
  const canonical = linkHref(html, 'canonical');
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const imgsNoAlt = imgs.filter(t => !/alt=/i.test(t)).length;
  // Phase B: images without dimensions cause layout shift; without
  // loading="lazy" they all download on first paint.
  const imgsMissingDims = imgs.filter(t =>
    !/\bwidth\s*=/i.test(t) && !/\bheight\s*=/i.test(t) && !/aspect-ratio/i.test(t)).length;
  const imgsNoLazy = imgs.filter(t => !/loading\s*=\s*["']?lazy/i.test(t)).length;
  // Heading skip: h1->h3 jump or h2 missing between
  const levels = [...html.matchAll(/<h([1-6])\b/gi)].map(m => Number(m[1]));
  let headingSkip = false;
  for (let i = 1; i < levels.length; i++) if (levels[i] - levels[i - 1] > 1) { headingSkip = true; break; }
  const jlTypes: string[] = [];
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let sm: RegExpExecArray | null;
  while ((sm = re.exec(html)) !== null) {
    const open = sm[0].slice(0, sm[0].indexOf('>') + 1);
    if (attrVal(open, 'type').toLowerCase() !== 'application/ld+json') continue;
    for (const mm of sm[1].matchAll(/"@type"\s*:\s*"([^"]+)"/g)) jlTypes.push(mm[1].toLowerCase());
  }
  const internalLinks: string[] = [];
  const anchors: { text: string; href: string }[] = [];
  const seen = new Set<string>();
  // Phase B: anchor texts need full <a>…</a> pairs (allTags returns open tags only)
  const anchorPairs = [...html.matchAll(/<a\b([^>]*)>([\s\S]{0,300}?)<\/a\s*>/gi)].slice(0, 80);
  const anchorTextByHref = new Map<string, string>();
  /* External (other-domain) hrefs — capped, absolute, scheme-checked. */
  const externalLinks: string[] = [];
  try {
    const oHost = new URL(origin).hostname.replace(/^www\./, '');
    for (const t of allTags(html, 'a')) {
      const href = attrVal(t, 'href').trim();
      if (!href || /^(mailto:|tel:|javascript:|data:|#)/i.test(href)) continue;
      let abs = '';
      try {
        const u = new URL(href, finalUrl || url);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
        if (u.hostname.replace(/^www\./, '') !== oHost) {
          if (externalLinks.length < 30) externalLinks.push(u.origin + u.pathname);
          continue;
        }
        abs = u.origin + u.pathname;
      } catch { continue; }
      const k = normUrl(abs, origin);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      if (internalLinks.length < 150) internalLinks.push(k);
    }
    for (const m of anchorPairs) {
      if (anchors.length >= 60) break;
      const href = attrVal(m[1] || '', 'href').trim();
      if (!href || /^(mailto:|tel:|javascript:|data:|#)/i.test(href)) continue;
      let k = '';
      try {
        const u = new URL(href, finalUrl || url);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
        if (u.hostname.replace(/^www\./, '') !== oHost) continue;
        k = normUrl(u.origin + u.pathname, origin);
      } catch { continue; }
      if (!k || anchorTextByHref.has(k)) continue;
      const text = (m[2] || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
      if (!text) continue;
      anchorTextByHref.set(k, text);
      anchors.push({ text, href: k });
    }
  } catch { /* ignore */ }
  // Phase B: content fingerprint for near-duplicate detection (djb2 over
  // normalized body text). Pages under ~100 words are skipped (hash '').
  let bodyHash = '';
  let htmlBytes = 0;
  try {
    htmlBytes = html.length;
    const words = countWords(html);
    if (words >= 100) {
      const txt = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 8000);
      let h = 5381;
      for (let i = 0; i < txt.length; i++) h = ((h << 5) + h + txt.charCodeAt(i)) >>> 0;
      bodyHash = h.toString(16) + ':' + words;
    }
  } catch { /* ignore */ }
  return {
    url, finalUrl, status, title: title.slice(0, 120), desc: desc.slice(0, 200),
    h1: (h1s[0] || '').slice(0, 120), h1Count: h1s.length, canonical,
    robotsMeta, wordCount: countWords(html), imgs: imgs.length, imgsNoAlt,
    imgsMissingDims, imgsNoLazy, anchors, bodyHash, htmlBytes,
    headingSkip, jsonLdTypes: [...new Set(jlTypes)].slice(0, 10),
    loadMs, internalLinks, externalLinks, headers, redirectHops: 0, redirectChain: [],
  };
}

export async function crawlSite(
  origin: string, urls: string[],
  onProgress?: (done: number, total: number) => void,
  robotsBody?: string,
): Promise<CrawledPage[]> {
  // robots.txt compliance: URLs the site's own robots file disallows for
  // user-agent groups `*` / our crawler are skipped entirely (not fetched).
  const list0 = urls.slice(0, AUDIT_MAX_URLS);
  const list = robotsBody
    ? list0.filter(u => {
        try { return !isDisallowedByRobots(robotsBody, new URL(u, origin).pathname || '/'); } catch { return true; }
      })
    : list0;
  const skippedByRobots = list0.length - list.length;
  if (skippedByRobots > 0) {
    console.log(`[crawl] robots.txt disallows ${skippedByRobots}/${list0.length} discovered URLs — skipping them`);
  }
  const out: (CrawledPage | undefined)[] = new Array(list.length);
  let cursor = 0; let done = 0;
  // Manual redirect following so we can record hop count / chains.
  // fetch() with redirect:'follow' hides intermediates — we need them for
  // the redirect-chain check. Every hop is same-site guarded: a redirect to
  // ANOTHER SITE is recorded but that site's content is never crawled, so a
  // redirecting sitemap entry can never smuggle a foreign domain into the report.
  const fetchFinal = async (startUrl: string): Promise<{ res: Response; chain: string[]; offsite?: string }> => {
    const chain = [startUrl];
    const startHost = stableHost(startUrl);
    let current = startUrl;
    for (let hop = 0; hop < 5; hop++) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), PAGE_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(current, {
          signal: ctrl.signal, redirect: 'manual',
          headers: { 'User-Agent': CRAWLER_UA, Accept: 'text/html,application/xhtml+xml' },
        });
      } finally { clearTimeout(t); }
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) return { res, chain };
        try {
          const next = new URL(loc, current).toString();
          if (chain.includes(next)) return { res, chain }; // loop — stop
          if (stableHost(next) !== startHost) {
            try { await res.arrayBuffer().catch(() => undefined); } catch { /* ignore */ }
            return { res, chain, offsite: next };
          }
          chain.push(next);
          current = next;
          // Drain body so the socket can be reused
          try { await res.arrayBuffer().catch(() => undefined); } catch { /* ignore */ }
          continue;
        } catch { return { res, chain }; }
      }
      return { res, chain };
    }
    // Max hops — fetch final destination normally for status/headers
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), PAGE_TIMEOUT_MS);
    try {
      const res = await fetch(current, {
        signal: ctrl.signal, redirect: 'follow',
        headers: { 'User-Agent': CRAWLER_UA, Accept: 'text/html,application/xhtml+xml' },
      });
      return { res, chain: [...chain, res.url || current].filter((v, i, a) => a.indexOf(v) === i) };
    } finally { clearTimeout(t); }
  };
  const worker = async () => {
    while (cursor < list.length) {
      const i = cursor++;
      const u = list[i];
      try {
        await assertPublicTarget(u);
        const start = Date.now();
        const { res, chain, offsite } = await fetchFinal(u);
        const headers: Record<string, string> = {};
        res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
        let parsed: CrawledPage;
        if (offsite) {
          // Redirect left the requested site — record the honest fact, no content.
          parsed = { url: u, finalUrl: offsite, status: res.status, title: '', desc: '', h1: '', h1Count: 0, canonical: '', robotsMeta: '', wordCount: 0, imgs: 0, imgsNoAlt: 0, imgsMissingDims: 0, imgsNoLazy: 0, anchors: [], bodyHash: '', htmlBytes: 0, externalLinks: [], headingSkip: false, jsonLdTypes: [], loadMs: 0, internalLinks: [], headers, redirectHops: Math.max(0, chain.length - 1), redirectChain: chain.slice(0, 6), error: 'redirects to another site' , offsite };
        } else {
          const html = await res.text().catch(() => '');
          parsed = parsePage(u, html.slice(0, 1_500_000), res.status, res.url || chain[chain.length - 1] || u, Date.now() - start, headers, origin);
          parsed.redirectHops = Math.max(0, chain.length - 1);
          parsed.redirectChain = chain.slice(0, 6);
        }
        out[i] = parsed;
      } catch {
        out[i] = { url: u, finalUrl: u, status: 0, title: '', desc: '', h1: '', h1Count: 0, canonical: '', robotsMeta: '', wordCount: 0, imgs: 0, imgsNoAlt: 0, imgsMissingDims: 0, imgsNoLazy: 0, anchors: [], bodyHash: '', htmlBytes: 0, externalLinks: [], headingSkip: false, jsonLdTypes: [], loadMs: 0, internalLinks: [], headers: {}, redirectHops: 0, redirectChain: [], error: 'fetch failed' };
      }
      done++;
      try { onProgress?.(done, list.length); } catch { /* ignore */ }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CRAWL_CONCURRENCY, Math.max(1, list.length)) }, () => worker()));
  return out.filter(Boolean) as CrawledPage[];
}

export interface CrawlAggregates {
  total: number; crawled: number; errors: number;
  broken4xx: { url: string; status: number }[];
  broken5xx: { url: string; status: number }[];
  duplicateTitles: { title: string; urls: string[] }[];
  thinPages: { url: string; words: number }[];
  missingAltPages: { url: string; missing: number; total: number }[];
  headingSkipPages: string[];
  canonicalConflicts: { url: string; canonical: string }[];
  metaDescMissing: string[];
  noSchemaPages: string[];
  avgLoadMs: number;
  // Phase A: link-graph signals
  orphans: string[];
  deepPages: { url: string; depth: number }[];
  redirectChains: { url: string; hops: number; chain: string[] }[];
  lowInbound: { url: string; inbound: number }[];
  // Phase B: image / content / weight signals
  dimsPages: { url: string; missing: number; total: number }[];
  lazyPages: { url: string; nonLazy: number; total: number }[];
  heavyPages: { url: string; kb: number }[];
  dupContent: { hash: string; urls: string[] }[];
  dupDesc: { desc: string; urls: string[] }[];
  genericAnchors: { text: string; count: number }[];
  nonIndexable: string[];
  /** Compact per-page records for the URL detail tabs (homepage first, ≤120). */
  pageStats: PageStat[];
}

/** Compact per-page facts powering the redesigned URL detail tabs (capped). */
export interface PageStat {
  url: string; finalUrl: string; status: number; depth: number; hops: number; loadMs: number;
  title: string; descLen: number; h1Count: number; canonical: string; robotsMeta: string;
  words: number; imgs: number; imgsNoAlt: number; imgsMissingDims: number; imgsNoLazy: number;
  schemaTypes: string[]; internalCount: number; externalLinks: string[];
  offsite?: string; error?: string;
}

export function aggregateCrawl(pages: CrawledPage[], origin: string): CrawlAggregates {
  const crawled = pages.filter(p => p.status === 200);
  const errors = pages.filter(p => p.status === 0 || p.status >= 400);
  const broken4xx = pages.filter(p => p.status === 404 || p.status === 410 || (p.status >= 400 && p.status < 500)).slice(0, 10).map(p => ({ url: p.url, status: p.status }));
  const broken5xx = pages.filter(p => p.status >= 500).slice(0, 10).map(p => ({ url: p.url, status: p.status }));
  const tGroups = new Map<string, string[]>();
  for (const p of crawled) {
    const t = p.title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (t.length >= 10) tGroups.set(t, [...(tGroups.get(t) || []), p.url]);
  }
  const duplicateTitles = [...tGroups.entries()].filter(([, g]) => g.length > 1).slice(0, 5).map(([title, urls]) => ({ title, urls: urls.slice(0, 6) }));
  const thinPages = crawled.filter(p => p.wordCount > 0 && p.wordCount < 300).sort((a, b) => a.wordCount - b.wordCount).slice(0, 8).map(p => ({ url: p.url, words: p.wordCount }));
  const missingAltPages = crawled.filter(p => p.imgsNoAlt > 0).slice(0, 8).map(p => ({ url: p.url, missing: p.imgsNoAlt, total: p.imgs }));
  const headingSkipPages = crawled.filter(p => p.headingSkip).slice(0, 8).map(p => p.url);
  const canonicalConflicts = crawled.filter(p => {
    if (!p.canonical) return false;
    try { return normUrl(p.canonical, origin) !== normUrl(p.finalUrl, origin); } catch { return false; }
  }).slice(0, 8).map(p => ({ url: p.url, canonical: p.canonical }));
  const metaDescMissing = crawled.filter(p => !p.desc || p.desc.length < 50).slice(0, 8).map(p => p.url);
  const noSchemaPages = crawled.filter(p => p.jsonLdTypes.length === 0).slice(0, 5).map(p => p.url);
  const avgLoadMs = crawled.length ? Math.round(crawled.reduce((s, p) => s + p.loadMs, 0) / crawled.length) : 0;
  void fetchPage;

  // ── Phase A: link-graph (inbound counts + click depth via BFS) ──
  // Keys are origin+path normalized so /page, /page/ and ?utm variants collapse.
  const keyOf = (u: string) => normUrl(u, origin);
  const keyToUrl = new Map<string, string>();
  for (const p of crawled) {
    const k = keyOf(p.finalUrl || p.url);
    if (k && !keyToUrl.has(k)) keyToUrl.set(k, p.url);
  }
  const inbound = new Map<string, number>();
  for (const p of crawled) {
    const from = keyOf(p.finalUrl || p.url);
    for (const l of p.internalLinks) {
      const k = keyOf(l);
      if (!keyToUrl.has(k)) continue; // points outside crawled set
      if (k === from) continue; // self-link doesn't count
      inbound.set(k, (inbound.get(k) ?? 0) + 1);
    }
  }
  // BFS depth from homepage (depth 0). Unknown targets get depth of parent+1
  // but only crawled pages are reported.
  const homeKey = (() => {
    const root = keyOf(origin + '/');
    if (keyToUrl.has(root)) return root;
    const first = crawled[0];
    return first ? keyOf(first.finalUrl || first.url) : root;
  })();
  const depth = new Map<string, number>([[homeKey, 0]]);
  const adj = new Map<string, string[]>();
  for (const p of crawled) {
    const from = keyOf(p.finalUrl || p.url);
    adj.set(from, p.internalLinks.map(keyOf).filter(k => k && k !== from));
  }
  const q = [homeKey];
  while (q.length) {
    const cur = q.shift()!;
    const d = depth.get(cur) ?? 0;
    for (const nxt of adj.get(cur) ?? []) {
      if (!depth.has(nxt)) { depth.set(nxt, d + 1); q.push(nxt); }
    }
  }
  const orphans = crawled
    .filter(p => (inbound.get(keyOf(p.finalUrl || p.url)) ?? 0) === 0 && keyOf(p.finalUrl || p.url) !== homeKey)
    .slice(0, 8).map(p => p.url);
  const deepPages = crawled
    .filter(p => (depth.get(keyOf(p.finalUrl || p.url)) ?? 0) > 3)
    .map(p => ({ url: p.url, depth: depth.get(keyOf(p.finalUrl || p.url)) ?? 0 }))
    .sort((a, b) => b.depth - a.depth).slice(0, 8);
  const redirectChains = pages
    .filter(p => (p.redirectHops ?? 0) >= 2)
    .slice(0, 8).map(p => ({ url: p.url, hops: p.redirectHops, chain: p.redirectChain.slice(0, 5) }));
  const lowInbound = crawled
    .filter(p => {
      const k = keyOf(p.finalUrl || p.url);
      if (k === homeKey) return false;
      return (inbound.get(k) ?? 0) <= 1;
    })
    .map(p => ({ url: p.url, inbound: inbound.get(keyOf(p.finalUrl || p.url)) ?? 0 }))
    .sort((a, b) => a.inbound - b.inbound).slice(0, 8);

  // ── Phase B: images / weight / duplicates / anchors / indexability ──
  const dimsPages = crawled.filter(p => p.imgsMissingDims > 0)
    .map(p => ({ url: p.url, missing: p.imgsMissingDims, total: p.imgs }))
    .sort((a, b) => b.missing - a.missing).slice(0, 8);
  const lazyPages = crawled.filter(p => p.imgs > 2 && p.imgsNoLazy > 2)
    .map(p => ({ url: p.url, nonLazy: p.imgsNoLazy, total: p.imgs }))
    .sort((a, b) => b.nonLazy - a.nonLazy).slice(0, 8);
  const heavyPages = crawled.filter(p => p.htmlBytes > 150 * 1024)
    .map(p => ({ url: p.url, kb: Math.round(p.htmlBytes / 1024) }))
    .sort((a, b) => b.kb - a.kb).slice(0, 8);
  const hashGroups = new Map<string, string[]>();
  for (const p of crawled) {
    if (!p.bodyHash) continue;
    hashGroups.set(p.bodyHash, [...(hashGroups.get(p.bodyHash) || []), p.url]);
  }
  const dupContent = [...hashGroups.entries()].filter(([, g]) => g.length > 1)
    .slice(0, 5).map(([hash, urls]) => ({ hash, urls: urls.slice(0, 6) }));
  const descGroups = new Map<string, string[]>();
  for (const p of crawled) {
    const d = (p.desc || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (d.length < 40) continue;
    descGroups.set(d, [...(descGroups.get(d) || []), p.url]);
  }
  const dupDesc = [...descGroups.entries()].filter(([, g]) => g.length > 1)
    .slice(0, 5).map(([desc, urls]) => ({ desc: desc.slice(0, 80), urls: urls.slice(0, 6) }));
  const GENERIC = new Set(['click here', 'read more', 'learn more', 'here', 'more', 'link', 'page', 'website']);
  const anchorCounts = new Map<string, number>();
  for (const p of crawled) {
    for (const a of p.anchors) {
      const t = a.text.toLowerCase().trim();
      if (GENERIC.has(t) || /^click here/i.test(t) || /^read more/i.test(t)) {
        anchorCounts.set(a.text, (anchorCounts.get(a.text) ?? 0) + 1);
      }
    }
  }
  const genericAnchors = [...anchorCounts.entries()]
    .map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  // Log-less crawl-budget estimate: pages unlikely to ever index
  const canonSet = new Set(canonicalConflicts.map(c => keyOf(c.url)));
  const nonIndexable = crawled.filter(p => {
    const k = keyOf(p.finalUrl || p.url);
    if (p.status !== 200) return true;
    if (/noindex|none/i.test(p.robotsMeta || '')) return true;
    if (canonSet.has(k)) return true;
    if (p.wordCount > 0 && p.wordCount < 100) return true;
    return false;
  }).slice(0, 10).map(p => p.url);

  // ── Per-page facts for the redesigned URL detail tabs (capped) ──
  // Homepage first so the primary URL always has real data, then crawl order.
  const homeFirst = [...crawled].sort((a, b) =>
    (keyOf(a.finalUrl || a.url) === homeKey ? 0 : 1) - (keyOf(b.finalUrl || b.url) === homeKey ? 0 : 1));
  const pageStats: PageStat[] = homeFirst.slice(0, 120).map(p => ({
    url: p.url,
    finalUrl: p.finalUrl,
    status: p.status,
    depth: depth.get(keyOf(p.finalUrl || p.url)) ?? 0,
    hops: p.redirectHops ?? 0,
    loadMs: p.loadMs,
    title: p.title,
    descLen: (p.desc || '').length,
    h1Count: p.h1Count,
    canonical: p.canonical,
    robotsMeta: p.robotsMeta,
    words: p.wordCount,
    imgs: p.imgs,
    imgsNoAlt: p.imgsNoAlt,
    imgsMissingDims: p.imgsMissingDims,
    imgsNoLazy: p.imgsNoLazy,
    schemaTypes: p.jsonLdTypes,
    internalCount: p.internalLinks?.length ?? 0,
    externalLinks: (p.externalLinks ?? []).slice(0, 15),
    offsite: p.offsite,
    error: p.error,
  }));

  return { total: pages.length, crawled: crawled.length, errors: errors.length, broken4xx, broken5xx, duplicateTitles, thinPages, missingAltPages, headingSkipPages, canonicalConflicts, metaDescMissing, noSchemaPages, avgLoadMs, orphans, deepPages, redirectChains, lowInbound, dimsPages, lazyPages, heavyPages, dupContent, dupDesc, genericAnchors, nonIndexable, pageStats };
}
