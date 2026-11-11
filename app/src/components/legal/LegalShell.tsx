import { useEffect, useState } from 'react';
import { PageBackground } from '@/components/backgrounds/PageBackground';

interface LegalShellProps {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
  meta: string[];
  children: React.ReactNode;
}

/**
 * Shared shell for legal pages. Owns the ambient background, reading progress
 * and the article surface so Privacy and Cookie Policy stay visually identical.
 */
export function LegalShell({ eyebrow, title, subtitle, meta, children }: LegalShellProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? Math.min(100, Math.round((el.scrollTop / total) * 100)) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="legal-page">
      <div className="legal-bg" aria-hidden="true" />
      <PageBackground variant="corona" intensity={0.6} className="legal-bg-anim" />
      <div className="legal-progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <header className="legal-hero">
        <span className="legal-eyebrow">
          <span className="legal-dot" />
          {eyebrow}
        </span>
        <h1 className="legal-title">{title}</h1>
        <p className="legal-sub">{subtitle}</p>
        <div className="legal-meta">
          {meta.map(m => <span key={m}>{m}</span>)}
        </div>
        <div className="legal-rule" aria-hidden="true"><span /></div>
      </header>

      <div className="legal-wrap">
        <div className="legal-main">
          <article className="legal-article">{children}</article>

          <div className="legal-footnote">
            <span className="legal-footnote-mark" aria-hidden="true">§</span>
            <p>
              Serpely Inc. · These documents are reviewed periodically. If anything here is unclear, email{' '}
              <a href="mailto:privacy@serpely.com">privacy@serpely.com</a>.
            </p>
          </div>
        </div>
      </div>

      <style>{LEGAL_CSS}</style>
    </div>
  );
}

export function LegalSection({
  id, num, title, children, first,
}: {
  id: string; num: string; title: string; children: React.ReactNode; first?: boolean;
}) {
  return (
    <section id={id} className={`legal-section${first ? ' is-first' : ''}`}>
      <header className="legal-section-head">
        <span className="legal-num">{num}</span>
        <h2>{title}</h2>
      </header>
      <div>{children}</div>
    </section>
  );
}

