import { useState, useEffect, useRef } from 'react';
import { getSection } from '@/lib/api';
import { uploadSrcSet } from '@/lib/responsiveImage';
import { gsap } from 'gsap';

function HeroImg({ src }: { src: string }) {
  const srcSet = uploadSrcSet(src);
  const img = (
    <img src={src} alt="Serpely GEO dashboard tracking AI citations across ChatGPT and Perplexity" loading="eager" fetchPriority="high" decoding="async" width="1080" height="720" style={{ width: '100%', height: 'auto', display: 'block' }} />
  );
  if (!srcSet) return img;
  return (
    <picture>
      <source type="image/webp" srcSet={srcSet} sizes="(max-width: 1024px) 100vw, min(860px, 62vw)" />
      {img}
    </picture>
  );
}

/* ---------------------------------------------------------------------------
   Device screenshots. Both the desktop screen (MacBook) and the mobile screen
   (phone) can be swapped from Admin → Home → Hero. Anything left empty there
   falls back to the bundled WebP renders below, and a light/dark slot that was
   never filled in reuses its sibling so the mockup never looks mismatched.
   --------------------------------------------------------------------------- */
export interface HeroShot { url?: string; w?: number; h?: number }
export interface HeroShotPair { light?: HeroShot; dark?: HeroShot }

interface ShotSpec { url: string; srcSet?: string; w: number; h: number }

const DASH_SIZES = '(max-width: 1024px) calc(100vw - 48px), min(820px, 60vw)';
const PHONE_SIZES = '176px';
const DASH_ALT = 'Serpely Command Center dashboard showing site health, organic performance, total impressions, average CTR, AI visibility score and AI citations by engine';

const DEFAULT_DASH: { light: ShotSpec; dark: ShotSpec } = {
  light: {
    url: '/hero-dashboard-light-1240.webp',
    srcSet: '/hero-dashboard-light-480.webp 480w, /hero-dashboard-light-820.webp 820w, /hero-dashboard-light-1240.webp 1240w, /hero-dashboard-light-1820.webp 1820w',
    w: 1392, h: 915,
  },
  dark: {
    url: '/hero-dashboard-dark-1240.webp',
    srcSet: '/hero-dashboard-dark-480.webp 480w, /hero-dashboard-dark-820.webp 820w, /hero-dashboard-dark-1240.webp 1240w, /hero-dashboard-dark-1820.webp 1820w',
    w: 1392, h: 915,
  },
};

const DEFAULT_PHONE: { light: ShotSpec; dark: ShotSpec } = {
  light: {
    url: '/hero-dashboard-light-phone-368.webp',
    srcSet: '/hero-dashboard-light-phone-184.webp 184w, /hero-dashboard-light-phone-368.webp 368w',
    w: 368, h: 827,
  },
  dark: {
    url: '/hero-dashboard-dark-phone-368.webp',
    srcSet: '/hero-dashboard-dark-phone-184.webp 184w, /hero-dashboard-dark-phone-368.webp 368w',
    w: 368, h: 827,
  },
};

/** CMS shot → render spec. Missing intrinsic size falls back to the default's,
 *  which the browser only needs to reserve space before the image arrives. */
function toSpec(shot: HeroShot, fallback: ShotSpec): ShotSpec {
  const url = (shot.url || '').trim();
  return {
    url,
    srcSet: uploadSrcSet(url),
    w: shot.w || fallback.w,
    h: shot.h || fallback.h,
  };
}

function resolvePair(
  pair: HeroShotPair | undefined,
  fallback: { light: ShotSpec; dark: ShotSpec },
): { light: ShotSpec; dark: ShotSpec } {
  const light = (pair?.light?.url || '').trim();
  const dark = (pair?.dark?.url || '').trim();
  if (!light && !dark) return fallback;
  if (light && !dark) { const l = toSpec(pair!.light!, fallback.light); return { light: l, dark: l }; }
  if (dark && !light) { const d = toSpec(pair!.dark!, fallback.light); return { light: d, dark: d }; }
  return { light: toSpec(pair!.light!, fallback.light), dark: toSpec(pair!.dark!, fallback.dark) };
}

