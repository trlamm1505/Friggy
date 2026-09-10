import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Calendar,
  Phone,
  ShieldCheck,
  KeyRound,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Camera,
} from 'lucide-react';
import { adminAccount } from '../../../data/adminMockData';
import cuteMascotImg from '../../../assets/images/cute_mascot.png';

export const AdminProfile = () => {
  // Avatar state & file input ref
  const [avatarUrl, setAvatarUrl] = useState(cuteMascotImg);
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // State for Personal Info
  const [profileData, setProfileData] = useState({
    name: adminAccount.name || 'Admin Friggy',
    username: adminAccount.username || '0854340045',
    email: adminAccount.email || 'tqlam150504@gamil.com',
    dob: adminAccount.dob || '15/05/2004',
    role: 'Super Admin',
  });

  const [profileSavedSuccess, setProfileSavedSuccess] = useState(false);

  // State for Changing Password
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Handle Avatar Change
  const handleAvatarChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const newUrl = URL.createObjectURL(file);
      setAvatarUrl(newUrl);
      setAvatarSuccess(true);
      setTimeout(() => setAvatarSuccess(false), 3500);
    }
  };

  // Trigger File Input Click
  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle Save Profile
  const handleSaveProfile = (e) => {
    e.preventDefault();
    setProfileSavedSuccess(true);
    setTimeout(() => setProfileSavedSuccess(false), 3500);
  };

  // Handle Change Password
  const handleChangePassword = (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!passwordForm.currentPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (passwordForm.currentPassword !== adminAccount.password) {
      setPasswordError('Mật khẩu hiện tại không chính xác!');
      return;
    }
    if (!passwordForm.newPassword) {
      setPasswordError('Vui lòng nhập mật khẩu mới.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không trùng khớp!');
      return;
    }

    // Success
    setPasswordSuccess(true);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setTimeout(() => setPasswordSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Hidden File Input for Avatar Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarChange}
        accept="image/*"
        className="hidden"
      />

      {/* Top Banner Header with Avatar Upload */}
      <div className="p-6 sm:p-8 rounded-[32px] bg-gradient-to-r from-white via-emerald-50/40 to-white border border-emerald-100 shadow-sm flex flex-col sm:flex-row items-center sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left z-10">
          {/* Avatar Picture Container with Camera Overlay Icon */}
          <div className="relative group cursor-pointer" onClick={handleCameraClick}>
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-emerald-500 via-green-400 to-teal-400 p-1 shadow-lg shadow-emerald-600/20 transition-transform duration-300 group-hover:scale-105">
              <img
                src={avatarUrl}
                alt="Admin Avatar"
                className="w-full h-full object-cover rounded-[22px] bg-white"
              />
            </div>

            {/* Camera Overlay Icon Badge */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCameraClick();
              }}
              title="Cập nhật ảnh đại diện"
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md border-2 border-white transition-all duration-200 group-hover:scale-110 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight flex items-center justify-center sm:justify-start gap-2">
              <span>{profileData.name}</span>
              <Sparkles className="w-6 h-6 text-emerald-500" />
            </h3>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1.5">
              <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-black text-xs shadow-xs">
                {profileData.role}
              </span>
              <span className="text-xs text-emerald-900/70 font-semibold bg-emerald-100/60 px-3 py-1 rounded-full border border-emerald-200/50">
                Quản trị viên hệ thống Friggy AI
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Change Success Toast */}
      {avatarSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Đã cập nhật ảnh đại diện thành công!</span>
        </motion.div>
      )}

      {/* Main Grid: Left = Personal Info, Right = Change Password */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Update Personal Info (2 Cols wide) */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleSaveProfile}
            className="p-6 sm:p-8 rounded-[32px] bg-white border border-emerald-100 shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-emerald-950">Thông Tin Tài Khoản</h4>
                  <p className="text-xs text-emerald-900/60 font-medium">
                    Cập nhật chi tiết cá nhân và thông tin liên hệ của bạn
                  </p>
                </div>
              </div>
            </div>

            {profileSavedSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Đã cập nhật thông tin cá nhân thành công!</span>
              </motion.div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Họ và Tên</span>
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-emerald-50/40 hover:bg-emerald-50/70 focus:bg-white border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-950 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  required
                />
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Số Điện Thoại (Tên đăng nhập)</span>
                </label>
                <input
                  type="text"
                  value={profileData.username}
                  onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                  className="w-full px-4 py-3 bg-emerald-50/40 hover:bg-emerald-50/70 focus:bg-white border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-950 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Địa Chỉ Email</span>
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-emerald-50/40 hover:bg-emerald-50/70 focus:bg-white border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-950 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  required
                />
              </div>

              {/* Date of Birth */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ngày Sinh</span>
                </label>
                <input
                  type="text"
                  value={profileData.dob}
                  onChange={(e) => setProfileData({ ...profileData, dob: e.target.value })}
                  placeholder="DD/MM/YYYY"
                  className="w-full px-4 py-3 bg-emerald-50/40 hover:bg-emerald-50/70 focus:bg-white border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-950 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  required
                />
              </div>

              {/* Role (Disabled / Readonly) */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Vai Trò Phân Quyền</span>
                </label>
                <input
                  type="text"
                  value={profileData.role}
                  disabled
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-emerald-100 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <Save className="w-4 h-4" />
                <span>Lưu Thông Tin</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Change Password Card (1 Col wide) */}
        <div className="lg:col-span-1">
          <form
            onSubmit={handleChangePassword}
            className="p-6 sm:p-8 rounded-[32px] bg-white border border-emerald-100 shadow-sm space-y-5 h-full flex flex-col justify-between"
          >
            <div className="space-y-5">
              <div className="flex items-center gap-2.5 border-b border-emerald-100 pb-4">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-emerald-950">Đổi Mật Khẩu</h4>
                  <p className="text-xs text-emerald-900/60 font-medium">Tăng cường bảo mật cho tài khoản</p>
                </div>
              </div>

              {/* Password Error Alert */}
              {passwordError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>{passwordError}</span>
                </motion.div>
              )}

              {/* Password Success Alert */}
              {passwordSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Đổi mật khẩu thành công!</span>
                </motion.div>
              )}

              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-emerald-950">Mật Khẩu Hiện Tại</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Nhập mật khẩu hiện tại"
                    className="w-full pl-4 pr-10 py-3 bg-emerald-50/40 hover:bg-emerald-50/70 focus:bg-white border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-950 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-700 p-1 cursor-pointer"
                  >
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-emerald-950">Mật Khẩu Mới</label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Nhập mật khẩu mới"
                    className="w-full pl-4 pr-10 py-3 bg-emerald-50/40 hover:bg-emerald-50/70 focus:bg-white border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-950 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-700 p-1 cursor-pointer"
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-emerald-950">Xác Nhận Mật Khẩu Mới</label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full pl-4 pr-10 py-3 bg-emerald-50/40 hover:bg-emerald-50/70 focus:bg-white border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-950 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-700 p-1 cursor-pointer"
                  >
                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-emerald-100">
              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <KeyRound className="w-4 h-4" />
                <span>Cập Nhật Mật Khẩu</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
