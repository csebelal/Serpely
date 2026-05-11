import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getSection } from '@/lib/api';

gsap.registerPlugin(ScrollTrigger);

export function CTASection() {
  const sectionRef = useRef<HTMLElement>(null);

  const [badge, setBadge] = useState('Public Beta Now Available');
  const [headline1, setHeadline1] = useState('The AI search era is');
  const [headline2, setHeadline2] = useState('already here.');
  const [headline3, setHeadline3] = useState('Is your site ready?');
  const [subtext, setSubtext] = useState('Start your daily AI audit today.');
  const [cta1Text, setCta1Text] = useState('Start Free Trial');
  const [cta1Href, setCta1Href] = useState('#');
  const [cta2Text, setCta2Text] = useState('Book a Demo');
  const [cta2Href, setCta2Href] = useState('#');
  const [supportText, setSupportText] = useState('No credit card · 14 days free · Cancel anytime');

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.cta-reveal', { opacity: 0, y: 28 }, {
        opacity: 1, y: 0, duration: 0.6, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', toggleActions: 'play none none reverse' },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    getSection('cta').then(r => {
      const d = r.data.data as Record<string, unknown>;
      if (typeof d.badge === 'string') setBadge(d.badge);
      if (typeof d.headline1 === 'string') setHeadline1(d.headline1);
      if (typeof d.headline2 === 'string') setHeadline2(d.headline2);
      if (typeof d.headline3 === 'string') setHeadline3(d.headline3);
      if (typeof d.subtext === 'string') setSubtext(d.subtext);
      if (typeof d.cta1Text === 'string') setCta1Text(d.cta1Text);
      if (typeof d.cta1Href === 'string') setCta1Href(d.cta1Href);
      if (typeof d.cta2Text === 'string') setCta2Text(d.cta2Text);
      if (typeof d.cta2Href === 'string') setCta2Href(d.cta2Href);
      if (typeof d.supportText === 'string') setSupportText(d.supportText);
    }).catch(() => {});
  }, []);

  return (
    <section ref={sectionRef} className="py-20 px-6 relative">
      <div className="max-w-7xl mx-auto">
        <div className="cta-dark-s py-24 px-6 lg:px-12">
          <div className="max-w-3xl mx-auto text-center relative z-10 cta-reveal">
            <div className="pill-s mb-7 mx-auto" style={{ width: 'fit-content', background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', color: '#00FF88' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot flex-shrink-0" style={{ background: '#00C27A' }} />
              {badge}
            </div>
            <h2 className="font-black text-5xl lg:text-7xl text-white mb-5" style={{ fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.04, paddingBottom: 6 }}>
              {headline1}<br/>
              {headline2}{' '}
              <span style={{ color: '#00FF88', display: 'inline-block', paddingBottom: 2 }}>{headline3}</span>
            </h2>
            <p className="text-lg mb-10 max-w-lg mx-auto font-medium" style={{ color: '#A1A1AA' }}>
              {subtext}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a href={cta1Href} className="btn-accent-s" style={{ padding: '14px 28px' }}>
                {cta1Text}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
              </a>
              <a href={cta2Href} className="btn-secondary-s" style={{ padding: '14px 28px', background: 'transparent', borderColor: 'rgba(255,255,255,0.2)', color: '#FFFFFF' }}>
                {cta2Text}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
              </a>
            </div>
            <p className="text-[12px] mt-6 font-semibold" style={{ color: '#71717A', letterSpacing: '0.1em' }}>
              {supportText}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
