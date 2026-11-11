import { Link } from 'react-router-dom';
import { useSEOMeta } from '@/hooks/useSEOMeta';
import { resetConsent } from '@/lib/consent';
import { LegalShell, LegalSection, LegalTable } from '@/components/legal/LegalShell';

const SUMMARY = [
  {
    title: 'Consent comes first',
    body: 'Google Analytics is only loaded after you accept. Until then, no analytics request leaves your browser.',
  },
  {
    title: 'No ad tracking',
    body: 'We do not run advertising pixels, retargeting, or cross-site tracking, and we never sell data.',
  },
  {
    title: 'You stay in control',
    body: 'Clear our cookies in your browser at any time and the banner will ask again on your next visit.',
  },
];

const CATEGORIES = [
  {
    name: 'Strictly necessary',
    badge: 'Always on',
    required: true,
    body: 'Required for the site and your account to work. These cannot be switched off — for example keeping a signed-in session alive or protecting forms from bots.',
    examples: '__Host-serpely_admin, __Host-serpely_client',
  },
  {
    name: 'Functional',
    badge: 'Optional',
    required: false,
    body: 'Remember choices you make so the interface behaves the way you left it, such as your light or dark theme and whether the dashboard sidebar is open.',
    examples: 'serpely-theme, sidebar_state, serpely_consent_v1',
  },
  {
    name: 'Analytics',
    badge: 'Optional',
    required: false,
    body: 'Loaded only with your consent. Google Analytics reports aggregate page reads so we can see which pages and features are used. It is never used for advertising.',
    examples: '_ga, _ga_<container-id>',
  },
  {
    name: 'Marketing',
    badge: 'Not used',
    required: false,
    body: 'We do not currently run advertising or retargeting, so no marketing cookies or pixels are loaded on this site.',
    examples: 'None',
  },
];

const COOKIES: { name: string; provider: string; category: string; purpose: string; duration: string }[] = [
  {
    name: '__Host-serpely_admin',
    provider: 'Serpely',
    category: 'Strictly necessary',
    purpose: 'Signed-in session for the admin panel. HttpOnly, SameSite=Lax, Secure over HTTPS and locked to this exact host, so page scripts cannot read it.',
    duration: '8 hours of inactivity, at most 1 day',
  },
  {
    name: '__Host-serpely_client',
    provider: 'Serpely',
    category: 'Strictly necessary',
    purpose: 'Keeps you signed in to the client dashboard. HttpOnly, SameSite=Lax, Secure over HTTPS and locked to this exact host, so page scripts cannot read it.',
    duration: '7 days of inactivity, at most 30 days',
  },
  {
    name: 'sidebar_state',
    provider: 'Serpely',
    category: 'Functional',
    purpose: 'Remembers whether the dashboard sidebar is expanded or collapsed.',
    duration: '7 days',
  },
  {
    name: '_ga',
    provider: 'Google',
    category: 'Analytics (consent)',
    purpose: 'Distinguishes browsers so Google Analytics can report aggregate visitor and page-view counts.',
    duration: '2 years',
  },
  {
    name: '_ga_<container-id>',
    provider: 'Google',
    category: 'Analytics (consent)',
    purpose: 'Keeps session state for the Google Analytics 4 property connected to our site.',
    duration: '2 years',
  },
];

const STORAGE: { name: string; category: string; purpose: string; duration: string }[] = [
  {
    name: 'serpely_consent_v1',
    category: 'Functional',
    purpose: 'Records your cookie choice, when you made it, and which policy version you agreed to, so we do not ask again on every visit.',
    duration: 'Until you clear it',
  },
  {
    name: 'serpely-theme',
    category: 'Functional',
    purpose: 'Remembers whether you picked the light or dark theme.',
    duration: 'Until you clear it',
  },
  {
    name: 'serpely_vid',
    category: 'Functional',
    purpose: 'A random, anonymous id that groups your consent choice in our server-side logs. Contains no tracking identifier.',
    duration: 'Until cleared (server logs expire after 12 months)',
  },
];

