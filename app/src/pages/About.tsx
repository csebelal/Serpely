import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getSection } from '@/lib/api';
import { useSEOMeta } from '@/hooks/useSEOMeta';

gsap.registerPlugin(ScrollTrigger);

function normalizeImgUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return '/' + url.replace(/\\/g, '/').replace(/^\/+/, '');
}

const defaultStats = [
  { value: '2,000+', label: 'Active Teams' },
  { value: '50M+',   label: 'Keywords Tracked' },
  { value: '99.9%',  label: 'Uptime SLA' },
  { value: '24/7',   label: 'Support' },
];

const visionIcons = [
  <svg key="v0" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
  <svg key="v1" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  <svg key="v2" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
];

const defaultMission = {
  headline: 'Democratize SEO for the AI-first era',
  body: 'We build intelligent tools that help every business thrive in AI-era search — where SEO is automated, accessible, and effective for everyone, not just enterprises with big budgets.',
};

const defaultVisionHeadline = 'A world where every brand thrives in AI-era search';

const defaultVisionPillars = [
  { title: 'AI-Native Search Visibility',   body: 'The future of search is AI-generated answers. Serpely is built from day one to measure and optimize your presence across ChatGPT, Perplexity, Gemini, and every AI surface that matters.',                                                                                         color: '#00C27A' },
  { title: 'Autonomous, Not Just Automated', body: "Automation runs tasks. Autonomy makes decisions. Serpely's agentic pipeline doesn't just report problems — it identifies, prioritizes, and resolves them 24/7 without manual intervention.",                                                                                  color: '#7c3aed' },
  { title: 'Democratize Enterprise SEO',    body: "Fortune 500 teams shouldn't be the only ones with access to world-class SEO intelligence. Serpely makes enterprise-grade tooling accessible to every team, from solo founders to global brands.",                                                                              color: '#0ea5e9' },
];

const defaultValuesHeadline = 'What drives every decision we make';
const defaultValuesSubtext  = 'Six principles shaping how we build, hire, and serve customers.';

const defaultValues = [
  { title: 'Customer First',    body: "Every product decision, every feature shipped, every line of support — it all starts with what's best for our customers. Their wins are our wins.",   color: '#00C27A' },
  { title: 'Move Fast',         body: 'The AI-search landscape evolves daily. We ship fast, iterate relentlessly, and stay ahead so our customers always have an edge.',                      color: '#7c3aed' },
  { title: 'Radical Clarity',   body: "No black boxes. No vanity metrics. We show you exactly what's working, what's not, and what to do next — in plain language.",                         color: '#0ea5e9' },
  { title: 'Accessibility',     body: "Great SEO intelligence shouldn't require a six-figure budget. We price and design for real-world teams, not just enterprise procurement cycles.",      color: '#f59e0b' },
  { title: 'Own the Outcome',   body: "We don't ship features — we deliver results. We measure ourselves by the growth our customers achieve, not the complexity of our product.",           color: '#ec4899' },
  { title: 'Honest by Default', body: 'We tell you when rankings drop, when GEO score falls, when something breaks. Honest signal in your inbox is worth more than comfortable silence.',   color: '#10b981' },
];

const defaultMilestones = [
  { year: '2023',    label: 'Founded',        event: 'Founded in San Francisco by SEO experts and AI engineers frustrated that existing tools were built for the old web.', color: '#00C27A', icon: '🚀' },
  { year: 'Q3 2023', label: 'Beta Launch',    event: 'Launched closed beta with 200 early-access customers. First real-world GEO score data collected across ChatGPT and Google AI Overviews.', color: '#7c3aed', icon: '⚡' },
  { year: 'Q1 2024', label: 'GEO Monitoring', event: 'GEO Monitoring went live — the first AI visibility score on the market. Brands could now see exactly where they appear in AI-generated answers.', color: '#0ea5e9', icon: '🤖' },
  { year: 'Q3 2024', label: '1,000 Teams',    event: 'Crossed 1,000 active teams across 40+ countries. Expanded rank tracking to Perplexity, Gemini, and Grok alongside traditional Google Search.', color: '#f59e0b', icon: '🌍' },
  { year: '2025',    label: 'Agentic SEO',    event: 'Launched the Agentic SEO pipeline — autonomous content optimization running 24/7 without manual effort. Now powering 2,000+ teams worldwide.', color: '#ec4899', icon: '✨' },
];

