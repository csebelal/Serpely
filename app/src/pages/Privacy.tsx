import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSEOMeta } from '@/hooks/useSEOMeta';

const SECTIONS = [
  { id: 'information-we-collect', num: '01', title: 'Information We Collect' },
  { id: 'how-we-use', num: '02', title: 'How We Use Your Information' },
  { id: 'how-we-share', num: '03', title: 'How We Share Your Information' },
  { id: 'data-retention', num: '04', title: 'Data Retention' },
  { id: 'rights-choices', num: '05', title: 'Your Rights and Choices' },
  { id: 'cookies', num: '06', title: 'Cookies & Tracking' },
  { id: 'data-security', num: '07', title: 'Data Security' },
  { id: 'international-transfers', num: '08', title: 'International Transfers' },
  { id: 'childrens-privacy', num: '09', title: "Children's Privacy" },
  { id: 'third-party-links', num: '10', title: 'Third-Party Links' },
  { id: 'ai-providers', num: '11', title: 'AI Model Providers' },
  { id: 'changes', num: '12', title: 'Changes to This Policy' },
  { id: 'contact', num: '13', title: 'Contact Us' },
];

const HIGHLIGHTS = [
  { icon: '🔒', title: 'No sale of data', body: 'We never sell your personal information to third parties.' },
  { icon: '🗑️', title: 'Deletion on request', body: 'Request deletion anytime — cleared within 90 days of account closure.' },
  { icon: '🤖', title: 'AI transparency', body: 'Know exactly which AI providers process your prompts and why.' },
];

