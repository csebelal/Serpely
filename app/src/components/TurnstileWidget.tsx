import { useEffect, useRef } from 'react';

/**
 * Cloudflare Turnstile widget (explicit rendering).
 *
 * Renders nothing — and reports an empty token — when VITE_TURNSTILE_SITE_KEY
 * is not configured, which matches the server's behaviour (see
 * server/src/lib/turnstile.ts). Both sides must be configured together.
 */

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

/** True when a site key is present (the widget will actually render). */
export function turnstileConfigured(): boolean {
  return Boolean(SITE_KEY);
}

export function TurnstileWidget({ onToken, style }: { onToken: (token: string) => void; style?: React.CSSProperties }) {
  const holder = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const callback = useRef(onToken);

  // Keep the latest callback without re-rendering the widget.
  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    const mount = () => {
      if (cancelled || widgetId.current || !holder.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(holder.current, {
        sitekey: SITE_KEY,
        theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
        callback: (token: string) => callback.current(token),
        'error-callback': () => callback.current(''),
        'expired-callback': () => callback.current(''),
      });
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (window.turnstile) {
      mount();
    } else if (existing) {
      existing.addEventListener('load', mount);
    } else {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.addEventListener('load', mount);
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      const id = widgetId.current;
      widgetId.current = null;
      if (id && window.turnstile) {
        try { window.turnstile.remove(id); } catch { /* widget already gone */ }
      }
    };
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={holder} style={{ marginTop: 6, minHeight: 65, ...style }} />;
}
