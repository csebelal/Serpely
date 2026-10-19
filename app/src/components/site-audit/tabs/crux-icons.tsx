/**
 * Inline SVG icons used by the CrUX tab only.
 *
 * Ported verbatim from the prototype's `PS_ICONS` (lines 3152-3173). Kept in a
 * separate file from `pagespeed-icons.tsx` (which owns the full set) to avoid
 * conflicting edits between the two tab slices.
 */
import type { ReactElement } from 'react';

/** Icon names from `PS_ICONS` that the CrUX tab renders. */
export type CruxIconName = 'users' | 'calendar' | 'monitor' | 'phone' | 'tablet';

const SVG_BASE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
} as const;

function UsersIcon(): ReactElement {
  return (
    <svg {...SVG_BASE}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CalendarIcon(): ReactElement {
  return (
    <svg {...SVG_BASE}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
    </svg>
  );
}

function MonitorIcon(): ReactElement {
  return (
    <svg {...SVG_BASE}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function PhoneIcon(): ReactElement {
  return (
    <svg {...SVG_BASE}>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function TabletIcon(): ReactElement {
  return (
    <svg {...SVG_BASE}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

/** Record keyed by the original `PS_ICONS` names. */
export const PS_CRUX_ICONS: Record<CruxIconName, () => ReactElement> = {
  users: UsersIcon,
  calendar: CalendarIcon,
  monitor: MonitorIcon,
  phone: PhoneIcon,
  tablet: TabletIcon,
};
