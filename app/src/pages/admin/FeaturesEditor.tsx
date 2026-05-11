import { useState, useEffect } from 'react';
import { getSection, updateSection } from '@/lib/api';

interface MainFeat { title: string; description: string; items: string[]; tag: string; }
interface AddFeat  { title: string; description: string; }

const DEFAULT_MAIN_FEATS: MainFeat[] = [
  {
    title: 'Keyword Research & Gap Finder',
    description: 'Discover untapped keyword opportunities with AI-powered research. Analyze search intent, competition levels, and traffic potential to build a winning content strategy.',
    items: ['Competitor keyword analysis', 'Search intent classification', 'Topic cluster builder', 'Keyword difficulty scoring'],
    tag: 'Research',
  },
  {
    title: 'Daily Rank Tracking',
    description: 'Monitor keyword rankings across Google, Bing, and AI search engines. Get real-time alerts for ranking changes and track your progress over time.',
    items: ['Multi-engine tracking', 'SERP feature monitoring', 'Competitor comparison', 'Historical ranking data'],
    tag: 'Tracking',
  },
  {
    title: 'Technical Site Audit',
    description: "Continuously monitor your website's technical health. Identify and fix issues that hurt search performance before they impact rankings.",
    items: ['Core Web Vitals monitoring', 'Crawl error detection', 'Indexability checks', 'Mobile optimization'],
    tag: 'Audit',
  },
  {
    title: 'Backlink Monitoring',
    description: 'Track your backlink profile in real-time. Monitor new and lost links, analyze link quality, and discover link-building opportunities.',
    items: ['New/lost link alerts', 'Domain authority tracking', 'Anchor text analysis', 'Toxic link detection'],
    tag: 'Backlinks',
  },
];

const DEFAULT_ADD_FEATS: AddFeat[] = [
  { title: 'Content Prioritization',  description: 'AI-driven scoring to identify which pages need attention first.' },
  { title: 'White-Label Reports',     description: 'Generate professional, branded reports for your clients instantly.' },
  { title: 'AI Content Optimization', description: 'Get AI-powered suggestions to improve your content quality.' },
  { title: 'Security Monitoring',     description: 'Monitor for security issues that could affect your SEO ranking.' },
  { title: 'Automated Workflows',     description: 'Set up automated SEO tasks and scheduled reporting flows.' },
  { title: 'Advanced Analytics',      description: 'Deep dive into your SEO performance with rich metric dashboards.' },
  { title: 'Multi-Language Support',  description: 'Track rankings in multiple languages and target regions globally.' },
  { title: 'Smart Alerts',            description: 'Get notified about important SEO changes the moment they happen.' },
];

