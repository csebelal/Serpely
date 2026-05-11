import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getSection } from '@/lib/api';

gsap.registerPlugin(ScrollTrigger);

export function ProblemSolutionSection() {
  const sectionRef = useRef<HTMLElement>(null);

  const [pillText, setPillText] = useState('AI Search Visibility Gap');
  const [headline1, setHeadline1] = useState('Stop Losing Traffic to');
  const [headline2, setHeadline2] = useState('AI Search');
  const [subtext, setSubtext] = useState('Serpely powers Agentic SEO and Generative Engine Optimization so you stay visible across Google and LLM-driven results.');
  const [problemLabel, setProblemLabel] = useState("What's Costing Your Rankings");
  const [problemItems, setProblemItems] = useState<string[]>([
    "Your organic traffic dropped after AI Overviews launched and you still don't know which keywords triggered it or why",
    "Your competitors appear when people ask ChatGPT or Perplexity about your category. Your brand doesn't.",
    "You're publishing content but have no idea if AI crawlers are indexing it or ignoring it entirely",
    "Your last SEO audit is already outdated. You don't know what broke since then",
  ]);
  const [statNum, setStatNum] = useState('40%');
  const [statLabel, setStatLabel] = useState('of searches');
  const [statDesc, setStatDesc] = useState("Now get answered by AI without a click. Traditional SEO tools can't track that.");
  const [solutionLabel, setSolutionLabel] = useState('The Serpely Agentic SEO System');
  const [solutionHeadline, setSolutionHeadline] = useState('Four engines, one\nagentic loop.');
  const [solutionBody, setSolutionBody] = useState('Continuous Agentic SEO workflows built for measurable search growth. From keyword intelligence to LLM-driven visibility, one unified SEO operating system.');
  const [engineTitles, setEngineTitles] = useState<string[]>(['Daily AI Audit', 'AI Citation Monitor', 'GEO Score', 'Content Prioritization']);
  const [engineDescs, setEngineDescs] = useState<string[]>([
    'On-page, off-page, and technical SEO audited every day. Wake up to a prioritized fix list.',
    'Tracks citations across ChatGPT, Perplexity, Gemini, and Google AI Overviews.',
    'Every page scored 0–100 for AI visibility and citation eligibility. Updated continuously.',
    'Identifies pages to refresh first, scored by traffic decay, GEO Score, and keyword movement.',
  ]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.prob-sol-reveal', { opacity: 0, y: 28 }, {
        opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', toggleActions: 'play none none reverse' },
      });
      gsap.fromTo('.prob-sol-engine', { opacity: 0, y: 18 }, {
        opacity: 1, y: 0, duration: 0.45, stagger: 0.09, ease: 'power2.out',
        scrollTrigger: { trigger: '.prob-sol-engines', start: 'top 78%', toggleActions: 'play none none reverse' },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    getSection('problem-solution').then(r => {
      const d = r.data.data as Record<string, unknown>;
      if (typeof d.pillText === 'string') setPillText(d.pillText);
      if (typeof d.headline1 === 'string') setHeadline1(d.headline1);
      if (typeof d.headline2 === 'string') setHeadline2(d.headline2);
      if (typeof d.subtext === 'string') setSubtext(d.subtext);
      if (typeof d.problemLabel === 'string') setProblemLabel(d.problemLabel);
      if (Array.isArray(d.problemItems)) setProblemItems(d.problemItems as string[]);
      if (typeof d.statNum === 'string') setStatNum(d.statNum);
      if (typeof d.statLabel === 'string') setStatLabel(d.statLabel);
      if (typeof d.statDesc === 'string') setStatDesc(d.statDesc);
      if (typeof d.solutionLabel === 'string') setSolutionLabel(d.solutionLabel);
      if (typeof d.solutionHeadline === 'string') setSolutionHeadline(d.solutionHeadline);
      if (typeof d.solutionBody === 'string') setSolutionBody(d.solutionBody);
      if (Array.isArray(d.engineTitles)) setEngineTitles(d.engineTitles as string[]);
      if (Array.isArray(d.engineDescs)) setEngineDescs(d.engineDescs as string[]);
    }).catch(() => {});
  }, []);

  const engineIcons = [
    <svg key="0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/></svg>,
    <svg key="1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11c0 5-9 11-9 11s-9-6-9-11a9 9 0 0 1 18 0z"/><circle cx="12" cy="11" r="3"/></svg>,
    <svg key="2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="9"/></svg>,
    <svg key="3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>,
  ];

  const engines = engineTitles.map((title, i) => ({
    icon: engineIcons[i] ?? engineIcons[0],
    title,
    desc: engineDescs[i] ?? '',
  }));

  return (
    <section ref={sectionRef} id="problem-solution" className="pt-16 pb-28 px-6 relative section-band-accent-s">
      <div className="max-w-7xl mx-auto">

        <div className="text-center mb-20 prob-sol-reveal">
          <div className="pill-s mb-5 mx-auto" style={{ width: 'fit-content' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot flex-shrink-0" style={{ background: '#00C27A' }} />
            {pillText}
          </div>
          <h2 className="font-black text-4xl lg:text-6xl mb-5" style={{ fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.05, color: 'var(--text)' }}>
            {headline1}<br/>
            <span className="text-gradient" style={{ display: 'inline-block', paddingBottom: 6 }}>{headline2}</span>
          </h2>
          <p className="text-lg max-w-xl mx-auto font-medium" style={{ color: 'var(--text-soft)' }}>
            {subtext}
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 items-stretch">

          {/* LEFT: Problem */}
          <div className="lg:col-span-5 prob-sol-reveal">
            <div className="card-s p-8 h-full" style={{ background: 'var(--bg-subtle)' }}>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-[11px] uppercase font-bold text-red-600" style={{ letterSpacing: '0.14em' }}>{problemLabel}</span>
              </div>
              <div className="space-y-2">
                {problemItems.map((item, i) => (
                  <div key={i} className="x-item-s">{item}</div>
                ))}
              </div>
              <div className="mt-7 p-5 rounded-xl border" style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-extrabold text-4xl text-red-600" style={{ letterSpacing: '-0.04em' }}>{statNum}</span>
                  <span className="text-[11px] text-red-600 uppercase font-bold" style={{ letterSpacing: '0.1em' }}>{statLabel}</span>
                </div>
                <p className="text-sm leading-relaxed font-medium" style={{ color: 'var(--text-soft)' }}>{statDesc}</p>
              </div>
            </div>
          </div>

          {/* RIGHT: Solution */}
          <div className="lg:col-span-7 prob-sol-reveal" style={{ transitionDelay: '0.12s' }}>
            <div className="card-accent-s p-8 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: '#00C27A' }} />
                <span className="text-[11px] uppercase font-bold accent-text" style={{ letterSpacing: '0.14em' }}>{solutionLabel}</span>
              </div>
              <h3 className="font-black text-3xl lg:text-4xl mb-7" style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.08, color: 'var(--text)', paddingBottom: 4, whiteSpace: 'pre-line' }}>
                {solutionHeadline}
              </h3>

              <div className="grid grid-cols-2 gap-3 mb-7 prob-sol-engines">
                {engines.map((item, idx) => (
                  <div
                    key={idx}
                    className="card-s prob-sol-engine"
                    style={{ padding: '16px', cursor: 'default', transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease' }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.transform = 'translateY(-3px)';
                      el.style.boxShadow = '0 8px 24px rgba(0,194,122,0.14)';
                      el.style.borderColor = 'rgba(0,194,122,0.45)';
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.transform = '';
                      el.style.boxShadow = '';
                      el.style.borderColor = '';
                    }}
                  >
                    <div className="icon-badge-s icon-accent-s mb-3" style={{ width: 40, height: 40 }}>
                      <span className="w-5 h-5">{item.icon}</span>
                    </div>
                    <div className="font-bold text-sm mb-1.5" style={{ color: 'var(--text)' }}>{item.title}</div>
                    <div className="text-xs leading-snug font-medium" style={{ color: 'var(--text-soft)' }}>{item.desc}</div>
                  </div>
                ))}
              </div>

              <p className="text-sm leading-relaxed font-medium mt-auto" style={{ color: 'var(--text-soft)' }}>
                {solutionBody}
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
