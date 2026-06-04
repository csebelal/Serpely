import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clientUpdateMe, clientChangePassword, clientUpdateWebsites,
  clientUpdateNotifications, clientGenerateApiKey, clientDeleteAccount,
  type ClientUserNotifications,
} from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const PLAN_LABELS: Record<string, string> = { starter: 'Starter', pro: 'Professional', business: 'Business' };
const PLAN_COLORS: Record<string, string> = { starter: '#64748b', pro: '#00A868', business: '#7c3aed' };
const PLAN_LIMITS: Record<string, { keywords: number; websites: number }> = {
  starter:  { keywords: 100,  websites: 1 },
  pro:      { keywords: 1000, websites: 5 },
  business: { keywords: 99999, websites: 99999 },
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-7 mb-5">
      <h2 className="text-xs font-bold uppercase mb-5" style={{ color: 'var(--text-soft)', letterSpacing: '0.08em' }}>{title}</h2>
      {children}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 py-3 cursor-pointer" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
      <div>
        <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{label}</div>
        <div className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-faint)' }}>{desc}</div>
      </div>
      <div
        onClick={() => onChange(!checked)}
        className="flex-shrink-0 w-10 h-6 rounded-full transition-all relative cursor-pointer"
        style={{ background: checked ? '#00C27A' : 'hsl(var(--border))', transition: 'background 0.2s' }}
      >
        <div className="absolute top-1 rounded-full w-4 h-4 transition-all"
          style={{ background: '#fff', left: checked ? 22 : 4, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </div>
    </label>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder = '', readOnly = false }: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; placeholder?: string; readOnly?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--text-soft)', letterSpacing: '0.06em' }}>{label}</label>
      <input
        type={type} value={value} readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all"
        style={{
          background: readOnly ? 'var(--bg-subtle)' : 'var(--bg-subtle)',
          border: '1px solid hsl(var(--border))',
          color: readOnly ? 'var(--text-faint)' : 'var(--text)',
          cursor: readOnly ? 'default' : 'text',
        }}
        onFocus={e => { if (!readOnly) e.target.style.borderColor = '#00C27A'; }}
        onBlur={e => { e.target.style.borderColor = 'hsl(var(--border))'; }}
      />
    </div>
  );
}

