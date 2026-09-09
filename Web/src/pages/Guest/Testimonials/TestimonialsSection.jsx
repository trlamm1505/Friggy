import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Star,
  Quote,
  Sparkles,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  RotateCw,
} from 'lucide-react';
import { testimonialsData } from '../../../data';

export const TestimonialsSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(null);
  const [direction, setDirection] = useState('next');

  const reviews = testimonialsData;
  const count = reviews.length;

  const handleNext = useCallback(() => {
    setPrevIndex(activeIndex);
    setDirection('next');
    setActiveIndex((prev) => (prev + 1) % count);
  }, [activeIndex, count]);

  const handlePrev = useCallback(() => {
    setPrevIndex(activeIndex);
    setDirection('prev');
    setActiveIndex((prev) => (prev - 1 + count) % count);
  }, [activeIndex, count]);

  const handleSelectCard = (idx) => {
    if (idx === activeIndex) return;
    setPrevIndex(activeIndex);
    setDirection(idx > activeIndex ? 'next' : 'prev');
    setActiveIndex(idx);
  };

  // Reset prevIndex state after transition completes to settle card positions
  useEffect(() => {
    if (prevIndex === null) return;
    const timer = setTimeout(() => {
      setPrevIndex(null);
    }, 600);
    return () => clearTimeout(timer);
  }, [prevIndex]);

  return (
    <section id="reviews" className="py-20 lg:py-28 bg-gradient-to-b from-white via-emerald-50/30 to-emerald-100/40 relative overflow-hidden select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/3 left-10 w-[550px] h-[550px] bg-emerald-200/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[650px] h-[650px] bg-teal-200/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          {/* ================= LEFT COLUMN: TEXT CONTENT ================= */}
          <div className="lg:col-span-5 space-y-6 text-left">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 bg-emerald-100/90 text-emerald-800 text-xs font-extrabold px-4 py-2 rounded-full uppercase tracking-wider shadow-xs border border-emerald-200/80">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
              Trải nghiệm thực tế từ người dùng
            </div>

            {/* Main Headline */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-950 tracking-tight leading-[1.15]">
              Hàng Ngàn Gia Đình Đã Thay Đổi <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700 bg-clip-text text-transparent">
                Thói Quen Ăn Uống Cùng Friggy
              </span>
            </h2>

            {/* Description */}
            <p className="text-base sm:text-lg text-emerald-900/75 font-medium leading-relaxed">
              Những phản hồi chân thật từ các bà nội trợ, nhân viên công sở và gia đình trẻ tại Việt Nam sau khi trải nghiệm trợ lý tủ lạnh thông minh.
            </p>

            {/* Navigation buttons & indicator */}
            <div className="pt-2 flex items-center gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrev}
                  className="w-12 h-12 rounded-2xl bg-white shadow-md border border-emerald-200 text-emerald-800 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-105 cursor-pointer active:scale-95 group"
                  aria-label="Previous Review"
                >
                  <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={handleNext}
                  className="w-12 h-12 rounded-2xl bg-white shadow-md border border-emerald-200 text-emerald-800 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-105 cursor-pointer active:scale-95 group"
                  aria-label="Next Review"
                >
                  <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Counter Indicator */}
              <div className="flex items-center gap-3 pl-2 border-l border-emerald-200/80">
                <span className="text-sm font-bold text-emerald-900/60 font-mono">
                  <span className="text-emerald-700 font-extrabold text-base">
                    {String(activeIndex + 1).padStart(2, '0')}
                  </span>
                  {' / '}
                  {String(count).padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: ANIMATED CARD DECK SHOWCASE ================= */}
          <div className="lg:col-span-7 relative flex items-center justify-center min-h-[500px] sm:min-h-[560px]">
            <div className="relative w-full max-w-xl h-[480px] sm:h-[520px] flex items-center justify-center perspective-[1200px] -translate-x-4 -translate-y-4">
              {reviews.map((item, idx) => {
                const offset = (idx - activeIndex + count) % count;
                const isCenter = offset === 0;
                const isPrevActive = idx === prevIndex;

                // Show 3 stacked cards, plus outgoing card during transition
                const isVisible = offset <= 2 || isPrevActive;
                if (!isVisible) return null;

                const stackPositions = [
                  { x: -30, y: -20, rotate: 0, scale: 1, zIndex: 40, opacity: 1 },
                  { x: 130, y: -50, rotate: 7, scale: 0.88, zIndex: 20, opacity: 0.88 },
                  { x: 80, y: 100, rotate: -5, scale: 0.92, zIndex: 30, opacity: 0.95 },
                ];

                let animateProps;
                let transitionProps;

                if (isCenter) {
                  // INCOMING FRONT CARD: Swoops in, twirls ("xoay xoay") and lands gracefully on top!
                  const isNext = direction === 'next';
                  animateProps = {
                    x: isNext ? [130, -55, -30] : [80, -55, -30],
                    y: isNext ? [-50, -35, -20] : [100, -35, -20],
                    rotate: isNext ? [7, -14, 0] : [-5, 14, 0],
                    scale: [0.88, 1.06, 1],
                    opacity: [0.7, 1, 1],
                    zIndex: 40,
                  };
                  transitionProps = {
                    duration: 0.58,
                    times: [0, 0.48, 1],
                    ease: ['easeOut', 'easeInOut'],
                  };
                } else if (isPrevActive) {
                  // OUTGOING CARD: Flies OUT to the side, then glides BACK into the bottom/rear stack position!
                  const isNext = direction === 'next';
                  const targetX = isNext ? 80 : 130;
                  const targetY = isNext ? 100 : -50;
                  const targetRotate = isNext ? -5 : 7;
                  const targetScale = isNext ? 0.92 : 0.88;
                  const targetZIndex = isNext ? 30 : 20;

                  animateProps = {
                    x: isNext ? [-30, 250, targetX] : [-30, -250, targetX],
                    y: [-20, -35, targetY],
                    rotate: isNext ? [0, 18, targetRotate] : [0, -18, targetRotate],
                    scale: [1, 1.04, targetScale],
                    opacity: [1, 0.85, isNext ? 0.95 : 0.88],
                    zIndex: [39, 12, targetZIndex],
                  };
                  transitionProps = {
                    duration: 0.58,
                    times: [0, 0.48, 1],
                    ease: ['easeOut', 'easeInOut'],
                  };
                } else {
                  // THIRD STACKED CARD: Smooth spring slide to position
                  const pos = stackPositions[offset];
                  animateProps = {
                    x: pos.x,
                    y: pos.y,
                    rotate: pos.rotate,
                    scale: pos.scale,
                    opacity: pos.opacity,
                    zIndex: pos.zIndex,
                  };
                  transitionProps = {
                    type: 'spring',
                    stiffness: 260,
                    damping: 24,
                    mass: 0.8,
                  };
                }

                return (
                  <motion.div
                    key={item.id}
                    onClick={() => handleSelectCard(idx)}
                    drag={isCenter ? 'x' : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.15}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -60) {
                        handleNext();
                      } else if (info.offset.x > 60) {
                        handlePrev();
                      }
                    }}
                    initial={false}
                    animate={animateProps}
                    transition={transitionProps}
                    className={`absolute w-full max-w-[360px] sm:max-w-[480px] lg:max-w-[520px] min-h-[320px] sm:min-h-[350px] p-7 sm:p-8 rounded-3xl cursor-pointer transition-colors duration-300 flex flex-col justify-between overflow-hidden group select-none ${isCenter
                      ? 'bg-gradient-to-br from-emerald-50/95 via-white to-emerald-100/90 border-2 border-emerald-500 shadow-2xl shadow-emerald-700/25 ring-4 ring-emerald-500/20'
                      : 'bg-white/95 border border-emerald-200/90 shadow-xl hover:border-emerald-400 backdrop-blur-xs'
                      }`}
                  >
                    {/* Background Quote Icon */}
                    <Quote className={`absolute top-6 right-8 w-16 h-16 transition-all duration-300 pointer-events-none ${isCenter ? 'text-emerald-400/30 rotate-12 scale-110' : 'text-emerald-200/30'
                      }`} />

                    <div>
                      {/* Top Bar: Rating Stars + Tag */}
                      <div className="flex items-center justify-between mb-5 pr-6 relative z-10 pointer-events-none">
                        <div className="flex items-center gap-1">
                          {[...Array(item.stars)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-5 h-5 fill-amber-400 text-amber-400 ${isCenter ? 'animate-pulse' : ''
                                }`}
                            />
                          ))}
                        </div>
                        <span
                          className={`text-xs font-extrabold px-3.5 py-1.5 rounded-full uppercase transition-all duration-300 ${isCenter
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                        >
                          {item.tag}
                        </span>
                      </div>

                      {/* Review Content */}
                      <p className={`text-base sm:text-lg leading-relaxed font-medium mb-6 relative z-10 italic pointer-events-none ${isCenter ? 'text-emerald-950 font-semibold line-clamp-5' : 'text-emerald-900/80 line-clamp-4'
                        }`}>
                        "{item.content}"
                      </p>
                    </div>

                    {/* Author Info Footer */}
                    <div className="flex items-center justify-between pt-5 border-t border-emerald-200/60 mt-auto relative z-10 pointer-events-none">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${item.bgGradient} text-white font-black text-base flex items-center justify-center shadow-md transition-transform group-hover:scale-105`}
                        >
                          {item.initials}
                        </div>
                        <div>
                          <div className="text-base font-extrabold text-emerald-950 flex items-center gap-1.5">
                            <span>{item.author}</span>
                            {item.verified && (
                              <CheckCircle className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                            )}
                          </div>
                          <div className="text-xs sm:text-sm font-semibold text-emerald-700/80">
                            {item.role}
                          </div>
                        </div>
                      </div>

                      {/* Drag hint icon on center card */}
                      {isCenter && (
                        <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-emerald-600/70 bg-emerald-100/60 px-2.5 py-1 rounded-lg">
                          <RotateCw className="w-3 h-3 animate-spin text-emerald-600" style={{ animationDuration: '4s' }} />
                          <span>Vuốt để chuyển</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Bottom Pagination Dots */}
        <div className="flex items-center justify-center gap-2.5 pt-12">
          {reviews.map((_, i) => (
            <button
              key={i}
              onClick={() => handleSelectCard(i)}
              className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${activeIndex === i
                ? 'w-10 bg-emerald-600 shadow-md shadow-emerald-600/40'
                : 'w-2.5 bg-emerald-200 hover:bg-emerald-400'
                }`}
              aria-label={`Chuyển tới đánh giá ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

