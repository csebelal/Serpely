import { useEffect, useState } from 'react';
import { getAllSEO, updateSEO, type SEOPageData } from '../../lib/api';

const PAGE_KEYS = [
  { key: 'home', label: 'Home', path: '/' },
  { key: 'about', label: 'About', path: '/about' },
  { key: 'features', label: 'Features', path: '/features' },
  { key: 'pricing', label: 'Pricing', path: '/pricing' },
  { key: 'contact', label: 'Contact', path: '/contact' },
  { key: 'blog', label: 'Blog', path: '/blog' },
  { key: 'faq', label: 'FAQ', path: '/faq' },
  { key: 'integrations', label: 'Integrations', path: '/integrations' },
  { key: 'how-it-works', label: 'How It Works', path: '/how-it-works' },
  { key: 'compare', label: 'Compare', path: '/compare' },
  { key: 'product-tour', label: 'Product Tour', path: '/product-tour' },
  { key: 'changelog', label: 'Changelog', path: '/changelog' },
];

const BUILT_IN_SCHEMA: Record<string, string[]> = {
  home: ['Organization', 'SoftwareApplication'],
  faq: ['FAQPage'],
};

const empty: Omit<SEOPageData, '_id' | 'updatedAt'> = {
  pageKey: '', metaTitle: '', metaDescription: '', ogImage: '', canonicalUrl: '', noIndex: false, customSchema: '',
};

export function SEOManager() {
  const [pages, setPages] = useState<Record<string, SEOPageData>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<typeof empty>({ ...empty });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await getAllSEO();
      const map: Record<string, SEOPageData> = {};
      res.data.forEach(p => { map[p.pageKey] = p; });
      setPages(map);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startEdit(key: string) {
    setEditing(key);
    const existing = pages[key];
    setForm(existing ? { pageKey: key, metaTitle: existing.metaTitle, metaDescription: existing.metaDescription, ogImage: existing.ogImage || '', canonicalUrl: existing.canonicalUrl || '', noIndex: existing.noIndex, customSchema: existing.customSchema || '' } : { ...empty, pageKey: key });
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await updateSEO(editing, form);
      setPages(p => ({ ...p, [editing]: res.data }));
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  const titleLeft = 60 - (form.metaTitle?.length || 0);
  const descLeft = 160 - (form.metaDescription?.length || 0);

  return (
    <div style={{ padding: '36px 44px', maxWidth: 1000 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 24px' }}>SEO Manager</h1>

      {loading ? <p style={{ color: '#94a3b8', fontSize: 14 }}>Loading…</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {PAGE_KEYS.map(({ key, label, path }) => {
            const page = pages[key];
            const isEditing = editing === key;
            return (
              <div key={key} style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{label}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>{path}</p>
                  </div>
                  <button onClick={() => isEditing ? setEditing(null) : startEdit(key)} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: isEditing ? '#f1f5f9' : '#00C27A18', color: isEditing ? '#64748b' : '#00C27A', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                </div>

                {!isEditing && (
                  <>
                    <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: '#1e40af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page?.metaTitle || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No title set</span>}</p>
                    <p style={{ margin: '0 0 8px', fontSize: 11, color: '#475569', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'] }}>{page?.metaDescription || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No description set</span>}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(BUILT_IN_SCHEMA[key] || []).map(s => (
                        <span key={s} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(0,194,122,0.1)', color: '#00915a' }}>{s}</span>
                      ))}
                      {page?.customSchema?.trim() && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(99,102,241,0.1)', color: '#4f46e5' }}>Custom JSON-LD</span>
                      )}
                    </div>
                  </>
                )}

                {isEditing && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Meta Title <span style={{ color: titleLeft < 0 ? '#ef4444' : '#94a3b8' }}>({titleLeft} left)</span></label>
                      <input value={form.metaTitle} onChange={e => setForm(f => ({ ...f, metaTitle: e.target.value }))} style={inputStyle} placeholder="Page title for SEO" maxLength={70} />
                    </div>
                    <div>
                      <label style={labelStyle}>Meta Description <span style={{ color: descLeft < 0 ? '#ef4444' : '#94a3b8' }}>({descLeft} left)</span></label>
                      <textarea value={form.metaDescription} onChange={e => setForm(f => ({ ...f, metaDescription: e.target.value }))} style={{ ...inputStyle, height: 70, resize: 'vertical' }} placeholder="Brief description for search engines" maxLength={170} />
                    </div>
                    <div>
                      <label style={labelStyle}>OG Image URL</label>
                      <input value={form.ogImage} onChange={e => setForm(f => ({ ...f, ogImage: e.target.value }))} style={inputStyle} placeholder="https://..." />
                    </div>
                    <div>
                      <label style={labelStyle}>Canonical URL</label>
                      <input value={form.canonicalUrl} onChange={e => setForm(f => ({ ...f, canonicalUrl: e.target.value }))} style={inputStyle} placeholder="Leave blank for default" />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.noIndex} onChange={e => setForm(f => ({ ...f, noIndex: e.target.checked }))} />
                      noIndex (hide from search engines)
                    </label>
                    <div>
                      <label style={labelStyle}>Custom JSON-LD Schema <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                      <textarea
                        value={form.customSchema || ''}
                        onChange={e => setForm(f => ({ ...f, customSchema: e.target.value }))}
                        style={{ ...inputStyle, height: 90, resize: 'vertical', fontFamily: 'monospace', fontSize: 11 }}
                        placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  ...\n}'}
                        spellCheck={false}
                      />
                      {form.customSchema?.trim() && (() => {
                        try { JSON.parse(form.customSchema!); return <p style={{ margin: '3px 0 0', fontSize: 10, color: '#00915a', fontWeight: 600 }}>✓ Valid JSON</p>; }
                        catch { return <p style={{ margin: '3px 0 0', fontSize: 10, color: '#ef4444', fontWeight: 600 }}>✗ Invalid JSON — fix before saving</p>; }
                      })()}
                      {(BUILT_IN_SCHEMA[key] || []).length > 0 && (
                        <p style={{ margin: '4px 0 0', fontSize: 10, color: '#64748b' }}>
                          Built-in: {(BUILT_IN_SCHEMA[key] || []).join(', ')} schema already injected automatically for this page.
                        </p>
                      )}
                    </div>

                    {/* Google SERP Preview */}
                    {(form.metaTitle || form.metaDescription) && (
                      <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px', border: '1px solid #e2e8f0' }}>
                        <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>SERP Preview</p>
                        <p style={{ margin: '0 0 2px', fontSize: 16, color: '#1a0dab', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.metaTitle || 'Page Title'}</p>
                        <p style={{ margin: '0 0 3px', fontSize: 12, color: '#006621' }}>yoursite.com{path}</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#4d5156', lineHeight: 1.5 }}>{form.metaDescription || 'Page description will appear here.'}</p>
                      </div>
                    )}

                    <button onClick={save} disabled={saving} style={{ padding: '9px', borderRadius: 10, background: '#00C27A', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 11px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f1f5f9', fontSize: 12, color: '#0f172a', outline: 'none', boxSizing: 'border-box' };
