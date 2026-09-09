import React from 'react';
import { Tv, Award, Heart, Utensils } from 'lucide-react';

export const TrustPartnersSection = () => {
  const partners = [
    {
      name: 'VTV1 Đồng Hành',
      icon: Tv,
      color: 'text-red-500',
    },
    {
      name: 'Product Review',
      icon: Award,
      color: 'text-emerald-600',
    },
    {
      name: 'Yêu Bếp Community',
      icon: Heart,
      color: 'text-rose-500',
    },
    {
      name: 'Bếp Gia Đình',
      icon: Utensils,
      color: 'text-amber-500',
    },
  ];

  return (
    <section className="py-10 bg-white/70 border-y border-emerald-100/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-800/60 mb-6">
          ĐƯỢC ĐỒNG HÀNH VÀ ĐƯỢC ĐƯA TIN BỞI CÁC ĐƠN VỊ UY TÍN
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center justify-center">
          {partners.map((partner, index) => {
            const Icon = partner.icon;
            return (
              <div
                key={index}
                className="flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-emerald-50/50 hover:bg-emerald-100/40 border border-emerald-100/50 transition-colors group cursor-pointer"
              >
                <div className={`p-2 rounded-lg bg-white shadow-2xs group-hover:scale-110 transition-transform ${partner.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm sm:text-base font-bold text-emerald-950/80 group-hover:text-emerald-700 transition-colors">
                  {partner.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrustPartnersSection;
