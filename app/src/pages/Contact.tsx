import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { submitContact } from '../lib/api';
import { useSEOMeta } from '@/hooks/useSEOMeta';

gsap.registerPlugin(ScrollTrigger);

// ── Data ────────────────────────────────────────────────────────────────────
const topics = [
  { id: 'general',     label: 'General Question' },
  { id: 'sales',       label: 'Sales / Pricing' },
  { id: 'demo',        label: 'Book a Demo' },
  { id: 'support',     label: 'Technical Support' },
  { id: 'partnership', label: 'Partnership' },
  { id: 'media',       label: 'Media Inquiry' },
];

const channels = [
  {
    label: 'General',
    value: 'hello@serpely.com',
    href: 'mailto:hello@serpely.com',
    badge: '< 24h reply',
    color: '#00A868',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
  },
  {
    label: 'Sales',
    value: 'sales@serpely.com',
    href: 'mailto:sales@serpely.com',
    badge: 'Priority line',
    color: '#7c3aed',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6.29 6.29l.91-1.85a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 15.92z"/>
      </svg>
    ),
  },
  {
    label: 'Support',
    value: 'support@serpely.com',
    href: 'mailto:support@serpely.com',
    badge: '< 4h for Pro+',
    color: '#0ea5e9',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
];

const otherWays = [
  {
    title: 'Documentation',
    desc: 'Guides, API reference, and tutorials to get you up and running fast.',
    href: '#',
    color: '#6366f1',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
  },
  {
    title: 'Community Discord',
    desc: 'Join 2,000+ SEO professionals sharing tactics and getting help.',
    href: '#',
    color: '#5865F2',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    title: 'System Status',
    desc: 'Real-time uptime monitoring, incidents, and maintenance windows.',
    href: '#',
    color: '#00A868',
    status: true,
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    title: 'Book a Demo',
    desc: 'Schedule a 30-min live walkthrough with one of our SEO specialists.',
    href: '#',
    color: '#f59e0b',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
];

const heroStats = [
  { val: '< 24h', label: 'Avg. response time' },
  { val: '500+', label: 'Companies helped' },
  { val: '4.9★', label: 'Customer satisfaction' },
];

// ── Component ────────────────────────────────────────────────────────────────
export function Contact() {
  useSEOMeta('contact', { title: 'Contact Serpely', description: 'Get in touch with the Serpely team. We\'d love to hear from you.' });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', company: '', website: '', message: '' });
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero
      gsap.fromTo('.c-hero-el', { opacity: 0, y: 28 }, {
        opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out', delay: 0.05,
      });
      // Stats
      gsap.fromTo('.c-stat', { opacity: 0, y: 16, scale: 0.96 }, {
        opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08, ease: 'power2.out', delay: 0.3,
      });
      // Form
      gsap.fromTo('.c-form', { opacity: 0, x: -28 }, {
        opacity: 1, x: 0, duration: 0.65, ease: 'power3.out',
        scrollTrigger: { trigger: '.c-form', start: 'top 80%', toggleActions: 'play none none reverse' },
      });
      // Sidebar
      gsap.fromTo('.c-sidebar-item', { opacity: 0, x: 24 }, {
        opacity: 1, x: 0, duration: 0.5, stagger: 0.09, ease: 'power2.out',
        scrollTrigger: { trigger: '.c-sidebar', start: 'top 80%', toggleActions: 'play none none reverse' },
      });
      // Other ways
      gsap.fromTo('.c-other-card', { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out',
        scrollTrigger: { trigger: '.c-other-grid', start: 'top 82%', toggleActions: 'play none none reverse' },
      });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitContact({ ...formData, topic: selectedTopic || undefined });
      setIsSubmitted(true);
    } catch {
      // still show success to user even if API fails
      setIsSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1.5px solid hsl(var(--border))', background: 'var(--input-bg, var(--bg-subtle))',
    color: 'var(--text)', fontSize: 14, outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box', fontFamily: 'inherit',
  };
  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#00C27A';
    e.target.style.boxShadow = '0 0 0 3px rgba(0,194,122,0.12)';
  };
  const blur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'hsl(var(--border))';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div ref={pageRef} style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-14 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,194,122,0.1) 0%, transparent 65%)' }} />
        {/* subtle grid lines */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '60px 60px', opacity: 0.3,
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 0%, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 0%, black 30%, transparent 80%)',
        }} />

        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <div className="c-hero-el mb-5">
            <span className="pill-s inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00C27A' }} />
              Contact Us
            </span>
          </div>
          <h1 className="c-hero-el font-black mb-5" style={{ fontSize: 'clamp(2.4rem,6vw,4rem)', letterSpacing: '-0.05em', lineHeight: 1.02 }}>
            Let's build your{' '}
            <span className="text-gradient">SEO system</span>
            <br/>together
          </h1>
          <p className="c-hero-el text-lg font-medium max-w-xl mx-auto mb-10" style={{ color: 'var(--text-soft)', lineHeight: 1.65 }}>
            Have a question, want a live demo, or need enterprise pricing? Our team responds fast — guaranteed.
          </p>

          {/* Stats row */}
          <div className="flex justify-center gap-0 flex-wrap">
            {heroStats.map((st, i) => (
              <div key={i} className="c-stat" style={{
                padding: '16px 32px', textAlign: 'center',
                borderRight: i < heroStats.length - 1 ? '1px solid hsl(var(--border))' : 'none',
                borderTop: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))',
                borderLeft: i === 0 ? '1px solid hsl(var(--border))' : 'none',
                background: 'var(--card-bg)',
                borderRadius: i === 0 ? '12px 0 0 12px' : i === heroStats.length - 1 ? '0 12px 12px 0' : 0,
              }}>
                <p className="font-black" style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', letterSpacing: '-0.04em', color: 'var(--text)', lineHeight: 1, marginBottom: 4 }}>{st.val}</p>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-faint)', margin: 0 }}>{st.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Main grid ─────────────────────────────────────────────────────── */}
      <section className="pb-24 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_380px] gap-8 items-start">

          {/* LEFT — form */}
          <div className="c-form card-s p-8" style={{ borderRadius: 20 }}>
            {isSubmitted ? (
              <div className="text-center py-16">
                <div style={{
                  width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
                  background: 'rgba(0,194,122,0.1)', border: '2px solid rgba(0,194,122,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                  <svg viewBox="0 0 24 24" style={{ width: 32, height: 32 }} fill="none" stroke="#00C27A" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h3 className="font-black text-2xl mb-3" style={{ letterSpacing: '-0.04em' }}>Message sent!</h3>
                <p className="text-base leading-relaxed mb-2" style={{ color: 'var(--text-soft)', maxWidth: 360, margin: '0 auto 8px' }}>
                  Thanks for reaching out. We'll get back to you within <strong style={{ color: 'var(--text)' }}>24 hours</strong> (usually much faster).
                </p>
                <p className="text-sm mb-8" style={{ color: 'var(--text-faint)' }}>Check your inbox for a confirmation email.</p>
                <button onClick={() => { setIsSubmitted(false); setFormData({ name: '', email: '', company: '', website: '', message: '' }); setSelectedTopic(''); }}
                  className="btn-secondary-s">Send another message</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-black text-xl" style={{ letterSpacing: '-0.035em' }}>Send us a message</h2>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(0,194,122,0.1)', color: '#00A868', border: '1px solid rgba(0,194,122,0.2)' }}>
                    We reply within 24h
                  </span>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                  {/* Topic pills */}
                  <div>
                    <label className="block text-xs font-bold uppercase mb-3" style={{ color: 'var(--text-soft)', letterSpacing: '0.07em' }}>What can we help with?</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {topics.map(t => (
                        <button key={t.id} type="button" onClick={() => setSelectedTopic(t.id === selectedTopic ? '' : t.id)} style={{
                          padding: '7px 14px', borderRadius: 9, border: '1.5px solid',
                          borderColor: selectedTopic === t.id ? '#00C27A' : 'hsl(var(--border))',
                          background: selectedTopic === t.id ? 'rgba(0,194,122,0.09)' : 'var(--bg-subtle)',
                          color: selectedTopic === t.id ? '#00A868' : 'var(--text-soft)',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          transition: 'all 0.15s', fontFamily: 'inherit',
                        }}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name + Email */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--text-soft)', letterSpacing: '0.07em' }}>Name *</label>
                      <input name="name" placeholder="Jane Smith" value={formData.name} onChange={handleChange} required style={inp} onFocus={focus} onBlur={blur} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--text-soft)', letterSpacing: '0.07em' }}>Work Email *</label>
                      <input name="email" type="email" placeholder="jane@company.com" value={formData.email} onChange={handleChange} required style={inp} onFocus={focus} onBlur={blur} />
                    </div>
                  </div>

                  {/* Company + Website */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--text-soft)', letterSpacing: '0.07em' }}>Company</label>
                      <input name="company" placeholder="Acme Inc." value={formData.company} onChange={handleChange} style={inp} onFocus={focus} onBlur={blur} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--text-soft)', letterSpacing: '0.07em' }}>Website</label>
                      <input name="website" placeholder="https://yoursite.com" value={formData.website} onChange={handleChange} style={inp} onFocus={focus} onBlur={blur} />
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--text-soft)', letterSpacing: '0.07em' }}>Message *</label>
                    <textarea name="message" placeholder="Tell us about your project, goals, or questions…" value={formData.message} onChange={handleChange} required rows={5}
                      style={{ ...inp, resize: 'vertical' as const }}
                      onFocus={e => { e.target.style.borderColor = '#00C27A'; e.target.style.boxShadow = '0 0 0 3px rgba(0,194,122,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'hsl(var(--border))'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>

                  {/* Submit */}
                  <button type="submit" disabled={submitting} className="btn-accent-s justify-center" style={{ width: '100%', padding: '13px', fontSize: 15, gap: 8 }}>
                    {submitting ? (
                      <>
                        <svg className="animate-spin" style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
                        </svg>
                        Sending…
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                        Send Message
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs font-medium" style={{ color: 'var(--text-faint)' }}>
                    By submitting, you agree to our{' '}
                    <a href="#" style={{ color: 'var(--text-soft)', textDecoration: 'underline' }}>Privacy Policy</a>.
                  </p>
                </form>
              </>
            )}
          </div>

          {/* RIGHT — sidebar */}
          <div className="c-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Book a Demo — hero card */}
            <div className="c-sidebar-item card-accent-s p-6" style={{ borderRadius: 18 }}>
              <div className="flex items-center gap-2 mb-3">
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: 'rgba(0,194,122,0.15)',
                  border: '1px solid rgba(0,194,122,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, color: '#00A868' }} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <span className="text-xs font-black uppercase" style={{ color: '#00A868', letterSpacing: '0.1em' }}>Live Demo</span>
              </div>
              <h3 className="font-black text-lg mb-2" style={{ letterSpacing: '-0.03em', lineHeight: 1.2 }}>See Serpely in action</h3>
              <p className="text-sm font-medium mb-5" style={{ color: 'var(--text-soft)', lineHeight: 1.6 }}>
                30-minute walkthrough with a specialist. We'll show you exactly what Serpely can do for your site.
              </p>
              <a href="#" className="btn-accent-s" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                Book a Free Demo →
              </a>
              <p className="text-center text-xs mt-3 font-medium" style={{ color: 'var(--text-faint)' }}>No commitment · Pick your time slot</p>
            </div>

            {/* Channel cards */}
            <div className="c-sidebar-item" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {channels.map((ch) => (
                <a key={ch.label} href={ch.href} style={{ textDecoration: 'none' }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = 'translateX(5px)';
                    el.style.borderColor = ch.color + '55';
                    el.style.boxShadow = `0 6px 20px ${ch.color}18`;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = '';
                    el.style.borderColor = '';
                    el.style.boxShadow = '';
                  }}>
                  <div className="card-s flex items-center gap-3 p-4" style={{ borderRadius: 14, transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                      background: ch.color + '12', border: `1px solid ${ch.color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: ch.color,
                    }}>
                      {ch.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="text-xs font-bold uppercase mb-0.5" style={{ color: 'var(--text-faint)', letterSpacing: '0.09em' }}>{ch.label}</p>
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{ch.value}</p>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      background: ch.color + '12', color: ch.color, whiteSpace: 'nowrap', flexShrink: 0,
                      border: `1px solid ${ch.color}25`,
                    }}>{ch.badge}</span>
                  </div>
                </a>
              ))}
            </div>

            {/* Support hours */}
            <div className="c-sidebar-item card-s p-5" style={{ borderRadius: 16 }}>
              <p className="font-bold text-sm mb-4" style={{ color: 'var(--text)' }}>Support Hours</p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { day: 'Mon – Fri', hours: '9AM – 6PM PST', active: true },
                  { day: 'Saturday', hours: '10AM – 4PM PST', active: true },
                  { day: 'Sunday', hours: 'Closed', active: false },
                ].map(row => (
                  <li key={row.day} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: row.active ? '#00C27A' : 'hsl(var(--border))', flexShrink: 0, boxShadow: row.active ? '0 0 6px rgba(0,194,122,0.5)' : 'none' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-soft)' }}>{row.day}</span>
                    </span>
                    <span className="text-xs font-bold" style={{ color: row.active ? 'var(--text)' : 'var(--text-faint)' }}>{row.hours}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Response guarantee */}
            <div className="c-sidebar-item card-s p-5" style={{ borderRadius: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C27A', boxShadow: '0 0 8px rgba(0,194,122,0.55)', flexShrink: 0 }} />
                <span className="text-xs font-black uppercase" style={{ color: 'var(--text-faint)', letterSpacing: '0.09em' }}>Response Guarantee</span>
              </div>
              <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text-soft)' }}>
                We reply to every message within <strong style={{ color: 'var(--text)' }}>24 hours</strong>. Enterprise inquiries get a response within <strong style={{ color: 'var(--text)' }}>4 hours</strong>.
              </p>
            </div>

            {/* Social */}
            <div className="c-sidebar-item" style={{ display: 'flex', gap: 8 }}>
              {[
                { label: 'Twitter / X', href: '#', icon: <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }} fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.762l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
                { label: 'LinkedIn', href: '#', icon: <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }} fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
              ].map(s => (
                <a key={s.label} href={s.href} title={s.label} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '10px', borderRadius: 12, border: '1px solid hsl(var(--border))',
                  background: 'var(--card-bg)', color: 'var(--text-soft)', textDecoration: 'none',
                  fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--card-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-soft)'; }}
                >
                  {s.icon}
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Other ways to connect ──────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ borderTop: '1px solid hsl(var(--border))', background: 'var(--bg-subtle)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="pill-s inline-flex mb-4 items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#00C27A' }} />
              More Ways to Connect
            </span>
            <h2 className="font-black" style={{ fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', letterSpacing: '-0.04em' }}>
              Can't find what you need?
            </h2>
          </div>

          <div className="c-other-grid grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {otherWays.map((w) => (
              <a key={w.title} href={w.href} className="c-other-card card-s" style={{
                display: 'block', padding: '24px 20px', borderRadius: 18, textDecoration: 'none',
                transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = 'translateY(-5px)';
                  el.style.borderColor = w.color + '50';
                  el.style.boxShadow = `0 12px 36px ${w.color}14`;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = '';
                  el.style.borderColor = '';
                  el.style.boxShadow = '';
                }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, marginBottom: 16,
                  background: w.color + '12', border: `1px solid ${w.color}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: w.color,
                }}>
                  {w.icon}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <h3 className="font-black text-sm" style={{ color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>{w.title}</h3>
                  {'status' in w && w.status && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 800, color: '#00A868', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00C27A', animation: 'pulse 2s infinite' }} />
                      All systems up
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.55, margin: 0 }}>{w.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
      <section className="py-16 px-6" style={{ borderTop: '1px solid hsl(var(--border))' }}>
        <div className="max-w-2xl mx-auto text-center">
          <p className="font-black text-xl mb-3" style={{ letterSpacing: '-0.03em' }}>Ready to rank higher?</p>
          <p className="font-medium mb-6 text-sm" style={{ color: 'var(--text-soft)' }}>Start your free trial — no credit card required.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/pricing" className="btn-accent-s">Start Free Trial →</Link>
            <Link to="/features" className="btn-secondary-s">Explore Features</Link>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes scaleIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 0.8s linear infinite; }
      `}</style>

    </div>
  );
}
