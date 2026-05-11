import { Router, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import APIKey from '../models/APIKey';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import { logAction } from '../lib/audit';

const router = Router();

// GET /api/keys (auth) — list without full key
router.get('/', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const keys = await APIKey.find({ adminId: req.adminId }).sort({ createdAt: -1 });
    res.json(keys.map(k => ({
      _id: k._id,
      name: k.name,
      prefix: k.prefix,
      active: k.active,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    })));
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/keys (auth) — generate, return full key ONCE
router.post('/', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body as { name: string };
    if (!name) { res.status(400).json({ error: 'name required' }); return; }
    const rawKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
    const prefix = rawKey.slice(0, 16);
    const keyHash = await bcrypt.hash(rawKey, 10);
    const apiKey = await APIKey.create({ name, keyHash, prefix, adminId: req.adminId });
    await logAction(req, 'create', 'apikey', `name:${name}`);
    res.status(201).json({
      _id: apiKey._id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      key: rawKey, // returned ONCE only
      createdAt: apiKey.createdAt,
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/keys/:id (auth)
router.delete('/:id', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    await APIKey.findOneAndDelete({ _id: req.params.id, adminId: req.adminId });
    await logAction(req, 'delete', 'apikey', `id:${req.params.id}`);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
