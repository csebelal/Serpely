import { Router, Response } from 'express';
import AuditLog from '../models/AuditLog';
import { verifyJWT, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/audit (auth)
router.get('/', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { action, from, to } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = {};
    if (action) filter.action = action;
    if (from || to) {
      filter.createdAt = {};
      if (from) (filter.createdAt as Record<string, unknown>).$gte = new Date(from);
      if (to) (filter.createdAt as Record<string, unknown>).$lte = new Date(to);
    }
    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(300);
    res.json(logs);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
