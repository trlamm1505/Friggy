import React from 'react';
import { Navbar } from './Navbar/Navbar';
import { HeroSection } from './Hero/HeroSection';
import { FeaturesSection } from './Features/FeaturesSection';
import { HowItWorksSection } from './HowItWorks/HowItWorksSection';
import { PricingSection } from './Pricing/PricingSection';
import { TestimonialsSection } from './Testimonials/TestimonialsSection';
import { FaqSection } from './Faq/FaqSection';
import { DownloadCtaBanner } from './DownloadCta/DownloadCtaBanner';
import { GuestFooter } from './Footer/GuestFooter';
import { BackToTop } from '../../components/common/BackToTop';

export const GuestPage = () => {
  return (
    <div className="min-h-screen bg-[#f6fbf7] text-slate-800 font-sans selection:bg-emerald-200 selection:text-emerald-900">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <TestimonialsSection />
        <FaqSection />
        <DownloadCtaBanner />
      </main>
      <GuestFooter />
      <BackToTop />
    </div>
  );
};

export default GuestPage;
