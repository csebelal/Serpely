import { useEffect, useState } from 'react';
import { getSection } from '@/lib/api';
import { CountUp, GlowCard, Reveal, useMotionPrefs } from '@/components/motion';

export function ProblemSolutionSection() {
  const { reducedMotion } = useMotionPrefs();

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
    <section id="problem-solution" className="pt-16 pb-28 px-6 relative section-band-accent-s">
      <div className="max-w-7xl mx-auto">

        <Reveal className="text-center mb-20">
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
        </Reveal>

        <div className="grid lg:grid-cols-12 gap-6 items-stretch">

          {/* LEFT: Problem */}
          <Reveal className="lg:col-span-5" delay={60}>
            <div className="card-s p-8 h-full flex flex-col" style={{ background: 'var(--bg-subtle)' }}>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-[11px] uppercase font-bold text-red-600" style={{ letterSpacing: '0.14em' }}>{problemLabel}</span>
              </div>
              <div className="space-y-2 flex-1">
                {problemItems.map((item, i) => (
                  <Reveal key={i} delay={90 + i * 75} y={14}>
                    <div className="x-item-s">{item}</div>
                  </Reveal>
                ))}
              </div>
              <div className="mt-7 p-5 rounded-xl border" style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-extrabold text-4xl text-red-600" style={{ letterSpacing: '-0.04em' }}>
                    <CountUp value={statNum} />
                  </span>
                  <span className="text-[11px] text-red-600 uppercase font-bold" style={{ letterSpacing: '0.1em' }}>{statLabel}</span>
                </div>
                <p className="text-sm leading-relaxed font-medium" style={{ color: 'var(--text-soft)' }}>{statDesc}</p>
              </div>
            </div>
          </Reveal>

          {/* RIGHT: Solution with animated glowing border & flowing 4-step loop pulse */}
          <Reveal className="lg:col-span-7" delay={140}>
            <GlowCard featured className="card-accent-s p-8 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: '#00C27A' }} />
                <span className="text-[11px] uppercase font-bold accent-text" style={{ letterSpacing: '0.14em' }}>{solutionLabel}</span>
              </div>
              <h3 className="font-black text-3xl lg:text-4xl mb-7" style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.08, color: 'var(--text)', paddingBottom: 4, whiteSpace: 'pre-line' }}>
                {solutionHeadline}
              </h3>

              <div className="relative mb-7">
                {/* Flowing loop connector SVG behind the 2x2 engine grid */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 400 200"
                  preserveAspectRatio="none"
                  className="hidden sm:block absolute inset-0 w-full h-full pointer-events-none"
                  style={{ opacity: 0.55 }}
                >
                  <rect
                    x="90"
                    y="45"
                    width="220"
                    height="110"
                    rx="18"
                    fill="none"
                    stroke="rgba(0, 194, 122, 0.25)"
                    strokeWidth="1.5"
                    strokeDasharray="6 6"
                  />
                  {!reducedMotion && (
                    <rect
                      x="90"
                      y="45"
                      width="220"
                      height="110"
                      rx="18"
                      fill="none"
                      stroke="#00C27A"
                      strokeWidth="2"
                      strokeDasharray="48 560"
                      strokeLinecap="round"
                    >
                      <animate attributeName="stroke-dashoffset" from="608" to="0" dur="5.5s" repeatCount="indefinite" />
                    </rect>
                  )}
                </svg>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                  {engines.map((item, idx) => (
                    <Reveal key={item.title} delay={120 + idx * 80} y={16}>
                      <div className="card-s glow-card-s h-full" style={{ padding: '16px' }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="icon-badge-s icon-accent-s" style={{ width: 40, height: 40 }}>
                            <span className="w-5 h-5">{item.icon}</span>
                          </div>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,194,122,0.10)', color: '#00A868' }}>
                            0{idx + 1}
                          </span>
                        </div>
                        <div className="font-bold text-sm mb-1.5" style={{ color: 'var(--text)' }}>{item.title}</div>
                        <div className="text-xs leading-snug font-medium" style={{ color: 'var(--text-soft)' }}>{item.desc}</div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>

              <p className="text-sm leading-relaxed font-medium mt-auto" style={{ color: 'var(--text-soft)' }}>
                {solutionBody}
              </p>
            </GlowCard>
          </Reveal>

        </div>
      </div>
    </section>
  );
}
