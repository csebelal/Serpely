import type { PublicAuditAiCrawler } from '@/lib/api';

// AI crawler access table — live robots.txt parse from backend.
export function CrawlerAccess({ crawlers }: { crawlers: PublicAuditAiCrawler[] }) {
  if (!crawlers?.length) return null;
  return (
    <div>
      <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 800 }}>AI visibility</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
        {crawlers.map(c => {
          const ok = c.status === 'Allowed';
          const miss = c.status === 'Missing';
          return (
            <div key={c.bot} style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid #E3E9E6', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? '#00B96B' : miss ? '#D9A400' : '#E5484D' }} />
                <strong style={{ fontSize: 13 }}>{c.bot}</strong>
              </div>
              <div style={{ fontSize: 12, color: ok ? '#006B43' : '#8A4108', fontWeight: 700, marginTop: 4 }}>{c.status}</div>
              <div style={{ fontSize: 11, color: '#9DB2A8' }}>{c.detail}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
