// Human-verification / bot-challenge detection ("Verifying you are human" walls).
// Pure response analysis — no browser, no JS execution, no credentials of any kind.
// Deliberately conservative: a page must BOTH look like a challenge (status or
// provider header) AND contain challenge markers, so ordinary pages that merely
// mention challenges (blog posts, embedded Turnstile widgets) never match.

export interface ProtectionHit {
  protected: true;
  provider: string;
  evidence: string;
}

function titleOf(html: string): string {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return (m?.[1] || '').trim().toLowerCase();
}

const CF_MARKERS = [
  '__cf_bm', 'cf_chl_', 'cf_clearance', 'challenge-platform',
  'verifying you are human', 'just a moment', 'turnstile',
  'cf-please-wait', 'cf_challenge',
];

const GENERIC_MARKERS = [
  'captcha', 'verify you are', 'verify that you are', 'not a robot',
  'automated traffic', 'automated requests', 'automated access',
  'unusual traffic', 'device check', 'security check', 'challenge',
];

export function detectProtection(
  status: number,
  headers: Record<string, string>,
  html: string,
): ProtectionHit | null {
  const mitigated = (headers['cf-mitigated'] || '').toLowerCase();
  const serverHdr = (headers['server'] || '').toLowerCase();
  const cookies = (headers['set-cookie'] || '').toLowerCase();
  const isCloudflare = serverHdr.includes('cloudflare') || cookies.includes('__cf_bm');
  const cfHeaderHit = mitigated.includes('challenge') || mitigated.includes('managed_challenge');
  const badStatus = status === 403 || status === 503;
  const lower = (html || '').toLowerCase();
  const title = titleOf(html || '');

  // ── Cloudflare ──
  if (cfHeaderHit || (isCloudflare && badStatus)) {
    const found = CF_MARKERS.filter(m => lower.includes(m));
    if (cfHeaderHit || found.length > 0 || title.includes('just a moment')) {
      const what = title.includes('just a moment')
        ? '“Just a moment” interstitial'
        : found.includes('turnstile') && !found.some(m => m !== 'turnstile')
          ? 'Turnstile widget'
          : 'managed challenge';
      return {
        protected: true,
        provider: 'Cloudflare',
        evidence: `${what} (HTTP ${status}${cfHeaderHit ? ', cf-mitigated: challenge' : ''})`,
      };
    }
  }
  // Cloudflare markers with a plain 200 and no challenge header = embedded
  // widget or article text, NOT a blocking wall — do not flag.

  // ── Generic bot wall (any provider) ──
  if (badStatus) {
    const hits = GENERIC_MARKERS.filter(m => lower.includes(m));
    const tiny = (html || '').length < 15 * 1024;
    const noIdx = /<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html || '');
    if (hits.length >= 1 && (tiny || noIdx || title.includes('attention required') || title.includes('access denied'))) {
      return {
        protected: true,
        provider: 'Bot protection',
        evidence: `HTTP ${status} with bot-check markers (“${hits[0]}”)`,
      };
    }
  }

  return null;
}
