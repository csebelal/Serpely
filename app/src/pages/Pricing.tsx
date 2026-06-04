import { useState, useEffect, useRef } from 'react';
import { getPricing, getFaq } from '@/lib/api';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useSEOMeta } from '@/hooks/useSEOMeta';
import { injectSchema, removeSchema } from '@/lib/schema';

gsap.registerPlugin(ScrollTrigger);

const plans = [
  {
    name: 'Starter',
    badge: null,
    description: 'Perfect for individuals and small projects getting started with AI SEO.',
    monthlyPrice: 0,
    annualPrice: 0,
    cta: 'Get Started Free',
    accent: false,
    features: [
      { text: 'Up to 100 keywords', included: true },
      { text: '1 website', included: true },
      { text: 'Basic rank tracking', included: true },
      { text: 'Weekly site audits', included: true },
      { text: 'GEO Score (read-only)', included: true },
      { text: 'Email support', included: true },
      { text: 'API access', included: false },
      { text: 'AI Citation Monitor', included: false },
      { text: 'White-label reports', included: false },
      { text: 'Priority support', included: false },
    ],
  },
  {
    name: 'Professional',
    badge: 'Most Popular',
    description: 'For growing teams that need agentic SEO and AI visibility monitoring.',
    monthlyPrice: 49,
    annualPrice: 39,
    cta: 'Start Free Trial',
    accent: true,
    features: [
      { text: 'Up to 1,000 keywords', included: true },
      { text: '5 websites', included: true },
      { text: 'Daily rank tracking', included: true },
      { text: 'Daily site audits', included: true },
      { text: 'Full GEO Score dashboard', included: true },
      { text: 'Priority email support', included: true },
      { text: 'API access', included: true },
      { text: 'AI Citation Monitor', included: true },
      { text: 'White-label reports', included: false },
      { text: 'Dedicated account manager', included: false },
    ],
  },
  {
    name: 'Business',
    badge: 'Agency-Ready',
    description: 'For agencies and enterprise teams managing multiple clients at scale.',
    monthlyPrice: 99,
    annualPrice: 79,
    cta: 'Start Free Trial',
    accent: false,
    features: [
      { text: 'Unlimited keywords', included: true },
      { text: 'Unlimited websites', included: true },
      { text: 'Real-time rank tracking', included: true },
      { text: 'Continuous site audits', included: true },
      { text: 'Full GEO Score dashboard', included: true },
      { text: '24/7 priority support', included: true },
      { text: 'Full API access', included: true },
      { text: 'AI Citation Monitor', included: true },
      { text: 'White-label reports', included: true },
      { text: 'Dedicated account manager', included: true },
    ],
  },
];

const faqs = [
  {
    question: 'Can I change plans at any time?',
    answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle with prorated credits applied automatically.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes, all paid plans come with a 14-day free trial. No credit card required to start — just sign up and explore the full platform.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, Amex), PayPal, and bank transfers for annual plans.',
  },
  {
    question: 'Do you offer refunds?',
    answer: 'Yes, we offer a 30-day money-back guarantee on all paid plans. If you\'re not satisfied, contact support and we\'ll process a full refund.',
  },
  {
    question: 'How does the GEO Score work?',
    answer: 'GEO Score measures your site\'s visibility across AI search engines like ChatGPT, Perplexity, and Google AI Overviews — scored 0–100. It updates daily and tracks improvements over time.',
  },
  {
    question: 'Can I use Serpely for client reporting?',
    answer: 'Yes. The Business plan includes full white-label reporting so you can brand dashboards and automated reports with your agency\'s logo and colors.',
  },
];

