// Shared mission-control (audit V2) theme — fixed light palette matching the design.
import type { CSSProperties } from 'react';

export const V2 = {
  pageBg: '#F7F9F8',
  cardBg: '#FFFFFF',
  border: '#E3E9E6',
  ink: '#0B1411',
  soft: '#55655D',
  faint: '#9DB2A8',
  heroBg: '#0A1410',
  green: '#00B96B',
  greenBright: '#19D987',
  greenSoft: '#3BE39A',
  red: '#E5484D',
  redSoft: '#FF8A7A',
  amber: '#D9A400',
  fontBody: "'Figtree', system-ui, sans-serif",
  fontDisplay: "'Outfit', sans-serif",
  fontMono: "'JetBrains Mono', monospace",
};

export interface V2CatStyle { name: string; tint: string; text: string; bar: string }

// Short category name → mission-control pill/bar colors.
export const V2_CATS: Record<string, V2CatStyle> = {
  'AI Visibility': { name: 'AI Visibility', tint: '#F1EBFF', text: '#5B33BF', bar: '#7A4DE0' },
  'Technical SEO': { name: 'Technical SEO', tint: '#EAF0FF', text: '#2447B8', bar: '#2F5FE0' },
  Speed: { name: 'Speed', tint: '#FFF2E2', text: '#8A4108', bar: '#D9730D' },
  Security: { name: 'Security', tint: '#E5F8EF', text: '#006B43', bar: '#00945A' },
  Mobile: { name: 'Mobile', tint: '#E2F6F8', text: '#0A6E78', bar: '#0E9AA7' },
};

export function v2Cat(short: string): V2CatStyle {
  return V2_CATS[short] || { name: short, tint: '#EDF2EF', text: V2.soft, bar: V2.green };
}

export function effortLabel(effort: string): string {
  return effort === 'quick' ? 'Quick win' : 'Standard effort';
}

export const v2Btn: CSSProperties = {
  minHeight: 40, padding: '0 18px', borderRadius: 999, border: '1px solid #C9D4CE',
  background: '#FFFFFF', color: '#0B1411', fontWeight: 600, fontSize: 13, cursor: 'pointer',
  fontFamily: "'Figtree', system-ui, sans-serif",
};
