import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { pricingPlans } from '../../../data';
import { PackageCard } from '../../../components/common/PackageCard';

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
            const currentPlan = {
              ...plan,
              price: billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly,
            };

            return (
              <PackageCard
                key={plan.id}
                plan={currentPlan}
                mode="guest"
                index={index}
                onSelect={(selectedPlan) => {
                  alert(`Bạn đã chọn đăng ký: ${selectedPlan.name}`);
                }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;


