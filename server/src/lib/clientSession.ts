import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import ClientUser from '../models/ClientUser';
import { readCookie, sessionCookieOptions, clearSessionCookieOptions } from './cookies';

/**
 * Shared client-session helpers.
 *
 * The client dashboard authenticates with an httpOnly session cookie (the JWT
 * value). A Bearer header is still accepted so clients issued before cookie
 * sessions keep working until their token expires.
 */

/** client-user JWT claims — deliberately minimal (opaque subject + token version). */
export interface ClientSession {
  clientId: string;
  tokenVersion: number;
  /** Raw token (needed to re-arm the cookie). */
  token: string;
  source: 'cookie' | 'header';
}

export const CLIENT_COOKIE = process.env.NODE_ENV === 'production'
  ? '__Host-serpely_client'
  : 'serpely_client';

/** 7-day sliding window; the JWT itself caps the session at 30 days. */
export const CLIENT_IDLE_MS = 7 * 24 * 60 * 60 * 1000;

export function clientCookieOptions(maxAgeMs: number = CLIENT_IDLE_MS) {
  return sessionCookieOptions(maxAgeMs);
}

/** Resolves the signed-in client from the httpOnly cookie (preferred) or Bearer header. */
export function clientSessionFrom(req: Request): ClientSession | null {
  const cookieToken = readCookie(req, CLIENT_COOKIE);
  const candidates: { token: string; source: 'cookie' | 'header' }[] = [];
  if (cookieToken) candidates.push({ token: cookieToken, source: 'cookie' });
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) candidates.push({ token: header.slice(7), source: 'header' });

  for (const c of candidates) {
    try {
      const payload = jwt.verify(c.token, process.env.JWT_SECRET as string) as {
        clientId?: string;
        id?: string;
        typ?: string;
        tv?: number;
      };
      // Never accept an admin-scoped JWT on client routes.
      if (payload.typ && payload.typ !== 'client') continue;
      const clientId = payload.clientId || payload.id;
      if (clientId) {
        return {
          clientId: String(clientId),
          tokenVersion: payload.tv ?? 0,
          token: c.token,
          source: c.source,
        };
      }
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

/** Re-arms the cookie's lifetime so an active session stays signed in. */
export function slideClientCookie(res: Response, token: string): void {
  res.cookie(CLIENT_COOKIE, token, clientCookieOptions());
}

/** Signs a fresh client JWT — opaque subject + scope + token version, no profile data. */
export function signClientToken(clientId: string, tokenVersion: number = 0): string {
  return jwt.sign(
    { clientId, typ: 'client', tv: tokenVersion },
    process.env.JWT_SECRET as string,
    { expiresIn: '30d' },
  );
}

/** Clears the client session cookie (logout / account deletion). */
export function clearClientCookie(res: Response): void {
  res.clearCookie(CLIENT_COOKIE, clearSessionCookieOptions());
}

/**
 * Resolves the signed-in client, verifies the account still exists and its
 * tokenVersion matches, and re-arms the cookie only after validation passes.
 */
export async function resolveActiveClient(req: Request, res: Response): Promise<string | null> {
  const sess = clientSessionFrom(req);
  if (!sess) return null;
  const user = await ClientUser.findById(sess.clientId).select('_id tokenVersion').lean();
  if (!user) return null;
  if ((user.tokenVersion ?? 0) !== sess.tokenVersion) return null;
  if (sess.source === 'cookie') slideClientCookie(res, sess.token);
  return String(user._id);
}
