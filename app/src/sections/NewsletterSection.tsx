import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getSection, subscribe } from '@/lib/api';

gsap.registerPlugin(ScrollTrigger);

export function NewsletterSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [badge, setBadge] = useState('Weekly SEO Intel');
  const [headline, setHeadline] = useState('Stay ahead of AI search.\nWeekly intel from Serpely.');
  const [subtext, setSubtext] = useState('Get one practical tip every week on Agentic SEO, GEO optimization, and ranking in the AI-first web. Join 3,000+ marketers already subscribed.');
  const [inputPlaceholder, setInputPlaceholder] = useState('Enter your work email');
  const [buttonText, setButtonText] = useState('Get Weekly Insights');
  const [successTitle, setSuccessTitle] = useState("You're subscribed!");
  const [successBody, setSuccessBody] = useState('Check your inbox for a welcome email.');
  const [privacyText, setPrivacyText] = useState("We won't spam you. We respect your privacy. Unsubscribe anytime.");

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.nl-reveal', { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.55, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', toggleActions: 'play none none reverse' },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    getSection('newsletter').then(r => {
      const d = r.data.data as Record<string, unknown>;
      if (typeof d.badge === 'string') setBadge(d.badge);
      if (typeof d.headline === 'string') setHeadline(d.headline);
      if (typeof d.subtext === 'string') setSubtext(d.subtext);
      if (typeof d.inputPlaceholder === 'string') setInputPlaceholder(d.inputPlaceholder);
      if (typeof d.buttonText === 'string') setButtonText(d.buttonText);
      if (typeof d.successTitle === 'string') setSuccessTitle(d.successTitle);
      if (typeof d.successBody === 'string') setSuccessBody(d.successBody);
      if (typeof d.privacyText === 'string') setPrivacyText(d.privacyText);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      await subscribe(email, 'newsletter-section');
    } catch { /* non-blocking */ }
    setSubmitted(true);
  };

  return (
    <section ref={sectionRef} className="py-20 px-6 border-t relative" style={{ borderColor: 'hsl(var(--border))' }}>
      <div className="max-w-2xl mx-auto text-center">
        <div className="pill-s mb-5 mx-auto nl-reveal" style={{ width: 'fit-content' }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot flex-shrink-0" style={{ background: '#00C27A' }} />
          {badge}
        </div>
        <h2 className="font-black text-3xl lg:text-4xl mb-3 nl-reveal" style={{ fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text)', whiteSpace: 'pre-line' }}>
          {headline}
        </h2>
        <p className="mb-8 leading-relaxed font-medium nl-reveal" style={{ color: 'var(--text-soft)' }}>
          {subtext}
        </p>

        <div className="nl-reveal">
          {submitted ? (
            <div className="py-8">
              <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#E6FBF4' }}>
                <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="#00A868" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <p className="font-bold text-lg" style={{ color: 'var(--text)' }}>{successTitle}</p>
              <p className="text-sm mt-1 font-medium" style={{ color: 'var(--text-soft)' }}>{successBody}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder={inputPlaceholder}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="flex-1 px-4 py-3 rounded-xl text-sm transition-all font-medium"
                style={{ background: 'var(--input-bg)', border: '1px solid hsl(var(--border))', color: 'var(--text)', outline: 'none' }}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#00C27A'; (e.target as HTMLInputElement).style.boxShadow = '0 0 0 4px rgba(0,194,122,0.1)'; }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'hsl(var(--border))'; (e.target as HTMLInputElement).style.boxShadow = 'none'; }}
              />
              <button type="submit" className="btn-accent-s whitespace-nowrap">
                {buttonText}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
              </button>
            </form>
          )}
        </div>

        <p className="text-[12px] mt-3 font-semibold nl-reveal" style={{ color: 'var(--text-faint)' }}>
          {privacyText}
        </p>
      </div>
    </section>
  );
}
