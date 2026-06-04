import { useEffect, useState } from 'react';
import type { FormEvent, CSSProperties } from 'react';
import {
  getAdminUsers, createAdminUser, deleteAdminUser, setAdminUserPassword, getLoginLogs,
  type AdminUserData, type LoginLogData,
} from '@/lib/api';

const col = '#64748b';
const th: CSSProperties = { padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', borderBottom: '1px solid #f1f5f9' };
const td: CSSProperties = { padding: '9px 12px', fontSize: 13, color: '#0f172a', borderBottom: '1px solid #f8fafc', verticalAlign: 'middle' };

export function Users() {
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [logs, setLogs] = useState<LoginLogData[]>([]);
  const [form, setForm] = useState({ email: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState('');

  useEffect(() => {
    getAdminUsers().then(r => setUsers(r.data));
    getLoginLogs().then(r => setLogs(r.data));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateErr('');
    setCreating(true);
    try {
      const { data } = await createAdminUser(form.email, form.password);
      setUsers(prev => [data, ...prev]);
      setForm({ email: '', password: '' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create user';
      setCreateErr(msg);
    }
    setCreating(false);
  }

  async function handleSetPassword(user: AdminUserData) {
    const pw = prompt(`New password for ${user.email} (min 6 chars):`);
    if (!pw) return;
    if (pw.length < 6) { alert('Password must be at least 6 characters'); return; }
    try {
      await setAdminUserPassword(user._id, pw);
      alert(`Password updated for ${user.email}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to set password';
      alert(msg);
    }
  }

  async function handleDelete(user: AdminUserData) {
    if (!confirm(`Delete user "${user.email}"? This cannot be undone.`)) return;
    try {
      await deleteAdminUser(user._id);
      setUsers(prev => prev.filter(u => u._id !== user._id));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Delete failed';
      alert(msg);
    }
  }

  function fmtDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div style={{ padding: '36px 44px', maxWidth: 900 }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>Users & Access</h1>
      <p style={{ margin: '0 0 32px', fontSize: 13, color: '#94a3b8' }}>Manage admin accounts and view login activity</p>

      {/* Create user */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '22px 26px', marginBottom: 20, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Create Admin User</h2>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: col, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
            <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="user@example.com"
              style={{ width: '100%', padding: '9px 12px', background: '#f1f5f9', border: 'none', borderRadius: 10, fontSize: 13, color: '#0f172a', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: col, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
            <input type="password" required minLength={6} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Min 6 characters"
              style={{ width: '100%', padding: '9px 12px', background: '#f1f5f9', border: 'none', borderRadius: 10, fontSize: 13, color: '#0f172a', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={creating}
            style={{ padding: '9px 22px', background: '#00C27A', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
            {creating ? 'Creating…' : '+ Create User'}
          </button>
        </form>
        {createErr && <p style={{ margin: '10px 0 0', fontSize: 12, color: '#ef4444' }}>{createErr}</p>}
      </div>

      {/* User list */}
      <div style={{ background: '#fff', borderRadius: 16, marginBottom: 20, boxShadow: '0 1px 4px rgba(15,23,42,0.05)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 26px 12px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Admin Users ({users.length})</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Email</th>
              <th style={th}>Created</th>
              <th style={{ ...th, textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id}>
                <td style={td}><span style={{ fontWeight: 600 }}>{u.email}</span></td>
                <td style={{ ...td, color: '#64748b' }}>{fmtDate(u.createdAt)}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button onClick={() => handleSetPassword(u)}
                      style={{ padding: '4px 12px', background: '#f0fdf4', border: 'none', borderRadius: 6, color: '#16a34a', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      Set Password
                    </button>
                    <button onClick={() => handleDelete(u)}
                      style={{ padding: '4px 12px', background: '#fef2f2', border: 'none', borderRadius: 6, color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={3} style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: '24px' }}>No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Login logs */}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(15,23,42,0.05)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 26px 12px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Login Log (last 200)</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr>
                <th style={th}>Time</th>
                <th style={th}>Email</th>
                <th style={th}>IP Address</th>
                <th style={th}>Status</th>
                <th style={{ ...th, maxWidth: 200 }}>User Agent</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log._id}>
                  <td style={{ ...td, color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(log.timestamp)}</td>
                  <td style={td}>{log.email}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{log.ip || '—'}</td>
                  <td style={td}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700,
                      background: log.success ? 'rgba(0,194,122,0.1)' : '#fef2f2',
                      color: log.success ? '#00A868' : '#ef4444',
                    }}>
                      {log.success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                  <td style={{ ...td, color: '#94a3b8', fontSize: 11, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.userAgent || '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: '24px' }}>No login history yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
