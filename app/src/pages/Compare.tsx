import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useSEOMeta } from '@/hooks/useSEOMeta';
import { injectSchema, removeSchema } from '@/lib/schema';
import { competitors, COMPETITOR_SLUGS } from '@/data/competitors';
import { getSection } from '@/lib/api';

gsap.registerPlugin(ScrollTrigger);

export interface CompRow {
  feature: string;
  category?: string;
  serpely: boolean | string;
  ahrefs: boolean | string;
  semrush: boolean | string;
  moz: boolean | string;
  isPrice?: boolean;
}

export interface DiffCard {
  title: string;
  description: string;
  icon: string;
  accent: boolean;
}

export const DEFAULT_COMPARISONS: CompRow[] = [
  { feature: 'AI-Powered Optimization', category: 'AI & GEO', serpely: true, ahrefs: false, semrush: false, moz: false },
  { feature: 'Generative Engine Optimization (GEO)', category: 'AI & GEO', serpely: true, ahrefs: false, semrush: false, moz: false },
  { feature: 'LLM Visibility Tracking', category: 'AI & GEO', serpely: true, ahrefs: false, semrush: false, moz: false },
  { feature: 'Content Prioritization', category: 'AI & GEO', serpely: true, ahrefs: false, semrush: false, moz: false },
  { feature: 'Automated Workflows', category: 'AI & GEO', serpely: true, ahrefs: false, semrush: false, moz: false },
  { feature: 'Daily Rank Tracking', category: 'Core SEO', serpely: true, ahrefs: true, semrush: true, moz: true },
  { feature: 'Technical Site Audits', category: 'Core SEO', serpely: true, ahrefs: true, semrush: true, moz: true },
  { feature: 'Backlink Analysis', category: 'Core SEO', serpely: true, ahrefs: true, semrush: true, moz: true },
  { feature: 'API Access', category: 'Core SEO', serpely: true, ahrefs: true, semrush: true, moz: true },
  { feature: 'White-Label Reports', category: 'Agency', serpely: true, ahrefs: true, semrush: true, moz: false },
  { feature: 'Starting Price', serpely: '$0 / mo', ahrefs: '$99 / mo', semrush: '$119 / mo', moz: '$99 / mo', isPrice: true },
];

export const DEFAULT_DIFFERENCES: DiffCard[] = [
  {
    title: 'Agentic AI',
    description: "Our AI agents don't just report on your SEO — they actively work to improve it with zero manual effort.",
    icon: 'M13 2 4 14h6l-1 8 9-12h-6z',
    accent: true,
  },
  {
    title: 'GEO Ready',
    description: 'The only platform built from the ground up for the AI-first search landscape — ChatGPT, Perplexity, Gemini.',
    icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 0c-2.22 3.61-3 6.5-3 10s.78 6.39 3 10m0-20c2.22 3.61 3 6.5 3 10s-.78 6.39-3 10M2 12h20',
    accent: false,
  },
  {
    title: 'Affordable',
    description: 'Enterprise-grade features at a fraction of the cost. Start free — no credit card, no commitment.',
    icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    accent: false,
  },
];

const tools = ['Serpely', 'Ahrefs', 'Semrush', 'Moz'];

function Check() {
  return (
    <div className="w-6 h-6 rounded-full flex items-center justify-center mx-auto flex-shrink-0" style={{ background: 'rgba(0,194,122,0.14)', border: '1px solid rgba(0,194,122,0.3)' }}>
      <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="#00C27A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 6l3 3 5-5"/>
      </svg>
    </div>
  );
}

function Cross() {
  return (
    <div className="w-6 h-6 rounded-full flex items-center justify-center mx-auto flex-shrink-0" style={{ background: 'var(--tag-bg)' }}>
      <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-faint)' }}>
        <path d="M3 3l6 6M9 3l-6 6"/>
      </svg>
    </div>
  );
}

