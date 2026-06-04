import { useEffect, useState } from 'react';
import { getSection, updateSection } from '@/lib/api';
import type { CompRow, DiffCard } from '@/pages/Compare';
import { DEFAULT_COMPARISONS, DEFAULT_DIFFERENCES } from '@/pages/Compare';

const s = {
  page:       { padding: '32px 40px', maxWidth: 960 } as React.CSSProperties,
  card:       { background: '#fff', borderRadius: 16, padding: '24px 26px', marginBottom: 16, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' } as React.CSSProperties,
  label:      { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.05em' } as React.CSSProperties,
  inp:        { width: '100%', padding: '9px 13px', background: '#f1f5f9', border: 'none', borderRadius: 10, color: '#0f172a', fontSize: 14, boxSizing: 'border-box' as const, fontFamily: 'inherit' } as React.CSSProperties,
  ta:         { width: '100%', padding: '9px 13px', background: '#f1f5f9', border: 'none', borderRadius: 10, color: '#0f172a', fontSize: 14, boxSizing: 'border-box' as const, fontFamily: 'inherit', resize: 'vertical' as const } as React.CSSProperties,
  head:       { margin: '0 0 18px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.08em' } as React.CSSProperties,
  btnGreen:   { padding: '9px 22px', background: '#00C27A', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' } as React.CSSProperties,
  btnGhost:   { padding: '7px 14px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' } as React.CSSProperties,
  btnDanger:  { padding: '7px 14px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' } as React.CSSProperties,
  tab:        (active: boolean): React.CSSProperties => ({ padding: '8px 18px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', background: active ? '#00C27A' : '#f1f5f9', color: active ? '#fff' : '#64748b', transition: 'all 0.15s' }),
  subCard:    { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 18px', marginBottom: 12 } as React.CSSProperties,
  row:        { display: 'flex', gap: 12, marginBottom: 14 } as React.CSSProperties,
  chk:        { width: 16, height: 16, accentColor: '#00C27A', cursor: 'pointer', flexShrink: 0 } as React.CSSProperties,
};

type Tab = 'hero' | 'table' | 'cards' | 'cta';

const FEATURE_CATEGORIES = ['AI & GEO', 'Core SEO', 'Agency', 'Reporting', 'Integration', 'Other'];

function useSaveState() {
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [err,    setErr]    = useState('');
  async function doSave(fn: () => Promise<void>) {
    setSaving(true); setErr('');
    try { await fn(); setSaved(true); setTimeout(() => setSaved(false), 2500); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  }
  return { saving, saved, err, doSave };
}

function SaveBtn({ saving, saved, err, onClick }: { saving: boolean; saved: boolean; err: string; onClick: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button onClick={onClick} disabled={saving} style={s.btnGreen}>
        {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
      </button>
      {err && <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{err}</span>}
    </div>
  );
}

// ── Hero Tab ────────────────────────────────────────────────────────────────
function HeroTab() {
  const [headline, setHeadline] = useState('See how we stack up');
  const [subtext,  setSubtext]  = useState('See why thousands of teams are switching to Serpely for their SEO and GEO needs.');
  const { saving, saved, err, doSave } = useSaveState();

  useEffect(() => {
    getSection('compare').then(r => {
      const d = r.data.data as Record<string, unknown>;
      if (typeof d.heroHeadline === 'string') setHeadline(d.heroHeadline);
      if (typeof d.heroSubtext  === 'string') setSubtext(d.heroSubtext);
    }).catch(() => {});
  }, []);

  return (
    <div style={s.card}>
      <p style={s.head}>Hero Section</p>
      <div style={{ marginBottom: 16 }}>
        <label style={s.label}>Headline</label>
        <input value={headline} onChange={e => setHeadline(e.target.value)} style={s.inp} />
        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Tip: include "stack up" to apply green gradient to those words</p>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={s.label}>Subtext</label>
        <textarea value={subtext} onChange={e => setSubtext(e.target.value)} rows={2} style={s.ta} />
      </div>
      <SaveBtn saving={saving} saved={saved} err={err} onClick={() => doSave(async () => {
        await updateSection('compare', { heroHeadline: headline, heroSubtext: subtext } as unknown as Record<string, unknown>);
      })} />
    </div>
  );
}

// ── Table Tab ────────────────────────────────────────────────────────────────
function TableTab() {
  const [rows, setRows] = useState<CompRow[]>(DEFAULT_COMPARISONS);
  const { saving, saved, err, doSave } = useSaveState();

  useEffect(() => {
    getSection('compare').then(r => {
      const d = r.data.data as Record<string, unknown>;
      if (Array.isArray(d.comparisons)) setRows(d.comparisons as CompRow[]);
    }).catch(() => {});
  }, []);

  function updateRow(i: number, patch: Partial<CompRow>) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  function addFeatureRow() {
    const newRow: CompRow = { feature: 'New Feature', category: 'Core SEO', serpely: true, ahrefs: false, semrush: false, moz: false };
    setRows(prev => [newRow, ...prev.filter(r => !r.isPrice), ...prev.filter(r => r.isPrice)]);
  }

  function removeRow(i: number) {
    setRows(prev => prev.filter((_, idx) => idx !== i));
  }

  const featureRows = rows.filter(r => !r.isPrice);
  const priceRow    = rows.find(r => r.isPrice);

  return (
    <div>
      {/* Feature rows */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <p style={{ ...s.head, margin: 0 }}>Feature Rows</p>
          <button onClick={addFeatureRow} style={s.btnGhost}>+ Add Row</button>
        </div>

        {/* Column headers hint */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 70px 70px 70px 70px 36px', gap: 8, marginBottom: 8, padding: '0 4px' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Feature name</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#00C27A', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Serpely</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Ahrefs</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Semrush</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Moz</span>
          <span />
        </div>

        {featureRows.map((row, rawIdx) => {
          const i = rows.indexOf(row);
          return (
            <div key={rawIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 70px 70px 70px 70px 36px', gap: 8, alignItems: 'center', marginBottom: 8, padding: '8px 10px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <input
                value={row.feature}
                onChange={e => updateRow(i, { feature: e.target.value })}
                style={{ ...s.inp, marginBottom: 0, fontSize: 13 }}
              />
              <select
                value={row.category || ''}
                onChange={e => updateRow(i, { category: e.target.value })}
                style={{ ...s.inp, marginBottom: 0, fontSize: 12, cursor: 'pointer' }}
              >
                <option value="">— Category —</option>
                {FEATURE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {(['serpely', 'ahrefs', 'semrush', 'moz'] as const).map(tool => (
                <div key={tool} style={{ display: 'flex', justifyContent: 'center' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(row[tool])}
                    onChange={e => updateRow(i, { [tool]: e.target.checked })}
                    style={s.chk}
                  />
                </div>
              ))}
              <button onClick={() => removeRow(i)} style={{ ...s.btnDanger, padding: '4px 8px', fontSize: 13 }}>✕</button>
            </div>
          );
        })}
      </div>

      {/* Price row */}
      {priceRow && (
        <div style={s.card}>
          <p style={s.head}>Starting Price Row</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            {(['serpely', 'ahrefs', 'semrush', 'moz'] as const).map(tool => {
              const pi = rows.indexOf(priceRow);
              return (
                <div key={tool}>
                  <label style={{ ...s.label, color: tool === 'serpely' ? '#00C27A' : '#64748b' }}>
                    {tool.charAt(0).toUpperCase() + tool.slice(1)}
                  </label>
                  <input
                    value={String(priceRow[tool])}
                    onChange={e => updateRow(pi, { [tool]: e.target.value })}
                    style={s.inp}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: 4 }}>
        <SaveBtn saving={saving} saved={saved} err={err} onClick={() => doSave(async () => {
          await updateSection('compare', { comparisons: rows } as unknown as Record<string, unknown>);
        })} />
      </div>
    </div>
  );
}

// ── Difference Cards Tab ─────────────────────────────────────────────────────
function CardsTab() {
  const [cards, setCards] = useState<DiffCard[]>(DEFAULT_DIFFERENCES);
  const { saving, saved, err, doSave } = useSaveState();

  useEffect(() => {
    getSection('compare').then(r => {
      const d = r.data.data as Record<string, unknown>;
      if (Array.isArray(d.differences)) setCards(d.differences as DiffCard[]);
    }).catch(() => {});
  }, []);

  function update(i: number, patch: Partial<DiffCard>) {
    setCards(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }

  return (
    <div style={s.card}>
      <p style={s.head}>Why Serpely Cards (3 cards shown on page)</p>
      {cards.map((card, i) => (
        <div key={i} style={{ ...s.subCard, border: card.accent ? '1px solid rgba(0,194,122,0.35)' : '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: card.accent ? '#00C27A' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Card {i + 1}{card.accent ? ' (Accent)' : ''}
            </span>
          </div>
          <div style={s.row}>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Title</label>
              <input value={card.title} onChange={e => update(i, { title: e.target.value })} style={s.inp} />
            </div>
          </div>
          <div>
            <label style={s.label}>Description</label>
            <textarea value={card.description} onChange={e => update(i, { description: e.target.value })} rows={2} style={s.ta} />
          </div>
        </div>
      ))}
      <div style={{ marginTop: 4 }}>
        <SaveBtn saving={saving} saved={saved} err={err} onClick={() => doSave(async () => {
          await updateSection('compare', { differences: cards } as unknown as Record<string, unknown>);
        })} />
      </div>
    </div>
  );
}

// ── CTA Tab ──────────────────────────────────────────────────────────────────
function CTATab() {
  const [ctaHeadline, setCtaHeadline] = useState('Ready to make the switch?');
  const [ctaSubtext,  setCtaSubtext]  = useState('Start your free trial today and experience the difference Agentic SEO can make.');
  const [ctaPrimText, setCtaPrimText] = useState('Start Free Trial');
  const [ctaPrimHref, setCtaPrimHref] = useState('/pricing');
  const [ctaSecText,  setCtaSecText]  = useState('See How It Works');
  const [ctaSecHref,  setCtaSecHref]  = useState('/how-it-works');
  const { saving, saved, err, doSave } = useSaveState();

  useEffect(() => {
    getSection('compare').then(r => {
      const d = r.data.data as Record<string, unknown>;
      if (typeof d.ctaHeadline === 'string') setCtaHeadline(d.ctaHeadline);
      if (typeof d.ctaSubtext  === 'string') setCtaSubtext(d.ctaSubtext);
      if (typeof d.ctaPrimText === 'string') setCtaPrimText(d.ctaPrimText);
      if (typeof d.ctaPrimHref === 'string') setCtaPrimHref(d.ctaPrimHref);
      if (typeof d.ctaSecText  === 'string') setCtaSecText(d.ctaSecText);
      if (typeof d.ctaSecHref  === 'string') setCtaSecHref(d.ctaSecHref);
    }).catch(() => {});
  }, []);

  return (
    <div style={s.card}>
      <p style={s.head}>CTA Section</p>
      <div style={{ marginBottom: 16 }}>
        <label style={s.label}>Headline</label>
        <input value={ctaHeadline} onChange={e => setCtaHeadline(e.target.value)} style={s.inp} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={s.label}>Subtext</label>
        <textarea value={ctaSubtext} onChange={e => setCtaSubtext(e.target.value)} rows={2} style={s.ta} />
      </div>
      <div style={s.row}>
        <div style={{ flex: 1 }}>
          <label style={s.label}>Primary Button Text</label>
          <input value={ctaPrimText} onChange={e => setCtaPrimText(e.target.value)} style={s.inp} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={s.label}>Primary Button URL</label>
          <input value={ctaPrimHref} onChange={e => setCtaPrimHref(e.target.value)} style={s.inp} />
        </div>
      </div>
      <div style={s.row}>
        <div style={{ flex: 1 }}>
          <label style={s.label}>Secondary Button Text</label>
          <input value={ctaSecText} onChange={e => setCtaSecText(e.target.value)} style={s.inp} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={s.label}>Secondary Button URL</label>
          <input value={ctaSecHref} onChange={e => setCtaSecHref(e.target.value)} style={s.inp} />
        </div>
      </div>
      <SaveBtn saving={saving} saved={saved} err={err} onClick={() => doSave(async () => {
        await updateSection('compare', { ctaHeadline, ctaSubtext, ctaPrimText, ctaPrimHref, ctaSecText, ctaSecHref } as unknown as Record<string, unknown>);
      })} />
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export function CompareEditor() {
  const [tab, setTab] = useState<Tab>('hero');

  return (
    <div style={s.page}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Compare Page Editor</h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Edit the /compare page content</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {(['hero', 'table', 'cards', 'cta'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={s.tab(tab === t)}>
            {t === 'hero' ? 'Hero' : t === 'table' ? 'Feature Table' : t === 'cards' ? 'Why Serpely Cards' : 'CTA'}
          </button>
        ))}
      </div>

      {tab === 'hero'  && <HeroTab />}
      {tab === 'table' && <TableTab />}
      {tab === 'cards' && <CardsTab />}
      {tab === 'cta'   && <CTATab />}
    </div>
  );
}
