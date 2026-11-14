import React, { useState, useEffect } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import {
  Sparkles,
  RefreshCw,
  Loader2,
  Info,
  Eye,
  Edit2,
  User,
  Store,
  Plus,
  Check,
  Package,
} from 'lucide-react';
import { AddEditPackageModal } from './AddEditPackageModal';
import { PackageDetailModal } from './PackageDetailModal';
import { AddEditSupplierPackageModal } from './AddEditSupplierPackageModal';
import { PackageCard } from '../../common/PackageCard';
import { getAdminPlansApi, updateAdminPlanApi } from '../../../services/adminService';
import {
  getAdminSupplierPlansApi,
  createAdminSupplierPlanApi,
  updateAdminSupplierPlanApi,
} from '../../../services/supplierService';
import { showToast } from '../../common/Toast';

export const PackageManagement = (props) => {
  const location = useLocation();
  const role = props.role || (location.pathname.startsWith('/manager') ? 'manager' : 'admin');
  const isAdmin = role === 'admin';

  const context = useOutletContext() || {};

  // Tab: 'user' | 'supplier'
  const [packageType, setPackageType] = useState('user');

  // ─────────────────────────────────────────────────────────────
  // 1. USER PACKAGES STATE & LOGIC
  // ─────────────────────────────────────────────────────────────
  const [userPackages, setUserPackages] = useState([]);
  const [userLoading, setUserLoading] = useState(true);
  const [editingUserPackage, setEditingUserPackage] = useState(null);
  const [selectedUserPackage, setSelectedUserPackage] = useState(null);

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
      badgeText:
        codeName === 'free'
          ? 'MIỄN PHÍ'
          : codeName === 'family'
          ? 'GIA ĐÌNH'
          : isPopular
          ? 'KHUYÊN DÙNG'
          : null,
      topLabel: isPopular ? 'Được yêu thích nhất cho gia đình' : null,
      color: isPopular ? 'green' : 'emerald',
      description:
        codeName === 'free'
          ? 'Trải nghiệm theo dõi thực phẩm cá nhân đơn giản.'
          : codeName === 'pro'
          ? 'Tối ưu hoàn hảo cho gia đình nhỏ, mở khóa trọn bộ tính năng AI thông minh.'
          : 'Dành cho gia đình nhiều thế hệ hoặc nhà đông người cần quản lý chung.',
      features: parsedFeatures,
      status: plan.isActive ? 'Active' : 'Inactive',
      isActive: plan.isActive ?? true,
    };
  };

  const fetchUserPlans = async () => {
    setUserLoading(true);
    try {
      const res = await getAdminPlansApi();
      const plansList = res.data || res;
      if (Array.isArray(plansList)) {
        const formatted = plansList.map(formatPlanData);
        setUserPackages(formatted);
        if (context.setPackages) context.setPackages(formatted);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách gói cước User:', err);
      const fallbackPkgs = props.packages || context.packages || [];
      setUserPackages(fallbackPkgs);
    } finally {
      setUserLoading(false);
    }
  };

  const handleSaveUserPackage = async (savedPkg) => {
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
        await fetchUserPlans();
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật gói cước user:', err);
      showToast.error(err.message || 'Cập nhật gói cước thất bại!');
    } finally {
      setEditingUserPackage(null);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 2. SUPPLIER PACKAGES STATE & LOGIC
  // ─────────────────────────────────────────────────────────────
  const [supplierPlans, setSupplierPlans] = useState([]);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplierPlan, setEditingSupplierPlan] = useState(null);
  const [supplierSubmitting, setSupplierSubmitting] = useState(false);

  const fetchSupplierPlans = async () => {
    setSupplierLoading(true);
    try {
      const res = await getAdminSupplierPlansApi();
      const list = res?.data || res || [];
      setSupplierPlans(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách gói cước Supplier:', err);
      showToast.error(err.message || 'Không thể tải danh sách gói cước đối tác');
    } finally {
      setSupplierLoading(false);
    }
  };

  useEffect(() => {
    if (packageType === 'user') {
      fetchUserPlans();
    } else {
      fetchSupplierPlans();
    }
  }, [packageType]);

  const handleOpenAddSupplierPlan = () => {
    setEditingSupplierPlan(null);
    setSupplierModalOpen(true);
  };

  const handleOpenEditSupplierPlan = (plan) => {
    setEditingSupplierPlan(plan);
    setSupplierModalOpen(true);
  };

  const handleSaveSupplierPlan = async (payload) => {
    setSupplierSubmitting(true);
    try {
      if (editingSupplierPlan) {
        // Update
        await updateAdminSupplierPlanApi(editingSupplierPlan.id, payload);
        showToast.success('Cập nhật gói cước đối tác thành công!');
      } else {
        // Create
        await createAdminSupplierPlanApi(payload);
        showToast.success('Tạo gói cước đối tác mới thành công!');
      }
      setSupplierModalOpen(false);
      fetchSupplierPlans();
    } catch (err) {
      console.error('Lỗi khi lưu gói cước NCC:', err);
      showToast.error(err.message || 'Lỗi khi lưu gói cước đối tác');
    } finally {
      setSupplierSubmitting(false);
    }
  };

  const handleToggleSupplierPlanActive = async (plan) => {
    const nextStatus = !plan.isActive;
    try {
      await updateAdminSupplierPlanApi(plan.id, { isActive: nextStatus });
      showToast.success(`Đã ${nextStatus ? 'kích hoạt' : 'vô hiệu hóa'} gói "${plan.displayName}"`);
      fetchSupplierPlans();
    } catch (err) {
      showToast.error(err.message || 'Không thể đổi trạng thái gói cước');
    }
  };

  const handleRefresh = () => {
    if (packageType === 'user') {
      fetchUserPlans();
    } else {
      fetchSupplierPlans();
    }
  };

  const formatVnd = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  const isCurrentLoading = packageType === 'user' ? userLoading : supplierLoading;

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 animate__animated animate__fadeIn animate__faster">
      {/* ── Top Header Toolbar ─────────────────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-[32px] bg-white border border-emerald-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Package className="w-7 h-7 text-emerald-600" />
            <span>Quản Lý Cấu Hình Gói Cước & Dịch Vụ</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Cấu hình bảng giá, tính năng và quyền lợi dành cho Người Dùng và Đối Tác Nhà Cung Cấp.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {packageType === 'supplier' && isAdmin && (
            <button
              onClick={handleOpenAddSupplierPlan}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Gói NCC Mới</span>
            </button>
          )}

          <button
            onClick={handleRefresh}
            className="p-3.5 sm:px-5 sm:py-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer border border-emerald-200/60"
          >
            <RefreshCw className={`w-4 h-4 ${isCurrentLoading ? 'animate-spin' : ''}`} />
            <span>Làm Mới</span>
          </button>
        </div>
      </div>

      {/* ── High-Level Segmented Option Switcher ──────────────────────── */}
      <div className="bg-white p-2 sm:p-2.5 rounded-3xl border border-emerald-100 shadow-xs flex items-center gap-2">
        <button
          onClick={() => setPackageType('user')}
          className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
            packageType === 'user'
              ? 'bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
              : 'text-slate-600 hover:bg-emerald-50/70 hover:text-emerald-950'
          }`}
        >
          <User className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Gói Dịch Vụ Người Dùng</span>
          {userPackages.length > 0 && (
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                packageType === 'user'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {userPackages.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setPackageType('supplier')}
          className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
            packageType === 'supplier'
              ? 'bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
              : 'text-slate-600 hover:bg-emerald-50/70 hover:text-emerald-950'
          }`}
        >
          <Store className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Gói Dịch Vụ Nhà Cung Cấp</span>
          {supplierPlans.length > 0 && (
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                packageType === 'supplier'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {supplierPlans.length}
            </span>
          )}
        </button>
      </div>

      {/* Info notice for Manager */}
      {!isAdmin && (
        <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 flex items-start gap-3">
          <Info className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
          <div className="text-xs text-teal-900 font-medium leading-relaxed">
            <strong>Phân quyền quản lý:</strong> Dữ liệu gói cước dưới đây được đồng bộ trực tiếp từ hệ thống. Quyền chỉnh sửa giá, số lượng tài nguyên và kích hoạt gói thuộc về Super Admin để bảo đảm an toàn kinh doanh.
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 1: USER PACKAGES                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {packageType === 'user' && (
        <div className="space-y-6 animate__animated animate__fadeIn">
          {userLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-emerald-700">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-xs font-bold">Đang tải danh sách gói cước người dùng...</span>
            </div>
          ) : userPackages.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-semibold text-sm">
              Chưa có gói cước người dùng nào được kích hoạt.
            </div>
          ) : isAdmin ? (
            /* Admin Package Grid with Edit Card */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
              {userPackages.map((pkg, idx) => (
                <PackageCard
                  key={pkg.id || idx}
                  plan={pkg}
                  mode="admin"
                  index={idx}
                  onEdit={(packageToEdit) => setEditingUserPackage(packageToEdit)}
                />
              ))}
            </div>
          ) : (
            /* Manager Package Grid with Detail View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userPackages.map((pkg) => (
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
                      onClick={() => setSelectedUserPackage(pkg)}
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
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 2: SUPPLIER PACKAGES                                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {packageType === 'supplier' && (
        <div className="space-y-6 animate__animated animate__fadeIn">
          {supplierLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-emerald-700">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-xs font-bold">Đang tải danh sách gói cước đối tác NCC...</span>
            </div>
          ) : supplierPlans.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-semibold text-sm space-y-2">
              <Store className="w-10 h-10 text-slate-300 mx-auto" />
              <p>Chưa có gói cước nhà cung cấp nào trên hệ thống.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {supplierPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`bg-white rounded-[32px] border p-6 sm:p-7 flex flex-col justify-between shadow-xs transition-all relative ${
                    plan.isActive
                      ? 'border-emerald-100 hover:shadow-lg'
                      : 'border-slate-200 opacity-60 bg-slate-50'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-black uppercase tracking-wider px-3 py-1 rounded-xl bg-slate-100 text-slate-700">
                        Slug: {plan.name}
                      </span>
                      {isAdmin ? (
                        <button
                          onClick={() => handleToggleSupplierPlanActive(plan)}
                          className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                            plan.isActive
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          {plan.isActive ? 'Đang kích hoạt' : 'Tạm ẩn'}
                        </button>
                      ) : (
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            plan.isActive
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {plan.isActive ? 'Đang kích hoạt' : 'Tạm ẩn'}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-slate-900">{plan.displayName}</h3>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-3xl font-black text-emerald-700">
                          {formatVnd(plan.priceVnd)}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">
                          / {plan.billingCycle === 'yearly' ? 'năm' : 'tháng'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-xs text-slate-700">
                      Giới hạn:{' '}
                      <strong className="text-emerald-800 font-extrabold">
                        {plan.maxIngredients}
                      </strong>{' '}
                      nguyên liệu trên hệ thống
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Quyền lợi gói cước
                      </p>
                      <ul className="space-y-2 text-xs font-semibold text-slate-700">
                        {Array.isArray(plan.features) &&
                          plan.features.map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span className="leading-relaxed">{feat}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end">
                      <button
                        onClick={() => handleOpenEditSupplierPlan(plan)}
                        className="w-full py-2.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Chỉnh Sửa Gói Cước</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODALS                                                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {/* Edit User Package Modal (Admin) */}
      {editingUserPackage && (
        <AddEditPackageModal
          packageItem={editingUserPackage}
          onClose={() => setEditingUserPackage(null)}
          onSave={handleSaveUserPackage}
        />
      )}

      {/* User Package Detail Modal (Manager) */}
      {selectedUserPackage && (
        <PackageDetailModal
          isOpen={Boolean(selectedUserPackage)}
          onClose={() => setSelectedUserPackage(null)}
          pkg={selectedUserPackage}
        />
      )}

      {/* Create / Edit Supplier Package Modal (Admin) */}
      {supplierModalOpen && isAdmin && (
        <AddEditSupplierPackageModal
          packageItem={editingSupplierPlan}
          onClose={() => setSupplierModalOpen(false)}
          onSave={handleSaveSupplierPlan}
          isSubmitting={supplierSubmitting}
        />
      )}
    </div>
  );
};

export default PackageManagement;
