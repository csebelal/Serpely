import crypto from 'crypto';

const BASE_URL = process.env.SITE_URL || 'https://serpely.com';

export function getIndexNowKey(): string {
  // Stable, deterministic key derived from the persisted JWT_SECRET so it never
  // changes across restarts (keeps the key-proof .txt file valid).
  const secret = process.env.JWT_SECRET || 'fallback-secret';
  return crypto.createHash('sha256').update('serpely-indexnow:' + secret).digest('hex');
}

export async function pingSearchEngines(slugs: string[]): Promise<void> {
  const unique = Array.from(new Set(slugs.filter(Boolean)));
  if (!unique.length) return;

  const key = getIndexNowKey();
  const urlList = unique.map(s => `${BASE_URL}/blog/${s}`);

  const indexNowBody = {
    host: BASE_URL.replace(/^https?:\/\//, ''),
    key,
    keyLocation: `${BASE_URL}/${key}.txt`,
    urlList,
  };

  const pings: Promise<unknown>[] = [
    // Bing IndexNow (also read by Google)
    fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(indexNowBody),
    }).then(r => { console.log(`[IndexNow] ${r.status} for ${unique.length} url(s)`); return r; }),

    // Google lightweight sitemap ping (best-effort nudge)
    fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(`${BASE_URL}/api/sitemap.xml`)}`)
      .then(r => console.log(`[GooglePing] ${r.status}`))
      .catch(() => {}),
  ];

  // Fire-and-forget: never block or throw into the request handler.
  await Promise.allSettled(pings);
}
