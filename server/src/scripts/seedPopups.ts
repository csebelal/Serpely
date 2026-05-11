import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config();

import Popup from '../models/Popup';

const DEMOS = [
  // ── Banner ─────────────────────────────────────────────────────────────────
  {
    type: 'banner', trigger: 'immediate', delay: 0, active: true,
    title: '🚀 New Feature: AI-Powered SEO Insights',
    body: 'Now live for all Pro plans — upgrade today.',
    ctaText: 'See What\'s New', ctaHref: '/changelog',
    bgColor: '#0f172a',
  },
  {
    type: 'banner', trigger: 'exit-intent', delay: 0, active: true,
    title: '⚡ Before you go — grab 20% off',
    body: 'Limited time offer. Use code EXIT20 at checkout.',
    ctaText: 'Claim Discount', ctaHref: '/pricing',
    bgColor: '#7c3aed',
  },
  {
    type: 'banner', trigger: 'scroll-50', delay: 0, active: true,
    title: '📊 Free SEO Audit for your site',
    body: 'Get a full technical audit in under 60 seconds.',
    ctaText: 'Start Free Audit', ctaHref: '/product-tour',
    bgColor: '#0369a1',
  },

  // ── Modal ──────────────────────────────────────────────────────────────────
  {
    type: 'modal', trigger: 'immediate', delay: 3000, active: true,
    title: 'Welcome to Serpely 👋',
    body: 'The AI-first SEO platform used by 500+ growth teams. Start your free trial — no credit card needed.',
    ctaText: 'Start Free Trial', ctaHref: '/register',
    bgColor: '#0f172a',
  },
  {
    type: 'modal', trigger: 'exit-intent', delay: 0, active: true,
    title: 'Wait — don\'t miss out',
    body: 'Get a 14-day free trial before you leave. See exactly how Serpely can grow your organic traffic.',
    ctaText: 'Try Free for 14 Days', ctaHref: '/register',
    bgColor: '#1e1b4b',
  },
  {
    type: 'modal', trigger: 'scroll-50', delay: 0, active: true,
    title: 'Enjoying what you see?',
    body: 'Join 3,000+ marketers using Serpely to rank faster in AI-powered search.',
    ctaText: 'Get Started Free', ctaHref: '/register',
    bgColor: '#064e3b',
  },

  // ── Corner ─────────────────────────────────────────────────────────────────
  {
    type: 'corner', trigger: 'immediate', delay: 5000, active: true,
    title: 'Chat with us 💬',
    body: 'Have questions? Our team is online and ready to help.',
    ctaText: 'Start Chat', ctaHref: '/contact',
    bgColor: '#ffffff',
  },
  {
    type: 'corner', trigger: 'exit-intent', delay: 0, active: true,
    title: 'Get the weekly SEO digest 📬',
    body: 'AI search tips, GEO insights, and case studies every week.',
    ctaText: 'Subscribe Free', ctaHref: '/#newsletter',
    bgColor: '#00C27A',
  },
  {
    type: 'corner', trigger: 'scroll-50', delay: 0, active: true,
    title: 'Free 7-day Pro trial ✨',
    body: 'Unlock all features including AI content optimizer and rank tracker.',
    ctaText: 'Activate Trial', ctaHref: '/pricing',
    bgColor: '#1e40af',
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || '', { family: 4 });
  console.log('Connected to MongoDB');

  const existing = await Popup.countDocuments();
  if (existing > 0) {
    console.log(`${existing} popups already exist. Skipping seed.`);
    console.log('Run with --force to overwrite: add logic if needed');
    process.exit(0);
  }

  const created = await Popup.insertMany(DEMOS);
  console.log(`✓ Created ${created.length} demo popups`);
  console.log('\nTypes seeded:');
  DEMOS.forEach(p => console.log(`  [${p.type}] trigger:${p.trigger} — ${p.title}`));
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
