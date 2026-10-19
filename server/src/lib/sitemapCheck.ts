import { FetchedPage, fetchPage, normalizeUrl, normUrl, isDisallowedByRobots, countWords,
  computeIndexGates, attrVal, allTags, linkHref, type IndexGate } from './publicAudit';
import { detectProtection, type ProtectionHit } from './protection';

export const MAX_URLS_PER_RUN = 1000;
const MAX_SITEMAPS = 10;
// A full 50k-URL sitemap is ~6MB uncompressed (spec max is 50MB) — accept it,
// but only the first MAX_URLS_PER_RUN get live-checked (see below).
const MAX_XML_BYTES = 55 * 1024 * 1024;
const MAX_TOTAL_ENTRIES = 55000;
const FETCH_CONCURRENCY = 8;
// Hard ceiling per run. Note: nginx proxy_read_timeout (default 60s) also bounds
// synchronous runs — see the dedicated location block for /api/sitemap-check/run.
const RUN_TIMEOUT_MS = 8 * 60 * 1000;

export interface SitemapRef { url: string; source: 'robots' | 'fallback'; ok: boolean }
export interface SitemapUrlEntry { loc: string; lastmod: string }
export interface CheckedUrl {
  url: string; status: number; finalUrl: string;
  verdict: 'Healthy' | 'Redirected' | 'Broken' | 'Blocked' | 'Non-canonical' | 'Slow';
  detail: string; title: string; desc: string; h1: string; words: number;
  loadMs: number; canonical: string;
  gates: IndexGate[]; score: number;
}
export interface SiteIssue {
  code: 'dup-titles' | 'dup-descs' | 'thin-content' | 'stale-content' | 'broken-internal' | 'orphan-risk';
  title: string; detail: string; urls: string[];
}
export interface SitemapSummary {
  origin: string; sitemaps: SitemapRef[];
  totalUrls: number; checked: number; truncated: boolean;
  healthy: number; redirected: number; broken: number; blocked: number; nonCanonical: number; slow: number;
  healthScore: number; lastmodCoverage: number;
  duplicateUrls: string[]; variantNotes: string[];
  siteIssues: SiteIssue[];
  elapsedMs: number;
}

// Normalized key for cross-page matching (host with www- stripped, path only).
function pageKey(u: string, origin: string): string {
  try {
    const p = new URL(u, origin);
    return (p.origin + p.pathname).toLowerCase().replace(/:\/\/www\./, '://').replace(/\/$/, '');
  } catch { return ''; }
}

function first(regex: RegExp, html: string): string {
  const m = html.match(regex);
  return (m?.[1] || '').trim();
}

async function fetchXml(url: string): Promise<{ text: string; protection: ProtectionHit | null } | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, {
      signal: ctrl.signal, redirect: 'follow',
      headers: { 'User-Agent': 'SerpelyAuditBot/1.0 (+https://serpely.com/sitemap-checker)', Accept: 'application/xml,text/xml,*/*' },
    });
    clearTimeout(t);
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    const text = await res.text().catch(() => '');
    const protection = detectProtection(res.status, headers, text);
    if (protection) return { text: '', protection };
    if (!res.ok) return null;
    if (!text || !/<(urlset|sitemapindex)/i.test(text)) return null;
    return { text: text.slice(0, MAX_XML_BYTES), protection: null };
  } catch {
    return null;
  }
}

function parseIndex(xml: string): string[] {
  const out: string[] = [];
  const blocks = xml.match(/<sitemap[\s\S]*?<\/sitemap>/gi) || [];
  for (const b of blocks) {
    const loc = first(/<loc>\s*([^<\s]+)\s*</i, b);
    if (loc) out.push(loc);
  }
  return out;
}

function parseUrlset(xml: string): SitemapUrlEntry[] {
  const out: SitemapUrlEntry[] = [];
  const blocks = xml.match(/<url[\s\S]*?<\/url>/gi) || [];
  for (const b of blocks) {
    const loc = first(/<loc>\s*([^<\s]+)\s*</i, b);
    if (loc) out.push({ loc, lastmod: first(/<lastmod>\s*([^<\s]+)\s*</i, b) });
  }
  return out;
}

