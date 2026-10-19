import tls from 'tls';
import type { FetchedPage } from './publicAudit';
import { attrVal, allTags } from './publicAudit';

// Phase 2 — small bounded fetches: outbound link status, same-origin asset
// headers, TLS certificate health. No new npm deps (fetch + node:tls only).
// Everything is capped (counts, concurrency, timeouts) and fails open:
// failures to probe never fail the audit, they just yield fewer findings.

const LINK_CAP = 30;
const ASSET_CAP = 20;
const POOL = 6;
const HEAD_TIMEOUT_MS = 8000;

const UA = 'SerpelyAuditBot/1.0 (+https://serpely.com/audit)';

export interface BrokenLink { url: string; status: number; note: string }
export interface UncachedAsset { url: string; kind: string }
export interface OversizedAsset { url: string; kind: string; kb: number }
export interface TlsInfo {
  protocol: string; issuer: string; daysLeft: number;
}

export interface Phase2Data {
  extTotal: number;
  unverifiable: number;
  brokenLinks: BrokenLink[];
  assetTotal: number;
  uncached: UncachedAsset[];
  oversized: OversizedAsset[];
  tls: TlsInfo | null;
}

const EMPTY: Phase2Data = {
  extTotal: 0, unverifiable: 0, brokenLinks: [],
  assetTotal: 0, uncached: [], oversized: [], tls: null,
};

function absHttp(href: string, origin: string): string | null {
  const h = (href || '').trim();
  if (!h || /^(mailto:|tel:|javascript:|data:|#)/i.test(h)) return null;
  try {
    const u = new URL(h, origin);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

async function head(url: string): Promise<{ status: number; headers: Record<string, string> } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), HEAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'HEAD', signal: ctrl.signal, redirect: 'follow',
      headers: { 'User-Agent': UA },
    });
    clearTimeout(t);
    // Drain nothing — HEAD has no body. Capture headers only.
    await res.arrayBuffer().catch(() => null);
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    return { status: res.status, headers };
  } catch {
    clearTimeout(t);
    return null;
  }
}

async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        out[i] = await fn(items[i]);
      } catch {
        out[i] = undefined as unknown as R;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, () => worker()));
  return out.filter(v => v !== undefined);
}

function hostOf(u: string): string {
  try { return new URL(u).hostname.toLowerCase(); } catch { return ''; }
}

/** TLS certificate + protocol via direct handshake (node stdlib, no HTTP involved). */
function probeTls(hostname: string): Promise<TlsInfo | null> {
  return new Promise((resolve) => {
    if (!hostname || /^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes('[')) {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => { sock.destroy(); resolve(null); }, HEAD_TIMEOUT_MS);
    const sock = tls.connect({ host: hostname, port: 443, servername: hostname }, () => {
      clearTimeout(timer);
      try {
        const cert = sock.getPeerCertificate() as { issuer?: { O?: string; CN?: string }; valid_to?: string };
        const protocol = sock.getProtocol() || '';
        const validTo = cert?.valid_to ? new Date(cert.valid_to).getTime() : NaN;
        const daysLeft = Number.isFinite(validTo) ? Math.round((validTo - Date.now()) / 86400000) : NaN;
        const issuer = String(cert?.issuer?.O || cert?.issuer?.CN || 'unknown issuer');
        sock.end();
        resolve({ protocol, issuer, daysLeft });
      } catch {
        sock.destroy();
        resolve(null);
      }
    });
    sock.on('error', () => { clearTimeout(timer); resolve(null); });
  });
}

