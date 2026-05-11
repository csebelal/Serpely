import { useEffect, useState } from 'react';
import { getAuditLogs, type AuditLogData } from '../../lib/api';

const ACTION_COLORS = { create: '#00C27A', update: '#0ea5e9', delete: '#ef4444' };

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  async function load() {
    setLoading(true);
    try {
      const params: { action?: string; from?: string; to?: string } = {};
      if (filterAction) params.action = filterAction;
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await getAuditLogs(params);
      setLogs(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterAction, from, to]);

  return (
    <div style={{ padding: '36px 44px', maxWidth: 1000 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 24px' }}>Audit Log</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13, color: '#0f172a', cursor: 'pointer' }}>
          <option value="">All actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
        </select>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inputStyle} placeholder="From" />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inputStyle} placeholder="To" />
        {(filterAction || from || to) && (
          <button onClick={() => { setFilterAction(''); setFrom(''); setTo(''); }} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#f1f5f9', color: '#64748b', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Clear</button>
        )}
      </div>

      {loading ? <p style={{ color: '#94a3b8', fontSize: 14 }}>Loading…</p> : (
        <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #f1f5f9' }}>
                {['Action', 'Resource', 'Detail', 'Admin', 'IP', 'Time'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l._id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${ACTION_COLORS[l.action]}18`, color: ACTION_COLORS[l.action] }}>
                      {l.action}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px', fontWeight: 600, color: '#0f172a' }}>{l.resource}</td>
                  <td style={{ padding: '11px 16px', color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.detail}</td>
                  <td style={{ padding: '11px 16px', color: '#475569' }}>{l.adminEmail}</td>
                  <td style={{ padding: '11px 16px', color: '#94a3b8', fontFamily: 'monospace', fontSize: 12 }}>{l.ip}</td>
                  <td style={{ padding: '11px 16px', color: '#94a3b8' }}>{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: 14 }}>No audit entries yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13, color: '#0f172a',
};
