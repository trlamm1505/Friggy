import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { AddEditPackageModal } from './AddEditPackageModal';
import { PackageCard } from '../../../components/common/PackageCard';
import { getAdminPlansApi, updateAdminPlanApi } from '../../../services/adminService';
import { showToast } from '../../../components/common/Toast';

export const PackageManagement = (props) => {
  const context = useOutletContext() || {};
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPackage, setEditingPackage] = useState(null);

  // Format plan DB record into UI package object
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

  // Fetch list of subscription plans from GET /api/v1/admin/plans
  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await getAdminPlansApi();
      const plansList = res.data || res;
      if (Array.isArray(plansList)) {
        const formatted = plansList.map(formatPlanData);
        setPackages(formatted);
        if (context.setPackages) context.setPackages(formatted);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách gói cước:', err);
      // Fallback to prop/context packages if API is unreachable
      const fallbackPkgs = props.packages || context.packages || [];
      setPackages(fallbackPkgs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Save / Update Plan handler (calls PATCH /api/v1/admin/plans/:id)
  const handleSavePackage = async (savedPkg) => {
    try {
      const targetId = savedPkg.backendId || savedPkg.id;
      if (targetId) {
        const payload = {
          displayName: savedPkg.displayName || savedPkg.name,
          priceVnd: Number(savedPkg.priceVnd),
          features: savedPkg.features || [],
          isActive: savedPkg.isActive ?? true,
        };

        if (savedPkg.aiUsagePerWeek !== undefined) {
          payload.aiUsagePerWeek = Number(savedPkg.aiUsagePerWeek);
        }

        await updateAdminPlanApi(Number(targetId), payload);
        showToast.success(`Cập nhật gói "${savedPkg.displayName || savedPkg.name}" thành công!`);
        await fetchPlans();
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật gói cước:', err);
      const errMsg = err.message || 'Cập nhật gói cước thất bại!';
      showToast.error(errMsg);
    } finally {
      setEditingPackage(null);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate__animated animate__fadeIn animate__faster">
      {/* Action Banner */}
      <div className="p-6 sm:p-8 rounded-[32px] bg-white border border-emerald-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight flex items-center gap-2">
            <span>Danh Sách Gói Cước Dịch Vụ</span>
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </h3>
          <p className="text-xs sm:text-sm text-emerald-900/65 font-medium mt-1">
            Quản lý bảng giá, các tính năng đặc quyền và trạng thái hiển thị của từng gói dịch vụ.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={fetchPlans}
            title="Tải lại danh sách"
            className="p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border border-emerald-200/60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 text-emerald-700">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xs font-bold">Đang tải danh sách gói cước từ hệ thống...</span>
        </div>
      ) : (
        /* Package Grid - 3 Columns matching Guest layout */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {packages.map((pkg, idx) => (
            <PackageCard
              key={pkg.id || idx}
              plan={pkg}
              mode="admin"
              index={idx}
              onEdit={(packageToEdit) => setEditingPackage(packageToEdit)}
            />
          ))}
        </div>
      )}

      {/* Edit Package Modal */}
      {editingPackage && (
        <AddEditPackageModal
          packageItem={editingPackage}
          onClose={() => setEditingPackage(null)}
          onSave={handleSavePackage}
        />
      )}
    </div>
  );
};

export default PackageManagement;


