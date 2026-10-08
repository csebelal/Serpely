import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSEOMeta } from '@/hooks/useSEOMeta';

const SECTIONS = [
  { id: 'definitions', num: '01', title: 'Definitions' },
  { id: 'eligibility', num: '02', title: 'Eligibility & Registration' },
  { id: 'license', num: '03', title: 'License & Permitted Use' },
  { id: 'ai-actions', num: '04', title: 'AI Actions & Automation' },
  { id: 'integrations', num: '05', title: 'Third-Party Integrations' },
  { id: 'billing', num: '06', title: 'Subscription & Billing' },
  { id: 'ip', num: '07', title: 'Intellectual Property' },
  { id: 'privacy', num: '08', title: 'Data & Privacy' },
  { id: 'confidentiality', num: '09', title: 'Confidentiality' },
  { id: 'disclaimers', num: '10', title: 'Disclaimers & Liability' },
  { id: 'indemnification', num: '11', title: 'Indemnification' },
  { id: 'termination', num: '12', title: 'Termination' },
  { id: 'governing-law', num: '13', title: 'Governing Law' },
  { id: 'changes', num: '14', title: 'Changes to Terms' },
  { id: 'general', num: '15', title: 'General Provisions' },
  { id: 'contact', num: '16', title: 'Contact Us' },
];

const HIGHLIGHTS = [
  { icon: '✅', title: 'Fair internal use', body: 'Use Serpely for your own SEO work — monitor, analyze, and optimize.' },
  { icon: '©️', title: 'You own your content', body: 'Your uploads and generated content stay yours, always.' },
  { icon: '↩️', title: 'Cancel anytime', body: 'Cancel in account settings — paid access runs till period end.' },
];

