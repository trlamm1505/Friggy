import React from 'react';
import { motion } from 'framer-motion';
import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Refrigerator,
  Sparkles,
  PackageCheck,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export const UserDetailModal = ({ user, onClose, onEdit }) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-xl bg-white rounded-[36px] shadow-2xl border border-slate-100 overflow-hidden relative"
      >
        {/* Top Header Graphic */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 sm:p-8 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-20 h-20 rounded-2xl object-cover border-4 border-white/20 shadow-md bg-white"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-black">{user.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-medium">@{user.username}</p>
              <div className="pt-1 flex items-center gap-2">
                {user.status === 'Active' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-400/20 px-2.5 py-0.5 rounded-full text-emerald-200 border border-emerald-300/30">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                    Đang hoạt động
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-rose-400/20 px-2.5 py-0.5 rounded-full text-rose-200 border border-rose-300/30">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-300" />
                    Tài khoản bị khóa
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                Địa chỉ Email
              </span>
              <p className="text-xs font-bold text-slate-900 truncate">{user.email}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                Số Điện Thoại
              </span>
              <p className="text-xs font-bold text-slate-900">{user.phone || 'Chưa cập nhật'}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                Gói Dịch Vụ Sử Dụng
              </span>
              <p className="text-xs font-black text-emerald-700">{user.package}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Ngày Tham Gia
              </span>
              <p className="text-xs font-bold text-slate-900">{user.joinDate}</p>
            </div>
          </div>

          {/* Usage Metrics */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Refrigerator className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">Hoạt động trong Tủ lạnh</p>
                <p className="text-[11px] text-slate-500 font-semibold">
                  {user.fridgeCount} Tủ lạnh • {user.itemsStored} Thực phẩm lưu trữ
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-white text-emerald-800 rounded-xl text-xs font-extrabold border border-emerald-200">
              Active User
            </span>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={() => {
                onClose();
                onEdit(user);
              }}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Chỉnh Sửa Thông Tin
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UserDetailModal;
