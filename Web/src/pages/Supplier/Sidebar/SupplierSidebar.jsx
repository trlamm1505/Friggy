import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Utensils,
  Package,
  CreditCard,
  LogOut,
  X,
  ChevronRight,
  Store,
  Lock,
} from 'lucide-react';
import cuteMascotImg from '../../../assets/images/cute_mascot.png';
import { showToast } from '../../../components/common/Toast';

export const SupplierSidebar = ({
  activeTab: propActiveTab,
  mobileOpen,
  setMobileOpen,
  onExitSupplier,
  isVerified = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab =
    propActiveTab ||
    (() => {
      const p = location.pathname;
      if (p.includes('/supplier/profile')) return 'profile';
      if (p.includes('/supplier/ingredients')) return 'ingredients';
      if (p.includes('/supplier/subscription')) return 'subscription';
      if (p.includes('/supplier/payment-history')) return 'payment-history';
      return 'dashboard';
    })();

  const menuItems = [
    { id: 'dashboard', path: '/supplier/dashboard', label: 'Trang Chủ Overview', icon: LayoutDashboard },
    { id: 'profile', path: '/supplier/profile', label: 'Hồ Sơ Doanh Nghiệp', icon: Building2 },
    { id: 'ingredients', path: '/supplier/ingredients', label: 'Nguyên Liệu Của Tôi', icon: Utensils },
    { id: 'subscription', path: '/supplier/subscription', label: 'Gói Cước & Dịch Vụ', icon: Package },
    { id: 'payment-history', path: '/supplier/payment-history', label: 'Lịch Sử Thanh Toán', icon: CreditCard },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen?.(false)}
          className="fixed inset-0 bg-emerald-950/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-gradient-to-b from-[#eaf6ef] via-[#f3faf5] to-[#e4f4ea] text-emerald-950 flex flex-col border-r border-emerald-200/90 shadow-sm transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Brand Logo Header */}
        <div className="p-6 border-b border-emerald-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-400 p-0.5 shadow-md flex items-center justify-center animate__animated animate__bounceIn">
              <img
                src={cuteMascotImg}
                alt="Friggy Supplier Logo"
                className="w-full h-full object-cover rounded-xl bg-white"
              />
            </div>
            <div>
              <div className="flex items-center">
                <span className="text-xl font-extrabold tracking-tight text-emerald-950">Fri</span>
                <span className="text-xl font-extrabold tracking-tight text-emerald-600">ggy</span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-200/70 text-emerald-800 text-[10px] font-bold border border-emerald-300 uppercase tracking-wider ml-1.5 flex items-center gap-0.5">
                  <Store className="w-2.5 h-2.5" />
                  SUPPLIER
                </span>
              </div>
              <p className="text-[11px] text-emerald-800/70 font-medium">
                Cổng nhà cung cấp thực phẩm
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={() => setMobileOpen?.(false)}
            className="lg:hidden p-1.5 text-emerald-800 hover:text-emerald-950 rounded-xl hover:bg-emerald-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold text-emerald-800/60 uppercase tracking-widest mb-3">
            MENU NHÀ CUNG CẤP
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (!isVerified && (item.id === 'ingredients' || item.id === 'subscription')) {
                    showToast.warning(`Mục "${item.label}" đang tạm khóa chờ Admin phê duyệt hồ sơ doanh nghiệp.`);
                  }
                  navigate(item.path);
                  setMobileOpen?.(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer group ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 font-bold animate__animated animate__pulse'
                    : 'text-emerald-900/80 hover:bg-emerald-100/70 hover:text-emerald-950 hover:translate-x-1'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
                      isActive ? 'text-white' : 'text-emerald-600 group-hover:scale-110'
                    }`}
                  />
                  <span className="whitespace-nowrap truncate">{item.label}</span>
                  {!isVerified && (item.id === 'ingredients' || item.id === 'subscription') && (
                    <span
                      title="Tính năng tạm khóa chờ Admin duyệt hồ sơ"
                      className="ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-200/90 text-emerald-950 border border-emerald-300 flex items-center gap-0.5 flex-shrink-0"
                    >
                      <Lock className="w-2.5 h-2.5" />
                      Khóa
                    </span>
                  )}
                </div>

                {isActive && <ChevronRight className="w-4 h-4 text-white/90 flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Bottom Logout Footer */}
        <div className="p-4 border-t border-emerald-200/80">
          <button
            onClick={onExitSupplier}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 font-bold text-xs rounded-2xl transition-all duration-200 border border-rose-200 hover:border-rose-600 cursor-pointer shadow-2xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default SupplierSidebar;

