import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleLogout() {
    logout();
    setUserMenuOpen(false);
    navigate('/');
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem('serpely-theme');
      if (saved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        setIsDark(true);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.setAttribute('data-theme', 'dark');
      try { localStorage.setItem('serpely-theme', 'dark'); } catch (_) {}
    } else {
      document.documentElement.removeAttribute('data-theme');
      try { localStorage.setItem('serpely-theme', 'light'); } catch (_) {}
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header
      id="navbar"
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: 'color-mix(in srgb, var(--bg) 78%, transparent)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        borderBottom: isScrolled ? '1px solid hsl(var(--border))' : '1px solid transparent',
        boxShadow: isScrolled ? '0 2px 12px rgba(10,10,10,0.04)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center flex-shrink-0">
          <img
            src={isDark ? '/Serpely Logo PNG/Serpely - Logo_Logo - White.png' : '/Serpely Logo PNG/Serpely - Logo_Logo - Main.png'}
            alt="Serpely"
            className="h-8 w-auto object-contain"
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">

          {/* Why Serpely â€” mega dropdown */}
          <div className="relative group">
            <button className={`nav-link-pill`}>
              Why Serpely
              <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" style={{ transition: 'transform 0.2s' }}><path d="M2 4l4 4 4-4"/></svg>
            </button>
            <div className="absolute top-full left-0 z-[9999] opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 ease-out translate-y-1 group-hover:translate-y-0">
              <div className="pt-2.5"><div className="rounded-2xl p-3"
              style={{ background: 'var(--card-bg)', border: '1px solid hsl(var(--border))', boxShadow: '0 24px 60px rgba(10,10,10,0.12)', minWidth: '520px' }}>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest mb-2 px-2" style={{ color: '#00A868' }}>Explore</div>
                  {[
                    { label: 'How It Works', desc: 'Continuous SEO workflow', href: '/how-it-works' },
                    { label: 'Customer Stories', desc: 'Real results from real teams', href: '/' },
                    { label: 'Product Roadmap', desc: "What's coming next", href: '/' },
                  ].map(item => (
                    <Link key={item.label} to={item.href} className="nav-drop-item">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(0,194,122,0.08)', border: '1px solid rgba(0,194,122,0.15)' }}>
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#00A868" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3.5"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/></svg>
                      </div>
                      <div>
                        <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{item.label}</div>
                        <div className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-faint)' }}>{item.desc}</div>
                      </div>
                    </Link>
                  ))}
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest mb-2 px-2" style={{ color: '#00A868' }}>Compare</div>
                  {['vs Semrush', 'vs Ahrefs', 'vs Surfer SEO', 'vs Clearscope', 'vs MarketMuse'].map(item => (
                    <Link key={item} to="/compare" className="nav-drop-item items-center">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,194,122,0.08)', border: '1px solid rgba(0,194,122,0.15)' }}>
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="#00A868" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M9 6l-6 6 6 6M15 6l6 6-6 6"/></svg>
                      </div>
                      <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Serpely {item}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div></div></div>
          </div>

          {/* Product â€” mega dropdown */}
          <div className="relative group">
            <button className="nav-link-pill">
              Product
              <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><path d="M2 4l4 4 4-4"/></svg>
            </button>
            <div className="absolute top-full left-0 z-[9999] opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 ease-out translate-y-1 group-hover:translate-y-0">
              <div className="pt-2.5"><div className="rounded-2xl p-3"
              style={{ background: 'var(--card-bg)', border: '1px solid hsl(var(--border))', boxShadow: '0 24px 60px rgba(10,10,10,0.12)', minWidth: '540px' }}>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest mb-2 px-2" style={{ color: '#00A868' }}>Features</div>
                  {[
                    { label: 'AI Rank Tracking', desc: 'Track Google, AI Overviews, and LLM visibility', href: '/features' },
                    { label: 'GEO Monitoring', desc: 'Brand presence across AI search surfaces', href: '/features' },
                    { label: 'Technical Site Audit', desc: 'Continuously monitor crawl & vitals', href: '/features' },
                    { label: 'Content Prioritization', desc: 'AI-ranked page recommendations', href: '/features' },
                  ].map(item => (
                    <Link key={item.label} to={item.href} className="nav-drop-item">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(0,194,122,0.08)', border: '1px solid rgba(0,194,122,0.15)' }}>
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#00A868" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19h16M7 15V9M12 15V5M17 15v-3"/></svg>
                      </div>
                      <div>
                        <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{item.label}</div>
                        <div className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-faint)' }}>{item.desc}</div>
                      </div>
                    </Link>
                  ))}
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest mb-2 px-2" style={{ color: '#00A868' }}>Integrations</div>
                  {['Google Search Console', 'Google Analytics 4', 'DataForSEO', 'OpenAI / LLM Connectors'].map(item => (
                    <Link key={item} to="/integrations" className="nav-drop-item items-center">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,194,122,0.08)', border: '1px solid rgba(0,194,122,0.15)' }}>
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="#00A868" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M8 12h8M12 8v8M4 12a8 8 0 0 1 8-8M20 12a8 8 0 0 1-8 8"/></svg>
                      </div>
                      <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{item}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div></div></div>
          </div>

          {/* Resources â€” dropdown */}
          <div className="relative group">
            <button className="nav-link-pill">
              Resources
              <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><path d="M2 4l4 4 4-4"/></svg>
            </button>
            <div className="absolute top-full left-0 z-[9999] opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 ease-out translate-y-1 group-hover:translate-y-0">
              <div className="pt-2.5"><div className="rounded-2xl p-2"
              style={{ background: 'var(--card-bg)', border: '1px solid hsl(var(--border))', boxShadow: '0 24px 60px rgba(10,10,10,0.12)', minWidth: '220px' }}>
              {[
                { label: 'Blog', desc: 'SEO & GEO insights', href: '/blog' },
                { label: 'Affiliate Program', desc: 'Earn 30% recurring', href: '#' },
                { label: 'FAQ', desc: 'Common questions answered', href: '/faq' },
                { label: 'Technical Docs', desc: 'API & integration guides', href: '#' },
              ].map(item => (
                <Link key={item.label} to={item.href} className="nav-drop-item">
                  <div>
                    <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{item.label}</div>
                    <div className="text-xs font-medium" style={{ color: 'var(--text-faint)' }}>{item.desc}</div>
                  </div>
                </Link>
              ))}
            </div></div></div>
          </div>

          {/* Free Site Audit btn */}
          <a href="#" className="flex items-center gap-2 ml-1 px-3.5 py-2 rounded-lg text-sm font-bold"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--text)', color: 'var(--text)', letterSpacing: '-0.012em', transition: 'background 0.15s, color 0.15s, transform 0.15s' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--text)'; el.style.color = 'var(--bg)'; el.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--card-bg)'; el.style.color = 'var(--text)'; el.style.transform = ''; }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-audit-pulse flex-shrink-0" />
            Free Site Audit
          </a>

          <Link to="/pricing" className={`nav-link-pill${isActive('/pricing') ? ' active' : ''}`}>
            Pricing
          </Link>
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2.5">
          {/* Theme toggle */}
          <button onClick={toggleTheme} className="toolbar-btn" aria-label="Toggle theme">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user ? (
            <div ref={userMenuRef} className="relative hidden sm:block">
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors"
                style={{ border: '1px solid hsl(var(--border))', background: 'var(--card-bg)', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#00C27A'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--border))'; }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#00C27A,#00916B)', color: '#fff' }}>
                  {user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <span className="text-sm font-semibold max-w-[100px] truncate" style={{ color: 'var(--text)' }}>{user.name}</span>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" style={{ color: 'var(--text-faint)', flexShrink: 0 }}><path d="M2 4l4 4 4-4"/></svg>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 rounded-2xl py-2 z-[9999]"
                  style={{ background: 'var(--card-bg)', border: '1px solid hsl(var(--border))', boxShadow: '0 16px 48px rgba(10,10,10,0.12)', minWidth: 160 }}>
                  <Link to="/profile" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors"
                    style={{ color: 'var(--text-soft)', textDecoration: 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-soft)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                    My Profile
                  </Link>
                  <div style={{ margin: '4px 12px', height: 1, background: 'hsl(var(--border))' }} />
                  <button onClick={handleLogout}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold w-full transition-colors"
                    style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fef2f215'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="hidden sm:block nav-link-pill"
                style={{ textDecoration: 'none' }}>
                Login
              </Link>
              <Link to="/register" className="btn-accent-s hidden sm:inline-flex" style={{ padding: '9px 16px', fontSize: '13.5px' }}>
                Start Free Trial
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button className="lg:hidden p-2" style={{ color: 'var(--text)' }} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden px-6 pb-6 pt-2 border-t" style={{ borderColor: 'hsl(var(--border))', background: 'var(--card-bg)' }}>
          <nav className="flex flex-col gap-0.5">
            {[
              { label: 'How It Works', href: '/how-it-works' },
              { label: 'Features', href: '/features' },
              { label: 'Pricing', href: '/pricing' },
              { label: 'Integrations', href: '/integrations' },
              { label: 'Blog', href: '/blog' },
              { label: 'FAQ', href: '/faq' },
              { label: 'Compare', href: '/compare' },
              { label: 'About', href: '/about' },
              { label: 'Contact', href: '/contact' },
            ].map(item => (
              <Link key={item.label} to={item.href}
                className={`mobile-nav-item${isActive(item.href) ? ' active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 pt-4 flex flex-col gap-2" style={{ borderTop: '1px solid hsl(var(--border))' }}>
            {user ? (
              <>
                <Link to="/profile" className="btn-secondary-s justify-center" onClick={() => setIsMobileMenuOpen(false)}>My Profile</Link>
                <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="btn-secondary-s justify-center" style={{ cursor: 'pointer', color: '#ef4444' }}>Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary-s justify-center" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
                <Link to="/register" className="btn-accent-s justify-center" onClick={() => setIsMobileMenuOpen(false)}>Start Free Trial</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

