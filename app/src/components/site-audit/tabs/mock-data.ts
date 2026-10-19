/* ===========================================================================
 * MOCK DATA — NOT REAL. Every export in this file fabricates plausible-looking
 * values from a deterministic hash of the URL + tab id.
 *
 * THE ENTIRE FILE IS MOCK DATA.
 *
 * It exists so the eight "not yet collected" L2 URL-detail tabs (search, gaps,
 * check, insights, schema, links, images, css) render exactly like the HTML
 * prototype in development. Nothing here talks to a backend. Callers MUST gate
 * `genUrlTabData()` behind `import.meta.env.DEV` (see MockTabs.tsx) so that a
 * production build never fabricates crawl data.
 *
 * Ported from `genUrlTabData()` + helpers in the serpely_audit_redesign prototype.
 * =========================================================================== */

import type { UrlDetail } from '../types';

/* ---------------------------------------------------------------------------
 * Keyword / asset banks (prototype lines 2744-2789)
 * ------------------------------------------------------------------------- */

/* Topic → keyword bank. Falls back to a derived bank when topic is unknown. */
export const TOPIC_KEYWORDS: Record<string, string[]> = {
  'agentic seo': ['agentic seo', 'ai search agents', 'llm seo', 'ai search optimization', 'geo seo', 'agentic search'],
  'seo audit': ['seo audit', 'site audit', 'seo audit tool', 'technical seo audit', 'crawl audit', 'website audit'],
  'old guide': ['seo guide', 'seo tutorial', 'seo checklist', 'old seo guide', 'seo playbook', 'seo methodology'],
  'seo 101': ['seo basics', 'seo 101', 'what is seo', 'seo for beginners', 'how to do seo', 'learn seo'],
  pricing: ['seo pricing', 'seo tool pricing', 'serpely pricing', 'seo software cost', 'best seo platform pricing', 'seo suite pricing'],
  features: ['seo features', 'seo tool features', 'serpely features', 'seo software features', 'ai seo features', 'seo automation'],
  about: ['about serpely', 'seo company', 'seo tool company', 'serpely about', 'who is serpely', 'seo startup'],
  contact: ['contact serpely', 'seo support', 'serpely contact', 'seo help', 'seo customer service'],
  'sitemap xml': ['xml sitemap', 'sitemap generator', 'seo sitemap', 'sitemap submission', 'google sitemap', 'sitemap validator'],
  home: ['seo', 'search engine optimization', 'seo tool', 'seo software', 'serpely', 'best seo tool'],
  overview: ['seo overview', 'seo platform overview', 'seo tool comparison', 'seo suite', 'serpely overview', 'seo platform'],
  related: ['seo related topics', 'seo resources', 'seo glossary', 'seo terms', 'seo knowledge base', 'seo concepts'],
  faq: ['seo faq', 'seo questions', 'seo help', 'seo answers', 'common seo questions', 'seo faqs'],
  comparison: ['seo tools comparison', 'best seo tool', 'seo software compared', 'serpely vs ahrefs', 'serpely vs semrush', 'seo tool review'],
  onboarding: ['seo onboarding', 'serpely setup', 'seo tool setup', 'serpely onboarding', 'getting started with seo', 'seo platform setup'],
  integrations: ['seo integrations', 'serpely integrations', 'seo api', 'seo tool integrations', 'seo platform integrations', 'serpely api'],
  'seo-audit': ['seo audit', 'site audit', 'seo audit tool', 'technical seo audit', 'crawl audit', 'website audit'],
  'old-feature': ['legacy seo feature', 'old seo tool', 'seo feature update', 'deprecated seo tool', 'seo tool migration', 'seo feature comparison'],
  enterprise: ['enterprise seo', 'seo enterprise platform', 'serpely enterprise', 'seo for enterprise', 'enterprise seo tool', 'large scale seo'],
  team: ['seo team', 'serpely team', 'seo company team', 'seo leadership', 'seo experts', 'serpely people'],
  mission: ['seo mission', 'serpely mission', 'seo company mission', 'seo vision', 'serpely vision', 'seo values'],
  history: ['seo history', 'serpely history', 'seo company history', 'seo evolution', 'seo milestones', 'serpely timeline'],
  resources: ['seo resources', 'seo guides', 'seo documentation', 'seo knowledge base', 'seo learning center', 'seo blog'],
  guide: ['seo guide', 'seo tutorial', 'seo checklist', 'seo playbook', 'seo methodology', 'seo strategy guide'],
  intro: ['seo intro', 'seo introduction', 'seo basics', 'seo overview', 'getting started seo', 'seo starter'],
  advanced: ['advanced seo', 'advanced seo techniques', 'expert seo', 'seo advanced guide', 'seo pro tips', 'seo deep dive'],
  basics: ['seo basics', 'seo 101', 'seo fundamentals', 'seo basics guide', 'seo for beginners', 'learn seo'],
  'agentic-seo': ['agentic seo', 'ai search agents', 'llm seo', 'ai search optimization', 'geo seo', 'agentic search'],
  'ai-search': ['ai search', 'ai search engines', 'ai answer engines', 'ai search optimization', 'ai overviews', 'generative search'],
  'llm-citations': ['llm citations', 'ai citations', 'llm seo', 'ai answer citations', 'llm mentions', 'llm visibility'],
  'seo-101': ['seo basics', 'seo 101', 'what is seo', 'seo for beginners', 'how to do seo', 'learn seo'],
};