const s = {
  page:        { padding: '36px 44px', maxWidth: 960 } as React.CSSProperties,
  card:        { background: '#fff', borderRadius: 16, padding: '24px 26px', marginBottom: 16, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' } as React.CSSProperties,
  label:       { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' } as React.CSSProperties,
  inp:         { width: '100%', padding: '9px 13px', background: '#f1f5f9', border: 'none', borderRadius: 10, color: '#0f172a', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' } as React.CSSProperties,
  ta:          { width: '100%', padding: '9px 13px', background: '#f1f5f9', border: 'none', borderRadius: 10, color: '#0f172a', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' } as React.CSSProperties,
  sectionHead: { margin: '0 0 18px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' } as React.CSSProperties,
  btnGreen:    { padding: '9px 20px', background: '#00C27A', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' } as React.CSSProperties,
  btnGhost:    { padding: '7px 14px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' } as React.CSSProperties,
  btnDanger:   { padding: '7px 14px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' } as React.CSSProperties,
  tab: (active: boolean): React.CSSProperties => ({ padding: '8px 18px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', background: active ? '#00C27A' : '#f1f5f9', color: active ? '#fff' : '#64748b', transition: 'all 0.15s' }),
  featCard:    { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, marginBottom: 12 } as React.CSSProperties,
  featHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', cursor: 'pointer', userSelect: 'none' } as React.CSSProperties,
  featBody:    { padding: '0 18px 18px' } as React.CSSProperties,
};

export function FeaturesEditor() {
  const [tab, setTab] = useState<'hero' | 'main' | 'add' | 'cta'>('hero');
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  /* ── Hero ── */
  const [heroHeadline, setHeroHeadline] = useState('Everything you need to rank higher');
  const [heroSubtext,  setHeroSubtext]  = useState('A complete suite of SEO tools powered by AI. From keyword research to technical audits, all in one platform.');
  const [heroPrimText, setHeroPrimText] = useState('Start Free Trial');
  const [heroPrimHref, setHeroPrimHref] = useState('/pricing');
  const [heroSecText,  setHeroSecText]  = useState('See How It Works');
  const [heroSecHref,  setHeroSecHref]  = useState('/how-it-works');

  /* ── Main features ── */
  const [mainFeats, setMainFeats] = useState<MainFeat[]>(DEFAULT_MAIN_FEATS);

  /* ── Additional features ── */
  const [addHeadline, setAddHeadline] = useState('The complete SEO platform');
  const [addSubtext,  setAddSubtext]  = useState('Every tool you need, unified in one place.');
  const [addFeats,    setAddFeats]    = useState<AddFeat[]>(DEFAULT_ADD_FEATS);

  /* ── CTA ── */
  const [ctaHeadline, setCtaHeadline] = useState('Ready to unlock every feature?');
  const [ctaSubtext,  setCtaSubtext]  = useState('Start your free trial today and see what Serpely can do for your SEO.');
  const [ctaPrimText, setCtaPrimText] = useState('Start Free Trial');
  const [ctaPrimHref, setCtaPrimHref] = useState('/pricing');
  const [ctaSecText,  setCtaSecText]  = useState('Compare Plans');
  const [ctaSecHref,  setCtaSecHref]  = useState('/compare');

  /* ── Hydrate from API ── */
  useEffect(() => {
    getSection('features').then(r => {
      const d = r.data.data as Record<string, unknown>;
      if (typeof d.heroHeadline  === 'string') setHeroHeadline(d.heroHeadline);
      if (typeof d.heroSubtext   === 'string') setHeroSubtext(d.heroSubtext);
      if (typeof d.heroPrimText  === 'string') setHeroPrimText(d.heroPrimText);
      if (typeof d.heroPrimHref  === 'string') setHeroPrimHref(d.heroPrimHref);
      if (typeof d.heroSecText   === 'string') setHeroSecText(d.heroSecText);
      if (typeof d.heroSecHref   === 'string') setHeroSecHref(d.heroSecHref);
      if (Array.isArray(d.mainFeats))          setMainFeats(d.mainFeats as MainFeat[]);
      if (typeof d.addHeadline   === 'string') setAddHeadline(d.addHeadline);
      if (typeof d.addSubtext    === 'string') setAddSubtext(d.addSubtext);
      if (Array.isArray(d.addFeats))           setAddFeats(d.addFeats as AddFeat[]);
      if (typeof d.ctaHeadline   === 'string') setCtaHeadline(d.ctaHeadline);
      if (typeof d.ctaSubtext    === 'string') setCtaSubtext(d.ctaSubtext);
      if (typeof d.ctaPrimText   === 'string') setCtaPrimText(d.ctaPrimText);
      if (typeof d.ctaPrimHref   === 'string') setCtaPrimHref(d.ctaPrimHref);
      if (typeof d.ctaSecText    === 'string') setCtaSecText(d.ctaSecText);
      if (typeof d.ctaSecHref    === 'string') setCtaSecHref(d.ctaSecHref);
    }).catch(() => {});
  }, []);

  /* ── Save ── */
  async function handleSave() {
    setSaving(true);
    await updateSection('features', {
      heroHeadline, heroSubtext,
      heroPrimText, heroPrimHref,
      heroSecText,  heroSecHref,
      mainFeats,
      addHeadline,  addSubtext,
      addFeats,
      ctaHeadline,  ctaSubtext,
      ctaPrimText,  ctaPrimHref,
      ctaSecText,   ctaSecHref,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  /* ── Main feat helpers ── */
  function updateMainFeat(idx: number, patch: Partial<MainFeat>) {
    setMainFeats(fs => { const a = [...fs]; a[idx] = { ...a[idx], ...patch }; return a; });
  }
  function updateItem(featIdx: number, itemIdx: number, val: string) {
    setMainFeats(fs => {
      const a = [...fs];
      const items = [...a[featIdx].items];
      items[itemIdx] = val;
      a[featIdx] = { ...a[featIdx], items };
      return a;
    });
  }
  function addItem(featIdx: number) {
    setMainFeats(fs => {
      const a = [...fs];
      a[featIdx] = { ...a[featIdx], items: [...a[featIdx].items, ''] };
      return a;
    });
  }
  function removeItem(featIdx: number, itemIdx: number) {
    setMainFeats(fs => {
      const a = [...fs];
      a[featIdx] = { ...a[featIdx], items: a[featIdx].items.filter((_, i) => i !== itemIdx) };
      return a;
    });
  }

  /* ── Add feat helpers ── */
  function updateAddFeat(idx: number, patch: Partial<AddFeat>) {
    setAddFeats(fs => { const a = [...fs]; a[idx] = { ...a[idx], ...patch }; return a; });
  }

  return (
    <div style={s.page}>
      {/* Save button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>Features Page Editor</h1>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: '#94a3b8' }}>Edit hero, main features, additional features, and CTA on the Features page</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '10px 22px', background: saved ? '#10b981' : '#00C27A', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {(['hero', 'main', 'add', 'cta'] as const).map(t => (
          <button key={t} style={s.tab(tab === t)} onClick={() => setTab(t)}>
            {t === 'hero' ? '🏠 Hero' : t === 'main' ? '⚡ Main Features' : t === 'add' ? '✦ Additional Features' : '🎯 CTA'}
          </button>
        ))}
      </div>

      {/* ── HERO TAB ── */}
      {tab === 'hero' && (
        <div style={s.card}>
          <h2 style={s.sectionHead}>Hero Section</h2>
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Headline</label>
            <input style={s.inp} value={heroHeadline} onChange={e => setHeroHeadline(e.target.value)} placeholder="Everything you need to rank higher" />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={s.label}>Subtext</label>
            <textarea style={{ ...s.ta, minHeight: 80 }} value={heroSubtext} onChange={e => setHeroSubtext(e.target.value)} />
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, marginBottom: 16 }}>
            <label style={{ ...s.label, marginBottom: 12 }}>Primary Button</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={s.label}>Button Text</label>
                <input style={s.inp} value={heroPrimText} onChange={e => setHeroPrimText(e.target.value)} placeholder="Start Free Trial" />
              </div>
              <div>
                <label style={s.label}>Button URL</label>
                <input style={s.inp} value={heroPrimHref} onChange={e => setHeroPrimHref(e.target.value)} placeholder="/pricing" />
              </div>
            </div>
          </div>

          <div>
            <label style={{ ...s.label, marginBottom: 12 }}>Secondary Button</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={s.label}>Button Text</label>
                <input style={s.inp} value={heroSecText} onChange={e => setHeroSecText(e.target.value)} placeholder="See How It Works" />
              </div>
              <div>
                <label style={s.label}>Button URL</label>
                <input style={s.inp} value={heroSecHref} onChange={e => setHeroSecHref(e.target.value)} placeholder="/how-it-works" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN FEATURES TAB ── */}
      {tab === 'main' && (
        <div>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
            Edit titles, descriptions, tags, and bullet items for the 4 main feature panels. Icons and visual data are hardcoded.
          </p>
          {mainFeats.map((f, i) => (
            <div key={i} style={s.featCard}>
              {/* Panel header — click to expand/collapse */}
              <div style={s.featHeader} onClick={() => setOpenIdx(openIdx === i ? null : i)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                    {String(i + 1).padStart(2, '0')}. {f.title || 'Untitled Feature'}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(0,194,122,0.1)', color: '#00A868', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(0,194,122,0.2)' }}>
                    {f.tag}
                  </span>
                </div>
                <span style={{ color: '#94a3b8', fontSize: 14 }}>{openIdx === i ? '▲' : '▼'}</span>
              </div>

              {openIdx === i && (
                <div style={s.featBody}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={s.label}>Title</label>
                      <input style={s.inp} value={f.title} onChange={e => updateMainFeat(i, { title: e.target.value })} placeholder="Feature Title" />
                    </div>
                    <div>
                      <label style={s.label}>Tag</label>
                      <input style={s.inp} value={f.tag} onChange={e => updateMainFeat(i, { tag: e.target.value })} placeholder="Research" />
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={s.label}>Description</label>
                    <textarea style={{ ...s.ta, minHeight: 80 }} value={f.description} onChange={e => updateMainFeat(i, { description: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ ...s.label, marginBottom: 10 }}>Bullet Items</label>
                    {f.items.map((item, ii) => (
                      <div key={ii} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <input
                          style={{ ...s.inp, flex: 1 }}
                          value={item}
                          onChange={e => updateItem(i, ii, e.target.value)}
                          placeholder="Feature bullet point"
                        />
                        <button style={s.btnDanger} onClick={() => removeItem(i, ii)}>✕</button>
                      </div>
                    ))}
                    <button style={s.btnGhost} onClick={() => addItem(i)}>+ Add Item</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── ADDITIONAL FEATURES TAB ── */}
      {tab === 'add' && (
        <div style={s.card}>
          <h2 style={s.sectionHead}>Additional Features Section</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={s.label}>Section Headline</label>
              <input style={s.inp} value={addHeadline} onChange={e => setAddHeadline(e.target.value)} placeholder="The complete SEO platform" />
            </div>
            <div>
              <label style={s.label}>Section Subtext</label>
              <input style={s.inp} value={addSubtext} onChange={e => setAddSubtext(e.target.value)} placeholder="Every tool you need, unified in one place." />
            </div>
          </div>

          <label style={{ ...s.label, marginBottom: 14 }}>Feature Cards (2-column grid)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {addFeats.map((f, i) => (
              <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ marginBottom: 10 }}>
                  <label style={s.label}>Title</label>
                  <input style={s.inp} value={f.title} onChange={e => updateAddFeat(i, { title: e.target.value })} placeholder="Feature Title" />
                </div>
                <div>
                  <label style={s.label}>Description</label>
                  <textarea style={{ ...s.ta, minHeight: 60 }} value={f.description} onChange={e => updateAddFeat(i, { description: e.target.value })} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CTA TAB ── */}
      {tab === 'cta' && (
        <div style={s.card}>
          <h2 style={s.sectionHead}>CTA Section</h2>
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Headline</label>
            <input style={s.inp} value={ctaHeadline} onChange={e => setCtaHeadline(e.target.value)} placeholder="Ready to unlock every feature?" />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={s.label}>Subtext</label>
            <textarea style={{ ...s.ta, minHeight: 80 }} value={ctaSubtext} onChange={e => setCtaSubtext(e.target.value)} />
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, marginBottom: 16 }}>
            <label style={{ ...s.label, marginBottom: 12 }}>Primary Button</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={s.label}>Button Text</label>
                <input style={s.inp} value={ctaPrimText} onChange={e => setCtaPrimText(e.target.value)} placeholder="Start Free Trial" />
              </div>
              <div>
                <label style={s.label}>Button URL</label>
                <input style={s.inp} value={ctaPrimHref} onChange={e => setCtaPrimHref(e.target.value)} placeholder="/pricing" />
              </div>
            </div>
          </div>

          <div>
            <label style={{ ...s.label, marginBottom: 12 }}>Secondary Button</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={s.label}>Button Text</label>
                <input style={s.inp} value={ctaSecText} onChange={e => setCtaSecText(e.target.value)} placeholder="Compare Plans" />
              </div>
              <div>
                <label style={s.label}>Button URL</label>
                <input style={s.inp} value={ctaSecHref} onChange={e => setCtaSecHref(e.target.value)} placeholder="/compare" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8 }}>
        <button style={s.btnGreen} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : '✓ Save Changes'}
        </button>
        {saved && <span style={{ fontSize: 13, color: '#00C27A', fontWeight: 600 }}>Saved!</span>}
      </div>
    </div>
  );
}
