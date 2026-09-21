import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ShieldCheck, Sparkles, Move } from 'lucide-react';
import { heroData } from '../../../data';
import goodMorningImg from '../../../assets/images/goodmorning-Photoroom.png';
import goodAfternoonImg from '../../../assets/images/goodafternoon-Photoroom.png';
import goodEveningImg from '../../../assets/images/goodevening-Photoroom.png';
import AnimatedCounter from '../../../components/common/AnimatedCounter';


export const HeroSection = () => {
  // Determine time of day based on user's local clock
  const getCurrentTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    return 'evening';
  };

  const [timeOfDay, setTimeOfDay] = useState(getCurrentTimeOfDay());

  // Click Vigorous Shake State
  const [isShaking, setIsShaking] = useState(false);

  const handlePhoneClick = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 700);
  };

  // Periodically update time of day
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeOfDay(getCurrentTimeOfDay());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreetingImage = () => {
    switch (timeOfDay) {
      case 'morning':
        return goodMorningImg;
      case 'afternoon':
        return goodAfternoonImg;
      case 'evening':
      default:
        return goodEveningImg;
    }
  };

  const currentImage = getGreetingImage();

  return (
    <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-b from-emerald-50/80 via-emerald-50/30 to-emerald-100/20 select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-200/40 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute top-10 right-10 w-96 h-96 bg-green-200/30 rounded-full blur-2xl pointer-events-none -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Text Content (animate__zoomIn) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
            className="lg:col-span-7 space-y-6 text-center lg:text-left"
          >
            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-emerald-950 leading-[1.2] tracking-tight">
              <span className="block">{heroData.titlePart1}</span>
              <span className="block bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700 bg-clip-text text-transparent">
                {heroData.titleHighlight}
              </span>
              <span className="block">{heroData.titlePart2}</span>
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

            {/* Animated Stats Row */}
            <div className="pt-6 border-t border-emerald-200/60 grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0">
              {/* Stat 1: 350.000+ */}
              <div className="text-center lg:text-left">
                <div className="text-xl sm:text-2xl font-extrabold text-emerald-950">
                  <AnimatedCounter target={350000} suffix="+" delay={0.35} />
                </div>
                <div className="text-xs sm:text-sm text-emerald-700/80 font-medium mt-0.5">
                  {heroData.stats[0]?.label || 'Người Dùng Đăng Ký'}
                </div>
              </div>

              {/* Stat 2: 6.9 ★ */}
              <div className="text-center lg:text-left">
                <div className="text-xl sm:text-2xl font-extrabold text-emerald-950">
                  <AnimatedCounter target={6.9} decimals={1} delay={0.5} />{' '}
                  <span className="text-amber-500 text-lg">★</span>
                </div>
                <div className="text-xs sm:text-sm text-emerald-700/80 font-medium mt-0.5">
                  {heroData.stats[1]?.label || 'Sức Khỏe & Phù Hợp'}
                </div>
              </div>

              {/* Stat 3: 98% */}
              <div className="text-center lg:text-left">
                <div className="text-xl sm:text-2xl font-extrabold text-emerald-950">
                  <AnimatedCounter target={98} suffix="%" delay={0.65} />
                </div>
                <div className="text-xs sm:text-sm text-emerald-700/80 font-medium mt-0.5">
                  {heroData.stats[2]?.label || 'Đánh Giá Hài Lòng'}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Mobile App Preview Mockup (animate__zoomIn - Delayed Sequential Entrance) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1], delay: 0.7 }}
            className="lg:col-span-5 relative flex justify-center pt-8 sm:pt-12 lg:pt-14 pb-4 perspective-[1000px]"
          >
            {/* Dynamic Time Greeting Mascot Image floating independently on Left of Phone */}
            <div className="absolute -top-1 -left-2 sm:-top-1 sm:left-1 lg:-top-2 lg:-left-12 z-20 pointer-events-none">
              <AnimatePresence mode="wait">
                <motion.img
                  key={timeOfDay}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1, y: [0, -45, 0] }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{
                    opacity: { duration: 0.3 },
                    scale: { duration: 0.3 },
                    y: { duration: 2.0, repeat: Infinity, ease: 'easeInOut' }
                  }}
                  src={currentImage}
                  alt={`Good ${timeOfDay}`}
                  className="w-28 h-28 sm:w-36 sm:h-36 lg:w-44 lg:h-44 object-contain drop-shadow-2xl"
                />
              </AnimatePresence>
            </div>

            {/* Phone Image Container with Auto Continuous Wobble & Vigorous Click Shake */}
            <motion.div
              onClick={handlePhoneClick}
              animate={
                isShaking
                  ? {
                      rotateZ: [0, -22, 22, -16, 16, -8, 8, 0],
                      rotateX: [0, 18, -18, 12, -12, 0],
                      rotateY: [0, -25, 25, -15, 15, 0],
                      scale: [1, 1.18, 0.94, 1.08, 0.98, 1],
                      y: [0, -20, 10, -12, 5, 0],
                    }
                  : {
                      rotateZ: [-3.5, 3.5, -3.5],
                      rotateY: [-6, 6, -6],
                      rotateX: [-3, 3, -3],
                      y: [0, -16, 0],
                    }
              }
              transition={
                isShaking
                  ? {
                      duration: 0.65,
                      ease: 'easeInOut',
                    }
                  : {
                      rotateZ: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
                      rotateY: { duration: 4.0, repeat: Infinity, ease: 'easeInOut' },
                      rotateX: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' },
                      y: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
                    }
              }
              whileHover={{
                scale: 1.05,
              }}
              whileTap={{
                scale: 0.95,
              }}
              style={{ transformStyle: 'preserve-3d' }}
              className="relative z-10 max-w-[250px] sm:max-w-[280px] lg:max-w-[290px] drop-shadow-2xl cursor-pointer"
            >
              {/* Soft pastel light green backdrop behind phone frame */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-200/40 via-teal-100/30 to-emerald-100/40 rounded-[44px] transform rotate-2 blur-sm pointer-events-none"></div>

              <img
                src={heroData.mockupImage}
                alt="Friggy App Mobile Interface"
                className="w-full h-auto rounded-[36px] border-4 border-slate-900/90 shadow-2xl relative z-10 pointer-events-none"
              />

              {/* Floating Badge 1 - Top-Right of Phone */}
              <motion.div
                animate={{
                  y: [0, -8, 0],
                  rotate: [0, 3, -3, 0],
                }}
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.2,
                }}
                className="absolute -top-3 -right-8 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-emerald-100 flex items-center gap-2.5 z-10 pointer-events-none"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-emerald-950">{heroData.floatingBadges.badge1.title}</div>
                  <div className="text-[9px] text-emerald-600 font-semibold">{heroData.floatingBadges.badge1.subtitle}</div>
                </div>
              </motion.div>

              {/* Floating Badge 2 - Bottom-Right of Phone */}
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
                className="absolute -bottom-3 -right-6 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-emerald-100 flex items-center gap-2.5 z-10 pointer-events-none"
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
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
