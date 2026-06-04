import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFooter } from '../lib/api';

const cols = {
  Product: ['Features', 'Product Tour', 'Integrations', 'Rank Tracker', 'GEO Monitoring', 'Technical Audit', 'White-Label', 'Changelog'],
  Company: ['About Us', 'Blog', 'Careers', 'Affiliate Program', 'Contact', 'Privacy Policy', 'Terms of Service'],
  Resources: ['SEO Blog', 'GEO Guide', 'API Docs', 'FAQ', 'Help Center', 'Feedback', 'Technical Docs', 'Serpely Brand Kit'],
  Compare: ['Serpely vs Semrush', 'Serpely vs Ahrefs', 'Serpely vs Nightwatch', 'Serpely vs Rankability', 'Serpely vs SE Ranking', 'Serpely vs Surfer SEO', 'Serpely vs SERPStat', 'Serpely vs Moz'],
};

const colHrefs: Record<string, string> = {
  // Product
  Features: '/features', 'Product Tour': '/product-tour', Integrations: '/integrations',
  'Rank Tracker': '/features', 'GEO Monitoring': '/features',
  'Technical Audit': '/features', 'White-Label': '/features',
  Changelog: '/changelog',
  // Company
  'About Us': '/about', Blog: '/blog', Contact: '/contact',
  'Privacy Policy': '#', 'Terms of Service': '#', Careers: '#', 'Affiliate Program': '#',
  // Resources
  FAQ: '/faq', 'SEO Blog': '/blog',
  'GEO Guide': '#', 'API Docs': '#', 'Help Center': '#',
  Feedback: '#', 'Technical Docs': '#', 'Serpely Brand Kit': '#',
  // Compare
  'Serpely vs Semrush': '/compare/semrush',
  'Serpely vs Ahrefs': '/compare/ahrefs',
  'Serpely vs Nightwatch': '/compare/nightwatch',
  'Serpely vs Rankability': '/compare/rankability',
  'Serpely vs SE Ranking': '/compare/se-ranking',
  'Serpely vs Surfer SEO': '/compare/surfer-seo',
  'Serpely vs SERPStat': '/compare/serpstat',
  'Serpely vs Moz': '/compare/moz',
};

