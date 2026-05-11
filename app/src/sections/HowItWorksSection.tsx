import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getSection } from '@/lib/api';

gsap.registerPlugin(ScrollTrigger);

interface StepType {
  num: string;
  title: string;
  desc: string;
  tags: string[];
  accent: boolean;
}

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);

  const [pillText, setPillText] = useState('How It Works');
  const [headline, setHeadline] = useState('A Continuous SEO\nWorkflow');
  const [subtext, setSubtext] = useState('Four stages that run automatically, surface the right actions, and help you ship improvements faster.');
  const [loopCardTitle, setLoopCardTitle] = useState('Closed Loop System');
  const [loopCardBody, setLoopCardBody] = useState('After each cycle, the system learns. Outputs from Improve feed back into Monitor, refining what gets prioritized next.');
  const [steps, setSteps] = useState<StepType[]>([
    {
      num: '1',
      title: 'Monitor',
      desc: 'Track keyword rankings, Core Web Vitals, backlinks, and AI citation signals across Google and LLM search engines, all in one dashboard.',
      tags: ['Rank Tracking', 'GEO Signals'],
      accent: false,
    },
    {
      num: '2',
      title: 'Analyze',
      desc: 'Identify keyword gaps, content decay, technical errors, and competitor movements. Understand exactly why rankings shift before they hurt you.',
      tags: ['Gap Analysis', 'Insights'],
      accent: false,
    },
    {
      num: '3',
      title: 'Prioritize',
      desc: "AI-powered scoring tells you which pages need attention most. Not a firehose of data — a clear, ranked action queue your team can actually act on.",
      tags: ['Action Queue', 'AI Scoring'],
      accent: false,
    },
    {
      num: '4',
      title: 'Improve',
      desc: 'Apply AI-suggested fixes, track the impact, and generate reports that prove SEO value. Then the loop restarts, automatically.',
      tags: ['Auto Reports', 'Loop'],
      accent: true,
    },
  ]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.hiw-header', { opacity: 0, y: 28 }, {
        opacity: 1, y: 0, duration: 0.6, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', toggleActions: 'play none none reverse' },
      });
      gsap.fromTo('.hiw-step', { opacity: 0, x: 18 }, {
        opacity: 1, x: 0, duration: 0.45, stagger: 0.1, ease: 'power2.out',
        scrollTrigger: { trigger: '.hiw-steps', start: 'top 75%', toggleActions: 'play none none reverse' },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    getSection('how-it-works').then(r => {
      const d = r.data.data as Record<string, unknown>;
      if (typeof d.pillText === 'string') setPillText(d.pillText);
      if (typeof d.headline === 'string') setHeadline(d.headline);
      if (typeof d.subtext === 'string') setSubtext(d.subtext);
      if (typeof d.loopCardTitle === 'string') setLoopCardTitle(d.loopCardTitle);
      if (typeof d.loopCardBody === 'string') setLoopCardBody(d.loopCardBody);
      if (Array.isArray(d.steps)) setSteps(d.steps as StepType[]);
    }).catch(() => {});
  }, []);

  const stepsWithAccent = steps.map((s, i) => ({ ...s, accent: i === steps.length - 1 }));

  return (
    <section ref={sectionRef} id="how-it-works" className="py-28 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">

          {/* Left — sticky */}
          <div className="hiw-header lg:sticky lg:top-28">
            <div className="pill-s mb-5" style={{ width: 'fit-content' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot flex-shrink-0" style={{ background: '#00C27A' }} />
              {pillText}
            </div>
            <h2 className="font-black text-4xl lg:text-6xl mb-5" style={{ fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.05, color: 'var(--text)', whiteSpace: 'pre-line' }}>
              {headline.split('\n').map((line, i, arr) => (
                i < arr.length - 1
                  ? <span key={i}>{line}<br/></span>
                  : <span key={i} className="text-gradient" style={{ display: 'inline-block', paddingBottom: 6 }}>{line}</span>
              ))}
            </h2>
            <p className="text-lg max-w-md mb-8 font-medium" style={{ color: 'var(--text-soft)' }}>
              {subtext}
            </p>
            <div className="card-s p-5 max-w-sm">
              <div className="flex items-center gap-2 mb-3">
                <svg width="20" height="11" viewBox="0 0 36 20" fill="none">
                  <path d="M9 4 C 4 4 1 7 1 10 C 1 13 4 16 9 16 C 14 16 18 4 27 4 C 32 4 35 7 35 10 C 35 13 32 16 27 16 C 18 16 14 4 9 4 Z" stroke="#00C27A" strokeWidth="2.4"/>
                </svg>
                <span className="text-[11px] uppercase font-bold accent-text" style={{ letterSpacing: '0.14em' }}>{loopCardTitle}</span>
              </div>
              <p className="text-sm leading-relaxed font-medium" style={{ color: 'var(--text-soft)' }}>
                {loopCardBody}
              </p>
            </div>
          </div>

          {/* Right — steps */}
          <div className="space-y-5 relative hiw-steps">
            <div className="absolute left-7 top-2 bottom-2 w-px hidden md:block" style={{ background: 'linear-gradient(180deg, transparent, #00C27A 20%, #00C27A 80%, transparent)' }} />

            {stepsWithAccent.map((step) => (
              <div key={step.num} className="hiw-step flex gap-5 relative">
                <div
                  className="flex-shrink-0 z-10 w-14 h-14 rounded-[14px] flex items-center justify-center font-black text-[22px]"
                  style={step.accent
                    ? { background: '#00C27A', color: '#0A0A0A', letterSpacing: '-0.04em' }
                    : { background: 'var(--text)', color: 'var(--bg)', letterSpacing: '-0.04em' }}
                >
                  {step.num}
                </div>
                <div
                  className={`p-6 flex-1 rounded-2xl ${step.accent ? 'card-accent-s' : 'card-s'}`}
                  style={{ transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease' }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = 'translateY(-3px)';
                    el.style.boxShadow = step.accent
                      ? '0 10px 28px rgba(0,194,122,0.18)'
                      : '0 8px 24px rgba(0,0,0,0.10)';
                    if (!step.accent) el.style.borderColor = 'rgba(0,194,122,0.35)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = '';
                    el.style.boxShadow = '';
                    el.style.borderColor = '';
                  }}
                >
                  <h3 className="font-extrabold text-xl mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.025em' }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed mb-4 font-medium" style={{ color: step.accent ? 'var(--text-mid)' : 'var(--text-soft)' }}>{step.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {step.tags.map(tag => (
                      <span key={tag} className={step.accent ? 'tag-accent-s tag-s' : 'tag-s'}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
