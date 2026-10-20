import type { PsiField } from './pagespeed';

// Direct Chrome UX Report API lookup — real-visitor field data independent of PSI.
// Strategy: exact-URL (phone) → exact-URL (any) → origin (phone). The origin
// fallback covers low-traffic URLs where neither PSI nor URL-level CrUX has data.
// Returns null on any failure (no record, bad key, quota, timeout) — caller fails open.

const CRUX_URL = 'https://chromeuxreport.googleapis.com/v1/records:queryRecord';
const TIMEOUT_MS = 10000;

export type CruxSource = 'crux-url' | 'crux-origin';
export type CruxField = PsiField & { source: CruxSource };

interface CruxMetric { percentiles?: { p75?: number | string } }

async function query(body: Record<string, unknown>, apiKey: string): Promise<PsiField | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${CRUX_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        metrics: [
          'largest_contentful_paint',
          'cumulative_layout_shift',
          'interaction_to_next_paint',
          'experimental_time_to_first_byte',
        ],
      }),
    });
    if (!res.ok) {
      if (res.status !== 404) console.error('[crux] HTTP', res.status);
      return null;
    }
    const j = (await res.json()) as { record?: { metrics?: Record<string, CruxMetric> } };
    const m = j?.record?.metrics;
    if (!m) return null;
    const num = (k: string): number | undefined => {
      const raw = m[k]?.percentiles?.p75;
      // CrUX returns CLS as a decimal *string* ("0.08"); everything else is a number.
      const v = typeof raw === 'string' ? Number(raw) : raw;
      return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
    };
    const lcp = num('largest_contentful_paint');
    // CLS arrives as a 0–1 decimal; some payloads use the ×100 scale, so only
    // rescale values that are clearly on it (1.00 CLS is beyond any real page).
    const clsRaw = num('cumulative_layout_shift');
    const cls =
      clsRaw !== undefined ? Math.round((clsRaw > 1 ? clsRaw / 100 : clsRaw) * 1000) / 1000 : undefined;
    const inp = num('interaction_to_next_paint');
    const ttfb = num('experimental_time_to_first_byte');
    if (lcp === undefined && cls === undefined && inp === undefined && ttfb === undefined) return null;
    const states: number[] = [];
    if (lcp !== undefined) states.push(lcp <= 2500 ? 0 : lcp <= 4000 ? 1 : 2);
    if (cls !== undefined) states.push(cls <= 0.1 ? 0 : cls <= 0.25 ? 1 : 2);
    if (inp !== undefined) states.push(inp <= 200 ? 0 : inp <= 500 ? 1 : 2);
    const worst = Math.max(...states);
    return {
      overall: worst === 0 ? 'FAST' : worst === 1 ? 'AVERAGE' : 'SLOW',
      lcpMs: lcp !== undefined ? Math.round(lcp) : undefined,
      cls,
      inpMs: inp !== undefined ? Math.round(inp) : undefined,
      ttfbMs: ttfb !== undefined ? Math.round(ttfb) : undefined,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchCrux(targetUrl: string, apiKey?: string): Promise<CruxField | null> {
  if (!apiKey) return null;
  let origin = '';
  try { origin = new URL(targetUrl).origin; } catch { return null; }
  const urlPhone = await query({ url: targetUrl, formFactor: 'PHONE' }, apiKey);
  if (urlPhone) return { ...urlPhone, source: 'crux-url' };
  const urlAny = await query({ url: targetUrl }, apiKey);
  if (urlAny) return { ...urlAny, source: 'crux-url' };
  const orgPhone = await query({ origin, formFactor: 'PHONE' }, apiKey);
  if (orgPhone) return { ...orgPhone, source: 'crux-origin' };
  return null;
}
