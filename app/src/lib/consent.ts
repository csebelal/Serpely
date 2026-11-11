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
const VISITOR_KEY = 'serpely_vid';

const API_BASE = import.meta.env.VITE_API_URL || '';

/** Dispatched on `window` whenever the choice changes (or is reset). */
export const CONSENT_EVENT = 'serpely:consent';

/** Bumped whenever the Cookie Policy materially changes — a mismatch re-prompts. */
export const CONSENT_POLICY_VERSION = '2026-10-26';

interface StoredConsent {
  choice: ConsentChoice;
  /** Unix ms — kept as a simple consent record. */
  at: number;
  /** Cookie Policy version the user agreed to. */
  policy: string;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    __SERPELY_GTM_ID?: string;
  }
}

/** The visitor's stored choice, or null if they have not decided yet (or agreed to an older policy). */
export function getConsent(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    if (parsed.choice !== 'granted' && parsed.choice !== 'denied') return null;
    // Records made under an older policy version count as undecided, so the
    // banner comes back and visitors agree to the current text.
    if (parsed.policy !== CONSENT_POLICY_VERSION) return null;
    return parsed.choice;
  } catch {
    // Private mode / blocked storage — treat as undecided rather than crashing.
    return null;
  }
}

/** Records the choice, applies it, and notifies the UI. */
export function setConsent(choice: ConsentChoice): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ choice, at: Date.now(), policy: CONSENT_POLICY_VERSION } satisfies StoredConsent),
    );
  } catch {
    /* storage unavailable — the choice still applies for this page view */
  }
  applyConsent(choice);
  reportConsent(choice);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
}

/** Forgets the choice so the banner returns (footer "Cookie settings"). */
export function resetConsent(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  // Withdraw consent immediately in the current session: GTM may already be
  // loaded, so push a denied update before showing the banner again.
  applyConsent('denied');
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }));
}

/** A random id kept in localStorage to group decisions without any tracking identifier. */
function visitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id =
        (typeof crypto !== 'undefined' && 'randomUUID' in crypto && crypto.randomUUID()) ||
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      try { localStorage.setItem(VISITOR_KEY, id); } catch { /* private mode */ }
    }
    return id;
  } catch {
    return '';
  }
}

/**
 * Fire-and-forget report to the server so the admin panel can log the decision.
 * No cookie values are sent — only the choice, the random visitor id, and the
 * page path. Failures are ignored; logging consent must never break the UI.
 */
function reportConsent(choice: ConsentChoice): void {
  try {
    void fetch(`${API_BASE}/api/analytics/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ choice, visitorId: visitorId(), page: window.location.pathname }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
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
