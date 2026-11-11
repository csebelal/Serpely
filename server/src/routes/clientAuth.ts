import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import ClientUser from '../models/ClientUser';
import GoogleConnection from '../models/GoogleConnection';
import GoogleSnapshot from '../models/GoogleSnapshot';
import { guardTurnstile } from '../lib/turnstile';
import { sendEmail, verificationEmail, appUrl, apiPublicUrl, emailEnabled } from '../lib/email';
import {
  resolveActiveClient, signClientToken,
  clearClientCookie, clientCookieOptions, CLIENT_COOKIE, CLIENT_IDLE_MS,
} from '../lib/clientSession';

const router = Router();

/** Verification links stay valid for 24 hours. */
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts. Try again later.' },
  standardHeaders: true, legacyHeaders: false,
});

// Generous: mail clients and link scanners may open the URL more than once.
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many attempts. Try again later.' },
  standardHeaders: true, legacyHeaders: false,
});

/**
 * Resolves the signed-in client and, when the session came from the httpOnly
 * cookie, re-arms the cookie's lifetime (sliding idle window — the JWT stays
 * the absolute 30-day cap).
 */
async function authClient(req: Request, res: Response): Promise<{ clientId: string } | null> {
  const clientId = await resolveActiveClient(req, res);
  return clientId ? { clientId } : null;
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
    emailVerified: Boolean(user.emailVerified),
    createdAt: user.createdAt,
  };
}

/**
 * Persists a fresh verification token. Callers await this, so the token is
 * always durable before the response goes out.
 */
async function mintVerificationToken(user: InstanceType<typeof ClientUser>): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  user.verifyToken = token;
  user.verifyTokenExpires = new Date(Date.now() + VERIFY_TTL_MS);
  await user.save();
  return token;
}

/**
 * Sends the confirmation link in the background. Never throws — a slow or
 * misconfigured mail provider must not break registration.
 *
 * The token is deliberately left in place (rather than cleared on use) so
 * repeated opens by mail scanners are harmless; it expires after the TTL.
 */
function sendVerificationEmail(user: InstanceType<typeof ClientUser>, token: string): void {
  const link = `${apiPublicUrl()}/api/users/verify-email?token=${token}`;
  void sendEmail({ to: user.email, ...verificationEmail(user.name, link) })
    .then(result => {
      if (!result.sent) {
        console.warn(
          `[email] verification email not delivered for ${user.email}` +
            (result.skipped ? ' (RESEND_API_KEY unset)' : ` (${result.error})`),
        );
      }
    })
    .catch(err => console.error('[email] verification send failed:', err));
}

// POST /api/users/register
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    if (!(await guardTurnstile(req, res))) return;
    const { name, email, password } = req.body as { name: string; email: string; password: string };
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email and password required' }); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) {
      res.status(400).json({ error: 'Please enter a valid email address' }); return;
    }
    if (name.trim().length < 2 || name.length > 120) {
      res.status(400).json({ error: 'Name must be 2-120 characters' }); return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' }); return;
    }
    const existing = await ClientUser.findOne({ email: email.toLowerCase() });
    if (existing) { res.status(409).json({ error: 'Email already registered' }); return; }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await ClientUser.create({ name: name.trim(), email: email.toLowerCase(), passwordHash });
    // Soft verification: the account is usable straight away and the client shows a
    // "confirm your email" prompt. The token is stored before we reply — a failure
    // here must not fail signup, since "Resend email" can mint another one.
    let verifyToken = '';
    try { verifyToken = await mintVerificationToken(user); } catch { /* resend can retry */ }
    if (verifyToken) sendVerificationEmail(user, verifyToken);
    // Session lives in an httpOnly cookie — JavaScript never holds a usable
    // credential in localStorage. The token is still echoed in the body once
    // for scripts, but the cookie is the credential the app relies on.
    const token = signClientToken(String(user._id), user.tokenVersion ?? 0);
    res.cookie(CLIENT_COOKIE, token, clientCookieOptions(CLIENT_IDLE_MS));
    res.json({ token, user: safeUser(user) });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) { res.status(400).json({ error: 'Email and password required' }); return; }
    const user = await ClientUser.findOne({ email: email.toLowerCase() });
    if (!user) { res.status(401).json({ error: 'Invalid email or password' }); return; }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) { res.status(401).json({ error: 'Invalid email or password' }); return; }
    const token = signClientToken(String(user._id), user.tokenVersion ?? 0);
    res.cookie(CLIENT_COOKIE, token, clientCookieOptions(CLIENT_IDLE_MS));
    res.json({ token, user: safeUser(user) });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/logout — clears the httpOnly session cookie.
