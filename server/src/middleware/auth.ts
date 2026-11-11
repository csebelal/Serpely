import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import AdminUser, { type AdminRole } from '../models/AdminUser';
import { readCookie, sessionCookieOptions } from '../lib/cookies';

export interface AuthRequest extends Request {
  adminId?: string;
  adminEmail?: string;
  adminRole?: AdminRole;
}

/**
 * httpOnly session cookie for the admin panel.
 * `__Host-` prefix (production) pins the cookie to the exact host, forbids a
 * Domain attribute and requires Secure — the strongest cookie binding browsers
 * offer. In local dev there is no TLS, so the plain name is used.
 */
export const ADMIN_COOKIE = process.env.NODE_ENV === 'production'
  ? '__Host-serpely_admin'
  : 'serpely_admin';

/** Idle window for the admin session; the JWT itself caps the session at 24h. */
export const ADMIN_IDLE_MS = 8 * 60 * 60 * 1000;

/** Canonical cookie options — login, sliding refresh and clear must all match. */
export function adminCookieOptions(maxAgeMs: number = ADMIN_IDLE_MS) {
  return sessionCookieOptions(maxAgeMs);
}

export async function verifyJWT(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  // Cookie first — the admin panel's httpOnly session. The Bearer header is
  // still accepted for one release (scripts, cached frontends, API clients).
  const cookieToken = readCookie(req, ADMIN_COOKIE);
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const token = cookieToken || bearer;
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  let decoded: { id?: string; sub?: string; typ?: string; tv?: number };
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET as string) as typeof decoded;
  } catch {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  try {
    // A client-facing token must never authorise an admin route.
    if (decoded.typ && decoded.typ !== 'admin') { res.status(401).json({ error: 'Invalid token' }); return; }
    // Defense in depth: a valid signature is not enough — the account must
    // still exist and be active (deleted/disabled admins are revoked
    // immediately, not after the token expires).
    const rawId = decoded?.id ?? decoded?.sub;
    if (!rawId) { res.status(401).json({ error: 'Invalid token' }); return; }
    const user = await AdminUser.findById(rawId).select('_id email role active tokenVersion').lean();
    if (!user) { res.status(401).json({ error: 'Invalid token' }); return; }
    if (user.active === false) { res.status(401).json({ error: 'Account disabled' }); return; }
    if ((user.tokenVersion ?? 0) !== (decoded.tv ?? 0)) { res.status(401).json({ error: 'Session revoked' }); return; }
    req.adminId = String(user._id);
    req.adminEmail = user.email;
    // Role comes from the database, never from the token, so a demotion takes
    // effect immediately. Legacy docs without a role default to admin.
    req.adminRole = (user.role as AdminRole) || 'admin';
    // Sliding idle window: re-arm only when authenticated via the httpOnly cookie.
    if (cookieToken && token === cookieToken) {
      res.cookie(ADMIN_COOKIE, token, adminCookieOptions());
    }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Route guard — use after verifyJWT. Roles are hierarchical only by convention:
 * list exactly which roles may proceed.
 */
export function requireRole(...roles: AdminRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.adminRole || !roles.includes(req.adminRole)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
