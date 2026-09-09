import React from 'react';
import { motion } from 'framer-motion';
import { Play, ShieldCheck, Sparkles } from 'lucide-react';
import { heroData } from '../../../data';

export const HeroSection = () => {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-b from-emerald-50/80 via-emerald-50/30 to-emerald-100/20">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-200/40 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute top-10 right-10 w-96 h-96 bg-green-200/30 rounded-full blur-2xl pointer-events-none -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Text Content */}
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-emerald-950 leading-[1.15] tracking-tight">
              {heroData.titlePart1} <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700 bg-clip-text text-transparent">
                {heroData.titleHighlight}
              </span>{' '}
              {heroData.titlePart2}
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-emerald-900/70 max-w-2xl mx-auto lg:mx-0 font-medium leading-relaxed">
              {heroData.description}
            </p>

            {/* CTA Video Button */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start pt-2">
              <button className="flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-7 py-3.5 rounded-2xl font-bold text-base shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all cursor-pointer group">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                  <Play className="w-4 h-4 fill-current translate-x-0.5" />
                </div>
                <span>Xem video demo</span>
              </button>
            </div>
          </div>

          {/* Right Column: Mobile App Preview Mockup with Wobble/Floating Animation */}
          <div className="lg:col-span-5 relative flex justify-center py-4">
            {/* Soft decorative background card behind phone */}
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400/20 to-teal-300/30 rounded-3xl transform rotate-3 scale-90 blur-xs"></div>

            {/* Phone Image Container - Compact size + Wobble/Shake Motion */}
            <motion.div
              animate={{
                y: [0, -12, 0],
                rotate: [0, -2, 2, -1, 1, 0],
              }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              whileHover={{
                scale: 1.05,
                rotate: [0, -4, 4, -2, 2, 0],
                transition: { duration: 0.5 },
              }}
              className="relative z-10 max-w-[250px] sm:max-w-[280px] lg:max-w-[290px] drop-shadow-2xl cursor-pointer"
            >
              <img
                src={heroData.mockupImage}
                alt="Friggy App Mobile Interface"
                className="w-full h-auto rounded-[36px] border-4 border-slate-900/90 shadow-2xl"
              />

              {/* Floating Badge 1 - Wobble Motion */}
              <motion.div
                animate={{
                  y: [0, -8, 0],
                  rotate: [0, -3, 3, 0],
                }}
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.2,
                }}
                className="absolute -top-3 -left-8 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-emerald-100 flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-emerald-950">{heroData.floatingBadges.badge1.title}</div>
                  <div className="text-[9px] text-emerald-600 font-semibold">{heroData.floatingBadges.badge1.subtitle}</div>
                </div>
              </motion.div>

              {/* Floating Badge 2 - Wobble Motion */}
              <motion.div
                animate={{
                  y: [0, 8, 0],
                  rotate: [0, 3, -3, 0],
                }}
                transition={{
                  duration: 3.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.5,
                }}
                className="absolute -bottom-3 -right-6 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-emerald-100 flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-emerald-950">{heroData.floatingBadges.badge2.title}</div>
                  <div className="text-[9px] text-emerald-600 font-semibold">{heroData.floatingBadges.badge2.subtitle}</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
