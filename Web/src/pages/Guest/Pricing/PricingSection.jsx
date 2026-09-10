import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, Star, Zap } from 'lucide-react';
import { pricingPlans } from '../../../data';

export const PricingSection = () => {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'

  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-white via-emerald-50/20 to-emerald-50/50 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-200/30 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-950 tracking-tight"
          >
            Chọn Gói Đồng Hành <br />
            <span className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700 bg-clip-text text-transparent">
              Hoàn Hảo Cho Gia Đình Bạn
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg text-emerald-900/70 font-medium"
          >
            Tiết kiệm hàng triệu đồng mỗi năm nhờ giảm thiểu 100% thức ăn bị hỏng lãng phí trong tủ lạnh.
          </motion.p>

          {/* Interactive Toggle Monthly / Yearly */}
          <div className="pt-6 flex items-center justify-center">
            <div className="bg-emerald-100/90 p-1.5 rounded-full flex items-center gap-1 border border-emerald-200 shadow-inner">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-emerald-950 shadow-md scale-105'
                    : 'text-emerald-800 hover:text-emerald-950'
                }`}
              >
                Theo Tháng
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                  billingCycle === 'yearly'
                    ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md scale-105'
                    : 'text-emerald-800 hover:text-emerald-950'
                }`}
              >
                <span>Theo Năm</span>
                <span className="bg-amber-300 text-amber-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase shadow-xs">
                  Tiết kiệm 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {pricingPlans.map((plan, index) => {
            const isPro = plan.isPopular;
            const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 140, scale: 0.88 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                  type: 'spring',
                  stiffness: 240,
                  damping: 16,
                  mass: 0.9,
                  delay: index * 0.22,
                }}
                whileHover={{ y: isPro ? -12 : -8, scale: 1.02 }}
                className={`rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden transition-all ${
                  isPro
                    ? 'bg-white border-2 border-emerald-500 shadow-2xl shadow-emerald-500/20 transform lg:-translate-y-3 z-10'
                    : 'bg-white border border-emerald-100/90 shadow-md hover:shadow-2xl'
                }`}
              >
                {/* Popular Badge */}
                {isPro && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 uppercase tracking-wide">
                    <Star className="w-3.5 h-3.5 fill-current animate-spin-slow" />
                    {plan.popularText || 'Được yêu thích nhất'}
                  </div>
                )}

                <div>
                  <div className={`flex items-center justify-between mb-4 ${isPro ? 'pt-2' : ''}`}>
                    <h3 className="text-2xl font-bold text-emerald-950 flex items-center gap-2">
                      {plan.name} {isPro && <Zap className="w-5 h-5 text-amber-500 fill-current" />}
                    </h3>
                    <span
                      className={`text-xs font-black px-3.5 py-1 rounded-full uppercase ${
                        isPro ? 'bg-emerald-500 text-white shadow-xs' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {plan.tag}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900/65 font-medium mb-6">
                    {plan.description}
                  </p>
                  <div className="mb-6 flex items-baseline gap-1">
                    <span className="text-5xl font-black text-emerald-950">{price}</span>
                    <span className="text-sm font-medium text-emerald-800/70"> {plan.period}</span>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm text-emerald-950 font-medium">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isPro
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'bg-emerald-100 text-emerald-600'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm transition-all ${
                    isPro
                      ? 'py-4 bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02]'
                      : 'border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {plan.ctaText}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;


