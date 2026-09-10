import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Sparkles, ShieldCheck } from 'lucide-react';
import cuteMascotImg from '../../../assets/images/cute_mascot.png';
import qrMascotImg from '../../../assets/images/QR.png';
import mascotImg from '../../../assets/images/mascot.png';

export const Login = ({ onBack, onLoginSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess(formData);
      } else if (onBack) {
        onBack();
      }
    }, 1200);
  };

  const handleGoogleSignIn = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess({ email: 'user.google@gmail.com', name: 'Người Dùng Google' });
      } else if (onBack) {
        onBack();
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#c8ebd9] via-[#b2e5cb] to-[#99dcba] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden select-none">
      {/* Background Decorative Radial Glow Blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-white/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[600px] h-[600px] bg-emerald-300/30 rounded-full blur-3xl pointer-events-none" />

      {/* Back to Home Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-6 left-6 z-30 flex items-center gap-2 bg-white/95 hover:bg-emerald-600 text-emerald-950 hover:text-white shadow-md border border-emerald-300/80 px-4.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Quay lại trang chủ</span>
        </button>
      )}

      {/* Main Glassmorphic Container (Pure White Card popping nicely out from Sage background) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
        className="w-full max-w-4xl bg-white/95 backdrop-blur-2xl rounded-[36px] shadow-2xl shadow-emerald-950/15 border border-white overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-20"
      >
        {/* ================= LEFT SIDE: SHOWCASE BANNER (5 cols - Light Pastel Green Theme) ================= */}
        <div className="lg:col-span-5 bg-gradient-to-b from-emerald-50 via-emerald-100/70 to-teal-100/50 p-8 sm:p-10 border-r border-emerald-100/80 relative overflow-hidden flex flex-col justify-between hidden lg:flex">
          {/* Decorative soft glowing blur */}
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-300/30 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-52 h-52 bg-teal-200/40 rounded-full blur-2xl pointer-events-none" />

          {/* Logo & Brand Header */}
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl overflow-hidden bg-gradient-to-tr from-emerald-500 to-green-400 p-0.5 shadow-md flex items-center justify-center">
                <img src={cuteMascotImg} alt="Friggy Logo" className="w-full h-full object-cover rounded-xl bg-white" />
              </div>
              <div className="flex items-baseline">
                <span className="text-3xl font-black text-emerald-950">Fri</span>
                <span className="text-3xl font-black text-emerald-600">ggy</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block ml-1 shadow-xs"></span>
              </div>
            </div>
            <p className="text-xs text-emerald-900/75 font-semibold">Trợ lý quản lý tủ lạnh AI thông minh</p>
          </div>

          {/* Center Mascot Image & Greeting */}
          <div className="relative z-10 my-auto py-6 flex flex-col items-center text-center space-y-4">
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 3.0, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              <div className="absolute inset-0 bg-emerald-300/40 rounded-full blur-2xl pointer-events-none" />
              <img
                src={qrMascotImg}
                alt="Friggy QR Mascot"
                className="w-48 sm:w-52 h-auto object-contain relative z-10 drop-shadow-xl"
              />
            </motion.div>

            <div className="space-y-1.5 max-w-xs">
              <h3 className="text-lg font-black text-emerald-950 tracking-tight">
                Chào Mừng Bạn Trở Lại!
              </h3>
              <p className="text-xs text-emerald-900/75 font-medium leading-relaxed">
                Giảm 100% lãng phí thực phẩm & nhận gợi ý món ăn ngon từ AI Friggy Chef mỗi ngày.
              </p>
            </div>
          </div>

          {/* Bottom Bullet Benefits */}
          <div className="relative z-10 space-y-2 pt-4 border-t border-emerald-200/70">
            <div className="flex items-center gap-2.5 bg-white/80 border border-emerald-200/60 p-2.5 rounded-2xl shadow-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-xs font-bold text-emerald-950">Bảo mật dữ liệu gia đình 100%</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white/80 border border-emerald-200/60 p-2.5 rounded-2xl shadow-xs">
              <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-xs font-bold text-emerald-950">Gợi ý thực đơn thông minh chuẩn Chef</span>
            </div>
          </div>
        </div>

        {/* ================= RIGHT SIDE: LOGIN FORM (7 cols) ================= */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white relative">
          {/* Header Mobile Logo (visible on small screens) */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-6">
            <img src={cuteMascotImg} alt="Friggy Logo" className="w-9 h-9 object-cover rounded-xl" />
            <div className="flex items-baseline">
              <span className="text-2xl font-black text-emerald-950">Fri</span>
              <span className="text-2xl font-black text-emerald-600">ggy</span>
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block ml-1"></span>
            </div>
          </div>

          {/* Form Header (Perfectly aligned with Left Banner) */}
          <div className="text-center lg:text-left mb-6 sm:mb-7">
            <h2 className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">
              Đăng Nhập Friggy
            </h2>
            <p className="text-xs sm:text-sm text-emerald-900/65 font-medium mt-2">
              Nhập thông tin tài khoản của bạn để tiếp tục sử dụng ứng dụng.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input Field */}
            <div className="space-y-1.5 relative">
              <label className="block text-xs font-bold text-emerald-950 uppercase tracking-wider">
                Địa chỉ Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3.5 bg-white border-2 border-emerald-200 hover:border-emerald-400 rounded-2xl text-sm font-semibold text-emerald-950 placeholder-emerald-800/35 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Password Input Field */}
            <div className="space-y-1.5 relative">
              <label className="block text-xs font-bold text-emerald-950 uppercase tracking-wider">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3.5 bg-white border-2 border-emerald-200 hover:border-emerald-400 rounded-2xl text-sm font-semibold text-emerald-950 placeholder-emerald-800/35 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-emerald-600/70 hover:text-emerald-800 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  name="remember"
                  checked={formData.remember}
                  onChange={handleChange}
                  className="w-4 h-4 rounded-md text-emerald-600 border-emerald-300 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                />
                <span className="text-xs font-semibold text-emerald-900/75 group-hover:text-emerald-950">
                  Ghi nhớ đăng nhập
                </span>
              </label>
            </div>

            {/* Main Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Đăng Nhập Ngay</span>
              )}
            </button>
          </form>

          {/* Separator Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="w-full border-t border-emerald-100" />
            <span className="absolute bg-white px-4 text-xs font-bold text-emerald-900/40 uppercase tracking-wider">
              HOẶC ĐĂNG NHẬP VỚI
            </span>
          </div>

          {/* GOOGLE SIGN IN BUTTON AT THE BOTTOM */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-emerald-100 hover:border-emerald-300 text-emerald-950 font-bold py-3.5 px-4 rounded-2xl shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer group disabled:opacity-50"
          >
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
            <span className="text-sm">Đăng nhập bằng Google</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
