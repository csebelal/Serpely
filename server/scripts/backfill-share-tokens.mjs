#!/usr/bin/env node
/**
 * Backfill shareTokens for reports created before random public ids existed.
 * Idempotent — safe to run repeatedly.
 *
 *   cd server && node scripts/backfill-share-tokens.mjs --dry-run
 *   cd server && node scripts/backfill-share-tokens.mjs
 *
 * Reports are now addressed only by a 32-hex shareToken; a bare Mongo _id returns
 * 404. So a report with no token is unreachable by anyone — run this once after
 * deploying if the database still holds pre-token reports, or those links are
 * permanently lost.
 */
import crypto from 'crypto';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const DRY = process.argv.includes('--dry-run');
const BATCH = 200;

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not set (run from server/ with .env present).');
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI, { family: 4 });
const db = mongoose.connection.db;

async function backfill(collection, label) {
  const missing = {
    $or: [{ shareToken: { $exists: false } }, { shareToken: '' }, { shareToken: null }],
  };
  const total = await db.collection(collection).countDocuments(missing);
  console.log(`${label}: ${total} document(s) without a shareToken${DRY ? ' (dry run)' : ''}`);
  if (DRY || total === 0) return { total, updated: 0 };

  let updated = 0;
  let cursor = db.collection(collection).find(missing, { projection: { _id: 1 } });
  let batch = [];
  const flush = async () => {
    if (!batch.length) return;
    await db.collection(collection).bulkWrite(batch.map(_id => ({
      updateOne: { filter: { _id }, update: { $set: { shareToken: crypto.randomBytes(16).toString('hex') } } },
    })), { ordered: false });
    updated += batch.length;
    batch = [];
  };
  for await (const doc of cursor) {
    batch.push(doc._id);
    if (batch.length >= BATCH) await flush();
  }
  await flush();
  console.log(`${label}: assigned ${updated} token(s)`);
  return { total, updated };
}

const audits = await backfill('auditreports', 'audit reports');
const sitemaps = await backfill('sitemapreports', 'sitemap reports');

await mongoose.disconnect();
console.log(JSON.stringify({ dryRun: DRY, audits, sitemaps }));
