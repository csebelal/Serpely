import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

export const RESPONSIVE_WIDTHS = [480, 768, 1080];
const WEBP_QUALITY = 80;

/**
 * Generate responsive WebP variants (`<name>-480.webp` …) next to the original.
 * Always creates the full width set so frontend srcSets never 404.
 * Never throws — returns the files that exist afterwards.
 */
export async function generateVariants(absPath: string): Promise<string[]> {
  const ext = path.extname(absPath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return [];
  if (!fs.existsSync(absPath)) return [];
  const dir = path.dirname(absPath);
  const base = path.basename(absPath, ext);
  const created: string[] = [];
  for (const w of RESPONSIVE_WIDTHS) {
    const out = path.join(dir, `${base}-${w}.webp`);
    if (fs.existsSync(out)) {
      created.push(out);
      continue;
    }
    try {
      await sharp(absPath).resize({ width: w }).webp({ quality: WEBP_QUALITY }).toFile(out);
      created.push(out);
    } catch (e) {
      console.error('[images] variant failed', absPath, w, e instanceof Error ? e.message : e);
    }
  }
  return created;
}

/** Delete variants alongside the original (used on media delete). */
export function deleteVariants(absPath: string): void {
  const ext = path.extname(absPath);
  if (!ext) return;
  const dir = path.dirname(absPath);
  const base = path.basename(absPath, ext);
  for (const w of RESPONSIVE_WIDTHS) {
    const p = path.join(dir, `${base}-${w}.webp`);
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch {
        /* ignore */
      }
    }
  }
}
