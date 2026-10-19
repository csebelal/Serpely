import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import AdminUser, { type AdminRole } from '../models/AdminUser';
import LoginLog from '../models/LoginLog';
import { verifyJWT, requireRole, AuthRequest, ADMIN_COOKIE } from '../middleware/auth';

const ROLES: AdminRole[] = ['owner', 'admin', 'editor'];

const router = Router();

function getIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
  return req.socket.remoteAddress || req.ip || '';
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again later.' },
  standardHeaders: true, legacyHeaders: false,
});

const changePasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many password change attempts.' },
  standardHeaders: true, legacyHeaders: false,
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
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
      res.status(401).json({ error: 'Incorrect email or password' });
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
      res.status(401).json({ error: 'Incorrect email or password' });
      return;
    }
    await LoginLog.create({ email, ip, userAgent, success: true });
    const role = (user as { role?: string }).role || 'admin';
    const token = jwt.sign(
      { id: user._id, email: user.email, role, typ: 'admin' },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' },
    );
    // httpOnly session cookie — JavaScript can never read it, so an XSS bug
    // cannot exfiltrate a long-lived admin credential. The token is still
    // returned for one release so cached frontends and scripts keep working.
    res.cookie(ADMIN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });
    res.json({ token, email: user.email, role });
  } catch (err) {
    console.error('Login route error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me  — who am I? (replaces client-side JWT decoding)
router.get('/me', verifyJWT, (req: AuthRequest, res: Response) => {
  res.json({ id: req.adminId, email: req.adminEmail, role: req.adminRole });
});

// POST /api/auth/logout — clear the session cookie
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(ADMIN_COOKIE, { path: '/' });
  res.json({ success: true });
});

// PUT /api/auth/me/password  (deprecated — requires the current password)
// The old version let a stolen token permanently take over the account without
// knowing the existing password. Settings.tsx now uses /change-password.
router.put('/me/password', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, password } = req.body as { currentPassword?: string; password?: string };
    if (!password || password.length < 8) { res.status(400).json({ error: 'Password must be at least 8 characters' }); return; }
    if (!currentPassword) { res.status(400).json({ error: 'Current password required' }); return; }
    const user = await AdminUser.findById(req.adminId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) { res.status(401).json({ error: 'Current password incorrect' }); return; }
    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', changePasswordLimiter, verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string; newPassword: string;
    };
    if (!currentPassword || !newPassword) { res.status(400).json({ error: 'Current and new password required' }); return; }
    if (newPassword.length < 8) { res.status(400).json({ error: 'New password must be at least 8 characters' }); return; }
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

// GET /api/auth/users  (owner — account list is sensitive)
router.get('/users', verifyJWT, requireRole('owner'), async (_req: AuthRequest, res: Response) => {
  try {
    const users = await AdminUser.find({}, { passwordHash: 0 }).sort({ createdAt: -1 });
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/users  (owner)
router.post('/users', verifyJWT, requireRole('owner'), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, role } = req.body as { email: string; password: string; role?: AdminRole };
    if (!email || !password) { res.status(400).json({ error: 'Email and password required' }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) { res.status(400).json({ error: 'Valid email required' }); return; }
    if (password.length < 8) { res.status(400).json({ error: 'Password must be at least 8 characters' }); return; }
    const existing = await AdminUser.findOne({ email: email.toLowerCase() });
    if (existing) { res.status(409).json({ error: 'User already exists' }); return; }
    const passwordHash = await bcrypt.hash(password, 10);
    const finalRole: AdminRole = role && ROLES.includes(role) ? role : 'editor';
    const user = await AdminUser.create({ email: email.toLowerCase(), passwordHash, role: finalRole });
    res.json({ _id: user._id, email: user.email, role: user.role, active: user.active, createdAt: user.createdAt });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/users/:id/password  (owner — reset another user's password)
router.put('/users/:id/password', verifyJWT, requireRole('owner'), async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body as { password: string };
    if (!password || password.length < 8) { res.status(400).json({ error: 'Password must be at least 8 characters' }); return; }
    const user = await AdminUser.findById(req.params.id);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/users/:id/role  (owner — change a user's role)
router.put('/users/:id/role', verifyJWT, requireRole('owner'), async (req: AuthRequest, res: Response) => {
  try {
    const { role, active } = req.body as { role?: AdminRole; active?: boolean };
    if (role !== undefined && !ROLES.includes(role)) { res.status(400).json({ error: 'Invalid role' }); return; }
    const user = await AdminUser.findById(req.params.id);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const demotingLastOwner = user.role === 'owner' && (role !== undefined && role !== 'owner' || active === false);
    if (demotingLastOwner) {
      const owners = await AdminUser.countDocuments({ role: 'owner', active: true, _id: { $ne: user._id } });
      if (owners === 0) { res.status(400).json({ error: 'Cannot remove the last owner' }); return; }
    }
    if (role !== undefined) user.role = role;
    if (active !== undefined) user.active = active;
    await user.save();
    res.json({ _id: user._id, email: user.email, role: user.role, active: user.active });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/auth/users/:id  (owner)
router.delete('/users/:id', verifyJWT, requireRole('owner'), async (req: AuthRequest, res: Response) => {
  try {
    const target = await AdminUser.findById(req.params.id);
    if (!target) { res.status(404).json({ error: 'User not found' }); return; }
    if (String(target._id) === String(req.adminId)) { res.status(400).json({ error: 'You cannot delete your own account' }); return; }
    if (target.role === 'owner' && target.active !== false) {
      const otherOwners = await AdminUser.countDocuments({ role: 'owner', active: true, _id: { $ne: target._id } });
      if (otherOwners === 0) { res.status(400).json({ error: 'Cannot delete the last owner' }); return; }
    }
    await AdminUser.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/logs  (owner)
router.get('/logs', verifyJWT, requireRole('owner'), async (_req: AuthRequest, res: Response) => {
  try {
    const logs = await LoginLog.find().sort({ timestamp: -1 }).limit(200);
    res.json(logs);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
