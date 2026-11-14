import React, { useState, useEffect } from 'react';
import { Menu, Store } from 'lucide-react';
import cuteMascotImg from '../../../assets/images/cute_mascot.png';
import { getSupplierProfileApi } from '../../../services/supplierService';
import { API_BASE_URL } from '../../../utils/constants';

export const SupplierHeader = ({ activeTab, setMobileOpen, onExitSupplier, profile: propProfile }) => {
  const [profile, setProfile] = useState(propProfile || null);

  useEffect(() => {
    if (propProfile) {
      setProfile(propProfile);
    }
  }, [propProfile]);

  const getTabTitle = () => {
    switch (activeTab) {
      case 'profile':
        return 'Hồ Sơ Doanh Nghiệp';
      case 'ingredients':
        return 'Quản Lý Nguyên Liệu';
      case 'subscription':
        return 'Gói Cước & Dịch Vụ';
      case 'payment-history':
        return 'Lịch Sử Thanh Toán';
      default:
        return 'Tổng Quan Doanh Nghiệp';
    }
  };

  useEffect(() => {
    if (propProfile) return;
    const loadProfile = async () => {
      try {
        const res = await getSupplierProfileApi();
        const data = res?.data || res;
        setProfile(data);
      } catch (e) {
        // Có thể chưa tạo profile
      }
    };
    loadProfile();
  }, [propProfile]);

  const resolveLogoUrl = (rawUrl) => {
    if (!rawUrl) return cuteMascotImg;
    let formatted = String(rawUrl).trim();
    if (formatted.startsWith('blob:') || formatted.startsWith('data:')) {
      return formatted;
    }
    if (formatted.includes('api.friggy.io.vn')) {
      formatted = formatted.replace('api.friggy.io.vn', 'file.friggy.io.vn');
    }
    let fullUrl = formatted;
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      const apiBase = API_BASE_URL || 'https://api.friggy.io.vn/api/v1';
      let fileBase = 'https://file.friggy.io.vn';
      if (!apiBase.includes('friggy.io.vn')) {
        fileBase = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
      }
      fullUrl = `${fileBase}${formatted.startsWith('/') ? '' : '/'}${formatted}`;
    }
    if (fullUrl.includes('ngrok') && !fullUrl.includes('ngrok-skip-browser-warning')) {
      const sep = fullUrl.includes('?') ? '&' : '?';
      fullUrl = `${fullUrl}${sep}ngrok-skip-browser-warning=true`;
    }
    return fullUrl;
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-emerald-100 px-4 sm:px-6 lg:px-8 py-3.5 transition-all duration-300 shadow-2xs">
      <div className="flex items-center justify-between gap-4">
        {/* Left Side: Mobile Menu & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <span>{getTabTitle()}</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              Quản lý danh mục sản phẩm và đối tác cung ứng Friggy
            </p>
          </div>
        </div>

        {/* Right Side: Profile Pill & Verification Status */}
        <div className="flex items-center gap-3">
          {profile && (
            <div className="hidden sm:flex items-center gap-2">
              {profile.isVerified ? (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  Đã xác minh
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                  Chờ duyệt
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2.5 pl-2 py-1 pr-1 bg-emerald-50/80 hover:bg-emerald-100/90 rounded-2xl border border-emerald-200/70 transition-all">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-extrabold text-emerald-950 truncate max-w-[150px]">
                {profile?.companyName || 'Nhà Cung Cấp'}
              </p>
              <p className="text-[10px] text-emerald-600 font-bold">Đối tác cung ứng</p>
            </div>
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-white border border-emerald-300 flex-shrink-0 flex items-center justify-center shadow-xs">
              <img
                src={resolveLogoUrl(profile?.logoPath)}
                alt="Supplier Logo"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default SupplierHeader;

