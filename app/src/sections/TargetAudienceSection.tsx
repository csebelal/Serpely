import { useEffect, useRef, useState } from 'react';
import { getSection } from '@/lib/api';
import { GlowCard, Reveal, useInViewOnce, useMotionPrefs } from '@/components/motion';

interface AudienceCard {
  label: string;
  title: string;
  items: string[];
  cta: string;
  ctaHref: string;
}

export function TargetAudienceSection() {
  const cardsRef = useRef<HTMLDivElement>(null);
  const cardsInView = useInViewOnce(cardsRef, { threshold: 0.12 });
  const { reducedMotion } = useMotionPrefs();

  const [dynamicWord, setDynamicWord] = useState('Modern SEO Teams');
  const [pillText, setPillText] = useState('Solutions');
  const [rotatingLabel, setRotatingLabel] = useState('Built for your workflow');
  const [words, setWords] = useState<string[]>(['Modern SEO Teams', 'Growing Agencies', 'AI-First Startups', 'Enterprise Brands']);
  const [headline1, setHeadline1] = useState('Serpely is built for');
  const [subtext, setSubtext] = useState('Tailored Agentic SEO workflows for agencies, startups, and enterprise teams.');
  const [cards, setCards] = useState<AudienceCard[]>([
    {
      label: 'For Agencies',
      title: 'Scale client SEO\nwithout the overhead.',
      items: ['Multi-client AI SEO workspaces', 'White-label GEO & LLM reporting', 'Bulk keyword rank tracking', 'AI visibility dashboards per client', 'Automated SEO reporting software'],
      cta: 'Get started for agencies →',
      ctaHref: '#',
    },
    {
      label: 'For Startups',
      title: 'Grow SEO like a\nteam 10x your size.',
      items: ['AI SEO agent for fast growth', 'Automated keyword gap analysis', 'Real-time AI search tracking', 'AI-powered content optimization', 'Scalable SEO automation platform'],
      cta: 'Get started for startups →',
      ctaHref: '#',
    },
    {
      label: 'For Enterprise',
      title: 'Enterprise-grade SEO\nat every scale.',
      items: ['Granular SEO roles and permissions', 'Enterprise AI SEO platform', 'Technical SEO audit & compliance logs', 'Generative Engine Optimization (GEO) tools', 'LLM SEO monitoring & API integration'],
      cta: 'Talk to enterprise sales →',
      ctaHref: '#',
    },
  ]);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % words.length;
      setDynamicWord(words[i]);
    }, 3200);
    return () => clearInterval(interval);
  }, [words]);

  useEffect(() => {
    getSection('target-audience').then(r => {
      const d = r.data.data as Record<string, unknown>;
      if (typeof d.pillText === 'string') setPillText(d.pillText);
      if (typeof d.rotatingLabel === 'string') setRotatingLabel(d.rotatingLabel);
      if (Array.isArray(d.words)) {
        setWords(d.words as string[]);
        setDynamicWord((d.words as string[])[0] ?? 'Modern SEO Teams');
      }
      if (typeof d.headline1 === 'string') setHeadline1(d.headline1);
      if (typeof d.subtext === 'string') setSubtext(d.subtext);
      if (Array.isArray(d.cards)) setCards(d.cards as AudienceCard[]);
    }).catch(() => {});
  }, []);

  const cardIcons = [
    (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 21V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14"/>
        <path d="M16 11h2a2 2 0 0 1 2 2v8"/>
        <path d="M8 9h4M8 13h4M8 17h4"/>
      </svg>
    ),
    (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 19c3-1 5-3 6-6 1-3 3-5 8-8-1 5-3 7-6 8-3 1-5 3-6 6z"/>
        <path d="M14 10l4 4"/>
      </svg>
    ),
    (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/>
      </svg>
    ),
  ];

  const cardAccent = [false, true, false];
  const cardPopular = [false, true, false];

  return (
    <section id="use-cases" className="py-28 px-6 relative section-glow-edge">
      <div className="max-w-6xl mx-auto">

        <Reveal className="text-center mb-6">
          <div className="pill-s mb-5 mx-auto" style={{ width: 'fit-content' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot flex-shrink-0" style={{ background: '#00C27A' }} />
            {pillText}
          </div>
          <p className="text-[10.5px] font-bold uppercase mb-4" style={{ color: 'var(--text-faint)', letterSpacing: '0.16em' }}>{rotatingLabel}</p>
          <h2 className="font-black text-4xl lg:text-6xl mb-5" style={{ fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.1, color: 'var(--text)' }}>
            {headline1}<br/>
            <span key={dynamicWord} className="text-gradient hero-stagger" style={{ display: 'inline-block', paddingBottom: 6 }}>
              {dynamicWord}
            </span>
          </h2>
          <p className="text-lg max-w-md mx-auto font-medium" style={{ color: 'var(--text-soft)' }}>
            {subtext}
          </p>
        </Reveal>

        <div ref={cardsRef} className="grid lg:grid-cols-3 gap-5 mt-14">
          {cards.map((card, idx) => {
            const accent = cardAccent[idx] ?? false;
            const popular = cardPopular[idx] ?? false;
            const icon = cardIcons[idx];
            return (
              <Reveal key={card.label} delay={idx * 100}>
                <GlowCard
                  featured={accent}
                  className={`p-8 rounded-2xl relative flex flex-col h-full ${accent ? 'card-accent-s' : 'card-s'}`}
                >
                  {popular && (
                    <div className="absolute top-5 right-5 z-10">
                      <span className="pill-s text-[10.5px]" style={{ padding: '3px 11px', background: '#0A0A0A', color: '#00FF88', borderColor: '#0A0A0A', fontSize: '10.5px' }}>Most Popular</span>
                    </div>
                  )}
                  <div className="icon-badge-s mb-5" style={accent ? { background: '#00C27A', color: '#0A0A0A', borderColor: '#00C27A', width: 44, height: 44 } : { width: 44, height: 44 }}>
                    {icon}
                  </div>
                  <span className="text-[11px] uppercase font-bold" style={{ color: accent ? '#00A868' : 'var(--text-faint)', letterSpacing: '0.14em' }}>{card.label}</span>
                  <h3 className="font-black text-2xl mt-3 mb-5" style={{ fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, color: 'var(--text)', whiteSpace: 'pre-line' }}>{card.title}</h3>
                  <div className="flex-1 space-y-3">
                    {card.items.map((item, itemIdx) => {
                      const delayMs = idx * 80 + itemIdx * 70;
                      const drawn = reducedMotion || cardsInView;
                      return (
                        <div
                          key={item}
                          className={`flex items-center gap-3 text-sm font-medium check-item-anim ${drawn ? 'is-in' : ''}`}
                          style={{ color: 'var(--text-mid)', lineHeight: 1.45, transitionDelay: `${delayMs}ms` }}
                        >
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: '#00C27A' }}
                            aria-hidden="true"
                          >
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path
                                d="M3.5 8.5l3 3 6-6"
                                strokeDasharray={20}
                                strokeDashoffset={drawn ? 0 : 20}
                                style={{ transition: reducedMotion ? 'none' : `stroke-dashoffset 0.42s cubic-bezier(0.22, 1, 0.36, 1) ${delayMs + 120}ms` }}
                              />
                            </svg>
                          </span>
                          <span>{item}</span>
                        </div>
                      );
                    })}
                  </div>
                  <a href={card.ctaHref} className="mt-6 inline-flex items-center gap-1.5 accent-text text-sm font-bold">{card.cta}</a>
                </GlowCard>
              </Reveal>
            );
          })}
        </div>

      </div>
    </section>
  );
}
