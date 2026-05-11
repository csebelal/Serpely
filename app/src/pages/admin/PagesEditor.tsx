import { useEffect, useState } from 'react';
import { getSection, updateSection, uploadFile } from '@/lib/api';

const SECTIONS = [
  { key: 'hero', label: 'Hero', fields: [
    { k: 'badge', label: 'Badge / Pill Text', type: 'text', placeholder: 'Is your site invisible to AI search?' },
    { k: 'announcementText', label: 'Announcement Chip', type: 'text', placeholder: 'Now in Public Beta — Join The Early Access Team.' },
    { k: 'subheadline', label: 'Subheadline', type: 'textarea', placeholder: "A daily AI audit that tracks whether you're cited across ChatGPT, Perplexity, and Google AI Overviews, and tells you exactly what to fix next." },
    { k: 'cta1Text', label: 'CTA 1 Text', type: 'text', placeholder: 'Start Free Trial' },
    { k: 'cta1Href', label: 'CTA 1 URL', type: 'text', placeholder: '#' },
    { k: 'cta1Sub', label: 'CTA 1 Sub-text', type: 'text', placeholder: 'No credit card' },
    { k: 'cta2Text', label: 'CTA 2 Text', type: 'text', placeholder: 'Book a Demo' },
    { k: 'cta2Href', label: 'CTA 2 URL', type: 'text', placeholder: '#' },
    { k: 'cta2Sub', label: 'CTA 2 Sub-text', type: 'text', placeholder: 'See live insights' },
    { k: 'alert1Title', label: 'Alert Card 1 — Title', type: 'text', placeholder: 'GEO Score Up' },
    { k: 'alert1Sub', label: 'Alert Card 1 — Body', type: 'text', placeholder: '/best-crm 74 → 78' },
    { k: 'alert2Title', label: 'Alert Card 2 — Title', type: 'text', placeholder: 'AI Citation Drop' },
    { k: 'alert2Sub', label: 'Alert Card 2 — Body', type: 'text', placeholder: 'ChatGPT mentions ↓ 14%' },
  ]},
  { key: 'testimonials', label: 'Testimonials', fields: [
    { k: 'badge', label: 'Badge Text', type: 'text' },
    { k: 'heading', label: 'Heading', type: 'text' },
  ]},
  { key: 'faq-home', label: 'FAQ (Home)', fields: [
    { k: 'badge', label: 'Badge Text', type: 'text' },
    { k: 'heading', label: 'Heading', type: 'text' },
  ]},
  { key: 'cta', label: 'CTA Section', fields: [
    { k: 'badge', label: 'Badge Text', type: 'text' },
    { k: 'subheading', label: 'Subheading', type: 'textarea' },
    { k: 'cta1Text', label: 'CTA 1 Text', type: 'text' },
    { k: 'cta1Href', label: 'CTA 1 URL', type: 'text' },
    { k: 'cta2Text', label: 'CTA 2 Text', type: 'text' },
    { k: 'cta2Href', label: 'CTA 2 URL', type: 'text' },
    { k: 'supportText', label: 'Support Text', type: 'text' },
  ]},
  { key: 'newsletter', label: 'Newsletter', fields: [
    { k: 'badge', label: 'Badge Text', type: 'text' },
    { k: 'subheading', label: 'Subheading', type: 'textarea' },
    { k: 'inputPlaceholder', label: 'Input Placeholder', type: 'text' },
    { k: 'buttonText', label: 'Button Text', type: 'text' },
    { k: 'successMessage', label: 'Success Message', type: 'text' },
    { k: 'privacyText', label: 'Privacy Text', type: 'text' },
  ]},
];

