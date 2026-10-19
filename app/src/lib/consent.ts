/**
 * Cookie / analytics consent (Google Consent Mode v2).
 *
 * The default is "denied" and is declared inline in index.html before anything
 * else runs. Google Tag Manager is only fetched once the visitor opts in, so a
 * visitor who never consents makes zero requests to Google.
 */

export type ConsentChoice = 'granted' | 'denied';

const STORAGE_KEY = 'serpely_consent_v1';
const GTM_SCRIPT_ID = 'serpely-gtm';

/** Dispatched on `window` whenever the choice changes (or is reset). */
export const CONSENT_EVENT = 'serpely:consent';

interface StoredConsent {
  choice: ConsentChoice;
  /** Unix ms — kept as a simple consent record. */
  at: number;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    __SERPELY_GTM_ID?: string;
  }
}

/** The visitor's stored choice, or null if they have not decided yet. */
export function getConsent(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    return parsed.choice === 'granted' || parsed.choice === 'denied' ? parsed.choice : null;
  } catch {
    // Private mode / blocked storage — treat as undecided rather than crashing.
    return null;
  }
}

/** Records the choice, applies it, and notifies the UI. */
export function setConsent(choice: ConsentChoice): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, at: Date.now() } satisfies StoredConsent));
  } catch {
    /* storage unavailable — the choice still applies for this page view */
  }
  applyConsent(choice);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
}

/** Forgets the choice so the banner returns (footer "Cookie settings"). */
export function resetConsent(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }));
}

/** Pushes the consent state into the dataLayer and loads GTM when granted. */
export function applyConsent(choice: ConsentChoice): void {
  const w = window;
  w.dataLayer = w.dataLayer || [];
  // Same shape as Google's own gtag snippet — GTM's dataLayer accepts an
  // arguments-like array for `consent` commands.
  const gtag = (...args: unknown[]): void => {
    w.dataLayer!.push(args);
  };
  const granted = choice === 'granted';
  gtag('consent', 'update', {
    ad_storage: granted ? 'granted' : 'denied',
    ad_user_data: granted ? 'granted' : 'denied',
    ad_personalization: granted ? 'granted' : 'denied',
    analytics_storage: granted ? 'granted' : 'denied',
  });
  if (granted) loadGtm();
}

function loadGtm(): void {
  const id = window.__SERPELY_GTM_ID;
  if (!id || document.getElementById(GTM_SCRIPT_ID)) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  const first = document.getElementsByTagName('script')[0];
  const script = document.createElement('script');
  script.id = GTM_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  first?.parentNode?.insertBefore(script, first);
}