function DashboardImages({ pair }: { pair?: HeroShotPair }) {
  const { light, dark } = resolvePair(pair, DEFAULT_DASH);
  return (
    <>
      <img
        className="hero-dash-light"
        src={light.url}
        srcSet={light.srcSet}
        sizes={DASH_SIZES}
        width={light.w || undefined}
        height={light.h || undefined}
        alt={DASH_ALT}
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
      <img
        className="hero-dash-dark"
        src={dark.url}
        srcSet={dark.srcSet}
        sizes={DASH_SIZES}
        width={dark.w || undefined}
        height={dark.h || undefined}
        alt={DASH_ALT}
        loading="eager"
        fetchPriority="low"
        decoding="async"
      />
    </>
  );
}

/* Mobile view of the same dashboard, dropped into the CSS phone shell. The
   light/dark pair follows the active theme, exactly like the desktop screen. */
function PhoneMock({ pair }: { pair?: HeroShotPair }) {
  const { light, dark } = resolvePair(pair, DEFAULT_PHONE);
  // Follow the uploaded screenshot's own ratio so nothing gets cropped.
  const ratio = light.w && light.h ? `${light.w} / ${light.h}` : undefined;
  return (
    <div className="phone-frame" aria-hidden="true">
      <div className="phone-screen" style={ratio ? { aspectRatio: ratio } : undefined}>
        <img
          className="phone-shot-light"
          src={light.url}
          srcSet={light.srcSet}
          sizes={PHONE_SIZES}
          width={light.w || undefined}
          height={light.h || undefined}
          alt=""
          loading="eager"
          decoding="async"
        />
        <img
          className="phone-shot-dark"
          src={dark.url}
          srcSet={dark.srcSet}
          sizes={PHONE_SIZES}
          width={dark.w || undefined}
          height={dark.h || undefined}
          alt=""
          loading="eager"
          decoding="async"
        />
      </div>
    </div>
  );
}

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [heroImage, setHeroImage] = useState('');
  const [desktopShot, setDesktopShot] = useState<HeroShotPair | undefined>();
  const [phoneShot, setPhoneShot] = useState<HeroShotPair | undefined>();
  const [badge, setBadge] = useState('Is your site invisible to AI search?');
  const [headline, setHeadline] = useState(['Agentic SEO.', 'Built for the', 'AI-first web.']);
  const [subheadline, setSubheadline] = useState("A daily AI audit that tracks whether you're cited across ChatGPT, Perplexity, and Google AI Overviews, and tells you exactly what to fix next.");
  const [cta1Text, setCta1Text] = useState('Start Free Trial');
  const [cta1Href, setCta1Href] = useState('#');
  const [cta1Sub, setCta1Sub] = useState('No credit card');
  const [cta2Text, setCta2Text] = useState('Book a Demo');
  const [cta2Href, setCta2Href] = useState('#');
  const [cta2Sub, setCta2Sub] = useState('See live insights');
  const [announcementText, setAnnouncementText] = useState('Now in Public Beta — Join The Early Access Team.');
  const [alert1Title, setAlert1Title] = useState('GEO Score Up');
  const [alert1Sub, setAlert1Sub] = useState('/best-crm 74 → 78');
  const [alert2Title, setAlert2Title] = useState('AI Citation Drop');
  const [alert2Sub, setAlert2Sub] = useState('ChatGPT mentions ↑ 83%');

  useEffect(() => {
    getSection('hero')
      .then(r => {
        const d = r.data?.data as Record<string, unknown>;
        if (!d) return;
        setHeroImage((d.heroImage as string) || '');
        if (d.heroDesktopShot && typeof d.heroDesktopShot === 'object') setDesktopShot(d.heroDesktopShot as HeroShotPair);
        if (d.heroPhoneShot && typeof d.heroPhoneShot === 'object') setPhoneShot(d.heroPhoneShot as HeroShotPair);
        if (d.badge) setBadge(d.badge as string);
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

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.hero-left', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: 0.1 });
      gsap.fromTo('.hero-right', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: 0.25 });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="pt-28 pb-16 lg:pb-28 px-6 relative">
      {/* Accent crosshairs */}
      <div className="absolute" style={{ top: 120, left: 24, width: 16, height: 16, pointerEvents: 'none' }}>
        <div className="absolute" style={{ top: '50%', left: 0, right: 0, height: 1, background: '#00C27A', transform: 'translateY(-50%)' }} />
        <div className="absolute" style={{ left: '50%', top: 0, bottom: 0, width: 1, background: '#00C27A', transform: 'translateX(-50%)' }} />
      </div>
      <div className="absolute" style={{ top: 120, right: 24, width: 16, height: 16, pointerEvents: 'none' }}>
        <div className="absolute" style={{ top: '50%', left: 0, right: 0, height: 1, background: '#00C27A', transform: 'translateY(-50%)' }} />
        <div className="absolute" style={{ left: '50%', top: 0, bottom: 0, width: 1, background: '#00C27A', transform: 'translateX(-50%)' }} />
      </div>

      <div className="max-w-7xl mx-auto relative">
        <div className="grid lg:grid-cols-12 gap-10 items-center">

          {/* LEFT — hero copy. Centred while the hero is stacked, left-aligned once side-by-side. */}
          <div className="hero-left lg:col-span-5 xl:col-span-4 text-center lg:text-left">
            {/* Italic preheader */}
            <p className="inline-flex items-center gap-3 mb-5 italic font-medium text-lg"
              style={{
                color: 'var(--text)',
                letterSpacing: '-0.018em',
                padding: '10px 18px 10px 12px',
                borderRadius: 16,
                background: 'var(--card-bg)',
                border: '1px solid hsl(var(--border))',
                boxShadow: '0 16px 40px rgba(10,10,10,0.055)',
              }}>
              <span className="w-10 h-10 rounded-xl inline-flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(180deg, rgba(0,194,122,0.10), rgba(0,194,122,0.04))', border: '1px solid rgba(0,194,122,0.24)' }}>
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9.5" cy="9.5" r="4.6" stroke="currentColor" strokeWidth="1.9"/>
                  <path d="M12.9 12.9 17.5 17.5" stroke="currentColor" strokeWidth="2.1"/>
                  <path d="M6.9 8.5h5.2M6.9 10.7h3.7" stroke="#00A868" strokeWidth="1.7"/>
                  <path d="M17.3 5.2v3.5M15.5 7h3.6" stroke="#00A868" strokeWidth="1.8"/>
                </svg>
              </span>
              {badge}
            </p>

            {/* Headline */}
            <h1 className="font-black text-5xl lg:text-6xl mb-6" style={{ fontWeight: 900, lineHeight: 1.03, letterSpacing: '-0.05em', color: 'var(--text)', paddingBottom: 8 }}>
              <span className="text-gradient" style={{ display: 'inline-block', paddingBottom: 4 }}>{headline[0]}</span><br/>
              {headline[1]}<br/>
              <span className="text-gradient" style={{ display: 'inline-block', paddingBottom: 6 }}>{headline[2]}</span>
            </h1>

            <p className="mb-7 max-w-xl mx-auto lg:mx-0 font-medium" style={{ fontSize: '16.5px', lineHeight: 1.55, color: 'var(--text-soft)' }}>
              {subheadline}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mb-5 justify-center lg:justify-start">
              <a href={cta1Href} className="btn-accent-s">
                {cta1Text}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                <span className="font-medium text-xs ml-1" style={{ color: 'rgba(10,10,10,0.55)' }}>{cta1Sub}</span>
              </a>
              <a href={cta2Href} className="btn-secondary-s">
                {cta2Text}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                <span className="font-medium text-xs" style={{ color: 'var(--text-faint)' }}>{cta2Sub}</span>
              </a>
            </div>

            {/* Announcement chip */}
            <div className="mb-7">
              <a href="#" className="announcement-chip-s">
                <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse flex-shrink-0" />
                {announcementText}
              </a>
            </div>

            {/* Trust strip */}
            <div className="flex flex-wrap items-center gap-3 justify-center lg:justify-start">
              <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-faint)', letterSpacing: '0.18em' }}>Trusted on</span>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid hsl(var(--border))' }}>
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg">
                  <img src="Other Logos/5-Star-TrustPilot.webp" alt="Trustpilot 4.8 rating for Serpely" loading="lazy" decoding="async" width="80" height="16" className="h-4 w-auto object-contain" />
                  <span className="text-xs font-black" style={{ color: 'var(--text)' }}>4.8</span>
                </div>
                <div className="w-px h-4 flex-shrink-0" style={{ background: 'hsl(var(--border))' }} />
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg">
                  <img src="Other Logos/g2-seeklogo.png" alt="G2 4.9 rating for Serpely" loading="lazy" decoding="async" width="32" height="16" className="h-4 w-auto object-contain" />
                  <span className="text-xs font-black" style={{ color: 'var(--text)' }}>4.9</span>
                </div>
                <div className="w-px h-4 flex-shrink-0" style={{ background: 'hsl(var(--border))' }} />
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg">
                  <img src="Other Logos/capterra-seeklogo.png" alt="Capterra 4.7 rating for Serpely" loading="lazy" decoding="async" width="64" height="16" className="h-4 w-auto object-contain" />
                  <span className="text-xs font-black" style={{ color: 'var(--text)' }}>4.7</span>
                </div>
              </div>
            </div>

            {/* Feature tags */}
            <div className="flex gap-2 mt-6 justify-center lg:justify-start">
              {['Monitor', 'Optimize', 'Report'].map(tag => (
                <a key={tag} href="#features" className="tag-s flex items-center gap-1.5 hover:border-green transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#00C27A' }} />
                  {tag}
                </a>
              ))}
            </div>
          </div>

          {/* RIGHT — dashboard shown inside a MacBook, with the mobile view on a phone */}
          <div className="hero-right lg:col-span-7 xl:col-span-8 relative">
            <div className="relative">
              <div className="mac-lid">
                <span className="mac-cam" />
                <div className="mac-screen">
                  <div className="mac-titlebar" aria-hidden="true">
                    <span className="mac-dot mac-dot-close" />
                    <span className="mac-dot mac-dot-min" />
                    <span className="mac-dot mac-dot-max" />
                  </div>
                  {heroImage ? <HeroImg src={heroImage} /> : <DashboardImages pair={desktopShot} />}
                </div>
              </div>
              <div className="mac-base">
                <span className="mac-notch" />
              </div>

              <PhoneMock pair={phoneShot} />

              {/* Floating alerts */}
              <style>{`
                @keyframes floatCard {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(-8px); }
                }
              `}</style>

              <div className="hero-alert-right hidden md:block absolute top-6 card-s px-3 py-2.5 text-xs max-w-44"
                style={{ boxShadow: '0 12px 32px rgba(10,10,10,0.10)', animation: 'floatCard 3s ease-in-out infinite' }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center font-extrabold text-[11px]" style={{ background: '#E6FBF4', color: '#00A868', border: '1px solid rgba(0,194,122,0.3)' }}>↑</div>
                  <span className="font-bold text-[12px]" style={{ color: 'var(--text)' }}>{alert1Title}</span>
                </div>
                <div className="text-[11px] font-medium" style={{ color: 'var(--text-soft)' }}>{alert1Sub}</div>
              </div>

              <div className="hero-alert-left hidden md:block absolute bottom-36 card-s px-3 py-2.5 text-xs max-w-48"
                style={{ boxShadow: '0 12px 32px rgba(10,10,10,0.10)', animation: 'floatCard 3s ease-in-out infinite', animationDelay: '1.5s' }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 font-extrabold text-[11px]">!</div>
                  <span className="font-bold text-[12px]" style={{ color: 'var(--text)' }}>{alert2Title}</span>
                </div>
                <div className="text-[11px] font-medium" style={{ color: 'var(--text-soft)' }}>{alert2Sub}</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
