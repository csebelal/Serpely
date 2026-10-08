import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import APIKey from '../models/APIKey';

export interface MCPAuthRequest extends Express.Request {
  headers: any;
  body: any;
  method: string;
  apiKeyId?: string;
  apiKeyName?: string;
  adminId?: string;
}

interface ReqLike {
  headers: Record<string, any>;
}

/**
 * Optional API-key auth for MCP.
 * - No key -> allowed, marked as anonymous (public tools only).
 * - Valid sk_live_ key -> req.adminId set, full tools allowed.
 * No extra VPS needed: runs inside existing Express.
 */
export async function verifyMCPKey(req: ReqLike & { apiKeyId?: string; apiKeyName?: string; adminId?: string }, _res: Response, next: NextFunction) {
  try {
    const h = (req.headers?.authorization || req.headers?.Authorization || '') as string;
    if (!h || !h.startsWith('Bearer ')) {
      next();
      return;
    }
    const raw = h.slice(7).trim();
    if (!raw.startsWith('sk_live_')) {
      next();
      return;
    }
    const keys = await APIKey.find({ active: true }).select('+keyHash').lean();
    for (const k of keys as any[]) {
      try {
        if (await bcrypt.compare(raw, k.keyHash)) {
          req.apiKeyId = String(k._id);
          req.apiKeyName = k.name;
          req.adminId = k.adminId;
          await APIKey.updateOne({ _id: k._id }, { $set: { lastUsedAt: new Date() } }).exec();
          break;
        }
      } catch { /* try next */ }
    }
    next();
  } catch {
    next();
  }
}
