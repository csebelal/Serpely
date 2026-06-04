import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useSEOMeta } from '@/hooks/useSEOMeta';
import { injectSchema, removeSchema } from '@/lib/schema';

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    num: '01',
    title: 'Connect',
    description: 'Connect your website and analytics accounts in minutes. Our AI automatically begins analyzing your site and collecting baseline data.',
    icon: 'M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1',
  },
  {
    num: '02',
    title: 'Monitor',
    description: 'Our agents continuously track rankings, traffic, and technical health 24/7 — so you never miss an important change.',
    icon: 'M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 0-2 2h-2a2 2 0 0 0-2-2z',
  },
  {
    num: '03',
    title: 'Prioritize',
    description: 'Receive AI-powered recommendations ordered by impact. Know exactly what to fix and what to publish next for maximum growth.',
    icon: 'M13 2 4 14h6l-1 8 9-12h-6z',
  },
  {
    num: '04',
    title: 'Improve',
    description: 'Generate beautiful reports that show your progress, prove ROI to stakeholders, and keep the whole team aligned.',
    icon: 'M4 19h16M7 15V9M12 15V5M17 15v-3',
  },
];

const benefits = [
  { stat: '12+', label: 'hours saved weekly', title: 'Save Time', description: 'Automate routine SEO tasks and free up your team to focus on strategy.', icon: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  { stat: '+34%', label: 'average visibility lift', title: 'Increase Visibility', description: 'Stay ahead of algorithm changes and competitor moves with real-time monitoring.', icon: 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
  { stat: '3×', label: 'faster ROI', title: 'Prove ROI', description: 'Comprehensive reports that clearly demonstrate the value of your SEO efforts.', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z' },
];

const featureList = [
  { text: 'Continuous rank tracking across all major search engines', icon: 'M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 0-2 2h-2a2 2 0 0 0-2-2z' },
  { text: 'Automated technical audits that catch issues early', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  { text: 'Content scoring that identifies optimization opportunities', icon: 'M13 2 4 14h6l-1 8 9-12h-6z' },
  { text: 'Smart alerts for significant changes or issues', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9' },
  { text: 'Weekly progress reports delivered to your inbox', icon: 'M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z' },
];

export function HowItWorks() {
  useSEOMeta('how-it-works', { title: 'How It Works — Serpely', description: 'See how Serpely\'s agentic SEO workflows track, audit, and improve your AI search visibility.' });
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    injectSchema('schema-how-it-works', {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to Use Serpely — Agentic SEO in 4 Steps',
      description: "How Serpely's AI-powered platform transforms your SEO workflow from manual effort to automated growth.",
      totalTime: 'PT5M',
      step: steps.map(s => ({
        '@type': 'HowToStep',
        position: parseInt(s.num),
        name: s.title,
        text: s.description,
      })),
    });
    return () => removeSchema('schema-how-it-works');
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.hiw-hero-content', { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out', delay: 0.1 });

      gsap.fromTo('.hiw-step-card', { opacity: 0, y: 36 }, {
        opacity: 1, y: 0, duration: 0.55, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: '.hiw-steps-grid', start: 'top 75%', toggleActions: 'play none none reverse' },
      });

      gsap.fromTo('.hiw-stat-card', { opacity: 0, y: 28 }, {
        opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: '.hiw-stats-grid', start: 'top 78%', toggleActions: 'play none none reverse' },
      });

      gsap.fromTo('.hiw-feature-item', { opacity: 0, x: -20 }, {
        opacity: 1, x: 0, duration: 0.45, stagger: 0.08, ease: 'power3.out',
        scrollTrigger: { trigger: '.hiw-features-section', start: 'top 75%', toggleActions: 'play none none reverse' },
      });

      gsap.fromTo('.hiw-cta-block', { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.55, ease: 'power3.out',
        scrollTrigger: { trigger: '.hiw-cta-block', start: 'top 82%', toggleActions: 'play none none reverse' },
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageRef} style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,194,122,0.09) 0%, transparent 70%)' }} />
        <div className="hiw-hero-content max-w-3xl mx-auto relative z-10">
          <span className="pill-s mb-5 inline-flex">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#00C27A' }} />
            How It Works
          </span>
          <h1 className="font-black mb-5" style={{ fontSize: 'clamp(26px,5vw,60px)', fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.045em' }}>
            Agentic SEO in{' '}
            <span className="text-gradient">4 simple steps</span>
          </h1>
          <p className="font-medium mb-8 max-w-xl mx-auto" style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--text-soft)' }}>
            Discover how Serpely's AI-powered platform transforms your SEO workflow from manual effort to automated growth.
          </p>
          <Link to="/pricing" className="btn-accent-s inline-flex">
            Start Free Trial
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 ml-1.5" fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
          </Link>
        </div>
      </section>

      {/* ── Steps grid ── */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="hiw-steps-grid grid sm:grid-cols-2 gap-5">
            {steps.map((step, i) => (
              <div
                key={i}
                className="hiw-step-card group"
                style={{
                  borderRadius: 20,
                  padding: '28px 28px 26px',
                  background: 'var(--card-bg)',
                  border: '1px solid hsl(var(--border))',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
                  cursor: 'default',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,194,122,0.10), 0 4px 16px rgba(0,0,0,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(0,194,122,0.35)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = 'hsl(var(--border))';
                }}
              >
                <div className="flex items-start justify-between mb-5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg,rgba(0,194,122,0.14),rgba(0,194,122,0.04))',
                      border: '1px solid rgba(0,194,122,0.25)',
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#00C27A" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
                      <path d={step.icon} />
                    </svg>
                  </div>
                  <span
                    className="font-black"
                    style={{ fontSize: 38, lineHeight: 1, letterSpacing: '-0.06em', color: 'hsl(var(--border))', userSelect: 'none', transition: 'color 0.2s' }}
                    ref={el => {
                      if (el) {
                        el.closest('.hiw-step-card')?.addEventListener('mouseenter', () => { el.style.color = 'rgba(0,194,122,0.25)'; });
                        el.closest('.hiw-step-card')?.addEventListener('mouseleave', () => { el.style.color = 'hsl(var(--border))'; });
                      }
                    }}
                  >
                    {step.num}
                  </span>
                </div>
                <h3 className="font-black text-lg mb-2.5" style={{ color: 'var(--text)', letterSpacing: '-0.025em' }}>{step.title}</h3>
                <p className="font-medium leading-relaxed" style={{ fontSize: 14, color: 'var(--text-soft)' }}>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-20 px-6" style={{ borderTop: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))', background: 'var(--bg-subtle)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="pill-s inline-flex mb-4">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#00C27A' }} />
              Real Results
            </span>
            <h2 className="font-black" style={{ fontSize: 'clamp(24px,3vw,36px)', fontWeight: 900, letterSpacing: '-0.04em' }}>
              Numbers that speak for themselves
            </h2>
          </div>
          <div className="hiw-stats-grid grid md:grid-cols-3 gap-5">
            {benefits.map((b, i) => (
              <div
                key={i}
                className="hiw-stat-card"
                style={{
                  borderRadius: 20,
                  padding: '28px 24px',
                  background: 'var(--card-bg)',
                  border: '1px solid hsl(var(--border))',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
                  textAlign: 'center',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,194,122,0.10), 0 4px 16px rgba(0,0,0,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(0,194,122,0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = 'hsl(var(--border))';
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg,rgba(0,194,122,0.14),rgba(0,194,122,0.04))', border: '1px solid rgba(0,194,122,0.25)' }}>
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#00C27A" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
                    <path d={b.icon} />
                  </svg>
                </div>
                <p className="font-black mb-1 text-gradient" style={{ fontSize: 44, lineHeight: 1, letterSpacing: '-0.05em' }}>{b.stat}</p>
                <p className="text-[11px] font-bold uppercase mb-4" style={{ color: 'var(--text-faint)', letterSpacing: '0.1em' }}>{b.label}</p>
                <h3 className="font-black text-base mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>{b.title}</h3>
                <p className="font-medium leading-relaxed" style={{ fontSize: 13.5, color: 'var(--text-soft)' }}>{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="hiw-features-section py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left copy */}
            <div>
              <span className="pill-s inline-flex mb-5">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#00C27A' }} />
                Always On
              </span>
              <h2 className="font-black mb-4" style={{ fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em' }}>
                AI that works<br/>
                <span className="text-gradient">while you sleep</span>
              </h2>
              <p className="font-medium leading-relaxed" style={{ fontSize: 15.5, color: 'var(--text-soft)', lineHeight: 1.65 }}>
                Serpely's AI agents constantly work in the background — monitoring your website, analyzing data, and identifying opportunities. Wake up to actionable insights every morning.
              </p>
            </div>

            {/* Right feature list */}
            <div className="flex flex-col gap-3">
              {featureList.map((f, i) => (
                <div
                  key={i}
                  className="hiw-feature-item"
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    padding: '14px 16px',
                    borderRadius: 14,
                    background: 'var(--card-bg)',
                    border: '1px solid hsl(var(--border))',
                    transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.borderColor = 'rgba(0,194,122,0.35)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,194,122,0.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.borderColor = 'hsl(var(--border))';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5" style={{ background: 'linear-gradient(135deg,rgba(0,194,122,0.14),rgba(0,194,122,0.04))', border: '1px solid rgba(0,194,122,0.22)' }}>
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="#00C27A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={f.icon} />
                    </svg>
                  </span>
                  <span className="font-medium" style={{ fontSize: 14, color: 'var(--text-soft)', lineHeight: 1.5 }}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="hiw-cta-block cta-dark-s rounded-[24px] p-10 lg:p-14 text-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(0,194,122,0.12) 0%, transparent 70%)' }} />
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase mb-5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,194,122,0.15)', border: '1px solid rgba(0,194,122,0.3)', color: '#00C27A', letterSpacing: '0.1em' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00C27A' }} />
                Start Today
              </span>
              <h2 className="font-black mb-4" style={{ fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', color: '#fff' }}>
                Ready to transform your SEO?
              </h2>
              <p className="mb-8 mx-auto max-w-lg font-medium" style={{ fontSize: 15, lineHeight: 1.65, color: 'rgba(255,255,255,0.6)' }}>
                Join thousands of teams using Serpely to automate their SEO workflow and achieve measurable growth.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/pricing" className="btn-accent-s">
                  Start Free Trial
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 ml-1" fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                </Link>
                <Link to="/features" className="btn-secondary-s" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}>
                  Explore Features
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
