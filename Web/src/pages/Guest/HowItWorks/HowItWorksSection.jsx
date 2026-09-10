import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { howItWorksSteps } from '../../../data';
import qrMascotImg from '../../../assets/images/QR.png';

export const HowItWorksSection = () => {
  const [activeStep, setActiveStep] = useState(1);

  const steps = howItWorksSteps;
  const currentStepData = steps.find((s) => s.id === activeStep) || steps[0];


  return (
    <section id="how-it-works" className="py-24 bg-gradient-to-b from-emerald-50/60 to-white relative overflow-hidden">
      {/* Background glowing shapes */}
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16 space-y-4"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-950 tracking-tight">
            Chỉ 3 Bước Đơn Giản Để <br />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">
              Tối Ưu Căn Bếp Của Bạn
            </span>
          </h2>

          <p className="text-base sm:text-lg text-emerald-900/70 font-medium">
            Friggy được thiết kế đơn giản, thân thiện với mọi lứa tuổi — bất kỳ ai cũng có thể làm chủ tủ lạnh trong 1 phút.
          </p>
        </motion.div>

        {/* Interactive Steps Grid & Live Interactive Preview Box */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Interactive Step Cards (7 cols) */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 space-y-4 relative"
          >
            {/* Connecting progress line */}
            <div className="hidden lg:block absolute left-8 top-10 bottom-10 w-1 bg-emerald-100 rounded-full -z-10">
              <motion.div
                className="w-full bg-gradient-to-b from-emerald-500 to-green-600 rounded-full"
                animate={{ height: `${(activeStep / 3) * 100}%` }}
                transition={{ duration: 0.4 }}
              ></motion.div>
            </div>

            {steps.map((item, idx) => {
              const IconComp = item.icon;
              const isActive = activeStep === item.id;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setActiveStep(item.id)}
                  className={`p-6 rounded-3xl cursor-pointer border transition-all duration-300 flex items-start gap-5 ${
                    isActive
                      ? 'bg-white border-2 border-emerald-500 shadow-xl shadow-emerald-500/10'
                      : 'bg-white/60 hover:bg-white border-emerald-100/80 shadow-xs'
                  }`}
                >
                  {/* Step Badge */}
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg flex-shrink-0 transition-transform duration-300 ${
                      isActive
                        ? 'bg-gradient-to-tr from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/30 scale-105'
                        : 'bg-emerald-100/70 text-emerald-800'
                    }`}
                  >
                    <IconComp className="w-6 h-6" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black uppercase text-emerald-600 tracking-wider">
                        Bước {item.stepNumber}
                      </span>
                      {isActive && (
                        <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> đang xem
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-emerald-950 mb-1">
                      {item.title}
                    </h3>
                    <p className="text-xs font-semibold text-emerald-700/80 mb-2">
                      {item.subtitle}
                    </p>
                    <p className="text-sm text-emerald-900/65 font-medium leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Right Column: Dynamic Live Preview Card (5 cols) */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative rounded-3xl bg-gradient-to-br from-emerald-100/90 via-emerald-50 to-white text-emerald-950 p-6 sm:p-8 pb-12 sm:pb-14 shadow-xl border border-emerald-200/80 overflow-hidden min-h-[460px] flex flex-col justify-between">
              {/* Radial gradient backdrop */}
              <div className="absolute top-0 right-0 -mr-10 -mt-10 w-64 h-64 bg-emerald-300/30 rounded-full blur-3xl"></div>

              {/* Floating Mascot Image - Peeking at bottom right corner */}
              <motion.img
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                src={qrMascotImg}
                alt="Friggy Mascot"
                className="absolute -bottom-8 -right-4 sm:-bottom-12 sm:-right-6 z-20 w-36 h-36 sm:w-44 sm:h-44 object-contain drop-shadow-xl pointer-events-none"
              />

              <div className="relative z-10 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  </div>
                  <span className="text-[11px] font-bold bg-emerald-200/80 text-emerald-900 px-3 py-1 rounded-full border border-emerald-300">
                    {currentStepData.previewBadge}
                  </span>
                </div>

                {/* Animated Body */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStepData.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3.5"
                  >
                    <div className="inline-block px-3 py-1 rounded-xl bg-emerald-600 text-xs font-bold text-white shadow-xs">
                      Demo Xem Trước Bước {currentStepData.stepNumber}
                    </div>

                    <h4 className="text-xl sm:text-2xl font-black text-emerald-950">
                      {currentStepData.previewTitle}
                    </h4>

                    <div className="space-y-2.5 pt-0.5 pr-10 sm:pr-14">
                      {currentStepData.previewDetails.map((detail, idx) => (
                        <div
                          key={idx}
                          className="bg-white/90 p-2.5 sm:p-3 rounded-2xl border border-emerald-200/80 text-xs sm:text-sm font-semibold text-emerald-950 flex items-center justify-between gap-3 shadow-xs"
                        >
                          <span>{detail}</span>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 sm:pt-4 pr-24 sm:pr-28 flex items-center justify-between text-[11px] sm:text-xs text-emerald-700 font-medium">
                      <span>Click các bước 01 - 03 bên trái để chuyển preview</span>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-600 animate-pulse flex-shrink-0" />
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
