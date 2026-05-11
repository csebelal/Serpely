export interface BlogPostData {
  slug: string;
  category: string;
  tagLabel: string;
  tagAccent?: boolean;
  thumbIconSvg: string;
  coverImage?: string;
  title: string;
  excerpt: string;
  initials: string;
  author: string;
  date: string;
  delay?: string;
}

function slugify(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

export const blogPosts: BlogPostData[] = [
  {
    slug: slugify("Best practices for AI visibility SEO in 2026."),
    category: "geo-aeo", tagLabel: "GEO & AEO", tagAccent: true,
    thumbIconSvg: `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`,
    title: "Best practices for AI visibility SEO in 2026.",
    excerpt: "Structure content for AI citations, answer engines, FAQ schema, E-E-A-T signals, and Google AI Overview visibility.",
    initials: "RR", author: "Romeo Rozario", date: "Mar 12, 2026 · 5 min",
  },
  {
    slug: slugify("AEO vs GEO vs SEO: which strategy should you prioritize?"),
    category: "geo-aeo", tagLabel: "GEO & AEO", delay: "0.04s",
    thumbIconSvg: `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`,
    title: "AEO vs GEO vs SEO: which strategy should you prioritize?",
    excerpt: "A decision framework for answer engine optimization, generative engine optimization, and traditional SEO.",
    initials: "SK", author: "Sara Khan", date: "Mar 24, 2026 · 7 min",
  },
  {
    slug: slugify("Agentic SEO: how AI agents replace manual audits."),
    category: "agentic-seo", tagLabel: "Agentic SEO", tagAccent: true, delay: "0.08s",
    thumbIconSvg: `<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>`,
    title: "Agentic SEO: how AI agents replace manual audits.",
    excerpt: "A practical guide to autonomous SEO agents, continuous audits, issue prioritization, and automated SEO workflows.",
    initials: "DP", author: "Daniel Park", date: "Apr 02, 2026 · 9 min",
  },
  {
    slug: slugify("Best ChatGPT SEO tracking tools for 2026."),
    category: "ai-seo-tools", tagLabel: "AI SEO Tools",
    thumbIconSvg: `<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/>`,
    title: "Best ChatGPT SEO tracking tools for 2026.",
    excerpt: "How to monitor ChatGPT brand visibility, LLM citations, AI Overview appearances, and generative AI search tracking.",
    initials: "AR", author: "Aisha Rahman", date: "Apr 09, 2026 · 6 min",
  },
  {
    slug: slugify("SaaS SEO tools: what actually drives organic growth?"),
    category: "ai-seo-tools", tagLabel: "AI SEO Tools", delay: "0.04s",
    thumbIconSvg: `<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/>`,
    title: "SaaS SEO tools: what actually drives organic growth?",
    excerpt: "A buyer guide for SaaS SEO platforms, automated rank tracking, keyword intelligence, and AI-powered SEO workflows.",
    initials: "ML", author: "Marcus Lee", date: "Apr 18, 2026 · 7 min",
  },
  {
    slug: slugify("How autonomous SEO agents work."),
    category: "agentic-seo", tagLabel: "Agentic SEO", tagAccent: true, delay: "0.08s",
    thumbIconSvg: `<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>`,
    title: "How autonomous SEO agents work.",
    excerpt: "A plain-English explanation of AI SEO agent capabilities, feedback loops, automated tasks, and human checkpoints.",
    initials: "RR", author: "Romeo Rozario", date: "Apr 23, 2026 · 6 min",
  },
  {
    slug: slugify("Technical SEO audit: the complete guide."),
    category: "technical-seo", tagLabel: "Technical SEO",
    thumbIconSvg: `<path d="M8 4l-6 8 6 8M16 4l6 8-6 8"/>`,
    title: "Technical SEO audit: the complete guide.",
    excerpt: "Crawl errors, indexing issues, Core Web Vitals, schema markup, broken links, page speed, and audit prioritization.",
    initials: "PS", author: "Priya Sharma", date: "May 04, 2026 · 10 min",
  },
  {
    slug: slugify("Core Web Vitals in 2026: what SEOs need to know."),
    category: "technical-seo", tagLabel: "Technical SEO", delay: "0.04s",
    thumbIconSvg: `<path d="M8 4l-6 8 6 8M16 4l6 8-6 8"/>`,
    title: "Core Web Vitals in 2026: what SEOs need to know.",
    excerpt: "LCP, INP, CLS, page experience, performance monitoring, and practical fixes for website growth teams.",
    initials: "OW", author: "Owen Walsh", date: "May 11, 2026 · 6 min",
  },
  {
    slug: slugify("Keyword research for SEO: the AI-powered strategy guide."),
    category: "keyword-strategy", tagLabel: "Keyword Strategy", delay: "0.08s",
    thumbIconSvg: `<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5"/>`,
    title: "Keyword research for SEO: the AI-powered strategy guide.",
    excerpt: "Keyword clustering, search intent analysis, competitor keyword gaps, semantic SEO, and AI keyword research tools.",
    initials: "LC", author: "Lia Chen", date: "May 19, 2026 · 9 min",
  },
  {
    slug: slugify("Keyword gap analysis for competitor growth."),
    category: "keyword-strategy", tagLabel: "Keyword Strategy",
    thumbIconSvg: `<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5"/>`,
    title: "Keyword gap analysis for competitor growth.",
    excerpt: "Find the keywords competitors rank for, map missing opportunities, and turn keyword gaps into a content roadmap.",
    initials: "SK", author: "Sara Khan", date: "May 26, 2026 · 6 min",
  },
  {
    slug: slugify("LLM SEO for ChatGPT, Perplexity, and Google AI."),
    category: "llm-seo", tagLabel: "LLM SEO", tagAccent: true, delay: "0.04s",
    thumbIconSvg: `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M9 9h6M9 13h4"/>`,
    title: "LLM SEO for ChatGPT, Perplexity, and Google AI.",
    excerpt: "Optimize content for large language models, answer engines, AI citations, and brand visibility in generative search.",
    initials: "DP", author: "Daniel Park", date: "Jul 02, 2026 · 7 min",
  },
  {
    slug: slugify("7 SEO mistakes making you invisible to AI search."),
    category: "llm-seo", tagLabel: "LLM SEO", delay: "0.08s",
    thumbIconSvg: `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M9 9h6M9 13h4"/>`,
    title: "7 SEO mistakes making you invisible to AI search.",
    excerpt: "Common GEO, AEO, schema, E-E-A-T, technical SEO, and LLM citation mistakes with practical fixes.",
    initials: "RR", author: "Romeo Rozario", date: "Jul 14, 2026 · 5 min",
  },
  {
    slug: slugify("SEO reporting tools that prove website growth."),
    category: "reporting", tagLabel: "Reporting",
    thumbIconSvg: `<path d="M3 3v18h18"/><rect x="7" y="13" width="3" height="5"/><rect x="12" y="9" width="3" height="9"/><rect x="17" y="6" width="3" height="12"/>`,
    title: "SEO reporting tools that prove website growth.",
    excerpt: "Rank tracking software, automated SEO reports, white-label dashboards, SEO KPIs, and GEO visibility reporting.",
    initials: "AR", author: "Aisha Rahman", date: "Jun 09, 2026 · 6 min",
  },
  {
    slug: slugify("Real-time SEO monitoring for ranking drops and AI visibility."),
    category: "reporting", tagLabel: "Reporting", delay: "0.04s",
    thumbIconSvg: `<path d="M3 3v18h18"/><rect x="7" y="13" width="3" height="5"/><rect x="12" y="9" width="3" height="9"/><rect x="17" y="6" width="3" height="12"/>`,
    title: "Real-time SEO monitoring for ranking drops and AI visibility.",
    excerpt: "Continuous SEO monitoring, rank change alerts, technical issue detection, and LLM visibility dashboards.",
    initials: "OW", author: "Owen Walsh", date: "Jul 21, 2026 · 8 min",
  },
  {
    slug: slugify("How Serpely cut SEO reporting time by 80%."),
    category: "case-studies", tagLabel: "Case Studies", delay: "0.08s",
    thumbIconSvg: `<path d="M8 21h8M12 17v4M7 4h10v6a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a3 3 0 0 0 3 3"/><path d="M17 6h3v2a3 3 0 0 1-3 3"/>`,
    title: "How Serpely cut SEO reporting time by 80%.",
    excerpt: "A placeholder customer story for agency SEO reporting automation, efficiency gains, and measurable SEO ROI.",
    initials: "ML", author: "Marcus Lee", date: "Aug 04, 2026 · 5 min",
  },
  {
    slug: slugify("New citation tracking workflows in Serpely."),
    category: "product-updates", tagLabel: "Product Updates",
    thumbIconSvg: `<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>`,
    title: "New citation tracking workflows in Serpely.",
    excerpt: "Placeholder update for AI citation monitoring, brand mention alerts, and product workflows for SEO teams.",
    initials: "PS", author: "Priya Sharma", date: "Apr 28, 2026 · 3 min",
  },
];
