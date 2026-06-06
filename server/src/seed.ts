import dotenv from 'dotenv';
dotenv.config();

import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import AdminUser from './models/AdminUser';
import SiteSection from './models/SiteSection';
import NavItem from './models/NavItem';
import FooterConfig from './models/FooterConfig';
import BlogPost from './models/BlogPost';
import PricingPlan from './models/PricingPlan';
import Testimonial from './models/Testimonial';
import FaqItem from './models/FaqItem';
import SiteSettings from './models/SiteSettings';

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || '');
  console.log('Connected to MongoDB');

  // ── Admin User ──────────────────────────────────────────────────────────────
  await AdminUser.deleteMany({});
  await AdminUser.create({
    email: process.env.ADMIN_EMAIL || 'admin@serpely.com',
    passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10),
  });
  console.log('✓ Admin user');

  // ── Site Settings ───────────────────────────────────────────────────────────
  await SiteSettings.deleteMany({});
  await SiteSettings.create({
    siteName: 'Serpely',
    siteUrl: 'https://serpely.com',
    defaultMetaTitle: 'Serpely — Agentic SEO for the AI-first web',
    defaultMetaDescription:
      'Daily AI audits, GEO scoring, AI citation monitoring, and ranked fix queues. The SEO platform built for a world where ChatGPT and Perplexity decide your traffic.',
    googleAnalyticsId: '',
    maintenanceMode: false,
    systemStatus: 'All Systems Operational',
  });
  console.log('✓ Site settings');

  // ── Nav Items ───────────────────────────────────────────────────────────────
  await NavItem.deleteMany({});
  await NavItem.insertMany([
    {
      label: 'Why Serpely',
      href: '#',
      order: 1,
      isCta: false,
      isVisible: true,
      dropdownItems: [
        { label: 'AI Rank Tracking', href: '/features', desc: 'Monitor keyword positions daily with AI-powered insights' },
        { label: 'GEO Monitoring', href: '/features', desc: 'Track your visibility in ChatGPT, Perplexity, and Google AI' },
        { label: 'Technical Site Audit', href: '/features', desc: 'Daily crawls, Core Web Vitals, and indexing health' },
        { label: 'Content Prioritization', href: '/features', desc: 'AI-ranked action queue — know what to fix next' },
        { label: 'vs Semrush', href: '/compare', desc: '' },
        { label: 'vs Ahrefs', href: '/compare', desc: '' },
        { label: 'vs Surfer SEO', href: '/compare', desc: '' },
      ],
    },
    {
      label: 'Product',
      href: '#',
      order: 2,
      isCta: false,
      isVisible: true,
      dropdownItems: [
        { label: 'Features', href: '/features', desc: 'All platform capabilities in one place' },
        { label: 'Product Tour', href: '/product-tour', desc: 'See Serpely in action with a guided walkthrough' },
        { label: 'Integrations', href: '/integrations', desc: 'Connect GSC, GA4, Slack, and more' },
        { label: 'How It Works', href: '/how-it-works', desc: 'The Serpely workflow explained step by step' },
      ],
    },
    {
      label: 'Resources',
      href: '#',
      order: 3,
      isCta: false,
      isVisible: true,
      dropdownItems: [
        { label: 'Blog', href: '/blog', desc: '' },
        { label: 'FAQ', href: '/faq', desc: '' },
        { label: 'About Us', href: '/about', desc: '' },
        { label: 'Contact', href: '/contact', desc: '' },
      ],
    },
    { label: 'Pricing', href: '/pricing', order: 4, isCta: false, isVisible: true, dropdownItems: [] },
    { label: 'Free Site Audit', href: '#', order: 5, isCta: true, isVisible: true, dropdownItems: [] },
    { label: 'Login', href: '#', order: 6, isCta: false, isVisible: true, dropdownItems: [] },
    { label: 'Start Free Trial', href: '#', order: 7, isCta: true, isVisible: true, dropdownItems: [] },
  ]);
  console.log('✓ Nav items');

  // ── Footer Config ───────────────────────────────────────────────────────────
  await FooterConfig.deleteMany({});
  await FooterConfig.create({
    tagline: 'Agentic SEO for the AI-first web.',
    columns: [
      {
        name: 'Product',
        links: [
          { label: 'Features', href: '/features' },
          { label: 'Product Tour', href: '/product-tour' },
          { label: 'Integrations', href: '/integrations' },
          { label: 'Rank Tracker', href: '/features' },
          { label: 'GEO Monitoring', href: '/features' },
          { label: 'Technical Audit', href: '/features' },
          { label: 'White-Label', href: '/pricing' },
          { label: 'Changelog', href: '/blog' },
        ],
      },
      {
        name: 'Company',
        links: [
          { label: 'About Us', href: '/about' },
          { label: 'Blog', href: '/blog' },
          { label: 'Careers', href: '#' },
          { label: 'Affiliate Program', href: '#' },
          { label: 'Contact', href: '/contact' },
          { label: 'Privacy Policy', href: '#' },
          { label: 'Terms of Service', href: '#' },
          { label: 'Serpely Brand Kit', href: '#' },
        ],
      },
      {
        name: 'Resources',
        links: [
          { label: 'SEO Blog', href: '/blog' },
          { label: 'GEO Guide', href: '/blog' },
          { label: 'API Docs', href: '#' },
          { label: 'FAQ', href: '/faq' },
          { label: 'Help Center', href: '#' },
          { label: 'Feedback', href: '/contact' },
          { label: 'Technical Docs', href: '#' },
        ],
      },
      {
        name: 'Compare',
        links: [
          { label: 'vs Semrush', href: '/compare' },
          { label: 'vs Ahrefs', href: '/compare' },
          { label: 'vs Nightwatch', href: '/compare' },
          { label: 'vs Rankability', href: '/compare' },
          { label: 'vs SE Ranking', href: '/compare' },
          { label: 'vs Surfer SEO', href: '/compare' },
          { label: 'vs SERPStat', href: '/compare' },
          { label: 'vs Moz', href: '/compare' },
        ],
      },
    ],
    socialLinks: [
      { platform: 'LinkedIn', href: '#' },
      { platform: 'X', href: '#' },
      { platform: 'Facebook', href: '#' },
      { platform: 'YouTube', href: '#' },
    ],
    productHuntUrl: '#',
    productHuntBtnText: 'Product Hunt',
    askAiPrompt: 'What is Serpely and how does it help with AI SEO?',
    copyright: '© 2026 CieloOps Inc. All rights reserved.',
    systemStatus: 'All Systems Operational',
  });
  console.log('✓ Footer config');

  // ── Pricing Plans ───────────────────────────────────────────────────────────
  await PricingPlan.deleteMany({});
  await PricingPlan.insertMany([
    {
      name: 'Starter',
      badge: 'Free Forever',
      description: 'Perfect for individuals and small projects getting started with AI SEO.',
      monthlyPrice: 0,
      annualPrice: 0,
      annualBilledAs: 'Free forever',
      ctaLabel: 'Get Started Free',
      isFeatured: false,
      order: 1,
      features: [
        { text: 'Up to 100 keywords', included: true },
        { text: '1 website', included: true },
        { text: 'Basic rank tracking', included: true },
        { text: 'Weekly site audits', included: true },
        { text: 'GEO Score (read-only)', included: true },
        { text: 'Email support', included: true },
        { text: 'API access', included: false },
        { text: 'AI Citation Monitor', included: false },
        { text: 'White-label reports', included: false },
        { text: 'Priority support', included: false },
      ],
    },
    {
      name: 'Professional',
      badge: 'Most Popular',
      description: 'For growing teams that need daily insights and AI citation tracking.',
      monthlyPrice: 49,
      annualPrice: 39,
      annualBilledAs: '$468 billed annually',
      ctaLabel: 'Start Free Trial',
      isFeatured: true,
      order: 2,
      features: [
        { text: 'Up to 1,000 keywords', included: true },
        { text: '5 websites', included: true },
        { text: 'Daily rank tracking & audits', included: true },
        { text: 'Full GEO Score', included: true },
        { text: 'AI Citation Monitor', included: true },
        { text: 'Priority email support', included: true },
        { text: 'API access', included: true },
        { text: 'White-label reports', included: false },
        { text: 'Dedicated account manager', included: false },
      ],
    },
    {
      name: 'Business',
      badge: 'Agency-Ready',
      description: 'For agencies and enterprise teams managing multiple client sites.',
      monthlyPrice: 99,
      annualPrice: 79,
      annualBilledAs: '$948 billed annually',
      ctaLabel: 'Start Free Trial',
      isFeatured: false,
      order: 3,
      features: [
        { text: 'Unlimited keywords', included: true },
        { text: 'Unlimited websites', included: true },
        { text: 'Real-time tracking', included: true },
        { text: '24/7 support', included: true },
        { text: 'Full API access', included: true },
        { text: 'White-label reports', included: true },
        { text: 'Dedicated account manager', included: true },
        { text: 'Custom integrations', included: true },
      ],
    },
  ]);
  console.log('✓ Pricing plans');

  // ── Testimonials ─────────────────────────────────────────────────────────────
  await Testimonial.deleteMany({});
  await Testimonial.insertMany([
    {
      quote: "Serpely replaced four separate tools overnight. We now have one dashboard that shows us exactly where to focus. Our organic traffic went up 28% in 6 weeks after acting on the AI action queue.",
      name: 'Sarah M.',
      role: 'Head of SEO, Northstar Growth',
      initial: 'S',
      order: 1,
      isVisible: true,
    },
    {
      quote: "The GEO monitoring alone is worth the subscription. We can now see how often our brand gets cited by ChatGPT and Gemini. No other tool gives us that. Our agency clients love seeing it in reports.",
      name: 'Reza A.',
      role: 'Founder, AtlasEdge Media',
      initial: 'R',
      order: 2,
      isVisible: true,
    },
    {
      quote: "I used to spend 2 hours every Monday pulling SEO reports manually. Serpely sends me a weekly digest and the content prioritization queue tells my team exactly what to work on. It's like having an extra hire.",
      name: 'Talia K.',
      role: 'Content Lead, LumaDesk',
      initial: 'T',
      order: 3,
      isVisible: true,
    },
    {
      quote: "The first week exposed five pages that were ranking in Google but invisible in AI answers. That changed our roadmap immediately.",
      name: 'Maya R.',
      role: 'Growth Director, BrightPath Labs',
      initial: 'M',
      order: 4,
      isVisible: true,
    },
    {
      quote: "Our clients finally understand what changed after AI Overviews. The reports are simple enough for executives and detailed enough for the SEO team.",
      name: 'Jon P.',
      role: 'Strategy Lead, SignalMint',
      initial: 'J',
      order: 5,
      isVisible: true,
    },
    {
      quote: "We stopped arguing about which SEO tasks mattered. Serpely ranks the work by impact, so our developers get a clear queue instead of a spreadsheet.",
      name: 'Nadia V.',
      role: 'Marketing Ops, QueryPeak',
      initial: 'N',
      order: 6,
      isVisible: true,
    },
  ]);
  console.log('✓ Testimonials');

  // ── FAQ Items ────────────────────────────────────────────────────────────────
  await FaqItem.deleteMany({});
  await FaqItem.insertMany([
    // Home section FAQs
    {
      question: "What makes Serpely different from tools like Semrush or Ahrefs?",
      answer: "Semrush and Ahrefs are data libraries. They give you a wall of metrics and leave the prioritization to you. Serpely is a continuous workflow that audits your site daily, scores every page for AI visibility, monitors whether AI engines are citing your content, and tells you exactly what to fix next. It's also the only platform that tracks your presence inside ChatGPT, Perplexity, Gemini, and Google AI Overviews—which are the channels that increasingly decide whether your traffic survives.",
      category: 'General',
      section: 'home',
      order: 1,
      isVisible: true,
    },
    {
      question: "What is a GEO Score and why does it matter?",
      answer: "GEO stands for Generative Engine Optimization. The GEO Score is a 0 to 100 number we calculate for every page on your site, measuring how likely it is to appear or be cited inside an AI-generated answer. It looks at factors like content structure, citation eligibility, schema, freshness, and the way AI engines actually parse your page. As more searches end inside AI Overviews and chatbot answers without a click, the GEO Score is the metric that tells you whether your content is set up to survive that shift.",
      category: 'GEO',
      section: 'home',
      order: 2,
      isVisible: true,
    },
    {
      question: "How does Serpely monitor AI citations across ChatGPT, Perplexity, and Google AI?",
      answer: "Serpely runs scheduled queries against ChatGPT, Perplexity, Gemini, and Google AI Overviews using your tracked keywords. We log which brands and domains get cited, how often, and where you sit relative to your competitors. When citation frequency drops, when a competitor takes your spot, or when a new query starts pulling you in, you get alerted. You see all of this in one dashboard instead of manually checking AI engines yourself.",
      category: 'AI Monitoring',
      section: 'home',
      order: 3,
      isVisible: true,
    },
    {
      question: "What is Agentic SEO and how is it different from regular SEO software?",
      answer: "Regular SEO software waits for you to ask questions. You log in, run a report, interpret it, decide what to do, and act. Agentic SEO flips that. Serpely runs in the background, audits continuously, identifies issues, scores priorities, and surfaces a ranked list of actions every day. Your role shifts from data analyst to decision maker. You stop hunting for what to work on and start executing on what's already been prioritized for you.",
      category: 'General',
      section: 'home',
      order: 4,
      isVisible: true,
    },
    {
      question: "Does Serpely replace my existing SEO workflow or sit on top of it?",
      answer: "Both, depending on what you're using. Serpely connects directly to Google Search Console and GA4, so it replaces the manual work of pulling and interpreting that data. For most teams, it also replaces standalone rank trackers, technical auditors, and content scoring tools. If you have a niche workflow we don't cover yet, Serpely sits alongside it and exports clean data through its API.",
      category: 'General',
      section: 'home',
      order: 5,
      isVisible: true,
    },
    {
      question: "What are Hallucination Alerts and how do they work?",
      answer: "AI engines occasionally generate inaccurate information about brands and products, including yours. Serpely's Hallucination Alerts watch for this. When ChatGPT, Perplexity, or another AI model produces a factual error about your brand, your features, or your content, we flag it with a severity score and a recommended fix. You learn about misinformation about your business before your customers do.",
      category: 'AI Monitoring',
      section: 'home',
      order: 6,
      isVisible: true,
    },
    {
      question: "How often does Serpely audit my site?",
      answer: "Daily by default. Every 24 hours, Serpely runs a full audit covering on-page SEO, off-page signals, technical health, Core Web Vitals, indexing, schema, and AI citation visibility. Higher tiers run more frequent crawls, down to every six hours. Whenever something material changes, you get a notification and the new findings are added to your prioritized fix queue automatically.",
      category: 'Technical',
      section: 'home',
      order: 7,
      isVisible: true,
    },
    {
      question: "Who is Serpely built for — agencies, startups, or in-house teams?",
      answer: "All three. Agencies use multi-client workspaces, white-label reports, and bulk rank tracking to manage portfolios of sites. Startups use Serpely as their full SEO stack from day one because hiring a senior SEO is expensive and slow. In-house and enterprise teams use it for granular roles, compliance logs, and API access at scale. The product adapts to the tier you're on.",
      category: 'General',
      section: 'home',
      order: 8,
      isVisible: true,
    },
    // Pricing section FAQs
    {
      question: "Can I change plans at any time?",
      answer: "Yes. You can upgrade or downgrade your plan at any time. Upgrades take effect immediately and you'll be charged the prorated difference. Downgrades take effect at the end of your current billing cycle.",
      category: 'Billing',
      section: 'pricing',
      order: 1,
      isVisible: true,
    },
    {
      question: "Is there a free trial?",
      answer: "Yes. Every paid plan includes a 14-day free trial with no credit card required. You get full access to all features on your chosen plan during the trial period.",
      category: 'Billing',
      section: 'pricing',
      order: 2,
      isVisible: true,
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit and debit cards (Visa, Mastercard, American Express), as well as PayPal. For Business plans, we also offer invoicing for annual contracts.",
      category: 'Billing',
      section: 'pricing',
      order: 3,
      isVisible: true,
    },
    {
      question: "Do you offer refunds?",
      answer: "Yes. If you're not satisfied within the first 30 days of your first paid period, contact us and we'll issue a full refund — no questions asked.",
      category: 'Billing',
      section: 'pricing',
      order: 4,
      isVisible: true,
    },
    {
      question: "What happens to my data if I cancel?",
      answer: "Your data is retained for 30 days after cancellation. You can export all your data at any time from the Settings panel. After 30 days, data is permanently deleted from our servers.",
      category: 'Billing',
      section: 'pricing',
      order: 5,
      isVisible: true,
    },
    {
      question: "Do you offer discounts for agencies or nonprofits?",
      answer: "Yes. Agencies managing 10+ client sites qualify for custom pricing. Nonprofits and educational institutions get 30% off all plans. Contact our sales team for details.",
      category: 'Billing',
      section: 'pricing',
      order: 6,
      isVisible: true,
    },
  ]);
  console.log('✓ FAQ items');

  // ── Blog Posts ────────────────────────────────────────────────────────────────
  await BlogPost.deleteMany({});
  await BlogPost.insertMany([
    {
      title: "Best practices for AI visibility SEO in 2026.",
      slug: "best-practices-for-ai-visibility-seo-in-2026",
      excerpt: "Structure content for AI citations, answer engines, FAQ schema, E-E-A-T signals, and Google AI Overview visibility.",
      body: "<p>Content coming soon.</p>",
      author: "Romeo Rozario",
      authorInitials: "RR",
      tagLabel: "GEO & AEO",
      tagColor: "green",
      category: "geo-aeo",
      published: true,
      publishedAt: new Date("2026-03-12"),
    },
    {
      title: "AEO vs GEO vs SEO: which strategy should you prioritize?",
      slug: "aeo-vs-geo-vs-seo-which-strategy-should-you-prioritize",
      excerpt: "A decision framework for answer engine optimization, generative engine optimization, and traditional SEO.",
      body: "<p>Content coming soon.</p>",
      author: "Sara Khan",
      authorInitials: "SK",
      tagLabel: "GEO & AEO",
      tagColor: "green",
      category: "geo-aeo",
      published: true,
      publishedAt: new Date("2026-03-24"),
    },
    {
      title: "Agentic SEO: how AI agents replace manual audits.",
      slug: "agentic-seo-how-ai-agents-replace-manual-audits",
      excerpt: "A practical guide to autonomous SEO agents, continuous audits, issue prioritization, and automated SEO workflows.",
      body: "<p>Content coming soon.</p>",
      author: "Daniel Park",
      authorInitials: "DP",
      tagLabel: "Agentic SEO",
      tagColor: "blue",
      category: "agentic-seo",
      published: true,
      publishedAt: new Date("2026-04-02"),
    },
    {
      title: "Best ChatGPT SEO tracking tools for 2026.",
      slug: "best-chatgpt-seo-tracking-tools-for-2026",
      excerpt: "How to monitor ChatGPT brand visibility, LLM citations, AI Overview appearances, and generative AI search tracking.",
      body: "<p>Content coming soon.</p>",
      author: "Aisha Rahman",
      authorInitials: "AR",
      tagLabel: "AI SEO Tools",
      tagColor: "purple",
      category: "ai-seo-tools",
      published: true,
      publishedAt: new Date("2026-04-09"),
    },
    {
      title: "SaaS SEO tools: what actually drives organic growth?",
      slug: "saas-seo-tools-what-actually-drives-organic-growth",
      excerpt: "A buyer guide for SaaS SEO platforms, automated rank tracking, keyword intelligence, and AI-powered SEO workflows.",
      body: "<p>Content coming soon.</p>",
      author: "Marcus Lee",
      authorInitials: "ML",
      tagLabel: "AI SEO Tools",
      tagColor: "purple",
      category: "ai-seo-tools",
      published: true,
      publishedAt: new Date("2026-04-18"),
    },
    {
      title: "How autonomous SEO agents work.",
      slug: "how-autonomous-seo-agents-work",
      excerpt: "A plain-English explanation of AI SEO agent capabilities, feedback loops, automated tasks, and human checkpoints.",
      body: "<p>Content coming soon.</p>",
      author: "Romeo Rozario",
      authorInitials: "RR",
      tagLabel: "Agentic SEO",
      tagColor: "blue",
      category: "agentic-seo",
      published: true,
      publishedAt: new Date("2026-04-23"),
    },
    {
      title: "Technical SEO audit: the complete guide.",
      slug: "technical-seo-audit-the-complete-guide",
      excerpt: "Crawl errors, indexing issues, Core Web Vitals, schema markup, broken links, page speed, and audit prioritization.",
      body: "<p>Content coming soon.</p>",
      author: "Priya Sharma",
      authorInitials: "PS",
      tagLabel: "Technical SEO",
      tagColor: "orange",
      category: "technical-seo",
      published: true,
      publishedAt: new Date("2026-05-04"),
    },
    {
      title: "Core Web Vitals in 2026: what SEOs need to know.",
      slug: "core-web-vitals-in-2026-what-seos-need-to-know",
      excerpt: "LCP, INP, CLS, page experience, performance monitoring, and practical fixes for website growth teams.",
      body: "<p>Content coming soon.</p>",
      author: "Owen Walsh",
      authorInitials: "OW",
      tagLabel: "Technical SEO",
      tagColor: "orange",
      category: "technical-seo",
      published: true,
      publishedAt: new Date("2026-05-11"),
    },
    {
      title: "Keyword research for SEO: the AI-powered strategy guide.",
      slug: "keyword-research-for-seo-the-ai-powered-strategy-guide",
      excerpt: "Keyword clustering, search intent analysis, competitor keyword gaps, semantic SEO, and AI keyword research tools.",
      body: "<p>Content coming soon.</p>",
      author: "Lia Chen",
      authorInitials: "LC",
      tagLabel: "Keyword Strategy",
      tagColor: "yellow",
      category: "keyword-strategy",
      published: true,
      publishedAt: new Date("2026-05-19"),
    },
    {
      title: "Keyword gap analysis for competitor growth.",
      slug: "keyword-gap-analysis-for-competitor-growth",
      excerpt: "Find the keywords competitors rank for, map missing opportunities, and turn keyword gaps into a content roadmap.",
      body: "<p>Content coming soon.</p>",
      author: "Sara Khan",
      authorInitials: "SK",
      tagLabel: "Keyword Strategy",
      tagColor: "yellow",
      category: "keyword-strategy",
      published: true,
      publishedAt: new Date("2026-05-26"),
    },
    {
      title: "LLM SEO for ChatGPT, Perplexity, and Google AI.",
      slug: "llm-seo-for-chatgpt-perplexity-and-google-ai",
      excerpt: "Optimize content for large language models, answer engines, AI citations, and brand visibility in generative search.",
      body: "<p>Content coming soon.</p>",
      author: "Daniel Park",
      authorInitials: "DP",
      tagLabel: "LLM SEO",
      tagColor: "teal",
      category: "llm-seo",
      published: true,
      publishedAt: new Date("2026-07-02"),
    },
    {
      title: "7 SEO mistakes making you invisible to AI search.",
      slug: "7-seo-mistakes-making-you-invisible-to-ai-search",
      excerpt: "Common GEO, AEO, schema, E-E-A-T, technical SEO, and LLM citation mistakes with practical fixes.",
      body: "<p>Content coming soon.</p>",
      author: "Romeo Rozario",
      authorInitials: "RR",
      tagLabel: "LLM SEO",
      tagColor: "teal",
      category: "llm-seo",
      published: true,
      publishedAt: new Date("2026-07-14"),
    },
    {
      title: "SEO reporting tools that prove website growth.",
      slug: "seo-reporting-tools-that-prove-website-growth",
      excerpt: "Rank tracking software, automated SEO reports, white-label dashboards, SEO KPIs, and GEO visibility reporting.",
      body: "<p>Content coming soon.</p>",
      author: "Aisha Rahman",
      authorInitials: "AR",
      tagLabel: "Reporting",
      tagColor: "gray",
      category: "reporting",
      published: true,
      publishedAt: new Date("2026-06-09"),
    },
    {
      title: "Real-time SEO monitoring for ranking drops and AI visibility.",
      slug: "real-time-seo-monitoring-for-ranking-drops-and-ai-visibility",
      excerpt: "Continuous SEO monitoring, rank change alerts, technical issue detection, and LLM visibility dashboards.",
      body: "<p>Content coming soon.</p>",
      author: "Owen Walsh",
      authorInitials: "OW",
      tagLabel: "Reporting",
      tagColor: "gray",
      category: "reporting",
      published: true,
      publishedAt: new Date("2026-07-21"),
    },
    {
      title: "How Serpely cut SEO reporting time by 80%.",
      slug: "how-serpely-cut-seo-reporting-time-by-80",
      excerpt: "A placeholder customer story for agency SEO reporting automation, efficiency gains, and measurable SEO ROI.",
      body: "<p>Content coming soon.</p>",
      author: "Marcus Lee",
      authorInitials: "ML",
      tagLabel: "Case Studies",
      tagColor: "indigo",
      category: "case-studies",
      published: true,
      publishedAt: new Date("2026-08-04"),
    },
    {
      title: "New citation tracking workflows in Serpely.",
      slug: "new-citation-tracking-workflows-in-serpely",
      excerpt: "Placeholder update for AI citation monitoring, brand mention alerts, and product workflows for SEO teams.",
      body: "<p>Content coming soon.</p>",
      author: "Priya Sharma",
      authorInitials: "PS",
      tagLabel: "Product Updates",
      tagColor: "pink",
      category: "product-updates",
      published: true,
      publishedAt: new Date("2026-04-28"),
    },
  ]);
  console.log('✓ Blog posts (16)');

  // ── Site Sections ─────────────────────────────────────────────────────────────
  await SiteSection.deleteMany({});
  await SiteSection.insertMany([
    // ── Home: Hero ──
    {
      section: 'hero',
      data: {
        announcementText: 'Now in Public Beta — Join The Early Access Team.',
        badge: 'Is your site invisible to AI search?',
        headline: ['Agentic SEO.', 'Built for the', 'AI-first web.'],
        subheadline: 'A daily AI audit that tracks whether you\'re cited across ChatGPT, Perplexity, and Google AI Overviews, and tells you exactly what to fix next.',
        cta1Text: 'Start Free Trial',
        cta1Href: '#',
        cta1Sub: 'No credit card',
        cta2Text: 'Book a Demo',
        cta2Href: '#',
        cta2Sub: 'See live insights',
        trustPlatforms: [
          { name: 'Trustpilot', score: '4.8' },
          { name: 'G2', score: '4.9' },
          { name: 'Capterra', score: '4.7' },
        ],
        featureTags: ['Monitor', 'Optimize', 'Report'],
        kpiCards: [
          { label: 'Impressions', val: '214K', delta: '↑ 12%' },
          { label: 'Avg CTR', val: '8.6%', delta: '↑ 0.4' },
          { label: 'Avg Pos', val: '6.4', delta: '↑ 2' },
          { label: 'AI Actions', val: '6', delta: 'Today' },
        ],
        topPages: [
          { page: '/best-crm-software', clicks: '4,821', ctr: '12.6%', mom: '↑ 18%' },
          { page: '/crm-for-small-business', clicks: '2,103', ctr: '7.2%', mom: '↑ 4%' },
          { page: '/what-is-crm', clicks: '987', ctr: '6.8%', mom: '↓ 8%' },
        ],
      },
    },
    // ── Home: Problem/Solution ──
    {
      section: 'problem-solution',
      data: {
        pillText: 'AI Search Visibility Gap',
        headline1: 'Stop Losing Traffic to',
        headline2: 'AI Search',
        subtext: 'Serpely powers Agentic SEO and Generative Engine Optimization so you stay visible across Google and LLM-driven results.',
        problemLabel: "What's Costing Your Rankings",
        problemItems: [
          "Your organic traffic dropped after AI Overviews launched and you still don't know which keywords triggered it or why",
          "Your competitors appear when people ask ChatGPT or Perplexity about your category. Your brand doesn't.",
          "You're publishing content but have no idea if AI crawlers are indexing it or ignoring it entirely",
          "Your last SEO audit is already outdated. You don't know what broke since then",
        ],
        statNum: '40%',
        statLabel: 'of searches',
        statDesc: "Now get answered by AI without a click. Traditional SEO tools can't track that.",
        solutionLabel: 'The Serpely Agentic SEO System',
        solutionHeadline: 'Four engines, one\nagentic loop.',
        solutionBody: 'Continuous Agentic SEO workflows built for measurable search growth. From keyword intelligence to LLM-driven visibility, one unified SEO operating system.',
        engineTitles: ['Daily AI Audit', 'AI Citation Monitor', 'GEO Score', 'Content Prioritization'],
        engineDescs: [
          'On-page, off-page, and technical SEO audited every day. Wake up to a prioritized fix list.',
          'Tracks citations across ChatGPT, Perplexity, Gemini, and Google AI Overviews.',
          'Every page scored 0–100 for AI visibility and citation eligibility. Updated continuously.',
          'Identifies pages to refresh first, scored by traffic decay, GEO Score, and keyword movement.',
        ],
      },
    },
    // ── Home: How It Works ──
    {
      section: 'how-it-works',
      data: {
        pillText: 'How It Works',
        headline: 'A Continuous SEO\nWorkflow',
        subtext: 'Four stages that run automatically, surface the right actions, and help you ship improvements faster.',
        loopCardTitle: 'Closed Loop System',
        loopCardBody: 'After each cycle, the system learns. Outputs from Improve feed back into Monitor, refining what gets prioritized next.',
        steps: [
          { num: '1', title: 'Monitor', desc: 'Track keyword rankings, Core Web Vitals, backlinks, and AI citation signals across Google and LLM search engines, all in one dashboard.', tags: ['Rank Tracking', 'GEO Signals'] },
          { num: '2', title: 'Analyze', desc: 'Identify keyword gaps, content decay, technical errors, and competitor movements. Understand exactly why rankings shift before they hurt you.', tags: ['Gap Analysis', 'Insights'] },
          { num: '3', title: 'Prioritize', desc: "AI-powered scoring tells you which pages need attention most. Not a firehose of data — a clear, ranked action queue your team can actually act on.", tags: ['Action Queue', 'AI Scoring'] },
          { num: '4', title: 'Improve', desc: 'Apply AI-suggested fixes, track the impact, and generate reports that prove SEO value. Then the loop restarts, automatically.', tags: ['Auto Reports', 'Loop'] },
        ],
      },
    },
    // ── Home: Core Features ──
    {
      section: 'core-features',
      data: {
        pillText: 'Serpely Features',
        headline1: 'Everything You Need.',
        headline2: "Nothing You Don't.",
        subtext: 'Eight powerful modules for modern SEO. One unified platform that connects monitoring, optimization, and reporting.',
        cards: [
          { title: 'GEO Score + Keyword Intelligence', desc: 'Discover keyword gaps, search intent signals, and competitor ranking opportunities. Build structured topic clusters for scalable SEO and GEO growth.', desc2: 'Every page gets a GEO Score from 0 to 100 showing how likely it is to appear in AI-generated answers.' },
          { title: 'AI Citation Monitor', desc: 'Track whether ChatGPT, Perplexity, Gemini, and Google AI Overviews are citing your content. Get alerted when citation frequency changes.' },
          { title: 'Hallucination Alerts', desc: 'Know when AI engines return inaccurate information about your brand or content. Severity scores and fix recommendations included.' },
          { title: 'Content Prioritization', desc: 'Serpely scans every page daily and ranks which ones need a content refresh for AI optimization. A specific, scored action queue based on traffic decay, GEO Score, and keyword movement.' },
          { title: 'Daily Rank Tracking', desc: 'Track keyword rankings across Google and AI-driven search results including LLM answer engines. Real-time visibility shifts with intelligent alerts.' },
          { title: 'Technical Site Audit', desc: 'Continuously audit Core Web Vitals, crawl issues, indexing gaps, and schema errors. Prioritize fixes that directly impact AI visibility.' },
          { title: 'Backlink Monitoring', desc: 'Track new and lost backlinks with quality and authority scoring. Protect domain strength and uncover link-building opportunities.' },
          { title: 'White-Label Reporting', desc: 'Generate SEO, GEO, and LLM visibility reports instantly. Share client-ready dashboards under your brand.' },
        ],
      },
    },
    // ── Home: Target Audience ──
    {
      section: 'target-audience',
      data: {
        pillText: 'Solutions',
        rotatingLabel: 'Built for your workflow',
        words: ['Modern SEO Teams', 'Growing Agencies', 'AI-First Startups', 'Enterprise Brands'],
        headline1: 'Serpely is built for',
        subtext: 'Tailored Agentic SEO workflows for agencies, startups, and enterprise teams.',
        cards: [
          { label: 'For Agencies', title: 'Scale client SEO\nwithout the overhead.', items: ['Multi-client AI SEO workspaces', 'White-label GEO & LLM reporting', 'Bulk keyword rank tracking', 'AI visibility dashboards per client', 'Automated SEO reporting software'], cta: 'Get started for agencies →', ctaHref: '#' },
          { label: 'For Startups', title: 'Grow SEO like a\nteam 10x your size.', items: ['AI SEO agent for fast growth', 'Automated keyword gap analysis', 'Real-time AI search tracking', 'AI-powered content optimization', 'Scalable SEO automation platform'], cta: 'Get started for startups →', ctaHref: '#' },
          { label: 'For Enterprise', title: 'Enterprise-grade SEO\nat every scale.', items: ['Granular SEO roles and permissions', 'Enterprise AI SEO platform', 'Technical SEO audit & compliance logs', 'Generative Engine Optimization (GEO) tools', 'LLM SEO monitoring & API integration'], cta: 'Talk to enterprise sales →', ctaHref: '#' },
        ],
      },
    },
    // ── Home: Testimonials ──
    {
      section: 'testimonials',
      data: {
        badge: 'Customer Outcomes',
        heading: 'Teams that moved from data to results',
      },
    },
    // ── Home: FAQ ──
    {
      section: 'faq-home',
      data: {
        badge: 'FAQ',
        heading: 'Common Questions',
      },
    },
    // ── Home: CTA ──
    {
      section: 'cta',
      data: {
        badge: 'Get Started Today',
        headline: ['Stop guessing.', 'Start ranking', 'with AI precision.'],
        subheading: 'Join thousands of SEO teams using Serpely to track, optimize, and win in the age of AI search.',
        cta1Text: 'Start Free Trial',
        cta1Href: '#',
        cta2Text: 'Book a Demo',
        cta2Href: '#',
        supportText: 'No credit card required · 14-day free trial · Cancel anytime',
      },
    },
    // ── Home: Newsletter ──
    {
      section: 'newsletter',
      data: {
        badge: 'Stay Ahead',
        heading: ['Get the weekly', 'AI SEO digest.'],
        subheading: 'Actionable insights on GEO, AEO, and AI citation trends — delivered every Tuesday.',
        inputPlaceholder: 'Enter your email address',
        buttonText: 'Subscribe Free',
        successMessage: 'You\'re in! Check your inbox for a confirmation.',
        privacyText: 'No spam. Unsubscribe anytime.',
      },
    },
    // ── About Page ──
    {
      section: 'about',
      data: {
        stats: [
          { value: '2,000+', label: 'Active Teams' },
          { value: '50M+',   label: 'Keywords Tracked' },
          { value: '99.9%',  label: 'Uptime SLA' },
          { value: '24/7',   label: 'Support' },
        ],
        mission: {
          headline: 'Democratize SEO for the AI-first era',
          body: 'We build intelligent tools that help every business thrive in AI-era search — where SEO is automated, accessible, and effective for everyone, not just enterprises with big budgets.',
        },
        visionHeadline: 'A world where every brand thrives in AI-era search',
        visionPillars: [
          { title: 'AI-Native Search Visibility',   body: 'The future of search is AI-generated answers. Serpely is built from day one to measure and optimize your presence across ChatGPT, Perplexity, Gemini, and every AI surface that matters.',                                                                                         color: '#00C27A' },
          { title: 'Autonomous, Not Just Automated', body: "Automation runs tasks. Autonomy makes decisions. Serpely's agentic pipeline doesn't just report problems — it identifies, prioritizes, and resolves them 24/7 without manual intervention.",                                                                                  color: '#7c3aed' },
          { title: 'Democratize Enterprise SEO',    body: "Fortune 500 teams shouldn't be the only ones with access to world-class SEO intelligence. Serpely makes enterprise-grade tooling accessible to every team, from solo founders to global brands.",                                                                              color: '#0ea5e9' },
        ],
        valuesHeadline: 'What drives every decision we make',
        valuesSubtext: 'Six principles shaping how we build, hire, and serve customers.',
        values: [
          { title: 'Customer First',    body: "Every product decision, every feature shipped, every line of support — it all starts with what's best for our customers. Their wins are our wins.",   color: '#00C27A' },
          { title: 'Move Fast',         body: 'The AI-search landscape evolves daily. We ship fast, iterate relentlessly, and stay ahead so our customers always have an edge.',                      color: '#7c3aed' },
          { title: 'Radical Clarity',   body: "No black boxes. No vanity metrics. We show you exactly what's working, what's not, and what to do next — in plain language.",                         color: '#0ea5e9' },
          { title: 'Accessibility',     body: "Great SEO intelligence shouldn't require a six-figure budget. We price and design for real-world teams, not just enterprise procurement cycles.",      color: '#f59e0b' },
          { title: 'Own the Outcome',   body: "We don't ship features — we deliver results. We measure ourselves by the growth our customers achieve, not the complexity of our product.",           color: '#ec4899' },
          { title: 'Honest by Default', body: 'We tell you when rankings drop, when GEO score falls, when something breaks. Honest signal in your inbox is worth more than comfortable silence.',   color: '#10b981' },
        ],
        storyParagraphs: [
          'Serpely began in 2023 when a team of SEO experts and AI engineers came together with a shared frustration: existing tools were built for the old web — too complex, too expensive, requiring constant manual work.',
          'We envisioned a platform that acts as an intelligent partner — monitoring, analyzing, and optimizing automatically. One that tracks brand visibility not just on Google, but across every AI surface reshaping how people search.',
          "Today, Serpely powers 2,000+ teams worldwide, from solo founders to Fortune 500 companies. We're just getting started.",
        ],
        milestones: [
          { year: '2023',    label: 'Founded',        event: 'Founded in San Francisco by SEO experts and AI engineers frustrated that existing tools were built for the old web.', color: '#00C27A', icon: '🚀' },
          { year: 'Q3 2023', label: 'Beta Launch',    event: 'Launched closed beta with 200 early-access customers. First real-world GEO score data collected across ChatGPT and Google AI Overviews.', color: '#7c3aed', icon: '⚡' },
          { year: 'Q1 2024', label: 'GEO Monitoring', event: 'GEO Monitoring went live — the first AI visibility score on the market. Brands could now see exactly where they appear in AI-generated answers.', color: '#0ea5e9', icon: '🤖' },
          { year: 'Q3 2024', label: '1,000 Teams',    event: 'Crossed 1,000 active teams across 40+ countries. Expanded rank tracking to Perplexity, Gemini, and Grok alongside traditional Google Search.', color: '#f59e0b', icon: '🌍' },
          { year: '2025',    label: 'Agentic SEO',    event: 'Launched the Agentic SEO pipeline — autonomous content optimization running 24/7 without manual effort. Now powering 2,000+ teams worldwide.', color: '#ec4899', icon: '✨' },
        ],
        team: [
          { initials: 'AK', name: 'Alex Kim',    role: 'CEO & Co-Founder', bg: '#00C27A', image: '',
            socials: { linkedin: '#', twitter: '#', facebook: '#' } },
          { initials: 'SR', name: 'Sofia Reyes', role: 'CTO & Co-Founder', bg: '#7c3aed', image: '',
            socials: { linkedin: '#', twitter: '#', facebook: '#' } },
          { initials: 'MB', name: 'Marcus Bell', role: 'Head of Product',  bg: '#0ea5e9', image: '',
            socials: { linkedin: '#', twitter: '#', facebook: '#' } },
          { initials: 'LP', name: 'Lena Park',   role: 'Head of Growth',   bg: '#f59e0b', image: '',
            socials: { linkedin: '#', twitter: '#', facebook: '#' } },
        ],
      },
    },
    // ── Features Page ──
    {
      section: 'features',
      data: {
        heroHeadline: 'Everything you need to rank higher',
        heroSubtext: 'A complete suite of SEO tools powered by AI. From keyword research to technical audits, all in one platform.',
        heroPrimText: 'Start Free Trial',
        heroPrimHref: '/pricing',
        heroSecText: 'See How It Works',
        heroSecHref: '/how-it-works',
        mainFeats: [
          {
            title: 'Keyword Research & Gap Finder',
            description: 'Discover untapped keyword opportunities with AI-powered research. Analyze search intent, competition levels, and traffic potential to build a winning content strategy.',
            items: ['Competitor keyword analysis', 'Search intent classification', 'Topic cluster builder', 'Keyword difficulty scoring'],
            tag: 'Research',
          },
          {
            title: 'Daily Rank Tracking',
            description: 'Monitor keyword rankings across Google, Bing, and AI search engines. Get real-time alerts for ranking changes and track your progress over time.',
            items: ['Multi-engine tracking', 'SERP feature monitoring', 'Competitor comparison', 'Historical ranking data'],
            tag: 'Tracking',
          },
          {
            title: 'Technical Site Audit',
            description: "Continuously monitor your website's technical health. Identify and fix issues that hurt search performance before they impact rankings.",
            items: ['Core Web Vitals monitoring', 'Crawl error detection', 'Indexability checks', 'Mobile optimization'],
            tag: 'Audit',
          },
          {
            title: 'Backlink Monitoring',
            description: 'Track your backlink profile in real-time. Monitor new and lost links, analyze link quality, and discover link-building opportunities.',
            items: ['New/lost link alerts', 'Domain authority tracking', 'Anchor text analysis', 'Toxic link detection'],
            tag: 'Backlinks',
          },
        ],
        addHeadline: 'The complete SEO platform',
        addSubtext: 'Every tool you need, unified in one place.',
        addFeats: [
          { title: 'Content Prioritization',  description: 'AI-driven scoring to identify which pages need attention first.' },
          { title: 'White-Label Reports',     description: 'Generate professional, branded reports for your clients instantly.' },
          { title: 'AI Content Optimization', description: 'Get AI-powered suggestions to improve your content quality.' },
          { title: 'Security Monitoring',     description: 'Monitor for security issues that could affect your SEO ranking.' },
          { title: 'Automated Workflows',     description: 'Set up automated SEO tasks and scheduled reporting flows.' },
          { title: 'Advanced Analytics',      description: 'Deep dive into your SEO performance with rich metric dashboards.' },
          { title: 'Multi-Language Support',  description: 'Track rankings in multiple languages and target regions globally.' },
          { title: 'Smart Alerts',            description: 'Get notified about important SEO changes the moment they happen.' },
        ],
        ctaHeadline: 'Ready to unlock every feature?',
        ctaSubtext: 'Start your free trial today and see what Serpely can do for your SEO.',
        ctaPrimText: 'Start Free Trial',
        ctaPrimHref: '/pricing',
        ctaSecText: 'Compare Plans',
        ctaSecHref: '/compare',
      },
    },
    // ── Integrations Page ──
    {
      section: 'integrations',
      data: {
        heroHeadline: 'Connect your favorite tools',
        heroSubtext: 'Serpely integrates seamlessly with the tools you already use, making it easy to incorporate SEO into your existing workflow.',
        integrations: [
          { category: 'Analytics', items: [
            { name: 'Google Analytics',      description: 'Track website traffic and user behavior',    img: '/Other Logos/Google_Analytics_Logo_2019.svg.png', abbr: 'GA', color: '#E37400', connected: true },
            { name: 'Google Search Console', description: 'Monitor search performance and indexing',    img: '/processed-logos/ribbon-gsc.png',                  abbr: 'SC', color: '#4285F4', connected: true },
            { name: 'Adobe Analytics',       description: 'Enterprise analytics and reporting',         img: '',                                                 abbr: 'AA', color: '#E34220', connected: false },
          ]},
          { category: 'CMS', items: [
            { name: 'WordPress',  description: "The world's most popular CMS",          img: '/processed-logos/ribbon-wordpress.png', abbr: 'WP', color: '#21759B', connected: true },
            { name: 'Shopify',    description: 'E-commerce platform for online stores', img: '',                                     abbr: 'SH', color: '#96BF48', connected: false },
            { name: 'Webflow',    description: 'Visual website builder',                img: '/processed-logos/ribbon-webflow.png',  abbr: 'WF', color: '#4353FF', connected: false },
            { name: 'Contentful', description: 'Headless CMS for modern websites',      img: '',                                     abbr: 'CF', color: '#2478CC', connected: false },
          ]},
          { category: 'Communication', items: [
            { name: 'Slack',           description: 'Get alerts and reports in Slack',  img: '/Other Logos/Slack-logo.png', abbr: 'SL', color: '#4A154B', connected: false },
            { name: 'Microsoft Teams', description: 'Collaborate with your team',       img: '',                            abbr: 'MT', color: '#4B53BC', connected: false },
            { name: 'Discord',         description: 'Community and team communication', img: '',                            abbr: 'DC', color: '#5865F2', connected: false },
          ]},
          { category: 'Project Management', items: [
            { name: 'Jira',   description: 'Track SEO tasks and projects', img: '', abbr: 'JI', color: '#0052CC', connected: false },
            { name: 'Asana',  description: 'Manage SEO workflows',         img: '', abbr: 'AS', color: '#F06A6A', connected: false },
            { name: 'Trello', description: 'Visual project management',    img: '', abbr: 'TR', color: '#0079BF', connected: false },
          ]},
          { category: 'Data & Reporting', items: [
            { name: 'Google Data Studio', description: 'Create custom SEO dashboards', img: '', abbr: 'DS', color: '#669DF6', connected: false },
            { name: 'Tableau',            description: 'Advanced data visualization',  img: '', abbr: 'TB', color: '#E97627', connected: false },
            { name: 'Zapier',             description: 'Automate workflows',           img: '', abbr: 'ZP', color: '#FF4A00', connected: false },
          ]},
        ],
        apiHeadline: 'Build custom integrations',
        apiBody: 'Our comprehensive API allows you to build custom integrations and automate your SEO workflows. Access all Serpely features programmatically.',
        apiFeatures: ['RESTful API with comprehensive documentation', 'Webhook support for real-time updates', 'SDKs for popular programming languages', 'Rate limits that scale with your plan'],
        apiButtonText: 'View API Documentation',
        apiButtonHref: '#',
      },
    },
    // ── Compare Page ──
    {
      section: 'compare',
      data: {
        heroHeadline: 'See how we stack up',
        heroSubtext: 'See why thousands of teams are switching to Serpely for their SEO and GEO needs.',
        comparisons: [
          { feature: 'AI-Powered Optimization', category: 'AI & GEO', serpely: true, ahrefs: false, semrush: false, moz: false },
          { feature: 'Generative Engine Optimization (GEO)', category: 'AI & GEO', serpely: true, ahrefs: false, semrush: false, moz: false },
          { feature: 'LLM Visibility Tracking', category: 'AI & GEO', serpely: true, ahrefs: false, semrush: false, moz: false },
          { feature: 'Content Prioritization', category: 'AI & GEO', serpely: true, ahrefs: false, semrush: false, moz: false },
          { feature: 'Automated Workflows', category: 'AI & GEO', serpely: true, ahrefs: false, semrush: false, moz: false },
          { feature: 'Daily Rank Tracking', category: 'Core SEO', serpely: true, ahrefs: true, semrush: true, moz: true },
          { feature: 'Technical Site Audits', category: 'Core SEO', serpely: true, ahrefs: true, semrush: true, moz: true },
          { feature: 'Backlink Analysis', category: 'Core SEO', serpely: true, ahrefs: true, semrush: true, moz: true },
          { feature: 'API Access', category: 'Core SEO', serpely: true, ahrefs: true, semrush: true, moz: true },
          { feature: 'White-Label Reports', category: 'Agency', serpely: true, ahrefs: true, semrush: true, moz: false },
          { feature: 'Starting Price', serpely: '$0 / mo', ahrefs: '$99 / mo', semrush: '$119 / mo', moz: '$99 / mo', isPrice: true },
        ],
        differences: [
          {
            title: 'Agentic AI',
            description: "Our AI agents don't just report on your SEO — they actively work to improve it with zero manual effort.",
            icon: 'M13 2 4 14h6l-1 8 9-12h-6z',
            accent: true,
          },
          {
            title: 'GEO Scoring',
            description: 'Measure and optimize how often your brand appears in AI-generated answers across every major AI search engine.',
            icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
            accent: false,
          },
          {
            title: 'LLM Privacy Mode',
            description: 'Audit your AI search presence with full data privacy. Zero data sharing with third-party AI providers.',
            icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
            accent: false,
          },
        ],
        ctaHeadline: 'Ready to make the switch?',
        ctaSubtext: 'Start your free trial today and experience the difference Agentic SEO can make.',
        ctaPrimText: 'Start Free Trial',
        ctaPrimHref: '/pricing',
        ctaSecText: 'See How It Works',
        ctaSecHref: '/how-it-works',
      },
    },
  ]);
  console.log('✓ Site sections (13)');

  await mongoose.disconnect();
  console.log('\n✅ Seed complete!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
