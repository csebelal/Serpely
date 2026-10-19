// Letter-grade helpers + mockup category adapter.
// Mockup categories: SEO, GEO, Links, Usability, Performance.
export type MockupCat = 'SEO' | 'GEO' | 'Links' | 'Usability' | 'Performance';

export const MOCKUP_ORDER: MockupCat[] = ['SEO', 'GEO', 'Links', 'Usability', 'Performance'];

export const MOCKUP_COLORS: Record<MockupCat, string> = {
  SEO: '#F43F5E',
  GEO: '#7C3AED',
  Links: '#22C55E',
  Usability: '#EAB308',
  Performance: '#3B82F6',
};

export function scoreToGrade(score: number): string {
  const s = Math.round(score);
  if (s >= 90) return 'A';
  if (s >= 85) return 'A-';
  if (s >= 80) return 'B+';
  if (s >= 75) return 'B';
  if (s >= 70) return 'B-';
  if (s >= 65) return 'C+';
  if (s >= 60) return 'C';
  if (s >= 55) return 'C-';
  if (s >= 50) return 'D';
  return 'F';
}

export function gradeTagline(grade: string): string {
  if (grade === 'A' || grade === 'A-') return 'Excellent — your page is in great shape';
  if (grade === 'B+' || grade === 'B') return 'Your page looks good';
  if (grade === 'B-' || grade === 'C+') return 'Your page could be better';
  if (grade.startsWith('C') || grade === 'D') return 'Your page needs work';
  return 'Your page needs urgent attention';
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Map backend scores (v2 + legacy names) onto the 5 mockup buckets.
// Links + Usability are derived when the backend has no dedicated bucket:
//  - Links from link-related issue codes when available, else Technical SEO.
//  - Usability from Accessibility / Mobile.
export function toMockupScores(
  scores: Record<string, number>,
  issues?: { code: string; passed: boolean; impact: number }[],
): Record<MockupCat, number> {
  const get = (...keys: string[]): number | undefined => {
    for (const k of keys) if (typeof scores[k] === 'number') return scores[k];
    return undefined;
  };
  const performance = get('Performance', 'Core Web Vitals') ?? 0;
  const onPage = get('On-page content', 'On-Page SEO', 'Technical SEO') ?? 0;
  const geo = get('AI citation readiness', 'AI Visibility / GEO', 'GEO') ?? 0;
  const usability = get('Accessibility', 'Usability', 'Mobile') ?? 0;

  let links = get('Links');
  if (links === undefined) {
    if (issues?.length) {
      const linkCodes = new Set([
        'site-404', 'site-5xx', 'site-canonical', 'site-dup-titles',
        'site-orphan', 'site-depth', 'site-redirect-chain', 'site-internal-links',
        'www-canonical', 'psi-redirects',
        'link-hygiene', 'psi-crawl-anchors', 'psi-link-text', 'canonical',
      ]);
      const rel = issues.filter((i) => linkCodes.has(i.code));
      if (rel.length) {
        const lost = rel.filter((i) => !i.passed).reduce((s, i) => s + (i.impact || 5), 0);
        links = clamp(100 - lost * 2);
      }
    }
    if (links === undefined) links = get('Technical SEO') ?? onPage;
  }

  return {
    SEO: clamp(onPage),
    GEO: clamp(geo),
    Links: clamp(links),
    Usability: clamp(usability),
    Performance: clamp(performance),
  };
}

export function formatReportDate(iso: string): string {
  try {
    const d = new Date(iso);
    const day = d.getUTCDate();
    const month = d.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' });
    let h = d.getUTCHours();
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${day} ${month} ${h}:${m}${ampm} UTC`;
  } catch {
    return '';
  }
}
