import { useEffect, useState } from 'react';
import { getSection, updateSection } from '@/lib/api';

interface IntegrationItem {
  name: string;
  description: string;
  img: string;
  abbr: string;
  color: string;
  connected: boolean;
}
interface IntegrationCategory {
  category: string;
  items: IntegrationItem[];
}
interface IntegrationsData {
  heroHeadline: string;
  heroSubtext: string;
  integrations: IntegrationCategory[];
  apiHeadline: string;
  apiBody: string;
  apiFeatures: string[];
  apiButtonText: string;
  apiButtonHref: string;
}

const DEFAULT: IntegrationsData = {
  heroHeadline: 'Connect your favorite tools',
  heroSubtext: 'Serpely integrates seamlessly with the tools you already use, making it easy to incorporate SEO into your existing workflow.',
  integrations: [
    {
      category: 'Analytics',
      items: [
        { name: 'Google Analytics',      description: 'Track website traffic and user behavior',    img: '/Other Logos/Google_Analytics_Logo_2019.svg.png', abbr: 'GA', color: '#E37400', connected: true  },
        { name: 'Google Search Console', description: 'Monitor search performance and indexing',    img: '/processed-logos/ribbon-gsc.png',                  abbr: 'SC', color: '#4285F4', connected: true  },
        { name: 'Adobe Analytics',       description: 'Enterprise analytics and reporting',         img: '',                                                 abbr: 'AA', color: '#E34220', connected: false },
      ],
    },
    {
      category: 'CMS',
      items: [
        { name: 'WordPress',   description: "The world's most popular CMS",       img: '/processed-logos/ribbon-wordpress.png', abbr: 'WP', color: '#21759B', connected: true  },
        { name: 'Shopify',     description: 'E-commerce platform for online stores', img: '',                                   abbr: 'SH', color: '#96BF48', connected: false },
        { name: 'Webflow',     description: 'Visual website builder',             img: '/processed-logos/ribbon-webflow.png',  abbr: 'WF', color: '#4353FF', connected: false },
        { name: 'Contentful',  description: 'Headless CMS for modern websites',   img: '',                                     abbr: 'CF', color: '#2478CC', connected: false },
      ],
    },
    {
      category: 'Communication',
      items: [
        { name: 'Slack',            description: 'Get alerts and reports in Slack',   img: '/Other Logos/Slack-logo.png', abbr: 'SL', color: '#4A154B', connected: false },
        { name: 'Microsoft Teams',  description: 'Collaborate with your team',        img: '',                            abbr: 'MT', color: '#4B53BC', connected: false },
        { name: 'Discord',          description: 'Community and team communication',  img: '',                            abbr: 'DC', color: '#5865F2', connected: false },
      ],
    },
    {
      category: 'Project Management',
      items: [
        { name: 'Jira',   description: 'Track SEO tasks and projects', img: '', abbr: 'JI', color: '#0052CC', connected: false },
        { name: 'Asana',  description: 'Manage SEO workflows',         img: '', abbr: 'AS', color: '#F06A6A', connected: false },
        { name: 'Trello', description: 'Visual project management',    img: '', abbr: 'TR', color: '#0079BF', connected: false },
      ],
    },
    {
      category: 'Data & Reporting',
      items: [
        { name: 'Google Data Studio', description: 'Create custom SEO dashboards', img: '', abbr: 'DS', color: '#669DF6', connected: false },
        { name: 'Tableau',            description: 'Advanced data visualization',  img: '', abbr: 'TB', color: '#E97627', connected: false },
        { name: 'Zapier',             description: 'Automate workflows',           img: '', abbr: 'ZP', color: '#FF4A00', connected: false },
      ],
    },
  ],
  apiHeadline: 'Build custom integrations',
  apiBody: 'Our comprehensive API allows you to build custom integrations and automate your SEO workflows. Access all Serpely features programmatically.',
  apiFeatures: [
    'RESTful API with comprehensive documentation',
    'Webhook support for real-time updates',
    'SDKs for popular programming languages',
    'Rate limits that scale with your plan',
  ],
  apiButtonText: 'View API Documentation',
  apiButtonHref: '#',
};

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
  itemCard:    { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 18px', marginBottom: 10 } as React.CSSProperties,
  catCard:     { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '18px 20px', marginBottom: 16 } as React.CSSProperties,
};

