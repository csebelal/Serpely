// Local-only helper: converts large public JPG/PNG to .webp (keeps originals).
// Run: cd app && npm i -D sharp && node scripts/optimize-images.mjs
import { readdir, stat } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..', 'public');
const targets = ['dashboard-home.jpg', 'dashboard-audit.jpg', 'dashboard-analytics.jpg', 'dashboard-backlinks.jpg', 'dashboard-optimizer.jpg', 'dashboard-reports.jpg', 'dashboard-tracking.jpg', 'team-photo.jpg', 'blog-hero-1.jpg', 'blog-hero-2.jpg', 'blog-hero-3.jpg', 'blog-hero-4.jpg', 'blog-hero-5.jpg'];

try {
  const { default: sharp } = await import('sharp');
  for (const f of targets) {
    const src = join(root, f);
    try {
      await stat(src);
    } catch { console.log('skip missing', f); continue; }
    const out = join(root, basename(f, extname(f)) + '.webp');
    await sharp(src).webp({ quality: 78 }).toFile(out);
    console.log('wrote', out);
  }
} catch {
  console.log('Install sharp first: npm i -D sharp');
}
