import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getSection } from '@/lib/api';
import { useSEOMeta } from '@/hooks/useSEOMeta';
import { injectSchema, removeSchema } from '@/lib/schema';

gsap.registerPlugin(ScrollTrigger);

interface MainFeat { title: string; description: string; items: string[]; tag: string; }
interface AddFeat  { title: string; description: string; }
type FeatureVisualRow = Record<string, string | boolean>;

/* ── Hardcoded visual/icon data (not editable) ── */
const mainIconPaths = [
  'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  'M23 6L13.5 15.5 8.5 10.5 1 18M17 6h6v6',
  'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
];

const mainVisuals = [
  [
    { label: 'best crm software',   vol: '40.5K', diff: '62', trend: '↑' },
    { label: 'crm for small business', vol: '18.2K', diff: '44', trend: '↑' },
    { label: 'what is crm',         vol: '12.1K', diff: '31', trend: '→' },
    { label: 'crm pricing 2024',    vol: '6.8K',  diff: '28', trend: '↑' },
  ],
  [
    { label: '/best-crm-software', pos: '#1',  delta: '+3', up: true },
    { label: '/crm-for-teams',     pos: '#4',  delta: '+1', up: true },
    { label: '/what-is-crm',       pos: '#7',  delta: '-2', up: false },
    { label: '/crm-pricing',       pos: '#11', delta: '+5', up: true },
  ],
  [
    { label: 'Core Web Vitals',  score: '94',  status: 'good' },
    { label: 'Crawl Errors',     score: '2',   status: 'warn' },
    { label: 'Index Coverage',   score: '98%', status: 'good' },
    { label: 'Mobile Score',     score: '88',  status: 'good' },
  ],
  [
    { label: 'techcrunch.com', da: 'DA 94', type: 'New' },
    { label: 'forbes.com',     da: 'DA 91', type: 'New' },
    { label: 'medium.com',     da: 'DA 88', type: 'Lost' },
    { label: 'hubspot.com',    da: 'DA 86', type: 'New' },
  ],
];

const addIconPaths = [
  'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  'M13 2 4 14h6l-1 8 9-12h-6z',
  'M18 20V10M12 20V4M6 20v-6',
  'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 0c-2.22 3.61-3 6.5-3 10s.78 6.39 3 10m0-20c2.22 3.61 3 6.5 3 10s-.78 6.39-3 10M2 12h20',
  'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
];

/* ── Default editable content ── */
const DEFAULT_MAIN_FEATS: MainFeat[] = [
  {
    title: 'Keyword Research & Gap Finder',
    description: 'Discover untapped keyword opportunities with AI-powered research. Analyze search intent, competition levels, and traffic potential to build a winning content strategy.',
    items: ['Competitor keyword analysis', 'Search intent classification', 'Topic cluster builder', 'Keyword difficulty scoring'],
    tag: 'Research',
  },
  {
    title: 'Daily Rank Tracking',
    description: 'Monitor keyword rankings across Google, Bing, and AI search engines. Get real-time alerts for ranking changes and track your progress over time.',
    items: ['Multi-engine tracking', 'SERP feature monitoring', 'Competitor comparison', 'Historical ranking data'],
    tag: 'Tracking',
  },
  {
    title: 'Technical Site Audit',
    description: "Continuously monitor your website's technical health. Identify and fix issues that hurt search performance before they impact rankings.",
    items: ['Core Web Vitals monitoring', 'Crawl error detection', 'Indexability checks', 'Mobile optimization'],
    tag: 'Audit',
  },
  {
    title: 'Backlink Monitoring',
    description: 'Track your backlink profile in real-time. Monitor new and lost links, analyze link quality, and discover link-building opportunities.',
    items: ['New/lost link alerts', 'Domain authority tracking', 'Anchor text analysis', 'Toxic link detection'],
    tag: 'Backlinks',
  },
];