export async function collectPhase2(page: FetchedPage, normalizedUrl: string, origin: string): Promise<Phase2Data> {
  try {
    const html = page.html || '';
    const pageHost = hostOf(page.finalUrl || normalizedUrl);

    // ── Outbound links (external hosts only; internal is Phase-3 crawl territory) ──
    const hrefs = allTags(html, 'a').map(t => attrVal(t, 'href')).filter(Boolean);
    const seen = new Set<string>();
    const external: string[] = [];
    for (const h of hrefs) {
      const abs = absHttp(h, origin);
      if (!abs || seen.has(abs)) continue;
      seen.add(abs);
      if (hostOf(abs) && hostOf(abs) !== pageHost) external.push(abs);
      if (external.length >= LINK_CAP) break;
    }

    // ── Same-origin assets (scripts, stylesheets, images) ──
    const assetSrc: { url: string; kind: string }[] = [];
    const seenA = new Set<string>();
    const pushAsset = (src: string | undefined | null, kind: string) => {
      if (!src || assetSrc.length >= ASSET_CAP) return;
      const abs = absHttp(src, origin);
      if (!abs || seenA.has(abs)) return;
      if (hostOf(abs) !== pageHost) return;
      seenA.add(abs);
      assetSrc.push({ url: abs, kind });
    };
    for (const t of allTags(html, 'script')) pushAsset(attrVal(t, 'src'), 'js');
    for (const t of allTags(html, 'link')) {
      const rels = attrVal(t, 'rel').toLowerCase().split(/\s+/);
      if (rels.includes('stylesheet')) pushAsset(attrVal(t, 'href'), 'css');
    }
    for (const t of allTags(html, 'img')) pushAsset(attrVal(t, 'src'), 'img');

    // ── Probe links ──
    const linkRes = await pool(external, POOL, async (u) => {
      const r = await head(u);
      if (!r) return { u, cls: 'broken' as const, status: 0 };
      if (r.status === 403 || r.status === 429) return { u, cls: 'unverifiable' as const, status: r.status };
      if (r.status >= 400) return { u, cls: 'broken' as const, status: r.status };
      return { u, cls: 'ok' as const, status: r.status };
    });
    const brokenLinks: BrokenLink[] = linkRes
      .filter(r => r.cls === 'broken')
      .map(r => ({
        url: r.u, status: r.status,
        note: r.status === 0 ? 'unreachable (timeout/DNS)' : `HTTP ${r.status}`,
      }));
    const unverifiable = linkRes.filter(r => r.cls === 'unverifiable').length;

    // ── Probe assets ──
    const assetRes = await pool(assetSrc, POOL, async (a) => {
      const r = await head(a.url);
      if (!r) return null;
      const len = Number(r.headers['content-length'] || -1);
      const enc = (r.headers['content-encoding'] || '').toLowerCase();
      const cc = (r.headers['cache-control'] || '').toLowerCase();
      const hasCache = /max-age|s-maxage|immutable/.test(cc)
        || !!r.headers['expires'] || !!r.headers['etag'] || !!r.headers['last-modified'];
      return { ...a, bytes: Number.isFinite(len) ? len : -1, enc, cached: hasCache };
    });
    const uncached: UncachedAsset[] = assetRes.filter(a => a && !a.cached).map(a => ({ url: a!.url, kind: a!.kind }));
    const oversized: OversizedAsset[] = assetRes
      .filter(a => a && a.bytes > 0 && ((a.kind !== 'img' && a.bytes > 250 * 1024) || (a.kind === 'img' && a.bytes > 1024 * 1024)))
      .map(a => ({ url: a!.url, kind: a!.kind, kb: Math.round(a!.bytes / 1024) }));

    // ── TLS (https pages only) ──
    let tlsInfo: TlsInfo | null = null;
    if (normalizedUrl.startsWith('https://')) {
      tlsInfo = await probeTls(pageHost);
    }

    return {
      extTotal: external.length,
      unverifiable,
      brokenLinks: brokenLinks.slice(0, 10),
      assetTotal: assetRes.filter(Boolean).length,
      uncached: uncached.slice(0, 10),
      oversized: oversized.slice(0, 10),
      tls: tlsInfo,
    };
  } catch {
    return { ...EMPTY };
  }
}
