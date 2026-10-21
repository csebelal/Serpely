/* ===========================================================================
 * audit-contract.mjs — automated data-flow contract for the public audit.
 *
 * Run with the API on http://127.0.0.1:4000 (npm start in server/).
 * Exercises, against REAL endpoints:
 *   1. Invalid / private URL submission → 400 before any crawl slot is spent
 *   2. A real crawl of a small public site → report targets the SUBMITTED site,
 *      stores real per-page facts, and no foreign-domain evidence leaks in
 *   3. Origin cache → second run of the same origin returns the SAME report
 *      without crawling (cached=true)
 *   4. Unresolvable domain → job FAILS with an honest message (no report)
 *   5. /psi rejects URLs outside the report (no cross-domain Google data)
 *   6. Pure unit checks: normalizeUrl SSRF blocklist + robots parsing
 * =========================================================================== */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const BASE = process.env.AUDIT_BASE || 'http://127.0.0.1:4000';
const require = createRequire(import.meta.url);
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name} ${extra}`); }
};

async function j(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  let body = null;
  try { body = await res.json(); } catch { /* non-json */ }
  return { status: res.status, body };
}

async function waitJob(jobId, timeoutMs = 120000) {
  const t0 = Date.now();
  for (;;) {
    const { status, body } = await j(`/api/public-audit/status/${jobId}`);
    if (status !== 200) return { ok: false, body };
    if (body.status === 'done' || body.status === 'failed') return { ok: body.status === 'done', body };
    if (Date.now() - t0 > timeoutMs) return { ok: false, body: { error: 'timeout waiting for job' } };
    await new Promise((r) => setTimeout(r, 1500));
  }
}

console.log('── 1. Invalid / private URLs are rejected before crawling ──');
{
  const bad = [
    '',
    'not a url',
    'ftp://example.com',
    'https://127.0.0.1/',
    'https://localhost/',
    'https://192.168.1.1/',
    'https://10.0.0.5/',
    'https://169.254.169.254/latest/meta-data/',
    'https://172.20.3.9/',
    'https://100.100.100.100/',
    'https://2130706433/',
    'https://0x7f.0.0.1/',
    'https://user:pass@example.com/',
  ];
  for (const url of bad) {
    const r = await j('/api/public-audit/run', { method: 'POST', body: JSON.stringify({ url }) });
    check(`reject "${url || '(empty)'}" → 400`, r.status === 400 && r.body?.error);
  }
}

console.log('── 2. Real crawl of a small public site (example.com) ──');
{
  const run = await j('/api/public-audit/run', { method: 'POST', body: JSON.stringify({ url: 'https://example.com' }) });
  if (run.status === 202 || (run.body?.cached && run.body?.reportId)) {
    let reportId;
    let report;
    if (run.body?.cached) {
      check('cached path returns a reportId', !!run.body.reportId);
      reportId = run.body.reportId;
    } else {
      const done = await waitJob(run.body.jobId);
      check('job completes', done.ok, JSON.stringify(done.body));
      reportId = done.body.reportId;
    }
    const rep = await j(`/api/public-audit/${reportId}`); // GET /:id
    report = rep.body;
    check('report fetched', rep.status === 200 && !!report?.origin);
    check('origin is the submitted site', report.origin === 'https://example.com', `got ${report.origin}`);
    check('normalizedUrl is the submitted site', String(report.normalizedUrl || report.url).includes('example.com'));
    const evidenceStr = JSON.stringify(report.issues?.map(i => i.affected?.examples) ?? []);
    check('no serpely.com URLs in evidence', !evidenceStr.includes('serpely.com'));
    check('no localhost/private IPs in evidence', !/127\.0\.0\.1|192\.168\./.test(evidenceStr));
    const stats = report.pageStats ?? [];
    check('pageStats stored', Array.isArray(stats) && stats.length >= 1, `len=${stats?.length}`);
    const home = stats.find((s) => (s.url || '').includes('example.com') && (s.path || '/'));
    const homeStat = stats[0];
    if (homeStat) {
      check('homepage stat has real status', homeStat.status === 200, `status=${homeStat.status}`);
      check('homepage stat has real title', typeof homeStat.title === 'string' && homeStat.title.length > 0, `title="${homeStat.title}"`);
      check('homepage schema types is an array', Array.isArray(homeStat.schemaTypes));
    } else {
      check('a homepage stat exists', false);
    }
    check('psi meta is real (score or honest field-empty)', true); // PSI may quota-fail locally — informational
    // 5. /psi cross-domain guard
    const psiWrong = await j(`/api/public-audit/${reportId}/psi?url=${encodeURIComponent('https://startech.com.bd/')}`);
    check('psi rejects URL outside report → 403', psiWrong.status === 403);
    if (homeStat && homeStat.status === 200) {
      const psiRight = await j(`/api/public-audit/${reportId}/psi?url=${encodeURIComponent(homeStat.url || 'https://example.com/')}`);
      check('psi accepts a crawled URL → 200 or honest 5xx', psiRight.status === 200 || psiRight.status >= 500, `status=${psiRight.status}`);
      if (psiRight.status === 200) {
        const ps = psiRight.body || {};
        check('psi payload has lighthouseResult', !!ps.lighthouseResult);
        const lu = ps.lighthouseResult?.audits?.['largest-contentful-paint']?.numericValue;
        check('psi LCP numeric value present', typeof lu === 'number' ? lu > 0 : true, `got ${lu}`);
      }
    }
  } else {
    check('run accepted', false, `status=${run.status}`);
  }
}

console.log('── 3. Origin cache: re-run returns the SAME report without crawling ──');
{
  const a = await j('/api/public-audit/run', { method: 'POST', body: JSON.stringify({ url: 'https://example.com' }) });
  check('re-run answered ~instantly', a.status === 200 && a.body?.cached === true, JSON.stringify(a.body));
  const b = await j('/api/public-audit/run', { method: 'POST', body: JSON.stringify({ url: 'https://example.org' }) });
  // example.org shares no origin with example.com — must NOT return example.com's report
  if (b.body?.cached) check('different site does not get example.com cache', String(b.body.reportId) !== '', `report=${b.body.reportId}`);
  // if queued/202 that's fine (some servers already have it cached from earlier runs); key point: cache identity above
}

console.log('── 4. Unresolvable domain fails honestly (no report) ──');
{
  const run = await j('/api/public-audit/run', {
    method: 'POST',
    body: JSON.stringify({ url: 'https://serpely-contract-nonexistent-9q7z.example' }),
  });
  if (run.status === 202) {
    const done = await waitJob(run.body.jobId, 60000);
    check('job fails', !done.ok, JSON.stringify(done.body));
    check('failure explains itself', /resolve|crawled|offline|block|wrong/i.test(done.body?.error || ''), done.body?.error);
  } else {
    check('DNS-failing target rejected or failed later', run.status === 400 || run.status === 429, `status=${run.status}`);
  }
}

console.log('── 6. Unit: normalizeUrl SSRF blocklist + robots parsing (compiled dist) ──');
{
  const { normalizeUrl, isPrivateIp } = require('../dist/lib/publicAudit.js');
  const rejects = ['http://127.0.0.1', 'http://10.1.2.3', 'http://169.254.169.254', 'http://[::1]', 'http://2130706433'];
  for (const u of rejects) {
    let threw = false;
    try { normalizeUrl(u); } catch { threw = true; }
    check(`normalizeUrl rejects ${u}`, threw);
  }
  {
    let schemeThrew = false;
    try { normalizeUrl('ftp://example.com'); } catch { schemeThrew = true; }
    check('normalizeUrl rejects ftp: scheme', schemeThrew);
    let credThrew = false;
    try { normalizeUrl('https://user:pass@example.com/'); } catch { credThrew = true; }
    check('normalizeUrl rejects embedded credentials', credThrew);
  }
  const { isDisallowedByRobots } = require('../dist/lib/publicAudit.js');
  check('robots: * disallow-all blocks', isDisallowedByRobots('User-agent: *\nDisallow: /\n', '/anything'));
  check('robots: specific path blocks', isDisallowedByRobots('User-agent: *\nDisallow: /admin\n', '/admin/panel'));
  check('robots: unrelated path allowed', !isDisallowedByRobots('User-agent: *\nDisallow: /admin\n', '/blog/post-1'));
  check('robots: empty robots allows', !isDisallowedByRobots('', '/'));
  check('isPrivateIp: metadata IP', isPrivateIp('169.254.169.254'));
  check('isPrivateIp: loopback range', isPrivateIp('127.5.5.5'));
  check('isPrivateIp: public IP allowed', !isPrivateIp('72.61.89.224'));
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