router.post('/logout', (_req: Request, res: Response) => {
  clearClientCookie(res);
  res.json({ success: true });
});

// GET /api/users/me
router.get('/me', async (req: Request, res: Response) => {
  const auth = await authClient(req, res);
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
  const auth = await authClient(req, res);
  if (!auth) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const rawName = (req.body as { name?: unknown })?.name;
    if (typeof rawName !== 'string' || rawName.trim().length < 2 || rawName.trim().length > 120) {
      res.status(400).json({ error: 'Name must be 2-120 characters' });
      return;
    }
    const user = await ClientUser.findByIdAndUpdate(auth.clientId, { name: rawName.trim() }, { new: true });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(safeUser(user));
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/change-password
router.post('/change-password', async (req: Request, res: Response) => {
  const auth = await authClient(req, res);
  if (!auth) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword) {
      res.status(400).json({ error: 'Both passwords required' });
      return;
    }
    if (newPassword.length < 8) { res.status(400).json({ error: 'New password must be at least 8 characters' }); return; }
    const user = await ClientUser.findById(auth.clientId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) { res.status(401).json({ error: 'Current password incorrect' }); return; }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();
    // Refresh the current browser's cookie with the new tokenVersion so every
    // other signed-in device is signed out immediately.
    const freshToken = signClientToken(String(user._id), user.tokenVersion);
    res.cookie(CLIENT_COOKIE, freshToken, clientCookieOptions(CLIENT_IDLE_MS));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/websites
router.put('/websites', async (req: Request, res: Response) => {
  const auth = await authClient(req, res);
  if (!auth) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const { websites } = req.body as { websites?: unknown };
    if (!Array.isArray(websites)) { res.status(400).json({ error: 'websites array required' }); return; }
    if (websites.length > 50) { res.status(400).json({ error: 'Too many websites' }); return; }
    const cleaned: { domain: string; addedAt: Date }[] = [];
    for (const item of websites) {
      const domain = typeof (item as { domain?: unknown })?.domain === 'string'
        ? (item as { domain: string }).domain.trim().slice(0, 253)
        : '';
      if (!domain) { res.status(400).json({ error: 'Each website requires a valid domain' }); return; }
      cleaned.push({ domain, addedAt: new Date() });
    }
    const user = await ClientUser.findById(auth.clientId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    user.websites = cleaned;
    await user.save();
    res.json(safeUser(user));
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/notifications
router.put('/notifications', async (req: Request, res: Response) => {
  const auth = await authClient(req, res);
  if (!auth) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const raw = (req.body || {}) as Record<string, unknown>;
    const user = await ClientUser.findById(auth.clientId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const keys = ['weeklyDigest', 'rankAlerts', 'geoAlerts', 'auditAlerts'] as const;
    for (const k of keys) {
      if (typeof raw[k] === 'boolean') {
        user.notifications[k] = raw[k] as boolean;
      }
    }
    await user.save();
    res.json(safeUser(user));
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/api-key  — generate new API key
router.post('/api-key', async (req: Request, res: Response) => {
  const auth = await authClient(req, res);
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
  const auth = await authClient(req, res);
  if (!auth) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    await Promise.all([
      ClientUser.findByIdAndDelete(auth.clientId),
      GoogleConnection.deleteMany({ clientId: auth.clientId }),
      GoogleSnapshot.deleteMany({ clientId: auth.clientId }),
    ]);
    clearClientCookie(res);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/verify-email?token=…  — verifies and forwards to the sign-in page.
// There is deliberately no separate verification screen: one click, then /login.
router.get('/verify-email', verifyLimiter, async (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  const fail = `${appUrl()}/login?verified=0`;
  const ok = `${appUrl()}/login?verified=1`;
  try {
    if (!token || token.length > 200) { res.redirect(302, fail); return; }
    const user = await ClientUser.findOne({ verifyToken: token });
    if (!user) { res.redirect(302, fail); return; }
    const expiry = user.verifyTokenExpires ? user.verifyTokenExpires.getTime() : 0;
    if (expiry < Date.now()) { res.redirect(302, fail); return; }
    if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }
    res.redirect(302, ok);
  } catch {
    res.redirect(302, fail);
  }
});

// POST /api/users/resend-verification
router.post('/resend-verification', authLimiter, async (req: Request, res: Response) => {
  const auth = await authClient(req, res);
  if (!auth) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const user = await ClientUser.findById(auth.clientId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    if (user.emailVerified) { res.json({ success: true, alreadyVerified: true, sent: false }); return; }
    const verifyToken = await mintVerificationToken(user);
    sendVerificationEmail(user, verifyToken);
    res.json({ success: true, alreadyVerified: false, sent: emailEnabled() });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