export function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  // Profile
  const [name, setName] = useState(user?.name || '');
  const [nameMsg, setNameMsg] = useState('');
  const [nameSaving, setNameSaving] = useState(false);

  // Password
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  // Websites
  const [websites, setWebsites] = useState<string[]>(user?.websites?.map(w => w.domain) || []);
  const [newDomain, setNewDomain] = useState('');
  const [webMsg, setWebMsg] = useState('');
  const [webSaving, setWebSaving] = useState(false);

  // Notifications
  const [notifs, setNotifs] = useState<ClientUserNotifications>(
    user?.notifications || { weeklyDigest: true, rankAlerts: true, geoAlerts: true, auditAlerts: false }
  );
  const [notifMsg, setNotifMsg] = useState('');
  const [notifSaving, setNotifSaving] = useState(false);

  // API Key
  const [apiKey, setApiKey] = useState(user?.apiKey || '');
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [apiKeyGenerating, setApiKeyGenerating] = useState(false);
  const [apiKeyMsg, setApiKeyMsg] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const plan = user?.plan || 'starter';
  const limits = PLAN_LIMITS[plan];

  async function handleNameSave(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setNameSaving(true);
    try {
      const { data } = await clientUpdateMe(name);
      setUser(data); setNameMsg('✓ Name updated');
    } catch { setNameMsg('Failed to update'); }
    setNameSaving(false);
    setTimeout(() => setNameMsg(''), 3000);
  }

  async function handlePwChange(e: FormEvent) {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg('Passwords do not match'); return; }
    setPwSaving(true);
    try {
      await clientChangePassword(pwForm.current, pwForm.newPw);
      setPwMsg('✓ Password changed');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed';
      setPwMsg(msg);
    }
    setPwSaving(false);
    setTimeout(() => setPwMsg(''), 4000);
  }

  function addWebsite() {
    let domain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!domain) return;
    if (websites.includes(domain)) { setWebMsg('Already added'); setTimeout(() => setWebMsg(''), 2000); return; }
    if (websites.length >= limits.websites) {
      setWebMsg(`Plan limit: ${limits.websites === 99999 ? 'unlimited' : limits.websites} website${limits.websites === 1 ? '' : 's'}`);
      setTimeout(() => setWebMsg(''), 3000); return;
    }
    setWebsites(prev => [...prev, domain]);
    setNewDomain('');
  }

  function removeWebsite(domain: string) {
    setWebsites(prev => prev.filter(d => d !== domain));
  }

  async function handleWebSave() {
    setWebSaving(true);
    try {
      const { data } = await clientUpdateWebsites(websites.map(d => ({ domain: d })));
      setUser(data); setWebMsg('✓ Saved');
    } catch { setWebMsg('Failed to save'); }
    setWebSaving(false);
    setTimeout(() => setWebMsg(''), 3000);
  }

  async function handleNotifToggle(key: keyof ClientUserNotifications, val: boolean) {
    const updated = { ...notifs, [key]: val };
    setNotifs(updated);
    setNotifSaving(true);
    try {
      const { data } = await clientUpdateNotifications({ [key]: val });
      setUser(data); setNotifMsg('✓ Saved');
    } catch { setNotifMsg('Failed to save'); }
    setNotifSaving(false);
    setTimeout(() => setNotifMsg(''), 2000);
  }

  async function handleGenerateApiKey() {
    if (!confirm('Generate a new API key? This will revoke the existing key.')) return;
    setApiKeyGenerating(true);
    setApiKeyMsg('');
    try {
      const { data } = await clientGenerateApiKey();
      setApiKey(data.apiKey);
      setApiKeyVisible(true);
      setApiKeyMsg('✓ New key generated');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed';
      setApiKeyMsg(msg);
    }
    setApiKeyGenerating(false);
    setTimeout(() => setApiKeyMsg(''), 4000);
  }

  function copyApiKey() {
    navigator.clipboard.writeText(apiKey);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  }

  async function handleDeleteAccount(e: FormEvent) {
    e.preventDefault();
    if (deleteConfirm !== user?.email) return;
    setDeleting(true);
    try {
      await clientDeleteAccount();
      logout();
      navigate('/');
    } catch { setDeleting(false); }
  }

  if (!user) return null;

  const initials = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  return (
    <div className="min-h-screen py-16 px-4" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-5 mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#00C27A,#00916B)', color: '#fff' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-display text-2xl font-black" style={{ color: 'var(--text)', letterSpacing: '-0.03em' }}>{user.name}</h1>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: `${PLAN_COLORS[plan]}18`, color: PLAN_COLORS[plan], border: `1px solid ${PLAN_COLORS[plan]}40` }}>
                {PLAN_LABELS[plan]}
              </span>
            </div>
            <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-soft)' }}>{user.email} · Member since {joinDate}</p>
          </div>
        </div>

        {/* Plan & Usage */}
        <Card title="Plan & Usage">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <div className="text-base font-bold" style={{ color: 'var(--text)' }}>{PLAN_LABELS[plan]} Plan</div>
              <div className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-soft)' }}>
                {plan === 'starter' ? 'Free forever · upgrade for more power' : plan === 'pro' ? 'Professional features unlocked' : 'Full platform access'}
              </div>
            </div>
            {plan !== 'business' && (
              <a href="/pricing" className="btn-accent-s" style={{ fontSize: 12, padding: '7px 14px' }}>
                Upgrade Plan
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
              </a>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Keywords Tracked', used: 0, limit: limits.keywords, unit: '' },
              { label: 'Websites', used: websites.length, limit: limits.websites, unit: '' },
            ].map(stat => {
              const pct = stat.limit === 99999 ? 0 : Math.min(100, (stat.used / stat.limit) * 100);
              const unlimited = stat.limit === 99999;
              return (
                <div key={stat.label} className="rounded-xl p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))' }}>
                  <div className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-faint)', letterSpacing: '0.06em' }}>{stat.label}</div>
                  <div className="text-xl font-black mb-2" style={{ color: 'var(--text)' }}>
                    {stat.used} <span className="text-sm font-medium" style={{ color: 'var(--text-faint)' }}>/ {unlimited ? '∞' : stat.limit}</span>
                  </div>
                  {!unlimited && (
                    <div className="rounded-full h-1.5 overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pct > 80 ? '#f59e0b' : '#00C27A' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Tracked Websites */}
        <Card title="Tracked Websites">
          <div className="mb-4 flex gap-2">
            <input
              type="text" value={newDomain} onChange={e => setNewDomain(e.target.value)}
              placeholder="example.com"
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addWebsite())}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium outline-none"
              style={{ background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))', color: 'var(--text)' }}
              onFocus={e => (e.target.style.borderColor = '#00C27A')}
              onBlur={e => (e.target.style.borderColor = 'hsl(var(--border))')}
            />
            <button onClick={addWebsite} className="btn-accent-s" style={{ padding: '8px 16px', fontSize: 13 }}>Add</button>
          </div>
          {websites.length > 0 ? (
            <div className="mb-4" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {websites.map(domain => (
                <div key={domain} className="flex items-center justify-between rounded-xl px-4 py-2.5"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#00C27A' }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{domain}</span>
                  </div>
                  <button onClick={() => removeWebsite(domain)} className="text-xs font-bold px-2 py-1 rounded-lg transition-colors"
                    style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onMouseOver={e => (e.currentTarget.style.background = '#fef2f2')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-faint)' }}>No websites added yet. Add your first domain above.</p>
          )}
          <div className="flex items-center gap-3">
            <button onClick={handleWebSave} disabled={webSaving} className="btn-accent-s" style={{ fontSize: 13, padding: '8px 16px' }}>
              {webSaving ? 'Saving…' : 'Save Websites'}
            </button>
            {webMsg && <span className="text-sm font-medium" style={{ color: webMsg.startsWith('✓') ? '#00A868' : '#ef4444' }}>{webMsg}</span>}
          </div>
        </Card>

        {/* Notifications */}
        <Card title="Notifications">
          <Toggle label="Weekly Digest" desc="Summary of rankings and GEO score changes every Monday"
            checked={notifs.weeklyDigest} onChange={v => handleNotifToggle('weeklyDigest', v)} />
          <Toggle label="Rank Drop Alerts" desc="Immediate email when a tracked keyword drops significantly"
            checked={notifs.rankAlerts} onChange={v => handleNotifToggle('rankAlerts', v)} />
          <Toggle label="GEO Score Alerts" desc="Notify when AI visibility score changes by ±5 points"
            checked={notifs.geoAlerts} onChange={v => handleNotifToggle('geoAlerts', v)} />
          <Toggle label="Audit Issue Alerts" desc="Email when critical technical issues are detected"
            checked={notifs.auditAlerts} onChange={v => handleNotifToggle('auditAlerts', v)} />
          <div className="mt-3 h-4 flex items-center">
            {notifSaving && <span className="text-xs font-medium" style={{ color: 'var(--text-faint)' }}>Saving…</span>}
            {notifMsg && !notifSaving && <span className="text-xs font-medium" style={{ color: '#00A868' }}>{notifMsg}</span>}
          </div>
        </Card>

        {/* API Key */}
        <Card title="API Access">
          {plan === 'starter' ? (
            <div className="rounded-xl p-5 text-center" style={{ background: 'var(--bg-subtle)', border: '1px dashed hsl(var(--border))' }}>
              <div className="text-sm font-bold mb-1" style={{ color: 'var(--text)' }}>API access requires Pro or Business</div>
              <div className="text-xs font-medium mb-4" style={{ color: 'var(--text-faint)' }}>Connect Serpely to your tools and workflows</div>
              <a href="/pricing" className="btn-accent-s" style={{ fontSize: 12, padding: '7px 16px' }}>Upgrade to Pro</a>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-soft)' }}>
                Use this key to authenticate API requests. Keep it secret — treat it like a password.
              </p>
              {apiKey ? (
                <div className="flex gap-2 mb-3">
                  <div className="flex-1 rounded-xl px-4 py-2.5 text-sm font-mono flex items-center overflow-hidden"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))', color: 'var(--text)', letterSpacing: '0.03em' }}>
                    <span className="truncate">{apiKeyVisible ? apiKey : '••••••••••••••••••••••••••••••••'}</span>
                  </div>
                  <button onClick={() => setApiKeyVisible(v => !v)} className="px-3 rounded-xl text-xs font-bold transition-colors"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))', color: 'var(--text-soft)', cursor: 'pointer' }}>
                    {apiKeyVisible ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={copyApiKey} className="px-3 rounded-xl text-xs font-bold transition-colors"
                    style={{ background: apiKeyCopied ? '#00C27A' : 'var(--bg-subtle)', border: '1px solid hsl(var(--border))', color: apiKeyCopied ? '#fff' : 'var(--text-soft)', cursor: 'pointer' }}>
                    {apiKeyCopied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              ) : (
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-faint)' }}>No API key generated yet.</p>
              )}
              <div className="flex items-center gap-3">
                <button onClick={handleGenerateApiKey} disabled={apiKeyGenerating}
                  className="text-sm font-bold px-4 py-2 rounded-xl transition-colors"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))', color: 'var(--text-soft)', cursor: 'pointer' }}>
                  {apiKeyGenerating ? 'Generating…' : apiKey ? 'Regenerate Key' : 'Generate API Key'}
                </button>
                {apiKeyMsg && <span className="text-sm font-medium" style={{ color: apiKeyMsg.startsWith('✓') ? '#00A868' : '#ef4444' }}>{apiKeyMsg}</span>}
              </div>
            </>
          )}
        </Card>

        {/* Profile info */}
        <Card title="Profile">
          <form onSubmit={handleNameSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <InputField label="Full Name" value={name} onChange={setName} placeholder="Your name" />
            <InputField label="Email" value={user.email} readOnly />
            {nameMsg && <p className="text-sm font-medium" style={{ color: nameMsg.startsWith('✓') ? '#00A868' : '#ef4444' }}>{nameMsg}</p>}
            <button type="submit" disabled={nameSaving} className="btn-accent-s" style={{ alignSelf: 'flex-start' }}>
              {nameSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </Card>

        {/* Change password */}
        <Card title="Change Password">
          <form onSubmit={handlePwChange} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <InputField label="Current Password" value={pwForm.current} onChange={v => setPwForm(f => ({ ...f, current: v }))} type="password" />
            <InputField label="New Password" value={pwForm.newPw} onChange={v => setPwForm(f => ({ ...f, newPw: v }))} type="password" placeholder="Min 6 characters" />
            <InputField label="Confirm New Password" value={pwForm.confirm} onChange={v => setPwForm(f => ({ ...f, confirm: v }))} type="password" />
            {pwMsg && <p className="text-sm font-medium" style={{ color: pwMsg.startsWith('✓') ? '#00A868' : '#ef4444' }}>{pwMsg}</p>}
            <button type="submit" disabled={pwSaving} className="btn-accent-s" style={{ alignSelf: 'flex-start' }}>
              {pwSaving ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </Card>

        {/* Account / Danger zone */}
        <Card title="Account">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Sign out of Serpely</div>
              <div className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-faint)' }}>You'll need to sign in again to access your account</div>
            </div>
            <button onClick={() => { logout(); navigate('/'); }}
              className="text-sm font-bold px-5 py-2.5 rounded-xl"
              style={{ background: '#fef2f2', color: '#ef4444', border: 'none', cursor: 'pointer' }}>
              Sign Out
            </button>
          </div>
          <div className="rounded-xl p-5" style={{ border: '1px solid #fecaca', background: '#fff8f8' }}>
            <div className="text-sm font-bold mb-1" style={{ color: '#ef4444' }}>Delete Account</div>
            <div className="text-xs font-medium mb-4" style={{ color: '#94a3b8' }}>
              Permanently delete your account and all data. This cannot be undone. Type your email to confirm.
            </div>
            <form onSubmit={handleDeleteAccount} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                type="email" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                placeholder={user.email} className="flex-1 rounded-xl px-3 py-2 text-sm font-medium outline-none"
                style={{ background: '#fff', border: '1px solid #fecaca', color: '#0f172a', minWidth: 180 }}
              />
              <button type="submit" disabled={deleteConfirm !== user.email || deleting}
                className="text-sm font-bold px-4 py-2 rounded-xl transition-all"
                style={{
                  background: deleteConfirm === user.email ? '#ef4444' : '#fef2f2',
                  color: deleteConfirm === user.email ? '#fff' : '#fca5a5',
                  border: 'none', cursor: deleteConfirm === user.email ? 'pointer' : 'not-allowed',
                }}>
                {deleting ? 'Deleting…' : 'Delete Account'}
              </button>
            </form>
          </div>
        </Card>

      </div>
    </div>
  );
}
