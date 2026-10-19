import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import AdminUser, { type AdminRole } from '../models/AdminUser';

export interface AuthRequest extends Request {
  adminId?: string;
  adminEmail?: string;
  adminRole?: AdminRole;
}

/** httpOnly session cookie for the admin panel. */
export const ADMIN_COOKIE = 'serpely_admin';

function readCookie(req: Request, name: string): string | null {
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

export async function verifyJWT(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  // Cookie first — the admin panel's httpOnly session. The Bearer header is
  // still accepted for one release (scripts, cached frontends, API clients).
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const token = readCookie(req, ADMIN_COOKIE) || bearer;
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  let decoded: { id?: string; typ?: string };
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
    if (!decoded?.id) { res.status(401).json({ error: 'Invalid token' }); return; }
    const user = await AdminUser.findById(decoded.id).select('_id email role active').lean();
    if (!user) { res.status(401).json({ error: 'Invalid token' }); return; }
    if (user.active === false) { res.status(401).json({ error: 'Account disabled' }); return; }
    req.adminId = String(user._id);
    req.adminEmail = user.email;
    // Role comes from the database, never from the token, so a demotion takes
    // effect immediately. Legacy docs without a role default to admin.
    req.adminRole = (user.role as AdminRole) || 'admin';
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
