import { useEffect, useRef } from 'react';
import { useSEOMeta } from '@/hooks/useSEOMeta';
import { injectSchema, removeSchema } from '@/lib/schema';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HeroSection } from '@/sections/HeroSection';
import { LogosMarqueeSection } from '@/sections/LogosMarqueeSection';
import { ProblemSolutionSection } from '@/sections/ProblemSolutionSection';
import { HowItWorksSection } from '@/sections/HowItWorksSection';
import { CoreFeaturesSection } from '@/sections/CoreFeaturesSection';
import { TargetAudienceSection } from '@/sections/TargetAudienceSection';
import { TestimonialsSection } from '@/sections/TestimonialsSection';
import { FAQSection } from '@/sections/FAQSection';
import { CTASection } from '@/sections/CTASection';
import { NewsletterSection } from '@/sections/NewsletterSection';

gsap.registerPlugin(ScrollTrigger);

export function Home() {
  useSEOMeta('home', { title: 'Serpely — Agentic SEO for the AI-First Web', description: 'Daily AI audit that tracks whether you\'re cited across ChatGPT, Perplexity, and Google AI Overviews.' });
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    injectSchema('schema-org', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Serpely',
      url: 'https://serpely.com',
      logo: 'https://serpely.com/Serpely%20Logo%20PNG/Serpely%20-%20Logo_Logo%20-%20Main.png',
      sameAs: ['https://twitter.com/serpely', 'https://linkedin.com/company/serpely'],
      contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', url: 'https://serpely.com/contact' },
    });
    injectSchema('schema-software', {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Serpely',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: 'https://serpely.com',
      description: 'Agentic SEO platform for the AI-first web. Track visibility across ChatGPT, Perplexity, and Google AI Overviews.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Free trial available' },
    });
    return () => { removeSchema('schema-org'); removeSchema('schema-software'); };
  }, []);

  useEffect(() => {
    ScrollTrigger.refresh();
    return () => { ScrollTrigger.getAll().forEach(st => st.kill()); };
  }, []);

  return (
    <div ref={mainRef} className="relative">
      <HeroSection />
      <LogosMarqueeSection />
      <ProblemSolutionSection />
      <HowItWorksSection />
      <CoreFeaturesSection />
      <TargetAudienceSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <NewsletterSection />
    </div>
  );
}
