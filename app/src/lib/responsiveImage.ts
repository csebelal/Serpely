// Must match RESPONSIVE_WIDTHS in server/src/lib/images.ts
export const RESPONSIVE_WIDTHS = [480, 768, 1080];

/**
 * Build a WebP srcSet for /uploads images (variants are generated
 * server-side on upload + backfilled for existing files).
 * Returns undefined for non-upload URLs so callers can fall back to plain <img>.
 */
export function uploadSrcSet(url: string): string | undefined {
  try {
    const u = new URL(url, window.location.origin);
    if (!u.pathname.includes('/uploads/')) return undefined;
    if (!/\.(png|jpe?g)$/i.test(u.pathname)) return undefined;
    const base = `${u.origin}${u.pathname.replace(/\.(png|jpe?g)$/i, '')}`;
    return RESPONSIVE_WIDTHS.map(w => `${base}-${w}.webp ${w}w`).join(', ');
  } catch {
    return undefined;
  }
}
