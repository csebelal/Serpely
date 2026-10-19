import { Request } from 'express';

/**
 * Cloudflare Turnstile verification for public write endpoints.
 *
 * Turnstile is enabled only when TURNSTILE_SECRET_KEY is set. Without it the
 * guard is a no-op, so local development and the pre-launch deploy keep working
 * — the endpoints stay protected by their rate limiters until keys are added.
 *
 * NOTE: enabling it server-side also requires the matching client widget
 * (VITE_TURNSTILE_SITE_KEY) on every form that posts to a guarded route,
 * otherwise legitimate submissions will be rejected.
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function turnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || '';
}

async function verifyTurnstile(token: unknown, ip: string): Promise<{ ok: boolean; reason: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, reason: 'disabled' };
  if (typeof token !== 'string' || !token || token.length > 4096) return { ok: false, reason: 'missing' };
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    return data.success
      ? { ok: true, reason: 'ok' }
      : { ok: false, reason: (data['error-codes'] || []).join(',') || 'failed' };
  } catch {
    // Network failure talking to Cloudflare — fail closed (block the write)
    // rather than silently disabling bot protection.
    return { ok: false, reason: 'unreachable' };
  }
}

/**
 * Returns true when the request may proceed. Sends a 403 and returns false
 * otherwise. Call at the top of a public write handler:
 *
 *   if (!(await guardTurnstile(req, res))) return;
 */
export async function guardTurnstile(req: Request, res: import('express').Response): Promise<boolean> {
  if (!turnstileEnabled()) return true;
  const result = await verifyTurnstile((req.body as Record<string, unknown>)?.turnstileToken, clientIp(req));
  if (result.ok) return true;
  res.status(403).json({ error: 'Bot verification failed. Please refresh the page and try again.' });
  return false;
}
