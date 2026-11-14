import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Mail,
  Lock,
  User,
  Phone,
  Shield,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { createAdminUserApi } from '../../../services/adminService';
import { showToast } from '../../../components/common/Toast';

export const AddUserModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'user', // 'user' | 'manager' | 'admin' | 'supplier'
    phoneNumber: '',
  });

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password.trim()) {
      showToast.warning('Vui lòng điền đầy đủ họ tên, email và mật khẩu');
      return;
    }

    if (formData.password.length < 6) {
      showToast.warning('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        phoneNumber: formData.phoneNumber.trim() || undefined,
      };

      await createAdminUserApi(payload);
      showToast.success(`Tạo tài khoản "${formData.fullName}" thành công!`);
      if (onSuccess) onSuccess();
      onClose();
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        password: '',
        role: 'user',
        phoneNumber: '',
      });
    } catch (err) {
      console.error('Lỗi khi tạo user mới:', err);
      showToast.error(err.response?.data?.message || err.message || 'Không thể tạo tài khoản người dùng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-emerald-100 animate__animated animate__zoomIn animate__faster">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-900">Thêm Người Dùng Mới</h4>
              <p className="text-xs text-slate-400 font-medium">Khởi tạo tài khoản và phân quyền hệ thống</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          {/* Full Name */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Họ và tên <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Ví dụ: Nguyễn Văn A"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-hidden focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Địa chỉ Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="nguyenvana@gmail.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-hidden focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Mật khẩu khởi tạo <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-hidden focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Vai trò (Role) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-hidden focus:border-emerald-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="user">Người dùng (User)</option>
                  <option value="manager">Quản lý (Manager)</option>
                  <option value="admin">Quản trị viên (Admin)</option>
                  <option value="supplier">Nhà cung cấp (Supplier)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Số điện thoại (tùy chọn)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="0912 345 678"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-hidden focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-[11px] text-emerald-900 leading-relaxed">
            💡 Tài khoản tạo mới sẽ tự động được gán gói dịch vụ <strong>Miễn Phí (Free)</strong> và có thể đăng nhập ngay bằng email/mật khẩu vừa tạo.
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              <span>{loading ? 'Đang Tạo...' : 'Tạo Tài Khoản'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;

