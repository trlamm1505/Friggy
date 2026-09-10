import React, { useState } from 'react';
import {
  Menu,
  Bell,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

import cuteMascotImg from '../../../assets/images/cute_mascot.png';

export const AdminHeader = ({ activeTab, setMobileOpen, onExitAdmin }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Trang Chủ Tổng Quan', sub: 'Thống kê người dùng, gói cước và doanh thu hệ thống' };
      case 'users':
        return { title: 'Quản Lý Người Dùng', sub: 'Quản lý tài khoản, phân quyền và lịch sử hoạt động' };
      case 'packages':
        return { title: 'Quản Lý Gói Cước', sub: 'Thiết lập các gói dịch vụ Premium, Family VIP & Chef Pro' };
      case 'profile':
        return { title: 'Thông Tin Cá Nhân', sub: 'Quản lý thông tin tài khoản admin, cập nhật chi tiết & đổi mật khẩu' };
      case 'settings':
        return { title: 'Cài Đặt Hệ Thống', sub: 'Cấu hình cổng thanh toán, API Keys & bảo mật' };
      default:
        return { title: 'Admin Dashboard', sub: 'Hệ thống quản trị Friggy AI' };
    }
  };

  const current = getTitle();

  const notifications = [
    {
      id: 1,
      title: 'Đăng ký mới gói Family VIP',
      user: 'Trần Thị Mai',
      time: '5 phút trước',
      type: 'success',
    },
    {
      id: 2,
      title: 'Giao dịch MoMo 990.000₫ thành công',
      user: 'Lê Hoàng Nam',
      time: '25 phút trước',
      type: 'success',
    },
    {
      id: 3,
      title: 'Cảnh báo: Server API quá tải 85%',
      user: 'System Bot',
      time: '1 giờ trước',
      type: 'warning',
    },
  ];

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-emerald-100 sticky top-0 z-30 px-4 sm:px-8 py-4 flex items-center justify-between shadow-2xs">
      {/* Left side: Mobile button & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div>
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{current.title}</span>
            <Sparkles className="w-5 h-5 text-emerald-500 hidden sm:inline" />
          </h1>
          <p className="text-xs text-slate-500 font-medium hidden sm:block">
            {current.sub}
          </p>
        </div>
      </div>

      {/* Right side: Notifications & Profile */}
      <div className="flex items-center gap-3 sm:gap-4 relative">

        {/* Notification Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/90 text-emerald-800 transition-all duration-200 relative cursor-pointer border border-emerald-200/60"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-xl border border-emerald-100 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                <span className="text-xs font-black text-emerald-950">THÔNG BÁO MỚI</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  3 Chưa đọc
                </span>
              </div>
              <div className="space-y-2 mt-3 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-2.5 rounded-2xl hover:bg-emerald-50/60 border border-transparent hover:border-emerald-100 flex items-start gap-3 transition-colors cursor-pointer"
                  >
                    {n.type === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800 leading-tight">
                        {n.title}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {n.user} • <span className="text-slate-400">{n.time}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Badge */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/70">
          <img
            src={cuteMascotImg}
            alt="Admin Avatar"
            className="w-8 h-8 rounded-xl object-cover bg-white border border-emerald-300 p-0.5 shadow-xs"
          />
          <div className="text-left hidden sm:block">
            <p className="text-xs font-extrabold text-emerald-950 leading-tight">
              Admin Friggy
            </p>
            <p className="text-[10px] font-bold text-emerald-600">Super Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
