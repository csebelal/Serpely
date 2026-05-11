import { Request } from 'express';
import AuditLog from '../models/AuditLog';

function getIP(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return (Array.isArray(fwd) ? fwd[0] : fwd).split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || '';
}

export async function logAction(
  req: Request & { adminEmail?: string },
  action: 'create' | 'update' | 'delete',
  resource: string,
  detail = '',
): Promise<void> {
  try {
    await AuditLog.create({
      adminEmail: req.adminEmail || 'unknown',
      action,
      resource,
      detail,
      ip: getIP(req),
    });
  } catch {
    // non-blocking — audit failure should never break the main operation
  }
}
