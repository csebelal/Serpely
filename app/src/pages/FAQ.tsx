import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSEOMeta } from '@/hooks/useSEOMeta';
import { injectSchema, removeSchema } from '@/lib/schema';

export function FAQ() {
  useSEOMeta('faq', { title: 'FAQ — Serpely', description: 'Frequently asked questions about Serpely, AI SEO, and GEO monitoring.' });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  useEffect(() => {
    const allQAs = [
      { question: 'What is Agentic SEO?', answer: "Agentic SEO uses AI-driven workflows to continuously monitor rankings, prioritize optimizations, and report performance without manual context switching." },
      { question: 'What is Generative Engine Optimization (GEO)?', answer: 'Generative Engine Optimization improves visibility across AI-powered search engines and generative search results beyond traditional rankings.' },
      { question: 'How is Serpely different from Ahrefs or Semrush?', answer: 'Unlike traditional SEO tools that focus mainly on data, Serpely connects rank tracking, auditing, content optimization, and reporting into a continuous workflow powered by AI agents.' },
      { question: 'Does Serpely include technical SEO monitoring?', answer: 'Yes. Continuous audits cover Core Web Vitals, crawl errors, indexing issues, and on-page SEO optimization factors.' },
      { question: 'Can agencies manage multiple clients in Serpely?', answer: 'Multi-client workspaces allow agencies to isolate domains, generate white-label SEO reports, and track performance across all client accounts.' },
      { question: 'Does the platform integrate with Google Analytics and Search Console?', answer: 'Yes. Integration with GA and GSC centralizes traffic data, keyword impressions, click-through rates, and search visibility insights.' },
    ];
    injectSchema('schema-faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: allQAs.map(qa => ({
        '@type': 'Question',
        name: qa.question,
        acceptedAnswer: { '@type': 'Answer', text: qa.answer },
      })),
    });
    return () => removeSchema('schema-faq');
  }, []);

  const faqs = [
    {
      category: 'General',
      questions: [
        { question: 'What is Agentic SEO?', answer: "Agentic SEO uses AI-driven workflows to continuously monitor rankings, prioritize optimizations, and report performance without manual context switching. It's a proactive approach where the system acts on your behalf to improve search visibility." },
        { question: 'How does Serpely support Agentic SEO?', answer: 'Serpely combines rank tracking, technical SEO monitoring, content prioritization, GEO visibility, and reporting into one unified AI-powered optimization loop. Our agents work 24/7 to identify opportunities and execute optimizations.' },
        { question: 'What is Generative Engine Optimization (GEO)?', answer: 'Generative Engine Optimization improves visibility across AI-powered search engines and generative search results beyond traditional rankings. As search evolves with AI, GEO ensures your content is discoverable in LLM-driven results.' },
      ],
    },
    {
      category: 'Product',
      questions: [
        { question: 'Can Serpely track visibility across AI-driven and LLM search?', answer: 'Yes. Serpely monitors keyword performance and provides insights into LLM search visibility and evolving generative search environments. We track how your content appears in AI-powered search results.' },
        { question: 'How is Serpely different from Ahrefs or Semrush?', answer: 'Unlike traditional SEO tools that focus mainly on data, Serpely connects rank tracking, auditing, content optimization, and reporting into a continuous track-optimize-report workflow powered by AI agents.' },
        { question: "How accurate is Serpely's keyword rank tracking?", answer: 'Serpely provides real-time keyword tracking across desktop and mobile search, helping teams monitor SERP movements and performance shifts accurately. We update rankings daily with 99.9% accuracy.' },
        { question: 'Does Serpely include technical SEO monitoring?', answer: 'Yes. Continuous audits cover Core Web Vitals, crawl errors, indexing issues, and on-page SEO optimization factors. Our system alerts you to issues before they impact your rankings.' },
        { question: 'How does content prioritization work inside Serpely?', answer: "AI-driven scoring analyzes ranking decay, traffic trends, and keyword gaps to recommend which pages to update for maximum SEO impact. You'll always know what to work on next." },
      ],
    },
    {
      category: 'Account & Billing',
      questions: [
        { question: 'Can agencies manage multiple clients in Serpely?', answer: 'Multi-client workspaces allow agencies to isolate domains, generate white-label SEO reports, and track performance across all client accounts.' },
        { question: 'Does Serpely support white-label SEO reporting?', answer: 'Yes. Agencies can generate branded dashboards and automated SEO performance reports for clients.' },
        { question: 'Does the platform integrate with Google Analytics and Search Console?', answer: 'Yes. Integration with GA and GSC centralizes traffic data, keyword impressions, click-through rates, and search visibility insights.' },
        { question: 'Can I monitor backlink performance?', answer: 'Backlink monitoring tracks new and lost links, evaluates authority, and identifies link-building opportunities.' },
      ],
    },
    {
      category: 'Enterprise',
      questions: [
        { question: 'Is Serpely suitable for enterprise SEO teams?', answer: 'Yes. Enterprise plans include granular roles and permissions, SSO integration, audit logs, API access, and scalable SEO data workflows.' },
        { question: 'How does AI improve SEO optimization?', answer: 'AI enhances SEO by automating rank tracking, detecting technical issues, clustering keywords, and prioritizing content updates based on impact.' },
        { question: 'Who is Serpely built for?', answer: 'Serpely is built for agencies, startups, in-house marketing teams, and enterprise SEO operations looking to scale keyword tracking, technical optimization, and AI-driven search visibility.' },
      ],
    },
  ];

  const categories = ['All', ...faqs.map(f => f.category)];

  const filtered = faqs
    .filter(cat => activeCategory === 'All' || cat.category === activeCategory)
    .map(cat => ({
      ...cat,
      questions: cat.questions.filter(q =>
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.answer.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter(cat => cat.questions.length > 0);

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Hero */}
      <section className="pt-32 pb-16 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,194,122,0.12) 0%, transparent 70%)' }} />
        <div className="max-w-2xl mx-auto relative z-10">
          <span className="pill-s mb-5 inline-block">FAQ</span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold leading-tight mb-5">
            Frequently asked{' '}
            <span className="text-gradient">questions</span>
          </h1>
          <p className="text-lg mb-8" style={{ color: 'var(--text-soft)' }}>
            Find answers to common questions about Serpely and Agentic SEO.
          </p>
          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <svg viewBox="0 0 24 24" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-faint)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
              onFocus={e => (e.target.style.borderColor = '#00C27A')}
              onBlur={e => (e.target.style.borderColor = 'hsl(var(--border))')}
            />
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mb-10">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  border: '1px solid hsl(var(--border))',
                  background: activeCategory === cat ? 'var(--text)' : 'var(--card-bg)',
                  color: activeCategory === cat ? 'var(--bg)' : 'var(--text-soft)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {filtered.length > 0 ? (
            filtered.map((cat, ci) => (
              <div key={ci} className="mb-10">
                <h2 className="font-bold text-xs uppercase mb-5" style={{ color: 'var(--text-faint)', letterSpacing: '0.12em' }}>{cat.category}</h2>
                <div className="space-y-3">
                  {cat.questions.map((faq, fi) => {
                    const key = `${ci}-${fi}`;
                    const isOpen = openIndex === key;
                    return (
                      <div
                        key={fi}
                        onClick={() => setOpenIndex(isOpen ? null : key)}
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 16,
                          padding: '0 24px',
                          cursor: 'pointer',
                          transition: 'box-shadow 0.2s',
                          boxShadow: isOpen ? '0 4px 20px rgba(0,0,0,0.08)' : 'none',
                        }}
                      >
                        <div className="flex items-center justify-between gap-4 py-5">
                          <span className="font-semibold" style={{ fontSize: 15 }}>{faq.question}</span>
                          <svg
                            viewBox="0 0 24 24"
                            className="w-4 h-4 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-faint)' }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </div>
                        {isOpen && (
                          <p className="pb-5 text-sm leading-relaxed" style={{ color: 'var(--text-soft)', borderTop: '1px solid hsl(var(--border))', paddingTop: 16 }}>{faq.answer}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p style={{ color: 'var(--text-soft)' }}>No questions found matching your search.</p>
            </div>
          )}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="card-accent-s text-center">
            <h2 className="font-display text-2xl font-bold mb-3">Still have questions?</h2>
            <p className="mb-6 text-sm" style={{ color: 'var(--text-soft)' }}>
              Can't find the answer you're looking for? Our team is here to help.
            </p>
            <Link to="/contact" className="btn-accent-s inline-flex">Contact Support</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
