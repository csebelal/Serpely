import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Home, Building2, Zap, Plug, Scale, FileText, Tag,
  Menu, PanelBottom, Quote, HelpCircle, Image, Mail, Users, Megaphone,
  History, Search, Key, ScrollText, Cookie, UserCog, Settings,
  PanelLeftClose, PanelLeftOpen, LogOut, X, type LucideIcon,
} from 'lucide-react';
import { logoutAdmin } from '@/lib/api';
import { useAdminRole } from '@/context/adminRole';
import { ErrorBoundary } from '@/components/ErrorBoundary';

type NavEntry = { to: string; label: string; Icon: LucideIcon; end?: boolean; ownerOnly?: boolean } | null;

const NAV: NavEntry[] = [
  { to: '/sp-super-admin', label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/sp-super-admin/home-editor', label: 'Home Page', Icon: Home },
  { to: '/sp-super-admin/about', label: 'About Page', Icon: Building2 },
  { to: '/sp-super-admin/features-editor', label: 'Features', Icon: Zap },
  { to: '/sp-super-admin/integrations-editor', label: 'Integrations', Icon: Plug },
  { to: '/sp-super-admin/compare-editor', label: 'Compare Page', Icon: Scale },
  { to: '/sp-super-admin/blog', label: 'Blog', Icon: FileText },
  { to: '/sp-super-admin/pricing', label: 'Pricing', Icon: Tag },
  { to: '/sp-super-admin/navbar', label: 'Navbar', Icon: Menu },
  { to: '/sp-super-admin/footer', label: 'Footer', Icon: PanelBottom },
  { to: '/sp-super-admin/testimonials', label: 'Testimonials', Icon: Quote },
  { to: '/sp-super-admin/faq', label: 'FAQ', Icon: HelpCircle },
  { to: '/sp-super-admin/media', label: 'Media', Icon: Image },
  null,
  { to: '/sp-super-admin/contact', label: 'Contact Inbox', Icon: Mail },
  { to: '/sp-super-admin/subscribers', label: 'Subscribers', Icon: Users },
  { to: '/sp-super-admin/popups', label: 'Popups', Icon: Megaphone },
  { to: '/sp-super-admin/changelog', label: 'Changelog', Icon: History },
  { to: '/sp-super-admin/seo', label: 'SEO Manager', Icon: Search },
  { to: '/sp-super-admin/api-keys', label: 'API Keys', Icon: Key },
  { to: '/sp-super-admin/audit', label: 'Audit Log', Icon: ScrollText },
  { to: '/sp-super-admin/consent-log', label: 'Cookie Consent', Icon: Cookie },
  null,
  { to: '/sp-super-admin/users', label: 'Users', Icon: UserCog, ownerOnly: true },
  { to: '/sp-super-admin/settings', label: 'Settings', Icon: Settings, ownerOnly: true },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAdminRole();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpenPath, setMobileOpenPath] = useState<string | null>(null);
  const mobileOpen = mobileOpenPath === location.pathname;
  const visibleNav = NAV.filter((item) => !item || !item.ownerOnly || role === 'owner');

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpenPath(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  async function logout() {
    try { await logoutAdmin(); } catch { /* clear the client regardless */ }
    navigate('/sp-super-admin/login');
  }

  const renderNavItems = (expanded: boolean) => (
    <nav aria-label="Admin navigation" style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>
      {visibleNav.map((item, i) => {
        if (item === null) {
          if (i === visibleNav.length - 1) return null;
          return <div key={`sep-${i}`} style={{ height: 1, background: '#f1f5f9', margin: '6px 4px' }} />;
        }
        const { to, label, Icon, end } = item;
        return (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={expanded ? undefined : label}
            className="hover:bg-slate-50 cursor-pointer"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '8px 10px',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? '#00754A' : '#475569',
              background: isActive ? 'rgba(0,194,122,0.12)' : 'transparent',
              transition: 'background-color 0.15s, color 0.15s',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            })}
          >
            <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {expanded && label}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'Satoshi, system-ui, sans-serif', position: 'relative', zIndex: 1 }} className="flex-col lg:flex-row">
      {/* Mobile top bar */}
      <header className="lg:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-slate-200 sticky top-0 z-30">
        <img
          src="/Serpely Logo PNG/Serpely - Logo_Logo - Main.png"
          alt="Serpely"
          style={{ height: 24, width: 'auto', objectFit: 'contain' }}
        />
        <button
          type="button"
          onClick={() => setMobileOpenPath(location.pathname)}
          aria-label="Open admin navigation"
          aria-expanded={mobileOpen}
          className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>
      </header>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div role="dialog" aria-modal="true" aria-label="Admin navigation" className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/40" aria-hidden="true" onClick={() => setMobileOpenPath(null)} />
          <aside className="relative z-10 w-64 max-w-[82vw] bg-white h-full flex flex-col shadow-xl">
            <div className="px-4 py-4 flex items-center justify-between border-b border-slate-100">
              <img
                src="/Serpely Logo PNG/Serpely - Logo_Logo - Main.png"
                alt="Serpely"
                style={{ height: 24, width: 'auto', objectFit: 'contain' }}
              />
              <button
                type="button"
                onClick={() => setMobileOpenPath(null)}
                aria-label="Close admin navigation"
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            {renderNavItems(true)}
            <div style={{ padding: '10px 8px', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                aria-label="Logout"
                onClick={logout}
                className="w-full hover:bg-slate-50"
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 13 }}
              >
                <LogOut className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex" style={{
        width: sidebarOpen ? 220 : 60,
        flexShrink: 0,
        background: '#fff',
        boxShadow: '2px 0 12px rgba(15,23,42,0.05)',
        flexDirection: 'column',
        transition: 'width 0.2s',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 16px', display: 'flex', alignItems: 'center', minHeight: 60 }}>
          {sidebarOpen ? (
            <img
              src="/Serpely Logo PNG/Serpely - Logo_Logo - Main.png"
              alt="Serpely"
              style={{ height: 28, width: 'auto', objectFit: 'contain' }}
            />
          ) : (
            <img
              src="/Serpely Icon/Serpely - Logo_Icon - Main.png"
              alt="Serpely"
              style={{ width: 30, height: 30, objectFit: 'contain' }}
            />
          )}
        </div>

        {renderNavItems(sidebarOpen)}

        <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button
            type="button"
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            onClick={() => setSidebarOpen(o => !o)}
            className="hover:bg-slate-50"
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden' }}
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4 flex-shrink-0" aria-hidden="true" /> : <PanelLeftOpen className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}
            {sidebarOpen && 'Collapse'}
          </button>
          <button
            type="button"
            aria-label="Logout"
            onClick={logout}
            className="hover:bg-slate-50"
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden' }}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
