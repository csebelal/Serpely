import { useEffect, useRef } from 'react';
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
  const mainRef = useRef<HTMLDivElement>(null);

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
