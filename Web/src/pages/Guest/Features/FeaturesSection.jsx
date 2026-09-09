import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { featureItems } from '../../../data';

export const FeaturesSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);


  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + featureItems.length) % featureItems.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % featureItems.length);
  };

  const currentItem = featureItems[activeIndex];

  return (
    <section id="features" className="py-20 bg-gradient-to-b from-white via-emerald-50/40 to-emerald-100/30 relative overflow-hidden select-none">
      {/* Immersive background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-200/30 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 space-y-3">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 bg-emerald-100/90 text-emerald-800 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-xs border border-emerald-200"
          >
            <Zap className="w-4 h-4 text-emerald-600 animate-bounce" />
            Tính năng nổi bật ứng dụng
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-950 tracking-tight"
          >
            Trải Nghiệm Căn Bếp <br />
            <span className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700 bg-clip-text text-transparent">
              Thông Minh Nhất Gia Đình
            </span>
          </motion.h2>
        </div>

        {/* 3D CAROUSEL SHOWCASE */}
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

          {/* 3D Phone Cards Showcase Container */}
          <div className="relative w-full max-w-6xl h-[500px] sm:h-[570px] flex items-center justify-center perspective-[1200px]">
            {featureItems.map((item, idx) => {
              const count = featureItems.length;
              let offset = (idx - activeIndex + count) % count;
              if (offset > count / 2) offset -= count;

              const isCenter = offset === 0;
              const isVisible = Math.abs(offset) <= 2;

              if (!isVisible) return null;

              const translateX = offset * 270;
              const rotateY = offset * -15;
              const scale = isCenter ? 1.05 : 1 - Math.abs(offset) * 0.16;
              const zIndex = 30 - Math.abs(offset) * 10;
              const opacity = isCenter ? 1 : 1 - Math.abs(offset) * 0.4;

              return (
                <motion.div
                  key={item.id}
                  animate={{
                    x: translateX,
                    rotateY: rotateY,
                    scale: scale,
                    opacity: opacity,
                    zIndex: zIndex,
                  }}
                  transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
                  className={`absolute w-[240px] sm:w-[275px] h-[500px] sm:h-[570px] rounded-[36px] overflow-hidden shadow-2xl border-4 border-slate-900/90 bg-slate-950 ${
                    isCenter
                      ? 'shadow-emerald-950/30 ring-4 ring-emerald-500/60'
                      : 'shadow-lg border-slate-800'
                  }`}
                  style={{
                    transformStyle: 'preserve-3d',
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
          </div>
        </div>

        {/* ACTIVE FEATURE TITLE & DESCRIPTION (Positioned below phone showcase - 100% clear phone screenshots) */}
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
              <div>
                <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-3.5 py-1 rounded-full uppercase tracking-wider border border-emerald-200 shadow-xs">
                  {currentItem.tag}
                </span>
              </div>

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