// Static sitemap-shape problems (no page fetch needed).
function variantNotesFor(loc: string, origin: string, seen: Set<string>): string[] {
  const notes: string[] = [];
  let u: URL;
  try { u = new URL(loc); } catch { return [`Not a valid URL: ${loc}`]; }
  if (u.protocol === 'http:') notes.push(`Uses http instead of https: ${loc}`);
  if (/[A-Z]/.test(u.pathname)) notes.push(`Uppercase characters in path (URLs should be lowercase): ${loc}`);
  if (u.search) notes.push(`Query string in sitemap URL (sitemaps should list clean canonical URLs): ${loc}`);
  if (/sid|sessionid|phpsessid|utm_/i.test(u.search)) notes.push(`Tracking/session parameter in sitemap URL: ${loc}`);
  if (/\.(pdf|zip|docx?|xlsx?|pptx?)$/i.test(u.pathname)) notes.push(`Non-HTML file in sitemap: ${loc}`);
  const key = normUrl(loc, origin);
  if (seen.has(key)) notes.push(`Duplicate URL in sitemap: ${loc}`);
  seen.add(key);
  try {
    const originHost = new URL(origin).hostname.replace(/^www\./, '');
    const locHost = u.hostname.replace(/^www\./, '');
    if (locHost !== originHost) notes.push(`Different host than the checked site: ${loc}`);
  } catch { /* ignore */ }
  return notes;
}

function verdictFor(page: FetchedPage | null, requested: string, canonical: string, robotsMeta: string, xRobots: string, disallowed: boolean, protection: { provider: string; evidence: string } | null | undefined): { verdict: CheckedUrl['verdict']; detail: string } {
  if (!page) return { verdict: 'Broken', detail: 'Could not fetch (timeout, DNS or blocked)' };
  if (protection) return { verdict: 'Blocked', detail: `${protection.provider} human-verification challenge — page could not be checked (allowlist the checker or verify manually)` };
  if (page.status >= 500) return { verdict: 'Broken', detail: `Server error HTTP ${page.status}` };
  if (page.status === 404 || page.status === 410) return { verdict: 'Broken', detail: `HTTP ${page.status} — remove from sitemap or redirect` };
  if (page.status >= 400) return { verdict: 'Broken', detail: `HTTP ${page.status}` };
  if (/noindex|none/i.test(robotsMeta) || /noindex|none/i.test(xRobots)) {
    return { verdict: 'Blocked', detail: 'Page says noindex — it can never appear in Google while blocked' };
  }
  if (disallowed) return { verdict: 'Blocked', detail: 'robots.txt disallows this path — Google will not crawl it' };
  const finalUrl = page.finalUrl || requested;
  if (finalUrl !== requested) return { verdict: 'Redirected', detail: `Redirects to ${finalUrl} — sitemap should list the final URL` };
  if (canonical) {
    try {
      const o = new URL(requested).origin;
      if (normUrl(canonical, o) !== normUrl(finalUrl, o)) {
        return { verdict: 'Non-canonical', detail: `Canonical points elsewhere (${canonical}) — sitemap should list the canonical` };
      }
    } catch { /* ignore */ }
  }
  if (page.loadMs > 3000) return { verdict: 'Slow', detail: `Took ${(page.loadMs / 1000).toFixed(1)}s to fetch — slow pages get crawled less` };
  return { verdict: 'Healthy', detail: 'Opens fast, indexable, canonical is clean' };
}