export function Terms() {
  useSEOMeta('terms', {
    title: 'Terms and Conditions — Serpely',
    description: 'The terms governing your access to and use of the Serpely platform.',
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
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 60, background: 'transparent' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg,#00C27A,#00e68a)', transition: 'width 0.1s linear' }} />
      </div>

      <section className="pt-32 pb-12 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,194,122,0.13) 0%, transparent 70%)' }} />
        <div className="max-w-3xl mx-auto relative z-10">
          <span className="pill-s mb-5 inline-block">Legal · Terms</span>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black leading-none mb-5" style={{ letterSpacing: '-0.05em' }}>
            Terms & <span className="text-gradient">Conditions</span>
          </h1>
          <p className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto" style={{ color: 'var(--text-soft)' }}>
            Please read carefully before using Serpely — by creating an account you agree to these terms.
          </p>
        </div>
      </section>

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

      <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-[260px_1fr] gap-8 items-start">
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
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                      padding: '7px 10px', borderRadius: 10, fontSize: 13, fontWeight: isActive ? 800 : 500,
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
              <p className="text-xs mb-2" style={{ color: 'var(--text-soft)' }}>Legal questions?</p>
              <a href="mailto:legal@serpely.com" className="text-[13px] font-bold" style={{ color: '#00A868' }}>legal@serpely.com →</a>
            </div>
          </div>
        </aside>

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

        <article className="card-s" style={{ padding: 'clamp(24px, 4vw, 52px)', fontSize: 15, lineHeight: 1.8, color: 'var(--text-soft)' }}>
          <p style={{ marginTop: 0, fontSize: 15.5 }}>
            Please read these Terms and Conditions (&ldquo;Terms&rdquo;) carefully before accessing or using Serpely
            (&ldquo;the Platform&rdquo;), an AI-powered SEO agent dashboard provided by Serpely Inc.
            (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By creating an account,
            accessing, or using Serpely, you (&ldquo;User&rdquo; or &ldquo;you&rdquo;) agree to be bound by these Terms.
            If you do not agree, you must not use the Platform.
          </p>

          <Section id="definitions" num="01" title="Definitions" first>
            <p>For the purposes of these Terms, the following definitions apply:</p>
            <ul style={ul}>
              <li><strong style={strong}>&ldquo;Platform&rdquo;</strong> refers to the Serpely web application, APIs, integrations, AI agents, and all related services operated by Serpely Inc.</li>
              <li><strong style={strong}>&ldquo;User&rdquo;</strong> means any individual or entity that registers for or uses the Platform, including SEO professionals, site owners, and their authorized team members.</li>
              <li><strong style={strong}>&ldquo;Content&rdquo;</strong> refers to any text, data, reports, keyword data, AI-generated recommendations, infographics, images, scripts, or other material generated, processed, or displayed through the Platform.</li>
              <li><strong style={strong}>&ldquo;AI Actions&rdquo;</strong> refers to automated changes, recommendations, content updates, technical fixes, or optimizations executed by Serpely&apos;s AI agents on a User&apos;s website or content.</li>
              <li><strong style={strong}>&ldquo;Third-Party Integrations&rdquo;</strong> means external tools and services connected to the Platform, including Google Search Console, SEMrush, Ahrefs, DataForSEO, OpenAI, Anthropic Claude, Google Gemini, and others.</li>
              <li style={{ marginBottom: 0 }}><strong style={strong}>&ldquo;Subscription&rdquo;</strong> means the paid or trial plan under which a User accesses the Platform.</li>
            </ul>
          </Section>

          <Section id="eligibility" num="02" title="Eligibility and Account Registration">
            <h3 style={h3}>2.1 Eligibility</h3>
            <p>You must be at least 18 years of age and capable of entering into a legally binding agreement to use the Platform. By registering, you represent and warrant that you meet these requirements and that all registration information you provide is accurate, current, and complete.</p>
            <h3 style={h3}>2.2 Account Security</h3>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately at support@serpely.com of any unauthorized use of your account. Serpely Inc. is not liable for any losses resulting from unauthorized account access caused by your failure to safeguard your credentials.</p>
            <h3 style={h3}>2.3 Business Use</h3>
            <p style={{ marginBottom: 0 }}>If you are accessing the Platform on behalf of an organization or business, you represent that you have the authority to bind that organization to these Terms, and references to &ldquo;you&rdquo; include both you individually and that organization.</p>
          </Section>

          <Section id="license" num="03" title="License and Permitted Use">
            <h3 style={h3}>3.1 License Grant</h3>
            <p>Subject to your compliance with these Terms and payment of applicable fees, Serpely Inc. grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Platform solely for your internal business purposes related to search engine optimization and digital marketing.</p>
            <h3 style={h3}>3.2 Acceptable Use</h3>
            <p>You agree to use the Platform only for lawful purposes. You may use the Platform to:</p>
            <ul style={ul}>
              <li>Monitor, analyze, and optimize your website&apos;s organic search performance.</li>
              <li>Track keyword rankings, backlinks, traffic, and technical SEO metrics.</li>
              <li>Generate AI-powered content recommendations and execute approved updates.</li>
              <li>Monitor AI citation presence and manage Generative Engine Optimization (GEO) activities.</li>
              <li>Connect and manage Third-Party Integrations for your own authorized accounts.</li>
              <li>Generate and deploy files such as llm.txt for AI crawler guidance.</li>
            </ul>
            <h3 style={h3}>3.3 Prohibited Use</h3>
            <p>You must not:</p>
            <ul style={ul}>
              <li>Use the Platform to optimize content for websites you do not own or have explicit authorization to manage.</li>
              <li>Attempt to reverse engineer, decompile, or extract the Platform&apos;s underlying algorithms, AI models, or source code.</li>
              <li>Resell, sublicense, or otherwise commercialize access to the Platform without prior written consent from Serpely Inc.</li>
              <li>Use the Platform to generate or distribute spam, misleading content, or content that violates applicable laws.</li>
              <li>Upload or connect data belonging to third parties without their consent.</li>
              <li>Interfere with or disrupt the integrity or performance of the Platform or its servers.</li>
              <li style={{ marginBottom: 0 }}>Use automated scripts or bots to access the Platform beyond the scope of its designed API functionality.</li>
            </ul>
          </Section>

          <Section id="ai-actions" num="04" title="AI Actions and Automation">
            <h3 style={h3}>4.1 Nature of AI Actions</h3>
            <p>Serpely&apos;s AI agents may generate recommendations and, where configured, execute autonomous changes to your website&apos;s content, metadata, schemas, and other SEO elements. All AI Actions are logged within the Platform and are reversible unless you have separately published, deployed, or deleted the affected content outside the Platform.</p>
            <h3 style={h3}>4.2 User Responsibility for AI Actions</h3>
            <p>You retain full responsibility for all content and changes made to your website, regardless of whether such changes were initiated manually or via AI Actions. By enabling autonomous AI features, you acknowledge and accept that:</p>
            <ul style={ul}>
              <li>AI-generated content may require human review before publication to ensure accuracy and brand alignment.</li>
              <li>Serpely&apos;s AI agents operate based on data signals and models that may not capture all contextual nuances of your business.</li>
              <li>You should review the Preview function before running bulk AI updates across critical pages.</li>
              <li>Serpely Inc. does not guarantee specific SEO outcomes, ranking improvements, or traffic increases resulting from AI Actions.</li>
            </ul>
            <h3 style={h3}>4.3 LLM Council and Multi-Model Pipeline</h3>
            <p>The LLM Council feature orchestrates multiple third-party AI models (including GPT-4o, Claude, Gemini, and Perplexity) in a sequential content pipeline. Outputs from this pipeline are subject to the terms of the respective AI providers. Serpely acts as an intermediary and is not responsible for the accuracy, reliability, or compliance of content generated by third-party AI systems.</p>
            <h3 style={h3}>4.4 Hallucination Alerts</h3>
            <p style={{ marginBottom: 0 }}>The Platform monitors AI systems for factually incorrect claims about your brand. Serpely Inc. does not guarantee the completeness or accuracy of hallucination detection and strongly recommends you independently verify and address any AI misinformation about your business through appropriate legal or communications channels in addition to Platform-generated correction content.</p>
          </Section>

          <Section id="integrations" num="05" title="Third-Party Integrations">
            <p>
              The Platform supports integrations with third-party services including but not limited to Google Search Console,
              Google PageSpeed Insights, SEMrush, Ahrefs, DataForSEO, OpenAI, Anthropic, and Google Gemini. Your use of these
              integrations is subject to the respective terms of service and privacy policies of those providers. Serpely Inc.
              is not responsible for any disruption, data loss, or changes in functionality arising from third-party services.
            </p>
            <p style={{ marginBottom: 0 }}>You are responsible for obtaining valid API keys and ensuring your use of third-party services through the Platform complies with each provider&apos;s terms. Serpely Inc. stores API credentials securely and uses them solely to provide the features you have enabled.</p>
          </Section>

          <Section id="billing" num="06" title="Subscription, Billing, and Cancellation">
            <h3 style={h3}>6.1 Subscription Plans</h3>
            <p>Access to certain features of the Platform requires a paid Subscription. Subscription tiers, pricing, and included features are described on our pricing page at serpely.com/pricing and are subject to change with reasonable advance notice.</p>
            <h3 style={h3}>6.2 Billing</h3>
            <p>Subscriptions are billed in advance on a monthly or annual basis as selected at checkout. All fees are non-refundable except as required by applicable law or as expressly stated in these Terms. You authorize Serpely Inc. to charge your designated payment method for all applicable fees.</p>
            <h3 style={h3}>6.3 Cancellation</h3>
            <p>You may cancel your Subscription at any time through your account settings. Cancellation takes effect at the end of the current billing period. Upon cancellation, your access to paid features will continue until the end of the paid period, after which access will revert to the free tier or be terminated.</p>
            <h3 style={h3}>6.4 Free Trials</h3>
            <p style={{ marginBottom: 0 }}>If you are offered a free trial, it will be governed by these Terms. At the end of the trial period, your account will automatically convert to a paid Subscription unless you cancel before the trial ends.</p>
          </Section>

          <Section id="ip" num="07" title="Intellectual Property">
            <h3 style={h3}>7.1 Platform IP</h3>
            <p>The Platform, including its design, features, AI models, algorithms, trademarks, logos, and all underlying technology, is owned by or licensed to Serpely Inc. and is protected by applicable intellectual property laws. Nothing in these Terms grants you any ownership rights in the Platform.</p>
            <h3 style={h3}>7.2 User Content</h3>
            <p>You retain ownership of any content you upload to or generate through the Platform, including website data, brand assets, and custom prompts. By using the Platform, you grant Serpely Inc. a limited, non-exclusive license to process and use your content solely to provide and improve the Platform&apos;s services, in accordance with our Privacy Policy.</p>
            <h3 style={h3}>7.3 Feedback</h3>
            <p style={{ marginBottom: 0 }}>If you submit feedback, suggestions, or ideas regarding the Platform, you grant Serpely Inc. a perpetual, royalty-free license to use and incorporate such feedback without any obligation to you.</p>
          </Section>

          <Section id="privacy" num="08" title="Data and Privacy">
            <p style={{ marginBottom: 0 }}>Your use of the Platform is subject to our <Link to="/privacy" style={{ color: '#00A868', fontWeight: 700 }}>Privacy Policy</Link>, which is incorporated into these Terms by reference. The Privacy Policy describes how we collect, use, store, and share your data, including SEO metrics, website analytics, keyword data, and account information. By using the Platform, you consent to the data practices described in the Privacy Policy.</p>
          </Section>

          <Section id="confidentiality" num="09" title="Confidentiality">
            <p style={{ marginBottom: 0 }}>Each party agrees to keep confidential any non-public information of the other party disclosed in connection with these Terms that is reasonably understood to be confidential, including but not limited to business strategies, technical data, pricing, and customer information. This obligation does not apply to information that becomes publicly available through no fault of the receiving party, was already known to the receiving party, or is required to be disclosed by law.</p>
          </Section>

          <Section id="disclaimers" num="10" title="Disclaimers and Limitation of Liability">
            <h3 style={h3}>10.1 No Guarantee of SEO Results</h3>
            <p>The Platform provides tools, data, and AI-generated recommendations to assist with SEO optimization. Serpely Inc. makes no representations or warranties that use of the Platform will result in improved search rankings, increased traffic, revenue, or any other specific business outcome. SEO performance is influenced by many factors outside our control, including search engine algorithm changes.</p>
            <h3 style={h3}>10.2 Disclaimer of Warranties</h3>
            <p>THE PLATFORM IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. SERPELY INC. DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.</p>
            <h3 style={h3}>10.3 Limitation of Liability</h3>
            <p style={{ marginBottom: 0 }}>TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, SERPELY INC. AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE PLATFORM, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL AGGREGATE LIABILITY TO YOU SHALL NOT EXCEED THE AMOUNT YOU PAID TO SERPELY INC. IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.</p>
          </Section>

          <Section id="indemnification" num="11" title="Indemnification">
            <p style={{ marginBottom: 0 }}>You agree to indemnify, defend, and hold harmless Serpely Inc. and its affiliates, officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorneys&apos; fees, arising out of or in any way connected with your access to or use of the Platform, your violation of these Terms, your violation of any third party&apos;s rights, or any content you submit through the Platform.</p>
          </Section>

          <Section id="termination" num="12" title="Termination">
            <h3 style={h3}>12.1 Termination by You</h3>
            <p>You may terminate your account at any time by canceling your Subscription and ceasing use of the Platform. Termination does not entitle you to a refund of any prepaid fees.</p>
            <h3 style={h3}>12.2 Termination by Serpely Inc.</h3>
            <p>We reserve the right to suspend or terminate your access to the Platform, with or without notice, if we determine in our sole discretion that you have violated these Terms, engaged in fraudulent activity, or pose a risk to the Platform or other users.</p>
            <h3 style={h3}>12.3 Effect of Termination</h3>
            <p style={{ marginBottom: 0 }}>Upon termination, your license to use the Platform ceases immediately. Provisions of these Terms that by their nature should survive termination (including intellectual property, disclaimers, limitations of liability, and dispute resolution) shall survive.</p>
          </Section>

          <Section id="governing-law" num="13" title="Governing Law and Dispute Resolution">
            <p style={{ marginBottom: 0 }}>These Terms are governed by and construed in accordance with the laws of the jurisdiction in which Serpely Inc. is incorporated, without regard to its conflict of law provisions. Any disputes arising from or relating to these Terms or your use of the Platform shall be resolved first through good-faith negotiation, and if unresolved, through binding arbitration in accordance with the rules of the applicable arbitration body, except that either party may seek injunctive relief in a court of competent jurisdiction.</p>
          </Section>

          <Section id="changes" num="14" title="Changes to These Terms">
            <p style={{ marginBottom: 0 }}>Serpely Inc. reserves the right to modify these Terms at any time. We will provide notice of material changes by updating the &ldquo;Last Updated&rdquo; date at the top of this document and, where appropriate, by sending an email notification to registered users. Your continued use of the Platform following the effective date of revised Terms constitutes your acceptance of the changes.</p>
          </Section>

          <Section id="general" num="15" title="General Provisions">
            <ul style={ul}>
              <li><strong style={strong}>Entire Agreement:</strong> These Terms, together with the Privacy Policy and any applicable Order Forms or Subscription agreements, constitute the entire agreement between you and Serpely Inc. with respect to the Platform.</li>
              <li><strong style={strong}>Severability:</strong> If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.</li>
              <li><strong style={strong}>Waiver:</strong> Failure to enforce any provision of these Terms shall not be deemed a waiver of that provision.</li>
              <li><strong style={strong}>Assignment:</strong> You may not assign your rights or obligations under these Terms without our prior written consent. We may assign our rights freely.</li>
              <li style={{ marginBottom: 0 }}><strong style={strong}>Force Majeure:</strong> Serpely Inc. shall not be liable for any failure or delay in performance due to causes beyond our reasonable control, including acts of God, internet outages, or governmental actions.</li>
            </ul>
          </Section>

          <Section id="contact" num="16" title="Contact Us" last>
            <p>If you have questions or concerns about these Terms, please contact us at:</p>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', marginTop: 16 }}>
              <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)' }}>Company</p>
                <p style={{ margin: '4px 0 0', fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>Serpely Inc.</p>
              </div>
              <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)' }}>Email</p>
                <p style={{ margin: '4px 0 0', fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>legal@serpely.com</p>
              </div>
              <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-subtle)', border: '1px solid hsl(var(--border))' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)' }}>Website</p>
                <p style={{ margin: '4px 0 0', fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>www.serpely.com</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
              <Link to="/contact" className="btn-accent-s inline-flex">Contact Legal Team</Link>
              <Link to="/" className="btn-secondary-s inline-flex">Back to Home</Link>
            </div>
          </Section>
        </article>
      </div>

      <style>{`
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
