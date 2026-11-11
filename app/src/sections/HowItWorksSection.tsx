import { useEffect, useRef, useState } from 'react';
import { getSection } from '@/lib/api';
import { GlowCard, Reveal, useMotionPrefs } from '@/components/motion';

interface StepType {
  num: string;
  title: string;
  desc: string;
  tags: string[];
  accent: boolean;
}

export function HowItWorksSection() {
  const stepsWrapRef = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useMotionPrefs();
  const [lineProgress, setLineProgress] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);

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

  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;

    const update = () => {
      raf = 0;
      const el = stepsWrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const anchor = vh * 0.58;
      const raw = (anchor - rect.top) / Math.max(rect.height, 1);
      const clamped = Math.min(1, Math.max(0, raw));
      setLineProgress(clamped);

      const children = el.querySelectorAll<HTMLElement>('.hiw-step-row');
      let current = 0;
      children.forEach((child, idx) => {
        const cr = child.getBoundingClientRect();
        if (cr.top <= anchor + 40) current = idx;
      });
      setActiveIndex(current);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion, steps.length]);

  const stepsWithAccent = steps.map((s, i) => ({ ...s, accent: i === steps.length - 1 }));

  return (
    <section id="how-it-works" className="py-28 px-6 relative section-glow-edge">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">

          {/* Left — sticky */}
          <Reveal className="lg:sticky lg:top-28">
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
            <GlowCard className="card-s p-5 max-w-sm">
              <div className="flex items-center gap-2 mb-3">
                <svg width="20" height="11" viewBox="0 0 36 20" fill="none">
                  <path d="M9 4 C 4 4 1 7 1 10 C 1 13 4 16 9 16 C 14 16 18 4 27 4 C 32 4 35 7 35 10 C 35 13 32 16 27 16 C 18 16 14 4 9 4 Z" stroke="#00C27A" strokeWidth="2.4"/>
                </svg>
                <span className="text-[11px] uppercase font-bold accent-text" style={{ letterSpacing: '0.14em' }}>{loopCardTitle}</span>
              </div>
              <p className="text-sm leading-relaxed font-medium" style={{ color: 'var(--text-soft)' }}>
                {loopCardBody}
              </p>
            </GlowCard>
          </Reveal>

          {/* Right — connected steps with scroll-drawn line */}
          <div ref={stepsWrapRef} className="space-y-5 relative">
            {/* Static guide rail */}
            <div
              aria-hidden="true"
              className="absolute left-7 top-4 bottom-4 w-[2px] hidden md:block rounded-full"
              style={{ background: 'hsl(var(--border))' }}
            />
            {/* Scroll-drawn progress rail */}
            <div
              aria-hidden="true"
              className="absolute left-7 top-4 bottom-4 w-[2px] hidden md:block rounded-full origin-top"
              style={{
                background: 'linear-gradient(180deg, #00C27A 0%, #00FF88 100%)',
                transform: `scaleY(${reducedMotion ? 1 : lineProgress})`,
                boxShadow: '0 0 12px rgba(0, 194, 122, 0.45)',
              }}
            />

            {stepsWithAccent.map((step, idx) => {
              const isHighlighted = reducedMotion ? step.accent : idx <= activeIndex;
              const isCurrent = !reducedMotion && idx === activeIndex;
              return (
                <Reveal key={step.num} delay={idx * 85} x={18} y={8} className="hiw-step-row">
                  <div className="flex gap-5 relative">
                    <div
                      className="flex-shrink-0 z-10 w-14 h-14 rounded-[14px] flex items-center justify-center font-black text-[22px] transition-all duration-300"
                      style={
                        isHighlighted || step.accent
                          ? {
                              background: '#00C27A',
                              color: '#0A0A0A',
                              letterSpacing: '-0.04em',
                              boxShadow: isCurrent ? '0 0 0 6px rgba(0, 194, 122, 0.16), 0 8px 20px rgba(0, 194, 122, 0.25)' : undefined,
                            }
                          : { background: 'var(--text)', color: 'var(--bg)', letterSpacing: '-0.04em' }
                      }
                    >
                      {step.num}
                    </div>
                    <GlowCard
                      featured={isCurrent}
                      className={`p-6 flex-1 rounded-2xl ${step.accent ? 'card-accent-s' : 'card-s'}`}
                    >
                      <h3 className="font-extrabold text-xl mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.025em' }}>{step.title}</h3>
                      <p className="text-sm leading-relaxed mb-4 font-medium" style={{ color: step.accent ? 'var(--text-mid)' : 'var(--text-soft)' }}>{step.desc}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {step.tags.map(tag => (
                          <span key={tag} className={step.accent ? 'tag-accent-s tag-s' : 'tag-s'}>{tag}</span>
                        ))}
                      </div>
                    </GlowCard>
                  </div>
                </Reveal>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}