const defaultTeam = [
  { initials: 'AK', name: 'Alex Kim',    role: 'CEO & Co-Founder', bg: '#00C27A', image: '',
    socials: { linkedin: '#', twitter: '#', facebook: '#' } },
  { initials: 'SR', name: 'Sofia Reyes', role: 'CTO & Co-Founder', bg: '#7c3aed', image: '',
    socials: { linkedin: '#', twitter: '#', facebook: '#' } },
  { initials: 'MB', name: 'Marcus Bell', role: 'Head of Product',  bg: '#0ea5e9', image: '',
    socials: { linkedin: '#', twitter: '#', facebook: '#' } },
  { initials: 'LP', name: 'Lena Park',   role: 'Head of Growth',   bg: '#f59e0b', image: '',
    socials: { linkedin: '#', twitter: '#', facebook: '#' } },
];

const defaultStory = [
  'Serpely began in 2023 when a team of SEO experts and AI engineers came together with a shared frustration: existing tools were built for the old web — too complex, too expensive, requiring constant manual work.',
  'We envisioned a platform that acts as an intelligent partner — monitoring, analyzing, and optimizing automatically. One that tracks brand visibility not just on Google, but across every AI surface reshaping how people search.',
  "Today, Serpely powers 2,000+ teams worldwide, from solo founders to Fortune 500 companies. We're just getting started.",
];

