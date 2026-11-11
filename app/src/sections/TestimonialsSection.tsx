import { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { getTestimonials } from '@/lib/api';
import { GlowCard, Marquee, Reveal, useInViewOnce, useMotionPrefs } from '@/components/motion';

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

function TestimonialCard({ t, starsVisible, reducedMotion }: { t: typeof testimonials[0]; starsVisible: boolean; reducedMotion: boolean }) {
  return (
    <GlowCard
      className="card-s p-7 relative flex flex-col flex-shrink-0"
      style={{
        width: 'min(368px, calc(100vw - 48px))',
        minHeight: 260,
      }}
    >
      <svg width="28" height="20" viewBox="0 0 32 24" fill="none" className="mb-4 flex-shrink-0" aria-hidden="true">
        <path d="M2 14 Q 2 4 12 2 L 12 6 Q 6 7 6 14 L 12 14 L 12 22 L 2 22 Z M 18 14 Q 18 4 28 2 L 28 6 Q 22 7 22 14 L 28 14 L 28 22 L 18 22 Z" fill="#00C27A" fillOpacity="0.45"/>
      </svg>
      <div className="flex gap-1 mb-3 flex-shrink-0" aria-label="5 out of 5 stars">
        {[0, 1, 2, 3, 4].map((sIdx) => (
          <Star
            key={sIdx}
            className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
            aria-hidden="true"
            style={{
              opacity: starsVisible ? 1 : 0,
              transform: starsVisible ? 'scale(1)' : 'scale(0.5)',
              transition: reducedMotion ? 'none' : `opacity 0.35s ease ${sIdx * 65}ms, transform 0.35s cubic-bezier(0.22, 1, 0.36, 1) ${sIdx * 65}ms`,
            }}
          />
        ))}
      </div>
      <p className="flex-1 mb-6 font-semibold" style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--text)', letterSpacing: '-0.012em' }}>
        &ldquo;{t.quote}&rdquo;
      </p>
      <div className="flex items-center gap-3 pt-4 border-t flex-shrink-0" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-sm flex-shrink-0" style={{ background: '#00C27A', color: '#0A0A0A' }}>{t.initial}</div>
        <div>
          <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>{t.name}</div>
          <div className="font-semibold" style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{t.role}</div>
        </div>
      </div>
    </GlowCard>
  );
}

export function TestimonialsSection() {
  const trackRef = useRef<HTMLDivElement>(null);
  const starsVisible = useInViewOnce(trackRef, { threshold: 0.1 });
  const { reducedMotion } = useMotionPrefs();
  const [liveTestimonials, setLiveTestimonials] = useState(testimonials);

  useEffect(() => {
    getTestimonials().then(r => {
      if (r.data.length > 0)
        setLiveTestimonials(r.data.map(t => ({ quote: t.quote, name: t.name, role: t.role, initial: t.initial })));
    }).catch(() => {});
  }, []);

  return (
    <section id="testimonials" className="py-28 px-6 relative section-glow-edge" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-subtle) 76%, transparent), transparent 38%), var(--bg)' }}>
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-16">
          <div className="pill-s mb-5 mx-auto" style={{ width: 'fit-content' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot flex-shrink-0" style={{ background: '#00C27A' }} />
            Customer Outcomes
          </div>
          <h2 className="font-black text-4xl lg:text-6xl" style={{ fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.05, color: 'var(--text)' }}>
            Teams that moved<br/>
            from data to <span className="text-gradient" style={{ display: 'inline-block', paddingBottom: 6 }}>results</span>
          </h2>
        </Reveal>
      </div>

      {/* Full-width marquee */}
      <div ref={trackRef} className="py-1.5" style={{ marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)' }}>
        <Marquee direction="right" durationSec={48} gapPx={20} pauseOnHover maskClassName="testimonial-mask">
          {liveTestimonials.map((t, i) => (
            <TestimonialCard key={`${t.name}-${i}`} t={t} starsVisible={starsVisible} reducedMotion={reducedMotion} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}
