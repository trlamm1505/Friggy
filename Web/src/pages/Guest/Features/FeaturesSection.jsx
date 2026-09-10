import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { featureItems } from '../../../data';

export const FeaturesSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // 3D Hover Tilt State
  const [hoverAngle, setHoverAngle] = useState({ rotateX: 0, rotateY: 0, rotateZ: 0 });

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + featureItems.length) % featureItems.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % featureItems.length);
  };

  // Autoplay Timer: Tự động chuyển màn hình sau 3s (3000ms)
  useEffect(() => {
    if (isHovered) return;

    const timer = setInterval(() => {
      handleNext();
    }, 3000);

    return () => clearInterval(timer);
  }, [activeIndex, isHovered]);

  // Mouse Move Tilt Handler - Triggered ONLY when mouse is directly over the center phone card
  const handlePhoneMouseMove = (e) => {
    setIsHovered(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const relativeX = (e.clientX - centerX) / (rect.width / 2);
    const relativeY = (e.clientY - centerY) / (rect.height / 2);

    setHoverAngle({
      rotateX: Math.max(-28, Math.min(28, -relativeY * 26)),
      rotateY: Math.max(-32, Math.min(32, relativeX * 30)),
      rotateZ: Math.max(-12, Math.min(12, relativeX * 8)),
    });
  };

  const handlePhoneMouseLeave = () => {
    setIsHovered(false);
    setHoverAngle({ rotateX: 0, rotateY: 0, rotateZ: 0 });
  };

  const currentItem = featureItems[activeIndex];

  return (
    <section id="features" className="py-20 bg-gradient-to-b from-white via-emerald-50/40 to-emerald-100/30 relative overflow-hidden select-none">
      {/* Immersive background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-200/30 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-8 space-y-3"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-950 tracking-tight">
            Trải Nghiệm Căn Bếp <br />
            <span className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700 bg-clip-text text-transparent">
              Thông Minh Nhất Gia Đình
            </span>
          </h2>
        </motion.div>

        {/* 3D CAROUSEL SHOWCASE CONTAINER */}
        <div className="relative py-2 flex items-center justify-center min-h-[520px] sm:min-h-[580px]">
          {/* Side Navigation Arrow Buttons */}
          <button
            onClick={handlePrev}
            className="absolute left-2 sm:left-6 z-50 w-12 h-12 rounded-full bg-white/90 backdrop-blur-md shadow-2xl border border-emerald-200/80 text-emerald-800 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer active:scale-95"
            aria-label="Previous Feature"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-2 sm:right-6 z-50 w-12 h-12 rounded-full bg-white/90 backdrop-blur-md shadow-2xl border border-emerald-200/80 text-emerald-800 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer active:scale-95"
            aria-label="Next Feature"
          >
            <ChevronRight className="w-7 h-7" />
          </button>

          {/* 3D Phone Cards Showcase Container (3D Fan-Out Entrance) */}
          <motion.div
            initial={{ opacity: 0, y: 70, scale: 0.88 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
            className="relative w-full max-w-6xl h-[500px] sm:h-[570px] flex items-center justify-center perspective-[1200px]"
          >
            {featureItems.map((item, idx) => {
              const count = featureItems.length;
              let offset = (idx - activeIndex + count) % count;
              if (offset > count / 2) offset -= count;

              const isCenter = offset === 0;
              const isVisible = Math.abs(offset) <= 2;

              if (!isVisible) return null;

              const baseX = offset * 270;
              const baseRotateY = offset * -15;
              const baseScale = isCenter ? 1.05 : 1 - Math.abs(offset) * 0.16;
              const zIndex = 30 - Math.abs(offset) * 10;
              const opacity = isCenter ? 1 : 1 - Math.abs(offset) * 0.4;

              // 3D Tilt calculation - ONLY apply movement to the active center phone on hover
              let rotateX = 0;
              let rotateY = baseRotateY;
              let rotateZ = 0;

              if (isCenter) {
                rotateX = hoverAngle.rotateX;
                rotateY = baseRotateY + hoverAngle.rotateY;
                rotateZ = hoverAngle.rotateZ;
              }

              return (
                <motion.div
                  key={item.id}
                  onMouseEnter={isCenter ? () => setIsHovered(true) : undefined}
                  onMouseMove={isCenter ? handlePhoneMouseMove : undefined}
                  onMouseLeave={isCenter ? handlePhoneMouseLeave : undefined}
                  initial={{ opacity: 0, x: 0, scale: 0.6 }}
                  whileInView={{
                    opacity: opacity,
                    x: baseX,
                    scale: baseScale,
                  }}
                  viewport={{ once: true, amount: 0.2 }}
                  animate={{
                    x: baseX,
                    rotateX: rotateX,
                    rotateY: rotateY,
                    rotateZ: rotateZ,
                    scale: baseScale,
                    opacity: opacity,
                    zIndex: zIndex,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 280,
                    damping: 22,
                    mass: 0.6,
                    delay: Math.abs(offset) * 0.12,
                  }}
                  className={`absolute w-[240px] sm:w-[275px] h-[500px] sm:h-[570px] rounded-[36px] overflow-hidden shadow-2xl border-4 border-slate-900/90 bg-slate-950 ${
                    isCenter
                      ? 'shadow-emerald-950/40 ring-4 ring-emerald-500/60 shadow-2xl pointer-events-auto cursor-pointer'
                      : 'shadow-lg border-slate-800 pointer-events-none'
                  }`}
                  style={{
                    transformStyle: 'preserve-3d',
                    boxShadow: isCenter && (hoverAngle.rotateX !== 0 || hoverAngle.rotateY !== 0)
                      ? `${-hoverAngle.rotateY * 0.8}px ${hoverAngle.rotateX * 0.8 + 20}px 40px rgba(6, 78, 59, 0.35)`
                      : undefined
                  }}
                >
                  {/* Phone Speaker / Dynamic Island Top Bar */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3.5 bg-black rounded-full z-30 pointer-events-none opacity-80 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-slate-900 rounded-full mr-1"></div>
                  </div>

                  {/* Background Image */}
                  <div className="relative w-full h-full bg-slate-950">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-contain rounded-[32px] transition-transform duration-700 pointer-events-none select-none"
                    />

                    {/* Dim layer for side cards */}
                    {!isCenter && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* ACTIVE FEATURE TITLE & DESCRIPTION */}
        <div className="max-w-2xl mx-auto text-center min-h-[110px] flex items-center justify-center px-4 pt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentItem.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-950 tracking-tight uppercase">
                {currentItem.title}
              </h3>

              <p className="text-xs sm:text-sm text-emerald-800/80 font-medium max-w-xl mx-auto leading-relaxed">
                {currentItem.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Pagination Dots */}
        <div className="flex items-center justify-center gap-2.5 pt-6">
          {featureItems.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                activeIndex === i
                  ? 'w-9 bg-emerald-600 shadow-md shadow-emerald-600/40'
                  : 'w-2.5 bg-emerald-200 hover:bg-emerald-400'
              }`}
              aria-label={`Chuyển tới slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
