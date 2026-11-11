export interface DashboardIssue {
  id: string;
  label: string;
  severity: 'HIGH' | 'MEDIUM';
}

export interface EngineCitation {
  name: string;
  percent: number;
}

export interface FloatingCardConfig {
  id: 'scoreUp' | 'citations' | 'citationDrop' | 'fixReady';
  title: string;
  subtitlePrefix?: string;
  subtitleHighlight?: string;
  subtitleSuffix?: string;
  subtitle?: string;
  countTarget?: number;
  countSuffix?: string;
  variant: 'up' | 'live' | 'warn' | 'check';
}

export interface HeroDashboardData {
  browserHost: string;
  sidebar: {
    primary: { label: string; active?: boolean }[];
    groups: { heading: string; items: string[] }[];
  };
  ticker: {
    prefix: string;
    text: string;
    highlight?: boolean;
  }[];
  header: {
    title: string;
    subtitle: string;
    dateRange: string;
  };
  siteHealth: {
    title: string;
    score: number;
    issues: DashboardIssue[];
    fixedLabel: string;
    cycleStartDelayMs: number;
    cycleIntervalMs: number;
  };
  citationsByEngine: {
    title: string;
    engines: EngineCitation[];
  };
  organicPerformance: {
    title: string;
    totalClicks: { label: string; value: string };
    impressions: { label: string; value: string };
    areaPath: string;
    primaryLinePath: string;
    secondaryLinePath: string;
    tertiaryLinePath: string;
  };
  aiVisibility: {
    title: string;
    score: number;
    trendText: string;
    footnote: string;
  };
  floatingCards: {
    scoreUp: FloatingCardConfig;
    citations: FloatingCardConfig;
    citationDrop: FloatingCardConfig;
    fixReady: FloatingCardConfig;
  };
}

/**
 * Centralized hero dashboard & floating card data so placeholder values
 * can be swapped with live API data in one place.
 */
export const HERO_DASHBOARD_DATA: HeroDashboardData = {
  browserHost: 'app.serpely.com',
  sidebar: {
    primary: [
      { label: 'Command Center', active: true },
      { label: 'Web Analytics' },
    ],
    groups: [
      {
        heading: 'ANALYZE',
        items: ['Site Intelligence', 'Page Report', 'Competitive Research'],
      },
      {
        heading: 'ACT',
        items: ['Actions Hub', 'LLM Council'],
      },
      {
        heading: 'STUDIO',
        items: ['Creative Studio'],
      },
    ],
  },
  ticker: [
    { prefix: 'LIVE ·', text: 'Perplexity cited for warm up a domain ▲ #3', highlight: true },
    { prefix: '', text: 'Google AI: improve email deliverability ▼ 28.6' },
    { prefix: '', text: 'Gemini brand mentions ▲ 476', highlight: true },
    { prefix: '', text: 'Google DMARC policy not enabled ▼ 36.6' },
  ],
  header: {
    title: 'Command Center',
    subtitle: 'A clearer view of your visibility. A smarter next move.',
    dateRange: 'Feb 5 – Mar 4, 2026',
  },
  siteHealth: {
    title: 'SITE HEALTH',
    score: 78,
    fixedLabel: 'FIXED',
    cycleStartDelayMs: 4200,
    cycleIntervalMs: 2600,
    issues: [
      { id: 'canon', label: 'Canonicalization issue', severity: 'HIGH' },
      { id: 'h1', label: 'Missing H1 heading', severity: 'HIGH' },
      { id: 'traffic', label: 'Three pages losing traffic', severity: 'MEDIUM' },
    ],
  },
  citationsByEngine: {
    title: 'CITATIONS BY ENGINE',
    engines: [
      { name: 'ChatGPT', percent: 83 },
      { name: 'Perplexity', percent: 71 },
      { name: 'Gemini', percent: 58 },
      { name: 'Claude', percent: 49 },
      { name: 'DeepSeek', percent: 36 },
    ],
  },
  organicPerformance: {
    title: 'ORGANIC PERFORMANCE',
    totalClicks: { label: 'Total clicks', value: '314' },
    impressions: { label: 'Impressions', value: '16,716' },
    areaPath: 'M0 100 C40 96 60 80 100 84 S160 56 200 60 S270 30 320 34 S380 14 400 8 V120 H0Z',
    primaryLinePath: 'M0 100 C40 96 60 80 100 84 S160 56 200 60 S270 30 320 34 S380 14 400 8',
    secondaryLinePath: 'M0 90 C50 70 90 100 140 70 S230 40 280 56 S350 30 400 20',
    tertiaryLinePath: 'M0 60 C40 20 70 90 110 50 S190 20 230 70 S320 40 400 46',
  },
  aiVisibility: {
    title: 'AI VISIBILITY',
    score: 78,
    trendText: '▲ 4 points this week',
    footnote: 'Your next opportunity is already in view.',
  },
  floatingCards: {
    scoreUp: {
      id: 'scoreUp',
      title: 'GEO Score Up',
      subtitle: '/best-crm 74 → 78',
      variant: 'up',
    },
    citations: {
      id: 'citations',
      title: 'AI Citations',
      countTarget: 143,
      subtitle: 'across 5 engines',
      variant: 'live',
    },
    citationDrop: {
      id: 'citationDrop',
      title: 'AI Citation Drop',
      subtitlePrefix: 'ChatGPT mentions ↑ ',
      countTarget: 83,
      countSuffix: '%',
      variant: 'warn',
    },
    fixReady: {
      id: 'fixReady',
      title: 'Fix ready',
      subtitle: 'Schema added to 14 pages',
      variant: 'check',
    },
  },
};
