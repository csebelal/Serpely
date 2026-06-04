import { useEffect, useRef, useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useSEOMeta } from '@/hooks/useSEOMeta';
import { injectSchema, removeSchema } from '@/lib/schema';
import { competitors } from '@/data/competitors';

gsap.registerPlugin(ScrollTrigger);

function Check() {
  return (
    <div className="w-6 h-6 rounded-full flex items-center justify-center mx-auto flex-shrink-0" style={{ background: 'rgba(0,194,122,0.14)', border: '1px solid rgba(0,194,122,0.3)' }}>
      <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="#00C27A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 6l3 3 5-5"/>
      </svg>
    </div>
  );
}

function Cross() {
  return (
    <div className="w-6 h-6 rounded-full flex items-center justify-center mx-auto flex-shrink-0" style={{ background: 'var(--tag-bg)' }}>
      <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-faint)' }}>
        <path d="M3 3l6 6M9 3l-6 6"/>
      </svg>
    </div>
  );
}

function FeatureCell({ val }: { val: boolean | string }) {
  if (val === true) return <Check />;
  if (val === false) return <Cross />;
  return <span className="font-semibold text-sm" style={{ color: 'var(--text-soft)' }}>{val}</span>;
}

function FAQItem({ q, a, open, onClick }: { q: string; a: string; open: boolean; onClick: () => void }) {
  return (
    <div
      style={{ borderRadius: 14, border: '1px solid hsl(var(--border))', background: 'var(--card-bg)', overflow: 'hidden', transition: 'border-color 0.2s' }}
    >
      <button
        onClick={onClick}
        className="w-full text-left px-6 py-5 flex items-start justify-between gap-4 font-semibold"
        style={{ fontSize: 15, color: 'var(--text)', background: 'none', cursor: 'pointer', border: 'none' }}
      >
        <span>{q}</span>
        <svg viewBox="0 0 16 16" className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          style={{ color: '#00C27A', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <path d="M3 6l5 5 5-5"/>
        </svg>
      </button>
      {open && (
        <div className="px-6 pb-5" style={{ fontSize: 14, color: 'var(--text-soft)', lineHeight: 1.7 }}>
          {a}
        </div>
      )}
    </div>
  );
}

export function CompareVs() {
  const { slug } = useParams<{ slug: string }>();
  const competitor = slug ? competitors[slug] : undefined;

  useSEOMeta(
    `compare-vs-${slug}`,
    competitor
      ? { title: competitor.metaTitle, description: competitor.metaDesc }
      : { title: 'Compare Serpely', description: '' }
  );

  const pageRef = useRef<HTMLDivElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (!competitor) return;

    const schemaKey = `schema-vs-${slug}`;
    injectSchema(schemaKey, {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Serpely vs ${competitor.name} — Feature Comparison`,
      description: competitor.metaDesc,
      url: `https://serpely.com/compare/${slug}`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Serpely',
          url: 'https://serpely.com',
          description: 'Agentic SEO platform with GEO Scoring and AI Citation Monitor. Free plan available, paid plans from $49/month.',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: competitor.name,
          url: `https://${competitor.slug.replace('-', '')}.com`,
          description: competitor.schemaCompetitorDesc,
        },
      ],
    });

    injectSchema(`schema-faq-${slug}`, {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: competitor.faqs.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });

    return () => {
      removeSchema(schemaKey);
      removeSchema(`schema-faq-${slug}`);
    };
  }, [slug, competitor]);

  useEffect(() => {
    if (!competitor) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.cvs-hero', { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out', delay: 0.1 });

      gsap.fromTo('.cvs-table', { opacity: 0, y: 28 }, {
        opacity: 1, y: 0, duration: 0.6, ease: 'power3.out',
        scrollTrigger: { trigger: '.cvs-table', start: 'top 80%', toggleActions: 'play none none reverse' },
      });

      gsap.fromTo('.cvs-reason', { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: '.cvs-reasons', start: 'top 78%', toggleActions: 'play none none reverse' },
      });

      gsap.fromTo('.cvs-faq-item', { opacity: 0, x: -12 }, {
        opacity: 1, x: 0, duration: 0.4, stagger: 0.07, ease: 'power2.out',
        scrollTrigger: { trigger: '.cvs-faq', start: 'top 80%', toggleActions: 'play none none reverse' },
      });

      gsap.fromTo('.cvs-cta', { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.55, ease: 'power3.out',
        scrollTrigger: { trigger: '.cvs-cta', start: 'top 84%', toggleActions: 'play none none reverse' },
      });
    }, pageRef);
    return () => ctx.revert();
  }, [competitor]);

  if (!competitor) return <Navigate to="/compare" replace />;

  const categories = [...new Set(competitor.features.map(f => f.category))];

  return (
    <div ref={pageRef} style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,194,122,0.09) 0%, transparent 70%)' }} />
        <div className="cvs-hero max-w-3xl mx-auto relative z-10">
          <Link
            to="/compare"
            className="inline-flex items-center gap-1.5 mb-5 text-[12px] font-bold uppercase"
            style={{ color: 'var(--text-faint)', letterSpacing: '0.1em', textDecoration: 'none' }}
          >
            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M10 3L5 8l5 5"/>
            </svg>
            All Comparisons
          </Link>
          <span className="pill-s mb-5 inline-flex">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#00C27A' }} />
            Compare
          </span>
          <h1 className="font-black mb-5" style={{ fontSize: 'clamp(28px,5vw,62px)', fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.045em' }}>
            <span className="text-gradient">Serpely</span>{' '}vs{' '}
            <span>{competitor.name}</span>
          </h1>
          <p className="font-medium max-w-2xl mx-auto mb-8" style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--text-soft)' }}>
            {competitor.heroDesc}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/pricing" className="btn-accent-s">
              Try Serpely Free
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 ml-1" fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
            </Link>
            <span className="text-sm font-medium" style={{ color: 'var(--text-faint)' }}>
              vs {competitor.name} starting at {competitor.startingPrice}
            </span>
          </div>
        </div>
      </section>

      {/* ── Feature Comparison Table ── */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div
            className="cvs-table overflow-hidden"
            style={{ borderRadius: 20, border: '1px solid hsl(var(--border))', background: 'var(--card-bg)', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}
          >
            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <p className="sm:hidden text-[11px] font-semibold text-center py-2" style={{ color: 'var(--text-faint)', letterSpacing: '0.04em' }}>← Swipe to compare →</p>
              <table className="w-full" style={{ minWidth: 480, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <th className="text-left py-5 px-6 font-bold text-xs uppercase" style={{ color: 'var(--text-faint)', letterSpacing: '0.1em', width: '50%' }}>
                      Feature
                    </th>
                    <th className="text-center py-5 px-6 font-black text-sm" style={{ background: 'linear-gradient(180deg,rgba(0,194,122,0.10),rgba(0,194,122,0.05))', color: '#00C27A', borderLeft: '1px solid rgba(0,194,122,0.2)', position: 'relative', minWidth: 130 }}>
                      <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: '#00C27A', color: '#0A0A0A', letterSpacing: '0.08em' }}>Us</span>
                      <span style={{ display: 'block', marginTop: 14 }}>Serpely</span>
                    </th>
                    <th className="text-center py-5 px-6 font-black text-sm" style={{ color: 'var(--text-soft)', borderLeft: '1px solid hsl(var(--border))', minWidth: 130 }}>
                      {competitor.name}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <>
                      <tr key={`cat-${cat}`} style={{ background: 'var(--bg-subtle)' }}>
                        <td colSpan={3} className="px-6 py-2.5">
                          <span className="text-[10px] font-black uppercase" style={{ color: 'var(--text-faint)', letterSpacing: '0.14em' }}>{cat}</span>
                        </td>
                      </tr>
                      {competitor.features.filter(f => f.category === cat).map((row, i) => (
                        <tr
                          key={`${cat}-${i}`}
                          style={{ borderTop: '1px solid hsl(var(--border))', transition: 'background 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <td className="py-3.5 px-6 font-medium text-sm" style={{ color: 'var(--text-soft)' }}>{row.name}</td>
                          <td className="py-3.5 px-6 text-center" style={{ background: 'rgba(0,194,122,0.04)', borderLeft: '1px solid rgba(0,194,122,0.15)' }}>
                            <FeatureCell val={row.serpely} />
                          </td>
                          <td className="py-3.5 px-6 text-center" style={{ borderLeft: '1px solid hsl(var(--border))' }}>
                            <FeatureCell val={row.competitor} />
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── Reasons to Switch ── */}
      <section className="py-20 px-6 cvs-reasons" style={{ borderTop: '1px solid hsl(var(--border))', background: 'var(--bg-subtle)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="pill-s inline-flex mb-4">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#00C27A' }} />
              Why Switch
            </span>
            <h2 className="font-black mb-3" style={{ fontSize: 'clamp(22px,3vw,36px)', fontWeight: 900, letterSpacing: '-0.04em' }}>
              Why teams switch from {competitor.name} to Serpely
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {competitor.reasons.map((r, i) => (
              <div
                key={i}
                className="cvs-reason"
                style={{
                  borderRadius: 20,
                  padding: '28px 24px',
                  background: 'var(--card-bg)',
                  border: i === 0 ? '1px solid rgba(0,194,122,0.4)' : '1px solid hsl(var(--border))',
                  boxShadow: i === 0 ? '0 0 0 1px rgba(0,194,122,0.15), 0 16px 48px rgba(0,194,122,0.08)' : '0 2px 12px rgba(0,0,0,0.04)',
                  transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 20px 56px rgba(0,194,122,0.12), 0 4px 16px rgba(0,0,0,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(0,194,122,0.45)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = i === 0 ? '0 0 0 1px rgba(0,194,122,0.15), 0 16px 48px rgba(0,194,122,0.08)' : '0 2px 12px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = i === 0 ? 'rgba(0,194,122,0.4)' : 'hsl(var(--border))';
                }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg,rgba(0,194,122,0.16),rgba(0,194,122,0.04))', border: '1px solid rgba(0,194,122,0.28)' }}>
                  <span className="font-black text-sm" style={{ color: '#00C27A' }}>{i + 1}</span>
                </div>
                <h3 className="font-black text-base mb-2.5" style={{ color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.35 }}>{r.title}</h3>
                <p className="font-medium leading-relaxed" style={{ fontSize: 14, color: 'var(--text-soft)' }}>{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Comparison ── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="pill-s inline-flex mb-4">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#00C27A' }} />
              Pricing
            </span>
            <h2 className="font-black mb-3" style={{ fontSize: 'clamp(22px,3vw,36px)', fontWeight: 900, letterSpacing: '-0.04em' }}>
              Serpely vs {competitor.name} — Pricing
            </h2>
            <p className="font-medium" style={{ fontSize: 15, color: 'var(--text-soft)' }}>
              See what you get for your money across both platforms.
            </p>
          </div>
          <div
            style={{ borderRadius: 20, border: '1px solid hsl(var(--border))', background: 'var(--card-bg)', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}
          >
            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full" style={{ minWidth: 400, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <th className="text-left py-4 px-6 font-bold text-xs uppercase" style={{ color: 'var(--text-faint)', letterSpacing: '0.1em', width: '40%' }} />
                    <th className="text-center py-4 px-6 font-black text-sm" style={{ background: 'linear-gradient(180deg,rgba(0,194,122,0.10),rgba(0,194,122,0.05))', color: '#00C27A', borderLeft: '1px solid rgba(0,194,122,0.2)' }}>
                      Serpely
                    </th>
                    <th className="text-center py-4 px-6 font-black text-sm" style={{ color: 'var(--text-soft)', borderLeft: '1px solid hsl(var(--border))' }}>
                      {competitor.name}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {competitor.pricingRows.map((row, i) => (
                    <tr
                      key={i}
                      style={{ borderTop: '1px solid hsl(var(--border))', transition: 'background 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td className="py-3.5 px-6 font-semibold text-sm" style={{ color: 'var(--text-soft)' }}>{row.label}</td>
                      <td className="py-3.5 px-6 text-center font-semibold text-sm" style={{ background: 'rgba(0,194,122,0.04)', borderLeft: '1px solid rgba(0,194,122,0.15)', color: '#00C27A' }}>
                        {row.serpely}
                      </td>
                      <td className="py-3.5 px-6 text-center font-medium text-sm" style={{ borderLeft: '1px solid hsl(var(--border))', color: 'var(--text-soft)' }}>
                        {row.competitor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-6 cvs-faq" style={{ borderTop: '1px solid hsl(var(--border))', background: 'var(--bg-subtle)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="pill-s inline-flex mb-4">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#00C27A' }} />
              FAQ
            </span>
            <h2 className="font-black mb-3" style={{ fontSize: 'clamp(22px,3vw,36px)', fontWeight: 900, letterSpacing: '-0.04em' }}>
              Serpely vs {competitor.name} — Common Questions
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {competitor.faqs.map((f, i) => (
              <div key={i} className="cvs-faq-item">
                <FAQItem
                  q={f.q}
                  a={f.a}
                  open={openFaq === i}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="cvs-cta cta-dark-s rounded-[24px] p-10 lg:p-14 text-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(0,194,122,0.12) 0%, transparent 70%)' }} />
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase mb-5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,194,122,0.15)', border: '1px solid rgba(0,194,122,0.3)', color: '#00C27A', letterSpacing: '0.1em' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00C27A' }} />
                Free to Start
              </span>
              <h2 className="font-black mb-4" style={{ fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', color: '#fff' }}>
                Ready to switch from {competitor.name}?
              </h2>
              <p className="mb-8 mx-auto max-w-lg font-medium" style={{ fontSize: 15, lineHeight: 1.65, color: 'rgba(255,255,255,0.6)' }}>
                Start free — no credit card required. Upgrade when you need more. Cancel any time.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/pricing" className="btn-accent-s">
                  Get Started Free
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 ml-1" fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                </Link>
                <Link to="/compare" className="btn-secondary-s" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}>
                  See All Comparisons
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
