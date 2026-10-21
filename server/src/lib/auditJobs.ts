import crypto from 'crypto';
import AuditReport from '../models/AuditReport';
import AuditSnapshot from '../models/AuditSnapshot';
import { normalizeUrl, fetchPage, runChecks, scoreReportV2, buildSiteIssues, assertPublicTarget } from './publicAudit';
import { fetchPsi, type PsiResult } from './pagespeed';
import { fetchCrux } from './crux';
import { discoverUrls, crawlSite, aggregateCrawl } from './crawler';

export type JobStatus = 'queued' | 'running' | 'done' | 'failed';
export interface AuditJob {
  id: string;
  normalizedUrl: string;
  origin: string;
  status: JobStatus;
  stage: string;
  pagesDone: number;
  pagesTotal: number;
  createdAt: number;
  ip: string;
  reportId?: string;
  error?: string;
}

const jobs = new Map<string, AuditJob>();
const MAX_CONCURRENT = 2;
let running = 0;
const queue: string[] = [];

function todayStr(): string { return new Date().toISOString().slice(0, 10); }

export function getJob(id: string): AuditJob | undefined { return jobs.get(id); }

export interface CachedReport { reportId: string; pagesCrawled: number; }

/**
 * A finished report for the same origin, younger than 24h. Shared by the route
 * (so cached answers do not spend the full-crawl rate limit) and by createJob.
 * Throws on an invalid URL, exactly like normalizeUrl.
 */
export async function findCachedReport(input: string): Promise<CachedReport | null> {
  const origin = new URL(normalizeUrl(String(input || ''))).origin;
  try {
    const cached = await AuditReport.findOne({ origin, status: 'done' }).sort({ createdAt: -1 });
    if (cached && Date.now() - new Date(cached.createdAt).getTime() < 24 * 3600 * 1000) {
      // Public links are shareTokens only, so adopt a pre-token report instead of
      // returning an _id that can no longer be read. If the write fails we fall
      // through to a fresh audit.
      if (!cached.shareToken) {
        cached.shareToken = crypto.randomBytes(16).toString('hex');
        await cached.save();
      }
      const crawled = (cached as unknown as { pages?: { crawled?: number } }).pages?.crawled ?? 1;
      return { reportId: String(cached.shareToken), pagesCrawled: crawled };
    }
  } catch { /* cache miss -> run fresh */ }
  return null;
}

export async function createJob(input: string, ip: string): Promise<{ job: AuditJob; cachedReportId?: string }> {
  const normalized = normalizeUrl(String(input || ''));
  const origin = new URL(normalized).origin;

  // One crawl per origin at a time. A second request (the same visitor double
  // clicking, or two visitors auditing the same site) joins the job that is
  // already queued/running instead of launching another ~250-fetch crawl.
  const inFlightCutoff = Date.now() - 30 * 60 * 1000;
  for (const j of jobs.values()) {
    if (j.origin === origin && j.createdAt >= inFlightCutoff && (j.status === 'queued' || j.status === 'running')) {
      return { job: j };
    }
  }

  const cached = await findCachedReport(normalized);
  if (cached) {
    const job: AuditJob = { id: crypto.randomUUID(), normalizedUrl: normalized, origin, status: 'done', stage: 'Cached report (under 24h old)', pagesDone: cached.pagesCrawled, pagesTotal: cached.pagesCrawled, createdAt: Date.now(), ip, reportId: cached.reportId };
    jobs.set(job.id, job);
    return { job, cachedReportId: cached.reportId };
  }

  const job: AuditJob = { id: crypto.randomUUID(), normalizedUrl: normalized, origin, status: 'queued', stage: 'Queued', pagesDone: 0, pagesTotal: 0, createdAt: Date.now(), ip };
  jobs.set(job.id, job);
  queue.push(job.id);
  pump();
  return { job };
}

function pump() {
  while (running < MAX_CONCURRENT && queue.length) {
    const id = queue.shift()!;
    const job = jobs.get(id);
    if (!job || job.status !== 'queued') continue;
    running++;
    runJob(job).finally(() => { running--; pump(); });
  }
}

