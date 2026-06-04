import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import AdminUser from '../models/AdminUser';
import LoginLog from '../models/LoginLog';
import { verifyJWT, AuthRequest } from '../middleware/auth';

const router = Router();

function getIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
  return req.socket.remoteAddress || req.ip || '';
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }
    const ip = getIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const user = await AdminUser.findOne({ email: email.toLowerCase() });
    if (!user) {
      await LoginLog.create({ email, ip, userAgent, success: false });
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    if (!user.passwordHash) {
      console.error('Login error: passwordHash missing for', email);
      res.status(500).json({ error: 'Account configuration error. Contact admin.' });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await LoginLog.create({ email, ip, userAgent, success: false });
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    await LoginLog.create({ email, ip, userAgent, success: true });
    const token = jwt.sign({ id: user._id, email: user.email, role: (user as any).role || 'admin' }, process.env.JWT_SECRET as string, { expiresIn: '24h' });
    res.json({ token, email: user.email });
  } catch (err) {
    console.error('Login route error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/me/password  (set own password — no old password required)
router.put('/me/password', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body as { password: string };
    if (!password || password.length < 6) { res.status(400).json({ error: 'Password must be at least 6 characters' }); return; }
    const user = await AdminUser.findById(req.adminId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string; newPassword: string;
    };
    const user = await AdminUser.findById(req.adminId);
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

// GET /api/auth/users
router.get('/users', verifyJWT, async (_req: AuthRequest, res: Response) => {
  try {
    const users = await AdminUser.find({}, { passwordHash: 0 }).sort({ createdAt: -1 });
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/users
router.post('/users', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) { res.status(400).json({ error: 'Email and password required' }); return; }
    const existing = await AdminUser.findOne({ email: email.toLowerCase() });
    if (existing) { res.status(409).json({ error: 'User already exists' }); return; }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await AdminUser.create({ email: email.toLowerCase(), passwordHash });
    res.json({ _id: user._id, email: user.email, createdAt: user.createdAt });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/users/:id/password  (auth — reset any user's password)
router.put('/users/:id/password', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body as { password: string };
    if (!password || password.length < 6) { res.status(400).json({ error: 'Password must be at least 6 characters' }); return; }
    const user = await AdminUser.findById(req.params.id);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/auth/users/:id
router.delete('/users/:id', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const total = await AdminUser.countDocuments();
    if (total <= 1) { res.status(400).json({ error: 'Cannot delete the last admin user' }); return; }
    await AdminUser.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/logs
router.get('/logs', verifyJWT, async (_req: AuthRequest, res: Response) => {
  try {
    const logs = await LoginLog.find().sort({ timestamp: -1 }).limit(200);
    res.json(logs);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
