import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import ClientUser from '../models/ClientUser';

const router = Router();
const SECRET = () => process.env.JWT_SECRET as string;

function verifyClientToken(req: Request): { clientId: string } | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(header.split(' ')[1], SECRET()) as { clientId?: string };
    return payload.clientId ? { clientId: payload.clientId } : null;
  } catch {
    return null;
  }
}

function safeUser(user: InstanceType<typeof ClientUser>) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    websites: user.websites,
    notifications: user.notifications,
    apiKey: user.apiKey,
    createdAt: user.createdAt,
  };
}

// POST /api/users/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body as { name: string; email: string; password: string };
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email and password required' }); return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' }); return;
    }
    const existing = await ClientUser.findOne({ email: email.toLowerCase() });
    if (existing) { res.status(409).json({ error: 'Email already registered' }); return; }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await ClientUser.create({ name: name.trim(), email: email.toLowerCase(), passwordHash });
    const token = jwt.sign({ clientId: user._id }, SECRET(), { expiresIn: '30d' });
    res.json({ token, user: safeUser(user) });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) { res.status(400).json({ error: 'Email and password required' }); return; }
    const user = await ClientUser.findOne({ email: email.toLowerCase() });
    if (!user) { res.status(401).json({ error: 'Invalid email or password' }); return; }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) { res.status(401).json({ error: 'Invalid email or password' }); return; }
    const token = jwt.sign({ clientId: user._id }, SECRET(), { expiresIn: '30d' });
    res.json({ token, user: safeUser(user) });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/me
router.get('/me', async (req: Request, res: Response) => {
  const auth = verifyClientToken(req);
  if (!auth) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const user = await ClientUser.findById(auth.clientId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(safeUser(user));
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/me  — update name
router.put('/me', async (req: Request, res: Response) => {
  const auth = verifyClientToken(req);
  if (!auth) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const { name } = req.body as { name: string };
    if (!name?.trim()) { res.status(400).json({ error: 'Name required' }); return; }
    const user = await ClientUser.findByIdAndUpdate(auth.clientId, { name: name.trim() }, { new: true });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(safeUser(user));
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/change-password
router.post('/change-password', async (req: Request, res: Response) => {
  const auth = verifyClientToken(req);
  if (!auth) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
    if (!currentPassword || !newPassword) { res.status(400).json({ error: 'Both passwords required' }); return; }
    if (newPassword.length < 6) { res.status(400).json({ error: 'New password must be at least 6 characters' }); return; }
    const user = await ClientUser.findById(auth.clientId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) { res.status(401).json({ error: 'Current password incorrect' }); return; }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/websites
router.put('/websites', async (req: Request, res: Response) => {
  const auth = verifyClientToken(req);
  if (!auth) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const { websites } = req.body as { websites: { domain: string }[] };
    const user = await ClientUser.findById(auth.clientId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    user.websites = (websites || []).map(w => ({ domain: w.domain.trim(), addedAt: new Date() }));
    await user.save();
    res.json(safeUser(user));
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/notifications
router.put('/notifications', async (req: Request, res: Response) => {
  const auth = verifyClientToken(req);
  if (!auth) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const notifs = req.body as { weeklyDigest?: boolean; rankAlerts?: boolean; geoAlerts?: boolean; auditAlerts?: boolean };
    const user = await ClientUser.findById(auth.clientId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    user.notifications = { ...user.notifications, ...notifs };
    await user.save();
    res.json(safeUser(user));
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/api-key  — generate new API key
router.post('/api-key', async (req: Request, res: Response) => {
  const auth = verifyClientToken(req);
  if (!auth) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const user = await ClientUser.findById(auth.clientId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    if (user.plan === 'starter') { res.status(403).json({ error: 'API access requires Pro or Business plan' }); return; }
    user.apiKey = 'srp_' + crypto.randomBytes(24).toString('hex');
    await user.save();
    res.json({ apiKey: user.apiKey });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/me
router.delete('/me', async (req: Request, res: Response) => {
  const auth = verifyClientToken(req);
  if (!auth) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    await ClientUser.findByIdAndDelete(auth.clientId);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