export function PagesEditor() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].key);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setLoading(true);
    getSection(activeSection)
      .then(r => setData((r.data?.data as Record<string, unknown>) || {}))
      .catch(() => setData({}))
      .finally(() => setLoading(false));
  }, [activeSection]);

  async function save() {
    setSaving(true);
    setSaveError('');
    try {
      await updateSection(activeSection, data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const section = SECTIONS.find(s => s.key === activeSection)!;

  function renderField(field: { k: string; label: string; type: string; placeholder?: string }) {
    const val = (data[field.k] as string) || '';
    const onChange = (v: string) => setData(d => ({ ...d, [field.k]: v }));
    const baseStyle = { width: '100%', padding: '9px 12px', background: '#f1f5f9', border: 'none', borderRadius: 9, color: '#0f172a', fontSize: 13, boxSizing: 'border-box' as const };
    return (
      <div key={field.k} style={{ marginBottom: 18 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{field.label}</label>
        {field.type === 'textarea'
          ? <textarea value={val} onChange={e => onChange(e.target.value)} rows={3} placeholder={field.placeholder} style={{ ...baseStyle, resize: 'vertical' }} />
          : <input type="text" value={val} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} style={baseStyle} />
        }
      </div>
    );
  }

  function HeadlineEditor() {
    const lines = (data['headline'] as string[]) || ['', '', ''];
    const placeholders = ['Agentic SEO.', 'Built for the', 'AI-first web.'];
    return (
      <div style={{ marginBottom: 18 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Headline (3 lines)</label>
        {lines.map((line, i) => (
          <input key={i} value={line} onChange={e => {
            const nl = [...lines];
            nl[i] = e.target.value;
            setData(d => ({ ...d, headline: nl }));
          }} style={{ width: '100%', padding: '9px 12px', background: '#f1f5f9', border: 'none', borderRadius: 9, color: '#0f172a', fontSize: 13, boxSizing: 'border-box', marginBottom: 6 }} placeholder={placeholders[i]} />
        ))}
      </div>
    );
  }

  function HeadingArrayEditor() {
    const lines = (data['heading'] as string[]) || ['', ''];
    return (
      <div style={{ marginBottom: 18 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Heading (2 lines)</label>
        {lines.map((line, i) => (
          <input key={i} value={line} onChange={e => {
            const nl = [...lines];
            nl[i] = e.target.value;
            setData(d => ({ ...d, heading: nl }));
          }} style={{ width: '100%', padding: '9px 12px', background: '#f1f5f9', border: 'none', borderRadius: 9, color: '#0f172a', fontSize: 13, boxSizing: 'border-box', marginBottom: 6 }} placeholder={`Line ${i + 1}`} />
        ))}
      </div>
    );
  }

  function HeroImageUpload() {
    const [uploading, setUploading] = useState(false);
    const currentUrl = (data['heroImage'] as string) || '';

    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const res = await uploadFile(file);
        setData(d => ({ ...d, heroImage: res.data.url }));
      } finally {
        setUploading(false);
      }
    }

    return (
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Hero Right-Side Image
        </label>
        {currentUrl && (
          <img src={currentUrl} alt="Hero preview" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, marginBottom: 8, border: '1px solid #e2e8f0' }} />
        )}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#f1f5f9', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}>
          <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          {uploading ? 'Uploading…' : currentUrl ? 'Replace Image' : 'Upload Image'}
        </label>
        {currentUrl && (
          <button onClick={() => setData(d => ({ ...d, heroImage: '' }))} style={{ marginLeft: 10, fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
            Remove
          </button>
        )}
      </div>
    );
  }

  function CTAHeadlineEditor() {
    const lines = (data['headline'] as string[]) || ['', '', ''];
    return (
      <div style={{ marginBottom: 18 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Headline (3 lines)</label>
        {lines.map((line, i) => (
          <input key={i} value={line} onChange={e => {
            const nl = [...lines];
            nl[i] = e.target.value;
            setData(d => ({ ...d, headline: nl }));
          }} style={{ width: '100%', padding: '9px 12px', background: '#f1f5f9', border: 'none', borderRadius: 9, color: '#0f172a', fontSize: 13, boxSizing: 'border-box', marginBottom: 6 }} placeholder={`Line ${i + 1}`} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ width: 200, padding: '20px 10px', flexShrink: 0, background: '#fff', boxShadow: '2px 0 8px rgba(15,23,42,0.04)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, padding: '0 10px' }}>Sections</div>
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)} style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: 'none',
            background: activeSection === s.key ? 'rgba(0,194,122,0.08)' : 'none',
            color: activeSection === s.key ? '#00C27A' : '#64748b',
            fontSize: 13, cursor: 'pointer', fontWeight: activeSection === s.key ? 600 : 400, marginBottom: 2,
          }}>{s.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, padding: '36px 44px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>{section.label}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {saveError && <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>{saveError}</span>}
            <button onClick={save} disabled={saving} style={{ padding: '8px 20px', background: '#00C27A', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Section'}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading…</div>
        ) : (
          <div style={{ maxWidth: 600 }}>
            {activeSection === 'hero' && <HeroImageUpload />}
            {activeSection === 'hero' && <HeadlineEditor />}
            {activeSection === 'cta' && <CTAHeadlineEditor />}
            {activeSection === 'newsletter' && <HeadingArrayEditor />}
            {section.fields.map(f => renderField(f))}
          </div>
        )}
      </div>
    </div>
  );
}
