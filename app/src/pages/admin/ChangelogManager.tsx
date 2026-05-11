import { useEffect, useState } from 'react';
import { getAllChangelog, createChangelogEntry, updateChangelogEntry, deleteChangelogEntry, type ChangelogData } from '../../lib/api';

const TYPE_COLORS = { feature: '#6366f1', improvement: '#0ea5e9', fix: '#f59e0b' };
const TYPE_LABELS = { feature: '✦ Feature', improvement: '↑ Improvement', fix: '⚙ Fix' };

const empty: Omit<ChangelogData, '_id' | 'createdAt' | 'updatedAt'> = {
  title: '', slug: '', body: '', type: 'feature', published: false,
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function ChangelogManager() {
  const [entries, setEntries] = useState<ChangelogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ChangelogData | null | undefined>(undefined);
  const [form, setForm] = useState<typeof empty>({ ...empty });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await getAllChangelog();
      setEntries(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startNew() {
    setEditing(null);
    setForm({ ...empty });
  }

  function startEdit(e: ChangelogData) {
    setEditing(e);
    setForm({ title: e.title, slug: e.slug, body: e.body, type: e.type, published: e.published });
  }

  function handleTitleChange(title: string) {
    setForm(f => ({ ...f, title, slug: f.slug || slugify(title) }));
  }

  async function save() {
    setSaving(true);
    try {
      if (editing?._id) {
        const res = await updateChangelogEntry(editing._id, form);
        setEntries(e => e.map(x => x._id === editing._id ? res.data : x));
      } else {
        const res = await createChangelogEntry(form);
        setEntries(e => [res.data, ...e]);
      }
      setEditing(undefined);
      setForm({ ...empty });
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(entry: ChangelogData) {
    const res = await updateChangelogEntry(entry._id!, { published: !entry.published });
    setEntries(e => e.map(x => x._id === entry._id ? res.data : x));
  }

  async function remove(id: string) {
    if (!confirm('Delete this changelog entry?')) return;
    await deleteChangelogEntry(id);
    setEntries(e => e.filter(x => x._id !== id));
  }

  const isFormOpen = editing !== undefined;

  return (
    <div style={{ padding: '36px 44px', maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>Changelog</h1>
        <button onClick={startNew} style={{ padding: '9px 20px', borderRadius: 10, background: '#00C27A', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          + New Entry
        </button>
      </div>

      {isFormOpen && (
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px', boxShadow: '0 1px 8px rgba(0,0,0,0.08)', marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 18px' }}>{editing?._id ? 'Edit Entry' : 'New Entry'}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
              <div>
                <label style={labelStyle}>Title</label>
                <input value={form.title} onChange={e => handleTitleChange(e.target.value)} style={inputStyle} placeholder="What changed?" />
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ChangelogData['type'] }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="feature">Feature</option>
                  <option value="improvement">Improvement</option>
                  <option value="fix">Fix</option>
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Slug</label>
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))} style={inputStyle} placeholder="auto-generated" />
            </div>
            <div>
              <label style={labelStyle}>Body (Markdown)</label>
              <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} style={{ ...inputStyle, height: 160, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} placeholder="Describe the change in detail…" />
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} />
                Publish immediately
              </label>
              <div style={{ flex: 1 }} />
              <button onClick={() => setEditing(undefined)} style={{ padding: '9px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.title || !form.slug} style={{ padding: '9px 22px', borderRadius: 10, background: '#00C27A', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving || !form.title ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: '#94a3b8', fontSize: 14 }}>Loading…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.length === 0 && !isFormOpen && <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>No entries yet. Create one above.</p>}
          {entries.map(e => (
            <div key={e._id} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 12, background: `${TYPE_COLORS[e.type]}18`, color: TYPE_COLORS[e.type], flexShrink: 0 }}>
                {TYPE_LABELS[e.type]}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>/{e.slug} · {e.publishedAt ? new Date(e.publishedAt).toLocaleDateString() : 'Draft'}</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: e.published ? '#00C27A18' : '#f1f5f9', color: e.published ? '#00C27A' : '#94a3b8', flexShrink: 0 }}>
                {e.published ? 'Published' : 'Draft'}
              </span>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => togglePublish(e)} style={{ padding: '5px 11px', borderRadius: 8, border: 'none', background: e.published ? '#fef2f2' : '#f0fdf4', color: e.published ? '#ef4444' : '#00C27A', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                  {e.published ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => startEdit(e)} style={{ padding: '5px 11px', borderRadius: 8, border: 'none', background: '#f1f5f9', color: '#475569', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                <button onClick={() => remove(e._id!)} style={{ padding: '5px 11px', borderRadius: 8, border: 'none', background: '#fef2f2', color: '#ef4444', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Delete</button>
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
