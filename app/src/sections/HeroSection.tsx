import { useState, useEffect, useRef } from 'react';
import { getSection } from '@/lib/api';
import { gsap } from 'gsap';

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [heroImage, setHeroImage] = useState('');
  const [badge, setBadge] = useState('Is your site invisible to AI search?');
  const [headline, setHeadline] = useState(['Agentic SEO.', 'Built for the', 'AI-first web.']);
  const [subheadline, setSubheadline] = useState("A daily AI audit that tracks whether you're cited across ChatGPT, Perplexity, and Google AI Overviews, and tells you exactly what to fix next.");
  const [cta1Text, setCta1Text] = useState('Start Free Trial');
  const [cta1Href, setCta1Href] = useState('#');
  const [cta1Sub, setCta1Sub] = useState('No credit card');
  const [cta2Text, setCta2Text] = useState('Book a Demo');
  const [cta2Href, setCta2Href] = useState('#');
  const [cta2Sub, setCta2Sub] = useState('See live insights');
  const [announcementText, setAnnouncementText] = useState('Now in Public Beta — Join The Early Access Team.');
  const [alert1Title, setAlert1Title] = useState('GEO Score Up');
  const [alert1Sub, setAlert1Sub] = useState('/best-crm 74 → 78');
  const [alert2Title, setAlert2Title] = useState('AI Citation Drop');
  const [alert2Sub, setAlert2Sub] = useState('ChatGPT mentions ↓ 14%');

  useEffect(() => {
    getSection('hero')
      .then(r => {
        const d = r.data?.data as Record<string, unknown>;
        if (!d) return;
        setHeroImage((d.heroImage as string) || '');
        if (d.badge) setBadge(d.badge as string);
        if (Array.isArray(d.headline) && d.headline.length) setHeadline(d.headline as string[]);
        if (d.subheadline) setSubheadline(d.subheadline as string);
        if (d.cta1Text) setCta1Text(d.cta1Text as string);
        if (d.cta1Href) setCta1Href(d.cta1Href as string);
        if (d.cta1Sub) setCta1Sub(d.cta1Sub as string);
        if (d.cta2Text) setCta2Text(d.cta2Text as string);
        if (d.cta2Href) setCta2Href(d.cta2Href as string);
        if (d.cta2Sub) setCta2Sub(d.cta2Sub as string);
        if (d.announcementText) setAnnouncementText(d.announcementText as string);
        if (d.alert1Title) setAlert1Title(d.alert1Title as string);
        if (d.alert1Sub) setAlert1Sub(d.alert1Sub as string);
        if (d.alert2Title) setAlert2Title(d.alert2Title as string);
        if (d.alert2Sub) setAlert2Sub(d.alert2Sub as string);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.hero-left', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: 0.1 });
      gsap.fromTo('.hero-right', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: 0.25 });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="pt-28 pb-12 px-6 relative">
      {/* Accent crosshairs */}
      <div className="absolute" style={{ top: 120, left: 24, width: 16, height: 16, pointerEvents: 'none' }}>
        <div className="absolute" style={{ top: '50%', left: 0, right: 0, height: 1, background: '#00C27A', transform: 'translateY(-50%)' }} />
        <div className="absolute" style={{ left: '50%', top: 0, bottom: 0, width: 1, background: '#00C27A', transform: 'translateX(-50%)' }} />
      </div>
      <div className="absolute" style={{ top: 120, right: 24, width: 16, height: 16, pointerEvents: 'none' }}>
        <div className="absolute" style={{ top: '50%', left: 0, right: 0, height: 1, background: '#00C27A', transform: 'translateY(-50%)' }} />
        <div className="absolute" style={{ left: '50%', top: 0, bottom: 0, width: 1, background: '#00C27A', transform: 'translateX(-50%)' }} />
      </div>

      <div className="max-w-7xl mx-auto relative">
        <div className="grid lg:grid-cols-12 gap-10 items-center">

          {/* LEFT — 7 cols */}
          <div className="hero-left lg:col-span-7">
            {/* Italic preheader */}
            <p className="inline-flex items-center gap-3 mb-5 italic font-medium text-lg"
              style={{
                color: 'var(--text)',
                letterSpacing: '-0.018em',
                padding: '10px 18px 10px 12px',
                borderRadius: 16,
                background: 'var(--card-bg)',
                border: '1px solid hsl(var(--border))',
                boxShadow: '0 16px 40px rgba(10,10,10,0.055)',
              }}>
              <span className="w-10 h-10 rounded-xl inline-flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(180deg, rgba(0,194,122,0.10), rgba(0,194,122,0.04))', border: '1px solid rgba(0,194,122,0.24)' }}>
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9.5" cy="9.5" r="4.6" stroke="currentColor" strokeWidth="1.9"/>
                  <path d="M12.9 12.9 17.5 17.5" stroke="currentColor" strokeWidth="2.1"/>
                  <path d="M6.9 8.5h5.2M6.9 10.7h3.7" stroke="#00A868" strokeWidth="1.7"/>
                  <path d="M17.3 5.2v3.5M15.5 7h3.6" stroke="#00A868" strokeWidth="1.8"/>
                </svg>
              </span>
              {badge}
            </p>

            {/* Headline */}
            <h1 className="font-black text-5xl lg:text-6xl mb-6" style={{ fontWeight: 900, lineHeight: 1.03, letterSpacing: '-0.05em', color: 'var(--text)', paddingBottom: 8 }}>
              <span className="text-gradient" style={{ display: 'inline-block', paddingBottom: 4 }}>{headline[0]}</span><br/>
              {headline[1]}<br/>
              <span className="text-gradient" style={{ display: 'inline-block', paddingBottom: 6 }}>{headline[2]}</span>
            </h1>

            <p className="mb-7 max-w-xl font-medium" style={{ fontSize: '16.5px', lineHeight: 1.55, color: 'var(--text-soft)' }}>
              {subheadline}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mb-5">
              <a href={cta1Href} className="btn-accent-s">
                {cta1Text}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                <span className="font-medium text-xs ml-1" style={{ color: 'rgba(10,10,10,0.55)' }}>{cta1Sub}</span>
              </a>
              <a href={cta2Href} className="btn-secondary-s">
                {cta2Text}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                <span className="font-medium text-xs" style={{ color: 'var(--text-faint)' }}>{cta2Sub}</span>
              </a>
            </div>

            {/* Announcement chip */}
            <div className="mb-7">
              <a href="#" className="announcement-chip-s">
                <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse flex-shrink-0" />
                {announcementText}
              </a>
            </div>

            {/* Trust strip */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-faint)', letterSpacing: '0.18em' }}>Trusted on</span>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid hsl(var(--border))' }}>
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg">
                  <img src="Other Logos/5-Star-TrustPilot.webp" alt="Trustpilot" className="h-4 w-auto object-contain" />
                  <span className="text-xs font-black" style={{ color: 'var(--text)' }}>4.8</span>
                </div>
                <div className="w-px h-4 flex-shrink-0" style={{ background: 'hsl(var(--border))' }} />
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg">
                  <img src="Other Logos/g2-seeklogo.png" alt="G2" className="h-4 w-auto object-contain" />
                  <span className="text-xs font-black" style={{ color: 'var(--text)' }}>4.9</span>
                </div>
                <div className="w-px h-4 flex-shrink-0" style={{ background: 'hsl(var(--border))' }} />
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg">
                  <img src="Other Logos/capterra-seeklogo.png" alt="Capterra" className="h-4 w-auto object-contain" />
                  <span className="text-xs font-black" style={{ color: 'var(--text)' }}>4.7</span>
                </div>
              </div>
            </div>

            {/* Feature tags */}
            <div className="flex gap-2 mt-6">
              {['Monitor', 'Optimize', 'Report'].map(tag => (
                <a key={tag} href="#features" className="tag-s flex items-center gap-1.5 hover:border-green transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#00C27A' }} />
                  {tag}
                </a>
              ))}
            </div>
          </div>

          {/* RIGHT — Dashboard mock 5 cols */}
          <div className="hero-right lg:col-span-5 relative">
            <div className="relative">
              {heroImage ? (
                <div className="dash-mock-s overflow-hidden" style={{ borderRadius: 18 }}>
                  <img src={heroImage} alt="Hero" style={{ width: '100%', maxHeight: 540, objectFit: 'cover', display: 'block' }} />
                </div>
              ) : (
              <div className="dash-mock-s relative">
                {/* Top bar */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'hsl(var(--border))', background: 'var(--bg-subtle)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#00C27A' }} />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="rounded-md px-3 py-1 text-[11px] flex items-center gap-2 max-w-52 mx-auto" style={{ background: 'var(--card-bg)', border: '1px solid hsl(var(--border))', color: 'var(--text-faint)' }}>
                      <svg width="9" height="9" viewBox="0 0 16 16" fill="#00C27A"><circle cx="8" cy="8" r="3"/></svg>
                      app.serpely.io/dashboard
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--text)', color: 'var(--bg)' }}>J</div>
                </div>

                <div className="flex" style={{ minHeight: 500 }}>
                  {/* Sidebar */}
                  <div className="w-12 border-r flex flex-col items-center py-4 gap-3 flex-shrink-0" style={{ borderColor: 'hsl(var(--border))', background: 'var(--bg-subtle)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'var(--text)', color: '#00FF88' }}>⬡</div>
                    {['◎', '▦'].map((icon, i) => (
                      <div key={i} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ color: 'var(--text-faint)' }}>{icon}</div>
                    ))}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm relative" style={{ color: 'var(--text-faint)' }}>
                      ⚡
                      <span className="absolute -top-0.5 -right-1 text-[8px] font-extrabold rounded-full leading-none" style={{ background: '#00C27A', color: '#0A0A0A', padding: '1px 3px' }}>11</span>
                    </div>
                    {['⊕', '◈', '◐'].map((icon, i) => (
                      <div key={i} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ color: 'var(--text-faint)' }}>{icon}</div>
                    ))}
                    <div className="mt-auto w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'hsl(var(--border))', color: 'var(--text-soft)' }}>J</div>
                  </div>

                  {/* Main */}
                  <div className="flex-1 overflow-hidden p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-[13px]" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>Command Center</div>
                        <div className="text-[10.5px] font-medium" style={{ color: 'var(--text-faint)' }}>example.com · 2m ago</div>
                      </div>
                      <div className="pill-s" style={{ padding: '3px 8px', fontSize: '9.5px' }}>
                        <span className="w-1 h-1 rounded-full animate-pulse-dot" style={{ background: '#00C27A' }} />
                        LIVE
                      </div>
                    </div>

                    {/* Growth + GEO */}
                    <div className="rounded-xl p-3.5" style={{ background: 'linear-gradient(135deg,rgba(0,194,122,0.08),rgba(0,168,104,0.04))', border: '1px solid hsl(var(--border))' }}>
                      <div className="flex gap-3 items-center">
                        <div className="flex-1 min-w-0">
                          <div className="text-[8.5px] font-bold uppercase mb-1" style={{ color: '#00A868', letterSpacing: '0.2em' }}>This Month's Growth</div>
                          <div className="font-black leading-none mb-1" style={{ color: 'var(--text)', fontSize: 32, letterSpacing: '-0.05em' }}>18,432</div>
                          <div className="text-[10px] font-medium mb-2" style={{ color: 'var(--text-soft)' }}>organic clicks</div>
                          <div className="flex gap-2">
                            <div className="text-[11px] font-extrabold" style={{ color: '#00A868' }}>↑ 12% MoM</div>
                            <div className="text-[11px] font-extrabold" style={{ color: '#00A868' }}>↑ 38% YoY</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="text-[8.5px] font-bold uppercase mb-1.5" style={{ color: '#00A868', letterSpacing: '0.18em' }}>GEO Score</div>
                          <div className="geo-gauge">
                            <div className="relative z-10 text-center">
                              <div className="font-black leading-none" style={{ fontSize: 30, color: 'var(--text)', letterSpacing: '-0.04em' }}>78</div>
                              <div className="text-[9.5px] font-bold mt-0.5" style={{ color: 'var(--text-faint)', letterSpacing: '0.1em' }}>/ 100</div>
                            </div>
                          </div>
                          <div className="text-[9px] font-bold mt-1.5" style={{ color: '#00A868' }}>+4 this week</div>
                        </div>
                      </div>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: 'Impressions', val: '214K', delta: '↑ 12%' },
                        { label: 'Avg CTR', val: '8.6%', delta: '↑ 0.4' },
                        { label: 'Avg Pos', val: '6.4', delta: '↑ 2' },
                        { label: 'AI Actions', val: '6', delta: 'Today' },
                      ].map(kpi => (
                        <div key={kpi.label} className="dash-card-s" style={{ padding: 10 }}>
                          <div className="text-[8.5px] font-bold uppercase mb-1" style={{ color: 'var(--text-faint)', letterSpacing: '0.1em' }}>{kpi.label}</div>
                          <div className="font-extrabold leading-none" style={{ fontSize: 18, color: 'var(--text)', letterSpacing: '-0.04em' }}>{kpi.val}</div>
                          <div className="text-[9px] font-bold mt-1" style={{ color: '#00A868' }}>{kpi.delta}</div>
                        </div>
                      ))}
                    </div>

                    {/* Top Pages */}
                    <div className="dash-card-s" style={{ padding: '11px 12px' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10.5px] font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.012em' }}>Top Pages at a Glance</span>
                        <span className="text-[9px] font-bold uppercase" style={{ color: '#00A868', letterSpacing: '0.1em' }}>Full Report →</span>
                      </div>
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr style={{ color: 'var(--text-faint)' }}>
                            {['Page', 'Clicks', 'CTR', 'MoM'].map((h, i) => (
                              <th key={h} className={`pb-1.5 font-bold text-[8.5px] uppercase ${i === 0 ? 'text-left' : i === 3 ? 'text-right' : 'text-center'}`} style={{ letterSpacing: '0.08em' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { page: '/best-crm-software', clicks: '4,821', ctr: '12.6%', mom: '↑ 18%', momColor: '#00A868' },
                            { page: '/crm-for-small-business', clicks: '2,103', ctr: '7.2%', mom: '↑ 4%', momColor: '#00A868' },
                            { page: '/what-is-crm', clicks: '987', ctr: '6.8%', mom: '↓ 8%', momColor: '#ef4444' },
                          ].map(row => (
                            <tr key={row.page} className="border-t" style={{ borderColor: 'var(--border-soft)' }}>
                              <td className="py-1.5 font-mono text-[9.5px] font-semibold truncate max-w-[100px]" style={{ color: '#00A868' }}>{row.page}</td>
                              <td className="text-center font-extrabold" style={{ color: 'var(--text)' }}>{row.clicks}</td>
                              <td className="text-center font-bold" style={{ color: '#00A868' }}>{row.ctr}</td>
                              <td className="text-right font-extrabold" style={{ color: row.momColor }}>{row.mom}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* Floating alerts */}
              <style>{`
                @keyframes floatCard {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(-8px); }
                }
              `}</style>

              <div className="hidden md:block absolute -right-4 top-20 card-s px-3 py-2.5 text-xs max-w-44"
                style={{ boxShadow: '0 12px 32px rgba(10,10,10,0.10)', animation: 'floatCard 3s ease-in-out infinite' }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center font-extrabold text-[11px]" style={{ background: '#E6FBF4', color: '#00A868', border: '1px solid rgba(0,194,122,0.3)' }}>↑</div>
                  <span className="font-bold text-[12px]" style={{ color: 'var(--text)' }}>{alert1Title}</span>
                </div>
                <div className="text-[11px] font-medium" style={{ color: 'var(--text-soft)' }}>{alert1Sub}</div>
              </div>

              <div className="hidden md:block absolute -left-4 bottom-24 card-s px-3 py-2.5 text-xs max-w-48"
                style={{ boxShadow: '0 12px 32px rgba(10,10,10,0.10)', animation: 'floatCard 3s ease-in-out infinite', animationDelay: '1.5s' }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 font-extrabold text-[11px]">!</div>
                  <span className="font-bold text-[12px]" style={{ color: 'var(--text)' }}>{alert2Title}</span>
                </div>
                <div className="text-[11px] font-medium" style={{ color: 'var(--text-soft)' }}>{alert2Sub}</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
