import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PackageCard } from '../../../components/common/PackageCard';
import { showToast } from '../../../components/common/Toast';
import { getPublicPlansApi } from '../../../services/subscriptionService';

export const PricingSection = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const res = await getPublicPlansApi();
        const apiPlans = res?.data || res;
        if (Array.isArray(apiPlans)) {
          const mapped = apiPlans.map((p) => {
            const isPopular = p.name === 'individual' || p.name === 'pro';
            return {
              id: p.id,
              name: p.displayName || p.name,
              code: p.name,
              priceVnd: p.priceVnd,
              features: p.features || [],
              aiUsagePerWeek: p.aiUsagePerWeek,
              isPopular,
              tag: isPopular ? 'Khuyên Dùng' : p.priceVnd === 0 ? 'Miễn Phí' : 'Gia Đình',
              description:
                p.name === 'free'
                  ? 'Trải nghiệm theo dõi thực phẩm cá nhân đơn giản.'
                  : isPopular
                  ? 'Tối ưu hoàn hảo cho gia đình nhỏ, mở khóa trọn bộ tính năng AI thông minh.'
                  : 'Dành cho gia đình nhiều thế hệ hoặc nhà đông người cần quản lý chung.',
            };
          });
          setPlans(mapped);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách gói cước từ API:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

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
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          /* Pricing Cards Grid */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan, index) => (
              <PackageCard
                key={plan.id || index}
                plan={plan}
                mode="guest"
                index={index}
                onSelect={(selectedPlan) => {
                  showToast.info(`Bạn đã chọn đăng ký gói: ${selectedPlan.name}`);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PricingSection;
