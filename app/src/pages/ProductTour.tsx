import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useSEOMeta } from '@/hooks/useSEOMeta';

gsap.registerPlugin(ScrollTrigger);

const tourSteps = [
  {
    num: '01',
    title: 'Connect Your Website',
    description: 'Connect your website to Serpely in minutes. Our system automatically scans your site and begins collecting baseline data immediately.',
    features: ['One-click CMS integration', 'Automatic sitemap detection', 'No coding required'],
    iconPath: 'M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1',
    tag: 'Setup',
  },
  {
    num: '02',
    title: 'Monitor Your Rankings',
    description: 'Track keyword rankings across Google, Bing, and AI search engines. Real-time alerts for significant changes keep you ahead of every shift.',
    features: ['Daily rank updates', 'SERP feature tracking', 'Competitor monitoring'],
    iconPath: 'M23 6L13.5 15.5 8.5 10.5 1 18M17 6h6v6',
    tag: 'Tracking',
  },
  {
    num: '03',
    title: 'Audit Your Site',
    description: 'Our AI continuously audits your website for technical issues — Core Web Vitals, crawl errors, indexing gaps — with actionable fix recommendations.',
    features: ['Core Web Vitals monitoring', 'Crawl error detection', 'Mobile optimization checks'],
    iconPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    tag: 'Audit',
  },
  {
    num: '04',
    title: 'Optimize Your Content',
    description: 'AI-powered content optimizer identifies pages that need attention and delivers specific, prioritized recommendations for GEO and SEO gains.',
    features: ['GEO Score per page', 'Priority action queue', 'AI-powered suggestions'],
    iconPath: 'M13 2 4 14h6l-1 8 9-12h-6z',
    tag: 'Optimize',
  },
  {
    num: '05',
    title: 'Generate Reports',
    description: 'Create beautiful, white-label reports for clients or stakeholders in seconds. Schedule automated delivery and brand everything with your logo.',
    features: ['Customizable templates', 'Automated scheduling', 'White-label branding'],
    iconPath: 'M4 19h16M7 15V9M12 15V5M17 15v-3',
    tag: 'Reports',
  },
];

// Layer 3: animated number counter
function CountUp({ target, from = 0, decimals = 0, prefix = '', suffix = '' }: { target: number; from?: number; decimals?: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obj = { val: from };
    gsap.to(obj, {
      val: target,
      duration: 1.4,
      ease: 'power2.out',
      onUpdate: () => {
        if (ref.current) ref.current.textContent = prefix + obj.val.toFixed(decimals) + suffix;
      },
      scrollTrigger: { trigger: ref.current, start: 'top 82%', once: true },
    });
  }, [target, from, decimals, prefix, suffix]);
  return <span ref={ref}>{prefix}{from.toFixed(decimals)}{suffix}</span>;
}

