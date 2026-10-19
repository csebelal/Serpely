import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONSENT_EVENT, applyConsent, getConsent, setConsent, type ConsentChoice } from '../lib/consent';

/**
 * Consent banner for the public site. Renders nothing in the admin panel
 * (it is mounted inside PublicShell only) and nothing once a choice is stored.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => {
      const choice = getConsent();
      if (choice) {
        // Re-apply on load so a returning visitor's stored choice takes effect
        // immediately (GTM is loaded here, not in index.html).
        applyConsent(choice);
        setVisible(false);
      } else {
        setVisible(true);
      }
    };
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  if (!visible) return null;

  const decide = (choice: ConsentChoice) => () => setConsent(choice);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie preferences"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        padding: '14px',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          maxWidth: 1080,
          margin: '0 auto',
          background: 'var(--card-bg)',
          border: '1px solid hsl(var(--border))',
          borderRadius: 16,
          boxShadow: '0 18px 48px rgba(0,0,0,0.22)',
          padding: '18px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 16,
          color: 'var(--text)',
        }}
      >
        <div style={{ flex: '1 1 420px', minWidth: 260 }}>
          <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em', marginBottom: 4 }}>
            Cookies &amp; analytics
          </div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-soft)' }}>
            We use essential cookies to run Serpely. With your consent we also use Google
            Analytics to understand how the site is used. Read our{' '}
            <Link to="/cookie-policy" style={{ color: '#00A868', fontWeight: 700 }}>
              Cookie Policy
            </Link>
            .
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={decide('denied')}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid hsl(var(--border))',
              background: 'transparent',
              color: 'var(--text)',
            }}
          >
            Reject non-essential
          </button>
          <button
            type="button"
            onClick={decide('granted')}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid #00A868',
              background: '#00A868',
              color: '#fff',
            }}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
