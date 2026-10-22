import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Loader2, Package, Eye, Info } from 'lucide-react';
import { PackageDetailModal } from './PackageDetailModal';
import { PackageCard } from '../../../components/common/PackageCard';
import { getAdminPlansApi } from '../../../services/adminService';
import { showToast } from '../../../components/common/Toast';

export const PackageManagement = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);

  const formatPlanData = (plan) => {
    const codeName = (plan.name || '').toLowerCase();
    const isPopular = codeName === 'pro' || codeName.includes('pro');

    let parsedFeatures = [];
    if (Array.isArray(plan.features)) {
      parsedFeatures = plan.features;
    } else if (typeof plan.features === 'string') {
      try {
        parsedFeatures = JSON.parse(plan.features);
      } catch {
        parsedFeatures = [plan.features];
      }
    }

    return {
      id: plan.id,
      backendId: plan.id,
      name: plan.displayName || plan.name || 'Gói Dịch Vụ',
      displayName: plan.displayName || plan.name,
      code: plan.name ? plan.name.toUpperCase() : 'PLAN',
      price: plan.priceVnd !== undefined ? plan.priceVnd : 0,
      priceVnd: plan.priceVnd !== undefined ? plan.priceVnd : 0,
      aiUsagePerWeek: plan.aiUsagePerWeek !== undefined ? plan.aiUsagePerWeek : -1,
      billingCycle: 'tháng',
      popular: isPopular,
      badgeText: codeName === 'free' ? 'MIỄN PHÍ' : codeName === 'family' ? 'GIA ĐÌNH' : isPopular ? 'KHUYÊN DÙNG' : null,
      topLabel: isPopular ? 'Được yêu thích nhất cho gia đình' : null,
      color: isPopular ? 'green' : 'emerald',
      description: codeName === 'free'
        ? 'Trải nghiệm theo dõi thực phẩm cá nhân đơn giản.'
        : codeName === 'pro'
        ? 'Tối ưu hoàn hảo cho gia đình nhỏ, mở khóa trọn bộ tính năng AI thông minh.'
        : 'Dành cho gia đình nhiều thế hệ hoặc nhà đông người cần quản lý chung.',
      features: parsedFeatures,
      status: plan.isActive ? 'Active' : 'Inactive',
      isActive: plan.isActive ?? true,
    };
  };

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await getAdminPlansApi();
      const list = res?.data || res;
      if (Array.isArray(list) && list.length > 0) {
        setPackages(list.map(formatPlanData));
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách gói cước:', err);
      showToast.error('Không thể tải thông tin gói cước');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return (
    <div className="space-y-6 pb-12 animate__animated animate__fadeIn animate__faster">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-[32px] bg-white border border-emerald-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Thông Tin Các Gói Dịch Vụ Friggy</span>
            <Sparkles className="w-5 h-5 text-teal-600" />
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Tra cứu quyền lợi, tính năng và giá niêm yết các gói dịch vụ phục vụ tư vấn khách hàng.
          </p>
        </div>

        <button
          onClick={fetchPlans}
          className="px-5 py-2.5 rounded-2xl bg-teal-50 hover:bg-teal-100 text-teal-700 font-extrabold text-xs sm:text-sm border border-teal-200 transition-all cursor-pointer flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm Mới</span>
        </button>
      </div>

      {/* Info notice for Manager */}
      <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 flex items-start gap-3">
        <Info className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
        <div className="text-xs text-teal-900 font-medium leading-relaxed">
          <strong>Phân quyền quản lý:</strong> Dữ liệu gói cước dưới đây được đồng bộ trực tiếp từ hệ thống. Quyền chỉnh sửa giá, số lượt AI và kích hoạt gói thuộc về Super Admin để bảo đảm an toàn kinh doanh.
        </div>
      </div>

      {/* Packages Grid */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Đang tải danh sách gói cước...</p>
        </div>
      ) : packages.length === 0 ? (
        <div className="py-16 text-center text-slate-400 font-semibold text-sm">
          Chưa có gói cước nào được kích hoạt.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-[32px] p-6 sm:p-7 border border-emerald-100 shadow-2xs hover:shadow-lg transition-all flex flex-col justify-between relative group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-black">
                    {pkg.code}
                  </span>
                  {pkg.badgeText && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold uppercase">
                      {pkg.badgeText}
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-xl font-black text-slate-900">{pkg.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{pkg.description}</p>
                </div>

                <div className="pt-2">
                  <span className="text-3xl font-black text-teal-700">
                    {pkg.price > 0 ? `${Number(pkg.price).toLocaleString('vi-VN')} đ` : 'Miễn Phí'}
                  </span>
                  {pkg.price > 0 && <span className="text-xs font-bold text-slate-400 ml-1">/ tháng</span>}
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Tính năng nổi bật
                  </p>
                  <ul className="space-y-1.5 text-xs font-semibold text-slate-700">
                    {pkg.features?.slice(0, 4).map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"></span>
                        <span className="truncate">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-100">
                <button
                  onClick={() => setSelectedPackage(pkg)}
                  className="w-full py-3 rounded-2xl bg-teal-50 hover:bg-teal-600 hover:text-white text-teal-700 font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <Eye className="w-4 h-4" />
                  <span>Xem Chi Tiết Gói</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Package Detail Modal */}
      {selectedPackage && (
        <PackageDetailModal
          isOpen={Boolean(selectedPackage)}
          onClose={() => setSelectedPackage(null)}
          pkg={selectedPackage}
        />
      )}
    </div>
  );
};

export default PackageManagement;
