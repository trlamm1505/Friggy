import React, { useState, useEffect } from 'react';
import { Menu, Sparkles, Briefcase } from 'lucide-react';
import cuteMascotImg from '../../../assets/images/cute_mascot.png';
import { getMeApi } from '../../../services/userService';
import { API_BASE_URL } from '../../../utils/constants';

export const ManagerHeader = ({ activeTab, setMobileOpen, onExitManager }) => {
  const resolveAvatarUrl = (rawUrl) => {
    if (!rawUrl) return cuteMascotImg;
    let formatted = rawUrl.trim();
    if (formatted.includes('api.friggy.io.vn')) {
      formatted = formatted.replace('api.friggy.io.vn', 'file.friggy.io.vn');
    }
    if (formatted.startsWith('http://') || formatted.startsWith('https://') || formatted.startsWith('data:')) {
      return formatted;
    }
    if (formatted.startsWith('file.friggy.io.vn')) {
      return `https://${formatted}`;
    }
    const apiBase = API_BASE_URL || 'https://api.friggy.io.vn/api/v1';
    let fileBase = 'https://file.friggy.io.vn';
    if (!apiBase.includes('friggy.io.vn')) {
      fileBase = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
    }
    return `${fileBase}${formatted.startsWith('/') ? '' : '/'}${formatted}`;
  };

  const getInitialHeaderUserInfo = () => {
    try {
      const cached = localStorage.getItem('friggy_user') || localStorage.getItem('user');
      if (cached) {
        const me = JSON.parse(cached);
        const name =
          me.name ||
          me.profile?.name ||
          (me.googleEmail ? me.googleEmail.split('@')[0] : null) ||
          (me.email ? me.email.split('@')[0] : null) ||
          '';
        const role = 'Quản Lý Vận Hành';
        const avatarUrl = me.profile?.avatarUrl || me.avatarUrl || me.profile?.avatarPath || me.avatarPath;
        if (name) {
          return { name, role, avatarUrl };
        }
      }
    } catch (e) {}
    return { name: '', role: 'Quản Lý Vận Hành', avatarUrl: null };
  };

  const [userInfo, setUserInfo] = useState(() => getInitialHeaderUserInfo());

  const fetchHeaderUserInfo = async () => {
    try {
      const res = await getMeApi();
      const me = res?.data || res;
      if (me) {
        try {
          localStorage.setItem('friggy_user', JSON.stringify(me));
          localStorage.setItem('user', JSON.stringify(me));
        } catch (e) {}
        setUserInfo({
          name: me.name || me.profile?.name || me.googleEmail?.split('@')[0] || me.email?.split('@')[0] || '',
          role: 'Quản Lý Vận Hành',
          avatarUrl: me.profile?.avatarUrl || me.avatarUrl || me.profile?.avatarPath || me.avatarPath || null,
        });
      }
    } catch (err) {
      console.log('Manager Header user info fallback:', err.message);
    }
  };

  useEffect(() => {
    fetchHeaderUserInfo();

    const handleProfileUpdate = () => {
      fetchHeaderUserInfo();
    };

    window.addEventListener('user_profile_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('user_profile_updated', handleProfileUpdate);
    };
  }, []);

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Trang Chủ Tổng Quan Vận Hành', sub: 'Thống kê người dùng, kho thực phẩm và tình hình kinh doanh' };
      case 'ingredients':
        return { title: 'Quản Lý Kho Nguyên Liệu', sub: 'Quản lý nguyên liệu tủ lạnh, hạn sử dụng 3 ngăn & phân loại danh mục' };
      case 'recipes':
        return { title: 'Quản Lý Công Thức Nấu Ăn', sub: 'Thư viện công thức món ngon, khẩu phần và hướng dẫn chế biến' };
      case 'users':
        return { title: 'Quản Lý Người Dùng', sub: 'Theo dõi tài khoản người dùng và trạng thái hoạt động' };
      case 'transactions':
        return { title: 'Lịch Sử Giao Dịch Thanh Toán', sub: 'Nhật ký mua gói cước Premium qua cổng PayOS' };
      case 'sponsors':
        return { title: 'Quản Lý Nhà Tài Trợ & QC', sub: 'Đối tác chiến lược và các chiến dịch banner quảng cáo' };
      case 'packages':
        return { title: 'Thông Tin Gói Cước Dịch Vụ', sub: 'Xem bảng giá, tính năng và quyền lợi của các gói cước' };
      case 'profile':
        return { title: 'Thông Tin Cá Nhân Manager', sub: 'Cập nhật hồ sơ cá nhân và đổi mật khẩu quản lý' };
      default:
        return { title: 'Manager Portal', sub: 'Cổng quản lý vận hành Friggy' };
    }
  };

  const current = getTitle();

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-emerald-100 sticky top-0 z-30 px-4 sm:px-8 py-4 flex items-center justify-between shadow-2xs">
      {/* Left side: Mobile button & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div>
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{current.title}</span>
            <Sparkles className="w-5 h-5 text-teal-500 hidden sm:inline" />
          </h1>
          <p className="text-xs text-slate-500 font-medium hidden sm:block">
            {current.sub}
          </p>
        </div>
      </div>

      {/* Right side: Manager Profile Badge */}
      <div className="flex items-center gap-3 sm:gap-4 relative">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-teal-50/80 border border-teal-200/80">
          <img
            src={resolveAvatarUrl(userInfo.avatarUrl)}
            alt={userInfo.name || 'Manager'}
            className="w-8 h-8 rounded-xl object-cover bg-white border border-teal-300 shadow-xs"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = cuteMascotImg;
            }}
          />
          <div className="text-left hidden sm:block">
            <p className="text-xs font-extrabold text-teal-950 leading-tight truncate max-w-[140px]">
              {userInfo.name || 'Manager'}
            </p>
            <p className="text-[10px] font-bold text-teal-600 flex items-center gap-1">
              <Briefcase className="w-2.5 h-2.5" />
              {userInfo.role}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ManagerHeader;