export function Privacy() {
  useSEOMeta('privacy', {
    title: 'Privacy Policy — Serpely',
    description: 'How Serpely collects, uses, discloses, and safeguards your information.',
  });

  const [active, setActive] = useState(SECTIONS[0].id);
  const [progress, setProgress] = useState(0);

  const ids = useMemo(() => SECTIONS.map(s => s.id), []);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? Math.min(100, (el.scrollTop / total) * 100) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: 0 }
    );
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', paddingBottom: 90 }}>
      {/* Reading progress */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 60, background: 'transparent' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg,#00C27A,#00e68a)', transition: 'width 0.1s linear' }} />
      </div>

      {/* Hero */}
      <section className="pt-32 pb-12 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,194,122,0.13) 0%, transparent 70%)' }} />
        <div className="max-w-3xl mx-auto relative z-10">
          <span className="pill-s mb-5 inline-block">Legal · Privacy</span>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black leading-none mb-5" style={{ letterSpacing: '-0.05em' }}>
            Privacy <span className="text-gradient">Policy</span>
          </h1>
          <p className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto" style={{ color: 'var(--text-soft)' }}>
            How we collect, use, and protect your data across the Serpely platform — in plain language.
          </p>
        </div>
      </section>

      {/* Highlights */}
      <section className="px-6 mb-12">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-4">
          {HIGHLIGHTS.map(h => (
            <div key={h.title} className="card-s p-5 flex gap-3.5 items-start">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: '#00C27A15', border: '1px solid #00C27A30' }}>{h.icon}</div>
              <div>
                <p className="font-black text-sm mb-1" style={{ letterSpacing: '-0.01em' }}>{h.title}</p>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>{h.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Body with sticky TOC */}
      <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-[260px_1fr] gap-8 items-start">
        {/* Sidebar */}
        <aside className="hidden lg:block sticky top-24">
          <div className="card-s p-4">
            <p className="text-[11px] font-black uppercase mb-3 px-2" style={{ color: 'var(--text-faint)', letterSpacing: '0.1em' }}>On this page</p>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {SECTIONS.map(s => {
                const isActive = active === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className="toc-link"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                      padding: '8px 10px', borderRadius: 10, fontSize: 13.5, fontWeight: isActive ? 800 : 500,
                      color: isActive ? '#00A868' : 'var(--text-soft)',
                      background: isActive ? '#00C27A12' : 'transparent',
                      border: isActive ? '1px solid #00C27A25' : '1px solid transparent',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.6 }}>{s.num}</span>
                    {s.title}
                  </button>
                );
              })}
            </nav>
            <div className="mt-4 pt-4 px-2" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              <p className="text-xs mb-2" style={{ color: 'var(--text-soft)' }}>Questions about your data?</p>
              <a href="mailto:privacy@serpely.com" className="text-[13px] font-bold" style={{ color: '#00A868' }}>privacy@serpely.com →</a>
            </div>
          </div>
        </aside>

        {/* Mobile TOC */}
        <div className="lg:hidden -mt-2 mb-2 flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              style={{
                flexShrink: 0, fontSize: 12.5, fontWeight: 700, padding: '7px 13px', borderRadius: 999,
                background: active === s.id ? '#00C27A15' : 'var(--card-bg)',
                border: active === s.id ? '1px solid #00C27A40' : '1px solid hsl(var(--border))',
                color: active === s.id ? '#00A868' : 'var(--text-soft)', cursor: 'pointer',
              }}
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* Content */}
        <article className="card-s" style={{ padding: 'clamp(24px, 4vw, 52px)', fontSize: 15, lineHeight: 1.8, color: 'var(--text-soft)' }}>
          <p style={{ marginTop: 0, fontSize: 15.5 }}>
            Serpely Inc. (&ldquo;Serpely,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, disclose, and safeguard information about you when you use
            Serpely — our AI-powered SEO agent dashboard — including its website, APIs, integrations, and all related
            services (collectively, the &ldquo;Platform&rdquo;). By using the Platform, you agree to the practices described
            in this Privacy Policy. If you do not agree, please discontinue use of the Platform.
          </p>

          <Section id="information-we-collect" num="01" title="Information We Collect" first>
            <h3 style={h3}>1.1 Information You Provide Directly</h3>
            <p>When you register and use the Platform, you may provide:</p>
            <ul style={ul}>
              <li><strong style={strong}>Account Information:</strong> your name, email address, company name, job title, and password when you create an account.</li>
              <li><strong style={strong}>Billing Information:</strong> payment card details, billing address, and transaction history, processed securely through our payment processors. We do not store full card numbers.</li>
              <li><strong style={strong}>Website &amp; Domain Data:</strong> the domain(s) you configure for tracking and optimization within the Platform.</li>
              <li><strong style={strong}>API Credentials:</strong> API keys for third-party integrations such as Google Search Console, SEMrush, Ahrefs, DataForSEO, OpenAI, Anthropic Claude, and Google Gemini, which you connect through the Settings panel.</li>
              <li><strong style={strong}>Brand Kit Content:</strong> logos, brand colors, tone-of-voice descriptions, and target audience information you upload to the Platform&apos;s Creative Studio.</li>
              <li><strong style={strong}>Communications:</strong> any messages, support requests, or feedback you send to us.</li>
            </ul>
            <h3 style={h3}>1.2 Information Collected Automatically</h3>
            <p>When you use the Platform, we automatically collect:</p>
            <ul style={ul}>
              <li><strong style={strong}>Usage Data:</strong> features you access, AI Actions you approve or run, pipeline executions, reports you generate, and navigation patterns within the dashboard.</li>
              <li><strong style={strong}>Log Data:</strong> IP address, browser type, operating system, referring URLs, and timestamps of interactions with the Platform.</li>
              <li><strong style={strong}>Device Information:</strong> device type, screen resolution, and browser version.</li>
              <li><strong style={strong}>Cookies and Similar Technologies:</strong> see Section 6 (Cookies) for details.</li>
            </ul>
            <h3 style={h3}>1.3 SEO and Website Performance Data</h3>
            <p>The Platform collects and processes data from connected integrations and crawls on your behalf, including:</p>
            <ul style={ul}>
              <li>Organic search metrics (clicks, impressions, CTR, average position) from Google Search Console.</li>
              <li>Keyword rankings, search volume, keyword difficulty, and CPC data from connected SEO tools.</li>
              <li>Backlink profiles and referring domain data from link tracking integrations.</li>
              <li>Core Web Vitals and technical SEO metrics from Google PageSpeed Insights and site crawls.</li>
              <li>AI citation and mention data from monitoring queries to AI systems including ChatGPT, Google AI Overview, Google AI Mode, and Gemini.</li>
              <li>Competitor domain data you choose to analyze through the Competitive Research or Individual Page Report features.</li>
            </ul>
            <h3 style={h3}>1.4 AI-Generated Content</h3>
            <p style={{ marginBottom: 0 }}>
              When you use the LLM Council, Autonomous Pipeline, Content Update Queue, or other AI-powered features, the
              Platform transmits relevant content and prompts to third-party AI providers (OpenAI, Anthropic, Google Gemini,
              Perplexity) on your behalf. The content generated by these services in response to your requests is stored on
              the Platform so you can review, approve, and deploy it. Please refer to each AI provider&apos;s privacy policy
              for how they handle your inputs.
            </p>
          </Section>

          <Section id="how-we-use" num="02" title="How We Use Your Information">
            <p>We use the information we collect for the following purposes:</p>
            <h3 style={h3}>2.1 Providing and Operating the Platform</h3>
            <ul style={ul}>
              <li>Authenticating your account and providing access to the features of your Subscription tier.</li>
              <li>Running AI agents, generating recommendations, and executing AI Actions you have approved.</li>
              <li>Displaying dashboards, analytics, reports, and charts populated with your website&apos;s SEO data.</li>
              <li>Enabling Third-Party Integrations by using your API credentials to query connected services.</li>
              <li>Storing and displaying AI-generated content, hallucination alerts, and correction content.</li>
              <li>Generating and deploying llm.txt and related GEO optimization files.</li>
            </ul>
            <h3 style={h3}>2.2 Improving and Developing the Platform</h3>
            <ul style={ul}>
              <li>Analyzing aggregated, de-identified usage patterns to improve feature design and AI model performance.</li>
              <li>Monitoring system performance, diagnosing technical issues, and ensuring Platform reliability.</li>
              <li>Conducting internal research and development on new SEO, GEO, and AI capabilities.</li>
            </ul>
            <h3 style={h3}>2.3 Communication and Support</h3>
            <ul style={ul}>
              <li>Sending transactional emails such as account confirmation, billing receipts, and password resets.</li>
              <li>Delivering product updates, feature announcements, and educational content (you may opt out of marketing communications at any time).</li>
              <li>Responding to your support requests, questions, and feedback.</li>
              <li>Sending real-time SEO alerts and notification panel updates within the Platform.</li>
            </ul>
            <h3 style={h3}>2.4 Legal and Compliance</h3>
            <ul style={ul}>
              <li>Enforcing our Terms and Conditions and other applicable policies.</li>
              <li>Complying with applicable laws, regulations, and legal process.</li>
              <li style={{ marginBottom: 0 }}>Protecting the rights, property, and safety of Serpely Inc., our users, and the public.</li>
            </ul>
          </Section>

          <Section id="how-we-share" num="03" title="How We Share Your Information">
            <p>We do not sell your personal information to third parties. We may share your information in the following limited circumstances:</p>
            <h3 style={h3}>3.1 Service Providers</h3>
            <p>
              We share information with trusted third-party vendors who assist us in operating the Platform, including cloud
              hosting providers, payment processors, email delivery services, analytics platforms, and customer support tools.
              These providers are contractually obligated to process your data only for the purposes we specify and to maintain
              appropriate security standards.
            </p>
            <h3 style={h3}>3.2 Third-Party AI and SEO Integrations</h3>
            <p>
              When you enable integrations (e.g., OpenAI, Anthropic Claude, Google Gemini, SEMrush, Ahrefs, DataForSEO), your
              content, prompts, and data may be transmitted to those services pursuant to your API credentials. Your use of
              those services is governed by their respective terms of service and privacy policies. Serpely acts as a conduit
              and is not responsible for how third-party services process your data.
            </p>
            <h3 style={h3}>3.3 Business Transfers</h3>
            <p>
              If Serpely Inc. undergoes a merger, acquisition, reorganization, or sale of assets, your information may be
              transferred as part of that transaction. We will notify you via email or a prominent notice on the Platform of
              any such change in ownership and any choices you may have regarding your information.
            </p>
            <h3 style={h3}>3.4 Legal Requirements</h3>
            <p>
              We may disclose your information if required to do so by law or in good-faith belief that such disclosure is
              necessary to comply with a legal obligation, protect and defend our rights or property, prevent or investigate
              possible wrongdoing, protect the personal safety of users, or protect against legal liability.
            </p>
            <h3 style={h3}>3.5 With Your Consent</h3>
            <p style={{ marginBottom: 0 }}>We may share your information with third parties for purposes not described in this Policy when we have your explicit consent to do so.</p>
          </Section>

          <Section id="data-retention" num="04" title="Data Retention">
            <p>We retain your personal information for as long as your account is active or as needed to provide the Platform&apos;s services. Specifically:</p>
            <ul style={ul}>
              <li>Account and billing data is retained for the duration of your account plus seven (7) years to comply with tax and financial recordkeeping obligations.</li>
              <li>SEO performance data, keyword rankings, and analytics data collected during your active subscription is retained for the period of your subscription and up to two (2) years thereafter, unless you request earlier deletion.</li>
              <li>AI-generated content, pipeline outputs, and hallucination alerts are retained until you delete them from the Platform or close your account.</li>
              <li>Log data and usage analytics are typically retained for up to twelve (12) months.</li>
            </ul>
            <p style={{ marginBottom: 0 }}>Upon account deletion, we will delete or anonymize your personal data within 90 days, except where retention is required by law or legitimate business necessity.</p>
          </Section>

          <Section id="rights-choices" num="05" title="Your Rights and Choices">
            <p>Depending on your location, you may have the following rights regarding your personal data:</p>
            <h3 style={h3}>5.1 Access and Portability</h3>
            <p>You may request a copy of the personal information we hold about you and, where technically feasible, receive it in a portable, machine-readable format. You can access much of your data directly through the Platform dashboard.</p>
            <h3 style={h3}>5.2 Correction</h3>
            <p>You may update or correct inaccurate account information directly in your account settings, or by contacting us at privacy@serpely.com.</p>
            <h3 style={h3}>5.3 Deletion</h3>
            <p>You may request deletion of your personal information by contacting us. We will honor deletion requests subject to our retention obligations and any overriding legal requirements. Note that deleting your account will terminate your access to the Platform and all stored data.</p>
            <h3 style={h3}>5.4 Restriction and Objection</h3>
            <p>You may request that we restrict the processing of your data in certain circumstances, or object to processing where we rely on legitimate interests as a legal basis.</p>
            <h3 style={h3}>5.5 Withdraw Consent</h3>
            <p>Where processing is based on your consent, you may withdraw consent at any time without affecting the lawfulness of prior processing. For example, you may unsubscribe from marketing emails via the unsubscribe link in any such communication.</p>
            <h3 style={h3}>5.6 How to Exercise Your Rights</h3>
            <p style={{ marginBottom: 0 }}>To exercise any of the above rights, please email privacy@serpely.com with the subject line &ldquo;Privacy Rights Request&rdquo; and include your name, registered email address, and a description of your request. We will respond within 30 days, or as required by applicable law.</p>
          </Section>

          <Section id="cookies" num="06" title="Cookies and Tracking Technologies">
            <p>The Platform uses cookies and similar technologies to operate essential functions and remember your preferences. Types of cookies we use:</p>
            <ul style={ul}>
              <li><strong style={strong}>Essential Cookies:</strong> required for account authentication, session management, and core Platform functionality. These cannot be disabled without affecting Platform operation.</li>
              <li><strong style={strong}>Analytics (cookie-less):</strong> we measure aggregate page views to understand how the Platform is used — which features matter and where technical issues occur. This runs without cookies or persistent identifiers, using aggregated, de-identified data.</li>
              <li><strong style={strong}>Preference Cookies:</strong> remember your settings such as your chosen theme (light or dark mode), sidebar state, and notification preferences.</li>
            </ul>
            <p style={{ marginBottom: 0 }}>You can manage cookie preferences through your browser settings. Please note that disabling certain cookies may impair Platform functionality. We do not use advertising or cross-site tracking cookies.</p>
          </Section>

          <Section id="data-security" num="07" title="Data Security">
            <p>We implement appropriate technical and organizational measures to protect your information against unauthorized access, disclosure, alteration, and destruction. These measures include:</p>
            <ul style={ul}>
              <li>Encryption of data in transit using TLS/SSL and encryption of sensitive data at rest.</li>
              <li>Secure storage of API credentials with access controls limiting exposure to authorized processes only.</li>
              <li>Regular security assessments and vulnerability monitoring.</li>
              <li>Role-based access controls limiting internal employee access to user data on a need-to-know basis.</li>
              <li>Incident response procedures to address potential data breaches promptly and notify affected users as required by law.</li>
            </ul>
            <p style={{ marginBottom: 0 }}>No method of transmission over the internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.</p>
          </Section>

          <Section id="international-transfers" num="08" title="International Data Transfers">
            <p style={{ marginBottom: 0 }}>
              Serpely Inc. operates from and stores data in servers located in the United States and, where applicable, other
              jurisdictions. If you access the Platform from outside the United States, your data may be transferred to and
              processed in the United States or other countries whose data protection laws may differ from your own. Where
              required, we implement appropriate safeguards for international transfers, including Standard Contractual Clauses
              as approved by applicable regulatory authorities.
            </p>
          </Section>

          <Section id="childrens-privacy" num="09" title="Children's Privacy">
            <p style={{ marginBottom: 0 }}>
              The Platform is not directed to children under the age of 16 (or applicable age of digital consent in your
              jurisdiction). We do not knowingly collect personal information from children. If you believe a child has provided
              us with personal information without parental consent, please contact us at privacy@serpely.com and we will take
              steps to delete such information promptly.
            </p>
          </Section>

          <Section id="third-party-links" num="10" title="Third-Party Links and Services">
            <p style={{ marginBottom: 0 }}>
              The Platform may contain links to third-party websites, services, and documentation (such as documentation for
              integrated SEO tools or AI providers). This Privacy Policy does not apply to those external services. We encourage
              you to review the privacy policies of any third-party services you interact with through the Platform.
            </p>
          </Section>

          <Section id="ai-providers" num="11" title="AI Model Providers and Data Processing">
            <p>Serpely&apos;s LLM Council, Autonomous Pipeline, and other AI-powered features transmit content to third-party AI model providers for processing. The following applies:</p>
            <div style={{ display: 'grid', gap: 10, margin: '14px 0' }}>
              {[
                ['OpenAI (GPT-4o)', 'openai.com/policies/privacy-policy', "OpenAI's Privacy Policy and API usage policies"],
                ['Anthropic (Claude)', 'anthropic.com/privacy', "Anthropic's Privacy Policy"],
                ['Google Gemini', 'policies.google.com/privacy', "Google's Privacy Policy and Gemini API terms"],
                ['Perplexity AI', 'perplexity.ai/privacy', "Perplexity's Privacy Policy"],
              ].map(([name, url, desc]) => (
                <div key={name} className="provider-row" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C27A', marginTop: 8, flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 14 }}>
                    <strong style={strong}>{name}:</strong> content submitted is governed by {desc}. Review at {url}.
                  </p>
                </div>
              ))}
            </div>
            <p style={{ marginBottom: 0 }}>
              We recommend reviewing each provider&apos;s data retention and training data policies before submitting sensitive or
              proprietary business information through AI-powered features. Serpely does not instruct these providers to use your
              inputs for training their general-purpose models, but we cannot fully control each provider&apos;s data handling.
            </p>
          </Section>

          <Section id="changes" num="12" title="Changes to This Privacy Policy">
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal
              requirements, or other factors. When we make material changes, we will update the &ldquo;Last Updated&rdquo; date at
              the top of this document and, where appropriate, notify you by email or in-Platform notice. Your continued use of
              the Platform after the effective date of the revised Policy constitutes your acceptance of the changes.
            </p>
            <p style={{ marginBottom: 0 }}>We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.</p>
          </Section>

          <Section id="contact" num="13" title="Contact Us" last>
            <p>If you have questions, concerns, or requests related to this Privacy Policy or our data practices, please contact our Privacy Team:</p>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', marginTop: 16 }}>
              <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)' }}>Email</p>
                <p style={{ margin: '4px 0 0', fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>privacy@serpely.com</p>
              </div>
              <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)' }}>Subject line</p>
                <p style={{ margin: '4px 0 0', fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>Privacy Rights Request</p>
              </div>
              <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)' }}>Website</p>
                <p style={{ margin: '4px 0 0', fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>www.serpely.com/privacy</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
              <Link to="/contact" className="btn-accent-s inline-flex">Contact Privacy Team</Link>
              <Link to="/" className="btn-secondary-s inline-flex">Back to Home</Link>
            </div>
          </Section>
        </article>
      </div>

      <style>{`
        .meta-pill { font-size: 12.5px; font-weight: 700; padding: 7px 14px; border-radius: 999px; background: var(--card-bg); border: 1px solid hsl(var(--border)); color: var(--text-soft); }
        .toc-link:hover { background: #00C27A0d !important; }
        .privacy-section { scroll-margin-top: 110px; padding-top: 30px; margin-top: 10px; border-top: 1px solid hsl(var(--border)); }
        .privacy-section.first { border-top: none; padding-top: 6px; margin-top: 0; }
      `}</style>
    </div>
  );
}

function Section({ id, num, title, children, last, first }: { id: string; num: string; title: string; children: React.ReactNode; last?: boolean; first?: boolean }) {
  return (
    <section id={id} className={`privacy-section${first ? ' first' : ''}`} style={{ marginBottom: last ? 0 : 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 900, padding: '4px 10px', borderRadius: 999, background: '#00C27A15', color: '#00A868', border: '1px solid #00C27A30', letterSpacing: '0.06em' }}>{num}</span>
        <h2 style={{ fontSize: 21, fontWeight: 850, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}

const h3: React.CSSProperties = {
  fontSize: 15.5,
  fontWeight: 750,
  color: 'var(--text)',
  margin: '18px 0 8px',
};

const ul: React.CSSProperties = {
  paddingLeft: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  margin: '8px 0 16px',
};

const strong: React.CSSProperties = { color: 'var(--text)' };
