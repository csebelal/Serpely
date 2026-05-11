import { useEffect, useRef, useState } from 'react';
import { getFaq } from '@/lib/api';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const faqs = [
  {
    q: 'What makes Serpely different from tools like Semrush or Ahrefs?',
    a: "Semrush and Ahrefs are data libraries. They give you a wall of metrics and leave the prioritization to you. Serpely is a continuous workflow that audits your site daily, scores every page for AI visibility, monitors whether AI engines are citing your content, and tells you exactly what to fix next. It's also the only platform that tracks your presence inside ChatGPT, Perplexity, Gemini, and Google AI Overviews—which are the channels that increasingly decide whether your traffic survives.",
  },
  {
    q: 'What is a GEO Score and why does it matter?',
    a: 'GEO stands for Generative Engine Optimization. The GEO Score is a 0 to 100 number we calculate for every page on your site, measuring how likely it is to appear or be cited inside an AI-generated answer. It looks at factors like content structure, citation eligibility, schema, freshness, and the way AI engines actually parse your page. As more searches end inside AI Overviews and chatbot answers without a click, the GEO Score is the metric that tells you whether your content is set up to survive that shift.',
  },
  {
    q: 'How does Serpely monitor AI citations across ChatGPT, Perplexity, and Google AI?',
    a: 'Serpely runs scheduled queries against ChatGPT, Perplexity, Gemini, and Google AI Overviews using your tracked keywords. We log which brands and domains get cited, how often, and where you sit relative to your competitors. When citation frequency drops, when a competitor takes your spot, or when a new query starts pulling you in, you get alerted. You see all of this in one dashboard instead of manually checking AI engines yourself.',
  },
  {
    q: 'What is Agentic SEO and how is it different from regular SEO software?',
    a: "Regular SEO software waits for you to ask questions. You log in, run a report, interpret it, decide what to do, and act. Agentic SEO flips that. Serpely runs in the background, audits continuously, identifies issues, scores priorities, and surfaces a ranked list of actions every day. Your role shifts from data analyst to decision maker. You stop hunting for what to work on and start executing on what's already been prioritized for you.",
  },
  {
    q: 'Does Serpely replace my existing SEO workflow or sit on top of it?',
    a: "Both, depending on what you're using. Serpely connects directly to Google Search Console and GA4, so it replaces the manual work of pulling and interpreting that data. For most teams, it also replaces standalone rank trackers, technical auditors, and content scoring tools. If you have a niche workflow we don't cover yet, Serpely sits alongside it and exports clean data through its API.",
  },
  {
    q: 'What are Hallucination Alerts and how do they work?',
    a: "AI engines occasionally generate inaccurate information about brands and products, including yours. Serpely's Hallucination Alerts watch for this. When ChatGPT, Perplexity, or another AI model produces a factual error about your brand, your features, or your content, we flag it with a severity score and a recommended fix. You learn about misinformation about your business before your customers do.",
  },
  {
    q: 'How often does Serpely audit my site?',
    a: 'Daily by default. Every 24 hours, Serpely runs a full audit covering on-page SEO, off-page signals, technical health, Core Web Vitals, indexing, schema, and AI citation visibility. Higher tiers run more frequent crawls, down to every six hours. Whenever something material changes, you get a notification and the new findings are added to your prioritized fix queue automatically.',
  },
  {
    q: 'Who is Serpely built for — agencies, startups, or in-house teams?',
    a: "All three. Agencies use multi-client workspaces, white-label reports, and bulk rank tracking to manage portfolios of sites. Startups use Serpely as their full SEO stack from day one because hiring a senior SEO is expensive and slow. In-house and enterprise teams use it for granular roles, compliance logs, and API access at scale. The product adapts to the tier you're on.",
  },
];

function FAQItem({ faq, index }: { faq: typeof faqs[0]; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="faq-item-s faq-reveal"
      style={{
        borderColor: open ? '#00C27A' : undefined,
        boxShadow: open ? '0 4px 20px rgba(0,194,122,0.08)' : undefined,
        transitionDelay: `${index * 0.05}s`,
      }}
    >
      <button
        className="w-full flex items-center justify-between px-6 py-[22px] text-left gap-4"
        style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15.5, letterSpacing: '-0.012em' }}
        onClick={() => setOpen(!open)}
      >
        <span>{faq.q}</span>
        <span
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
          style={{
            background: open ? '#00C27A' : 'var(--bg-subtle)',
            border: `1.5px solid ${open ? '#00C27A' : 'hsl(var(--border))'}`,
            transition: 'background 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        >
          <svg width="11" height="7" viewBox="0 0 11 7" fill="none">
            <path d="M1 1.5l4.5 4 4.5-4" stroke={open ? '#0A0A0A' : 'var(--text-soft)'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
      {open && (
        <div className="px-6 pb-6" style={{ color: 'var(--text-soft)', fontSize: 15, lineHeight: 1.72, fontWeight: 500 }}>
          {faq.a}
        </div>
      )}
    </div>
  );
}

export function FAQSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [liveFaqs, setLiveFaqs] = useState(faqs);

  useEffect(() => {
    getFaq('home').then(r => {
      if (r.data.length > 0)
        setLiveFaqs(r.data.map(f => ({ q: f.question, a: f.answer })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.faq-header', { opacity: 0, y: 28 }, {
        opacity: 1, y: 0, duration: 0.6, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', toggleActions: 'play none none reverse' },
      });
      gsap.fromTo('.faq-reveal', { opacity: 0, y: 18 }, {
        opacity: 1, y: 0, duration: 0.4, stagger: 0.07, ease: 'power2.out',
        scrollTrigger: { trigger: '.faq-list', start: 'top 78%', toggleActions: 'play none none reverse' },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="faq" className="py-28 px-6 relative">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14 faq-header">
          <div className="pill-s mb-5 mx-auto" style={{ width: 'fit-content' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot flex-shrink-0" style={{ background: '#00C27A' }} />
            FAQ
          </div>
          <h2 className="font-black text-4xl lg:text-5xl" style={{ fontWeight: 900, letterSpacing: '-0.045em', color: 'var(--text)' }}>Common Questions</h2>
        </div>
        <div className="space-y-3 faq-list">
          {liveFaqs.map((faq, i) => <FAQItem key={i} faq={faq} index={i} />)}
        </div>
      </div>
    </section>
  );
}
