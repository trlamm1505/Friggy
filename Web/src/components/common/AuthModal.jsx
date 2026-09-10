import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, Eye, EyeOff, User, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import cuteMascotImg from '../../assets/images/cute_mascot.png';

export const AuthModal = ({ isOpen, onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    rememberMe: true,
  });
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1500);
  };

  const handleGoogleSignIn = () => {
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
        />

        {/* Auth Card Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden select-none"
        >
          {/* Top Decorative Header Accent */}
          <div className="relative h-28 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700 flex items-center justify-center overflow-hidden">
            {/* Background glow & light patterns */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-emerald-400/20 rounded-full blur-lg pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors cursor-pointer z-20"
              aria-label="Đóng modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Mascot Logo Badge */}
            <div className="relative -bottom-6 flex flex-col items-center">
              <div className="w-20 h-20 rounded-3xl bg-white p-1.5 shadow-xl ring-4 ring-emerald-500/30 flex items-center justify-center">
                <img
                  src={cuteMascotImg}
                  alt="Friggy Mascot Logo"
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>
            </div>
          </div>

          {/* Form Content Body */}
          <div className="pt-9 pb-8 px-6 sm:px-8 space-y-6">
            {/* Header Text */}
            <div className="text-center space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">
                {isSignUp ? 'Tạo Tài Khoản Friggy' : 'Chào Mừng Trở Lại!'}
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-emerald-800/70">
                {isSignUp
                  ? 'Trải nghiệm quản lý tủ lạnh thông minh bằng AI'
                  : 'Đăng nhập để tiếp tục tối ưu căn bếp gia đình bạn'}
              </p>
            </div>

            {/* Success Toast */}
            {isSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 bg-emerald-100/90 border border-emerald-300 rounded-2xl text-emerald-900 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>{isSignUp ? 'Tạo tài khoản thành công!' : 'Đăng nhập thành công! Đang chuyển hướng...'}</span>
              </motion.div>
            )}

            {/* GOOGLE SIGN-IN BUTTON */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-emerald-50/50 text-slate-800 font-bold py-3.5 px-4 rounded-2xl border-2 border-emerald-100 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
              >
                {/* Official Google SVG Logo */}
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="text-sm font-extrabold text-emerald-950">
                  {isSignUp ? 'Đăng ký bằng Google' : 'Đăng nhập bằng Google'}
                </span>
              </button>

              {/* Or Divider */}
              <div className="relative flex items-center justify-center py-2">
                <div className="w-full border-t border-emerald-100"></div>
                <span className="absolute px-3 bg-white text-[11px] font-bold uppercase text-emerald-800/60 tracking-wider">
                  hoặc qua Email
                </span>
              </div>
            </div>

            {/* EMAIL / PASSWORD FORM */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name Input (Sign Up only) */}
              {isSignUp && (
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider block">
                    Họ và Tên
                  </label>
                  <div className="relative">
                    <User className="w-5 h-5 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-11 pr-4 py-3 rounded-2xl bg-emerald-50/40 border border-emerald-200 text-sm font-semibold text-emerald-950 placeholder-emerald-800/40 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all shadow-2xs"
                    />
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider block">
                  Địa Chỉ Email
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-emerald-50/40 border border-emerald-200 text-sm font-semibold text-emerald-950 placeholder-emerald-800/40 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider block">
                  Mật Khẩu
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-11 py-3 rounded-2xl bg-emerald-50/40 border border-emerald-200 text-sm font-semibold text-emerald-950 placeholder-emerald-800/40 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-700/60 hover:text-emerald-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              {!isSignUp && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                      className="w-4 h-4 accent-emerald-600 rounded border-emerald-300"
                    />
                    <span className="font-bold text-emerald-900/80">Ghi nhớ đăng nhập</span>
                  </label>
                  <a href="#" className="font-extrabold text-emerald-700 hover:text-emerald-900 hover:underline">
                    Quên mật khẩu?
                  </a>
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black text-base py-3.5 rounded-2xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all cursor-pointer mt-2 active:scale-[0.98]"
              >
                <span>{isSignUp ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập Ngay'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>

            {/* Toggle Sign In / Sign Up Footer */}
            <div className="text-center pt-2 border-t border-emerald-100">
              <p className="text-xs font-semibold text-emerald-900/70">
                {isSignUp ? 'Đã có tài khoản?' : 'Chưa có tài khoản Friggy?'}{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="font-extrabold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer ml-1"
                >
                  {isSignUp ? 'Đăng nhập ngay' : 'Đăng ký miễn phí'}
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AuthModal;
