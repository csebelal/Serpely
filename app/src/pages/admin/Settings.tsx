import { useEffect, useState, useRef } from 'react';
import type { FormEvent } from 'react';
import { getSettings, updateSettings, setMyPassword, uploadFile, downloadBackup, restoreBackup, type SiteSettingsData } from '@/lib/api';

export function Settings() {
  const [form, setForm] = useState<Partial<SiteSettingsData>>({});
  const [pwForm, setPwForm] = useState({ newPw: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const [backupWorking, setBackupWorking] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');
  const restoreRef = useRef<HTMLInputElement>(null);

  useEffect(() => { getSettings().then(r => setForm(r.data)); }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    await updateSettings(form);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  async function handlePwChange(e: FormEvent) {
    e.preventDefault();
    if (pwForm.newPw.length < 6) { setPwMsg('Password must be at least 6 characters'); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg('Passwords do not match'); return; }
    try {
      await setMyPassword(pwForm.newPw);
      setPwMsg('✓ Password updated successfully');
      setPwForm({ newPw: '', confirm: '' });
    } catch { setPwMsg('Failed to update password'); }
    setTimeout(() => setPwMsg(''), 4000);
  }

  async function handleImgUpload(field: 'ogImage' | 'faviconUrl', file: File) {
    setUploading(field);
    try { const { data } = await uploadFile(file); setForm(f => ({ ...f, [field]: data.url })); } catch { /* ignore */ }
    setUploading(null);
  }

  const inp = (label: string, field: keyof SiteSettingsData, type = 'text') => (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <input type={type} value={(form[field] as string) || ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        style={{ width: '100%', padding: '9px 13px', background: '#f1f5f9', border: 'none', borderRadius: 10, color: '#0f172a', fontSize: 14, boxSizing: 'border-box' }} />
    </div>
  );

  async function handleDownloadBackup() {
    setBackupWorking(true);
    try {
      const res = await downloadBackup();
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupMsg('✓ Backup downloaded');
    } catch { setBackupMsg('Backup failed'); }
    setBackupWorking(false);
    setTimeout(() => setBackupMsg(''), 3000);
  }

  async function handleRestoreBackup(file: File) {
    if (!confirm('Restore this backup? This will overwrite all current content.')) return;
    setBackupWorking(true);
    try {
      const text = await file.text();
      await restoreBackup(JSON.parse(text));
      setBackupMsg('✓ Restore complete');
    } catch { setBackupMsg('Restore failed — invalid backup file'); }
    setBackupWorking(false);
    setTimeout(() => setBackupMsg(''), 4000);
  }

  const section = (title: string) => (
    <h2 style={{ margin: '0 0 18px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</h2>
  );

  return (
    <div style={{ padding: '36px 44px', maxWidth: 680 }}>
      <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>Site Settings</h1>
      <p style={{ margin: '0 0 32px', fontSize: 13, color: '#94a3b8' }}>SEO metadata, analytics, and system configuration</p>

      <form onSubmit={handleSave}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px 26px', marginBottom: 16, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          {section('General')}
          {inp('Site Name', 'siteName')}
          {inp('Site URL', 'siteUrl', 'url')}
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: '24px 26px', marginBottom: 16, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          {section('SEO Defaults')}
          {inp('Default Meta Title', 'defaultMetaTitle')}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Default Meta Description</label>
            <textarea value={form.defaultMetaDescription || ''} onChange={e => setForm(f => ({ ...f, defaultMetaDescription: e.target.value }))} rows={3}
              style={{ width: '100%', padding: '9px 13px', background: '#f1f5f9', border: 'none', borderRadius: 10, color: '#0f172a', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          {['ogImage', 'faviconUrl'].map(field => (
            <div key={field} style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{field === 'ogImage' ? 'OG Image' : 'Favicon'}</label>
              {(form as Record<string, string>)[field] && <img src={(form as Record<string, string>)[field]} alt={field} style={{ height: field === 'faviconUrl' ? 28 : 56, maxWidth: 120, objectFit: 'contain', borderRadius: 6, marginBottom: 6, display: 'block' }} />}
              <input type="file" accept="image/*" onChange={e => e.target.files && handleImgUpload(field as 'ogImage' | 'faviconUrl', e.target.files[0])} style={{ fontSize: 12, color: '#64748b' }} />
              {uploading === field && <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>Uploading…</span>}
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: '24px 26px', marginBottom: 16, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          {section('Analytics')}
          {inp('Google Analytics ID', 'googleAnalyticsId')}
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: '24px 26px', marginBottom: 16, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          {section('Custom Head Code')}
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>Paste any <code>&lt;meta&gt;</code>, <code>&lt;script&gt;</code>, <code>&lt;link&gt;</code>, or other <code>&lt;head&gt;</code> HTML below. It will be injected into every page. Google Analytics is also handled automatically from the ID above.</p>
          <textarea value={form.customHeadCode || ''} onChange={e => setForm(f => ({ ...f, customHeadCode: e.target.value }))} rows={10} spellCheck={false}
            style={{ width: '100%', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, color: '#0f172a', fontSize: 13, fontFamily: '"Cascadia Code", "JetBrains Mono", "Fira Code", monospace', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }} />
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: '24px 26px', marginBottom: 24, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          {section('System')}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 16 }}>
            <input type="checkbox" checked={!!form.maintenanceMode} onChange={e => setForm(f => ({ ...f, maintenanceMode: e.target.checked }))} style={{ width: 15, height: 15, accentColor: '#00C27A' }} />
            <span style={{ fontSize: 14, color: '#0f172a', fontWeight: 500 }}>Maintenance Mode</span>
          </label>
          {inp('System Status Text', 'systemStatus')}
        </div>

        <button type="submit" disabled={saving} style={{ padding: '10px 28px', background: '#00C27A', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>

      <div style={{ marginTop: 40, paddingTop: 36, borderTop: '1px solid #f1f5f9' }}>
        <h2 style={{ margin: '0 0 18px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Backup & Export</h2>
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px 26px', marginBottom: 32, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>Download a full backup of all site content (sections, blog, pricing, testimonials, FAQ, nav, footer, settings).</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleDownloadBackup} disabled={backupWorking} style={{ padding: '9px 20px', background: '#00C27A', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: backupWorking ? 0.6 : 1 }}>
              {backupWorking ? 'Working…' : 'Download Backup'}
            </button>
            <div>
              <input ref={restoreRef} type="file" accept=".json" style={{ display: 'none' }} onChange={e => e.target.files && handleRestoreBackup(e.target.files[0])} />
              <button onClick={() => restoreRef.current?.click()} disabled={backupWorking} style={{ padding: '9px 20px', background: '#f1f5f9', border: 'none', borderRadius: 10, color: '#0f172a', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: backupWorking ? 0.6 : 1 }}>
                Restore from Backup
              </button>
            </div>
            {backupMsg && <span style={{ fontSize: 13, color: backupMsg.startsWith('✓') ? '#16a34a' : '#ef4444', fontWeight: 600 }}>{backupMsg}</span>}
          </div>
        </div>
      </div>

      <div style={{ paddingTop: 8 }}>
        <h2 style={{ margin: '0 0 18px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Change Password</h2>
        <form onSubmit={handlePwChange} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 400 }}>
          {[['New Password', 'newPw'], ['Confirm New Password', 'confirm']].map(([label, key]) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
              <input type="password" value={pwForm[key as keyof typeof pwForm]} onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))} required minLength={6}
                style={{ width: '100%', padding: '9px 13px', background: '#f1f5f9', border: 'none', borderRadius: 10, color: '#0f172a', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          ))}
          {pwMsg && <div style={{ fontSize: 13, color: pwMsg.startsWith('✓') ? '#16a34a' : '#ef4444' }}>{pwMsg}</div>}
          <button type="submit" style={{ padding: '9px', background: '#f1f5f9', border: 'none', borderRadius: 10, color: '#0f172a', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Update Password</button>
        </form>
      </div>
    </div>
  );
}
