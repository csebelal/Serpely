import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getSection } from '@/lib/api';

gsap.registerPlugin(ScrollTrigger);

interface CardType {
  title: string;
  desc: string;
  desc2?: string;
}

export function CoreFeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  const [pillText, setPillText] = useState('Serpely Features');
  const [headline1, setHeadline1] = useState('Everything You Need.');
  const [headline2, setHeadline2] = useState("Nothing You Don't.");
  const [subtext, setSubtext] = useState('Eight powerful modules for modern SEO. One unified platform that connects monitoring, optimization, and reporting.');
  const [cards, setCards] = useState<CardType[]>([
    { title: 'GEO Score + Keyword Intelligence', desc: 'Discover keyword gaps, search intent signals, and competitor ranking opportunities. Build structured topic clusters for scalable SEO and GEO growth.', desc2: 'Every page gets a GEO Score from 0 to 100 showing how likely it is to appear in AI-generated answers.' },
    { title: 'AI Citation Monitor', desc: 'Track whether ChatGPT, Perplexity, Gemini, and Google AI Overviews are citing your content. Get alerted when citation frequency changes.' },
    { title: 'Hallucination Alerts', desc: 'Know when AI engines return inaccurate information about your brand or content. Severity scores and fix recommendations included.' },
    { title: 'Content Prioritization', desc: 'Serpely scans every page daily and ranks which ones need a content refresh for AI optimization. A specific, scored action queue based on traffic decay, GEO Score, and keyword movement.' },
    { title: 'Daily Rank Tracking', desc: 'Track keyword rankings across Google and AI-driven search results including LLM answer engines. Real-time visibility shifts with intelligent alerts.' },
    { title: 'Technical Site Audit', desc: 'Continuously audit Core Web Vitals, crawl issues, indexing gaps, and schema errors. Prioritize fixes that directly impact AI visibility.' },
    { title: 'Backlink Monitoring', desc: 'Track new and lost backlinks with quality and authority scoring. Protect domain strength and uncover link-building opportunities.' },
    { title: 'White-Label Reporting', desc: 'Generate SEO, GEO, and LLM visibility reports instantly. Share client-ready dashboards under your brand.' },
  ]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.feat-reveal', { opacity: 0, y: 28 }, {
        opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', toggleActions: 'play none none reverse' },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    getSection('core-features').then(r => {
      const d = r.data.data as Record<string, unknown>;
      if (typeof d.pillText === 'string') setPillText(d.pillText);
      if (typeof d.headline1 === 'string') setHeadline1(d.headline1);
      if (typeof d.headline2 === 'string') setHeadline2(d.headline2);
      if (typeof d.subtext === 'string') setSubtext(d.subtext);
      if (Array.isArray(d.cards)) setCards(d.cards as CardType[]);
    }).catch(() => {});
  }, []);

  return (
    <section ref={sectionRef} id="features" className="py-28 px-6 relative">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16 feat-reveal">
          <div className="pill-s mb-5 mx-auto" style={{ width: 'fit-content' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot flex-shrink-0" style={{ background: '#00C27A' }} />
            {pillText}
          </div>
          <h2 className="font-black text-4xl lg:text-6xl mb-5" style={{ fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.05, color: 'var(--text)' }}>
            {headline1}<br/>
            <span className="text-gradient" style={{ display: 'inline-block', paddingBottom: 6 }}>{headline2}</span>
          </h2>
          <p className="text-lg max-w-lg mx-auto font-medium" style={{ color: 'var(--text-soft)' }}>
            {subtext}
          </p>
        </div>

        {/* Bento grid */}
        <div className="feat-reveal bento-grid-mobile grid gap-4" style={{
          gridTemplateColumns: 'repeat(6, 1fr)',
          gridAutoRows: 'minmax(180px, auto)',
        }}>

          {/* Hero card: GEO Score + Keyword Intelligence (4×2) */}
          <div className="card-s card-hover-s p-7 flex flex-col justify-between" style={{
            gridColumn: 'span 4', gridRow: 'span 2',
            background: 'linear-gradient(135deg, var(--card-bg), color-mix(in srgb, #00C27A 6%, var(--card-bg)))',
          }}>
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="icon-badge-s icon-accent-s">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 2v20M2 12h20"/></svg>
                </div>
                <span className="text-[11px] uppercase font-bold accent-text" style={{ letterSpacing: '0.14em' }}>Featured</span>
              </div>
              <h3 className="font-black text-2xl lg:text-3xl mb-3" style={{ fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1.1 }}>
                {cards[0]?.title}
              </h3>
              <p className="text-sm leading-relaxed max-w-md font-medium mb-3" style={{ color: 'var(--text-soft)' }}>
                {cards[0]?.desc}
              </p>
              {cards[0]?.desc2 && (
                <p className="text-sm leading-relaxed max-w-md font-medium" style={{ color: 'var(--text)' }}>
                  <span className="font-bold accent-text">Every page gets a GEO Score from 0 to 100</span> showing how likely it is to appear in AI-generated answers.
                </p>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-1.5">
              {['agentic seo', 'geo optimization', '+ llm visibility', 'ai citation tracking', 'content gaps', '+ topic clusters', 'e-e-a-t signals', 'serp intent'].map((t, i) => (
                <span key={t} className={`tag-s ${i === 2 || i === 5 ? 'tag-accent-s' : ''}`}>{t}</span>
              ))}
            </div>
            <a href="#" className="mt-5 inline-flex items-center gap-1.5 accent-text text-sm font-bold">Explore →</a>
          </div>

          {/* AI Citation Monitor (2×1) */}
          <div className="card-s card-hover-s p-6" style={{ gridColumn: 'span 2' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="icon-badge-s icon-accent-s">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11c0 5-9 11-9 11s-9-6-9-11a9 9 0 0 1 18 0z"/><circle cx="12" cy="11" r="3"/></svg>
              </div>
              <span className="tag-accent-s tag-s">New</span>
            </div>
            <h3 className="font-extrabold text-base mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>{cards[1]?.title}</h3>
            <p className="text-[13px] leading-relaxed font-medium" style={{ color: 'var(--text-soft)' }}>{cards[1]?.desc}</p>
            <a href="#" className="mt-4 inline-flex items-center gap-1 accent-text text-xs font-bold">Explore →</a>
          </div>

          {/* Hallucination Alerts (2×1) */}
          <div className="card-s card-hover-s p-6" style={{ gridColumn: 'span 2' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="icon-badge-s icon-accent-s">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
              </div>
              <span className="tag-accent-s tag-s">New</span>
            </div>
            <h3 className="font-extrabold text-base mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>{cards[2]?.title}</h3>
            <p className="text-[13px] leading-relaxed font-medium" style={{ color: 'var(--text-soft)' }}>{cards[2]?.desc}</p>
            <a href="#" className="mt-4 inline-flex items-center gap-1 accent-text text-xs font-bold">Explore →</a>
          </div>

          {/* Content Prioritization (3×1) */}
          <div className="card-s card-hover-s p-6" style={{ gridColumn: 'span 3' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="icon-badge-s icon-accent-s">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>
              </div>
              <div className="pill-s" style={{ padding: '3px 8px', fontSize: '9.5px' }}>
                <span className="w-1 h-1 rounded-full animate-pulse-dot" style={{ background: '#00C27A' }} />
                ACTIVE QUEUE
              </div>
            </div>
            <h3 className="font-extrabold text-lg mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.025em' }}>{cards[3]?.title}</h3>
            <p className="text-[13.5px] leading-relaxed font-medium" style={{ color: 'var(--text-soft)' }}>{cards[3]?.desc}</p>
            <a href="#" className="mt-4 inline-flex items-center gap-1 accent-text text-xs font-bold">Explore →</a>
          </div>

          {/* Daily Rank Tracking (3×1) */}
          <div className="card-s card-hover-s p-6" style={{ gridColumn: 'span 3' }}>
            <div className="icon-badge-s mb-4">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12a7 7 0 0 1 14 0"/><path d="M8 12a4 4 0 0 1 8 0"/><path d="M12 12v7"/></svg>
            </div>
            <h3 className="font-extrabold text-lg mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.025em' }}>{cards[4]?.title}</h3>
            <p className="text-[13.5px] leading-relaxed font-medium" style={{ color: 'var(--text-soft)' }}>{cards[4]?.desc}</p>
            <a href="#" className="mt-4 inline-flex items-center gap-1 accent-text text-xs font-bold">Explore →</a>
          </div>

          {/* Technical Site Audit (2×1) */}
          <div className="card-s card-hover-s p-6" style={{ gridColumn: 'span 2' }}>
            <div className="icon-badge-s mb-4">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-2.9-2.9z"/></svg>
            </div>
            <h3 className="font-extrabold text-base mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>{cards[5]?.title}</h3>
            <p className="text-[13px] leading-relaxed font-medium" style={{ color: 'var(--text-soft)' }}>{cards[5]?.desc}</p>
            <a href="#" className="mt-4 inline-flex items-center gap-1 accent-text text-xs font-bold">Explore →</a>
          </div>

          {/* Backlink Monitoring (2×1) */}
          <div className="card-s card-hover-s p-6" style={{ gridColumn: 'span 2' }}>
            <div className="icon-badge-s mb-4">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17 13"/><path d="M14 11a5 5 0 0 1 0 7L12.5 19.5a5 5 0 0 1-7-7L7 11"/></svg>
            </div>
            <h3 className="font-extrabold text-base mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>{cards[6]?.title}</h3>
            <p className="text-[13px] leading-relaxed font-medium" style={{ color: 'var(--text-soft)' }}>{cards[6]?.desc}</p>
            <a href="#" className="mt-4 inline-flex items-center gap-1 accent-text text-xs font-bold">Explore →</a>
          </div>

          {/* White-Label Reporting (2×1) */}
          <div className="card-s card-hover-s p-6" style={{ gridColumn: 'span 2' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="icon-badge-s">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19h16M7 15V9M12 15V5M17 15v-3"/></svg>
              </div>
              <span className="tag-s">Agency-Ready</span>
            </div>
            <h3 className="font-extrabold text-base mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>{cards[7]?.title}</h3>
            <p className="text-[13px] leading-relaxed font-medium" style={{ color: 'var(--text-soft)' }}>{cards[7]?.desc}</p>
            <a href="#" className="mt-4 inline-flex items-center gap-1 accent-text text-xs font-bold">Explore →</a>
          </div>

        </div>


      </div>
    </section>
  );
}
