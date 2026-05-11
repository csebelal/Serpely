import path from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config();

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
import AdminUser from './models/AdminUser';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
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

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

async function seedAdmin() {
  const existing = await AdminUser.findOne();
  if (!existing) {
    const email = process.env.ADMIN_EMAIL || 'admin@serpely.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
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
