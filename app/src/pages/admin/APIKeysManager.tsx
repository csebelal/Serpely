import { useEffect, useState } from 'react';
import { getAPIKeys, createAPIKey, deleteAPIKey, type APIKeyData } from '../../lib/api';

export function APIKeysManager() {
  const [keys, setKeys] = useState<APIKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<{ key: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await getAPIKeys();
      setKeys(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function generate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await createAPIKey(newName.trim());
      setRevealed({ key: res.data.key!, name: res.data.name });
      setKeys(k => [res.data, ...k]);
      setNewName('');
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    await deleteAPIKey(id);
    setKeys(k => k.filter(x => x._id !== id));
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ padding: '36px 44px', maxWidth: 800 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px' }}>API Keys</h1>
      <p style={{ margin: '0 0 28px', fontSize: 14, color: '#64748b' }}>Use API keys to authenticate requests via the <code>X-API-Key</code> header.</p>

      {revealed && (
        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '18px 20px', marginBottom: 24 }}>
          <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#166534', fontSize: 14 }}>New key "{revealed.name}" created — copy it now, it won't be shown again.</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{ flex: 1, background: '#fff', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', fontSize: 12, wordBreak: 'break-all', color: '#0f172a' }}>{revealed.key}</code>
            <button onClick={() => copyKey(revealed.key)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#00C27A', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={() => setRevealed(null)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#f1f5f9', color: '#64748b', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>Dismiss</button>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 14, padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: 24 }}>
        <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Generate New Key</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generate()}
            placeholder="Key name (e.g. Production, CI)"
            style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f1f5f9', fontSize: 13, color: '#0f172a', outline: 'none' }}
          />
          <button onClick={generate} disabled={creating || !newName.trim()} style={{ padding: '10px 22px', borderRadius: 10, background: '#00C27A', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: creating || !newName.trim() ? 0.6 : 1 }}>
            {creating ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>

      {loading ? <p style={{ color: '#94a3b8', fontSize: 14 }}>Loading…</p> : (
        <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #f1f5f9' }}>
                {['Name', 'Key Prefix', 'Created', 'Last Used', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k._id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '11px 16px', fontWeight: 600, color: '#0f172a' }}>{k.name}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <code style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: 6, fontSize: 12, color: '#475569' }}>{k.prefix}…</code>
                  </td>
                  <td style={{ padding: '11px 16px', color: '#94a3b8' }}>{new Date(k.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '11px 16px', color: '#94a3b8' }}>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <button onClick={() => revoke(k._id)} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: '#fef2f2', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Revoke</button>
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: 14 }}>No API keys yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
