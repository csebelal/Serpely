import fs from 'fs';
import path from 'path';
import { Router, Response } from 'express';
import { verifyJWT, requireRole, AuthRequest } from '../middleware/auth';
import { logAction } from '../lib/audit';
import SiteSection from '../models/SiteSection';
import BlogPost from '../models/BlogPost';
import PricingPlan from '../models/PricingPlan';
import Testimonial from '../models/Testimonial';
import FaqItem from '../models/FaqItem';
import NavItem from '../models/NavItem';
import FooterConfig from '../models/FooterConfig';
import SiteSettings from '../models/SiteSettings';

const router = Router();

const BACKUP_VERSION = 1;
const BACKUP_DIR = path.resolve(__dirname, '..', '..', 'backups');
const KEEP_SNAPSHOTS = 5;
const MAX_ROWS = 5000;

type CollectionKey = 'sections' | 'blogPosts' | 'pricing' | 'testimonials' | 'faq' | 'nav' | 'footer' | 'settings';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COLLECTIONS: { key: CollectionKey; model: any }[] = [
  { key: 'sections', model: SiteSection },
  { key: 'blogPosts', model: BlogPost },
  { key: 'pricing', model: PricingPlan },
  { key: 'testimonials', model: Testimonial },
  { key: 'faq', model: FaqItem },
  { key: 'nav', model: NavItem },
  { key: 'footer', model: FooterConfig },
  { key: 'settings', model: SiteSettings },
];

async function exportAll(): Promise<Record<string, unknown>> {
  const rows = await Promise.all(COLLECTIONS.map(c => c.model.find().lean()));
  const out: Record<string, unknown> = { version: BACKUP_VERSION, exportedAt: new Date().toISOString() };
  COLLECTIONS.forEach((c, i) => { out[c.key] = rows[i]; });
  return out;
}

/** Write the current database to disk before a restore, so a bad import is recoverable. */
async function snapshotCurrent(): Promise<string> {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const name = `auto-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const file = path.join(BACKUP_DIR, name);
  fs.writeFileSync(file, JSON.stringify(await exportAll()), { mode: 0o600 });
  // Keep only the newest N snapshots.
  const all = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('auto-') && f.endsWith('.json'))
    .sort()
    .reverse();
  for (const old of all.slice(KEEP_SNAPSHOTS)) {
    try { fs.unlinkSync(path.join(BACKUP_DIR, old)); } catch { /* ignore */ }
  }
  return file;
}

// GET /api/backup (owner — full database dump)
router.get('/', verifyJWT, requireRole('owner'), async (_req: AuthRequest, res: Response) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(await exportAll());
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/backup/restore (auth)
// Destructive by design — so it requires an explicit confirmation string, an
// optional dry run, and always writes a pre-restore snapshot first.
router.post('/restore', verifyJWT, requireRole('owner'), async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body as Record<string, unknown> & { backup?: Record<string, unknown>; confirm?: unknown };
    if (body?.confirm !== 'RESTORE') {
      res.status(400).json({
        error: 'Confirmation required. Send { "backup": { ... }, "confirm": "RESTORE" }.',
        code: 'CONFIRM_REQUIRED',
      });
      return;
    }

    const backup = (body.backup && typeof body.backup === 'object' ? body.backup : body) as Record<string, unknown>;

    const counts: Partial<Record<CollectionKey, number>> = {};
    for (const { key } of COLLECTIONS) {
      const rows = backup[key];
      if (rows === undefined) continue;
      if (!Array.isArray(rows)) {
        res.status(400).json({ error: `backup.${key} must be an array`, code: 'INVALID_BACKUP' });
        return;
      }
      if (rows.length > MAX_ROWS) {
        res.status(400).json({ error: `backup.${key} exceeds ${MAX_ROWS} rows`, code: 'INVALID_BACKUP' });
        return;
      }
      counts[key] = rows.length;
    }
    if (!Object.keys(counts).length) {
      res.status(400).json({ error: 'Backup contains no known collections', code: 'INVALID_BACKUP' });
      return;
    }

    const dryRun = req.query.dryRun === '1' || req.query.dryRun === 'true';
    if (dryRun) {
      res.json({ dryRun: true, willReplace: counts });
      return;
    }

    const snapshot = await snapshotCurrent();

    for (const { key, model } of COLLECTIONS) {
      const rows = backup[key] as unknown[] | undefined;
      if (!rows) continue;
      await model.deleteMany({});
      if (rows.length) {
        await model.insertMany(rows.map((r: unknown) => {
          const { _id: _ignored, __v: _version, ...rest } = r as Record<string, unknown>;
          return rest;
        }));
      }
    }

    await logAction(req, 'restore', 'backup', `snapshot:${path.basename(snapshot)} collections:${Object.keys(counts).join(',')}`);
    res.json({ success: true, snapshot: path.basename(snapshot), restored: counts });
  } catch (err) {
    console.error('Backup restore failed:', (err as Error)?.message);
    res.status(500).json({ error: 'Restore failed — the pre-restore snapshot is in server/backups/.' });
  }
});

export default router;
