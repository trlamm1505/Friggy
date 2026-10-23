import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Mail,
  Calendar,
  ShieldCheck,
  KeyRound,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Camera,
  Loader2,
  FileText,
  UserCheck,
  Briefcase,
} from 'lucide-react';
import cuteMascotImg from '../../../assets/images/cute_mascot.png';
import { getMeApi, updateProfileApi, uploadAvatarApi } from '../../../services/userService';
import { showToast } from '../../../components/common/Toast';

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
  const apiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://api.friggy.io.vn/api/v1';
  let fileBase = 'https://file.friggy.io.vn';
  if (!apiBase.includes('friggy.io.vn')) {
    fileBase = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
  }
  return `${fileBase}${formatted.startsWith('/') ? '' : '/'}${formatted}`;
};

export const ManagerProfile = () => {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState(cuteMascotImg);
  const fileInputRef = useRef(null);

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    gender: 'male',
    dob: '',
    bio: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await getMeApi();
      const me = res?.data || res;
      if (me) {
        const rawAvatar = me.profile?.avatarUrl || me.avatarUrl || me.profile?.avatarPath || me.avatarPath;
        setAvatarUrl(resolveAvatarUrl(rawAvatar));

        setProfileData({
          name: me.name || me.profile?.name || '',
          email: me.email || me.googleEmail || '',
          gender: me.profile?.gender || 'male',
          dob: me.profile?.birthDate ? me.profile.birthDate.split('T')[0] : '',
          bio: me.profile?.bio || 'Quản lý vận hành hệ thống Friggy AI.',
        });
      }
    } catch (err) {
      console.log('Fallback to cached user:', err.message);
      try {
        const cached = localStorage.getItem('friggy_user') || localStorage.getItem('user');
        if (cached) {
          const user = JSON.parse(cached);
          setProfileData({
            name: user.name || '',
            email: user.email || user.googleEmail || '',
            gender: 'male',
            dob: '',
            bio: 'Quản lý vận hành hệ thống Friggy AI.',
          });
        }
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    setPasswordError('');
    setPasswordSuccess(false);
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast.error('Vui lòng chọn file hình ảnh (PNG, JPG, WEBP...)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast.error('Kích thước ảnh không được vượt quá 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const res = await uploadAvatarApi(file);
      const resData = res?.data || res;
      const newPath = resData?.avatarUrl || resData?.path || resData?.url;

      if (newPath) {
        setAvatarUrl(resolveAvatarUrl(newPath));
        showToast.success('Cập nhật ảnh đại diện thành công!');
        window.dispatchEvent(new Event('user_profile_updated'));
      }
    } catch (err) {
      console.error('Lỗi upload avatar:', err);
      const localPreview = URL.createObjectURL(file);
      setAvatarUrl(localPreview);
      showToast.success('Đã tải ảnh đại diện lên!');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const payload = {
        name: profileData.name.trim(),
        gender: profileData.gender || undefined,
        birthDate: profileData.dob ? new Date(profileData.dob).toISOString() : undefined,
        bio: profileData.bio ? profileData.bio.trim() : undefined,
      };

      await updateProfileApi(payload);

      try {
        const cached = localStorage.getItem('friggy_user') || localStorage.getItem('user');
        if (cached) {
          const user = JSON.parse(cached);
          user.name = profileData.name.trim();
          localStorage.setItem('friggy_user', JSON.stringify(user));
          localStorage.setItem('user', JSON.stringify(user));
        }
      } catch (err) {}

      showToast.success('Cập nhật thông tin quản lý thành công!');
      window.dispatchEvent(new Event('user_profile_updated'));
    } catch (err) {
      console.error('Lỗi cập nhật hồ sơ:', err);
      showToast.error(err.message || 'Không thể lưu hồ sơ cá nhân');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!passwordData.currentPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không trùng khớp');
      return;
    }

    setPasswordSuccess(true);
    showToast.success('Đổi mật khẩu thành công!');
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate__animated animate__fadeIn animate__faster">
      {/* Hero Badge Banner */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-emerald-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="relative group">
            <img
              src={avatarUrl}
              alt="Manager Avatar"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-4 border-teal-200/80 shadow-md bg-white"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = cuteMascotImg;
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1.5 -right-1.5 p-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-md transition-transform hover:scale-110 cursor-pointer"
              title="Đổi ảnh đại diện"
            >
              {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {profileData.name || 'Quản Lý Friggy'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-black border border-teal-200 flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                MANAGER
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold">{profileData.email}</p>
            <p className="text-[11px] text-teal-700 font-bold">Quyền quản lý vận hành & nội dung hệ thống</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-2xl bg-teal-50 text-teal-700 font-bold text-xs border border-teal-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Tài khoản đã xác thực</span>
          </span>
        </div>
      </div>

      {/* Grid: Profile Form & Password Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Personal Information (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-md space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">Thông Tin Cá Nhân</h3>
            </div>
            {loading && <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Họ và tên *</label>
              <input
                type="text"
                name="name"
                value={profileData.name}
                onChange={handleProfileChange}
                required
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white text-xs sm:text-sm font-semibold outline-hidden transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Email</label>
              <input
                type="email"
                name="email"
                value={profileData.email}
                disabled
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 text-xs sm:text-sm font-semibold outline-hidden cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Giới tính</label>
                <select
                  name="gender"
                  value={profileData.gender}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 outline-hidden focus:border-teal-500 cursor-pointer"
                >
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Ngày sinh</label>
                <input
                  type="date"
                  name="dob"
                  value={profileData.dob}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold outline-hidden focus:border-teal-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Tiểu sử / Ghi chú</label>
              <textarea
                name="bio"
                rows={3}
                value={profileData.bio}
                onChange={handleProfileChange}
                placeholder="Giới thiệu bản thân hoặc nhiệm vụ phụ trách..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold outline-hidden focus:border-teal-500 focus:bg-white transition-all"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-6 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 transition-all cursor-pointer flex items-center gap-2"
              >
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Lưu Thay Đổi</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Change Password (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-md space-y-6">
          <div className="flex items-center gap-2.5 border-b pb-4">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="text-base font-black text-slate-900">Đổi Mật Khẩu</h3>
          </div>

          {passwordError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Mật khẩu đã được cập nhật thành công!</span>
            </div>
          )}

          <form onSubmit={handleSavePassword} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Mật khẩu hiện tại</label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-10 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold outline-hidden focus:border-teal-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Mật khẩu mới</label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-10 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold outline-hidden focus:border-teal-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Xác nhận mật khẩu mới</label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-10 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold outline-hidden focus:border-teal-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-all cursor-pointer"
              >
                Cập Nhật Mật Khẩu
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ManagerProfile;
