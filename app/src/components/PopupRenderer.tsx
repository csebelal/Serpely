import { useEffect, useState } from 'react';
import { getActivePopups, type PopupData } from '../lib/api';

export function PopupRenderer() {
  const [popups, setPopups] = useState<PopupData[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    getActivePopups().then(r => setPopups(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    popups.forEach(p => {
      if (!p._id || dismissed.has(p._id)) return;
      if (p.trigger === 'immediate') {
        const delay = p.delay || 0;
        if (delay > 0) setTimeout(() => show(p), delay);
      } else if (p.trigger === 'scroll-50') {
        const handler = () => {
          const scrolled = window.scrollY / (document.body.scrollHeight - window.innerHeight);
          if (scrolled >= 0.5) { show(p); window.removeEventListener('scroll', handler); }
        };
        window.addEventListener('scroll', handler, { passive: true });
        return () => window.removeEventListener('scroll', handler);
      } else if (p.trigger === 'exit-intent') {
        const handler = (e: MouseEvent) => {
          if (e.clientY < 5) { show(p); document.removeEventListener('mouseleave', handler); }
        };
        document.addEventListener('mouseleave', handler);
        return () => document.removeEventListener('mouseleave', handler);
      }
    });
  }, [popups]);

  const [visible, setVisible] = useState<Set<string>>(new Set());

  function show(p: PopupData) {
    if (!p._id || dismissed.has(p._id)) return;
    setVisible(v => new Set([...v, p._id!]));
  }

  function dismiss(id: string) {
    setDismissed(d => new Set([...d, id]));
    setVisible(v => { const n = new Set(v); n.delete(id); return n; });
  }

  const activePopups = popups.filter(p => p._id && visible.has(p._id) && !dismissed.has(p._id!));
  if (activePopups.length === 0) return null;

  return (
    <>
      {activePopups.map(p => (
        <PopupItem key={p._id} popup={p} onDismiss={() => dismiss(p._id!)} />
      ))}
    </>
  );
}

function PopupItem({ popup: p, onDismiss }: { popup: PopupData; onDismiss: () => void }) {
  const bg = p.bgColor || '#0f172a';
  const textColor = isLight(bg) ? '#0f172a' : '#fff';

  if (p.type === 'banner') {
    return (
      <div style={{ position: 'fixed', top: 64, left: 0, right: 0, zIndex: 49, background: bg, color: textColor, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          {p.title && <span style={{ fontWeight: 700, fontSize: 14 }}>{p.title}</span>}
          {p.body && <span style={{ fontSize: 14, opacity: 0.85 }}>{p.body}</span>}
          {p.ctaText && p.ctaHref && (
            <a href={p.ctaHref} style={{ background: textColor === '#fff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', color: textColor, padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>{p.ctaText}</a>
          )}
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: textColor, opacity: 0.7, fontSize: 18, cursor: 'pointer', flexShrink: 0, padding: '0 4px', lineHeight: 1 }}>×</button>
      </div>
    );
  }

  if (p.type === 'corner') {
    return (
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: bg, color: textColor, borderRadius: 16, padding: '18px 20px', maxWidth: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <button onClick={onDismiss} style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: textColor, opacity: 0.7, fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
        <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: 15 }}>{p.title}</p>
        {p.body && <p style={{ margin: '0 0 12px', fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>{p.body}</p>}
        {p.ctaText && p.ctaHref && (
          <a href={p.ctaHref} style={{ display: 'inline-block', background: textColor === '#fff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', color: textColor, padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>{p.ctaText}</a>
        )}
      </div>
    );
  }

  // modal
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={onDismiss} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', background: bg, color: textColor, borderRadius: 20, padding: '32px', maxWidth: 440, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
        <button onClick={onDismiss} style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', color: textColor, opacity: 0.7, fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
        <p style={{ margin: '0 0 10px', fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>{p.title}</p>
        {p.body && <p style={{ margin: '0 0 20px', fontSize: 15, opacity: 0.85, lineHeight: 1.6 }}>{p.body}</p>}
        {p.ctaText && p.ctaHref && (
          <a href={p.ctaHref} style={{ display: 'inline-block', background: '#00C27A', color: '#fff', padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>{p.ctaText}</a>
        )}
      </div>
    </div>
  );
}

function isLight(hex: string): boolean {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128;
  } catch { return false; }
}
