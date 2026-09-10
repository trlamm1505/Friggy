import React, { useState } from 'react';
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
import { AiChatWidget } from '../../components/common/AiChatWidget';
import { Login } from './Login/Login';

export const GuestPage = () => {
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'login'

  if (currentView === 'login') {
    return (
      <Login
        onBack={() => setCurrentView('home')}
        onLoginSuccess={(user) => {
          alert(`Đăng nhập thành công! Chào mừng ${user.name || user.email}`);
          setCurrentView('home');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f6fbf7] text-slate-800 font-sans selection:bg-emerald-200 selection:text-emerald-900">
      <Navbar onOpenAuthModal={() => setCurrentView('login')} />
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
      <AiChatWidget />
    </div>
  );
};

export default GuestPage;
