import { useEffect, useState } from 'react';
import { getAllPopups, createPopup, updatePopup, deletePopup, type PopupData } from '../../lib/api';

const emptyForm = (): Omit<PopupData, '_id' | 'createdAt'> => ({
  type: 'banner', title: '', body: '', ctaText: '', ctaHref: '',
  bgColor: '#0f172a', trigger: 'immediate', delay: 0, active: false,
  startAt: undefined, endAt: undefined,
});

export function PopupManager() {
  const [popups, setPopups] = useState<PopupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await getAllPopups();
      setPopups(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(p: PopupData) {
    setEditingId(p._id!);
    setForm({
      type: p.type,
      title: p.title,
      body: p.body,
      ctaText: p.ctaText || '',
      ctaHref: p.ctaHref || '',
      bgColor: p.bgColor || '#0f172a',
      trigger: p.trigger,
      delay: p.delay || 0,
      active: p.active,
      startAt: p.startAt,
      endAt: p.endAt,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  async function save() {
    setSaving(true);
    try {
      if (editingId) {
        const res = await updatePopup(editingId, form);
        setPopups(prev => prev.map(x => x._id === editingId ? res.data : x));
      } else {
        const res = await createPopup(form);
        setPopups(prev => [res.data, ...prev]);
      }
      closeForm();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: PopupData) {
    const res = await updatePopup(p._id!, { active: !p.active });
    setPopups(prev => prev.map(x => x._id === p._id ? res.data : x));
  }

  async function remove(id: string) {
    if (!confirm('Delete popup?')) return;
    await deletePopup(id);
    setPopups(prev => prev.filter(x => x._id !== id));
  }

  const f = form;
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div style={{ padding: '36px 44px', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>Popup & Banner Manager</h1>
        <button onClick={openNew} style={{ padding: '9px 20px', borderRadius: 10, background: '#00C27A', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          + New Popup
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px', boxShadow: '0 1px 8px rgba(0,0,0,0.08)', marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 18px' }}>{editingId ? 'Edit Popup' : 'New Popup'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={f.type} onChange={e => set('type', e.target.value as PopupData['type'])} style={selectStyle}>
                <option value="banner">Banner (top strip)</option>
                <option value="modal">Modal (centered overlay)</option>
                <option value="corner">Corner (bottom-right card)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Trigger</label>
              <select value={f.trigger} onChange={e => set('trigger', e.target.value as PopupData['trigger'])} style={selectStyle}>
                <option value="immediate">Immediate</option>
                <option value="exit-intent">Exit Intent</option>
                <option value="scroll-50">50% Scroll</option>
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Title</label>
              <input value={f.title} onChange={e => set('title', e.target.value)} style={inputStyle} placeholder="Popup title" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Body</label>
              <textarea value={f.body} onChange={e => set('body', e.target.value)} style={{ ...inputStyle, height: 80, resize: 'vertical' }} placeholder="Popup message body" />
            </div>
            <div>
              <label style={labelStyle}>CTA Text</label>
              <input value={f.ctaText} onChange={e => set('ctaText', e.target.value)} style={inputStyle} placeholder="Get Started" />
            </div>
            <div>
              <label style={labelStyle}>CTA Link</label>
              <input value={f.ctaHref} onChange={e => set('ctaHref', e.target.value)} style={inputStyle} placeholder="/pricing" />
            </div>
            <div>
              <label style={labelStyle}>Background Color</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={f.bgColor || '#0f172a'} onChange={e => set('bgColor', e.target.value)} style={{ width: 40, height: 36, borderRadius: 8, border: '1.5px solid #e2e8f0', cursor: 'pointer', padding: 2 }} />
                <input value={f.bgColor || ''} onChange={e => set('bgColor', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Delay (ms)</label>
              <input type="number" value={f.delay ?? 0} onChange={e => set('delay', Number(e.target.value))} style={inputStyle} placeholder="0" />
            </div>
            <div>
              <label style={labelStyle}>Start Date (optional)</label>
              <input type="datetime-local" value={f.startAt ? String(f.startAt).slice(0, 16) : ''} onChange={e => set('startAt', e.target.value || undefined)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>End Date (optional)</label>
              <input type="datetime-local" value={f.endAt ? String(f.endAt).slice(0, 16) : ''} onChange={e => set('endAt', e.target.value || undefined)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!f.active} onChange={e => set('active', e.target.checked)} />
              Active
            </label>
            <div style={{ flex: 1 }} />
            <button onClick={closeForm} style={{ padding: '9px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={save} disabled={saving || !f.title} style={{ padding: '9px 22px', borderRadius: 10, background: '#00C27A', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving || !f.title ? 0.6 : 1 }}>
              {saving ? 'Saving…' : editingId ? 'Update Popup' : 'Create Popup'}
            </button>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: '#94a3b8', fontSize: 14 }}>Loading…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {popups.length === 0 && !showForm && (
            <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>No popups yet. Create one above.</p>
          )}
          {popups.map(p => (
            <div key={p._id} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: p.active ? '#00C27A' : '#e2e8f0', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{p.title}</span>
                  <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: '#f1f5f9', color: '#64748b', fontWeight: 600 }}>{p.type}</span>
                  <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: '#f1f5f9', color: '#64748b', fontWeight: 600 }}>{p.trigger}</span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.body}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => toggleActive(p)} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: p.active ? '#fef2f2' : '#f0fdf4', color: p.active ? '#ef4444' : '#00C27A', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                  {p.active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => openEdit(p)} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: '#f1f5f9', color: '#475569', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                <button onClick={() => remove(p._id!)} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: '#fef2f2', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 13px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f1f5f9', fontSize: 13, color: '#0f172a', outline: 'none', boxSizing: 'border-box' };
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };
