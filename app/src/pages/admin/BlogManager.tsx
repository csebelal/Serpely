import { useEffect, useState } from 'react';
import { getAllPosts, deletePost, bulkUpdatePosts, bulkDeletePosts, type BlogPostData } from '@/lib/api';
import { Link } from 'react-router-dom';

const CATEGORIES = ['All', 'geo-aeo', 'agentic-seo', 'ai-seo-tools', 'technical-seo', 'keyword-strategy', 'llm-seo', 'reporting', 'case-studies', 'product-updates'];

export function BlogManager() {
  const [posts, setPosts] = useState<BlogPostData[]>([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);

  useEffect(() => { getAllPosts().then(r => setPosts(r.data)); }, []);

  const filtered = posts.filter(p => {
    const matchCat = filter === 'All' || p.category === filter;
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  function toggleSelect(id: string) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleAll() {
    setSelected(s => s.size === filtered.length ? new Set() : new Set(filtered.map(p => p._id!)));
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    setDeleting(id);
    try { await deletePost(id); setPosts(posts.filter(p => p._id !== id)); } catch { /* ignore */ }
    setDeleting(null);
  }

  async function bulkPublish(published: boolean) {
    if (!selected.size) return;
    setBulkWorking(true);
    try {
      await bulkUpdatePosts(Array.from(selected), published);
      setPosts(p => p.map(x => selected.has(x._id!) ? { ...x, published } : x));
      setSelected(new Set());
    } finally {
      setBulkWorking(false);
    }
  }

  async function bulkDelete() {
    if (!selected.size || !confirm(`Delete ${selected.size} posts?`)) return;
    setBulkWorking(true);
    try {
      await bulkDeletePosts(Array.from(selected));
      setPosts(p => p.filter(x => !selected.has(x._id!)));
      setSelected(new Set());
    } finally {
      setBulkWorking(false);
    }
  }

  function formatDate(d?: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div style={{ padding: '36px 44px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>Blog</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>{posts.length} posts total</p>
        </div>
        <Link to="/admin/blog/new" style={{ padding: '9px 20px', background: '#00C27A', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>+ New Post</Link>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search posts…"
          style={{ padding: '7px 14px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#0f172a', fontSize: 13, width: 220 }} />
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setFilter(c)} style={{
              padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: filter === c ? 'rgba(0,194,122,0.1)' : '#f1f5f9',
              color: filter === c ? '#00C27A' : '#64748b',
            }}>{c}</button>
          ))}
        </div>
      </div>

      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#0f172a', borderRadius: 10, padding: '10px 16px', marginBottom: 12 }}>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{selected.size} selected</span>
          <button onClick={() => bulkPublish(true)} disabled={bulkWorking} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', background: '#00C27A', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Publish</button>
          <button onClick={() => bulkPublish(false)} disabled={bulkWorking} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Unpublish</button>
          <button onClick={bulkDelete} disabled={bulkWorking} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Delete</button>
          <button onClick={() => setSelected(new Set())} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer', marginLeft: 'auto' }}>Clear</button>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '11px 16px', width: 40 }}>
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
              </th>
              {['Title', 'Category', 'Author', 'Status', 'Date', ''].map(h => (
                <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px' }}>
                  <input type="checkbox" checked={selected.has(p._id!)} onChange={() => toggleSelect(p._id!)} />
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#0f172a', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{p.title}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, padding: '3px 8px', background: '#f1f5f9', borderRadius: 5, color: '#64748b', fontWeight: 600 }}>{p.category}</span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{p.author}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 5, fontWeight: 600, background: p.published ? '#f0fdf4' : '#f1f5f9', color: p.published ? '#16a34a' : '#94a3b8' }}>
                    {p.published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{formatDate(p.publishedAt)}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Link to={`/admin/blog/${p._id}`} style={{ padding: '4px 10px', borderRadius: 6, background: '#f1f5f9', color: '#64748b', fontSize: 11, textDecoration: 'none' }}>Edit</Link>
                    <button onClick={() => handleDelete(p._id!, p.title)} disabled={deleting === p._id}
                      style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#fef2f2', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>
                      {deleting === p._id ? '…' : 'Del'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No posts found.</div>}
      </div>
    </div>
  );
}
