import { useEffect, useState } from 'react';
import { getSubscribers, updateSubscriber, deleteSubscriber, bulkDeleteSubscribers, exportSubscribers, type SubscriberData, type SubscriberStats } from '../../lib/api';

export function SubscribersManager() {
  const [subscribers, setSubscribers] = useState<SubscriberData[]>([]);
  const [stats, setStats] = useState<SubscriberStats>({ total: 0, active: 0, thisWeek: 0, unsubscribed: 0 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getSubscribers();
      setSubscribers(res.data.subscribers);
      setStats(res.data.stats);
    } catch {
      setError('Failed to load subscribers.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function toggleSelect(id: string) {
    setSelected(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    setSelected(s => s.size === subscribers.length ? new Set() : new Set(subscribers.map(x => x._id)));
  }

  async function toggleActive(id: string, active: boolean) {
    setError('');
    try {
      await updateSubscriber(id, !active);
      setSubscribers(s => s.map(x => x._id === id ? { ...x, active: !active } : x));
    } catch {
      setError('Failed to update subscriber status.');
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete subscriber?')) return;
    setError('');
    try {
      await deleteSubscriber(id);
      setSubscribers(s => s.filter(x => x._id !== id));
      setSelected(s => { const n = new Set(s); n.delete(id); return n; });
    } catch {
      setError('Failed to delete subscriber.');
    }
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.size} subscribers?`)) return;
    setError('');
    try {
      await bulkDeleteSubscribers(Array.from(selected));
      setSubscribers(s => s.filter(x => !selected.has(x._id)));
      setSelected(new Set());
    } catch {
      setError('Failed to delete selected subscribers.');
    }
  }

  async function doExport() {
    setError('');
    try {
      const res = await exportSubscribers();
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'subscribers.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export subscribers CSV.');
    }
  }

  const statCards = [
    { label: 'Total', value: stats.total, color: '#6366f1' },
    { label: 'Active', value: stats.active, color: '#00C27A' },
    { label: 'This Week', value: stats.thisWeek, color: '#0ea5e9' },
    { label: 'Unsubscribed', value: stats.unsubscribed, color: '#f59e0b' },
  ];

  return (
    <div style={{ padding: '36px 44px', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>Subscribers</h1>
        <button onClick={doExport} style={{ padding: '9px 20px', borderRadius: 10, background: '#00C27A', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          Export CSV
        </button>
      </div>
      {error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#dc2626', borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {statCards.map(c => (
          <div key={c.label} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</p>
            <p style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 800, color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#0f172a', borderRadius: 10, padding: '10px 16px', marginBottom: 12 }}>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{selected.size} selected</span>
          <button onClick={bulkDelete} style={{ padding: '5px 14px', borderRadius: 8, background: '#ef4444', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Delete</button>
          <button onClick={() => setSelected(new Set())} style={{ padding: '5px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer' }}>Clear</button>
        </div>
      )}

      {loading ? <p style={{ color: '#94a3b8', fontSize: 14 }}>Loading…</p> : (
        <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #f1f5f9' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', width: 36 }}>
                  <input type="checkbox" checked={selected.size === subscribers.length && subscribers.length > 0} onChange={toggleAll} />
                </th>
                {['Email', 'Status', 'Source', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subscribers.map(s => (
                <tr key={s._id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '11px 16px' }}>
                    <input type="checkbox" checked={selected.has(s._id)} onChange={() => toggleSelect(s._id)} />
                  </td>
                  <td style={{ padding: '11px 16px', fontWeight: 500, color: '#0f172a' }}>{s.email}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: s.active ? '#00C27A18' : '#94a3b818', color: s.active ? '#00C27A' : '#94a3b8' }}>
                      {s.active ? 'Active' : 'Unsubscribed'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px', color: '#64748b' }}>{s.source}</td>
                  <td style={{ padding: '11px 16px', color: '#94a3b8' }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => toggleActive(s._id, s.active)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#f1f5f9', color: '#475569', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                        {s.active ? 'Unsub' : 'Reactivate'}
                      </button>
                      <button onClick={() => remove(s._id)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#fef2f2', color: '#ef4444', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {subscribers.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: 14 }}>No subscribers yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
