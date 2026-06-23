import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be set and be at least 32 characters');
  process.exit(1);
}

import authRouter from './routes/auth';
import sectionsRouter from './routes/sections';
import navRouter from './routes/nav';
import footerRouter from './routes/footer';
import blogRouter from './routes/blog';
import pricingRouter from './routes/pricing';
import testimonialsRouter from './routes/testimonials';
import faqRouter from './routes/faq';
import settingsRouter from './routes/settings';
import uploadRouter from './routes/upload';
import clientAuthRouter from './routes/clientAuth';
import contactRouter from './routes/contact';
import subscribersRouter from './routes/subscribers';
import popupsRouter from './routes/popups';
import changelogRouter from './routes/changelog';
import seoRouter from './routes/seo';
import analyticsRouter from './routes/analytics';
import auditRouter from './routes/audit';
import backupRouter from './routes/backup';
import apiKeysRouter from './routes/apikeys';
import sitemapRouter from './routes/sitemap';
import AdminUser from './models/AdminUser';
import SiteSettings from './models/SiteSettings';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4000;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

app.use('/api/auth', authRouter);
app.use('/api/sections', sectionsRouter);
app.use('/api/nav', navRouter);
app.use('/api/footer', footerRouter);
app.use('/api/blog', blogRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/testimonials', testimonialsRouter);
app.use('/api/faq', faqRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/users', clientAuthRouter);
app.use('/api/contact', contactRouter);
app.use('/api/subscribers', subscribersRouter);
app.use('/api/popups', popupsRouter);
app.use('/api/changelog', changelogRouter);
app.use('/api/seo', seoRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/backup', backupRouter);
app.use('/api/keys', apiKeysRouter);

app.use('/api', sitemapRouter);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Frontend: Serve index.html with injected custom head code ──────────
const frontendDist = path.resolve(__dirname, '../../app/dist');
const indexHtmlPath = path.join(frontendDist, 'index.html');

interface SettingsCache { customHeadCode: string; updatedAt: number }
let settingsCache: SettingsCache | null = null;
const SETTINGS_CACHE_TTL = 60_000;

async function getCustomHeadCode(): Promise<string> {
  const now = Date.now();
  if (settingsCache && now - settingsCache.updatedAt < SETTINGS_CACHE_TTL) {
    return settingsCache.customHeadCode;
  }
  try {
    const s = await SiteSettings.findOne().lean();
    const code = (s as any)?.customHeadCode || '';
    settingsCache = { customHeadCode: code, updatedAt: now };
    return code;
  } catch {
    return settingsCache?.customHeadCode || '';
  }
}

app.get('*', async (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  if (req.path.startsWith('/uploads/')) return res.status(404).json({ error: 'Not found' });

  try {
    let html = fs.readFileSync(indexHtmlPath, 'utf-8');
    const code = await getCustomHeadCode();
    if (code) {
      html = html.replace('</head>', code + '\n</head>');
    }
    res.type('html').send(html);
  } catch {
    res.sendFile(indexHtmlPath);
  }
});

async function seedAdmin() {
  const existing = await AdminUser.findOne();
  if (!existing) {
    const email = process.env.ADMIN_EMAIL || 'admin@serpely.com';
    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
      console.error('FATAL: ADMIN_PASSWORD env var not set — cannot seed admin user');
      process.exit(1);
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await AdminUser.create({ email, passwordHash });
    console.log(`Admin user created: ${email}`);
  }
}

mongoose
  .connect(process.env.MONGO_URI || '', { family: 4 })
  .then(async () => {
    console.log('MongoDB connected');
    await seedAdmin();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
