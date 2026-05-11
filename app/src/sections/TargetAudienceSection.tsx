import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getSection } from '@/lib/api';

gsap.registerPlugin(ScrollTrigger);

interface AudienceCard {
  label: string;
  title: string;
  items: string[];
  cta: string;
  ctaHref: string;
}

export function TargetAudienceSection() {
  const sectionRef = useRef<HTMLElement>(null);
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
    const ctx = gsap.context(() => {
      gsap.fromTo('.uc-header', { opacity: 0, y: 28 }, {
        opacity: 1, y: 0, duration: 0.6, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', toggleActions: 'play none none reverse' },
      });
      gsap.fromTo('.uc-card', { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.5, stagger: 0.12, ease: 'power2.out',
        scrollTrigger: { trigger: '.uc-cards', start: 'top 78%', toggleActions: 'play none none reverse' },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

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
    <section ref={sectionRef} id="use-cases" className="py-28 px-6 relative">
      <div className="max-w-6xl mx-auto">

        <div className="text-center mb-6 uc-header">
          <div className="pill-s mb-5 mx-auto" style={{ width: 'fit-content' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot flex-shrink-0" style={{ background: '#00C27A' }} />
            {pillText}
          </div>
          <p className="text-[10.5px] font-bold uppercase mb-4" style={{ color: 'var(--text-faint)', letterSpacing: '0.16em' }}>{rotatingLabel}</p>
          <h2 className="font-black text-4xl lg:text-6xl mb-5" style={{ fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.1, color: 'var(--text)' }}>
            {headline1}<br/>
            <span className="text-gradient" style={{ display: 'inline-block', paddingBottom: 6, transition: 'opacity 0.4s ease' }}>{dynamicWord}</span>
          </h2>
          <p className="text-lg max-w-md mx-auto font-medium" style={{ color: 'var(--text-soft)' }}>
            {subtext}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-5 mt-14 uc-cards">
          {cards.map((card, idx) => {
            const accent = cardAccent[idx] ?? false;
            const popular = cardPopular[idx] ?? false;
            const icon = cardIcons[idx];
            return (
              <div
                key={card.label}
                className={`uc-card p-8 rounded-2xl relative flex flex-col ${accent ? 'card-accent-s' : 'card-s'}`}
                style={{ transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease' }}
                onMouseEnter={e => {
                  if (accent) return;
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = 'translateY(-4px)';
                  el.style.boxShadow = '0 10px 28px rgba(0,0,0,0.10)';
                  el.style.borderColor = 'rgba(0,194,122,0.35)';
                }}
                onMouseLeave={e => {
                  if (accent) return;
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = '';
                  el.style.boxShadow = '';
                  el.style.borderColor = '';
                }}
              >
                {popular && (
                  <div className="absolute top-5 right-5">
                    <span className="pill-s text-[10.5px]" style={{ padding: '3px 11px', background: '#0A0A0A', color: '#00FF88', borderColor: '#0A0A0A', fontSize: '10.5px' }}>Most Popular</span>
                  </div>
                )}
                <div className="icon-badge-s mb-5" style={accent ? { background: '#00C27A', color: '#0A0A0A', borderColor: '#00C27A', width: 44, height: 44 } : { width: 44, height: 44 }}>
                  {icon}
                </div>
                <span className="text-[11px] uppercase font-bold" style={{ color: accent ? '#00A868' : 'var(--text-faint)', letterSpacing: '0.14em' }}>{card.label}</span>
                <h3 className="font-black text-2xl mt-3 mb-5" style={{ fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, color: 'var(--text)', whiteSpace: 'pre-line' }}>{card.title}</h3>
                <div className="flex-1">
                  {card.items.map(item => (
                    <div key={item} className="check-item-s">{item}</div>
                  ))}
                </div>
                <a href={card.ctaHref} className="mt-6 inline-flex items-center gap-1.5 accent-text text-sm font-bold">{card.cta}</a>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
