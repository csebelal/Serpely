/**
 * Shared types for the Site Audit redesign (`/audit/:id`, `/audit-preview/:id`).
 *
 * Mirrors the shape the prototype's `genUrlDetail()` produces, but every field is
 * nullable because in production the values come from a real crawl and may be
 * absent. Components must render their "Not collected yet" state when a field is
 * null rather than inventing a value.
 */

export type Severity = 'high' | 'medium' | 'low';

/** A row in the findings table / the L1 drawer header. */
export interface FindingRow {
  /** Stable id derived from the report issue key. */
  id: string;
  category: string;
  title: string;
  severity: Severity;
  /** Number of affected URLs, when known. */
  affectedCount: number;
}

/** One issue attached to a single URL (L2 drawer, Issues tab). */
export interface UrlIssue {
  id: string;
  severity: Severity;
  title: string;
  category: string;
}

/** Per-URL crawl facts backing the L2 drawer. */
export interface UrlDetail {
  url: string;
  httpStatus: number | null;
  contentType: string | null;
  pageScore: number | null;
  /** Page weight in MB. */
  pageWeight: number | null;
  metaRobots: string | null;
  robotsTxt: string | null;
  httpHeaders: string[];
  issues: UrlIssue[];
  internalLinksCount: number | null;
  imagesCount: number | null;
  cssFilesCount: number | null;
  /** Stored crawl facts for this exact URL, when the report kept them. */
  stat: UrlPageStat | null;
}

/**
 * Compact per-page facts stored by the crawl (`report.pageStats`). Mirrors the
 * server's `PageStat` shape; every field arrives as real crawler data.
 */
export interface UrlPageStat {
  url: string;
  finalUrl: string;
  status: number;
  depth: number;
  hops: number;
  loadMs: number;
  title: string;
  descLen: number;
  h1Count: number;
  canonical: string;
  robotsMeta: string;
  words: number;
  imgs: number;
  imgsNoAlt: number;
  imgsMissingDims: number;
  imgsNoLazy: number;
  schemaTypes: string[];
  internalCount: number;
  externalLinks: string[];
  /** Document size in kilobytes (HTML only — assets are not downloaded). */
  htmlKb: number;
  offsite?: string;
  error?: string;
}

/** The 12 L2 tabs, in sidebar order. */
export const URL_TABS = [
  { id: 'issues', label: 'Issues' },
  { id: 'search', label: 'Search' },
  { id: 'gaps', label: 'Gaps' },
  { id: 'check', label: 'URL check' },
  { id: 'pagespeed', label: 'PageSpeed' },
  { id: 'crux', label: 'CrUX' },
  { id: 'insights', label: 'Insights' },
  { id: 'schema', label: 'Schema' },
  { id: 'links', label: 'Links' },
  { id: 'images', label: 'Images' },
  { id: 'css', label: 'CSS' },
] as const;

export type UrlTabId = (typeof URL_TABS)[number]['id'];

/** Tabs wired to real collected data. Everything else is an honest empty state.
 *  (`check`/`schema`/`links`/`images` read the stored per-page crawl facts.) */
export const REAL_TABS: UrlTabId[] = ['issues', 'pagespeed', 'crux', 'check', 'schema', 'links', 'images'];

export function statusTone(httpStatus: number | null): 'ok' | 'warn' | 'bad' | 'miss' {
  if (typeof httpStatus === 'number') {
    if (httpStatus === 200) return 'ok';
    if (httpStatus >= 300 && httpStatus < 400) return 'warn';
    if (httpStatus >= 400 && httpStatus < 600) return 'bad';
  }
  return 'miss';
}

export function severityLabel(severity: Severity): string {
  if (severity === 'high') return 'Critical';
  if (severity === 'medium') return 'Warning';
  return 'Notice';
}
