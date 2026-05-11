import { useEffect, useState } from 'react';
import { getFooter, updateFooter, uploadFile, type FooterData } from '@/lib/api';

export function FooterEditor() {
  const [form, setForm] = useState<Partial<FooterData>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => { getFooter().then(r => setForm(r.data)); }, []);

  async function save() {
    setSaving(true);
    await updateFooter(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogoUpload(field: string, file: File) {
    setUploading(field);
    try {
      const { data } = await uploadFile(file);
      setForm(f => ({ ...f, [field]: data.url }));
    } catch { /* ignore */ }
    setUploading(null);
  }

  function updateColumn(ci: number, key: 'name', val: string) {
    const cols = [...(form.columns || [])];
    cols[ci] = { ...cols[ci], [key]: val };
    setForm(f => ({ ...f, columns: cols }));
  }

  function updateLink(ci: number, li: number, key: 'label' | 'href', val: string) {
    const cols = [...(form.columns || [])];
    const links = [...cols[ci].links];
    links[li] = { ...links[li], [key]: val };
    cols[ci] = { ...cols[ci], links };
    setForm(f => ({ ...f, columns: cols }));
  }

  function addLink(ci: number) {
    const cols = [...(form.columns || [])];
    cols[ci] = { ...cols[ci], links: [...cols[ci].links, { label: '', href: '' }] };
    setForm(f => ({ ...f, columns: cols }));
  }

  function removeLink(ci: number, li: number) {
    const cols = [...(form.columns || [])];
    cols[ci] = { ...cols[ci], links: cols[ci].links.filter((_, i) => i !== li) };
    setForm(f => ({ ...f, columns: cols }));
  }

  const inp = (label: string, field: keyof FooterData) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <input value={(form[field] as string) || ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} style={{ width: '100%', padding: '8px 11px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#0f172a', fontSize: 13, boxSizing: 'border-box' }} />
    </div>
  );

  const logoField = (label: string, field: string) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {(form as Record<string, unknown>)[field] && <img src={(form as Record<string, string>)[field]} alt={label} style={{ height: 28, maxWidth: 120, objectFit: 'contain', display: 'block', marginBottom: 6, background: field.includes('dark') ? '#0f172a' : 'transparent', padding: 4, borderRadius: 4 }} />}
      <input type="file" accept="image/*" onChange={e => e.target.files && handleLogoUpload(field, e.target.files[0])} style={{ fontSize: 12, color: '#64748b' }} />
      {uploading === field && <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>Uploading…</span>}
    </div>
  );

  return (
    <div style={{ padding: '36px 44px', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>Footer Editor</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>Manage footer links, logos, and social links</p>
        </div>
        <button onClick={save} disabled={saving} style={{ padding: '8px 20px', background: '#00C27A', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Footer'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', marginBottom: 16, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>General</h2>
            {inp('Tagline', 'tagline')}
            {inp('Copyright', 'copyright')}
            {inp('System Status', 'systemStatus')}
            {inp('Product Hunt URL', 'productHuntUrl')}
            {inp('Product Hunt Button Text', 'productHuntBtnText')}
            {inp('Ask AI Prompt', 'askAiPrompt')}
          </div>

          <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', marginBottom: 16, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Social Links</h2>
            {(form.socialLinks || []).map((s, si) => (
              <div key={si} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={s.platform} onChange={e => {
                  const sl = [...(form.socialLinks || [])];
                  sl[si] = { ...s, platform: e.target.value };
                  setForm(f => ({ ...f, socialLinks: sl }));
                }} placeholder="Platform" style={{ width: 100, padding: '7px 10px', background: '#f1f5f9', border: 'none', borderRadius: 7, color: '#0f172a', fontSize: 12 }} />
                <input value={s.href} onChange={e => {
                  const sl = [...(form.socialLinks || [])];
                  sl[si] = { ...s, href: e.target.value };
                  setForm(f => ({ ...f, socialLinks: sl }));
                }} placeholder="URL" style={{ flex: 1, padding: '7px 10px', background: '#f1f5f9', border: 'none', borderRadius: 7, color: '#64748b', fontSize: 12, fontFamily: 'monospace' }} />
                <button onClick={() => setForm(f => ({ ...f, socialLinks: (f.socialLinks || []).filter((_, i) => i !== si) }))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
            ))}
            <button onClick={() => setForm(f => ({ ...f, socialLinks: [...(f.socialLinks || []), { platform: '', href: '' }] }))} style={{ marginTop: 4, padding: '4px 10px', background: '#f1f5f9', border: 'none', borderRadius: 6, color: '#64748b', cursor: 'pointer', fontSize: 11 }}>+ Add social link</button>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Logos</h2>
            {logoField('Light Logo', 'lightLogo')}
            {logoField('Dark Logo', 'darkLogo')}
            {logoField('CieloOps Light Logo', 'cieloOpsLightLogo')}
            {logoField('CieloOps Dark Logo', 'cieloOpsDarkLogo')}
          </div>
        </div>

        <div>
          <h2 style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Navigation Columns</h2>
          {(form.columns || []).map((col, ci) => (
            <div key={ci} style={{ marginBottom: 14, background: '#fff', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
              <input value={col.name} onChange={e => updateColumn(ci, 'name', e.target.value)} style={{ width: '100%', fontSize: 13, fontWeight: 700, background: 'none', border: 'none', color: '#0f172a', outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
              {col.links.map((link, li) => (
                <div key={li} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <input value={link.label} onChange={e => updateLink(ci, li, 'label', e.target.value)} placeholder="Label" style={{ flex: 1, padding: '5px 8px', background: '#f1f5f9', border: 'none', borderRadius: 6, color: '#0f172a', fontSize: 11 }} />
                  <input value={link.href} onChange={e => updateLink(ci, li, 'href', e.target.value)} placeholder="href" style={{ flex: 1, padding: '5px 8px', background: '#f1f5f9', border: 'none', borderRadius: 6, color: '#64748b', fontSize: 11, fontFamily: 'monospace' }} />
                  <button onClick={() => removeLink(ci, li)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>×</button>
                </div>
              ))}
              <button onClick={() => addLink(ci)} style={{ marginTop: 4, padding: '4px 10px', background: '#f1f5f9', border: 'none', borderRadius: 6, color: '#94a3b8', cursor: 'pointer', fontSize: 11 }}>+ Add link</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
