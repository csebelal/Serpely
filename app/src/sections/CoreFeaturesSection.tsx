import { useEffect, useRef, useState } from 'react';
import { getSection } from '@/lib/api';
import { GlowCard, Reveal, TiltCard, useInViewOnce } from '@/components/motion';

interface CardType {
  title: string;
  desc: string;
  desc2?: string;
}

const GEO_TAGS = ['agentic seo', 'geo optimization', '+ llm visibility', 'ai citation tracking', 'content gaps', '+ topic clusters', 'e-e-a-t signals', 'serp intent'];
const RANK_BARS = [38, 52, 46, 68, 74, 92];
const REPORT_BARS = [45, 66, 82, 58, 94];

export function CoreFeaturesSection() {
  const gridRef = useRef<HTMLDivElement>(null);
  const gridInView = useInViewOnce(gridRef, { threshold: 0.1 });

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
    <section id="features" className="py-28 px-6 relative section-glow-edge">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <Reveal className="text-center mb-16">
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
        </Reveal>

        {/* Bento grid */}
        <div
          ref={gridRef}
          className="bento-grid-mobile grid gap-4"
          style={{
            gridTemplateColumns: 'repeat(6, 1fr)',
            gridAutoRows: 'minmax(180px, auto)',
          }}
        >

          {/* Hero card: GEO Score + Keyword Intelligence (4×2) */}
          <Reveal delay={40} style={{ gridColumn: 'span 4', gridRow: 'span 2' }}>
            <TiltCard maxTilt={3} className="h-full">
              <GlowCard
                featured
                className="card-s p-7 flex flex-col justify-between h-full"
                style={{
                  background: 'linear-gradient(135deg, var(--card-bg), color-mix(in srgb, #00C27A 6%, var(--card-bg)))',
                }}
              >
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

                  {/* Animated GEO score bar visual */}
                  <div aria-hidden="true" className="mt-5 p-3.5 rounded-xl border max-w-md" style={{ background: 'var(--bg-subtle)', borderColor: 'hsl(var(--border))' }}>
                    <div className="flex items-center justify-between text-xs font-bold mb-2">
                      <span style={{ color: 'var(--text-soft)' }}>Page GEO Readiness</span>
                      <span className="accent-text">84 / 100</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: gridInView ? '84%' : '0%',
                          background: 'linear-gradient(90deg, #00C27A, #00FF88)',
                          transition: 'width 1s cubic-bezier(0.22, 1, 0.36, 1) 180ms',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-1.5">
                  {GEO_TAGS.map((t, i) => (
                    <span
                      key={t}
                      className={`tag-s ${i === 2 || i === 5 ? 'tag-accent-s' : ''}`}
                      style={{
                        opacity: gridInView ? 1 : 0,
                        transform: gridInView ? 'translateY(0)' : 'translateY(6px)',
                        transition: `opacity 0.35s ease ${120 + i * 45}ms, transform 0.35s ease ${120 + i * 45}ms`,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <a href="#" className="mt-5 inline-flex items-center gap-1.5 accent-text text-sm font-bold">Explore →</a>
              </GlowCard>
            </TiltCard>
          </Reveal>

          {/* AI Citation Monitor (2×1) */}
          <Reveal delay={90} style={{ gridColumn: 'span 2' }}>
            <TiltCard maxTilt={4} className="h-full">
              <GlowCard className="card-s p-6 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="icon-badge-s icon-accent-s">
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11c0 5-9 11-9 11s-9-6-9-11a9 9 0 0 1 18 0z"/><circle cx="12" cy="11" r="3"/></svg>
                    </div>
                    <span className="tag-accent-s tag-s">New</span>
                  </div>
                  <h3 className="font-extrabold text-base mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>{cards[1]?.title}</h3>
                  <p className="text-[13px] leading-relaxed font-medium" style={{ color: 'var(--text-soft)' }}>{cards[1]?.desc}</p>
                  <div aria-hidden="true" className="flex flex-wrap gap-1.5 mt-3">
                    {['ChatGPT', 'Perplexity', 'Gemini'].map((eng) => (
                      <span key={eng} className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-md" style={{ background: 'var(--bg-subtle)', color: 'var(--text-soft)', border: '1px solid hsl(var(--border))' }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: '#00C27A' }} />
                        {eng}
                      </span>
                    ))}
                  </div>
                </div>
                <a href="#" className="mt-4 inline-flex items-center gap-1 accent-text text-xs font-bold">Explore →</a>
              </GlowCard>
            </TiltCard>
          </Reveal>

          {/* Hallucination Alerts (2×1) */}
          <Reveal delay={140} style={{ gridColumn: 'span 2' }}>
            <TiltCard maxTilt={4} className="h-full">
              <GlowCard className="card-s p-6 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="icon-badge-s icon-accent-s">
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
                    </div>
                    <span className="tag-accent-s tag-s">New</span>
                  </div>
                  <h3 className="font-extrabold text-base mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>{cards[2]?.title}</h3>
                  <p className="text-[13px] leading-relaxed font-medium" style={{ color: 'var(--text-soft)' }}>{cards[2]?.desc}</p>
                </div>
                <a href="#" className="mt-4 inline-flex items-center gap-1 accent-text text-xs font-bold">Explore →</a>
              </GlowCard>
            </TiltCard>
          </Reveal>

          {/* Content Prioritization (3×1) */}
          <Reveal delay={180} style={{ gridColumn: 'span 3' }}>
            <TiltCard maxTilt={3.5} className="h-full">
              <GlowCard className="card-s p-6 h-full flex flex-col justify-between">
                <div>
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

                  {/* Animated queue priority bars */}
                  <div aria-hidden="true" className="mt-4 space-y-1.5">
                    {[90, 72, 54].map((w, idx) => (
                      <div key={w} className="h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: gridInView ? `${w}%` : '0%',
                            background: idx === 0 ? '#00C27A' : 'rgba(0,194,122,0.5)',
                            transition: `width 0.85s cubic-bezier(0.22, 1, 0.36, 1) ${200 + idx * 120}ms`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <a href="#" className="mt-4 inline-flex items-center gap-1 accent-text text-xs font-bold">Explore →</a>
              </GlowCard>
            </TiltCard>
          </Reveal>

          {/* Daily Rank Tracking (3×1) */}
          <Reveal delay={220} style={{ gridColumn: 'span 3' }}>
            <TiltCard maxTilt={3.5} className="h-full">
              <GlowCard className="card-s p-6 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="icon-badge-s">
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12a7 7 0 0 1 14 0"/><path d="M8 12a4 4 0 0 1 8 0"/><path d="M12 12v7"/></svg>
                    </div>
                    {/* Growing mini chart bars */}
                    <div aria-hidden="true" className="flex items-end gap-1 h-8">
                      {RANK_BARS.map((h, i) => (
                        <span
                          key={i}
                          className="w-1.5 rounded-t-sm origin-bottom"
                          style={{
                            height: `${Math.round((h / 100) * 32)}px`,
                            background: i === RANK_BARS.length - 1 ? '#00C27A' : 'rgba(0,194,122,0.38)',
                            transform: gridInView ? 'scaleY(1)' : 'scaleY(0.15)',
                            transition: `transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${180 + i * 70}ms`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <h3 className="font-extrabold text-lg mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.025em' }}>{cards[4]?.title}</h3>
                  <p className="text-[13.5px] leading-relaxed font-medium" style={{ color: 'var(--text-soft)' }}>{cards[4]?.desc}</p>
                </div>
                <a href="#" className="mt-4 inline-flex items-center gap-1 accent-text text-xs font-bold">Explore →</a>
              </GlowCard>
            </TiltCard>
          </Reveal>

          {/* Technical Site Audit (2×1) */}
          <Reveal delay={260} style={{ gridColumn: 'span 2' }}>
            <TiltCard maxTilt={4} className="h-full">
              <GlowCard className="card-s p-6 h-full flex flex-col justify-between">
                <div>
                  <div className="icon-badge-s mb-4">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-2.9-2.9z"/></svg>
                  </div>
                  <h3 className="font-extrabold text-base mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>{cards[5]?.title}</h3>
                  <p className="text-[13px] leading-relaxed font-medium" style={{ color: 'var(--text-soft)' }}>{cards[5]?.desc}</p>
                </div>
                <a href="#" className="mt-4 inline-flex items-center gap-1 accent-text text-xs font-bold">Explore →</a>
              </GlowCard>
            </TiltCard>
          </Reveal>

          {/* Backlink Monitoring (2×1) */}
          <Reveal delay={300} style={{ gridColumn: 'span 2' }}>
            <TiltCard maxTilt={4} className="h-full">
              <GlowCard className="card-s p-6 h-full flex flex-col justify-between">
                <div>
                  <div className="icon-badge-s mb-4">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17 13"/><path d="M14 11a5 5 0 0 1 0 7L12.5 19.5a5 5 0 0 1-7-7L7 11"/></svg>
                  </div>
                  <h3 className="font-extrabold text-base mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>{cards[6]?.title}</h3>
                  <p className="text-[13px] leading-relaxed font-medium" style={{ color: 'var(--text-soft)' }}>{cards[6]?.desc}</p>
                </div>
                <a href="#" className="mt-4 inline-flex items-center gap-1 accent-text text-xs font-bold">Explore →</a>
              </GlowCard>
            </TiltCard>
          </Reveal>

          {/* White-Label Reporting (2×1) */}
          <Reveal delay={340} style={{ gridColumn: 'span 2' }}>
            <TiltCard maxTilt={4} className="h-full">
              <GlowCard className="card-s p-6 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="icon-badge-s">
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19h16M7 15V9M12 15V5M17 15v-3"/></svg>
                    </div>
                    <span className="tag-s">Agency-Ready</span>
                  </div>
                  <h3 className="font-extrabold text-base mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>{cards[7]?.title}</h3>
                  <p className="text-[13px] leading-relaxed font-medium" style={{ color: 'var(--text-soft)' }}>{cards[7]?.desc}</p>
                  <div aria-hidden="true" className="flex items-end gap-1.5 h-5 mt-3">
                    {REPORT_BARS.map((h, i) => (
                      <span
                        key={i}
                        className="flex-1 rounded-sm origin-bottom"
                        style={{
                          height: `${Math.round((h / 100) * 18)}px`,
                          background: i === REPORT_BARS.length - 1 ? '#00C27A' : 'rgba(0,194,122,0.28)',
                          transform: gridInView ? 'scaleY(1)' : 'scaleY(0.2)',
                          transition: `transform 0.55s cubic-bezier(0.22, 1, 0.36, 1) ${220 + i * 70}ms`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <a href="#" className="mt-4 inline-flex items-center gap-1 accent-text text-xs font-bold">Explore →</a>
              </GlowCard>
            </TiltCard>
          </Reveal>

        </div>
      </div>
    </section>
  );
}
