import { Router, Response } from 'express';
import AuditLog from '../models/AuditLog';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import { parseDateRange } from '../lib/dateRange';

const router = Router();
const VALID_ACTIONS = new Set(['create', 'update', 'delete']);

// GET /api/audit (auth)
router.get('/', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { action, from, to } = req.query as Record<string, unknown>;
    const filter: Record<string, unknown> = {};
    if (typeof action === 'string' && VALID_ACTIONS.has(action)) filter.action = action;
    const { range, error } = parseDateRange(from, to);
    if (error) { res.status(400).json({ error }); return; }
    if (range) filter.createdAt = range;
    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(300);
    res.json(logs);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
