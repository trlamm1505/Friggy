import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Utensils,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  CreditCard,
  Package,
  Plus,
  ArrowRight,
  TrendingUp,
  FileText,
  Lock,
} from 'lucide-react';
import {
  getSupplierProfileApi,
  getSupplierSubscriptionApi,
  getSupplierIngredientsApi,
} from '../../../services/supplierService';
import { showToast } from '../../../components/common/Toast';

export const SupplierDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Profile
      try {
        const pRes = await getSupplierProfileApi();
        setProfile(pRes?.data || pRes);
      } catch (err) {
        if (err?.status === 404) setProfile(null);
      }

      // 2. Subscription
      try {
        const sRes = await getSupplierSubscriptionApi();
        setSubscription(sRes?.data || sRes);
      } catch (err) {
        setSubscription(null);
      }

      // 3. Ingredients
      try {
        const iRes = await getSupplierIngredientsApi({ page: 1, limit: 100 });
        const resBody = iRes?.data !== undefined ? iRes.data : iRes;
        const items = Array.isArray(resBody)
          ? resBody
          : Array.isArray(resBody?.data)
          ? resBody.data
          : Array.isArray(resBody?.items)
          ? resBody.items
          : [];
        setIngredients(items);

        const total = resBody?.total ?? resBody?.meta?.total ?? items.length;
        const pending = items.filter((x) => x.status === 'pending').length;
        const approved = items.filter((x) => x.status === 'approved').length;
        const rejected = items.filter((x) => x.status === 'rejected').length;

        setStats({ total, pending, approved, rejected });
      } catch (err) {
        // Có thể chưa active
      }
    } catch (e) {
      console.error(e);
      showToast.error(e.message || 'Lỗi khi tải dữ liệu tổng quan');
    } finally {
      setLoading(false);
    }
  };

  const formatVnd = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      {/* ── Approval Status Banner ─────────────────────────────────── */}
      {!loading && (
        <div>
          {!profile ? (
            <div className="p-5 rounded-3xl bg-blue-50 border border-blue-200 text-blue-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Chào mừng bạn đến với Cổng Nhà Cung Cấp Friggy!</h3>
                  <p className="text-xs text-blue-800/80">
                    Bạn chưa hoàn tất hồ sơ doanh nghiệp. Vui lòng đăng ký thông tin để được duyệt và bắt đầu.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/supplier/profile')}
                className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all whitespace-nowrap cursor-pointer"
              >
                Đăng ký ngay
              </button>
            </div>
          ) : !profile.isVerified ? (
            <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-amber-100 rounded-2xl text-amber-700">
                  <Clock className="w-6 h-6 animate-spin-slow" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base">Hồ sơ doanh nghiệp đang chờ xét duyệt</h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-extrabold uppercase">
                      Chờ xác minh
                    </span>
                  </div>
                  <p className="text-xs text-amber-900/80 mt-0.5">
                    Hồ sơ doanh nghiệp <span className="font-bold">{profile.companyName}</span> đang được Quản trị viên (Admin) thẩm định. Để bảo vệ an toàn giao dịch, tính năng mua gói cước và đăng nguyên liệu tạm thời khóa cho tới khi Admin phê duyệt.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/supplier/profile')}
                className="px-4 py-2.5 rounded-2xl bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold text-xs transition-all whitespace-nowrap cursor-pointer"
              >
                Xem & sửa hồ sơ
              </button>
            </div>
          ) : (
            <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base">Hồ sơ doanh nghiệp đã được xác minh ✓</h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-extrabold uppercase">
                      Đã duyệt
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Doanh nghiệp <span className="font-bold">{profile.companyName}</span> đã được cấp phép đăng tải thực phẩm trên nền tảng Friggy.
                  </p>
                </div>
              </div>
              {!subscription && (
                <button
                  onClick={() => navigate('/supplier/subscription')}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all whitespace-nowrap cursor-pointer"
                >
                  Mua gói dịch vụ
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Stats Cards Grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total */}
        <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng nguyên liệu</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Utensils className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-800">{stats.total}</span>
            <span className="text-xs text-slate-400">mặt hàng</span>
          </div>
        </div>

        {/* Card 2: Pending */}
        <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chờ xét duyệt</span>
            <div className="p-2.5 bg-amber-50 text-amber-500 rounded-2xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-600">{stats.pending}</span>
            <span className="text-xs text-amber-600/70">đang chờ</span>
          </div>
        </div>

        {/* Card 3: Approved */}
        <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đã được duyệt</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">{stats.approved}</span>
            <span className="text-xs text-emerald-600/70">hiển thị</span>
          </div>
        </div>

        {/* Card 4: Rejected */}
        <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bị từ chối</span>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-600">{stats.rejected}</span>
            <span className="text-xs text-rose-600/70">cần sửa</span>
          </div>
        </div>
      </div>

      {/* ── Subscription Status & Quick Actions ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscription Info Card */}
        <div className="lg:col-span-2 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-10 pointer-events-none">
            <Package className="w-64 h-64 text-white" />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-xs flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                Gói dịch vụ đối tác
              </span>
              {subscription && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-emerald-950 text-xs font-black uppercase">
                  {subscription.status}
                </span>
              )}
            </div>

            <div className="mt-4">
              <h2 className="text-2xl sm:text-3xl font-black">
                {subscription
                  ? subscription.plan?.displayName
                  : !profile?.isVerified
                  ? 'Hồ sơ đang chờ xét duyệt'
                  : 'Chưa kích hoạt gói cước'}
              </h2>
              <p className="text-white/80 text-xs sm:text-sm mt-1 max-w-lg">
                {subscription
                  ? `Đang áp dụng chính sách: Đăng tối đa ${subscription.plan?.maxIngredients || 50} nguyên liệu thực phẩm sạch.`
                  : !profile?.isVerified
                  ? 'Hồ sơ doanh nghiệp đang được Admin thẩm định. Tính năng thanh toán mua gói cước sẽ tự động mở khóa ngay sau khi hồ sơ được phê duyệt.'
                  : 'Đăng ký gói cước nhà cung cấp để tải lên danh mục nguyên liệu, tiếp cận hàng ngàn người dùng Friggy.'}
              </p>
            </div>

            {subscription && (
              <div className="mt-6 flex flex-wrap gap-4 text-xs font-medium text-white/90">
                <div className="bg-white/10 px-3.5 py-2 rounded-2xl backdrop-blur-xs">
                  <span className="text-white/60 block text-[10px]">Ngày bắt đầu</span>
                  <span className="font-bold">{subscription.startDate}</span>
                </div>
                <div className="bg-white/10 px-3.5 py-2 rounded-2xl backdrop-blur-xs">
                  <span className="text-white/60 block text-[10px]">Ngày hết hạn</span>
                  <span className="font-bold">{subscription.endDate}</span>
                </div>
                <div className="bg-white/10 px-3.5 py-2 rounded-2xl backdrop-blur-xs">
                  <span className="text-white/60 block text-[10px]">Tự động gia hạn</span>
                  <span className="font-bold">{subscription.autoRenew ? 'Đang bật' : 'Đã tắt'}</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => navigate('/supplier/subscription')}
              className="px-5 py-2.5 bg-white text-emerald-950 hover:bg-emerald-50 font-black text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              {subscription
                ? 'Quản lý gói cước'
                : !profile?.isVerified
                ? 'Xem bảng giá gói cước'
                : 'Xem các gói dịch vụ'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate('/supplier/payment-history')}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-2xl backdrop-blur-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Lịch sử giao dịch
            </button>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-white rounded-3xl border border-emerald-100 p-6 flex flex-col justify-between shadow-xs">
          <div>
            <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Lối tắt thao tác
            </h3>
            <p className="text-xs text-slate-400 mt-1">Các hành động thường dùng nhất của nhà cung cấp</p>

            <div className="mt-4 space-y-2.5">
              <button
                onClick={() => {
                  if (!profile?.isVerified) {
                    showToast.warning('Hồ sơ doanh nghiệp đang chờ Admin xét duyệt. Tính năng đăng nguyên liệu hiện đang tạm khóa.');
                    return;
                  }
                  navigate('/supplier/ingredients');
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
                  !profile?.isVerified
                    ? 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    : 'bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-950 border-emerald-200/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl ${
                      !profile?.isVerified ? 'bg-slate-200 text-slate-600' : 'bg-emerald-200/70 text-emerald-900'
                    }`}
                  >
                    {!profile?.isVerified ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                  <div className="text-left">
                    <span>Đăng nguyên liệu mới</span>
                    {!profile?.isVerified && (
                      <span className="block text-[10px] text-slate-400 font-normal">Tạm khóa chờ duyệt</span>
                    )}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => navigate('/supplier/profile')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-950 text-xs font-bold transition-all border border-emerald-200/60 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-200/70 text-emerald-900 rounded-xl">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span>Cập nhật hồ sơ & logo</span>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-700" />
              </button>

              <button
                onClick={() => navigate('/supplier/payment-history')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-950 text-xs font-bold transition-all border border-emerald-200/60 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-200/70 text-emerald-900 rounded-xl">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span>Lịch sử hóa đơn</span>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-700" />
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Hỗ trợ đối tác 24/7</span>
            <span className="font-bold text-emerald-700">support@friggy.io.vn</span>
          </div>
        </div>
      </div>

      {/* ── Recent Ingredients Table ─────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-emerald-100 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-slate-800 text-base">Nguyên liệu gần đây</h3>
            <p className="text-xs text-slate-400">Danh sách các mặt hàng đã đăng nộp gần nhất</p>
          </div>
          <button
            onClick={() => navigate('/supplier/ingredients')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
          >
            Xem tất cả ({stats.total})
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {ingredients.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            <Utensils className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            Chưa có nguyên liệu nào. Hãy bắt đầu bằng cách thêm nguyên liệu mới!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Tên nguyên liệu</th>
                  <th className="py-3 px-3">Đơn vị</th>
                  <th className="py-3 px-3">Đơn giá</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {ingredients.slice(0, 5).map((item) => (
                  <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-800">{item.name}</td>
                    <td className="py-3 px-3 text-slate-600">{item.defaultUnit}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">
                      {formatVnd(item.averagePricePerUnit)}
                    </td>
                    <td className="py-3 px-3">
                      {item.status === 'approved' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Đã duyệt
                        </span>
                      ) : item.status === 'rejected' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          Bị từ chối
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Chờ duyệt
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierDashboard;