export const COMPETITORS = ['ahrefs.com', 'semrush.com', 'moz.com', 'searchenginejournal.com', 'backlinko.com', 'semrush.com'];

export const IMAGE_FILENAMES = [
  'hero-banner.webp', 'dashboard-screenshot.png', 'feature-comparison.jpg', 'logo-mark.svg', 'og-preview.png',
  'author-avatar.jpg', 'chart-metrics.webp', 'testimonial-bg.jpg', 'infographic.png', 'team-photo.jpg',
];

export const CSS_FILENAMES = [
  'main.min.css', 'components.css', 'theme-tokens.css', 'critical.css', 'print.css', 'responsive.css', 'animations.css', 'forms.css',
];

export const SCHEMA_TYPES: Array<{ type: string; props: number }> = [
  { type: 'Article', props: 8 },
  { type: 'BreadcrumbList', props: 4 },
  { type: 'Organization', props: 12 },
  { type: 'WebPage', props: 6 },
  { type: 'FAQPage', props: 5 },
  { type: 'Person', props: 7 },
  { type: 'WebSite', props: 5 },
];

/* ---------------------------------------------------------------------------
 * Helpers (prototype lines 2792-2834)
 * ------------------------------------------------------------------------- */

/** Derive a human-readable topic string from a URL path (used to seed keyword generation). */
export function urlTopic(url: string): string {
  /* Task 6: url may now be a full absolute URL (https://serpely.com/...) — strip protocol+host first. */
  const cleaned = String(url || '/')
    .replace(/^https?:\/\/[^/?#]+/i, '')
    .replace(/^\//, '')
    .split('?')[0]
    .split('#')[0];
  const segments = cleaned.split('/').filter(function (s) {
    return s.length > 0;
  });
  if (!segments.length) return 'home';
  /* NB: the prototype object literal repeats the `blog` key; de-duplicated here
     (same value), otherwise TypeScript rejects the duplicate property name. */
  const skip: Record<string, number> = {
    blog: 1, category: 1, resources: 1, tag: 1, tags: 1, page: 1,
    'wp-content': 1, uploads: 1, docs: 1, help: 1, support: 1,
  };
  const meaningful = segments.filter(function (s) {
    return !skip[s.toLowerCase()] && !/^\d+$/.test(s);
  });
  const last = meaningful.length ? meaningful[meaningful.length - 1] : segments[segments.length - 1] || 'home';
  const topic = last.replace(/[-_]/g, ' ').trim();
  return topic || 'seo';
}

/** Look up keywords for a topic, falling back to a derived bank when not found. */
export function topicKeywords(topic: string): string[] {
  const t = String(topic || '').toLowerCase();
  const bank = TOPIC_KEYWORDS[t];
  if (bank) return bank;
  /* Derive: lead with the topic itself, then add common SEO suffixes. */
  return [topic, 'best ' + topic, topic + ' guide', topic + ' tools', 'how to ' + topic, topic + ' tutorial'];
}

export function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/* ---------------------------------------------------------------------------
 * Per-tab data shapes
 * ------------------------------------------------------------------------- */

export interface SearchQueryRow {
  kw: string;
  pos: number;
  imp: number;
  clicks: number;
}

export interface SearchCountry {
  name: string;
  pct: number;
}

export interface SearchTabData {
  tabId: 'search';
  impressions: number;
  clicks: number;
  position: number;
  ctr: number;
  clicksDelta: number;
  posDelta: number;
  queries: SearchQueryRow[];
  countries: SearchCountry[];
}

export interface GapRow {
  kw: string;
  comp: string;
  pos: number;
  vol: number;
}

export interface GapsTabData {
  tabId: 'gaps';
  gaps: GapRow[];
  competitorCount: number;
}

export interface CheckTabData {
  tabId: 'check';
  requestedUrl: string;
  canonicalUrl: string;
  isRedirect: boolean;
  isError: boolean;
  redirects: number;
  httpStatus: number;
  finalUrl: string;
  robotsRules: string[];
  canonicalTag: string;
  jsonLd: string[];
}

export interface LandingPathRow {
  path: string;
  sessions: number;
  convRate: number;
}

export interface TrafficSourceRow {
  name: string;
  pct: number;
}

export interface InsightsTabData {
  tabId: 'insights';
  sessions: number;
  users: number;
  bounce: number;
  avgDur: string;
  landingPaths: LandingPathRow[];
  sources: TrafficSourceRow[];
}

export interface SchemaRow {
  type: string;
  props: number;
  status: 'valid' | 'warning';
}

export interface SchemaValidationIssue {
  schema: string;
  property: string;
  suggestion: string;
}

export interface SchemaTabData {
  tabId: 'schema';
  schemas: SchemaRow[];
  validationIssues: SchemaValidationIssue[];
}

export interface LinkSourceRow {
  src: string;
  anchor: string;
  strength: number;
  follow: boolean;
}

export interface LinksTabData {
  tabId: 'links';
  count: number;
  sources: LinkSourceRow[];
  top: LinkSourceRow;
}

export interface ImageRow {
  file: string;
  w: number;
  h: number;
  size: number;
  alt: 'present' | 'empty' | 'missing';
}

export interface ImagesTabData {
  tabId: 'images';
  count: number;
  images: ImageRow[];
  missingAlt: number;
}

export interface CssFileRow {
  file: string;
  size: number;
  blocking: boolean;
  responseTime: number;
  status: number;
}

export interface CssTabData {
  tabId: 'css';
  count: number;
  files: CssFileRow[];
  blockingCount: number;
}

/** Map of mock tab id → its payload shape. */
export interface UrlTabDataMap {
  search: SearchTabData;
  gaps: GapsTabData;
  check: CheckTabData;
  insights: InsightsTabData;
  schema: SchemaTabData;
  links: LinksTabData;
  images: ImagesTabData;
  css: CssTabData;
}

/** The eight L2 tabs that have no real backend data in v1. */
export type MockTabId = keyof UrlTabDataMap;

/**
 * Discriminated union keyed by the `tabId` field present on every payload, so
 * a consumer holding only a union can narrow to the matching payload.
 */
export type UrlTabData = UrlTabDataMap[MockTabId];

/** The payload shape for one specific tab id. */
export type UrlTabDataFor<K extends MockTabId> = UrlTabDataMap[K];

/* ---------------------------------------------------------------------------
 * Generator (prototype lines 2909-3127)
 * ------------------------------------------------------------------------- */

/* ----------  Per-URL × per-tab deterministic data generator  ----------
   Returns rich, varied, plausible-looking data for each L2 tab. Numbers are
   deterministic (hash of url + tabId) so the same URL always renders the same
   data on re-renders, but every URL looks different. */
function buildUrlTabData<K extends MockTabId>(detail: UrlDetail, tabId: K): UrlTabDataMap[K];
function buildUrlTabData(detail: UrlDetail, tabId: MockTabId): UrlTabData {
  const url = detail.url;
  const httpStatus = detail.httpStatus || 200;
  const seed = hashStr(url + '|' + tabId);
  const r = function (max: number, off?: number) {
    return (off || 0) + (seed % max);
  };

  if (tabId === 'search') {
    const impressions = 4000 + r(16000); /* 4,000 – 20,000 */
    const clicksPct = 1.2 + (seed % 25) / 10; /* 1.2% – 3.7% */
    const clicks = Math.round((impressions * clicksPct) / 100);
    const position = +(8 + (seed % 18) / 2).toFixed(1); /* 8.0 – 17.0 */
    const ctr = +((clicks / impressions) * 100).toFixed(2);
    const topic = urlTopic(url);
    const kws = topicKeywords(topic);
    const queries = kws.slice(0, 5).map(function (kw, i) {
      return {
        kw: kw,
        pos: 2 + ((seed >> (i + 1)) % 28), /* 2 – 30 */
        imp: 600 + ((seed >> (i + 2)) % 4500),
        clicks: 8 + ((seed >> (i + 3)) % 240),
      };
    });
    const countries = [
      { name: 'United States', pct: 35 + (seed % 15) },
      { name: 'United Kingdom', pct: 10 + ((seed >> 2) % 12) },
      { name: 'India', pct: 6 + ((seed >> 3) % 10) },
      { name: 'Germany', pct: 4 + ((seed >> 4) % 8) },
      { name: 'Other', pct: 21 - ((seed >> 5) % 8) },
    ];
    return { tabId: 'search', impressions: impressions, clicks: clicks, position: position, ctr: ctr, clicksDelta: 4 + (seed % 15), posDelta: 1 + (seed % 4), queries: queries, countries: countries };
  }

  if (tabId === 'gaps') {
    const topic = urlTopic(url);
    const kws = topicKeywords(topic);
    const compPath = '/blog/' + topic.replace(/ /g, '-');
    const compHosts = ['ahrefs.com', 'semrush.com', 'moz.com', 'searchenginejournal.com', 'backlinko.com'];
    const gaps = kws.slice(0, 6).map(function (kw, i) {
      return {
        kw: kw,
        comp: 'https://' + compHosts[i % compHosts.length] + compPath,
        pos: 2 + ((seed >> (i + 1)) % 12), /* #2 – #14 */
        vol: 300 + ((seed >> (i + 2)) % 4000), /* 300 – 4,300 /mo */
      };
    });
    return { tabId: 'gaps', gaps: gaps, competitorCount: 3 };
  }

  if (tabId === 'check') {
    const status = httpStatus;
    const isRedirect = status >= 300 && status < 400;
    const isError = status >= 400;
    const canonical = isRedirect ? url.replace(/\/$/, '') + '-canonical' : isError ? 'https://serpely.com/' : url;
    const redirects = isRedirect ? 1 : (seed >> 2) % 2; /* 0 or 1 */
    const robotsRules = [
      'User-agent: *',
      isError ? 'Disallow: /' : 'Allow: /',
      'Disallow: /wp-admin/',
      'Disallow: /*?utm*',
      'Disallow: /*?preview*',
      'Sitemap: https://serpely.com/sitemap.xml',
    ];
    /* Build a 4-5 line JSON-LD that references the first schema type from the schema tab. */
    const schemaData = buildUrlTabData(detail, 'schema');
    const st = schemaData.schemas[0] ? schemaData.schemas[0].type : 'Article';
    const topic = urlTopic(url);
    const jsonLd = [
      '<script type="application/ld+json">',
      '{',
      '  "@context": "https://schema.org",',
      '  "@type": "' + st + '",',
      '  "headline": "' + topic + ' guide",',
      '  "datePublished": "2026-09-14",',
      '  "author": { "@type": "Organization", "name": "Serpely" }',
      '}',
      '</script>',
    ];
    return {
      tabId: 'check',
      requestedUrl: url,
      canonicalUrl: canonical,
      isRedirect: isRedirect,
      isError: isError,
      redirects: redirects,
      httpStatus: status,
      finalUrl: isRedirect || isError ? canonical : url,
      robotsRules: robotsRules,
      canonicalTag: '<link rel="canonical" href="' + (isRedirect || isError ? canonical : url) + '">',
      jsonLd: jsonLd,
    };
  }

  if (tabId === 'insights') {
    const sessions = 800 + r(2400); /* 800 – 3,200 */
    const users = Math.round(sessions * (0.65 + (seed % 15) / 100));
    const bounce = +(45 + (seed % 25)).toFixed(1); /* 45.0 – 70.0 */
    const avgMin = 1 + (seed % 3);
    const avgSec = 10 + (seed % 50);
    const avgDur = avgMin + 'm ' + avgSec + 's';
    const convBase = +(2.5 + (seed % 4) / 1).toFixed(1);
    const landingPaths = [
      { path: url, sessions: sessions, convRate: +(convBase).toFixed(1) },
      { path: url.replace(/\/$/, '') + '?ref=blog', sessions: Math.round(sessions * 0.42), convRate: +(convBase * 0.6).toFixed(1) },
      { path: url.replace(/\/$/, '') + '/overview', sessions: Math.round(sessions * 0.28), convRate: +(convBase * 0.4).toFixed(1) },
    ];
    const sources = [
      { name: 'Organic Search', pct: 40 + (seed % 12) },
      { name: 'Direct', pct: 15 + ((seed >> 2) % 12) },
      { name: 'Referral', pct: 10 + ((seed >> 3) % 12) },
      { name: 'Social', pct: 6 + ((seed >> 4) % 10) },
    ];
    return { tabId: 'insights', sessions: sessions, users: users, bounce: bounce, avgDur: avgDur, landingPaths: landingPaths, sources: sources };
  }

  if (tabId === 'schema') {
    const schemaCount = 3 + (seed % 2); /* 3 – 4 */
    const schemas: SchemaRow[] = [];
    for (let i = 0; i < schemaCount; i++) {
      const s = SCHEMA_TYPES[(seed + i) % SCHEMA_TYPES.length];
      const hasWarning = (seed >> (i + 1)) % 3 === 0; /* ~33% warnings */
      schemas.push({ type: s.type, props: s.props, status: hasWarning ? 'warning' : 'valid' });
    }
    const props = ['image', 'datePublished', 'author', 'mainEntity', 'headline', 'url'];
    const sugs = ['a valid image URL', 'an ISO 8601 date string', 'a Person or Organization reference', 'a referenced entity', 'a concise headline string', 'the canonical URL'];
    const validationIssues: SchemaValidationIssue[] = schemas
      .filter(function (s) {
        return s.status === 'warning';
      })
      .map(function (s, i) {
        const idx = (seed + i) % props.length;
        return { schema: s.type, property: props[idx], suggestion: sugs[idx] };
      });
    /* If no warnings happened to be selected, fabricate one so the section always has content. */
    if (!validationIssues.length) {
      validationIssues.push({ schema: schemas[0].type, property: 'image', suggestion: 'a valid image URL' });
      schemas[0].status = 'warning';
    }
    return { tabId: 'schema', schemas: schemas, validationIssues: validationIssues };
  }

  if (tabId === 'links') {
    const count = 6 + (seed % 3); /* 6 – 8 */
    const topic = urlTopic(url);
    const slug = topic.replace(/ /g, '-');
    /* Task 6: source URLs are full absolute URLs. */
    const srcPaths = [
      'https://serpely.com/blog/' + slug + '-overview',
      'https://serpely.com/blog/category/' + slug,
      'https://serpely.com/resources/' + slug,
      'https://serpely.com/blog/' + slug + '/intro',
      'https://serpely.com/blog/related-' + slug,
      'https://serpely.com/blog/' + slug + '/faq',
      'https://serpely.com/',
      'https://serpely.com/blog',
    ];
    const anchors = [
      'Read the full ' + topic + ' guide',
      'Learn more about ' + topic,
      topic + ' overview',
      'Detailed ' + topic + ' breakdown',
      'Continue reading',
      'Related: ' + topic,
      'Next steps',
      topic + ' reference',
    ];
    const sources: LinkSourceRow[] = [];
    for (let i = 0; i < count; i++) {
      sources.push({
        src: srcPaths[(seed + i) % srcPaths.length],
        anchor: anchors[(seed + i) % anchors.length],
        strength: 3 + ((seed >> (i + 1)) % 8), /* 3 – 10 */
        follow: (seed >> (i + 2)) % 5 !== 0, /* ~80% follow */
      });
    }
    /* Top linking page = first source by strength (deterministic). */
    const top = sources.slice().sort(function (a, b) {
      return b.strength - a.strength;
    })[0];
    return { tabId: 'links', count: count, sources: sources, top: top };
  }

  if (tabId === 'images') {
    const count = 4 + (seed % 3); /* 4 – 6 */
    const dims = [
      [1920, 1080],
      [1200, 630],
      [800, 600],
      [640, 480],
      [1600, 900],
    ];
    const altStatuses: Array<ImageRow['alt']> = ['present', 'present', 'present', 'empty', 'missing'];
    const images: ImageRow[] = [];
    for (let i = 0; i < count; i++) {
      const d = dims[(seed + i) % dims.length];
      const alt = altStatuses[(seed >> (i + 1)) % altStatuses.length];
      images.push({
        file: 'https://serpely.com/images/' + IMAGE_FILENAMES[(seed + i) % IMAGE_FILENAMES.length],
        w: d[0],
        h: d[1],
        size: 80 + ((seed >> (i + 2)) % 480), /* 80 – 560 KB */
        alt: alt,
      });
    }
    const missingAlt = images.filter(function (img) {
      return img.alt !== 'present';
    }).length;
    return { tabId: 'images', count: count, images: images, missingAlt: missingAlt };
  }

  if (tabId === 'css') {
    const count = 3 + (seed % 3); /* 3 – 5 */
    const files: CssFileRow[] = [];
    let blocking = 0;
    for (let i = 0; i < count; i++) {
      const isBlocking = (seed >> (i + 1)) % 3 !== 0; /* ~67% blocking */
      if (isBlocking) blocking++;
      files.push({
        file: 'https://serpely.com/css/' + CSS_FILENAMES[(seed + i) % CSS_FILENAMES.length],
        size: 12 + ((seed >> (i + 2)) % 90), /* 12 – 102 KB */
        blocking: isBlocking,
        responseTime: 40 + ((seed >> (i + 3)) % 180), /* 40 – 220 ms */
        status: 200,
      });
    }
    return { tabId: 'css', count: count, files: files, blockingCount: blocking };
  }

  /* Unreachable: every MockTabId is handled above. `tabId` is `never` here. */
  throw new Error('genUrlTabData: unhandled tab id ' + String(tabId));
}

/**
 * MOCK — returns deterministic, fabricated data for one L2 tab.
 *
 * The return type is discriminated by `tabId`, so passing a literal tab id
 * narrows the result (e.g. `genUrlTabData(detail, 'search').impressions`).
 *
 * Callers must gate this behind `import.meta.env.DEV`.
 */
export function genUrlTabData<K extends MockTabId>(detail: UrlDetail, tabId: K): UrlTabDataFor<K> {
  return buildUrlTabData(detail, tabId);
}
