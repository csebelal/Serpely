import { useEffect, useState } from 'react';
import { getChangelog, type ChangelogData } from '../lib/api';

const TYPE_CONFIG = {
  feature:     { label: 'New Feature', color: '#6366f1', bg: '#eef2ff' },
  improvement: { label: 'Improvement', color: '#0ea5e9', bg: '#f0f9ff' },
  fix:         { label: 'Bug Fix',     color: '#f59e0b', bg: '#fffbeb' },
};

export function Changelog() {
  const [entries, setEntries] = useState<ChangelogData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChangelog().then(r => setEntries(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', paddingBottom: 80 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <span style={{ display: 'inline-block', background: '#00C27A18', color: '#00C27A', fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 20, marginBottom: 16, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Changelog</span>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 16px', lineHeight: 1.1 }}>What's New</h1>
          <p style={{ fontSize: 17, color: 'var(--text-soft)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Follow along as we build, improve, and ship new features.
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-soft)' }}>Loading…</div>
        )}

        {!loading && entries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-soft)' }}>
            <p style={{ fontSize: 16 }}>No announcements yet. Check back soon.</p>
          </div>
        )}

        <div style={{ position: 'relative' }}>
          {entries.length > 0 && (
            <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 2, background: 'var(--border, #e2e8f0)' }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            {entries.map(entry => {
              const cfg = TYPE_CONFIG[entry.type];
              return (
                <div key={entry._id} style={{ display: 'flex', gap: 24, position: 'relative' }}>
                  <div style={{ flexShrink: 0, width: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: cfg.color, border: '3px solid var(--bg, #fff)', zIndex: 1, marginTop: 4 }} />
                  </div>
                  <div style={{ flex: 1, paddingBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, letterSpacing: '0.04em' }}>{cfg.label}</span>
                      {entry.publishedAt && (
                        <span style={{ fontSize: 12, color: 'var(--text-soft)', fontWeight: 500 }}>
                          {new Date(entry.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 10px', lineHeight: 1.3 }}>{entry.title}</h2>
                    <div style={{ fontSize: 15, color: 'var(--text-soft)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {entry.body}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
