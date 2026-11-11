import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import {
  Eye, CalendarDays, Activity, Users, Mail, RefreshCw, Plus, ArrowUpRight,
  FileText, Search, ShieldCheck, Megaphone, Image as ImageIcon, Tag,
  Home, History, ScrollText, Globe, ExternalLink, TrendingUp, TrendingDown,
} from 'lucide-react';
import {
  getAllPosts, getAllTestimonials, getPricing, getSettings, getAnalyticsSummary,
  getContacts, getSubscribers, getAuditLogs, getAllSEO, getAllPopups, getMedia, getConsentLog,
  type AnalyticsSummary, type ContactSubmissionData, type AuditLogData,
} from '@/lib/api';
import { useAdminRole } from '@/context/adminRole';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface ContentHealth {
  siteName: string;
  maintenanceMode: boolean;
  systemStatus: string;
  postsTotal: number;
  postsPublished: number;
  postsDraft: number;
  testimonials: number;
  plans: number;
  unreadContacts: number;
  recentContacts: ContactSubmissionData[];
  totalSubscribers: number;
  activeSubscribers: number;
  seoConfigured: number;
  seoTotalPages: number;
  popupsActive: number;
  popupsTotal: number;
  mediaCount: number;
  mediaBytes: number;
  consentRate: number | null;
  consentTotal: number;
}

const TOTAL_STATIC_SEO_PAGES = 12;

const QUICK_LINKS = [
  { to: '/sp-super-admin/home-editor', label: 'Home Page', desc: 'Headlines, CTAs, sections', Icon: Home },
  { to: '/sp-super-admin/blog', label: 'Blog Posts', desc: 'Create & manage content', Icon: FileText },
  { to: '/sp-super-admin/seo', label: 'SEO Manager', desc: 'Per-page meta & OG', Icon: Search },
  { to: '/sp-super-admin/pricing', label: 'Pricing', desc: 'Plans & features', Icon: Tag },
  { to: '/sp-super-admin/contact', label: 'Contact Inbox', desc: 'Form submissions', Icon: Mail },
  { to: '/sp-super-admin/subscribers', label: 'Subscribers', desc: 'Newsletter list', Icon: Users },
  { to: '/sp-super-admin/changelog', label: 'Changelog', desc: "What's new", Icon: History },
  { to: '/sp-super-admin/audit', label: 'Audit Log', desc: 'Admin activity', Icon: ScrollText },
];

function fillDailySeries(raw: { date: string; count: number }[], days: number): { date: string; label: string; count: number }[] {
  const map = new Map<string, number>();
  if (Array.isArray(raw)) {
    for (const row of raw) {
      if (row && typeof row.date === 'string') map.set(row.date, Number(row.count) || 0);
    }
  }
  const out: { date: string; label: string; count: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    out.push({ date: key, label, count: map.get(key) ?? 0 });
  }
  return out;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function hostOf(url?: string): string {
  if (!url) return '—';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return String(url).replace(/^https?:\/\//, '') || '—';
  }
}

function timeAgo(iso?: string): string {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs)) return '—';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function scoreColor(score: number): { bg: string; fg: string } {
  if (score >= 80) return { bg: '#ecfdf5', fg: '#047857' };
  if (score >= 55) return { bg: '#fffbeb', fg: '#b45309' };
  return { bg: '#fef2f2', fg: '#dc2626' };
}

