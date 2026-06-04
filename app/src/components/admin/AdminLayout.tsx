import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';

const NAV = [
  { to: '/sp-super-admin', label: 'Dashboard', icon: '◈', end: true },
  { to: '/sp-super-admin/home-editor', label: 'Home Page', icon: '🏠' },
  { to: '/sp-super-admin/about', label: 'About Page', icon: '🏢' },
  { to: '/sp-super-admin/features-editor', label: 'Features', icon: '⚡' },
  { to: '/sp-super-admin/integrations-editor', label: 'Integrations', icon: '🔌' },
  { to: '/sp-super-admin/compare-editor', label: 'Compare Page', icon: '⚖' },
  { to: '/sp-super-admin/blog', label: 'Blog', icon: '✦' },
  { to: '/sp-super-admin/pricing', label: 'Pricing', icon: '◇' },
  { to: '/sp-super-admin/navbar', label: 'Navbar', icon: '≡' },
  { to: '/sp-super-admin/footer', label: 'Footer', icon: '⊡' },
  { to: '/sp-super-admin/testimonials', label: 'Testimonials', icon: '❝' },
  { to: '/sp-super-admin/faq', label: 'FAQ', icon: '?' },
  { to: '/sp-super-admin/media', label: 'Media', icon: '⊕' },
  null,
  { to: '/sp-super-admin/contact', label: 'Contact Inbox', icon: '✉' },
  { to: '/sp-super-admin/subscribers', label: 'Subscribers', icon: '📧' },
  { to: '/sp-super-admin/popups', label: 'Popups', icon: '📢' },
  { to: '/sp-super-admin/changelog', label: 'Changelog', icon: '📋' },
  { to: '/sp-super-admin/seo', label: 'SEO Manager', icon: '🔍' },
  { to: '/sp-super-admin/api-keys', label: 'API Keys', icon: '🔑' },
  { to: '/sp-super-admin/audit', label: 'Audit Log', icon: '📜' },
  null,
  { to: '/sp-super-admin/users', label: 'Users', icon: '👤' },
  { to: '/sp-super-admin/settings', label: 'Settings', icon: '⚙' },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  function logout() {
    localStorage.removeItem('serpely_token');
    navigate('/sp-super-admin/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'Satoshi, system-ui, sans-serif', position: 'relative', zIndex: 1 }}>
      <aside style={{
        width: sidebarOpen ? 220 : 60,
        flexShrink: 0,
        background: '#fff',
        boxShadow: '2px 0 12px rgba(15,23,42,0.05)',
        display: 'flex',
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
              alt="S"
              style={{ width: 30, height: 30, objectFit: 'contain' }}
            />
          )}
        </div>

        <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>
          {NAV.map((item, i) => {
            if (item === null) {
              return <div key={`sep-${i}`} style={{ height: 1, background: '#f1f5f9', margin: '6px 4px' }} />;
            }
            const { to, label, icon, end } = item;
            return (
              <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '8px 10px',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#00C27A' : '#64748b',
                background: isActive ? 'rgba(0,194,122,0.08)' : 'transparent',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              })}>
                <span style={{ flexShrink: 0, fontSize: 14, width: 20, textAlign: 'center' }}>{icon}</span>
                {sidebarOpen && label}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button onClick={() => setSidebarOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <span style={{ flexShrink: 0, fontSize: 13, width: 20, textAlign: 'center' }}>{sidebarOpen ? '◀' : '▶'}</span>
            {sidebarOpen && 'Collapse'}
          </button>
          <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <span style={{ flexShrink: 0, fontSize: 13, width: 20, textAlign: 'center' }}>⏻</span>
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
        <Outlet />
      </div>
    </div>
  );
}
