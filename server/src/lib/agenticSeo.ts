import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import type { IAuditIssue, AuditCategory, AuditSeverity } from '../models/AuditReport';

const execFileAsync = promisify(execFile);

const SCRIPT_TIMEOUT_MS = 18000;
const PYTHON_BIN = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');

/** Resolve `Agentic-SEO-Skill-main/scripts` from either `src/` or compiled `dist/`. */
async function resolveScriptsDir(): Promise<string | null> {
  const candidates = [
    process.env.AGENTIC_SEO_SCRIPTS_DIR,
    path.resolve(__dirname, '../../../Agentic-SEO-Skill-main/scripts'),
    path.resolve(__dirname, '../../Agentic-SEO-Skill-main/scripts'),
    path.resolve(process.cwd(), '../Agentic-SEO-Skill-main/scripts'),
    path.resolve(process.cwd(), 'Agentic-SEO-Skill-main/scripts'),
  ].filter((p): p is string => Boolean(p));

  for (const dir of candidates) {
    try {
      const stat = await fs.stat(dir);
      if (stat.isDirectory()) return dir;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function runPyJson<T = Record<string, unknown>>(
  scriptsDir: string,
  scriptName: string,
  args: string[],
  timeoutMs = SCRIPT_TIMEOUT_MS,
): Promise<T | null> {
  const scriptPath = path.join(scriptsDir, scriptName);
  try {
    await fs.access(scriptPath);
  } catch {
    return null;
  }

  try {
    const { stdout } = await execFileAsync(PYTHON_BIN, [scriptPath, ...args], {
      cwd: scriptsDir,
      timeout: timeoutMs,
      maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });
    const trimmed = (stdout || '').trim();
    if (!trimmed) return null;
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}

function mkIssue(
  code: string,
  category: AuditCategory,
  severity: AuditSeverity,
  title: string,
  evidence: string,
  fix: string,
  impact: number,
  effort: 'quick' | 'normal',
  passed: boolean,
  why: string,
  examples: string[],
  count?: number,
): IAuditIssue {
  return {
    code,
    category,
    severity,
    title,
    evidence,
    fix,
    impact: passed ? 0 : impact,
    effort,
    passed,
    why,
    affected: passed ? undefined : { count: count ?? Math.max(1, examples.length), examples: examples.slice(0, 10) },
  };
}

export interface CriticalRequestNode {
  type: 'stylesheet' | 'script' | 'css-import';
  url: string;
  blocking: boolean;
  preloaded?: boolean;
  cross_origin?: boolean;
  preconnected?: boolean;
  children?: CriticalRequestNode[];
}

export interface CriticalRequestChainResult {
  url: string;
  critical_request_count: number;
  chain_count: number;
  issues: { severity: string; message: string; url?: string }[];
  chains: CriticalRequestNode[];
  fetch_error?: string | null;
}

/**
 * Run `critical_request_chain.py` for a single URL (used by the L2 `CSS` tab).
 */
export async function runCriticalRequestChainForUrl(url: string): Promise<CriticalRequestChainResult | null> {
  if (!/^https?:\/\//i.test(url)) return null;
  const scriptsDir = await resolveScriptsDir();
  if (!scriptsDir) return null;
  return runPyJson<CriticalRequestChainResult>(scriptsDir, 'critical_request_chain.py', [
    url,
    '--fetch-css',
    '--timeout',
    '10',
    '--json',
  ], 22000);
}

interface XRobotsResult {
  rows?: {
    url: string;
    x_robots_tag: string | null;
    directives: string[];
    indexing_effect: string;
    follow_effect: string;
    error?: string | null;
  }[];
}

interface RichResultsResult {
  nodes?: number;
  issues?: { severity: string; message: string; evidence?: string }[];
  summary?: { errors: number; warnings: number };
}

interface ThirdPartyResult {
  script_count?: number;
  third_party_count?: number;
  blocking_third_party_count?: number;
  issues?: { severity: string; message: string; url?: string; evidence?: string }[];
  scripts?: { src: string; known_tag?: string | null; third_party: boolean; blocking: boolean }[];
  fetch_error?: string | null;
}

interface FontAuditResult {
  font_file_count?: number;
  font_face_count?: number;
  preload_count?: number;
  issues?: { severity: string; message: string; url?: string; evidence?: string }[];
  fetch_error?: string | null;
}

interface ReadabilityResult {
  word_count?: number;
  flesch_reading_ease?: number;
  reading_level?: string;
  avg_sentence_length?: number;
  avg_paragraph_length?: number;
  complex_word_pct?: number;
  issues?: string[];
}

interface EeatResult {
  score?: number;
  signals?: {
    authors?: string[];
    credential_markers?: string[];
    first_hand_experience_markers?: string[];
    policy_links?: unknown[];
    trust_links?: unknown[];
  };
  issues?: { severity: string; message: string }[];
}

interface CitationResult {
  score?: number;
  factual_claims?: number;
  citation_signals?: {
    external_links?: number;
    trusted_external_links?: number;
    cite_or_blockquote_tags?: number;
    footnote_links?: number;
  };
  entity_signals?: { sameAs?: string[] };
  issues?: { severity: string; message: string }[];
}

interface AnswerBlockResult {
  score?: number;
  questions?: string[];
  direct_answers?: unknown[];
  definitions?: unknown[];
  lists?: unknown[];
  tables?: unknown[];
}

interface A11yResult {
  score?: number;
  checks?: {
    form_controls?: number;
    labeled_controls?: number;
    landmarks?: { main?: number };
  };
}

interface UrlQualityResult {
  count?: number;
  flag_counts?: Record<string, number>;
  variant_groups?: Record<string, string[]>;
  rows?: { url: string; flags: string[]; score: number }[];
}

interface FacetedNavResult {
  count?: number;
  path_explosions?: Record<string, string[]>;
  issues?: { severity: string; message: string; count?: number }[];
  rows?: { url: string; flags: string[] }[];
}

/**
 * Run selected Python scripts from `Agentic-SEO-Skill-main/scripts/` and return
 * normalized `IAuditIssue[]` findings to merge into the report.
 */
export async function runAgenticSeoChecks(params: {
  targetUrl: string;
  homepageHtml: string;
  crawledUrls: string[];
}): Promise<IAuditIssue[]> {
  const { targetUrl, homepageHtml, crawledUrls } = params;
  if (!/^https?:\/\//i.test(targetUrl)) return [];

  const scriptsDir = await resolveScriptsDir();
  if (!scriptsDir) return [];

  const tmpId = crypto.randomBytes(8).toString('hex');
  const tmpHtmlPath = path.join(os.tmpdir(), `serpely-audit-${tmpId}.html`);
  const tmpUrlsPath = path.join(os.tmpdir(), `serpely-urls-${tmpId}.txt`);

  try {
    const uniqueUrls = [...new Set(crawledUrls.filter((u) => /^https?:\/\//i.test(u)))].slice(0, 300);
    await Promise.all([
      fs.writeFile(tmpHtmlPath, homepageHtml || '', 'utf-8'),
      fs.writeFile(tmpUrlsPath, uniqueUrls.join('\n'), 'utf-8'),
    ]);

    const [
      xRobotsRes,
      richRes,
      critRes,
      thirdPartyRes,
      fontRes,
      readabilityRes,
      eeatRes,
      citationRes,
      answerRes,
      a11yRes,
      urlQualityRes,
      facetedRes,
    ] = await Promise.all([
      runPyJson<XRobotsResult>(scriptsDir, 'x_robots_header_checker.py', [targetUrl, '--timeout', '8', '--json']),
      runPyJson<RichResultsResult>(scriptsDir, 'rich_results_guard.py', [tmpHtmlPath, '--json']),
      runPyJson<CriticalRequestChainResult>(scriptsDir, 'critical_request_chain.py', [targetUrl, '--timeout', '8', '--json']),
      runPyJson<ThirdPartyResult>(scriptsDir, 'third_party_script_audit.py', [targetUrl, '--timeout', '8', '--json']),
      runPyJson<FontAuditResult>(scriptsDir, 'font_audit.py', [targetUrl, '--timeout', '8', '--json']),
      runPyJson<ReadabilityResult>(scriptsDir, 'readability.py', [tmpHtmlPath, '--json']),
      runPyJson<EeatResult>(scriptsDir, 'eeat_signal_checker.py', [targetUrl, '--timeout', '8', '--json']),
      runPyJson<CitationResult>(scriptsDir, 'citation_readiness.py', [targetUrl, '--timeout', '8', '--json']),
      runPyJson<AnswerBlockResult>(scriptsDir, 'answer_block_scanner.py', [targetUrl, '--timeout', '8', '--json']),
      runPyJson<A11yResult>(scriptsDir, 'a11y_seo_checker.py', [targetUrl, '--timeout', '8', '--json']),
      uniqueUrls.length
        ? runPyJson<UrlQualityResult>(scriptsDir, 'url_quality.py', ['--url-file', tmpUrlsPath, '--json'])
        : Promise.resolve(null),
      uniqueUrls.length
        ? runPyJson<FacetedNavResult>(scriptsDir, 'faceted_nav_audit.py', ['--url-file', tmpUrlsPath, '--json'])
        : Promise.resolve(null),
    ]);

    const issues: IAuditIssue[] = [];

    // 1. X-Robots-Tag HTTP header
    const xrRow = xRobotsRes?.rows?.[0];
    if (xrRow && !xrRow.error) {
      const blocked = xrRow.indexing_effect === 'blocked';
      issues.push(
        mkIssue(
          'x-robots-header',
          'Technical SEO',
          blocked ? 'critical' : 'low',
          'HTTP X-Robots-Tag header permits indexing',
          blocked
            ? `X-Robots-Tag blocks indexing: "${xrRow.x_robots_tag || 'noindex'}"`
            : xrRow.x_robots_tag
              ? `X-Robots-Tag: ${xrRow.x_robots_tag}`
              : 'No blocking X-Robots-Tag header returned',
          'Remove "noindex" or "none" from server/CDN X-Robots-Tag response headers on pages meant for search.',
          8,
          'quick',
          !blocked,
          'HTTP X-Robots-Tag headers override HTML meta tags and silently drop pages from Google and AI indexes.',
          [targetUrl],
        ),
      );
    }

    // 2. Rich Results Guard (deprecated / restricted schema)
    if (richRes && typeof richRes.nodes === 'number' && richRes.nodes > 0) {
      const rrIssues = richRes.issues || [];
      const errCount = richRes.summary?.errors ?? 0;
      const warnCount = richRes.summary?.warnings ?? 0;
      const passed = errCount === 0 && warnCount === 0;
      issues.push(
        mkIssue(
          'rich-results-guard',
          'AI citation readiness',
          errCount > 0 ? 'high' : 'medium',
          'Rich-result schema uses active, eligible types',
          passed
            ? `${richRes.nodes} JSON-LD node(s) checked — no retired or restricted rich-result types`
            : rrIssues.slice(0, 2).map((i) => i.message).join('; '),
          'Replace retired schema types (SpecialAnnouncement, CourseInfo, ClaimReview, etc.) and fix missing rich-result fields.',
          errCount > 0 ? 5 : 3,
          'normal',
          passed,
          'Deprecated or restricted schema types (such as retired 2025 rich results) fail Google rich-result eligibility.',
          [targetUrl],
        ),
      );
    }

    // 3. Critical Request Chain (render-blocking CSS / JS)
    if (critRes && !critRes.fetch_error) {
      const blockingCount = critRes.critical_request_count ?? 0;
      const cssBlocking = (critRes.chains || []).filter((c) => c.type === 'stylesheet' && c.blocking);
      const jsBlocking = (critRes.chains || []).filter((c) => c.type === 'script' && c.blocking);
      const passed = blockingCount <= 3 && jsBlocking.length === 0;
      issues.push(
        mkIssue(
          'critical-css-blocking',
          'Performance',
          jsBlocking.length > 0 ? 'high' : 'medium',
          'Minimal render-blocking stylesheets & scripts',
          passed
            ? `${critRes.chain_count} critical resource(s) checked — no parser-blocking scripts`
            : `${cssBlocking.length} render-blocking stylesheet(s), ${jsBlocking.length} parser-blocking script(s)`,
          'Add defer/async to non-critical <script> tags, inline critical CSS, and add <link rel="preconnect"> for third-party asset hosts.',
          jsBlocking.length > 0 ? 5 : 3,
          'normal',
          passed,
          'Parser-blocking scripts and excessive render-blocking stylesheets delay First Contentful Paint and LCP.',
          [targetUrl],
        ),
      );
    }

    // 4. Third-party script audit
    if (thirdPartyRes && !thirdPartyRes.fetch_error) {
      const tpCount = thirdPartyRes.third_party_count ?? 0;
      const blockingTp = thirdPartyRes.blocking_third_party_count ?? 0;
      const tags = [
        ...new Set(
          (thirdPartyRes.scripts || [])
            .filter((s) => s.third_party && s.known_tag)
            .map((s) => s.known_tag as string),
        ),
      ];
      const passed = blockingTp === 0 && tpCount < 8;
      issues.push(
        mkIssue(
          'third-party-scripts',
          'Performance',
          blockingTp > 0 ? 'high' : 'medium',
          'Third-party scripts non-blocking & lean',
          passed
            ? `${tpCount} third-party script(s)${tags.length ? ` (${tags.slice(0, 3).join(', ')})` : ''} — none blocking`
            : `${blockingTp} blocking third-party script(s) out of ${tpCount} total${tags.length ? ` (${tags.slice(0, 3).join(', ')})` : ''}`,
          'Load analytics, pixels, and chat widgets with async/defer or after user interaction to protect INP and LCP.',
          blockingTp > 0 ? 5 : 3,
          'quick',
          passed,
          'Synchronous third-party scripts block HTML parsing and degrade Interaction to Next Paint (INP).',
          [targetUrl],
        ),
      );
    }

    // 5. Font loading audit
    if (fontRes && !fontRes.fetch_error && ((fontRes.font_file_count ?? 0) > 0 || (fontRes.font_face_count ?? 0) > 0)) {
      const fIssues = fontRes.issues || [];
      const warns = fIssues.filter((i) => i.severity === 'warning');
      const passed = warns.length === 0;
      issues.push(
        mkIssue(
          'font-loading',
          'Performance',
          'low',
          'Web fonts configured with font-display & preload',
          passed
            ? `${fontRes.font_file_count ?? 0} font file(s), ${fontRes.font_face_count ?? 0} @font-face rule(s) look clean`
            : warns.slice(0, 2).map((w) => w.message).join('; '),
          'Add font-display: swap to @font-face rules, serve WOFF2, and include crossorigin on preloaded font links.',
          2,
          'quick',
          passed,
          'Missing font-display causes invisible text (FOIT), while missing crossorigin on preloads triggers double font downloads.',
          [targetUrl],
        ),
      );
    }

    // 6. Content readability
    if (readabilityRes && typeof readabilityRes.word_count === 'number' && readabilityRes.word_count >= 80) {
      const fre = readabilityRes.flesch_reading_ease ?? 60;
      const avgSent = readabilityRes.avg_sentence_length ?? 15;
      const passed = fre >= 40 && avgSent <= 25;
      issues.push(
        mkIssue(
          'readability-score',
          'On-page content',
          'medium',
          'Content readability & sentence clarity',
          `Flesch Reading Ease ${fre}/100 (${readabilityRes.reading_level || 'Standard'}), avg ${avgSent} words/sentence`,
          'Shorten long sentences (aim for 15–20 words) and break dense paragraphs into scannable 2–4 sentence blocks.',
          3,
          'normal',
          passed,
          'Overly dense prose lowers user engagement and makes key claims harder for search and AI summarizers to parse.',
          [targetUrl],
        ),
      );
    }

    // 7. E-E-A-T signals
    if (eeatRes && typeof eeatRes.score === 'number') {
      const sig = eeatRes.signals || {};
      const authorsCount = sig.authors?.length ?? 0;
      const trustCount = sig.trust_links?.length ?? 0;
      const passed = eeatRes.score >= 45 && trustCount > 0;
      issues.push(
        mkIssue(
          'eeat-signals',
          'On-page content',
          'medium',
          'E-E-A-T author & trust signals present',
          `E-E-A-T score ${eeatRes.score}/100 · ${authorsCount} author/publisher signal(s), ${trustCount} trust link(s)`,
          'Surface clear author/publisher attribution, About/Contact/Privacy links, and editorial or first-hand verification signals.',
          4,
          'normal',
          passed,
          'Google quality guidelines and AI citation systems favor pages with transparent authorship, credentials, and trust pages.',
          [targetUrl],
        ),
      );
    }

    // 8. AI citation readiness
    if (citationRes && typeof citationRes.score === 'number') {
      const cs = citationRes.citation_signals || {};
      const claims = citationRes.factual_claims ?? 0;
      const ext = cs.external_links ?? 0;
      const sameAs = citationRes.entity_signals?.sameAs?.length ?? 0;
      const passed = citationRes.score >= 40;
      issues.push(
        mkIssue(
          'citation-readiness',
          'AI citation readiness',
          'medium',
          'Factual claims backed by citations & entity links',
          `Citation readiness ${citationRes.score}/100 · ${claims} claim(s), ${ext} external source(s), ${sameAs} sameAs link(s)`,
          'Back factual claims with primary sources or citations and add Organization/Person sameAs links in JSON-LD.',
          4,
          'normal',
          passed,
          'Answer engines prefer citing pages that substantiate claims with sources and clear Knowledge Graph entity links.',
          [targetUrl],
        ),
      );
    }

    // 9. Answer-block & featured-snippet formatting
    if (answerRes && typeof answerRes.score === 'number') {
      const direct = answerRes.direct_answers?.length ?? 0;
      const defs = answerRes.definitions?.length ?? 0;
      const lists = answerRes.lists?.length ?? 0;
      const tables = answerRes.tables?.length ?? 0;
      const passed = answerRes.score >= 30 || direct > 0 || (lists + tables) > 0;
      issues.push(
        mkIssue(
          'answer-blocks',
          'AI citation readiness',
          'low',
          'Answer-ready headings, lists & summary blocks',
          `Answer formatting score ${answerRes.score}/100 · ${direct} direct answer(s), ${defs} definition(s), ${lists} list(s), ${tables} table(s)`,
          'Follow question-based H2/H3 headings with concise 40–60 word direct answers, bulleted lists, or comparison tables.',
          3,
          'normal',
          passed,
          'Structured answer blocks dramatically improve featured-snippet capture and AI overview extraction.',
          [targetUrl],
        ),
      );
    }

    // 10. Accessibility landmarks & form labels (non-overlapping with existing publicAudit checks)
    if (a11yRes?.checks) {
      const totalForms = a11yRes.checks.form_controls ?? 0;
      const labeled = a11yRes.checks.labeled_controls ?? 0;
      const unlabeled = Math.max(0, totalForms - labeled);
      const hasMain = (a11yRes.checks.landmarks?.main ?? 0) > 0;
      const passed = unlabeled === 0 && hasMain;
      issues.push(
        mkIssue(
          'a11y-landmarks-labels',
          'Accessibility',
          unlabeled > 0 ? 'medium' : 'low',
          'Semantic <main> landmark & labeled form controls',
          passed
            ? `<main> landmark present; all ${totalForms} form control(s) labeled`
            : `${!hasMain ? 'Missing <main> landmark' : 'Has <main> landmark'}${unlabeled > 0 ? `; ${unlabeled} unlabeled form field(s)` : ''}`,
          'Wrap primary page content in a single <main> landmark and ensure every input/select/textarea has a <label> or aria-label.',
          unlabeled > 0 ? 3 : 2,
          'quick',
          passed,
          'Landmarks and accessible form labels improve screen-reader navigation and help crawlers isolate main content.',
          [targetUrl],
        ),
      );
    }

    // 11. Site-wide URL quality hygiene (across crawled URLs)
    if (urlQualityRes && (urlQualityRes.count ?? 0) > 0) {
      const flagged = (urlQualityRes.rows || []).filter((r) =>
        r.flags.some((f) => f === 'long_url' || f === 'uppercase_path' || f === 'underscore_in_path' || f === 'tracking_parameters'),
      );
      const variants = Object.keys(urlQualityRes.variant_groups || {}).length;
      const passed = flagged.length === 0 && variants === 0;
      const summaryFlags = Object.entries(urlQualityRes.flag_counts || {})
        .filter(([k]) => ['long_url', 'uppercase_path', 'underscore_in_path', 'tracking_parameters'].includes(k))
        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
        .join(', ');
      issues.push(
        mkIssue(
          'site-url-quality',
          'Technical SEO',
          'low',
          'Clean, consistent URL slugs across crawled pages',
          passed
            ? `${urlQualityRes.count} URL(s) checked — lowercase, hyphenated, and free of tracking parameters`
            : `${flagged.length} URL(s) with hygiene issues (${summaryFlags || `${variants} variant group(s)`})`,
          'Use lowercase, hyphen-separated slugs under 115 chars and strip tracking parameters (utm_*, fbclid) from internal links.',
          3,
          'normal',
          passed,
          'Mixed-case paths, underscores, and tracking parameters fragment PageRank and create duplicate URL variants.',
          flagged.slice(0, 10).map((r) => r.url),
          flagged.length,
        ),
      );
    }

    // 12. Faceted navigation / parameter crawl traps
    if (facetedRes && (facetedRes.count ?? 0) > 0) {
      const explosions = Object.keys(facetedRes.path_explosions || {});
      const trappedUrls = (facetedRes.rows || []).filter((r) => r.flags.length > 0).map((r) => r.url);
      const passed = explosions.length === 0 && trappedUrls.length === 0;
      issues.push(
        mkIssue(
          'site-faceted-nav',
          'Technical SEO',
          explosions.length > 0 ? 'high' : 'low',
          'No faceted navigation parameter crawl traps',
          passed
            ? `No sort/filter/pagination parameter traps across ${facetedRes.count} URL(s)`
            : `${trappedUrls.length} parameterized URL(s) detected${explosions.length ? ` (${explosions.length} path explosion(s))` : ''}`,
          'Canonicalize filtered/sorted URLs to the base category path, disallow noisy filter parameters in robots.txt, or add noindex.',
          explosions.length > 0 ? 5 : 2,
          'normal',
          passed,
          'Uncapped filter, sort, and pagination parameter combinations waste crawl budget and dilute index signals.',
          trappedUrls.slice(0, 10),
          trappedUrls.length,
        ),
      );
    }

    return issues;
  } finally {
    await Promise.all([
      fs.unlink(tmpHtmlPath).catch(() => undefined),
      fs.unlink(tmpUrlsPath).catch(() => undefined),
    ]);
  }
}
