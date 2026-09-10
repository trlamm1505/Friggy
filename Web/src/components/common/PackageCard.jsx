import React from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Zap, Edit, Trash2, Users } from 'lucide-react';

export const PackageCard = ({
  plan,
  mode = 'guest', // 'guest' | 'admin'
  onSelect,
  onEdit,
  onDelete,
  index = 0,
}) => {
  if (!plan) return null;

  const isPopular = plan.popular || plan.isPopular;
  const name = plan.name || 'Gói Dịch Vụ';
  const description = plan.description || '';
  const features = plan.features || [];
  
  // Format Price
  const rawPrice = plan.price !== undefined ? plan.price : (plan.priceMonthly || 0);
  const formattedPrice =
    typeof rawPrice === 'number'
      ? rawPrice === 0
        ? '0đ'
        : new Intl.NumberFormat('vi-VN').format(rawPrice) + 'đ'
      : rawPrice;

  const period = plan.billingCycle || plan.period || 'tháng';
  const badgeText = plan.badgeText || plan.tag || (isPopular ? 'Khuyên dùng' : null);
  const ctaText = plan.ctaText || (rawPrice === 0 ? 'Đăng ký miễn phí' : isPopular ? 'Dùng thử miễn phí 7 ngày' : 'Nâng cấp gói');

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: isPopular ? -8 : -4 }}
      className={`rounded-[32px] p-7 flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
        isPopular
          ? 'bg-white border-2 border-emerald-500 shadow-xl shadow-emerald-500/15 ring-4 ring-emerald-500/10'
          : 'bg-white border border-emerald-100 shadow-md hover:shadow-xl hover:border-emerald-200'
      }`}
    >
      {/* Top Banner Badge if popular */}
      {isPopular && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 text-white text-[10px] sm:text-[11px] font-black px-4 py-1 rounded-b-xl shadow-sm flex items-center gap-1.5 uppercase tracking-wider whitespace-nowrap z-10">
          <Star className="w-3 h-3 fill-current" />
          <span>{plan.topLabel || 'Được yêu thích nhất cho gia đình'}</span>
        </div>
      )}

      <div>
        {/* Header: Title & Tag */}
        <div className={`flex items-start justify-between gap-2 mb-3 ${isPopular ? 'pt-3' : ''}`}>
          <h3 className="text-xl sm:text-2xl font-black text-emerald-950 flex items-center gap-1.5 tracking-tight">
            <span>{name}</span>
            {isPopular && <Zap className="w-5 h-5 text-amber-500 fill-current flex-shrink-0" />}
          </h3>

          {badgeText && (
            <span
              className={`text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap ${
                isPopular
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {badgeText}
            </span>
          )}
        </div>

        {/* Short Description */}
        <p className="text-xs text-emerald-900/65 font-medium leading-relaxed mb-5 min-h-[36px]">
          {description}
        </p>

        {/* Price Tag */}
        <div className="mb-6 flex items-baseline gap-1.5">
          <span className="text-4xl sm:text-5xl font-black text-emerald-950 tracking-tight">
            {formattedPrice}
          </span>
          <span className="text-xs sm:text-sm font-bold text-emerald-800/70">
            /{period}
          </span>
        </div>

        {/* Admin extra stats if in Admin mode */}
        {mode === 'admin' && plan.subscribersCount !== undefined && (
          <div className="p-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/70 flex items-center justify-between text-xs mb-5">
            <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              Thành viên đăng ký:
            </span>
            <span className="font-extrabold text-emerald-700">
              {plan.subscribersCount.toLocaleString('vi-VN')} user
            </span>
          </div>
        )}

        {/* Features Checklist */}
        <div className="space-y-3.5 mb-8 border-t border-emerald-100/80 pt-5">
          {features.map((feat, idx) => (
            <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-emerald-950 font-semibold">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  isPopular
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer: Guest vs Admin Mode */}
      {mode === 'admin' ? (
        <div className="pt-4 border-t border-emerald-100/80 flex items-center gap-2">
          <button
            onClick={() => onEdit && onEdit(plan)}
            className="flex-1 py-3 px-4 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-emerald-200"
          >
            <Edit className="w-4 h-4 text-emerald-600" />
            <span>Sửa Gói</span>
          </button>
          <button
            onClick={() => onDelete && onDelete(plan.id)}
            className="p-3 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer border border-rose-200"
            title="Xóa gói"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => onSelect && onSelect(plan)}
          className={`w-full py-3.5 px-6 rounded-full font-extrabold text-xs sm:text-sm transition-all duration-200 cursor-pointer shadow-md ${
            isPopular
              ? 'bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02]'
              : 'bg-white border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-700'
          }`}
        >
          {ctaText}
        </button>
      )}
    </motion.div>
  );
};

export default PackageCard;
