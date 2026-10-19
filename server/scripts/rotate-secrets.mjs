#!/usr/bin/env node
/**
 * Rotate production secrets that were exposed in a public repository.
 *
 *   cd /var/www/serpely/server && node scripts/rotate-secrets.mjs
 *
 * What it does (in order, all-or-nothing):
 *   1. Generates a new JWT_SECRET and GOOGLE_TOKEN_KEY.
 *   2. Keeps the old JWT_SECRET as GOOGLE_TOKEN_KEY_PREVIOUS so existing
 *      encrypted Google refresh tokens can still be decrypted (remove it once
 *      every user has reconnected Search Console).
 *   3. Generates a new admin password and updates the bcrypt hash in MongoDB.
 *   4. Rewrites .env atomically with mode 600.
 *
 * After it finishes: `pm2 restart serpely-api`.
 * Every admin session is invalidated (new JWT_SECRET) — that is intentional.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, '..');
const envPath = path.join(serverDir, '.env');

if (!fs.existsSync(envPath)) {
  console.error(`No .env at ${envPath}`);
  process.exit(1);
}

const before = dotenv.parse(fs.readFileSync(envPath));
if (!before.MONGO_URI) {
  console.error('.env has no MONGO_URI');
  process.exit(1);
}

const newJwtSecret = crypto.randomBytes(64).toString('hex');
const newGoogleKey = crypto.randomBytes(64).toString('hex');
const newAdminPassword = crypto.randomBytes(18).toString('base64url').slice(0, 20);
const adminEmail = (before.ADMIN_EMAIL || 'admin@serpely.com').toLowerCase();

// Keep every unrelated variable, replace only the rotated ones.
const next = {
  ...before,
  JWT_SECRET: newJwtSecret,
  GOOGLE_TOKEN_KEY: newGoogleKey,
  GOOGLE_TOKEN_KEY_PREVIOUS: before.GOOGLE_TOKEN_KEY || before.JWT_SECRET || '',
  ADMIN_PASSWORD: newAdminPassword,
};

// 1) Update the password hash first so we never end up with a new .env and an
//    unknown admin password.
await mongoose.connect(before.MONGO_URI, { family: 4 });
const db = mongoose.connection.db;
const adminUser = db.collection('adminusers');
const hash = await bcrypt.hash(newAdminPassword, 10);
const res = await adminUser.updateOne({ email: adminEmail }, { $set: { passwordHash: hash } });
if (res.matchedCount === 0) {
  await adminUser.insertOne({ email: adminEmail, passwordHash: hash, createdAt: new Date() });
  console.log(`Created admin ${adminEmail}`);
} else {
  console.log(`Password hash updated for ${adminEmail}`);
}
await mongoose.disconnect();

// 2) Atomic .env swap.
const body = Object.entries(next)
  .filter(([, v]) => v !== '')
  .map(([k, v]) => `${k}=${v}`)
  .join('\n') + '\n';
const tmp = `${envPath}.tmp-${process.pid}`;
fs.writeFileSync(tmp, body, { mode: 0o600 });
fs.renameSync(tmp, envPath);

console.log('\nRotated: JWT_SECRET, GOOGLE_TOKEN_KEY, admin password');
console.log(`Admin email:    ${adminEmail}`);
console.log(`Admin password: ${newAdminPassword}`);
console.log('\nNext: pm2 restart serpely-api');
console.log('Remove GOOGLE_TOKEN_KEY_PREVIOUS from .env once Google connections are re-authorized.\n');
