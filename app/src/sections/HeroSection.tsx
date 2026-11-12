import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { getSection } from '@/lib/api';
import { HeroBackground } from '@/components/backgrounds/HeroBackground';
import { FloatingCards, HeroDashboard, ScaleToFit, TiltWrapper } from '@/components/hero';

export interface HeroShot { url?: string; w?: number; h?: number }
export interface HeroShotPair { light?: HeroShot; dark?: HeroShot }

function HeroActionLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  if (href.startsWith('/')) {
    return (
      <Link to={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

export function HeroSection() {
  const [tabHidden, setTabHidden] = useState(
    () => typeof document !== 'undefined' && document.hidden,
  );

  const [headline, setHeadline] = useState(['Agentic SEO.', 'Built for the', 'AI-first web.']);
  const [subheadline, setSubheadline] = useState(
    "A daily AI audit that tracks whether you're cited across ChatGPT, Perplexity, and Google AI Overviews, and tells you exactly what to fix next.",
  );
  const [cta1Text, setCta1Text] = useState('Start Free Trial');
  const [cta1Href, setCta1Href] = useState('/register');
  const [cta1Sub, setCta1Sub] = useState('No credit card');
  const [cta2Text, setCta2Text] = useState('Book a Demo');
  const [cta2Href, setCta2Href] = useState('/contact');
  const [cta2Sub, setCta2Sub] = useState('See live insights');
  const [announcementText, setAnnouncementText] = useState(
    'Now in Public Beta — Join The Early Access Team.',
  );
  const [alert1Title, setAlert1Title] = useState('GEO Score Up');
  const [alert1Sub, setAlert1Sub] = useState('/best-crm 74 → 78');
  const [alert2Title, setAlert2Title] = useState('AI Citation Drop');
  const [alert2Sub, setAlert2Sub] = useState('ChatGPT mentions ↑ 83%');

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    getSection('hero')
      .then(r => {
        const d = r.data?.data as Record<string, unknown>;
        if (!d) return;
        if (Array.isArray(d.headline) && d.headline.length) setHeadline(d.headline as string[]);
        if (d.subheadline) setSubheadline(d.subheadline as string);
        if (d.cta1Text) setCta1Text(d.cta1Text as string);
        if (d.cta1Href) setCta1Href(d.cta1Href as string);
        if (d.cta1Sub) setCta1Sub(d.cta1Sub as string);
        if (d.cta2Text) setCta2Text(d.cta2Text as string);
        if (d.cta2Href) setCta2Href(d.cta2Href as string);
        if (d.cta2Sub) setCta2Sub(d.cta2Sub as string);
        if (d.announcementText) setAnnouncementText(d.announcementText as string);
        if (d.alert1Title) setAlert1Title(d.alert1Title as string);
        if (d.alert1Sub) setAlert1Sub(d.alert1Sub as string);
        if (d.alert2Title) setAlert2Title(d.alert2Title as string);
        if (d.alert2Sub) setAlert2Sub(d.alert2Sub as string);
      })
      .catch(() => {});
  }, []);

  return (
    <section
      className={`hero-one-screen relative overflow-hidden${tabHidden ? ' hero-paused' : ''}`}
      aria-labelledby="hero-heading"
    >
      {/* Existing codebase background preserved untouched */}
      <HeroBackground />

      <div className="hero-split-wrap relative z-10">
        {/* LEFT — single-screen editorial copy stack */}
        <div className="hero-copy-col">
          <div className="hero-beta-wrap">
            <Link to="/product-tour" className="announcement-chip-s hero-beta-shimmer">
              <span className="w-2 h-2 rounded-full bg-green animate-pulse-dot flex-shrink-0" />
              {announcementText}
            </Link>
          </div>

          <h1 id="hero-heading" className="hero-h1">
            {headline.slice(0, 3).map((line, idx) => (
              <span key={idx} className="hero-line-mask">
                <em style={{ animationDelay: `${idx * 120}ms` }}>
                  <span className={idx === 0 || idx === 2 ? 'hero-gradient-animate inline-block pb-1' : 'inline-block pb-1'}>
                    {line}
                  </span>
                </em>
              </span>
            ))}
          </h1>

          <p className="hero-sub-copy">{subheadline}</p>

          <div className="hero-cta-row">
            <HeroActionLink href={cta1Href} className="btn-accent-s btn-shine btn-shine-auto hero-btn-lg">
              {cta1Text}
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
              {cta1Sub && (
                <span className="font-medium text-xs ml-0.5" style={{ color: 'rgba(10,10,10,0.68)' }}>
                  {cta1Sub}
                </span>
              )}
            </HeroActionLink>

            <HeroActionLink href={cta2Href} className="btn-secondary-s hero-btn-lg">
              {cta2Text}
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
              {cta2Sub && (
                <span className="font-medium text-xs" style={{ color: 'var(--text-faint)' }}>
                  {cta2Sub}
                </span>
              )}
            </HeroActionLink>
          </div>

          <div className="hero-trust-row">
            <span
              className="text-[10px] uppercase font-bold"
              style={{ color: 'var(--text-faint)', letterSpacing: '0.18em' }}
            >
              Trusted on
            </span>
            <div
              className="inline-flex flex-wrap items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl"
              style={{ background: 'var(--card-bg)', border: '1px solid hsl(var(--border))' }}
            >
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg">
                <img
                  src="Other Logos/5-Star-TrustPilot.webp"
                  alt="Trustpilot 4.8 rating for Serpely"
                  loading="lazy"
                  decoding="async"
                  width="80"
                  height="16"
                  className="h-4 w-auto object-contain"
                />
                <span className="text-xs font-black" style={{ color: 'var(--text)' }}>
                  4.8
                </span>
              </div>
              <div className="w-px h-4 flex-shrink-0" style={{ background: 'hsl(var(--border))' }} />
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg">
                <img
                  src="Other Logos/g2-seeklogo.png"
                  alt="G2 4.9 rating for Serpely"
                  loading="lazy"
                  decoding="async"
                  width="32"
                  height="16"
                  className="h-4 w-auto object-contain"
                />
                <span className="text-xs font-black" style={{ color: 'var(--text)' }}>
                  4.9
                </span>
              </div>
              <div className="w-px h-4 flex-shrink-0" style={{ background: 'hsl(var(--border))' }} />
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg">
                <img
                  src="Other Logos/capterra-seeklogo.png"
                  alt="Capterra 4.7 rating for Serpely"
                  loading="lazy"
                  decoding="async"
                  width="64"
                  height="16"
                  className="h-4 w-auto object-contain"
                />
                <span className="text-xs font-black" style={{ color: 'var(--text)' }}>
                  4.7
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Scale-to-fit live interactive Command Center dashboard + 4 floating HUD cards */}
        <ScaleToFit baseWidth={900} padX={88} padY={64}>
          <TiltWrapper>
            <FloatingCards
              alert1Title={alert1Title}
              alert1Sub={alert1Sub}
              alert2Title={alert2Title}
              alert2Sub={alert2Sub}
              tabHidden={tabHidden}
            />
            <HeroDashboard tabHidden={tabHidden} />
          </TiltWrapper>
        </ScaleToFit>
      </div>
    </section>
  );
}
