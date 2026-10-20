import crypto from 'crypto';
import AuditReport from '../models/AuditReport';
import AuditSnapshot from '../models/AuditSnapshot';
import { normalizeUrl, fetchPage, runChecks, scoreReportV2, buildSiteIssues } from './publicAudit';
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

export async function createJob(input: string, ip: string): Promise<{ job: AuditJob; cachedReportId?: string }> {
  const normalized = normalizeUrl(String(input || ''));
  const origin = new URL(normalized).origin;
  // Per-domain 24h cache (plan) — exact-URL cache upgraded to origin cache
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
      const publicId = String(cached.shareToken);
      const crawled = (cached as unknown as { pages?: { crawled?: number } }).pages?.crawled ?? 1;
      const job: AuditJob = { id: crypto.randomUUID(), normalizedUrl: normalized, origin, status: 'done', stage: 'Cached report (under 24h old)', pagesDone: crawled, pagesTotal: crawled, createdAt: Date.now(), ip, reportId: publicId };
      jobs.set(job.id, job);
      return { job, cachedReportId: publicId };
    }
  } catch { /* cache miss -> run fresh */ }
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
    });
    const agg = aggregateCrawl(pages, job.origin);
    const home = pages.find(p => p.finalUrl === job.normalizedUrl || p.url === job.normalizedUrl) || pages[0];

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
    try {
      const hp = home && home.status === 200
        ? { finalUrl: home.finalUrl, status: home.status, headers: home.headers, html: (await fetchPage(home.url).catch(() => null))?.html || '', loadMs: home.loadMs, protection: null }
        : await fetchPage(job.normalizedUrl);
      const r = await runChecks(hp, job.normalizedUrl, psiPromise);
      // These checks are run against one page (the homepage, after redirects).
      // Store that page as the affected URL so a fresh report can show which
      // page needs the fix instead of "no URL sample".
      const checkedUrl = hp.finalUrl || job.normalizedUrl;
      baseIssues = r.issues.map((issue) =>
        issue.passed || issue.affected ? issue : { ...issue, affected: { count: 1, examples: [checkedUrl] } },
      );
      baseMeta = r.meta;
    } catch { baseMeta = {}; }
    const psi = await psiPromise;

    job.stage = 'Scoring';
    const aiBlocked = (baseIssues.find(i => i.code === 'robots-ai-allow')?.evidence.startsWith('Blocked:') ? baseIssues.find(i => i.code === 'robots-ai-allow')!.evidence.slice(8).split(',').map(s => s.trim()).filter(Boolean) : []);
    const llmsFound = !!baseIssues.find(i => i.code === 'llms-txt')?.passed;
    const schemaFound = !!baseIssues.find(i => i.code === 'org-schema' || i.code === 'article-schema')?.passed;
    const siteIssues = buildSiteIssues({ agg, aiBlocked, llmsFound, schemaFound, psiLcpMs: psi?.lcpMs, psiScore: psi?.score });
    const allIssues = [...siteIssues, ...baseIssues];
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