const DEFAULT_ADD_FEATS: AddFeat[] = [
  { title: 'Content Prioritization',  description: 'AI-driven scoring to identify which pages need attention first.' },
  { title: 'White-Label Reports',     description: 'Generate professional, branded reports for your clients instantly.' },
  { title: 'AI Content Optimization', description: 'Get AI-powered suggestions to improve your content quality.' },
  { title: 'Security Monitoring',     description: 'Monitor for security issues that could affect your SEO ranking.' },
  { title: 'Automated Workflows',     description: 'Set up automated SEO tasks and scheduled reporting flows.' },
  { title: 'Advanced Analytics',      description: 'Deep dive into your SEO performance with rich metric dashboards.' },
  { title: 'Multi-Language Support',  description: 'Track rankings in multiple languages and target regions globally.' },
  { title: 'Smart Alerts',            description: 'Get notified about important SEO changes the moment they happen.' },
];

function FeatureVisual({ feature, idx }: { feature: { tag: string; visual: FeatureVisualRow[] }; idx: number }) {
  const isRank     = idx === 1;
  const isAudit    = idx === 2;
  const isBacklink = idx === 3;

  return (
    <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid hsl(var(--border))', background: 'var(--card-bg)', boxShadow: '0 8px 40px rgba(0,0,0,0.07)' }}>
      {/* mock top bar */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#00C27A' }} />
        <span className="ml-3 text-[11px] font-bold" style={{ color: 'var(--text-faint)', letterSpacing: '0.04em' }}>{feature.tag}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00C27A' }} />
          <span className="text-[10px] font-bold" style={{ color: '#00C27A' }}>LIVE</span>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-2.5">
        {/* header row */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-black uppercase" style={{ color: 'var(--text-faint)', letterSpacing: '0.1em' }}>
            {isRank ? 'Keyword Rankings' : isAudit ? 'Site Health Scores' : isBacklink ? 'Backlink Feed' : 'Keyword Opportunities'}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,194,122,0.12)', color: '#00A868' }}>
            {isRank ? 'Updated 2m ago' : isAudit ? 'Scan complete' : isBacklink ? '4 new today' : '12 gaps found'}
          </span>
        </div>

        {feature.visual.map((row, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))' }}>
            <span className="font-mono text-[12px] font-semibold truncate flex-1" style={{ color: 'var(--text-soft)' }}>{row.label}</span>
            {isRank && (
              <>
                <span className="font-black text-[13px]" style={{ color: 'var(--text)' }}>{row.pos}</span>
                <span className="font-bold text-[11px] px-1.5 py-0.5 rounded-md" style={{ background: row.up === 'true' ? 'rgba(0,194,122,0.12)' : 'rgba(239,68,68,0.1)', color: row.up === 'true' ? '#00A868' : '#ef4444' }}>{row.delta}</span>
              </>
            )}
            {isAudit && (
              <span className="font-black text-[13px] px-2 py-0.5 rounded-lg" style={{ background: row.status === 'good' ? 'rgba(0,194,122,0.12)' : 'rgba(245,158,11,0.12)', color: row.status === 'good' ? '#00A868' : '#d97706' }}>{row.score}</span>
            )}
            {isBacklink && (
              <>
                <span className="text-[11px] font-bold" style={{ color: 'var(--text-faint)' }}>{row.da}</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: row.type === 'New' ? 'rgba(0,194,122,0.12)' : 'rgba(239,68,68,0.1)', color: row.type === 'New' ? '#00A868' : '#ef4444' }}>{row.type}</span>
              </>
            )}
            {!isRank && !isAudit && !isBacklink && (
              <>
                <span className="text-[11px] font-bold" style={{ color: 'var(--text-faint)' }}>{row.vol}</span>
                <span className="text-[11px] font-black px-2 py-0.5 rounded-lg" style={{ background: 'rgba(0,194,122,0.1)', color: '#00A868' }}>KD {row.diff}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Features() {
  useSEOMeta('features', { title: 'Features — Serpely AI SEO Platform', description: 'Explore Serpely\'s full feature set: AI rank tracking, GEO monitoring, technical audits, and more.' });
  const pageRef = useRef<HTMLDivElement>(null);

  /* ── Editable state with defaults ── */
  const [heroHeadline,  setHeroHeadline]  = useState('Everything you need to rank higher');
  const [heroSubtext,   setHeroSubtext]   = useState('A complete suite of SEO tools powered by AI. From keyword research to technical audits, all in one platform.');
  const [heroPrimText,  setHeroPrimText]  = useState('Start Free Trial');
  const [heroPrimHref,  setHeroPrimHref]  = useState('/pricing');
  const [heroSecText,   setHeroSecText]   = useState('See How It Works');
  const [heroSecHref,   setHeroSecHref]   = useState('/how-it-works');

  const [mainFeats,     setMainFeats]     = useState<MainFeat[]>(DEFAULT_MAIN_FEATS);

  const [addHeadline,   setAddHeadline]   = useState('The complete SEO platform');
  const [addSubtext,    setAddSubtext]    = useState('Every tool you need, unified in one place.');
  const [addFeats,      setAddFeats]      = useState<AddFeat[]>(DEFAULT_ADD_FEATS);

  const [ctaHeadline,   setCtaHeadline]   = useState('Ready to unlock every feature?');
  const [ctaSubtext,    setCtaSubtext]    = useState('Start your free trial today and see what Serpely can do for your SEO.');
  const [ctaPrimText,   setCtaPrimText]   = useState('Start Free Trial');
  const [ctaPrimHref,   setCtaPrimHref]   = useState('/pricing');
  const [ctaSecText,    setCtaSecText]    = useState('Compare Plans');
  const [ctaSecHref,    setCtaSecHref]    = useState('/compare');

  /* ── Hydrate from API ── */
  useEffect(() => {
    getSection('features').then(r => {
      const d = r.data.data as Record<string, unknown>;
      if (typeof d.heroHeadline  === 'string') setHeroHeadline(d.heroHeadline);
      if (typeof d.heroSubtext   === 'string') setHeroSubtext(d.heroSubtext);
      if (typeof d.heroPrimText  === 'string') setHeroPrimText(d.heroPrimText);
      if (typeof d.heroPrimHref  === 'string') setHeroPrimHref(d.heroPrimHref);
      if (typeof d.heroSecText   === 'string') setHeroSecText(d.heroSecText);
      if (typeof d.heroSecHref   === 'string') setHeroSecHref(d.heroSecHref);
      if (Array.isArray(d.mainFeats))          setMainFeats(d.mainFeats as MainFeat[]);
      if (typeof d.addHeadline   === 'string') setAddHeadline(d.addHeadline);
      if (typeof d.addSubtext    === 'string') setAddSubtext(d.addSubtext);
      if (Array.isArray(d.addFeats))           setAddFeats(d.addFeats as AddFeat[]);
      if (typeof d.ctaHeadline   === 'string') setCtaHeadline(d.ctaHeadline);
      if (typeof d.ctaSubtext    === 'string') setCtaSubtext(d.ctaSubtext);
      if (typeof d.ctaPrimText   === 'string') setCtaPrimText(d.ctaPrimText);
      if (typeof d.ctaPrimHref   === 'string') setCtaPrimHref(d.ctaPrimHref);
      if (typeof d.ctaSecText    === 'string') setCtaSecText(d.ctaSecText);
      if (typeof d.ctaSecHref    === 'string') setCtaSecHref(d.ctaSecHref);
    }).catch(() => {});
  }, []);

  /* ── Schema ── */
  useEffect(() => {
    injectSchema('schema-features', {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Serpely',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: 'https://serpely.com',
      description: 'Agentic SEO platform for the AI-first web. Daily rank tracking, technical audits, GEO Scoring, AI Citation Monitoring, and autonomous SEO workflows.',
      featureList: [...mainFeats.map(f => f.title), ...addFeats.map(f => f.title)].join(', '),
      offers: [
        { '@type': 'Offer', name: 'Starter', price: '0', priceCurrency: 'USD', description: '100 keywords, 1 website, weekly rank tracking, GEO Score read-only. No credit card required.' },
        { '@type': 'Offer', name: 'Professional', price: '49', priceCurrency: 'USD', description: '1,000 keywords, 5 websites, daily rank tracking, full GEO dashboard, AI Citation Monitor, API access. 14-day free trial.' },
        { '@type': 'Offer', name: 'Business', price: '99', priceCurrency: 'USD', description: 'Unlimited keywords and websites, real-time tracking, continuous audits, white-label reports, dedicated account manager. 14-day free trial.' },
      ],
    });
    return () => removeSchema('schema-features');
  }, [mainFeats, addFeats]);

  /* ── GSAP animations ── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.feat-hero', { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out', delay: 0.1 });

      document.querySelectorAll('.feat-main-row').forEach((row, i) => {
        const fromLeft = i % 2 === 0;
        gsap.fromTo(row.querySelector('.feat-main-text'), { opacity: 0, x: fromLeft ? -32 : 32 }, {
          opacity: 1, x: 0, duration: 0.6, ease: 'power3.out',
          scrollTrigger: { trigger: row, start: 'top 75%', toggleActions: 'play none none reverse' },
        });
        gsap.fromTo(row.querySelector('.feat-main-visual'), { opacity: 0, x: fromLeft ? 32 : -32 }, {
          opacity: 1, x: 0, duration: 0.6, ease: 'power3.out',
          scrollTrigger: { trigger: row, start: 'top 75%', toggleActions: 'play none none reverse' },
        });
      });

      gsap.fromTo('.feat-add-card', { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.45, stagger: 0.07, ease: 'power3.out',
        scrollTrigger: { trigger: '.feat-add-grid', start: 'top 78%', toggleActions: 'play none none reverse' },
      });

      gsap.fromTo('.feat-cta', { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.55, ease: 'power3.out',
        scrollTrigger: { trigger: '.feat-cta', start: 'top 84%', toggleActions: 'play none none reverse' },
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  /* ── Merge state + hardcoded arrays at render time ── */
  const featsWithMeta = mainFeats.map((f, i) => ({
    ...f,
    iconPath: mainIconPaths[i] ?? '',
    visual:   mainVisuals[i]   ?? [],
  }));

  const addWithMeta = addFeats.map((f, i) => ({
    ...f,
    iconPath: addIconPaths[i] ?? '',
  }));

  return (
    <div ref={pageRef} style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,194,122,0.09) 0%, transparent 70%)' }} />
        <div className="feat-hero max-w-3xl mx-auto relative z-10">
          <span className="pill-s mb-5 inline-flex">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#00C27A' }} />
            Platform Features
          </span>
          <h1 className="font-black mb-5" style={{ fontSize: 'clamp(26px,5vw,62px)', fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.045em' }}>
            {heroHeadline.includes('rank higher') ? (
              <>
                {heroHeadline.split('rank higher')[0]}
                <span className="text-gradient">rank higher</span>
                {heroHeadline.split('rank higher')[1]}
              </>
            ) : heroHeadline}
          </h1>
          <p className="font-medium mb-8 max-w-xl mx-auto" style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--text-soft)' }}>
            {heroSubtext}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to={heroPrimHref} className="btn-accent-s">
              {heroPrimText}
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 ml-1" fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
            </Link>
            <Link to={heroSecHref} className="btn-secondary-s">{heroSecText}</Link>
          </div>
        </div>
      </section>

      {/* ── Main Features ── */}
      <section className="pb-24 px-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-24">
          {featsWithMeta.map((f, i) => (
            <div key={i} className="feat-main-row grid lg:grid-cols-2 gap-12 items-center">

              {/* Text */}
              <div className={`feat-main-text ${i % 2 === 1 ? 'lg:order-2' : ''}`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,rgba(0,194,122,0.14),rgba(0,194,122,0.04))', border: '1px solid rgba(0,194,122,0.25)' }}>
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#00C27A" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
                      <path d={f.iconPath} />
                    </svg>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full" style={{ background: 'rgba(0,194,122,0.1)', color: '#00A868', letterSpacing: '0.1em', border: '1px solid rgba(0,194,122,0.2)' }}>
                    {f.tag}
                  </span>
                </div>
                <h2 className="font-black mb-4" style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.035em', color: 'var(--text)' }}>{f.title}</h2>
                <p className="font-medium leading-relaxed mb-6" style={{ fontSize: 15, color: 'var(--text-soft)', lineHeight: 1.65 }}>{f.description}</p>
                <ul className="flex flex-col gap-2.5">
                  {f.items.map((item, ii) => (
                    <li key={ii} className="flex items-center gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,194,122,0.12)', border: '1px solid rgba(0,194,122,0.25)' }}>
                        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="#00C27A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 6l3 3 5-5"/>
                        </svg>
                      </span>
                      <span className="font-medium" style={{ fontSize: 14, color: 'var(--text-soft)' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual */}
              <div className={`feat-main-visual ${i % 2 === 1 ? 'lg:order-1' : ''}`}>
                <FeatureVisual feature={f} idx={i} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Additional Features ── */}
      <section className="py-20 px-6" style={{ borderTop: '1px solid hsl(var(--border))', background: 'var(--bg-subtle)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="pill-s inline-flex mb-4">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#00C27A' }} />
              And Much More
            </span>
            <h2 className="font-black mb-3" style={{ fontSize: 'clamp(24px,3vw,38px)', fontWeight: 900, letterSpacing: '-0.04em' }}>
              {addHeadline}
            </h2>
            <p className="font-medium max-w-md mx-auto" style={{ fontSize: 15, color: 'var(--text-soft)' }}>
              {addSubtext}
            </p>
          </div>
          <div className="feat-add-grid grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {addWithMeta.map((f, i) => (
              <div
                key={i}
                className="feat-add-card"
                style={{
                  borderRadius: 16,
                  padding: '22px 20px',
                  background: 'var(--card-bg)',
                  border: '1px solid hsl(var(--border))',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 36px rgba(0,194,122,0.10), 0 4px 12px rgba(0,0,0,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(0,194,122,0.35)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = 'hsl(var(--border))';
                }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg,rgba(0,194,122,0.14),rgba(0,194,122,0.04))', border: '1px solid rgba(0,194,122,0.22)' }}>
                  <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} fill="none" stroke="#00C27A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d={f.iconPath} />
                  </svg>
                </div>
                <h3 className="font-black mb-1.5" style={{ fontSize: 13.5, color: 'var(--text)', letterSpacing: '-0.015em' }}>{f.title}</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-soft)', lineHeight: 1.55 }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="feat-cta cta-dark-s rounded-[24px] p-10 lg:p-14 text-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(0,194,122,0.12) 0%, transparent 70%)' }} />
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase mb-5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,194,122,0.15)', border: '1px solid rgba(0,194,122,0.3)', color: '#00C27A', letterSpacing: '0.1em' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00C27A' }} />
                14-Day Free Trial
              </span>
              <h2 className="font-black mb-4" style={{ fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', color: '#fff' }}>
                {ctaHeadline}
              </h2>
              <p className="mb-8 mx-auto max-w-lg font-medium" style={{ fontSize: 15, lineHeight: 1.65, color: 'rgba(255,255,255,0.6)' }}>
                {ctaSubtext}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to={ctaPrimHref} className="btn-accent-s">
                  {ctaPrimText}
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 ml-1" fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                </Link>
                <Link to={ctaSecHref} className="btn-secondary-s" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}>
                  {ctaSecText}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