export function Dashboard() {
  const role = useAdminRole();
  const [health, setHealth] = useState<ContentHealth | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [recentAudit, setRecentAudit] = useState<AuditLogData[]>([]);
  const [chartDays, setChartDays] = useState<7 | 30>(30);
  const [trafficTab, setTrafficTab] = useState<'pages' | 'referrers'>('pages');
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    const [
      postsR,
      testimonialsR,
      plansR,
      settingsR,
      contactsR,
      subscribersR,
      seoR,
      popupsR,
      mediaR,
      consentR,
      analyticsR,
      auditR,
    ] = await Promise.allSettled([
      getAllPosts(),
      getAllTestimonials(),
      getPricing(),
      getSettings(),
      getContacts(),
      getSubscribers(),
      getAllSEO(),
      getAllPopups(),
      getMedia(),
      getConsentLog(),
      getAnalyticsSummary(),
      getAuditLogs(),
    ]);

    const posts = postsR.status === 'fulfilled' && Array.isArray(postsR.value.data) ? postsR.value.data : [];
    const testimonials = testimonialsR.status === 'fulfilled' && Array.isArray(testimonialsR.value.data) ? testimonialsR.value.data : [];
    const plans = plansR.status === 'fulfilled' && Array.isArray(plansR.value.data) ? plansR.value.data : [];
    const settings = settingsR.status === 'fulfilled' ? settingsR.value.data : null;
    const contacts = contactsR.status === 'fulfilled' ? contactsR.value.data : null;
    const subscribers = subscribersR.status === 'fulfilled' ? subscribersR.value.data : null;
    const seoPages = seoR.status === 'fulfilled' && Array.isArray(seoR.value.data) ? seoR.value.data : [];
    const popups = popupsR.status === 'fulfilled' && Array.isArray(popupsR.value.data) ? popupsR.value.data : [];
    const media = mediaR.status === 'fulfilled' && Array.isArray(mediaR.value.data) ? mediaR.value.data : [];
    const consent = consentR.status === 'fulfilled' ? consentR.value.data : null;

    setHealth({
      siteName: settings?.siteName || 'Serpely',
      maintenanceMode: Boolean(settings?.maintenanceMode),
      systemStatus: settings?.systemStatus || 'Operational',
      postsTotal: posts.length,
      postsPublished: posts.filter(p => p.published).length,
      postsDraft: posts.filter(p => !p.published).length,
      testimonials: testimonials.length,
      plans: plans.length,
      unreadContacts: contacts?.unreadCount ?? 0,
      recentContacts: Array.isArray(contacts?.submissions) ? contacts.submissions.slice(0, 4) : [],
      totalSubscribers: subscribers?.stats?.total ?? 0,
      activeSubscribers: subscribers?.stats?.active ?? 0,
      seoConfigured: seoPages.filter(p => Boolean(p.metaTitle?.trim() && p.metaDescription?.trim())).length,
      seoTotalPages: TOTAL_STATIC_SEO_PAGES,
      popupsActive: popups.filter(p => p.active).length,
      popupsTotal: popups.length,
      mediaCount: media.length,
      mediaBytes: media.reduce((sum, f) => sum + (f.size || 0), 0),
      consentRate: consent?.stats?.acceptRate ?? null,
      consentTotal: consent?.stats?.total ?? 0,
    });

    if (analyticsR.status === 'fulfilled' && analyticsR.value.data && typeof analyticsR.value.data === 'object') {
      setAnalytics(analyticsR.value.data);
    }
    if (auditR.status === 'fulfilled' && Array.isArray(auditR.value.data)) {
      setRecentAudit(auditR.value.data.slice(0, 5));
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData().catch(() => undefined);
  }, [fetchDashboardData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchDashboardData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchDashboardData]);

  const series = useMemo(
    () => fillDailySeries(analytics?.dailyViews ?? [], chartDays),
    [analytics?.dailyViews, chartDays],
  );

  const weekDeltaPct = useMemo(() => {
    if (!analytics || typeof analytics.prev7d !== 'number' || analytics.prev7d === 0) return null;
    return Math.round(((analytics.last7d - analytics.prev7d) / analytics.prev7d) * 100);
  }, [analytics]);

  const ACTION_COLORS: Record<string, string> = { create: '#00754A', update: '#0369a1', delete: '#dc2626' };
  const topPages = useMemo(() => (Array.isArray(analytics?.topPages) ? analytics.topPages : []), [analytics?.topPages]);
  const topReferrers = useMemo(() => (Array.isArray(analytics?.topReferrers) ? analytics.topReferrers : []), [analytics?.topReferrers]);
  const maxPageViews = topPages.length ? Math.max(...topPages.map(p => p.count), 1) : 1;
  const maxRefViews = topReferrers.length ? Math.max(...topReferrers.map(r => r.count), 1) : 1;
  const avgDaily30 = analytics && typeof analytics.last30d === 'number' ? Math.round(analytics.last30d / 30) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[1220px]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>
              Welcome back
            </h1>
            {health && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  background: health.maintenanceMode ? '#fffbeb' : '#ecfdf5',
                  color: health.maintenanceMode ? '#b45309' : '#047857',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: health.maintenanceMode ? '#d97706' : '#10b981',
                  }}
                />
                {health.maintenanceMode ? 'Maintenance Mode' : health.systemStatus || 'Operational'}
              </span>
            )}
          </div>
          <p style={{ margin: '5px 0 0', color: '#475569', fontSize: 14 }}>
            {health?.siteName || 'Serpely'} Admin Overview{role ? ` · Signed in as ${role}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-200 hover:bg-slate-100"
            style={{
              padding: '8px 14px',
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: '#0f172a',
              opacity: refreshing ? 0.65 : 1,
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
          <Link
            to="/sp-super-admin/blog/new"
            className="inline-flex items-center gap-1.5 cursor-pointer transition-colors duration-200"
            style={{
              padding: '8px 16px',
              background: '#00C27A',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
              textDecoration: 'none',
            }}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            New Post
          </Link>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
        <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Today Views</span>
            <Eye className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.04em' }}>
            {analytics?.today ?? '—'}
          </div>
          <div style={{ fontSize: 11.5, color: '#475569', marginTop: 4 }}>
            Yesterday: <strong>{analytics?.yesterday ?? '—'}</strong>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>30d Traffic</span>
            <CalendarDays className="w-4 h-4 text-indigo-600" aria-hidden="true" />
          </div>
          <div className="flex items-baseline gap-2">
            <span style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.04em' }}>
              {analytics?.last30d ?? '—'}
            </span>
            {weekDeltaPct !== null && (
              <span
                className="inline-flex items-center gap-0.5"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 999,
                  background: weekDeltaPct >= 0 ? '#ecfdf5' : '#fef2f2',
                  color: weekDeltaPct >= 0 ? '#047857' : '#dc2626',
                }}
              >
                {weekDeltaPct >= 0 ? <TrendingUp className="w-3 h-3" aria-hidden="true" /> : <TrendingDown className="w-3 h-3" aria-hidden="true" />}
                {weekDeltaPct >= 0 ? `+${weekDeltaPct}%` : `${weekDeltaPct}%`}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: '#475569', marginTop: 4 }}>
            7d: <strong>{analytics?.last7d ?? '—'}</strong> · ~{avgDaily30}/day
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Site Audits</span>
            <Activity className="w-4 h-4 text-sky-600" aria-hidden="true" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.04em' }}>
            {analytics?.audits?.total ?? '—'}
          </div>
          <div style={{ fontSize: 11.5, color: '#475569', marginTop: 4 }}>
            7d: <strong>{analytics?.audits?.last7d ?? 0}</strong> · avg{' '}
            <strong>{analytics?.audits?.avgScore !== null && analytics?.audits?.avgScore !== undefined ? `${analytics.audits.avgScore}/100` : '—'}</strong>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Client Users</span>
            <Users className="w-4 h-4 text-violet-600" aria-hidden="true" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.04em' }}>
            {analytics?.clients?.total ?? '—'}
          </div>
          <div style={{ fontSize: 11.5, color: '#475569', marginTop: 4 }}>
            +{analytics?.clients?.last7d ?? 0} this wk · <strong>{analytics?.clients?.verified ?? 0}</strong> verified
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Inbox & Subs</span>
            <Mail className="w-4 h-4 text-amber-600" aria-hidden="true" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.04em' }}>
            {health?.unreadContacts ?? '—'}
            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginLeft: 5 }}>unread</span>
          </div>
          <div style={{ fontSize: 11.5, color: '#475569', marginTop: 4 }}>
            <strong>{health?.activeSubscribers ?? 0}</strong> active / {health?.totalSubscribers ?? 0} subs
          </div>
        </div>
      </div>

      {/* Row 2: Traffic Trend Chart + Content & Platform Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="lg:col-span-2" style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Traffic Trend</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>
                Daily page views across public routes ({chartDays} days)
              </p>
            </div>
            <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: 8, padding: 3, gap: 2 }}>
              {([7, 30] as const).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setChartDays(d)}
                  className="cursor-pointer transition-colors duration-150"
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    background: chartDays === d ? '#fff' : 'transparent',
                    color: chartDays === d ? '#0f172a' : '#475569',
                    boxShadow: chartDays === d ? '0 1px 2px rgba(15,23,42,0.08)' : 'none',
                  }}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div style={{ width: '100%', height: 220 }}>
            <ErrorBoundary
              compact
              fallback={
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#475569' }}>
                  Unable to render traffic chart.
                </div>
              }
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="serpelyViewsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00C27A" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#00C27A" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    tickLine={false}
                    axisLine={false}
                    interval={chartDays === 30 ? 4 : 0}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#475569' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: 'none',
                      borderRadius: 10,
                      color: '#fff',
                      fontSize: 12,
                      padding: '8px 12px',
                    }}
                    labelStyle={{ color: '#94a3b8', marginBottom: 2 }}
                    formatter={(value: unknown) => [`${String(value ?? 0)} views`, 'Traffic']}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#00C27A"
                    strokeWidth={2.2}
                    fill="url(#serpelyViewsGrad)"
                    activeDot={{ r: 4, fill: '#00754A', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ErrorBoundary>
          </div>
        </div>

        {/* Content & System Health */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          <h2 style={{ margin: '0 0 14px', fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Content & Platform Health</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[
              {
                to: '/sp-super-admin/blog',
                Icon: FileText,
                label: 'Blog Posts',
                value: health ? `${health.postsPublished} live · ${health.postsDraft} draft` : '—',
                tone: '#047857',
              },
              {
                to: '/sp-super-admin/seo',
                Icon: Search,
                label: 'SEO Metadata',
                value: health ? `${health.seoConfigured}/${health.seoTotalPages} pages` : '—',
                tone: health && health.seoConfigured < health.seoTotalPages ? '#b45309' : '#047857',
              },
              {
                to: '/sp-super-admin/consent-log',
                Icon: ShieldCheck,
                label: 'Cookie Consent',
                value: health ? `${health.consentRate !== null ? `${health.consentRate}%` : '—'} accept (${health.consentTotal})` : '—',
                tone: '#0369a1',
              },
              {
                to: '/sp-super-admin/popups',
                Icon: Megaphone,
                label: 'Active Popups',
                value: health ? `${health.popupsActive} of ${health.popupsTotal}` : '—',
                tone: '#4338ca',
              },
              {
                to: '/sp-super-admin/media',
                Icon: ImageIcon,
                label: 'Media Library',
                value: health ? `${health.mediaCount} files · ${formatBytes(health.mediaBytes)}` : '—',
                tone: '#475569',
              },
              {
                to: '/sp-super-admin/pricing',
                Icon: Tag,
                label: 'Plans & Sitemaps',
                value: `${health?.plans ?? 0} plans · ${analytics?.sitemaps?.total ?? 0} sitemaps`,
                tone: '#475569',
              },
            ].map(item => (
              <Link
                key={item.label}
                to={item.to}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors duration-150 cursor-pointer"
                style={{ textDecoration: 'none', border: '1px solid #f1f5f9' }}
              >
                <span className="flex items-center gap-2.5" style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a' }}>
                  <item.Icon className="w-4 h-4 text-slate-500 flex-shrink-0" aria-hidden="true" />
                  {item.label}
                </span>
                <span className="flex items-center gap-1" style={{ fontSize: 12, fontWeight: 700, color: item.tone }}>
                  {item.value}
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Recent Site Audits + Top Pages / Referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Recent Site Audits</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>Latest public crawls run by visitors</p>
            </div>
            <Link to="/audit" style={{ fontSize: 12, color: '#00754A', textDecoration: 'none', fontWeight: 700 }}>
              Open tool
            </Link>
          </div>
          {analytics?.audits?.recent?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {analytics.audits.recent.map(a => {
                const sc = scoreColor(a.overall);
                return (
                  <div
                    key={a.shareToken || `${a.url}-${a.createdAt}`}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Globe className="w-4 h-4 text-slate-500 flex-shrink-0" aria-hidden="true" />
                      <div className="min-w-0">
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {hostOf(a.url)}
                        </div>
                        <div style={{ fontSize: 11, color: '#475569' }}>
                          {a.pagesCrawled} pages · {a.critical} critical · {a.warning} warn · {timeAgo(a.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span style={{ fontSize: 12, fontWeight: 800, padding: '3px 8px', borderRadius: 8, background: sc.bg, color: sc.fg }}>
                        {a.overall}/100
                      </span>
                      {a.shareToken && (
                        <Link
                          to={`/audit/${a.shareToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open audit for ${hostOf(a.url)}`}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>No site audits recorded yet.</p>
          )}
        </div>

        {/* Top Pages & Referrers */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Traffic Breakdown (30d)</h2>
            <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: 8, padding: 3, gap: 2 }}>
              {([
                { id: 'pages', label: 'Top Pages' },
                { id: 'referrers', label: 'Referrers' },
              ] as const).map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTrafficTab(t.id)}
                  className="cursor-pointer transition-colors duration-150"
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    background: trafficTab === t.id ? '#fff' : 'transparent',
                    color: trafficTab === t.id ? '#0f172a' : '#475569',
                    boxShadow: trafficTab === t.id ? '0 1px 2px rgba(15,23,42,0.08)' : 'none',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {trafficTab === 'pages' ? (
            topPages.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {topPages.slice(0, 6).map(p => (
                  <div key={p.path}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12.5, color: '#0f172a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                        {p.path}
                      </span>
                      <span style={{ fontSize: 12, color: '#475569', fontWeight: 700, flexShrink: 0 }}>{p.count}</span>
                    </div>
                    <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3 }}>
                      <div style={{ height: '100%', background: '#00C27A', borderRadius: 3, width: `${(p.count / maxPageViews) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>No page views recorded yet.</p>
            )
          ) : topReferrers.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {topReferrers.map(r => (
                <div key={r.referrer}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, color: '#0f172a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                      {r.referrer}
                    </span>
                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 700, flexShrink: 0 }}>{r.count}</span>
                  </div>
                  <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3 }}>
                    <div style={{ height: '100%', background: '#4338ca', borderRadius: 3, width: `${(r.count / maxRefViews) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>No external referrers recorded in the last 30 days.</p>
          )}
        </div>
      </div>

      {/* Row 4: Recent Messages + Recent Admin Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-7">
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Recent Contact Messages</h2>
            <Link to="/sp-super-admin/contact" style={{ fontSize: 12, color: '#00754A', textDecoration: 'none', fontWeight: 700 }}>
              Open inbox
            </Link>
          </div>
          {health?.recentContacts?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {health.recentContacts.map(c => (
                <div
                  key={c._id}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl"
                  style={{ background: c.read ? '#fff' : '#f0fdf4', border: '1px solid #f1f5f9' }}
                >
                  <div className="min-w-0">
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name} <span style={{ fontWeight: 500, color: '#475569' }}>· {c.email}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.topic || c.message}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: '#475569', flexShrink: 0 }}>{timeAgo(c.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>No contact submissions yet.</p>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Recent Admin Activity</h2>
            <Link to="/sp-super-admin/audit" style={{ fontSize: 12, color: '#00754A', textDecoration: 'none', fontWeight: 700 }}>
              View all
            </Link>
          </div>
          {recentAudit.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentAudit.map((l) => (
                <div key={l._id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 10,
                      background: `${ACTION_COLORS[l.action] || '#475569'}18`,
                      color: ACTION_COLORS[l.action] || '#475569',
                      flexShrink: 0,
                      textTransform: 'uppercase',
                    }}
                  >
                    {l.action}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.resource}{l.detail ? ` · ${l.detail}` : ''}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569' }}>{l.adminEmail}</div>
                  </div>
                  <span style={{ fontSize: 11, color: '#475569', flexShrink: 0 }}>
                    {timeAgo(l.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>No activity yet.</p>
          )}
        </div>
      </div>

      {/* Row 5: Quick Access */}
      <h2 style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Quick Access
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {QUICK_LINKS.map(l => (
          <Link
            key={l.to}
            to={l.to}
            className="flex items-start gap-3 cursor-pointer transition-all duration-150 hover:shadow-md"
            style={{
              background: '#fff',
              borderRadius: 14,
              padding: '16px 18px',
              textDecoration: 'none',
              boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
              border: '1px solid #f1f5f9',
            }}
          >
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(0,194,122,0.12)', color: '#00754A' }}
            >
              <l.Icon className="w-4 h-4" aria-hidden="true" />
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 2 }}>{l.label}</div>
              <div style={{ fontSize: 12, color: '#475569' }}>{l.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