export function IntegrationsEditor() {
  const [data, setData]     = useState<IntegrationsData>(DEFAULT);
  const [tab, setTab]       = useState<'hero' | 'integrations' | 'api'>('hero');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    getSection('integrations').then(r => {
      const d = r.data.data as Partial<IntegrationsData>;
      setData({
        heroHeadline:  d.heroHeadline  ?? DEFAULT.heroHeadline,
        heroSubtext:   d.heroSubtext   ?? DEFAULT.heroSubtext,
        integrations:  d.integrations  ?? DEFAULT.integrations,
        apiHeadline:   d.apiHeadline   ?? DEFAULT.apiHeadline,
        apiBody:       d.apiBody       ?? DEFAULT.apiBody,
        apiFeatures:   d.apiFeatures   ?? DEFAULT.apiFeatures,
        apiButtonText: d.apiButtonText ?? DEFAULT.apiButtonText,
        apiButtonHref: d.apiButtonHref ?? DEFAULT.apiButtonHref,
      });
    }).catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    await updateSection('integrations', data as unknown as Record<string, unknown>);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  /* ── helpers ── */
  function updateCat(ci: number, key: 'category', val: string) {
    setData(d => { const g = [...d.integrations]; g[ci] = { ...g[ci], [key]: val }; return { ...d, integrations: g }; });
  }
  function addCat() {
    setData(d => ({ ...d, integrations: [...d.integrations, { category: 'New Category', items: [] }] }));
  }
  function removeCat(ci: number) {
    setData(d => ({ ...d, integrations: d.integrations.filter((_, i) => i !== ci) }));
  }

  function updateItem(ci: number, ii: number, patch: Partial<IntegrationItem>) {
    setData(d => {
      const g = [...d.integrations];
      const items = [...g[ci].items];
      items[ii] = { ...items[ii], ...patch };
      g[ci] = { ...g[ci], items };
      return { ...d, integrations: g };
    });
  }
  function addItem(ci: number) {
    setData(d => {
      const g = [...d.integrations];
      g[ci] = { ...g[ci], items: [...g[ci].items, { name: '', description: '', img: '', abbr: '', color: '#00C27A', connected: false }] };
      return { ...d, integrations: g };
    });
  }
  function removeItem(ci: number, ii: number) {
    setData(d => {
      const g = [...d.integrations];
      g[ci] = { ...g[ci], items: g[ci].items.filter((_, i) => i !== ii) };
      return { ...d, integrations: g };
    });
  }

  function updateFeature(idx: number, val: string) {
    setData(d => { const f = [...d.apiFeatures]; f[idx] = val; return { ...d, apiFeatures: f }; });
  }
  function addFeature() {
    setData(d => ({ ...d, apiFeatures: [...d.apiFeatures, ''] }));
  }
  function removeFeature(idx: number) {
    setData(d => ({ ...d, apiFeatures: d.apiFeatures.filter((_, i) => i !== idx) }));
  }

  return (
    <div style={s.page}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>Integrations Editor</h1>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: '#94a3b8' }}>Manage integration cards, hero text, and API section on the Integrations page</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {(['hero', 'integrations', 'api'] as const).map(t => (
          <button key={t} style={s.tab(tab === t)} onClick={() => setTab(t)}>
            {t === 'hero' ? '🏠 Hero' : t === 'integrations' ? '🔌 Integrations' : '⚡ API Section'}
          </button>
        ))}
      </div>

      {/* ── HERO ── */}
      {tab === 'hero' && (
        <div style={s.card}>
          <h2 style={s.sectionHead}>Hero Section</h2>
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Headline</label>
            <input style={s.inp} value={data.heroHeadline}
              onChange={e => setData(d => ({ ...d, heroHeadline: e.target.value }))}
              placeholder="Connect your favorite tools" />
          </div>
          <div>
            <label style={s.label}>Subtext</label>
            <textarea style={{ ...s.ta, minHeight: 80 }} value={data.heroSubtext}
              onChange={e => setData(d => ({ ...d, heroSubtext: e.target.value }))} />
          </div>
        </div>
      )}

      {/* ── INTEGRATIONS ── */}
      {tab === 'integrations' && (
        <div>
          {data.integrations.map((cat, ci) => (
            <div key={ci} style={s.catCard}>
              {/* Category header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Category Name</label>
                  <input style={s.inp} value={cat.category}
                    onChange={e => updateCat(ci, 'category', e.target.value)} />
                </div>
                <div style={{ paddingTop: 22 }}>
                  <button style={s.btnDanger} onClick={() => removeCat(ci)}>Remove Category</button>
                </div>
              </div>

              {/* Items */}
              {cat.items.map((item, ii) => (
                <div key={ii} style={{ ...s.itemCard, borderLeft: `3px solid ${item.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: '#fff' }}>
                        {item.abbr || '?'}
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{item.name || 'New Integration'}</span>
                      {item.connected && <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(0,194,122,0.1)', color: '#00A868', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(0,194,122,0.2)' }}>Connected</span>}
                    </div>
                    <button style={s.btnDanger} onClick={() => removeItem(ci, ii)}>Remove</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={s.label}>Name</label>
                      <input style={s.inp} value={item.name} onChange={e => updateItem(ci, ii, { name: e.target.value })} placeholder="Google Analytics" />
                    </div>
                    <div>
                      <label style={s.label}>Description</label>
                      <input style={s.inp} value={item.description} onChange={e => updateItem(ci, ii, { description: e.target.value })} placeholder="Track website traffic..." />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px auto auto', gap: 10, alignItems: 'flex-end' }}>
                    <div>
                      <label style={s.label}>Logo URL</label>
                      <input style={s.inp} value={item.img} onChange={e => updateItem(ci, ii, { img: e.target.value })} placeholder="/Other Logos/logo.png" />
                    </div>
                    <div>
                      <label style={s.label}>Abbr</label>
                      <input style={s.inp} value={item.abbr} maxLength={3} onChange={e => updateItem(ci, ii, { abbr: e.target.value.toUpperCase() })} placeholder="GA" />
                    </div>
                    <div>
                      <label style={s.label}>Color</label>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input type="color" value={item.color} onChange={e => updateItem(ci, ii, { color: e.target.value })}
                          style={{ width: 36, height: 34, borderRadius: 6, border: 'none', padding: 2, cursor: 'pointer' }} />
                        <input style={{ ...s.inp, flex: 1 }} value={item.color} onChange={e => updateItem(ci, ii, { color: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label style={s.label}>Status</label>
                      <button
                        onClick={() => updateItem(ci, ii, { connected: !item.connected })}
                        style={{ padding: '8px 14px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                          background: item.connected ? 'rgba(0,194,122,0.12)' : '#f1f5f9',
                          color: item.connected ? '#00A868' : '#64748b', whiteSpace: 'nowrap' }}>
                        {item.connected ? '✓ Connected' : 'Not Connected'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button style={s.btnGhost} onClick={() => addItem(ci)}>+ Add Integration</button>
            </div>
          ))}

          <button style={{ ...s.btnGhost, marginTop: 4 }} onClick={addCat}>+ Add Category</button>
        </div>
      )}

      {/* ── API SECTION ── */}
      {tab === 'api' && (
        <div style={s.card}>
          <h2 style={s.sectionHead}>API Section</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={s.label}>Headline</label>
              <input style={s.inp} value={data.apiHeadline}
                onChange={e => setData(d => ({ ...d, apiHeadline: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={s.label}>Button Text</label>
                <input style={s.inp} value={data.apiButtonText}
                  onChange={e => setData(d => ({ ...d, apiButtonText: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Button URL</label>
                <input style={s.inp} value={data.apiButtonHref}
                  onChange={e => setData(d => ({ ...d, apiButtonHref: e.target.value }))} />
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={s.label}>Body Text</label>
            <textarea style={{ ...s.ta, minHeight: 80 }} value={data.apiBody}
              onChange={e => setData(d => ({ ...d, apiBody: e.target.value }))} />
          </div>
          <div>
            <label style={{ ...s.label, marginBottom: 10 }}>Feature Bullet Points</label>
            {data.apiFeatures.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input style={{ ...s.inp, flex: 1 }} value={f} onChange={e => updateFeature(i, e.target.value)} placeholder="Feature description..." />
                <button style={s.btnDanger} onClick={() => removeFeature(i)}>✕</button>
              </div>
            ))}
            <button style={s.btnGhost} onClick={addFeature}>+ Add Feature</button>
          </div>
        </div>
      )}

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8 }}>
        <button style={s.btnGreen} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : '✓ Save Changes'}
        </button>
        {saved && <span style={{ fontSize: 13, color: '#00C27A', fontWeight: 600 }}>Saved!</span>}
      </div>
    </div>
  );
}
