import { Link } from 'react-router-dom';
import { useSEOMeta } from '@/hooks/useSEOMeta';

const CATEGORIES = [
  {
    name: 'Strictly necessary',
    required: true,
    body: 'Required for the site and your account to work. These cannot be switched off — for example keeping you signed in to the admin panel or remembering your theme preference.',
    examples: 'serpely_admin, serpely_client_token, serpely-theme, sidebar:state',
  },
  {
    name: 'Analytics',
    required: false,
    body: 'Google Analytics runs in a cookie-less mode for every visitor: it reports aggregate page reads so we can improve the product, but it stores no cookies, sets no identifiers and does not build a profile of you. It is never used for advertising.',
    examples: 'No cookies are set — analytics runs without storing anything on your device',
  },
  {
    name: 'Marketing',
    required: false,
    body: 'We do not currently run advertising or retargeting, so no marketing pixels are loaded. If that changes, this page will be updated first.',
    examples: 'None',
  },
];

export function CookiePolicy() {
  useSEOMeta('cookie-policy', {
    title: 'Cookie Policy — Serpely',
    description: 'The cookies and local storage Serpely uses, and what each one is for.',
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', paddingBottom: 90 }}>
      <section className="pt-32 pb-10 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,194,122,0.13) 0%, transparent 70%)' }} />
        <div className="max-w-3xl mx-auto relative z-10">
          <span className="pill-s mb-5 inline-block">Legal · Cookies</span>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black leading-none mb-5" style={{ letterSpacing: '-0.05em' }}>
            Cookie <span className="text-gradient">Policy</span>
          </h1>
          <p className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto" style={{ color: 'var(--text-soft)' }}>
            What we store on your device, why we store it, and how to control it.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6">
        <article className="card-s" style={{ padding: 'clamp(24px, 4vw, 44px)', fontSize: 15, lineHeight: 1.8, color: 'var(--text-soft)' }}>
          <p style={{ marginTop: 0 }}>
            This policy explains how Serpely Inc. uses cookies and similar technologies (such as browser
            local storage) on <strong>serpely.com</strong>. It should be read together with our{' '}
            <Link to="/privacy" style={{ color: '#00A868', fontWeight: 700 }}>Privacy Policy</Link>.
          </p>

          <h2 style={h2}>1. What are cookies?</h2>
          <p>
            Cookies are small files a website stores in your browser. Local storage is a similar mechanism
            that keeps data on your device. We use both to keep the site working — for example, keeping you
            signed in to the admin panel and remembering your theme.
          </p>

          <h2 style={h2}>2. Categories we use</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {CATEGORIES.map(c => (
              <div key={c.name} style={{ border: '1px solid hsl(var(--border))', borderRadius: 14, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <strong style={{ color: 'var(--text)', fontSize: 15 }}>{c.name}</strong>
                  <span style={{
                    fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
                    padding: '3px 9px', borderRadius: 999,
                    background: c.required ? '#00C27A15' : 'transparent',
                    border: c.required ? '1px solid #00C27A40' : '1px solid hsl(var(--border))',
                    color: c.required ? '#00A868' : 'var(--text-faint)',
                  }}>
                    {c.required ? 'Always on' : 'Optional'}
                  </span>
                </div>
                <p style={{ margin: '0 0 8px' }}>{c.body}</p>
                <p style={{ margin: 0, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-faint)', fontWeight: 700 }}>Examples: </span>
                  <code style={{ fontSize: 12.5 }}>{c.examples}</code>
                </p>
              </div>
            ))}
          </div>

          <h2 style={h2}>3. First-party measurement without cookies</h2>
          <p style={{ marginBottom: 0 }}>
            We also keep an aggregate count of page views on our own servers (the page path, referring URL,
            and a truncated user-agent string — no identifiers, no cookies, and nothing shared with third
            parties). This is used to understand overall traffic and is not linked to you as an individual.
          </p>

          <h2 style={h2}>4. Bot protection</h2>
          <p style={{ marginBottom: 0 }}>
            When bot protection is enabled on our forms, Cloudflare Turnstile may set a functional cookie to
            distinguish humans from automated submissions. It is used only to protect the Service and is not
            used for advertising.
          </p>

          <h2 style={h2}>5. Managing cookies</h2>
          <p style={{ marginBottom: 0 }}>
            You can block or delete cookies in your browser settings at any time. Blocking essential cookies
            may prevent you from signing in or using parts of the Service. Our analytics does not rely on
            cookies, so if you want to block it as well, use your browser's tracking protection or an ad blocker.
          </p>

          <h2 style={h2}>6. Changes &amp; contact</h2>
          <p>
            We'll update this page whenever the cookies we use change. Questions? Email{' '}
            <a href="mailto:privacy@serpely.com" style={{ color: '#00A868', fontWeight: 700 }}>privacy@serpely.com</a>.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 26 }}>
            <Link to="/privacy" className="btn-accent-s inline-flex">Read the Privacy Policy</Link>
            <Link to="/" className="btn-secondary-s inline-flex">Back to Home</Link>
          </div>
        </article>
      </div>
    </div>
  );
}

const h2: React.CSSProperties = {
  fontSize: 19,
  fontWeight: 850,
  letterSpacing: '-0.02em',
  color: 'var(--text)',
  margin: '30px 0 10px',
};
