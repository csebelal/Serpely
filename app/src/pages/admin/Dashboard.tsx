import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllPosts, getAllTestimonials, getPricing, getSettings, getAnalyticsSummary, getContacts, getSubscribers, getAuditLogs, type AnalyticsSummary } from '@/lib/api';

interface Stats { posts: number; testimonials: number; plans: number; siteName: string; unreadContacts: number; totalSubscribers: number; }

const QUICK_LINKS = [
  { to: '/sp-super-admin/home-editor', label: 'Home Page', desc: 'Headlines, CTAs, sections' },
  { to: '/sp-super-admin/blog', label: 'Blog Posts', desc: 'Create & manage content' },
  { to: '/sp-super-admin/pricing', label: 'Pricing', desc: 'Plans & features' },
  { to: '/sp-super-admin/contact', label: 'Contact Inbox', desc: 'Form submissions' },
  { to: '/sp-super-admin/subscribers', label: 'Subscribers', desc: 'Newsletter list' },
  { to: '/sp-super-admin/seo', label: 'SEO', desc: 'Per-page meta & OG' },
  { to: '/sp-super-admin/changelog', label: 'Changelog', desc: 'What\'s new' },
  { to: '/sp-super-admin/audit', label: 'Audit Log', desc: 'Admin activity' },
];

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [recentAudit, setRecentAudit] = useState<{ action: string; resource: string; adminEmail: string; createdAt: string }[]>([]);

  useEffect(() => {
    Promise.all([getAllPosts(), getAllTestimonials(), getPricing(), getSettings(), getContacts(), getSubscribers()]).then(
      ([posts, testimonials, plans, settings, contacts, subscribers]) => {
        setStats({
          posts: posts.data.length,
          testimonials: testimonials.data.length,
          plans: plans.data.length,
          siteName: settings.data.siteName || 'Serpely',
          unreadContacts: contacts.data.unreadCount,
          totalSubscribers: subscribers.data.stats.total,
        });
      }
    ).catch(() => {});

    getAnalyticsSummary().then(r => setAnalytics(r.data)).catch(() => {});
    getAuditLogs().then(r => setRecentAudit(r.data.slice(0, 5))).catch(() => {});
  }, []);

  const ACTION_COLORS: Record<string, string> = { create: '#00C27A', update: '#0ea5e9', delete: '#ef4444' };

  const maxViews = analytics ? Math.max(...(analytics.topPages.map(p => p.count) || [1]), 1) : 1;

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>Welcome back 👋</h1>
        <p style={{ margin: '5px 0 0', color: '#94a3b8', fontSize: 14 }}>{stats?.siteName} Admin Panel</p>
      </div>

      {/* Analytics stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Today', value: analytics?.today ?? '—', color: '#00C27A' },
          { label: 'Last 7 days', value: analytics?.last7d ?? '—', color: '#6366f1' },
          { label: 'Last 30 days', value: analytics?.last30d ?? '—', color: '#0ea5e9' },
          { label: 'Unread Messages', value: stats?.unreadContacts ?? '—', color: '#f59e0b' },
          { label: 'Subscribers', value: stats?.totalSubscribers ?? '—', color: '#ec4899' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: '-0.04em' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        {/* Top Pages */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Top Pages (30d)</p>
          {analytics?.topPages.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {analytics.topPages.slice(0, 6).map(p => (
                <div key={p.path}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{p.path}</span>
                    <span style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>{p.count}</span>
                  </div>
                  <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2 }}>
                    <div style={{ height: '100%', background: '#00C27A', borderRadius: 2, width: `${(p.count / maxViews) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <p style={{ color: '#94a3b8', fontSize: 13 }}>No data yet</p>}
        </div>

        {/* Recent Audit */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Recent Activity</p>
            <Link to="/sp-super-admin/audit" style={{ fontSize: 12, color: '#00C27A', textDecoration: 'none', fontWeight: 600 }}>View all</Link>
          </div>
          {recentAudit.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentAudit.map((l, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: `${ACTION_COLORS[l.action] || '#94a3b8'}18`, color: ACTION_COLORS[l.action] || '#94a3b8', flexShrink: 0 }}>{l.action}</span>
                  <span style={{ fontSize: 12, color: '#475569', flex: 1 }}>{l.resource}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          ) : <p style={{ color: '#94a3b8', fontSize: 13 }}>No activity yet</p>}
        </div>
      </div>

      <h2 style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quick Access</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {QUICK_LINKS.map(l => (
          <Link key={l.to} to={l.to} style={{
            display: 'block', background: '#fff', borderRadius: 14,
            padding: '18px 20px', textDecoration: 'none',
            boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
            transition: 'box-shadow 0.15s, transform 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,194,122,0.12)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,0.05)'; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 3 }}>{l.label}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{l.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
