import { useEffect, useState } from 'react';
import { getContacts, updateContact, deleteContact, type ContactSubmissionData } from '../../lib/api';

const STATUS_COLORS: Record<string, string> = {
  new: '#f59e0b', replied: '#00C27A', archived: '#94a3b8',
};
const TOPIC_COLORS: Record<string, string> = {
  sales: '#6366f1', support: '#0ea5e9', general: '#64748b', partnership: '#ec4899', billing: '#f97316',
};

type Tab = 'all' | 'starred' | 'archived';

export function ContactInbox() {
  const [submissions, setSubmissions] = useState<ContactSubmissionData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tab, setTab] = useState<Tab>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params: { status?: string; starred?: boolean } = {};
      if (tab === 'archived') params.status = 'archived';
      if (tab === 'starred') params.starred = true;
      const res = await getContacts(params);
      setSubmissions(res.data.submissions);
      setUnreadCount(res.data.unreadCount);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [tab]);

  async function markRead(id: string) {
    await updateContact(id, { read: true });
    setSubmissions(s => s.map(x => x._id === id ? { ...x, read: true } : x));
    setUnreadCount(n => Math.max(0, n - 1));
  }

  async function toggleStar(id: string, starred: boolean) {
    await updateContact(id, { starred: !starred });
    setSubmissions(s => s.map(x => x._id === id ? { ...x, starred: !starred } : x));
  }

  async function setStatus(id: string, status: ContactSubmissionData['status']) {
    await updateContact(id, { status });
    setSubmissions(s => s.map(x => x._id === id ? { ...x, status } : x));
  }

  async function remove(id: string) {
    if (!confirm('Delete this submission?')) return;
    await deleteContact(id);
    setSubmissions(s => s.filter(x => x._id !== id));
  }

  function handleExpand(id: string, read: boolean) {
    setExpanded(e => e === id ? null : id);
    if (!read) markRead(id);
  }

  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ padding: '36px 44px', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>Contact Inbox</h1>
          {unreadCount > 0 && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#f59e0b' }}>{unreadCount} unread</p>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['all', 'starred', 'archived'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '7px 16px', borderRadius: 8, border: '1.5px solid', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: tab === t ? '#0f172a' : '#fff',
              color: tab === t ? '#fff' : '#64748b',
              borderColor: tab === t ? '#0f172a' : '#e2e8f0',
            }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
      </div>

      {loading && <p style={{ color: '#94a3b8', fontSize: 14 }}>Loading…</p>}

      {!loading && submissions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
          <p style={{ fontSize: 16, fontWeight: 600 }}>No messages yet</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Contact form submissions will appear here</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {submissions.map(s => (
          <div key={s._id} style={{
            background: '#fff', borderRadius: 12, border: s.read ? '1.5px solid #f1f5f9' : '1.5px solid #bfdbfe',
            overflow: 'hidden', transition: 'all 0.15s',
          }}>
            <div
              onClick={() => handleExpand(s._id, s.read)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, color: '#475569' }}>
                {initials(s.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: s.read ? 500 : 700, fontSize: 14, color: '#0f172a' }}>{s.name}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{s.email}</span>
                  {s.topic && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 12, background: `${TOPIC_COLORS[s.topic] || '#64748b'}18`, color: TOPIC_COLORS[s.topic] || '#64748b' }}>{s.topic}</span>}
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.message}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${STATUS_COLORS[s.status]}18`, color: STATUS_COLORS[s.status] }}>{s.status}</span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(s.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {expanded === s._id && (
              <div style={{ borderTop: '1px solid #f1f5f9', padding: '16px 18px', background: '#fafafa' }}>
                {s.company && <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 6px' }}>Company: {s.company}{s.website ? ` · ${s.website}` : ''}</p>}
                <p style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: '0 0 14px' }}>{s.message}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => setStatus(s._id, 'replied')} style={actionBtn('#00C27A')}>Mark Replied</button>
                  <button onClick={() => setStatus(s._id, 'archived')} style={actionBtn('#64748b')}>Archive</button>
                  <button onClick={() => toggleStar(s._id, s.starred)} style={actionBtn(s.starred ? '#f59e0b' : '#94a3b8')}>{s.starred ? '★ Unstar' : '☆ Star'}</button>
                  <button onClick={() => remove(s._id)} style={actionBtn('#ef4444')}>Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function actionBtn(color: string): React.CSSProperties {
  return { padding: '6px 14px', borderRadius: 8, border: 'none', background: `${color}18`, color, fontWeight: 600, fontSize: 12, cursor: 'pointer' };
}