export function Pricing() {
  useSEOMeta('pricing', { title: 'Pricing — Serpely', description: 'Simple, transparent pricing for agencies, startups, and enterprise SEO teams.' });
  const [isAnnual, setIsAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [livePlans, setLivePlans] = useState(plans);
  const [liveFaqs, setLiveFaqs] = useState(faqs);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    injectSchema('schema-pricing', {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Serpely',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: 'https://serpely.com',
      description: 'Agentic SEO platform with GEO Scoring and AI Citation Monitoring for the AI-first web.',
      offers: [
        {
          '@type': 'Offer',
          name: 'Starter',
          price: '0',
          priceCurrency: 'USD',
          description: 'Free plan: 100 keywords, 1 website, weekly rank tracking and audits, GEO Score read-only.',
          eligibleDuration: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
        },
        {
          '@type': 'Offer',
          name: 'Professional',
          price: '49',
          priceCurrency: 'USD',
          description: 'Professional plan: 1,000 keywords, 5 websites, daily tracking, full GEO dashboard, API access, AI Citation Monitor. $39/month billed annually.',
          eligibleDuration: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
        },
        {
          '@type': 'Offer',
          name: 'Business',
          price: '99',
          priceCurrency: 'USD',
          description: 'Business plan: unlimited keywords and websites, real-time tracking, white-label reports, dedicated account manager. $79/month billed annually.',
          eligibleDuration: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
        },
      ],
      featureList: [
        'GEO Score — AI visibility scoring 0–100 per page',
        'AI Citation Monitor — tracks ChatGPT, Perplexity, Gemini, Google AI Overviews',
        'Hallucination Alerts — detects inaccurate AI-generated brand information',
        'Daily Rank Tracking — Google and AI-driven search engines',
        'Technical Site Audit — Core Web Vitals, crawl issues, schema errors',
        'Content Prioritization — AI-scored action queue',
        'Backlink Monitoring — new and lost links with authority scoring',
        'White-Label Reporting — branded dashboards and automated reports',
      ],
    });
    return () => removeSchema('schema-pricing');
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.pr-hero', { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out', delay: 0.1 });
      gsap.fromTo('.pr-card', { opacity: 0, y: 36 }, {
        opacity: 1, y: 0, duration: 0.55, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: '.pr-cards-grid', start: 'top 78%', toggleActions: 'play none none reverse' },
      });
      gsap.fromTo('.pr-perk', { opacity: 0, y: 16 }, {
        opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out',
        scrollTrigger: { trigger: '.pr-perks-grid', start: 'top 80%', toggleActions: 'play none none reverse' },
      });
      gsap.fromTo('.pr-enterprise', { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.55, ease: 'power3.out',
        scrollTrigger: { trigger: '.pr-enterprise', start: 'top 82%', toggleActions: 'play none none reverse' },
      });
      gsap.fromTo('.pr-faq-item', { opacity: 0, x: -16 }, {
        opacity: 1, x: 0, duration: 0.38, stagger: 0.07, ease: 'power2.out',
        scrollTrigger: { trigger: '.pr-faq-list', start: 'top 80%', toggleActions: 'play none none reverse' },
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    getPricing().then(r => {
      if (r.data.length > 0)
        setLivePlans(r.data.map(p => ({
          name: p.name, badge: p.badge || null, description: p.description,
          monthlyPrice: p.monthlyPrice, annualPrice: p.annualPrice,
          cta: p.ctaLabel, accent: p.isFeatured, features: p.features,
        })));
    }).catch(() => {});
    getFaq('pricing').then(r => {
      if (r.data.length > 0)
        setLiveFaqs(r.data.map(f => ({ question: f.question, answer: f.answer })));
    }).catch(() => {});
  }, []);

  return (
    <div ref={pageRef} style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Hero ── */}
      <section className="pt-32 pb-16 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,194,122,0.07) 0%, transparent 70%)',
        }} />
        <div className="pr-hero max-w-3xl mx-auto relative">
          <span className="pill-s mb-6 inline-flex">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#00C27A' }} />
            Simple, Transparent Pricing
          </span>
          <h1 className="font-display mb-5" style={{ fontSize: 'clamp(26px,5vw,58px)', fontWeight: 900, lineHeight: 1.06, letterSpacing: '-0.045em' }}>
            The right plan for{' '}
            <span className="text-gradient">every team.</span>
          </h1>
          <p className="font-medium mb-10 mx-auto max-w-xl" style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--text-soft)' }}>
            All plans include a 14-day free trial. No credit card required.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 rounded-2xl px-4 py-2" style={{ background: 'var(--card-bg)', border: '1px solid hsl(var(--border))' }}>
            <button
              onClick={() => setIsAnnual(false)}
              className="px-4 py-1.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: !isAnnual ? 'var(--text)' : 'transparent',
                color: !isAnnual ? 'var(--bg)' : 'var(--text-soft)',
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className="px-4 py-1.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
              style={{
                background: isAnnual ? 'var(--text)' : 'transparent',
                color: isAnnual ? 'var(--bg)' : 'var(--text-soft)',
              }}
            >
              Annual
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md" style={{ background: '#00C27A', color: '#fff' }}>−20%</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Pricing Cards ── */}
      <section className="pt-8 pb-20 px-6">
        <div className="pr-cards-grid max-w-5xl mx-auto grid lg:grid-cols-3 gap-5 items-stretch">
          {livePlans.map((plan, idx) => {
            const featured = plan.accent;
            return (
              <div
                key={plan.name}
                className="pr-card flex flex-col"
                style={{
                  borderRadius: 20,
                  padding: '28px 26px 26px',
                  background: 'var(--card-bg)',
                  border: featured ? 'none' : '1px solid hsl(var(--border))',
                  boxShadow: featured
                    ? '0 0 0 2px #00C27A, 0 20px 60px rgba(0,194,122,0.12), 0 4px 20px rgba(0,0,0,0.06)'
                    : '0 2px 12px rgba(0,0,0,0.04)',
                  transition: 'transform 0.22s ease, box-shadow 0.22s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = featured
                    ? '0 0 0 2px #00C27A, 0 28px 72px rgba(0,194,122,0.18), 0 8px 24px rgba(0,0,0,0.08)'
                    : '0 16px 48px rgba(0,194,122,0.10), 0 4px 16px rgba(0,0,0,0.06)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = featured
                    ? '0 0 0 2px #00C27A, 0 20px 60px rgba(0,194,122,0.12), 0 4px 20px rgba(0,0,0,0.06)'
                    : '0 2px 12px rgba(0,0,0,0.04)';
                }}
              >
                  {/* Top row: plan name + badge */}
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
                        style={{
                          background: featured
                            ? 'linear-gradient(135deg,rgba(0,194,122,0.18),rgba(0,194,122,0.06))'
                            : 'var(--tag-bg)',
                          border: featured ? '1px solid rgba(0,194,122,0.3)' : '1px solid hsl(var(--border))',
                        }}
                      >
                        {idx === 0 && (
                          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke={featured ? '#00C27A' : 'var(--text-soft)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                          </svg>
                        )}
                        {idx === 1 && (
                          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#00C27A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M13 2 4 14h6l-1 8 9-12h-6z"/>
                          </svg>
                        )}
                        {idx === 2 && (
                          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke={featured ? '#00C27A' : 'var(--text-soft)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                        )}
                      </div>
                      <p className="font-black text-sm" style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}>{plan.name}</p>
                    </div>
                    {plan.badge && (
                      <span
                        className="text-[10px] font-black px-2.5 py-1 rounded-full"
                        style={featured
                          ? { background: '#00C27A', color: '#fff', letterSpacing: '0.04em' }
                          : { background: 'var(--tag-bg)', color: 'var(--text-soft)', border: '1px solid hsl(var(--border))', letterSpacing: '0.04em' }
                        }
                      >
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="mb-5 pb-5" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <div className="flex items-baseline gap-1">
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-faint)', alignSelf: 'flex-start', marginTop: 10 }}>$</span>
                      <span style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.05em', color: 'var(--text)' }}>
                        {isAnnual ? plan.annualPrice : plan.monthlyPrice}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-faint)', marginBottom: 6 }}>/mo</span>
                    </div>
                    <p className="mt-1.5 font-medium" style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                      {plan.annualPrice === 0
                        ? 'Free forever · no card needed'
                        : isAnnual
                          ? `Billed annually · $${plan.annualPrice * 12}/yr`
                          : 'Billed monthly'}
                    </p>
                    <p className="mt-2.5 font-medium leading-snug" style={{ fontSize: 13, color: 'var(--text-soft)' }}>{plan.description}</p>
                  </div>

                  {/* Features */}
                  <ul className="mb-6 flex-1 flex flex-col gap-2.5" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        {f.included ? (
                          <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,194,122,0.12)', border: '1px solid rgba(0,194,122,0.25)' }}>
                            <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="#00C27A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 6l3 3 5-5"/>
                            </svg>
                          </span>
                        ) : (
                          <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'var(--tag-bg)' }}>
                            <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round">
                              <path d="M3 3l6 6M9 3l-6 6"/>
                            </svg>
                          </span>
                        )}
                        <span style={{ fontSize: 13, fontWeight: f.included ? 500 : 400, color: f.included ? 'var(--text-soft)' : 'var(--text-faint)', lineHeight: 1.4 }}>
                          {f.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    style={{
                      display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center',
                      marginTop: 'auto',
                      padding: '11px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                      fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em',
                      background: featured ? '#00C27A' : 'var(--tag-bg)',
                      color: featured ? '#0A0A0A' : 'var(--text)',
                      boxShadow: featured ? '0 4px 16px rgba(0,194,122,0.35)' : 'none',
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    {plan.cta}
                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 ml-1.5" fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                  </button>
              </div>
            );
          })}
        </div>

        {/* Sub-note */}
        <p className="text-center mt-6 font-medium" style={{ fontSize: 13, color: 'var(--text-faint)' }}>
          No credit card required · Cancel anytime · 14-day free trial on all paid plans
        </p>
      </section>

      {/* ── What's included strip ── */}
      <section className="py-20 px-6" style={{ borderTop: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))', background: 'var(--bg-subtle)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="pill-s inline-flex mb-4">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#00C27A' }} />
              Included in Every Plan
            </span>
            <h2 className="font-black" style={{ fontSize: 'clamp(22px,3vw,34px)', fontWeight: 900, letterSpacing: '-0.04em' }}>
              No hidden fees. No surprises.
            </h2>
          </div>
          <div className="pr-perks-grid grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', label: '14-Day Free Trial', sub: 'No credit card required to start.' },
              { icon: 'M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z', label: 'SSL & SOC2 Secure', sub: 'Your data is encrypted and safe.' },
              { icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3z', label: 'No Setup Fees', sub: 'Get started in minutes, not days.' },
              { icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15', label: 'Cancel Anytime', sub: 'No lock-in contracts. Ever.' },
              { icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-5 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0z', label: 'Email Support', sub: 'Friendly help from real humans.' },
              { icon: 'M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 0-2 2h-2a2 2 0 0 0-2-2z', label: 'Live Dashboard', sub: 'Real-time data, always up to date.' },
            ].map((item) => (
              <div
                key={item.label}
                className="pr-perk"
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '18px 20px', borderRadius: 14,
                  background: 'var(--card-bg)',
                  border: '1px solid hsl(var(--border))',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'rgba(0,194,122,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'hsl(var(--border))'; }}
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,rgba(0,194,122,0.14),rgba(0,194,122,0.04))', border: '1px solid rgba(0,194,122,0.22)' }}>
                  <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }} fill="none" stroke="#00C27A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.icon} />
                  </svg>
                </div>
                <div>
                  <p className="font-black text-sm mb-0.5" style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}>{item.label}</p>
                  <p className="font-medium" style={{ fontSize: 12.5, color: 'var(--text-faint)', lineHeight: 1.45 }}>{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Enterprise CTA ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="pr-enterprise cta-dark-s rounded-[24px] p-10 lg:p-14 text-center relative overflow-hidden">
            <span className="pill-s mb-6 inline-flex" style={{ background: 'rgba(0,194,122,0.12)', border: '1px solid rgba(0,194,122,0.25)', color: '#00C27A' }}>
              Enterprise
            </span>
            <h2 className="font-display mb-4" style={{ fontSize: 'clamp(26px,3.5vw,38px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', color: '#fff' }}>
              Need a custom solution?
            </h2>
            <p className="mb-8 mx-auto max-w-lg font-medium" style={{ fontSize: 15, lineHeight: 1.65, color: 'rgba(255,255,255,0.6)' }}>
              Contact us for enterprise pricing with custom seat limits, dedicated infrastructure, SLA guarantees, and white-glove onboarding.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="/contact" className="btn-accent-s">
                Contact Sales
              </a>
              <a href="/product-tour" className="btn-secondary-s" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}>
                See Product Tour
              </a>
            </div>
            <p className="mt-6 font-medium" style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)' }}>
              Custom contracts · Volume discounts · Dedicated CSM · SSO & SAML
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_1.6fr] gap-16 items-start">

            {/* Left — sticky heading */}
            <div className="lg:sticky lg:top-28">
              <span className="pill-s inline-flex mb-5">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#00C27A' }} />
                Pricing FAQ
              </span>
              <h2 className="font-black mb-4" style={{ fontSize: 'clamp(26px,3vw,38px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em' }}>
                Common<br/>
                <span className="text-gradient">questions</span>
              </h2>
              <p className="font-medium leading-relaxed mb-8" style={{ fontSize: 14.5, color: 'var(--text-soft)', lineHeight: 1.65 }}>
                Can't find what you're looking for? Reach out to our support team anytime.
              </p>
              <a
                href="/contact"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: 12, fontSize: 13.5, fontWeight: 700,
                  background: 'var(--card-bg)', border: '1px solid hsl(var(--border))',
                  color: 'var(--text)', textDecoration: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,194,122,0.4)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,194,122,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                Contact Support
                <svg viewBox="0 0 16 16" style={{ width: 13, height: 13 }} fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
              </a>

              {/* Trust stats */}
              <div className="mt-10 flex flex-col gap-4">
                {[
                  { val: '30-day', label: 'money-back guarantee' },
                  { val: '< 2h', label: 'average support response' },
                  { val: '99.9%', label: 'platform uptime SLA' },
                ].map(s => (
                  <div key={s.val} className="flex items-center gap-3">
                    <span className="font-black" style={{ fontSize: 18, color: '#00C27A', letterSpacing: '-0.03em', minWidth: 56 }}>{s.val}</span>
                    <span className="font-medium" style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — accordions */}
            <div className="pr-faq-list flex flex-col gap-2">
              {liveFaqs.map((faq, i) => (
                <div
                  key={i}
                  className="pr-faq-item"
                  style={{
                    borderRadius: 14,
                    border: '1px solid',
                    borderColor: openFaq === i ? 'rgba(0,194,122,0.4)' : 'hsl(var(--border))',
                    background: openFaq === i ? 'linear-gradient(135deg,rgba(0,194,122,0.04),var(--card-bg))' : 'var(--card-bg)',
                    overflow: 'hidden',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                >
                  <button
                    className="w-full flex items-center justify-between gap-4 text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '18px 20px' }}
                  >
                    <span className="font-bold" style={{ fontSize: 14.5, color: 'var(--text)', lineHeight: 1.4 }}>{faq.question}</span>
                    <span
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{
                        background: openFaq === i ? '#00C27A' : 'var(--tag-bg)',
                        border: openFaq === i ? 'none' : '1px solid hsl(var(--border))',
                        transition: 'background 0.2s, transform 0.25s',
                        transform: openFaq === i ? 'rotate(180deg)' : 'none',
                      }}
                    >
                      <svg viewBox="0 0 16 16" style={{ width: 13, height: 13 }} fill="none" stroke={openFaq === i ? '#fff' : 'var(--text-soft)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 6l4 4 4-4"/>
                      </svg>
                    </span>
                  </button>
                  {openFaq === i && (
                    <p className="font-medium leading-relaxed" style={{ fontSize: 14, color: 'var(--text-soft)', padding: '0 20px 18px', lineHeight: 1.65 }}>
                      {faq.answer}
                    </p>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