export function CookiePolicy() {
  useSEOMeta('cookie-policy', {
    title: 'Cookie Policy — Serpely',
    description: 'The cookies and local storage Serpely uses, why we use them, and how to control them.',
  });

  return (
    <LegalShell
      eyebrow="Legal · Cookies"
      title={<>Cookie <em>Policy</em></>}
      subtitle="What we store on your device, why we store it, and how to change your choice."
      meta={['Effective 20 May 2026', 'Last updated 26 October 2026', 'Version 2.1']}
    >
      <p className="legal-lead">
        This Cookie Policy explains how Serpely Inc. (&ldquo;Serpely,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) uses cookies and
        similar technologies on <strong>serpely.com</strong> and in the Serpely dashboard. It should be read together with our{' '}
        <Link to="/privacy">Privacy Policy</Link>, which covers how we handle personal data more generally.
      </p>

      <p className="legal-kicker">At a glance</p>
      <div className="legal-summary">
        <div className="legal-summary-inner is-three">
          {SUMMARY.map((s, i) => (
            <div className="legal-summary-item" key={s.title}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              <p><strong>{s.title}</strong>{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      <LegalSection id="scope" num="01" title="Scope and controller" first>
        <p>
          Serpely Inc. is the controller for the cookies described here. This policy covers the public website, the client
          dashboard, and the admin panel. It does not cover third-party websites we link to, including the AI and SEO providers
          listed in our Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection id="what" num="02" title="Cookies and local storage">
        <p>
          A cookie is a small text file a website asks your browser to store and send back on later requests. Local storage is a
          similar browser feature that keeps data on your device but is never sent automatically to our servers. We use both, and
          we list each item we set in the tables below.
        </p>
        <p style={{ marginBottom: 0 }}>
          Cookies can be <strong>first-party</strong> (set by us) or <strong>third-party</strong> (set by a service we use, such as
          Google). They can also be <strong>session</strong> cookies, which disappear when you close the browser, or{' '}
          <strong>persistent</strong> cookies, which last for the period shown in the table.
        </p>
      </LegalSection>

      <LegalSection id="consent" num="03" title="Your consent">
        <p>
          When you first visit the site, a banner asks whether you accept analytics cookies. Nothing optional is stored or loaded
          before you decide. We record your choice in <code className="legal-code">serpely_consent_v1</code> and apply Google
          Consent Mode v2, with advertising and analytics storage set to &ldquo;denied&rdquo; by default.
        </p>
        <p>
          If you accept, we load Google Tag Manager, which in turn loads Google Analytics 4. If you reject, or simply never answer,
          no request is made to Google and no analytics cookies are set.
        </p>
        <p>
          You can change your choice at any time by reopening your preferences below or clearing Serpely cookies and site data in
          your browser. Until you decide again, analytics stays off.
        </p>
        <p style={{ marginBottom: 0 }}>
          <button
            type="button"
            onClick={resetConsent}
            className="btn-secondary-s inline-flex"
            style={{ fontSize: 13 }}
          >
            Cookie settings
          </button>
        </p>
      </LegalSection>

      <LegalSection id="categories" num="04" title="Categories we use">
        <div className="legal-cat-grid">
          {CATEGORIES.map(c => (
            <div key={c.name} className="legal-cat">
              <div className="legal-cat-top">
                <strong>{c.name}</strong>
                <span className={`legal-badge${c.required ? ' is-on' : ''}`}>{c.badge}</span>
              </div>
              <p>{c.body}</p>
              <p className="legal-cat-examples">
                Examples: <code>{c.examples}</code>
              </p>
            </div>
          ))}
        </div>
      </LegalSection>

      <LegalSection id="cookie-table" num="05" title="Cookies we set">
        <p>These are the cookies you may receive while using Serpely.</p>
        <LegalTable
          head={['Name', 'Set by', 'Category', 'Purpose', 'Duration']}
          minWidth={700}
          rows={COOKIES.map(c => [
            <code key="n" className="legal-code">{c.name}</code>,
            c.provider,
            c.category,
            c.purpose,
            c.duration,
          ])}
        />
        <p style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 0 }}>
          Google cookies appear only after you accept analytics. Durations are set by Google and may change; check your
          browser&apos;s developer tools for the exact values on your device.
        </p>
        <p style={{ marginTop: 14, marginBottom: 0 }}>
          <strong>Third-party sign-in and payments.</strong> When you sign in with Google, connect Search Console or Analytics, or
          pay through Stripe, you briefly visit Google&apos;s or Stripe&apos;s own pages. Those companies may set cookies on their own
          domains under their own policies. They are not set by Serpely and we cannot read them.
        </p>
      </LegalSection>

      <LegalSection id="storage-table" num="06" title="Local storage we use">
        <p>These items stay on your device and are never sent with every request.</p>
        <LegalTable
          head={['Key', 'Category', 'Purpose', 'Duration']}
          minWidth={640}
          rows={STORAGE.map(s => [
            <code key="n" className="legal-code">{s.name}</code>,
            s.category,
            s.purpose,
            s.duration,
          ])}
        />
      </LegalSection>

      <LegalSection id="analytics" num="07" title="Analytics in detail">
        <p>
          We use Google Analytics 4 through Google Tag Manager to count page views and understand which content is useful.
          Analytics runs in consent mode: until you accept, Google receives no analytics identifiers from us. Once accepted,
          Google may set the <code className="legal-code">_ga</code> and{' '}
          <code className="legal-code">_ga_&lt;container-id&gt;</code> cookies and process event data on our behalf as a processor.
        </p>
        <p style={{ marginBottom: 0 }}>
          We do not enable Google signals, ads personalisation, or data sharing with Google&apos;s advertising products. For details
          of Google&apos;s own processing, see{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google&apos;s Privacy Policy</a> and{' '}
          <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer">
            how Google uses information from partner sites
          </a>.
        </p>
      </LegalSection>

      <LegalSection id="measurement" num="08" title="Our own measurement">
        <p style={{ marginBottom: 0 }}>
          We also keep an aggregate count of page views on our own servers: the page path, the referring URL, and a truncated
          user-agent string. This record contains no cookie, no persistent identifier, and is not shared with third parties. It is
          used only to understand overall traffic and is not linked to you as an individual.
        </p>
      </LegalSection>

      <LegalSection id="bot-protection" num="09" title="Bot protection">
        <p style={{ marginBottom: 0 }}>
          Some forms are protected by Cloudflare Turnstile, which distinguishes people from automated submissions. Turnstile is
          designed to work without tracking cookies; if Cloudflare issues a challenge it may set a short-lived security cookie such
          as <code className="legal-code">cf_clearance</code>. That cookie is used only to protect the site and never for
          advertising.
        </p>
      </LegalSection>

      <LegalSection id="advertising" num="10" title="No advertising or cross-site tracking">
        <p style={{ marginBottom: 0 }}>
          Serpely does not run advertising, retargeting, or social media pixels, and we do not use cookies to build a profile of
          your browsing across other websites. We do not sell or share personal information for cross-context behavioural
          advertising, as those terms are defined under California law.
        </p>
      </LegalSection>

      <LegalSection id="manage" num="11" title="Managing cookies and other controls">
        <p>
          You can block or delete cookies in your browser at any time. Blocking strictly necessary cookies will prevent you from
          signing in to the admin panel or the client dashboard and using parts of the Service.
        </p>
        <ul>
          <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noreferrer">Google Chrome</a></li>
          <li><a href="https://support.apple.com/guide/safari/sfri11471/mac" target="_blank" rel="noreferrer">Safari</a></li>
          <li><a href="https://support.mozilla.org/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noreferrer">Firefox</a></li>
          <li><a href="https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noreferrer">Microsoft Edge</a></li>
        </ul>
        <p style={{ marginBottom: 0 }}>
          We honour Global Privacy Control (GPC) signals where our systems can read them, and we treat them as an opt-out of
          analytics. Browser &ldquo;Do Not Track&rdquo; headers are not standardised; we do not rely on them, so use your browser
          settings to block analytics instead.
        </p>
      </LegalSection>

      <LegalSection id="retention" num="12" title="How long information stays">
        <p style={{ marginBottom: 0 }}>
          Cookie and storage lifetimes are listed above. Server-side page-view records are aggregated and kept for up to twelve
          months. Your consent record stays until you clear it or change your choice. For account data and deletion requests, see
          the retention section of our <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection id="changes" num="13" title="Changes to this policy">
        <p style={{ marginBottom: 0 }}>
          We update this page whenever the cookies or storage we use change. Material changes will be announced on the site or by
          email, and the &ldquo;Last updated&rdquo; date above will change. If a change requires a new consent, we will ask again
          before setting anything new.
        </p>
      </LegalSection>

      <LegalSection id="contact" num="14" title="Contact">
        <p>Questions or requests about this policy or your personal information? Contact us:</p>
        <div className="legal-contact-grid">
          <div className="legal-contact">
            <span>Company</span>
            <strong>Serpely</strong>
          </div>
          <div className="legal-contact">
            <span>Email</span>
            <strong>privacy@serpely.com</strong>
          </div>
          <div className="legal-contact">
            <span>Address</span>
            <strong style={{ fontSize: 13.5 }}>1209 Mountain Road Pl Ne Ste N Albuquerque, NM 87110</strong>
          </div>
        </div>
        <div className="legal-actions">
          <Link to="/privacy" className="btn-accent-s inline-flex">Read the Privacy Policy</Link>
          <Link to="/contact" className="btn-secondary-s inline-flex">Contact Us</Link>
          <Link to="/" className="btn-secondary-s inline-flex">Back to Home</Link>
        </div>
      </LegalSection>
    </LegalShell>
  );
}