type Milestone = typeof defaultMilestones[0];
function TimelineCard({ m, dir }: { m: Milestone; dir: 'left' | 'right' }) {
  return (
    <div
      className="card-s p-6 cursor-default relative overflow-hidden"
      style={{ borderColor: m.color + '30', transition: 'transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease' }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = dir === 'left' ? 'translateX(-5px)' : 'translateX(5px)';
        el.style.borderColor = m.color + '70';
        el.style.boxShadow = `0 12px 36px ${m.color}20, 0 0 0 1px ${m.color}20`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = '';
        el.style.borderColor = m.color + '30';
        el.style.boxShadow = '';
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${m.color}, ${m.color}00)` }} />
      <div className="flex items-center gap-2.5 mb-3 md:hidden">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: m.color + '18', border: `1.5px solid ${m.color}40` }}>{m.icon}</div>
        <span className="text-xs font-black px-2.5 py-0.5 rounded-full" style={{ background: m.color + '18', color: m.color, border: `1px solid ${m.color}40` }}>{m.year}</span>
      </div>
      <div className="text-xs font-black uppercase mb-2" style={{ color: m.color, letterSpacing: '0.08em' }}>{m.label}</div>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-soft)' }}>{m.event}</p>
    </div>
  );
}

export function About() {
  useSEOMeta('about', { title: 'About Serpely — Our Mission & Team', description: 'Learn about the Serpely team and our mission to build the AI-first SEO platform.' });
  const [stats, setStats]             = useState(defaultStats);
  const [team, setTeam]               = useState(defaultTeam);
  const [milestones, setMilestones]   = useState(defaultMilestones);
  const [storyParagraphs, setStoryParagraphs] = useState(defaultStory);
  const [mission, setMission]             = useState(defaultMission);
  const [visionHeadline, setVisionHeadline] = useState(defaultVisionHeadline);
  const [visionPillars, setVisionPillars] = useState(defaultVisionPillars);
  const [valuesHeadline, setValuesHeadline] = useState(defaultValuesHeadline);
  const [valuesSubtext, setValuesSubtext]   = useState(defaultValuesSubtext);
  const [values, setValues]               = useState(defaultValues);

  useEffect(() => {
    getSection('about').then(r => {
      const d = r.data.data as Record<string, unknown>;
      if (Array.isArray(d.stats))           setStats(d.stats as typeof defaultStats);
      if (Array.isArray(d.team))            setTeam(d.team as typeof defaultTeam);
      if (Array.isArray(d.milestones))      setMilestones(d.milestones as typeof defaultMilestones);
      if (Array.isArray(d.storyParagraphs)) setStoryParagraphs(d.storyParagraphs as string[]);
      if (d.mission && typeof d.mission === 'object') setMission(d.mission as typeof defaultMission);
      if (typeof d.visionHeadline === 'string') setVisionHeadline(d.visionHeadline);
      if (Array.isArray(d.visionPillars))   setVisionPillars(d.visionPillars as typeof defaultVisionPillars);
      if (typeof d.valuesHeadline === 'string') setValuesHeadline(d.valuesHeadline);
      if (typeof d.valuesSubtext === 'string')  setValuesSubtext(d.valuesSubtext);
      if (Array.isArray(d.values))          setValues(d.values as typeof defaultValues);
    }).catch(() => {/* keep defaults */});
  }, []);

  const heroRef     = useRef<HTMLDivElement>(null);
  const statsRef    = useRef<HTMLDivElement>(null);
  const storyRef    = useRef<HTMLDivElement>(null);
  const mvvRef      = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const teamRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.about-hero-el', { opacity: 0, y: 28, duration: 0.7, stagger: 0.1, ease: 'power2.out', scrollTrigger: { trigger: heroRef.current, start: 'top 80%' } });
      gsap.from('.about-stat',    { opacity: 0, y: 20, scale: 0.95, duration: 0.5, stagger: 0.08, ease: 'power2.out', scrollTrigger: { trigger: statsRef.current, start: 'top 80%' } });
      gsap.from('.about-story-el',    { opacity: 0, x: -24, duration: 0.7, stagger: 0.12, ease: 'power2.out', scrollTrigger: { trigger: storyRef.current, start: 'top 75%' } });
      gsap.from('.about-story-right', { opacity: 0, x: 24,  duration: 0.7, ease: 'power2.out', scrollTrigger: { trigger: storyRef.current, start: 'top 75%' } });

      // Mission · Vision · Values
      gsap.from('.about-mvv-head',    { opacity: 0, y: 20, duration: 0.6, ease: 'power2.out', scrollTrigger: { trigger: mvvRef.current, start: 'top 80%' } });
      gsap.from('.about-mvv-mission', { opacity: 0, x: -28, duration: 0.65, ease: 'power2.out', scrollTrigger: { trigger: mvvRef.current, start: 'top 75%' } });
      gsap.from('.about-mvv-vision',  { opacity: 0, x: 28, duration: 0.65, ease: 'power2.out', scrollTrigger: { trigger: mvvRef.current, start: 'top 75%' } });
      gsap.from('.about-mvv-pillar',  { opacity: 0, x: 16, duration: 0.5, stagger: 0.1, ease: 'power2.out', scrollTrigger: { trigger: mvvRef.current, start: 'top 70%' } });
      gsap.from('.about-value',       { opacity: 0, y: 20, duration: 0.45, stagger: 0.06, ease: 'power2.out', scrollTrigger: { trigger: mvvRef.current, start: 'top 65%' } });

      // Timeline
      gsap.fromTo('.tl-line', { scaleY: 0 }, { scaleY: 1, duration: 1.4, ease: 'power2.inOut', scrollTrigger: { trigger: timelineRef.current, start: 'top 75%' } });
      gsap.from('.tl-left',  { opacity: 0, x: -36, duration: 0.6, stagger: 0.18, ease: 'power3.out', scrollTrigger: { trigger: timelineRef.current, start: 'top 72%' } });
      gsap.from('.tl-right', { opacity: 0, x: 36,  duration: 0.6, stagger: 0.18, ease: 'power3.out', scrollTrigger: { trigger: timelineRef.current, start: 'top 72%' } });
      gsap.from('.tl-dot',   { opacity: 0, scale: 0, duration: 0.4, stagger: 0.18, ease: 'back.out(2)', scrollTrigger: { trigger: timelineRef.current, start: 'top 72%' } });

      // Team
      gsap.from('.about-member', { opacity: 0, y: 20, scale: 0.96, duration: 0.5, stagger: 0.1, ease: 'power2.out', scrollTrigger: { trigger: teamRef.current, start: 'top 80%' } });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section ref={heroRef} className="pt-32 pb-20 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,194,122,0.13) 0%, transparent 70%)' }} />
        <div className="max-w-3xl mx-auto relative z-10">
          <span className="pill-s mb-5 inline-block about-hero-el">About Serpely</span>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black leading-none mb-6 about-hero-el" style={{ letterSpacing: '-0.05em' }}>
            Built for the <span className="text-gradient">AI-first web</span>
          </h1>
          <p className="text-lg leading-relaxed mb-8 max-w-xl mx-auto about-hero-el" style={{ color: 'var(--text-soft)' }}>
            Serpely was founded with a simple mission: make SEO accessible, actionable, and automated for every team — as AI reshapes how people find and trust content online.
          </p>
          <div className="flex flex-wrap gap-3 justify-center about-hero-el">
            <Link to="/pricing" className="btn-accent-s">Get Started Free</Link>
            <Link to="/contact" className="btn-secondary-s">Talk to Us</Link>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <section ref={statsRef} className="py-12 px-6 border-y" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="about-stat card-s text-center py-7 cursor-default"
              style={{ transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = 'var(--shadow-hover)'; el.style.borderColor = 'rgba(0,194,122,0.35)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = ''; el.style.borderColor = ''; }}>
              <p className="text-3xl font-black text-gradient mb-1">{s.value}</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-soft)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Story ────────────────────────────────────────────────── */}
      <section ref={storyRef} className="py-24 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="pill-s mb-4 inline-block about-story-el">Our Story</span>
            <h2 className="font-display text-3xl sm:text-4xl font-black mb-6 about-story-el" style={{ letterSpacing: '-0.04em' }}>
              Why we built <span className="text-gradient">Serpely</span>
            </h2>
            <div className="space-y-4 text-base leading-relaxed about-story-el" style={{ color: 'var(--text-soft)' }}>
              {storyParagraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <div className="flex gap-4 mt-8 about-story-el">
              <Link to="/features" className="btn-accent-s">See Features</Link>
              <Link to="/pricing" className="btn-secondary-s">View Pricing</Link>
            </div>
          </div>
          <div className="about-story-right card-s p-0 overflow-hidden rounded-2xl"
            style={{ transition: 'transform 0.25s, box-shadow 0.25s' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = 'var(--shadow-hover)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = ''; }}>
            <img src="/team-photo.jpg" alt="The Serpely Team" className="w-full h-full object-cover" style={{ minHeight: 320, display: 'block' }} />
          </div>
        </div>
      </section>

      {/* ── Mission · Vision · Values ────────────────────────────── */}
      <section ref={mvvRef} className="py-24 px-6 relative overflow-hidden" style={{ borderTop: '1px solid hsl(var(--border))' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 15% 50%, rgba(0,194,122,0.05) 0%, transparent 60%)' }} />
        <div className="max-w-6xl mx-auto relative z-10">

          {/* Header */}
          <div className="text-center mb-14 about-mvv-head">
            <span className="pill-s mb-4 inline-block">Who We Are</span>
            <h2 className="font-display text-3xl sm:text-4xl font-black mb-3" style={{ letterSpacing: '-0.04em' }}>
              Mission · Vision · Values
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--text-soft)' }}>
              Three principles that define why we exist, where we're going, and how we operate every day.
            </p>
          </div>

          {/* Mission + Vision row */}
          <div className="grid lg:grid-cols-[1fr_1.35fr] gap-5 mb-5">

            {/* Mission — dark card */}
            <div className="about-mvv-mission relative overflow-hidden rounded-2xl p-8 flex flex-col justify-between"
              style={{ background: 'linear-gradient(145deg, #030d08 0%, #071a10 45%, #0a2318 100%)', border: '1px solid rgba(0,194,122,0.15)', minHeight: 340 }}>
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 90% 70% at 10% 90%, rgba(0,194,122,0.14) 0%, transparent 60%)' }} />
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,194,122,0.5) 50%, transparent)' }} />
              <div className="relative z-10">
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase px-3 py-1.5 rounded-full mb-5"
                  style={{ background: 'rgba(0,194,122,0.15)', color: '#00C27A', border: '1px solid rgba(0,194,122,0.25)', letterSpacing: '0.08em' }}>
                  Our Mission
                </span>
                <h3 className="font-display text-2xl lg:text-3xl font-black text-white mb-4" style={{ letterSpacing: '-0.04em', lineHeight: 1.1 }}>
                  {mission.headline}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {mission.body}
                </p>
              </div>
              <Link to="/pricing" className="btn-accent-s inline-flex mt-8 relative z-10" style={{ alignSelf: 'flex-start' }}>
                Start for Free
              </Link>
            </div>

            {/* Vision — compact horizontal pillar cards */}
            <div className="about-mvv-vision flex flex-col gap-3">
              <div className="mb-1">
                <span className="pill-s inline-block mb-2">Our Vision</span>
                <h3 className="font-display text-xl font-black" style={{ letterSpacing: '-0.03em' }}>
                  {visionHeadline}
                </h3>
              </div>
              {visionPillars.map((p, i) => {
                const num  = String(i + 1).padStart(2, '0');
                const icon = visionIcons[i];
                return (
                  <div key={i} className="about-mvv-pillar card-s p-4 flex items-start gap-4 relative overflow-hidden cursor-default"
                    style={{ borderColor: p.color + '25', transition: 'border-color 0.25s, box-shadow 0.25s, transform 0.25s' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = p.color + '55'; el.style.boxShadow = `0 10px 28px ${p.color}18`; el.style.transform = 'translateX(4px)'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = p.color + '25'; el.style.boxShadow = ''; el.style.transform = ''; }}>
                    <div className="absolute top-0 left-0 bottom-0 w-0.5 rounded-full" style={{ background: `linear-gradient(to bottom, ${p.color}, ${p.color}20)` }} />
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: p.color + '15', border: `1px solid ${p.color}30`, color: p.color }}>
                      {icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black" style={{ color: p.color }}>{num}</span>
                        <h4 className="font-black text-sm" style={{ letterSpacing: '-0.01em' }}>{p.title}</h4>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-soft)' }}>{p.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Values — full width below */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <span className="pill-s inline-block mb-2">Our Values</span>
                <h3 className="font-display text-xl font-black" style={{ letterSpacing: '-0.03em' }}>{valuesHeadline}</h3>
              </div>
              <p className="text-sm max-w-xs" style={{ color: 'var(--text-soft)' }}>{valuesSubtext}</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {values.map((v, i) => {
                const num = String(i + 1).padStart(2, '0');
                return (
                  <div key={i} className="about-value cursor-default relative"
                    style={{ transition: 'transform 0.25s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; }}>
                    <div className="card-s p-5 h-full relative overflow-hidden"
                      style={{ transition: 'border-color 0.25s, box-shadow 0.25s' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = v.color + '50'; el.style.boxShadow = `0 14px 36px ${v.color}14`; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = ''; el.style.boxShadow = ''; }}>
                      <div className="absolute bottom-2 right-3 text-5xl font-black select-none pointer-events-none" style={{ color: v.color + '0d', lineHeight: 1, letterSpacing: '-0.05em' }}>{num}</div>
                      <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full" style={{ background: v.color + '40' }} />
                      <div className="pl-4 relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-black" style={{ color: v.color }}>{num}</span>
                          <h4 className="font-black text-sm uppercase" style={{ color: 'var(--text)', letterSpacing: '0.04em' }}>{v.title}</h4>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-soft)' }}>{v.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Timeline ─────────────────────────────────────────────── */}
      <section ref={timelineRef} className="py-24 px-6 overflow-hidden" style={{ borderTop: '1px solid hsl(var(--border))' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="pill-s mb-4 inline-block">Timeline</span>
            <h2 className="font-display text-3xl sm:text-4xl font-black" style={{ letterSpacing: '-0.04em' }}>Our journey so far</h2>
            <p className="mt-3 text-sm font-medium" style={{ color: 'var(--text-faint)' }}>From idea to 2,000+ teams in two years</p>
          </div>
          <div className="relative">
            <div className="tl-line absolute left-1/2 top-0 bottom-0 w-px origin-top hidden md:block"
              style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,194,122,0.5) 10%, rgba(0,194,122,0.3) 90%, transparent)', transform: 'translateX(-50%)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
              {milestones.map((m, i) => {
                const isLeft = i % 2 === 0;
                return (
                  <div key={i} className="relative flex items-center">
                    <div className="hidden md:grid md:grid-cols-2 md:gap-16 md:items-center w-full">
                      <div className={`tl-left ${isLeft ? '' : 'pointer-events-none opacity-0'}`}>
                        {isLeft && <TimelineCard m={m} dir="left" />}
                      </div>
                      <div className={`tl-right ${!isLeft ? '' : 'pointer-events-none opacity-0'}`}>
                        {!isLeft && <TimelineCard m={m} dir="right" />}
                      </div>
                    </div>
                    <div className="tl-dot absolute left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center z-10">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl relative"
                        style={{ background: m.color + '18', border: `2px solid ${m.color}55`, boxShadow: `0 0 0 6px ${m.color}0e, 0 0 28px ${m.color}35` }}>
                        {m.icon}
                        <div className="absolute inset-0 rounded-full animate-ping opacity-50" style={{ background: m.color + '20' }} />
                      </div>
                      <div className="mt-2 px-3 py-1 rounded-full text-xs font-black"
                        style={{ background: m.color + '18', color: m.color, border: `1px solid ${m.color}40` }}>
                        {m.year}
                      </div>
                    </div>
                    <div className="md:hidden w-full"><TimelineCard m={m} dir="right" /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Team ─────────────────────────────────────────────────── */}
      <section ref={teamRef} className="py-24 px-6" style={{ borderTop: '1px solid hsl(var(--border))' }}>
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14">
            <div>
              <span className="pill-s mb-4 inline-block">Leadership</span>
              <h2 className="font-display text-3xl sm:text-4xl font-black" style={{ letterSpacing: '-0.04em' }}>Meet the team</h2>
              <p className="mt-2 text-sm font-medium" style={{ color: 'var(--text-faint)' }}>The people building the future of AI-era SEO</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
              style={{ background: 'rgba(0,194,122,0.08)', border: '1px solid rgba(0,194,122,0.2)', color: '#00A868' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C27A] animate-pulse inline-block" />
              Hiring across all roles
            </div>
          </div>

          {/* Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {team.map(m => (
              <div key={m.name} className="about-member group relative overflow-hidden rounded-2xl cursor-default"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid hsl(var(--border))',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = 'translateY(-7px)';
                  el.style.boxShadow = `0 28px 60px ${m.bg}20, 0 0 0 1px ${m.bg}35`;
                  el.style.borderColor = m.bg + '45';
                  const img = el.querySelector('.team-photo') as HTMLElement;
                  if (img) img.style.transform = 'scale(1.07)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = '';
                  el.style.boxShadow = '';
                  el.style.borderColor = '';
                  const img = el.querySelector('.team-photo') as HTMLElement;
                  if (img) img.style.transform = '';
                }}>

                {/* Photo area */}
                <div className="relative overflow-hidden" style={{ height: 210 }}>
                  {/* Grid texture bg */}
                  <div className="absolute inset-0" style={{
                    background: `linear-gradient(145deg, ${m.bg}14 0%, ${m.bg}06 100%)`,
                    backgroundImage: `linear-gradient(${m.bg}12 1px, transparent 1px), linear-gradient(90deg, ${m.bg}12 1px, transparent 1px)`,
                    backgroundSize: '22px 22px',
                  }} />
                  {/* Radial glow */}
                  <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 80%, ${m.bg}18 0%, transparent 70%)` }} />

                  {/* Photo or initials */}
                  {m.image ? (
                    <img src={normalizeImgUrl(m.image)} alt={m.name} className="team-photo absolute inset-0 w-full h-full object-cover object-top"
                      style={{ transition: 'transform 0.5s ease' }} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black"
                          style={{ background: m.bg + '20', border: `2px solid ${m.bg}50`, color: m.bg, letterSpacing: '-0.03em' }}>
                          {m.initials}
                        </div>
                        <div className="absolute -inset-1 rounded-2xl opacity-30 blur-sm" style={{ background: m.bg + '30' }} />
                      </div>
                    </div>
                  )}

                  {/* Top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${m.bg} 50%, transparent)` }} />
                  {/* Bottom fade into card */}
                  <div className="absolute bottom-0 left-0 right-0 h-14" style={{ background: `linear-gradient(to top, var(--card-bg), transparent)` }} />
                </div>

                {/* Info */}
                <div className="px-5 pb-5 pt-1">
                  <p className="font-black text-base leading-tight mb-0.5" style={{ letterSpacing: '-0.02em' }}>{m.name}</p>
                  <p className="text-xs font-bold uppercase mb-4" style={{ color: m.bg, letterSpacing: '0.08em' }}>{m.role}</p>

                  {/* Social links */}
                  <div className="flex items-center gap-2">
                    {/* LinkedIn */}
                    <a href={m.socials.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))', color: 'var(--text-faint)', transition: 'color 0.2s, background 0.2s, border-color 0.2s, transform 0.2s' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#0077B5'; el.style.background = '#0077B514'; el.style.borderColor = '#0077B530'; el.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = ''; el.style.background = ''; el.style.borderColor = ''; el.style.transform = ''; }}>
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                    </a>
                    {/* X / Twitter */}
                    <a href={m.socials.twitter} target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)"
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))', color: 'var(--text-faint)', transition: 'color 0.2s, background 0.2s, border-color 0.2s, transform 0.2s' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text)'; el.style.background = 'hsl(var(--border))'; el.style.borderColor = 'var(--text-faint)'; el.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = ''; el.style.background = ''; el.style.borderColor = ''; el.style.transform = ''; }}>
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.73-8.835L1.254 2.25H8.08l4.213 5.567L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>
                    </a>
                    {/* Facebook */}
                    <a href={m.socials.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))', color: 'var(--text-faint)', transition: 'color 0.2s, background 0.2s, border-color 0.2s, transform 0.2s' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#1877F2'; el.style.background = '#1877F214'; el.style.borderColor = '#1877F230'; el.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = ''; el.style.background = ''; el.style.borderColor = ''; el.style.transform = ''; }}>
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                    </a>

                    {/* View profile link */}
                    <a href="#" aria-label="View full profile"
                      className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: m.bg + '12', border: `1px solid ${m.bg}30`, color: m.bg, transition: 'background 0.2s, transform 0.2s' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = m.bg + '25'; el.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = m.bg + '12'; el.style.transform = ''; }}>
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="cta-dark-s text-center" style={{ padding: 'clamp(40px, 6vw, 80px) clamp(24px, 5vw, 64px)' }}>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-white mb-4" style={{ letterSpacing: '-0.04em' }}>Ready to grow faster?</h2>
            <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Join 2,000+ teams using Serpely to dominate AI-era search. No credit card required.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link to="/pricing" className="btn-accent-s inline-flex">Start for Free</Link>
              <Link to="/contact" className="btn-secondary-s inline-flex" style={{ color: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.2)' }}>Talk to Sales</Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