export function Compare() {
  useSEOMeta('compare', { title: 'Serpely vs Ahrefs, Semrush & Moz — Compare', description: 'See how Serpely compares to traditional SEO tools for AI-first search visibility.' });
  const pageRef = useRef<HTMLDivElement>(null);

  const [heroHeadline,  setHeroHeadline]  = useState('See how we stack up');
  const [heroSubtext,   setHeroSubtext]   = useState('See why thousands of teams are switching to Serpely for their SEO and GEO needs.');
  const [comparisons,   setComparisons]   = useState<CompRow[]>(DEFAULT_COMPARISONS);
  const [differences,   setDifferences]   = useState<DiffCard[]>(DEFAULT_DIFFERENCES);
  const [ctaHeadline,   setCtaHeadline]   = useState('Ready to make the switch?');
  const [ctaSubtext,    setCtaSubtext]    = useState('Start your free trial today and experience the difference Agentic SEO can make.');
  const [ctaPrimText,   setCtaPrimText]   = useState('Start Free Trial');
  const [ctaPrimHref,   setCtaPrimHref]   = useState('/pricing');
  const [ctaSecText,    setCtaSecText]    = useState('See How It Works');
  const [ctaSecHref,    setCtaSecHref]    = useState('/how-it-works');

  useEffect(() => {
    getSection('compare').then(r => {
      const d = r.data.data as Record<string, unknown>;
      if (typeof d.heroHeadline  === 'string') setHeroHeadline(d.heroHeadline);
      if (typeof d.heroSubtext   === 'string') setHeroSubtext(d.heroSubtext);
      if (Array.isArray(d.comparisons))        setComparisons(d.comparisons as CompRow[]);
      if (Array.isArray(d.differences))        setDifferences(d.differences as DiffCard[]);
      if (typeof d.ctaHeadline   === 'string') setCtaHeadline(d.ctaHeadline);
      if (typeof d.ctaSubtext    === 'string') setCtaSubtext(d.ctaSubtext);
      if (typeof d.ctaPrimText   === 'string') setCtaPrimText(d.ctaPrimText);
      if (typeof d.ctaPrimHref   === 'string') setCtaPrimHref(d.ctaPrimHref);
      if (typeof d.ctaSecText    === 'string') setCtaSecText(d.ctaSecText);
      if (typeof d.ctaSecHref    === 'string') setCtaSecHref(d.ctaSecHref);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    injectSchema('schema-compare', {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Serpely vs SEO Tools Comparison',
      description: 'Feature-by-feature comparison of Serpely against Ahrefs, Semrush, and Moz for AI-first SEO.',
      url: 'https://serpely.com/compare',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Serpely', url: 'https://serpely.com', description: 'Agentic SEO platform with GEO Scoring and AI Citation Monitor. Free plan available, paid plans from $49/month.' },
        { '@type': 'ListItem', position: 2, name: 'Ahrefs', url: 'https://ahrefs.com', description: 'Traditional SEO tool. No GEO Score or AI citation monitoring. Plans from $99/month.' },
        { '@type': 'ListItem', position: 3, name: 'Semrush', url: 'https://semrush.com', description: 'Traditional SEO platform. No GEO Score or AI citation monitoring. Plans from $119/month.' },
        { '@type': 'ListItem', position: 4, name: 'Moz', url: 'https://moz.com', description: 'Traditional SEO tool. No GEO Score or AI citation monitoring. Plans from $99/month.' },
      ],
    });
    return () => removeSchema('schema-compare');
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.cmp-hero', { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out', delay: 0.1 });

      gsap.fromTo('.cmp-table-wrap', { opacity: 0, y: 28 }, {
        opacity: 1, y: 0, duration: 0.6, ease: 'power3.out',
        scrollTrigger: { trigger: '.cmp-table-wrap', start: 'top 78%', toggleActions: 'play none none reverse' },
      });

      gsap.fromTo('.cmp-row', { opacity: 0, x: -12 }, {
        opacity: 1, x: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out',
        scrollTrigger: { trigger: '.cmp-table-wrap', start: 'top 75%', toggleActions: 'play none none reverse' },
      });

      gsap.fromTo('.cmp-diff-card', { opacity: 0, y: 28 }, {
        opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: '.cmp-diff-grid', start: 'top 78%', toggleActions: 'play none none reverse' },
      });

      gsap.fromTo('.cmp-cta', { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.55, ease: 'power3.out',
        scrollTrigger: { trigger: '.cmp-cta', start: 'top 82%', toggleActions: 'play none none reverse' },
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  const featureRows  = comparisons.filter(r => !r.isPrice && r.category);
  const priceRow     = comparisons.find(r => r.isPrice);
  const categories   = [...new Set(featureRows.map(r => r.category))];

  return (
    <div ref={pageRef} style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,194,122,0.09) 0%, transparent 70%)' }} />
        <div className="cmp-hero max-w-2xl mx-auto relative z-10">
          <span className="pill-s mb-5 inline-flex">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#00C27A' }} />
            Compare
          </span>
          <h1 className="font-black mb-5" style={{ fontSize: 'clamp(26px,5vw,60px)', fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.045em' }}>
            {heroHeadline.includes('stack up') ? (
              <>
                {heroHeadline.split('stack up')[0]}
                <span className="text-gradient">stack up</span>
                {heroHeadline.split('stack up')[1]}
              </>
            ) : heroHeadline}
          </h1>
          <p className="font-medium max-w-xl mx-auto" style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--text-soft)' }}>
            {heroSubtext}
          </p>
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div
            className="cmp-table-wrap overflow-hidden"
            style={{ borderRadius: 20, border: '1px solid hsl(var(--border))', background: 'var(--card-bg)', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}
          >
            <div className="overflow-x-auto" style={{WebkitOverflowScrolling:'touch'}}>
              <p className="sm:hidden text-[11px] font-semibold text-center py-2" style={{color:'var(--text-faint)',letterSpacing:'0.04em'}}>← Swipe to compare →</p>
              <table className="w-full" style={{ minWidth: 600, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <th className="text-left py-5 px-6 font-bold text-xs uppercase" style={{ color: 'var(--text-faint)', letterSpacing: '0.1em', minWidth: 220, width: '38%' }}>
                      Feature
                    </th>
                    {tools.map((tool, ti) => (
                      <th
                        key={tool}
                        className="text-center py-5 px-4 font-black text-sm"
                        style={{
                          minWidth: 110,
                          background: ti === 0 ? 'linear-gradient(180deg,rgba(0,194,122,0.10),rgba(0,194,122,0.05))' : 'transparent',
                          color: ti === 0 ? '#00C27A' : 'var(--text-soft)',
                          borderLeft: ti === 0 ? '1px solid rgba(0,194,122,0.2)' : '1px solid hsl(var(--border))',
                          position: 'relative',
                        }}
                      >
                        {ti === 0 && (
                          <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: '#00C27A', color: '#0A0A0A', letterSpacing: '0.08em' }}>
                            Us
                          </span>
                        )}
                        <span style={{ display: 'block', marginTop: ti === 0 ? 14 : 0 }}>{tool}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <>
                      <tr key={`cat-${cat}`} style={{ background: 'var(--bg-subtle)' }}>
                        <td colSpan={5} className="px-6 py-2.5">
                          <span className="text-[10px] font-black uppercase" style={{ color: 'var(--text-faint)', letterSpacing: '0.14em' }}>{cat}</span>
                        </td>
                      </tr>
                      {featureRows.filter(r => r.category === cat).map((row, i) => (
                        <tr
                          key={`${cat}-${i}`}
                          className="cmp-row"
                          style={{ borderTop: '1px solid hsl(var(--border))', transition: 'background 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <td className="py-3.5 px-6 font-medium text-sm" style={{ color: 'var(--text-soft)' }}>{row.feature}</td>
                          {[row.serpely, row.ahrefs, row.semrush, row.moz].map((val, vi) => (
                            <td
                              key={vi}
                              className="py-3.5 px-4 text-center"
                              style={{
                                background: vi === 0 ? 'rgba(0,194,122,0.04)' : 'transparent',
                                borderLeft: vi === 0 ? '1px solid rgba(0,194,122,0.15)' : '1px solid hsl(var(--border))',
                              }}
                            >
                              {val ? <Check /> : <Cross />}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ))}
                  {priceRow && (
                    <tr style={{ borderTop: '2px solid hsl(var(--border))', background: 'var(--bg-subtle)' }}>
                      <td className="py-4 px-6 font-black text-sm" style={{ color: 'var(--text)' }}>Starting Price</td>
                      {[priceRow.serpely, priceRow.ahrefs, priceRow.semrush, priceRow.moz].map((val, vi) => (
                        <td
                          key={vi}
                          className="py-4 px-4 text-center"
                          style={{
                            background: vi === 0 ? 'rgba(0,194,122,0.06)' : 'transparent',
                            borderLeft: vi === 0 ? '1px solid rgba(0,194,122,0.2)' : '1px solid hsl(var(--border))',
                          }}
                        >
                          <span className="font-black text-sm" style={{ color: vi === 0 ? '#00C27A' : 'var(--text-soft)' }}>
                            {val as string}
                          </span>
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key Differences ── */}
      <section className="py-20 px-6" style={{ borderTop: '1px solid hsl(var(--border))', background: 'var(--bg-subtle)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="pill-s inline-flex mb-4">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#00C27A' }} />
              Why Serpely
            </span>
            <h2 className="font-black mb-3" style={{ fontSize: 'clamp(24px,3vw,38px)', fontWeight: 900, letterSpacing: '-0.04em' }}>
              What makes us different?
            </h2>
            <p className="font-medium max-w-md mx-auto" style={{ fontSize: 15, color: 'var(--text-soft)' }}>
              While other tools provide data, Serpely provides action.
            </p>
          </div>

          <div className="cmp-diff-grid grid md:grid-cols-3 gap-5">
            {differences.map((d, i) => (
              <div
                key={i}
                className="cmp-diff-card"
                style={{
                  borderRadius: 20,
                  padding: '28px 24px',
                  background: 'var(--card-bg)',
                  border: d.accent ? '1px solid rgba(0,194,122,0.4)' : '1px solid hsl(var(--border))',
                  boxShadow: d.accent
                    ? '0 0 0 1px rgba(0,194,122,0.15), 0 16px 48px rgba(0,194,122,0.10)'
                    : '0 2px 12px rgba(0,0,0,0.04)',
                  transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 20px 56px rgba(0,194,122,0.13), 0 4px 16px rgba(0,0,0,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(0,194,122,0.45)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = d.accent
                    ? '0 0 0 1px rgba(0,194,122,0.15), 0 16px 48px rgba(0,194,122,0.10)'
                    : '0 2px 12px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = d.accent ? 'rgba(0,194,122,0.4)' : 'hsl(var(--border))';
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{
                    background: 'linear-gradient(135deg,rgba(0,194,122,0.16),rgba(0,194,122,0.04))',
                    border: '1px solid rgba(0,194,122,0.28)',
                  }}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#00C27A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d={d.icon} />
                  </svg>
                </div>
                <h3 className="font-black text-lg mb-2.5" style={{ color: 'var(--text)', letterSpacing: '-0.025em' }}>{d.title}</h3>
                <p className="font-medium leading-relaxed" style={{ fontSize: 14, color: 'var(--text-soft)' }}>{d.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Detailed Comparisons ── */}
      <section className="py-20 px-6" style={{ borderTop: '1px solid hsl(var(--border))' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="pill-s inline-flex mb-4">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#00C27A' }} />
              Detailed Comparisons
            </span>
            <h2 className="font-black mb-3" style={{ fontSize: 'clamp(22px,3vw,36px)', fontWeight: 900, letterSpacing: '-0.04em' }}>
              See how Serpely compares to each tool
            </h2>
            <p className="font-medium" style={{ fontSize: 15, color: 'var(--text-soft)' }}>
              Full feature tables, pricing breakdowns, and FAQs for each competitor.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COMPETITOR_SLUGS.map(slug => {
              const c = competitors[slug];
              return (
                <Link
                  key={slug}
                  to={`/compare/${slug}`}
                  style={{
                    borderRadius: 16,
                    padding: '20px 22px',
                    background: 'var(--card-bg)',
                    border: '1px solid hsl(var(--border))',
                    textDecoration: 'none',
                    display: 'block',
                    transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.borderColor = 'rgba(0,194,122,0.4)';
                    e.currentTarget.style.boxShadow = '0 12px 36px rgba(0,194,122,0.10)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'hsl(var(--border))';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="font-black text-base" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>
                      Serpely vs {c.name}
                    </span>
                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: '#00C27A' }}>
                      <path d="M3 8h10M9 4l4 4-4 4"/>
                    </svg>
                  </div>
                  <p className="font-medium mb-3" style={{ fontSize: 12.5, color: 'var(--text-soft)', lineHeight: 1.5 }}>{c.tagline}</p>
                  <span className="text-[11px] font-bold uppercase" style={{ color: 'var(--text-faint)', letterSpacing: '0.08em' }}>
                    from {c.startingPrice}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="cmp-cta cta-dark-s rounded-[24px] p-10 lg:p-14 text-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(0,194,122,0.12) 0%, transparent 70%)' }} />
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase mb-5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,194,122,0.15)', border: '1px solid rgba(0,194,122,0.3)', color: '#00C27A', letterSpacing: '0.1em' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00C27A' }} />
                Free to Start
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