function StepVisual({ step, idx }: { step: typeof tourSteps[0]; idx: number }) {
  const isConnect = idx === 0;
  const isRank    = idx === 1;
  const isAudit   = idx === 2;
  const isContent = idx === 3;
  const isReport  = idx === 4;

  // Layer 1: cycling row highlight
  const [activeRow, setActiveRow] = useState(0);
  const rowCount = isAudit ? 4 : isReport ? 3 : 5;
  useEffect(() => {
    const t = setInterval(() => setActiveRow(r => (r + 1) % rowCount), 2000);
    return () => clearInterval(t);
  }, [rowCount]);

  // Progress bar animation (content step)
  const [barAnimated, setBarAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBarAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  const rowStyle = (i: number) => ({
    background: activeRow === i ? 'rgba(0,194,122,0.09)' : 'var(--bg-subtle)',
    border: `1px solid ${activeRow === i ? 'rgba(0,194,122,0.35)' : 'hsl(var(--border))'}`,
    transition: 'background 0.45s ease, border-color 0.45s ease',
  });

  return (
    <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid hsl(var(--border))', background: 'var(--card-bg)', boxShadow: '0 8px 40px rgba(0,0,0,0.07)' }}>
      {/* Mock top bar */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#00C27A' }} />
        <span className="ml-3 text-[11px] font-bold" style={{ color: 'var(--text-faint)' }}>app.serpely.io / {step.tag.toLowerCase()}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00C27A' }} />
          <span className="text-[10px] font-bold" style={{ color: '#00C27A' }}>LIVE</span>
        </div>
      </div>

      <div className="p-5">

        {/* Step 1 — Connect */}
        {isConnect && (
          <div className="flex flex-col gap-3">
            <div className="text-[11px] font-black uppercase mb-1" style={{ color: 'var(--text-faint)', letterSpacing: '0.1em' }}>Connected Integrations</div>
            {[
              { name: 'Google Search Console', status: 'Connected', ok: true },
              { name: 'Google Analytics 4',    status: 'Connected', ok: true },
              { name: 'Cloudflare',            status: 'Connected', ok: true },
              { name: 'WordPress',             status: 'Pending…',  ok: false },
            ].map((r, i) => (
              <div key={i} className="vis-row flex items-center justify-between px-3 py-2.5 rounded-xl" style={rowStyle(i)}>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black" style={{ background: 'rgba(0,194,122,0.1)', color: '#00A868' }}>{r.name[0]}</div>
                  <span className="font-medium text-[13px]" style={{ color: 'var(--text-soft)' }}>{r.name}</span>
                </div>
                <span className="text-[11px] font-black" style={{ color: r.ok ? '#00A868' : '#d97706' }}>{r.status}</span>
              </div>
            ))}
            <div className="vis-row mt-1 rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(0,194,122,0.07)', border: '1px solid rgba(0,194,122,0.2)', transition: 'none' }}>
              <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" stroke="#00A868" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
              <span className="text-[12px] font-bold" style={{ color: '#00A868' }}>3 sources connected · Scan in progress</span>
            </div>
          </div>
        )}

        {/* Step 2 — Rankings */}
        {isRank && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-black uppercase" style={{ color: 'var(--text-faint)', letterSpacing: '0.1em' }}>Keyword Rankings</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,194,122,0.12)', color: '#00A868' }}>Updated 2m ago</span>
            </div>
            {[
              { kw: 'best crm software',    pos: '#1',  delta: '+3', up: true  },
              { kw: 'crm for small teams',  pos: '#4',  delta: '+1', up: true  },
              { kw: 'what is crm',          pos: '#7',  delta: '-2', up: false },
              { kw: 'crm pricing 2024',     pos: '#11', delta: '+5', up: true  },
              { kw: 'crm vs spreadsheet',   pos: '#14', delta: '±0', up: null  },
            ].map((r, i) => (
              <div key={i} className="vis-row flex items-center gap-3 px-3 py-2.5 rounded-xl" style={rowStyle(i)}>
                <span className="font-mono text-[12px] font-semibold flex-1 truncate" style={{ color: 'var(--text-soft)' }}>{r.kw}</span>
                <span className="font-black text-[13px]" style={{ color: 'var(--text)' }}>{r.pos}</span>
                <span className="font-bold text-[11px] px-1.5 py-0.5 rounded-md" style={{
                  background: r.up === true ? 'rgba(0,194,122,0.12)' : r.up === false ? 'rgba(239,68,68,0.1)' : 'var(--tag-bg)',
                  color: r.up === true ? '#00A868' : r.up === false ? '#ef4444' : 'var(--text-faint)',
                }}>{r.delta}</span>
              </div>
            ))}
          </div>
        )}

        {/* Step 3 — Audit */}
        {isAudit && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2.5 mb-1">
              <div className="vis-row rounded-xl p-3 text-center" style={{ background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))', transition: 'none' }}>
                <div className="font-black" style={{ fontSize: 28, letterSpacing: '-0.04em', color: '#00A868' }}>
                  <CountUp target={94} />
                </div>
                <div className="text-[10px] font-black uppercase" style={{ color: 'var(--text-faint)', letterSpacing: '0.1em' }}>Health Score</div>
                <div className="text-[11px] font-bold mt-0.5" style={{ color: '#00A868' }}>Excellent</div>
              </div>
              <div className="vis-row rounded-xl p-3 text-center" style={{ background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))', transition: 'none' }}>
                <div className="font-black" style={{ fontSize: 28, letterSpacing: '-0.04em', color: '#d97706' }}>
                  <CountUp target={3} />
                </div>
                <div className="text-[10px] font-black uppercase" style={{ color: 'var(--text-faint)', letterSpacing: '0.1em' }}>Issues Found</div>
                <div className="text-[11px] font-bold mt-0.5" style={{ color: '#d97706' }}>Minor</div>
              </div>
            </div>
            {[
              { label: 'Core Web Vitals',           score: 'Pass', ok: true  },
              { label: 'Missing meta descriptions', score: '2 pages', ok: false },
              { label: 'Crawl errors',              score: '1 URL',   ok: false },
              { label: 'Mobile usability',          score: 'Pass', ok: true  },
            ].map((r, i) => (
              <div key={i} className="vis-row flex items-center justify-between px-3 py-2.5 rounded-xl" style={rowStyle(i)}>
                <span className="font-medium text-[13px]" style={{ color: 'var(--text-soft)' }}>{r.label}</span>
                <span className="text-[11px] font-black px-2 py-0.5 rounded-lg" style={{ background: r.ok ? 'rgba(0,194,122,0.12)' : 'rgba(245,158,11,0.12)', color: r.ok ? '#00A868' : '#d97706' }}>{r.score}</span>
              </div>
            ))}
          </div>
        )}

        {/* Step 4 — Content */}
        {isContent && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-black uppercase" style={{ color: 'var(--text-faint)', letterSpacing: '0.1em' }}>Content Priority Queue</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,194,122,0.12)', color: '#00A868' }}>4 actions</span>
            </div>
            {[
              { page: '/best-crm-software', geo: 42, action: 'Add FAQ schema',      priority: 'High' },
              { page: '/crm-for-teams',     geo: 61, action: 'Expand intro',         priority: 'High' },
              { page: '/what-is-crm',       geo: 73, action: 'Add author bio',       priority: 'Med'  },
              { page: '/crm-pricing',       geo: 78, action: 'Update pricing table', priority: 'Low'  },
              { page: '/crm-integrations',  geo: 82, action: 'Add schema markup',    priority: 'Low'  },
            ].map((r, i) => (
              <div key={i} className="vis-row px-3 py-2.5 rounded-xl" style={rowStyle(i)}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[11.5px] font-semibold truncate" style={{ color: '#00A868' }}>{r.page}</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: r.priority === 'High' ? 'rgba(239,68,68,0.1)' : r.priority === 'Med' ? 'rgba(245,158,11,0.1)' : 'var(--tag-bg)', color: r.priority === 'High' ? '#ef4444' : r.priority === 'Med' ? '#d97706' : 'var(--text-faint)' }}>{r.priority}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: 'hsl(var(--border))' }}>
                    <div className="h-full rounded-full" style={{ width: barAnimated ? `${r.geo}%` : '0%', background: r.geo < 60 ? '#ef4444' : r.geo < 75 ? '#d97706' : '#00C27A', transition: 'width 2s cubic-bezier(0.4,0,0.2,1)' }} />
                  </div>
                  <span className="text-[10px] font-black" style={{ color: 'var(--text-faint)' }}>GEO <CountUp target={r.geo} from={20} /></span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 5 — Reports */}
        {isReport && (
          <div className="flex flex-col gap-3">
            <div className="vis-row rounded-xl p-4" style={{ background: 'linear-gradient(135deg,rgba(0,194,122,0.08),rgba(0,168,104,0.04))', border: '1px solid rgba(0,194,122,0.2)', transition: 'none' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase" style={{ color: '#00A868', letterSpacing: '0.12em' }}>Monthly SEO Report</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,194,122,0.15)', color: '#00A868' }}>May 2025</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="font-black" style={{ fontSize: 17, letterSpacing: '-0.04em', color: 'var(--text)' }}>
                    <CountUp target={18432} suffix="" />
                  </div>
                  <div className="text-[9px] font-bold uppercase" style={{ color: 'var(--text-faint)', letterSpacing: '0.08em' }}>Organic Clicks</div>
                  <div className="text-[10px] font-black" style={{ color: '#00A868' }}>+12%</div>
                </div>
                <div className="text-center">
                  <div className="font-black" style={{ fontSize: 17, letterSpacing: '-0.04em', color: 'var(--text)' }}>
                    <CountUp target={6.4} decimals={1} />
                  </div>
                  <div className="text-[9px] font-bold uppercase" style={{ color: 'var(--text-faint)', letterSpacing: '0.08em' }}>Avg Position</div>
                  <div className="text-[10px] font-black" style={{ color: '#00A868' }}>↑2</div>
                </div>
                <div className="text-center">
                  <div className="font-black" style={{ fontSize: 17, letterSpacing: '-0.04em', color: 'var(--text)' }}>
                    <CountUp target={78} />
                  </div>
                  <div className="text-[9px] font-bold uppercase" style={{ color: 'var(--text-faint)', letterSpacing: '0.08em' }}>GEO Score</div>
                  <div className="text-[10px] font-black" style={{ color: '#00A868' }}>+4</div>
                </div>
              </div>
            </div>
            {[
              { label: 'PDF Report',       sub: 'White-label ready',  icon: '📄' },
              { label: 'Client Dashboard', sub: 'Shared link active', icon: '🔗' },
              { label: 'Email Digest',     sub: 'Sent every Monday',  icon: '✉️' },
            ].map((r, i) => (
              <div key={i} className="vis-row flex items-center gap-3 px-3 py-2.5 rounded-xl" style={rowStyle(i)}>
                <span className="text-base">{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[13px]" style={{ color: 'var(--text)' }}>{r.label}</div>
                  <div className="text-[11px] font-medium" style={{ color: 'var(--text-faint)' }}>{r.sub}</div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,194,122,0.12)', color: '#00A868' }}>Ready</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export function ProductTour() {
  useSEOMeta('product-tour', { title: 'Product Tour — Serpely', description: 'Take a tour of Serpely\'s AI SEO dashboard, rank tracking, and GEO monitoring features.' });
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.pt-hero', { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out', delay: 0.1 });

      gsap.fromTo('.pt-steps-nav span', { opacity: 0, y: 10 }, {
        opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out',
        scrollTrigger: { trigger: '.pt-steps-nav', start: 'top 82%', toggleActions: 'play none none reverse' },
      });

      document.querySelectorAll('.pt-step-row').forEach((row) => {
        const isOdd = row.classList.contains('pt-odd');
        gsap.fromTo(row.querySelector('.pt-step-text'), { opacity: 0, x: isOdd ? 32 : -32 }, {
          opacity: 1, x: 0, duration: 0.6, ease: 'power3.out',
          scrollTrigger: { trigger: row, start: 'top 76%', toggleActions: 'play none none reverse' },
        });
        gsap.fromTo(row.querySelector('.pt-step-visual'), { opacity: 0, x: isOdd ? -32 : 32 }, {
          opacity: 1, x: 0, duration: 0.6, ease: 'power3.out',
          scrollTrigger: { trigger: row, start: 'top 76%', toggleActions: 'play none none reverse' },
        });
      });

      // Layer 2: stagger vis-row entrance per visual
      document.querySelectorAll('.pt-step-visual').forEach((visual) => {
        gsap.fromTo(
          visual.querySelectorAll('.vis-row'),
          { opacity: 0, x: -14 },
          {
            opacity: 1, x: 0, duration: 0.35, stagger: 0.07, ease: 'power2.out',
            scrollTrigger: { trigger: visual, start: 'top 78%', toggleActions: 'play none none reverse' },
          }
        );
      });

      gsap.fromTo('.pt-cta', { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.55, ease: 'power3.out',
        scrollTrigger: { trigger: '.pt-cta', start: 'top 84%', toggleActions: 'play none none reverse' },
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageRef} style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,194,122,0.09) 0%, transparent 70%)' }} />
        <div className="pt-hero max-w-3xl mx-auto relative z-10">
          <span className="pill-s mb-5 inline-flex">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#00C27A' }} />
            Product Tour
          </span>
          <h1 className="font-black mb-5" style={{ fontSize: 'clamp(26px,5vw,62px)', fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.045em' }}>
            See Serpely in{' '}
            <span className="text-gradient">action</span>
          </h1>
          <p className="font-medium mb-8 max-w-xl mx-auto" style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--text-soft)' }}>
            A guided tour through Serpely's powerful features — from first connection to automated reporting.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/pricing" className="btn-accent-s">
              Start Free Trial
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 ml-1" fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
            </Link>
            <Link to="/features" className="btn-secondary-s">Explore Features</Link>
          </div>
        </div>
      </section>

      {/* ── Step nav strip ── */}
      <section className="pb-4 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="pt-steps-nav flex flex-wrap justify-center gap-2">
            {tourSteps.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-bold"
                style={{ background: 'var(--card-bg)', border: '1px solid hsl(var(--border))', color: 'var(--text-soft)' }}
              >
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black" style={{ background: '#00C27A', color: '#0A0A0A' }}>{i + 1}</span>
                {s.title}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tour Steps ── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-24">
          {tourSteps.map((step, i) => {
            const isOdd = i % 2 === 1;
            return (
              <div key={i} className={`pt-step-row${isOdd ? ' pt-odd' : ''} grid lg:grid-cols-2 gap-12 items-center`}>

                {/* Text */}
                <div className={`pt-step-text ${isOdd ? 'lg:order-2' : ''}`}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,rgba(0,194,122,0.14),rgba(0,194,122,0.04))', border: '1px solid rgba(0,194,122,0.25)' }}>
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#00C27A" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
                        <path d={step.iconPath} />
                      </svg>
                    </div>
                    <span className="font-black text-[11px] uppercase px-3 py-1 rounded-full" style={{ background: 'rgba(0,194,122,0.1)', color: '#00A868', letterSpacing: '0.1em', border: '1px solid rgba(0,194,122,0.2)' }}>
                      Step {step.num}
                    </span>
                  </div>
                  <h2 className="font-black mb-4" style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.035em', color: 'var(--text)' }}>
                    {step.title}
                  </h2>
                  <p className="font-medium leading-relaxed mb-6" style={{ fontSize: 15, color: 'var(--text-soft)', lineHeight: 1.65 }}>
                    {step.description}
                  </p>
                  <ul className="flex flex-col gap-2.5">
                    {step.features.map((f, fi) => (
                      <li key={fi} className="flex items-center gap-3">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,194,122,0.12)', border: '1px solid rgba(0,194,122,0.25)' }}>
                          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="#00C27A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 6l3 3 5-5"/>
                          </svg>
                        </span>
                        <span className="font-medium" style={{ fontSize: 14, color: 'var(--text-soft)' }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Visual */}
                <div
                  className={`pt-step-visual ${isOdd ? 'lg:order-1' : ''}`}
                  style={{ transition: 'transform 0.3s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <StepVisual step={step} idx={i} />
                </div>

              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="pt-cta cta-dark-s rounded-[24px] p-10 lg:p-14 text-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(0,194,122,0.12) 0%, transparent 70%)' }} />
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase mb-5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,194,122,0.15)', border: '1px solid rgba(0,194,122,0.3)', color: '#00C27A', letterSpacing: '0.1em' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00C27A' }} />
                Ready to Start?
              </span>
              <h2 className="font-black mb-4" style={{ fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', color: '#fff' }}>
                Ready to experience Serpely?
              </h2>
              <p className="mb-8 mx-auto max-w-lg font-medium" style={{ fontSize: 15, lineHeight: 1.65, color: 'rgba(255,255,255,0.6)' }}>
                Start your free trial today and see the difference Agentic SEO can make for your business.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/pricing" className="btn-accent-s">
                  Start Free Trial
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 ml-1" fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                </Link>
                <Link to="/compare" className="btn-secondary-s" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}>
                  Compare Plans
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