export function LegalTable({
  head, rows, minWidth = 600,
}: {
  head: string[]; rows: React.ReactNode[][]; minWidth?: number;
}) {
  return (
    <div className="legal-table-wrap">
      <table style={{ minWidth }}>
        <thead>
          <tr>{head.map(h => <th key={h} scope="col">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const LEGAL_CSS = `
  .legal-page {
    position: relative;
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    padding-bottom: 96px;
    --legal-accent: #00A868;
    --legal-accent-text: #006B44;
    --legal-accent-soft: rgba(0,194,122,0.10);
    --legal-accent-line: rgba(0,194,122,0.28);
  }
  [data-theme="dark"] .legal-page {
    --legal-accent: #00FF88;
    --legal-accent-text: #00FF88;
    --legal-accent-soft: rgba(0,255,136,0.08);
    --legal-accent-line: rgba(0,255,136,0.24);
  }

  .legal-bg {
    position: absolute;
    inset: 0 0 auto 0;
    height: 720px;
    pointer-events: none;
    z-index: 0;
    background:
      radial-gradient(58% 46% at 50% 0%, rgba(0,194,122,0.15) 0%, rgba(0,194,122,0) 68%),
      radial-gradient(38% 30% at 88% 8%, rgba(0,194,122,0.08) 0%, rgba(0,194,122,0) 70%);
  }
  [data-theme="dark"] .legal-bg {
    background:
      radial-gradient(58% 46% at 50% 0%, rgba(0,255,136,0.10) 0%, rgba(0,255,136,0) 68%),
      radial-gradient(38% 30% at 88% 8%, rgba(0,255,136,0.05) 0%, rgba(0,255,136,0) 70%);
  }
  /* Ambient breathing light, clipped to the hero region of the page */
  .legal-page .legal-bg-anim.legal-bg-anim {
    position: absolute;
    inset: 0 0 auto 0;
    height: 720px;
  }
  .legal-bg::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(var(--grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid) 1px, transparent 1px);
    background-size: 52px 52px;
    -webkit-mask-image: radial-gradient(ellipse 62% 62% at 50% 0%, #000 10%, transparent 76%);
    mask-image: radial-gradient(ellipse 62% 62% at 50% 0%, #000 10%, transparent 76%);
  }

  .legal-progress {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 3px;
    z-index: 70;
    background: transparent;
  }
  .legal-progress span {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, #00C27A, #00E08F);
    transition: width 0.12s linear;
  }

  /* ── Hero ─────────────────────────────────────────────── */
  .legal-hero {
    position: relative;
    z-index: 1;
    padding: 132px 24px 8px;
    text-align: center;
  }
  .legal-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 15px;
    border-radius: 999px;
    border: 1px solid var(--legal-accent-line);
    background: var(--legal-accent-soft);
    color: var(--legal-accent-text);
    font-size: 11.5px;
    font-weight: 800;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    animation: legalRise 0.5s ease both;
  }
  .legal-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--legal-accent);
    box-shadow: 0 0 0 4px var(--legal-accent-soft);
  }
  .legal-title {
    margin: 22px auto 0;
    font-family: inherit;
    font-size: clamp(40px, 7vw, 74px);
    font-weight: 900;
    line-height: 0.98;
    letter-spacing: -0.055em;
    color: var(--text);
    animation: legalRise 0.55s 0.04s ease both;
  }
  .legal-title em {
    font-style: normal;
    background: linear-gradient(135deg, #00C27A 0%, #00A868 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  [data-theme="dark"] .legal-title em {
    background: linear-gradient(135deg, #00FF88 0%, #00C27A 100%);
    -webkit-background-clip: text;
    background-clip: text;
  }
  .legal-sub {
    max-width: 600px;
    margin: 18px auto 0;
    font-size: clamp(15px, 1.6vw, 17px);
    line-height: 1.7;
    color: var(--text-soft);
    animation: legalRise 0.6s 0.08s ease both;
  }
  .legal-meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin-top: 24px;
    animation: legalRise 0.62s 0.12s ease both;
  }
  .legal-meta span {
    display: inline-flex;
    align-items: center;
    padding: 6px 13px;
    border-radius: 999px;
    border: 1px solid hsl(var(--border));
    background: color-mix(in srgb, var(--bg-elevated) 70%, transparent);
    backdrop-filter: blur(8px);
    color: var(--text-faint);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .legal-rule {
    position: relative;
    max-width: 1180px;
    margin: 46px auto 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, hsl(var(--border)) 18%, hsl(var(--border)) 82%, transparent);
  }
  .legal-rule span {
    position: absolute;
    top: -3px; left: 50%;
    width: 7px; height: 7px;
    transform: translateX(-50%) rotate(45deg);
    background: var(--legal-accent);
    border-radius: 2px;
    box-shadow: 0 0 0 5px var(--legal-accent-soft);
  }

  /* ── Layout ───────────────────────────────────────────── */
  .legal-wrap {
    position: relative;
    z-index: 1;
    margin: 0 auto;
    padding: 38px 24px 0;
    max-width: 880px;
  }

  .legal-main { min-width: 0; }

  /* ── Article surface ──────────────────────────────────── */
  .legal-article {
    position: relative;
    background: var(--bg-elevated);
    border: 1px solid hsl(var(--border));
    border-radius: 24px;
    padding: clamp(22px, 4.2vw, 56px);
    box-shadow: 0 1px 2px rgba(10,10,10,0.03), 0 26px 64px rgba(10,10,10,0.05);
    font-size: 15px;
    line-height: 1.8;
    color: var(--text-soft);
  }
  [data-theme="dark"] .legal-article {
    box-shadow: 0 1px 2px rgba(0,0,0,0.4), 0 26px 64px rgba(0,0,0,0.45);
  }
  .legal-article > p:first-child,
  .legal-article .legal-lead { font-size: 16px; color: var(--text-mid); }
  .legal-article p { margin: 0 0 14px; }
  .legal-article a {
    color: var(--legal-accent-text);
    font-weight: 700;
    text-decoration: none;
    border-bottom: 1px solid var(--legal-accent-line);
    transition: border-color 0.15s ease;
  }
  .legal-article a:hover { border-bottom-color: var(--legal-accent); }
  .legal-article a.btn-accent-s,
  .legal-article a.btn-accent-s:hover { border-bottom: 0; color: #0A0A0A; }
  .legal-article a.btn-secondary-s,
  .legal-article a.btn-secondary-s:hover { border-bottom: 0; color: var(--text); }
  .legal-article strong { color: var(--text); font-weight: 750; }
  .legal-article ul {
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 10px 0 16px;
  }
  .legal-article li::marker { color: var(--legal-accent); }
  .legal-article h3 {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 26px 0 8px;
    font-size: 15.5px;
    font-weight: 800;
    letter-spacing: -0.015em;
    color: var(--text);
  }
  .legal-article h3::before {
    content: "";
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--legal-accent);
    box-shadow: 0 0 0 4px var(--legal-accent-soft);
    flex: none;
  }

  /* ── Sections ─────────────────────────────────────────── */
  .legal-section {
    position: relative;
    scroll-margin-top: 96px;
    padding-top: 34px;
    margin-top: 30px;
    border-top: 1px solid hsl(var(--border));
  }
  .legal-section.is-first { padding-top: 0; margin-top: 0; border-top: 0; }
  .legal-section-head {
    display: flex;
    align-items: center;
    gap: 13px;
    margin-bottom: 14px;
    position: relative;
    z-index: 1;
  }
  .legal-num {
    flex: none;
    padding: 5px 10px;
    border-radius: 8px;
    border: 1px solid var(--legal-accent-line);
    background: var(--legal-accent-soft);
    color: var(--legal-accent-text);
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.08em;
    font-variant-numeric: tabular-nums;
  }
  .legal-section h2 {
    margin: 0;
    font-size: clamp(20px, 2.2vw, 24px);
    font-weight: 850;
    letter-spacing: -0.03em;
    line-height: 1.2;
    color: var(--text);
  }

  /* ── Tables ───────────────────────────────────────────── */
  .legal-table-wrap {
    margin: 16px 0 20px;
    border: 1px solid hsl(var(--border));
    border-radius: 16px;
    overflow: auto;
    background: var(--bg-subtle);
    scrollbar-width: thin;
  }
  .legal-table-wrap table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 13px;
    line-height: 1.6;
  }
  .legal-table-wrap th {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 12px 15px;
    text-align: left;
    white-space: nowrap;
    background: var(--bg-subtle);
    color: var(--text-faint);
    font-size: 10.5px;
    font-weight: 900;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    border-bottom: 1px solid hsl(var(--border));
  }
  .legal-table-wrap td {
    padding: 13px 15px;
    vertical-align: top;
    color: var(--text-soft);
    border-bottom: 1px solid hsl(var(--border-soft));
  }
  .legal-table-wrap td:first-child { color: var(--text); font-weight: 650; }
  .legal-table-wrap tbody tr:last-child td { border-bottom: 0; }
  .legal-table-wrap tbody tr:hover td { background: var(--legal-accent-soft); }

  /* ── Shared bits used by the pages ────────────────────── */
  .legal-hl {
    background-image: linear-gradient(180deg, transparent 56%, rgba(0,194,122,0.26) 56%);
    color: var(--text);
    font-weight: 750;
    padding: 0 1px;
  }
  [data-theme="dark"] .legal-hl {
    background-image: linear-gradient(180deg, transparent 56%, rgba(0,255,136,0.20) 56%);
  }
  .legal-note {
    margin: 18px 0;
    padding: 16px 18px;
    border-radius: 14px;
    border: 1px solid hsl(var(--border));
    background: linear-gradient(180deg, var(--bg-subtle), transparent);
  }
  .legal-note > :last-child { margin-bottom: 0; }
  .legal-code {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 5px;
    border: 1px solid hsl(var(--border));
    background: var(--bg-subtle);
    color: var(--text-mid);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }
  .legal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 24px;
  }

  .legal-kicker {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 28px 0 0;
    font-size: 10.5px;
    font-weight: 900;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: var(--text-faint);
  }
  .legal-kicker::after {
    content: "";
    flex: 1;
    height: 1px;
    background: hsl(var(--border));
  }
  .legal-summary {
    margin: 12px 0 6px;
    padding: 1px;
    border-radius: 20px;
    background: linear-gradient(135deg, var(--legal-accent-line), hsl(var(--border)) 46%, hsl(var(--border)));
  }
  .legal-summary-inner {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 18px;
    border-radius: 19px;
    background: var(--bg-elevated);
  }
  .legal-summary-inner.is-three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .legal-summary-item {
    padding: 14px 15px;
    border-radius: 13px;
    border: 1px solid hsl(var(--border-soft));
    background: var(--bg-subtle);
    transition: border-color 0.18s ease, transform 0.18s ease;
  }
  .legal-summary-item:hover {
    border-color: var(--legal-accent-line);
  }
  .legal-summary-item span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px; height: 22px;
    margin-bottom: 8px;
    border-radius: 7px;
    background: var(--legal-accent-soft);
    border: 1px solid var(--legal-accent-line);
    color: var(--legal-accent-text);
    font-size: 10px;
    font-weight: 900;
  }
  .legal-summary-item p {
    margin: 0;
    font-size: 13px;
    line-height: 1.65;
    color: var(--text-soft);
  }
  .legal-summary-item strong { display: block; margin-bottom: 3px; font-size: 13px; color: var(--text); }

  .legal-cat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
  .legal-cat {
    position: relative;
    padding: 16px 17px 15px;
    border-radius: 15px;
    border: 1px solid hsl(var(--border));
    background: var(--bg-subtle);
    transition: border-color 0.18s ease, transform 0.18s ease;
  }
  .legal-cat:hover { border-color: var(--legal-accent-line); }
  .legal-cat-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 7px; }
  .legal-cat-top strong { font-size: 14px; color: var(--text); letter-spacing: -0.01em; }
  .legal-badge {
    font-size: 9.5px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 999px;
    border: 1px solid hsl(var(--border));
    color: var(--text-faint);
  }
  .legal-badge.is-on {
    border-color: var(--legal-accent-line);
    background: var(--legal-accent-soft);
    color: var(--legal-accent-text);
  }
  .legal-cat p { margin: 0 0 8px; font-size: 13px; line-height: 1.65; }
  .legal-cat-examples { font-size: 11.5px; color: var(--text-faint); }
  .legal-cat-examples code {
    font-size: 11px;
    padding: 1px 5px;
    border-radius: 4px;
    background: var(--bg-elevated);
    border: 1px solid hsl(var(--border));
    color: var(--text-mid);
  }

  .legal-contact-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    margin: 18px 0 4px;
  }
  .legal-contact {
    padding: 16px;
    border-radius: 14px;
    border: 1px solid hsl(var(--border));
    background: var(--bg-subtle);
  }
  .legal-contact span {
    display: block;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-faint);
  }
  .legal-contact strong {
    display: block;
    margin-top: 5px;
    font-size: 13.5px;
    line-height: 1.5;
    color: var(--text);
  }

  .legal-footnote {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-top: 18px;
    padding: 16px 18px;
    border-radius: 16px;
    border: 1px dashed hsl(var(--border));
    color: var(--text-faint);
  }
  .legal-footnote-mark {
    flex: none;
    display: grid;
    place-items: center;
    width: 28px; height: 28px;
    border-radius: 9px;
    background: var(--legal-accent-soft);
    border: 1px solid var(--legal-accent-line);
    color: var(--legal-accent-text);
    font-size: 13px;
    font-weight: 900;
  }
  .legal-footnote p { margin: 0; font-size: 12px; line-height: 1.6; }
  .legal-footnote a { color: var(--legal-accent-text); font-weight: 700; text-decoration: none; }

  @keyframes legalRise {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 1023px) {
    .legal-wrap { padding-top: 26px; }
    .legal-hero { padding: 118px 20px 6px; }
  }

  @media (max-width: 900px) {
    .legal-summary-inner.is-three { grid-template-columns: 1fr; }
  }

  @media (max-width: 640px) {
    .legal-wrap { padding-left: 14px; padding-right: 14px; }
    .legal-article { border-radius: 18px; }
    .legal-summary-inner { grid-template-columns: 1fr; }
    .legal-cat-grid { grid-template-columns: 1fr; }
    .legal-meta span { font-size: 11px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .legal-eyebrow, .legal-title, .legal-sub, .legal-meta { animation: none; }
    .legal-summary-item, .legal-cat { transition: none; }
  }
`;