export function Footer() {
  const [isDark, setIsDark] = useState(false);
  const [socialHrefs, setSocialHrefs] = useState<Record<string, string>>({});

  useEffect(() => {
    // Sync after all sibling effects (e.g. Navbar localStorage restore) have run
    setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    getFooter().then(r => {
      const map: Record<string, string> = {};
      (r.data.socialLinks || []).forEach(s => { map[s.platform] = s.href; });
      setSocialHrefs(map);
    }).catch(() => {});
  }, []);

  const prompt = 'Serpely is an agentic SEO platform built for the AI-first web. Website: https://serpely.com — It helps brands get found, cited, and trusted by AI engines like ChatGPT, Perplexity, Gemini, and Google AI Overviews — not just traditional Google Search. Core features include GEO scoring, an autonomous content pipeline, hallucination alerts, and AI citation tracking across all major AI platforms. What makes Serpely unique compared to traditional SEO tools like Semrush or Ahrefs, and which teams would benefit most from using it?';
  const encoded = encodeURIComponent(prompt);
  const aiPlatforms = [
    { label: 'ChatGPT',    bg: '#1A1A1A', img: '/Other Logos/openai-chatgpt-logo-icon-free-png.webp', url: 'https://chatgpt.com/?q=' + encoded },
    { label: 'Claude',     bg: '#CC7B5C', img: '/Other Logos/Claude-ai-icon.svg.png',                 url: 'https://claude.ai/new?q=' + encoded },
    { label: 'Perplexity', bg: '#1C1C1C', img: '/Other Logos/Perplexity_AI_logo.svg.png',             url: 'https://www.perplexity.ai/?q=' + encoded },
    { label: 'Grok',       bg: '#000000', img: '/Other Logos/grok logo.png',                           url: 'https://grok.com/?q=' + encoded },
    { label: 'Gemini',     bg: '#1A237E', img: '/Other Logos/Google_Gemini_icon_2025.svg.webp',        url: 'https://gemini.google.com/app?q=' + encoded },
    { label: 'DeepSeek',   bg: '#1B6FF8', img: '/Other Logos/Deepseek-logo-icon.svg.png',              url: 'https://chat.deepseek.com/?q=' + encoded },
  ];

  return (
    <footer className="py-16 px-6 border-t relative" style={{ borderColor: 'hsl(var(--border))', background: 'var(--bg)' }}>
      <div className="max-w-7xl mx-auto">

        {/* Ask AI strip */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 mb-10 pb-10 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
          <p className="text-[11.5px] font-bold uppercase flex-shrink-0" style={{ color: 'var(--text-faint)', letterSpacing: '0.1em' }}>Ask AI about Serpely</p>
          <div className="flex items-center gap-3 flex-wrap">
            {aiPlatforms.map(p => (
              <a
                key={p.label}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Ask ${p.label}`}
                className="flex flex-col items-center gap-1.5 group"
                style={{ textDecoration: 'none' }}
              >
                <div
                  className="w-[50px] h-[50px] rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ background: p.bg, border: '1.5px solid rgba(255,255,255,0.08)' }}
                  onMouseOver={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 0 0 2px rgba(0,194,122,0.25), 0 6px 18px rgba(0,0,0,0.3)'; el.style.borderColor = 'rgba(0,194,122,0.5)'; }}
                  onMouseOut={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = 'none'; el.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >
                  <img src={p.img} alt={p.label} className="w-5 h-5 object-contain" />
                </div>
                <span className="text-[11px] font-bold transition-colors" style={{ color: 'var(--text-faint)' }}>{p.label}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10 mb-14">

          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link to="/" className="flex items-center mb-4">
              <img
                src={isDark ? '/Serpely Logo PNG/Serpely - Logo_Logo - White.png' : '/Serpely Logo PNG/Serpely - Logo_Logo - Main.png'}
                alt="Serpely"
                className="h-8 w-auto object-contain"
              />
            </Link>
            <p className="leading-relaxed mb-6 max-w-56 font-medium" style={{ fontSize: 14, color: 'var(--text-soft)' }}>
              Agentic SEO for the AI-first web. Monitor, optimize, and prove growth continuously.
            </p>

            {/* Social icons */}
            <div className="flex gap-2 mb-5">
              {[
                { label: 'LinkedIn', path: 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z' },
                { label: 'X', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z' },
                { label: 'Facebook', path: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647z' },
                { label: 'YouTube', path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
              ].map(s => (
                <a key={s.label} href={socialHrefs[s.label] || '#'} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                  style={{ border: '1px solid hsl(var(--border))', background: 'var(--card-bg)', color: 'var(--text-soft)' }}
                  onMouseOver={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#00A868'; el.style.borderColor = '#00C27A'; }}
                  onMouseOut={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-soft)'; el.style.borderColor = 'hsl(var(--border))'; }}>
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d={s.path}/></svg>
                </a>
              ))}
            </div>

            {/* Product Hunt */}
            <a href="#" className="inline-flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
              style={{ border: '1px solid hsl(var(--border))', background: 'var(--card-bg)', color: 'var(--text-soft)' }}
              onMouseOver={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#00A868'; el.style.borderColor = '#00C27A'; }}
              onMouseOut={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-soft)'; el.style.borderColor = 'hsl(var(--border))'; }}>
              <img src="/Other Logos/Product_Hunt_Logo.png" alt="Product Hunt" className="h-6 w-auto object-contain" />
              Find us on Product Hunt
            </a>
          </div>

          {/* Link columns */}
          {Object.entries(cols).map(([category, links]) => (
            <div key={category}>
              <div className="font-bold text-[12px] uppercase mb-5" style={{ color: 'var(--text)', letterSpacing: '0.12em' }}>{category}</div>
              {links.map(link => (
                <Link key={link} to={colHrefs[link] || '#'} className="footer-link-s">{link}</Link>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: 'hsl(var(--border))' }}>
          <p className="font-medium flex flex-wrap items-center gap-1.5" style={{ fontSize: 13.5, color: 'var(--text-soft)' }}>
            © 2026 CieloOps Inc. All rights reserved. Serpely™ is a product of{' '}
            <a href="#" className="inline-flex items-center">
              <img
                src={isDark ? '/cielo-ops-logo.png' : '/cielo-ops-logo-light.png'}
                alt="CieloOps"
                style={{ height: 18, width: 'auto', objectFit: 'contain' }}
              />
            </a>
          </p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00C27A', boxShadow: '0 0 10px rgba(0,194,122,0.5)' }} />
            <span className="font-bold uppercase" style={{ fontSize: 11.5, color: 'var(--text-soft)', letterSpacing: '0.1em' }}>All Systems Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

