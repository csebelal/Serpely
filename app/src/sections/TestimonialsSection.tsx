import { useEffect, useRef, useState } from 'react';
import { getTestimonials } from '@/lib/api';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const testimonials = [
  {
    quote: "Serpely replaced four separate tools overnight. We now have one dashboard that shows us exactly where to focus. Our organic traffic went up 28% in 6 weeks after acting on the AI action queue.",
    name: 'Sarah M.', role: 'Head of SEO, Northstar Growth', initial: 'S',
  },
  {
    quote: "The GEO monitoring alone is worth the subscription. We can now see how often our brand gets cited by ChatGPT and Gemini. No other tool gives us that. Our agency clients love seeing it in reports.",
    name: 'Reza A.', role: 'Founder, AtlasEdge Media', initial: 'R',
  },
  {
    quote: "I used to spend 2 hours every Monday pulling SEO reports manually. Serpely sends me a weekly digest and the content prioritization queue tells my team exactly what to work on. It's like having an extra hire.",
    name: 'Talia K.', role: 'Content Lead, LumaDesk', initial: 'T',
  },
  {
    quote: "The first week exposed five pages that were ranking in Google but invisible in AI answers. That changed our roadmap immediately.",
    name: 'Maya R.', role: 'Growth Director, BrightPath Labs', initial: 'M',
  },
  {
    quote: "Our clients finally understand what changed after AI Overviews. The reports are simple enough for executives and detailed enough for the SEO team.",
    name: 'Jon P.', role: 'Strategy Lead, SignalMint', initial: 'J',
  },
  {
    quote: "We stopped arguing about which SEO tasks mattered. Serpely ranks the work by impact, so our developers get a clear queue instead of a spreadsheet.",
    name: 'Nadia V.', role: 'Marketing Ops, QueryPeak', initial: 'N',
  },
];

function TestimonialCard({ t }: { t: typeof testimonials[0] }) {
  return (
    <div
      className="card-s p-7 relative flex flex-col"
      style={{
        width: 'min(368px, calc(100vw - 48px))',
        minHeight: 260,
        transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'translateY(-4px)';
        el.style.boxShadow = '0 12px 32px rgba(0,0,0,0.11)';
        el.style.borderColor = 'rgba(0,194,122,0.35)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = '';
        el.style.boxShadow = '';
        el.style.borderColor = '';
      }}
    >
      <svg width="28" height="20" viewBox="0 0 32 24" fill="none" className="mb-4 flex-shrink-0">
        <path d="M2 14 Q 2 4 12 2 L 12 6 Q 6 7 6 14 L 12 14 L 12 22 L 2 22 Z M 18 14 Q 18 4 28 2 L 28 6 Q 22 7 22 14 L 28 14 L 28 22 L 18 22 Z" fill="#00C27A" fillOpacity="0.45"/>
      </svg>
      <div className="flex gap-0.5 mb-3 flex-shrink-0">
        <span className="text-amber-500 text-sm tracking-wider">★★★★★</span>
      </div>
      <p className="flex-1 mb-6 font-semibold" style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--text)', letterSpacing: '-0.012em' }}>"{t.quote}"</p>
      <div className="flex items-center gap-3 pt-4 border-t flex-shrink-0" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-sm flex-shrink-0" style={{ background: '#00C27A', color: '#0A0A0A' }}>{t.initial}</div>
        <div>
          <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>{t.name}</div>
          <div className="font-semibold" style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{t.role}</div>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [liveTestimonials, setLiveTestimonials] = useState(testimonials);

  useEffect(() => {
    getTestimonials().then(r => {
      if (r.data.length > 0)
        setLiveTestimonials(r.data.map(t => ({ quote: t.quote, name: t.name, role: t.role, initial: t.initial })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.test-header', { opacity: 0, y: 28 }, {
        opacity: 1, y: 0, duration: 0.6, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', toggleActions: 'play none none reverse' },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const doubled = [...liveTestimonials, ...liveTestimonials];

  return (
    <section ref={sectionRef} id="testimonials" className="py-28 px-6 relative" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-subtle) 76%, transparent), transparent 38%), var(--bg)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 test-header">
          <div className="pill-s mb-5 mx-auto" style={{ width: 'fit-content' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot flex-shrink-0" style={{ background: '#00C27A' }} />
            Customer Outcomes
          </div>
          <h2 className="font-black text-4xl lg:text-6xl" style={{ fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.05, color: 'var(--text)' }}>
            Teams that moved<br/>
            from data to <span className="text-gradient" style={{ display: 'inline-block', paddingBottom: 6 }}>results</span>
          </h2>
        </div>
      </div>

      {/* Full-width marquee */}
      <div className="overflow-hidden testimonial-mask py-1.5" style={{ marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)' }}>
        <div
          className="flex gap-5 w-max animate-testimonial"
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.animationPlayState = 'paused'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.animationPlayState = 'running'; }}
        >
          {doubled.map((t, i) => (
            <TestimonialCard key={i} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