async function runJob(job: AuditJob): Promise<void> {
  job.status = 'running';
  try {
    // Honest DNS/SSRF failure up front: an unresolvable or private target
    // fails here with a real message instead of producing an empty report.
    await assertPublicTarget(job.normalizedUrl);
    job.stage = 'Discovering URLs';
    let robotsBody = '';
    try {
      const r = await fetch(`${job.origin}/robots.txt`, { headers: { 'User-Agent': 'SerpelyAuditBot/1.0 (+https://serpely.com/audit)' }, redirect: 'follow' });
      if (r.ok) robotsBody = await r.text().catch(() => '');
    } catch { /* no robots */ }
    const { urls, sitemaps } = await discoverUrls(job.origin, robotsBody);
    const targets = urls.length ? urls : [job.normalizedUrl];
    job.pagesTotal = targets.length;
    job.stage = urls.length ? `Crawling 0/${targets.length} pages` : 'Crawling homepage (no sitemap found)';
    const pages = await crawlSite(job.origin, targets, (done, total) => {
      job.pagesDone = done; job.pagesTotal = total;
      job.stage = `Crawling ${done}/${total} pages`;
    }, robotsBody);
    const agg = aggregateCrawl(pages, job.origin);
    const home = pages.find(p => p.finalUrl === job.normalizedUrl || p.url === job.normalizedUrl) || pages[0];
    if (agg.crawled === 0) {
      // Nothing was actually fetched — never save an empty "done" report.
      const offsite = pages.find(p => p.offsite)?.offsite;
      if (offsite) {
        throw new Error(`This URL redirects to a different domain (${offsite}). The audit stopped so the other site is not analyzed as yours.`);
      }
      throw new Error(`The website could not be crawled (0 of ${targets.length} pages responded). It may be offline, blocking bots, or the address may be wrong.`);
    }

    job.stage = 'Google lab data';
    job.pagesDone = job.pagesTotal;
    // PSI (lab + its own field data) and direct CrUX (URL → origin fallback)
    // run in parallel. CrUX fills field gaps PSI misses and keeps real-user
    // issues alive even when PSI itself fails (quota/key).
    const psiPromise: Promise<PsiResult | null> = (async () => {
      const [psi, cruxField] = await Promise.all([
        fetchPsi(job.normalizedUrl, process.env.PAGESPEED_API_KEY),
        fetchCrux(job.normalizedUrl, process.env.CRUX_API_KEY),
      ]);
      if (psi) {
        if (!psi.field && cruxField) psi.field = cruxField;
        if (psi.ttfbMs === undefined && cruxField?.ttfbMs !== undefined) psi.ttfbMs = cruxField.ttfbMs;
        return psi;
      }
      if (cruxField) {
        return { score: -1, strategy: 'mobile', field: cruxField, ttfbMs: cruxField.ttfbMs };
      }
      return null;
    })();
    // Homepage deep checks (headers, OG, schema, security) reuse existing engine
    let baseIssues: Awaited<ReturnType<typeof runChecks>>['issues'] = [];
    let baseMeta: Record<string, string> = {};
    let homepageOffsite = '';
    try {
      const hp = home && home.status === 200 && !home.error
        ? await fetchPage(home.url).catch(() => null)
        : await fetchPage(job.normalizedUrl).catch(() => null);
      if (!hp) {
        baseMeta = {};
      } else if (hp.offsite) {
        // The submitted homepage lands on a different domain — do NOT run
        // SEO checks against the other site's content.
        homepageOffsite = hp.offsite;
      } else {
        const r = await runChecks(hp, job.normalizedUrl, psiPromise);
        // These checks are run against one page (the homepage, after redirects).
        // Store that page as the affected URL so a fresh report can show which
        // page needs the fix instead of "no URL sample".
        const checkedUrl = hp.finalUrl || job.normalizedUrl;
        baseIssues = r.issues.map((issue) =>
          issue.passed || issue.affected ? issue : { ...issue, affected: { count: 1, examples: [checkedUrl] } },
        );
        baseMeta = r.meta;
      }
    } catch { baseMeta = {}; }
    const psi = await psiPromise;

    job.stage = 'Scoring';
    const aiBlocked = (baseIssues.find(i => i.code === 'robots-ai-allow')?.evidence.startsWith('Blocked:') ? baseIssues.find(i => i.code === 'robots-ai-allow')!.evidence.slice(8).split(',').map(s => s.trim()).filter(Boolean) : []);
    const llmsFound = !!baseIssues.find(i => i.code === 'llms-txt')?.passed;
    const schemaFound = !!baseIssues.find(i => i.code === 'org-schema' || i.code === 'article-schema')?.passed;
    const siteIssues = buildSiteIssues({ agg, aiBlocked, llmsFound, schemaFound, psiLcpMs: psi?.lcpMs, psiScore: psi?.score, origin: job.origin });
    const allIssues = [...siteIssues, ...baseIssues];
    if (homepageOffsite) {
      allIssues.unshift({
        code: 'homepage-redirects-offsite', category: 'Technical SEO', severity: 'critical',
        title: 'Homepage redirects to a different domain',
        evidence: `The submitted URL ${job.normalizedUrl} redirects to ${homepageOffsite}. Audited data reflects the redirected destination.`,
        fix: 'Audit the destination URL directly, or remove the redirect if this domain is the one you intend to analyze.',
        impact: 0, effort: 'normal', passed: false,
        affected: { count: 1, examples: [job.normalizedUrl] },
      });
    }
    const { scores, overall, forecast, summary, priority } = scoreReportV2(allIssues);

    // AI crawler access table (mockup): per-bot parse + llms.txt row
    const bots = ['OAI-SearchBot', 'PerplexityBot', 'GPTBot', 'ClaudeBot', 'Googlebot', 'Google-Extended'];
    const aiCrawlers = bots.map(b => {
      const blocked = new RegExp(`user-agent:\\s*${b}[\\s\\S]{0,200}?disallow:\\s*/`, 'i').test(robotsBody);
      const mentioned = new RegExp(`user-agent:\\s*${b}`, 'i').test(robotsBody);
      return { bot: b, status: (blocked ? 'Blocked' : 'Allowed') as 'Allowed' | 'Blocked', detail: blocked ? 'Disallowed in robots.txt' : mentioned ? 'Explicitly allowed' : 'Allowed by default' };
    });
    if (!llmsFound) aiCrawlers.push({ bot: 'llms.txt', status: 'Missing', detail: 'No /llms.txt found' } as unknown as { bot: string; status: 'Allowed' | 'Blocked'; detail: string });

    const meta: Record<string, string> = { ...baseMeta, origin: job.origin, finalUrl: home?.finalUrl || job.normalizedUrl, sitemaps: JSON.stringify(sitemaps.slice(0, 10)) };
    if (homepageOffsite) meta.redirectOffsite = homepageOffsite;
    // Honest incomplete marker: homepage unreachable or ≥30% of pages failed.
    const homepageOk = !!(home && home.status === 200 && !home.error && !home.offsite);
    if (!homepageOk || (agg.total > 0 && agg.errors >= agg.total * 0.3)) {
      meta.partial = String(Math.round((agg.errors / Math.max(1, agg.total)) * 100));
    }
    if (psi) {
      meta.psi = JSON.stringify({ score: psi.score >= 0 ? psi.score : undefined, lcpS: psi.lcpMs !== undefined ? Math.round((psi.lcpMs / 1000) * 10) / 10 : undefined, cls: psi.cls, inpMs: psi.inpMs, strategy: psi.strategy, scores: psi.scores, field: psi.field ?? null, originField: psi.originField ?? null });
    }
    const doc = await AuditReport.create({
      url: job.normalizedUrl, normalizedUrl: job.normalizedUrl, origin: job.origin,
      shareToken: crypto.randomBytes(16).toString('hex'),
      status: 'done', progress: { stage: 'done', pagesDone: agg.crawled, pagesTotal: agg.total },
      pages: { crawled: agg.crawled, discovered: agg.total, errors: agg.errors },
      aiCrawlers, summary, priority, gsc: {},
      scores, overall, forecast, issues: allIssues, meta,
      pageStats: agg.pageStats as unknown as Record<string, unknown>[],
    });
    try {
      await AuditSnapshot.updateOne(
        { origin: job.origin, date: todayStr() },
        { $set: { overall, scores, reportId: doc._id } },
        { upsert: true },
      );
    } catch { /* trend optional */ }
    job.status = 'done'; job.stage = 'Done';
    // The public id is always the shareToken — never the _id, which no longer resolves.
    job.reportId = String(doc.shareToken);
  } catch (e) {
    job.status = 'failed';
    job.error = e instanceof Error ? e.message : 'Audit failed';
    job.stage = 'Failed';
  }
}

// Lazy background re-run for stale reports (>24h) opened via share link
export function maybeRefreshStale(origin: string, createdAt: Date) {
  try {
    if (Date.now() - createdAt.getTime() < 24 * 3600 * 1000) return;
    AuditReport.findOne({ origin, status: 'done' }).sort({ createdAt: -1 }).lean().then(() => {
      // Fire-and-forget fresh crawl without blocking the reader; dedupe by origin
      const already = [...jobs.values()].some(j => j.origin === origin && (j.status === 'queued' || j.status === 'running'));
      if (already) return;
      createJob(origin, 'stale-refresh').catch(() => {});
    }).catch(() => {});
  } catch { /* ignore */ }
}
