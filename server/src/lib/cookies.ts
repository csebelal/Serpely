import type { CookieOptions, Request } from 'express';

/** Reads a single named cookie from the raw Cookie header without throwing on malformed values. */
export function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      try { return decodeURIComponent(part.slice(eq + 1).trim()); } catch { return null; }
    }
  }
  return null;
}

/** Canonical httpOnly session cookie options used by both admin and client sessions. */
export function sessionCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeMs,
  };
}

/**
 * Matching options for `res.clearCookie` (omits `maxAge`).
 * Browsers reject clearing `__Host-` cookies in production unless `secure: true`
 * and matching attributes are present.
 */
export function clearSessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}