export async function runSitemapCheck(input: string): Promise<{
  origin: string; sitemaps: SitemapRef[]; entries: SitemapUrlEntry[];
  urls: CheckedUrl[]; summary: SitemapSummary; challengeProvider: string | null;
}> {
  const started = Date.now();
  const normalized = normalizeUrl(input);
  const origin = new URL(normalized).origin;
  const timedOut = () => Date.now() - started > RUN_TIMEOUT_MS;

  // ── 1. Discover sitemaps ──
  let robotsBody = '';
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch(origin + '/robots.txt', { signal: ctrl.signal });
    clearTimeout(t);
    if (r.ok) robotsBody = await r.text().catch(() => '');
  } catch { /* no robots.txt */ }
  const robotsRefs = [...robotsBody.matchAll(/sitemap:\s*(\S+)/gi)].map(m => m[1].trim()).filter(u => /^https?:\/\//i.test(u));
  const fallbacks = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml', '/wp-sitemap.xml'].map(p => origin + p);

  const sitemaps: SitemapRef[] = [];
  const xmlByUrl = new Map<string, string>();
  let challengeProvider: string | null = null;
  const tryAdd = async (url: string, source: 'robots' | 'fallback') => {
    if (sitemaps.length >= MAX_SITEMAPS || timedOut()) return;
    let safe = '';
    try { safe = normalizeUrl(url); } catch { sitemaps.push({ url, source, ok: false }); return; }
    if ([...xmlByUrl.keys()].includes(safe)) return;
    const got = await fetchXml(safe);
    if (got?.protection && !challengeProvider) challengeProvider = got.protection.provider;
    sitemaps.push({ url: safe, source, ok: !!got?.text });
    if (got?.text) xmlByUrl.set(safe, got.text);
  };
  for (const u of robotsRefs) await tryAdd(u, 'robots');
  if (xmlByUrl.size === 0) {
    for (const u of fallbacks) {
      await tryAdd(u, 'fallback');
      if (xmlByUrl.size > 0) break;
    }
  }

  // ── 2. Parse (recurse indexes, cap children + total entries) ──
  let entries: SitemapUrlEntry[] = [];
  let indexCount = 0;
  const entryBudget = () => entries.length < MAX_TOTAL_ENTRIES;
  for (const [, xml] of xmlByUrl) {
    if (!entryBudget()) break;
    if (/<sitemapindex/i.test(xml) && indexCount < MAX_SITEMAPS) {
      for (const child of parseIndex(xml).slice(0, MAX_SITEMAPS - indexCount)) {
        if (!entryBudget() || timedOut()) break;
        let safe = '';
        try { safe = normalizeUrl(child); } catch { continue; }
        if ([...xmlByUrl.keys()].includes(safe)) continue;
        const got = await fetchXml(safe);
        if (got?.protection && !challengeProvider) challengeProvider = got.protection.provider;
        sitemaps.push({ url: safe, source: 'robots', ok: !!got?.text });
        if (got?.text) {
          xmlByUrl.set(safe, got.text);
          indexCount++;
          if (/<urlset/i.test(got.text)) {
            for (const e of parseUrlset(got.text)) {
              if (!entryBudget()) break;
              entries.push(e);
            }
          }
        }
        if (timedOut()) break;
      }
    } else if (/<urlset/i.test(xml)) {
      for (const e of parseUrlset(xml)) {
        if (!entryBudget()) break;
        entries.push(e);
      }
    }
  }

  // Dedupe by normalized loc, keep first lastmod — but record exact duplicates first.
  const rawCounts = new Map<string, number>();
  for (const e of entries) {
    rawCounts.set(e.loc, (rawCounts.get(e.loc) || 0) + 1);
  }
  const duplicateUrls = [...rawCounts.entries()].filter(([, n]) => n > 1).map(([loc]) => loc);
  const seenLoc = new Map<string, SitemapUrlEntry>();
  for (const e of entries) {
    const k = normUrl(e.loc, origin);
    if (!seenLoc.has(k)) seenLoc.set(k, e);
  }
  entries = [...seenLoc.values()];
  const totalUrls = entries.length;
  const truncated = totalUrls > MAX_URLS_PER_RUN;
  const workList = entries.slice(0, MAX_URLS_PER_RUN);

  // ── 3. Static shape notes ──
  const seen = new Set<string>();
  const variantNotes: string[] = [];
  for (const e of workList) {
    variantNotes.push(...variantNotesFor(e.loc, origin, seen));
  }
  const lastmodCoverage = workList.length
    ? Math.round((workList.filter(e => !!e.lastmod).length / workList.length) * 100)
    : 0;

  // Sitemap loc list for the shared in-sitemap gate
  const smLocs = entries.map(e => normUrl(e.loc, origin));
  const sitemapHasUrls = entries.length > 0;

  // ── 4. Live per-URL checks (bounded concurrency) ──
  const urls: CheckedUrl[] = new Array(workList.length);
  const outlinks: string[][] = new Array(workList.length);
  let cursor = 0;
  const titleOf = (html: string) => first(/<title[^>]*>([^<]*)<\/title>/i, html);
  const h1Of = (html: string): string => {
    const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    return m ? m[1].replace(/<[^>]+>/g, '').trim().slice(0, 90) : '';
  };
  const metaOf = (html: string, attr: string, name: string) => {
    for (const t of allTags(html, 'meta')) {
      if (attrVal(t, attr).toLowerCase() === name.toLowerCase()) {
        const v = attrVal(t, 'content');
        if (v) return v;
      }
    }
    return '';
  };
  const worker = async () => {
    while (cursor < workList.length && !timedOut()) {
      const i = cursor++;
      const entry = workList[i];
      let page: FetchedPage | null = null;
      try {
        const p = await fetchPage(entry.loc);
        page = p.status < 400 && p.html ? p : { ...p, html: p.html || '' };
        if (p.status >= 400) page = p;
      } catch {
        page = null;
      }
      const html = page?.html || '';
      const title = titleOf(html);
      const desc = metaOf(html, 'name', 'description');
      const h1 = h1Of(html);
      const words = page ? countWords(html) : 0;
      // Same-origin outlinks for the cross-page link graph (cap per page, skip self).
      const links: string[] = [];
      if (page && page.status < 400) {
        const selfKey = pageKey(page.finalUrl || entry.loc, origin);
        const seenL = new Set<string>();
        for (const t of allTags(html, 'a')) {
          if (links.length >= 150) break;
          const href = attrVal(t, 'href').trim();
          if (!href || /^(mailto:|tel:|javascript:|data:|#)/i.test(href)) continue;
          let abs = '';
          try {
            const u = new URL(href, page.finalUrl || entry.loc);
            if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
            abs = u.origin + u.pathname;
          } catch { continue; }
          const k = pageKey(abs, origin);
          if (!k || k === selfKey || seenL.has(k)) continue;
          try {
            const oh = new URL(origin).hostname.replace(/^www\./, '');
            const lh = new URL(abs).hostname.replace(/^www\./, '');
            if (oh !== lh) continue;
          } catch { continue; }
          seenL.add(k);
          links.push(k);
        }
      }
      outlinks[i] = links;
      const robotsMeta = metaOf(html, 'name', 'robots');
      const canonical = linkHref(html, 'canonical');
      const xRobots = page?.headers['x-robots-tag'] || '';
      let urlPath = '/';
      try { urlPath = new URL(page?.finalUrl || entry.loc).pathname || '/'; } catch { /* keep / */ }
      const disallowed = isDisallowedByRobots(robotsBody, urlPath);
      const { verdict, detail } = verdictFor(page, entry.loc, canonical, robotsMeta, xRobots, disallowed, page?.protection);
      let gates: IndexGate[] = [];
      let score = 0;
      if (page) {
        const g = computeIndexGates({
          page, normalizedUrl: entry.loc, origin, robotsBody,
          sitemapLocs: smLocs, sitemapHasUrls, title, desc, canonical, robots: robotsMeta,
        });
        gates = g.gates;
        score = g.score;
      }
      urls[i] = {
        url: entry.loc,
        status: page?.status ?? 0,
        finalUrl: page?.finalUrl || entry.loc,
        verdict, detail, title: title.slice(0, 90), desc: desc.slice(0, 160), h1, words,
        loadMs: page?.loadMs ?? 0, canonical, gates, score,
      };
    }
  };
  await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, workList.length) }, () => worker()));

  const rows = urls.filter(Boolean);
  const count = (v: CheckedUrl['verdict']) => rows.filter(u => u.verdict === v).length;
  const healthy = count('Healthy');
  const healthScore = rows.length ? Math.round((healthy / rows.length) * 100) : 0;
  // Truncated when: more URLs than the per-run cap, OR the run guard stopped early.
  const wasCutShort = truncated || timedOut() || rows.length < workList.length;

  // ── 5. Cross-page rollups (zero new requests — all from fetched HTML) ──
  const normTitle = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').trim();
  const titleGroups = new Map<string, string[]>();
  const descGroups = new Map<string, string[]>();
  for (const r of rows) {
    if (r.status !== 200) continue;
    const t = normTitle(r.title);
    if (t.length >= 10) {
      if (!titleGroups.has(t)) titleGroups.set(t, []);
      titleGroups.get(t)!.push(r.url);
    }
    const dKey = normTitle(r.desc || '');
    if (dKey.length >= 20) {
      if (!descGroups.has(dKey)) descGroups.set(dKey, []);
      descGroups.get(dKey)!.push(r.url);
    }
  }
  const dupTitleGroups = [...titleGroups.values()].filter(g => g.length > 1).slice(0, 8);
  const dupDescGroups = [...descGroups.values()].filter(g => g.length > 1).slice(0, 8);
  const thinPages = rows
    .filter(r => r.status === 200 && r.words > 0 && r.words < 300)
    .sort((a, b) => a.words - b.words)
    .slice(0, 8);
  const lastmodByLoc = new Map(workList.map(e => [e.loc, e.lastmod]));
  const yearAgo = Date.now() - 365 * 86400000;
  const stalePages = rows
    .filter(r => {
      const lm = lastmodByLoc.get(r.url) || '';
      const t = lm ? Date.parse(lm) : NaN;
      return Number.isFinite(t) && t < yearAgo;
    })
    .slice(0, 8);
  // Inbound link graph across checked pages.
  const inbound = new Map<string, number>();
  const checkedByKey = new Map<string, CheckedUrl>();
  for (const r of rows) {
    const k1 = pageKey(r.url, origin);
    const k2 = pageKey(r.finalUrl, origin);
    if (k1 && !checkedByKey.has(k1)) checkedByKey.set(k1, r);
    if (k2 && !checkedByKey.has(k2)) checkedByKey.set(k2, r);
  }
  for (let i = 0; i < workList.length; i++) {
    for (const k of outlinks[i] || []) {
      inbound.set(k, (inbound.get(k) || 0) + 1);
    }
  }
  const brokenInternal: { from: string; to: string; status: number }[] = [];
  for (let i = 0; i < workList.length && brokenInternal.length < 10; i++) {
    for (const k of outlinks[i] || []) {
      const hit = checkedByKey.get(k);
      if (hit && hit.status >= 400 && brokenInternal.length < 10) {
        brokenInternal.push({ from: workList[i].loc, to: hit.url, status: hit.status });
      }
    }
  }
  const orphanRisk = rows
    .filter(r => r.status === 200 && (inbound.get(pageKey(r.finalUrl || r.url, origin)) || 0) === 0)
    .slice(0, 10)
    .map(r => r.url);
  const siteIssues: SiteIssue[] = [];
  if (dupTitleGroups.length) siteIssues.push({
    code: 'dup-titles', title: 'Duplicate page titles',
    detail: `${dupTitleGroups.reduce((s, g) => s + g.length, 0)} pages share ${dupTitleGroups.length} identical titles — Google may index only one of each set.`,
    urls: dupTitleGroups.flat().slice(0, 12),
  });
  if (dupDescGroups.length) siteIssues.push({
    code: 'dup-descs', title: 'Duplicate meta descriptions',
    detail: `${dupDescGroups.reduce((s, g) => s + g.length, 0)} pages share ${dupDescGroups.length} identical descriptions — write a unique one per page.`,
    urls: dupDescGroups.flat().slice(0, 12),
  });
  if (thinPages.length) siteIssues.push({
    code: 'thin-content', title: 'Thin pages (under 300 words)',
    detail: `${thinPages.length} checked pages have little readable text — thin pages rarely rank or earn citations.`,
    urls: thinPages.map(r => `${r.url} (${r.words} words)`),
  });
  if (stalePages.length) siteIssues.push({
    code: 'stale-content', title: 'Stale pages (no update in 12+ months)',
    detail: `${stalePages.length} pages show a lastmod older than a year — refresh or confirm they are still accurate.`,
    urls: stalePages.map(r => `${r.url} (${lastmodByLoc.get(r.url)})`),
  });
  if (brokenInternal.length) siteIssues.push({
    code: 'broken-internal', title: 'Broken internal links',
    detail: `${brokenInternal.length} links point at listed pages that return errors — fix the targets or update the links.`,
    urls: brokenInternal.map(b => `${b.from} → ${b.to} (HTTP ${b.status})`),
  });
  if (orphanRisk.length) siteIssues.push({
    code: 'orphan-risk', title: 'Pages with no internal links found',
    detail: `${orphanRisk.length} sitemap pages receive no links from any checked page — link them from relevant content or they may never be crawled.`,
    urls: orphanRisk,
  });

  const summary: SitemapSummary = {
    origin,
    sitemaps,
    totalUrls,
    checked: rows.length,
    truncated: wasCutShort,
    healthy,
    redirected: count('Redirected'),
    broken: count('Broken'),
    blocked: count('Blocked'),
    nonCanonical: count('Non-canonical'),
    slow: count('Slow'),
    healthScore,
    lastmodCoverage,
    duplicateUrls: duplicateUrls.slice(0, 20),
    variantNotes: variantNotes.slice(0, 30),
    siteIssues,
    elapsedMs: Date.now() - started,
  };
  return { origin, sitemaps, entries: workList, urls: rows, summary, challengeProvider };
}
