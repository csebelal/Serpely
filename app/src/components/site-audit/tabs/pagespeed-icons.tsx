/**
 * PageSpeed / CrUX tab icons — the prototype's `PS_ICONS` map (lines
 * 3152-3173) ported to React components. Paths, `viewBox`, and the
 * `fill/stroke/stroke-linecap/stroke-linejoin/aria-hidden` set are verbatim;
 * stroke *width* is deliberately left off the SVG so the surrounding CSS
 * (`.ps-opp-icon svg`, `.ps-ghost-btn svg`, …) keeps controlling it exactly as
 * it did in the prototype.
 *
 * Usage: `const Icon = PS_ICONS[name]; return <Icon />;`
 */
import type { ReactElement, ReactNode } from 'react';

export type PsIconKey =
  | 'speedometer'
  | 'users'
  | 'clock'
  | 'refresh'
  | 'weight'
  | 'tree'
  | 'cpu'
  | 'calendar'
  | 'font'
  | 'gauge'
  | 'check_circle'
  | 'chevron'
  | 'bolt'
  | 'image_placeholder'
  | 'lock'
  | 'redirect'
  | 'monitor'
  | 'phone'
  | 'tablet'
  | 'trending_down';

const PS_ICON_KEYS: readonly PsIconKey[] = [
  'speedometer',
  'users',
  'clock',
  'refresh',
  'weight',
  'tree',
  'cpu',
  'calendar',
  'font',
  'gauge',
  'check_circle',
  'chevron',
  'bolt',
  'image_placeholder',
  'lock',
  'redirect',
  'monitor',
  'phone',
  'tablet',
  'trending_down',
];

/** Narrow an arbitrary string (e.g. a data field) to a known icon key. */
export function isPsIconKey(name: string): name is PsIconKey {
  return (PS_ICON_KEYS as readonly string[]).includes(name);
}

/** The shared `<svg>` wrapper — identical attribute set for every icon. */
function PsSvg({ children }: { children: ReactNode }): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Every icon is a zero-prop component, so `<Icon />` renders the plain SVG. */
export type PsIcon = () => ReactElement;

export const PS_ICONS: Record<PsIconKey, PsIcon> = {
  speedometer: () => (
    <PsSvg>
      <path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
      <path d="M13.4 4.6a8 8 0 1 1-7.8 7.8 7 7 0 0 1 7.8-7.8z" />
      <path d="m13.4 4.6-2.4 4.4 4 1-3 5" />
    </PsSvg>
  ),
  users: () => (
    <PsSvg>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </PsSvg>
  ),
  clock: () => (
    <PsSvg>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </PsSvg>
  ),
  refresh: () => (
    <PsSvg>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </PsSvg>
  ),
  weight: () => (
    <PsSvg>
      <path d="M6.5 6.5h11l1.83 12.5a2 2 0 0 1-2 2.25H6.67a2 2 0 0 1-2-2.25z" />
      <path d="M9 6.5a3 3 0 0 1 6 0" />
    </PsSvg>
  ),
  tree: () => (
    <PsSvg>
      <path d="M3 6h6M3 12h12M3 18h18M9 6v12M15 12v6" />
    </PsSvg>
  ),
  cpu: () => (
    <PsSvg>
      <rect x="6" y="6" width="12" height="12" rx="1" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
    </PsSvg>
  ),
  calendar: () => (
    <PsSvg>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
    </PsSvg>
  ),
  font: () => (
    <PsSvg>
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </PsSvg>
  ),
  gauge: () => (
    <PsSvg>
      <path d="M21 12a9 9 0 1 1-9-9" />
      <path d="M21 3v6h-6" />
      <path d="M14 14 21 3" />
    </PsSvg>
  ),
  check_circle: () => (
    <PsSvg>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </PsSvg>
  ),
  chevron: () => (
    <PsSvg>
      <polyline points="6 9 12 15 18 9" />
    </PsSvg>
  ),
  bolt: () => (
    <PsSvg>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </PsSvg>
  ),
  image_placeholder: () => (
    <PsSvg>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </PsSvg>
  ),
  lock: () => (
    <PsSvg>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </PsSvg>
  ),
  redirect: () => (
    <PsSvg>
      <path d="M9 18l6-6-6-6" />
      <path d="M3 12h12" />
    </PsSvg>
  ),
  monitor: () => (
    <PsSvg>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </PsSvg>
  ),
  phone: () => (
    <PsSvg>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </PsSvg>
  ),
  tablet: () => (
    <PsSvg>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </PsSvg>
  ),
  trending_down: () => (
    <PsSvg>
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </PsSvg>
  ),
};

/**
 * The prototype's `EMPTY_ICON` (line 2715) — a 34px alert circle used by
 * `renderEmptyTab`. Kept local to the tab so `PS_ICONS` stays a 1:1 port.
 */
export function PsEmptyIcon(): ReactElement {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

/** The prototype's `TOAST_ICON` (line 2720) — the drawer toast checkmark. */
export function PsToastIcon(): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
