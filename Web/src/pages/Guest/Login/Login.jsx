import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, ArrowLeft, Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react';
import cuteMascotImg from '../../../assets/images/cute_mascot.png';
import qrMascotImg from '../../../assets/images/QR.png';
import mascotImg from '../../../assets/images/mascot.png';
import suggestImg from '../../../assets/images/suggest.png';
import { adminAccount, initialUsers } from '../../../data/adminMockData';

export const Login = ({ onBack, onLoginSuccess }) => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    remember: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

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

    const inputUser = formData.username.trim();
    const inputPass = formData.password.trim();

    if (!inputUser || !inputPass) {
      setError('Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);

      // List of all valid accounts in the system
      const validAccounts = [
        adminAccount,
        ...initialUsers.map((u) => ({
          ...u,
          password: u.password || '123456',
        })),
      ];

      // 1. Check if username & password are correct
      const matchedAccount = validAccounts.find((acc) => {
        const matchesUser =
          acc.username === inputUser ||
          acc.phone === inputUser ||
          acc.email === inputUser;
        const matchesPass = acc.password === inputPass;
        return matchesUser && matchesPass;
      });

      if (!matchedAccount) {
        setError('Tên đăng nhập hoặc mật khẩu không chính xác!');
        return;
      }

      // 2. Check role: if role is admin -> redirect to admin page
      const roleLower = String(matchedAccount.role || '').toLowerCase();
      const isAdmin = roleLower === 'admin' || roleLower.includes('admin');

      if (isAdmin) {
        navigate('/admin/dashboard', { replace: true });
        if (onLoginSuccess) {
          onLoginSuccess(matchedAccount);
        }
      } else {
        alert(`Đăng nhập thành công! Chào mừng ${matchedAccount.name || matchedAccount.username}`);
        navigate('/', { replace: true });
        if (onLoginSuccess) {
          onLoginSuccess(matchedAccount);
        }
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#c8ebd9] via-[#b2e5cb] to-[#99dcba] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden select-none">
      {/* Background Decorative Radial Glow Blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-white/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[600px] h-[600px] bg-emerald-300/30 rounded-full blur-3xl pointer-events-none" />

      {/* Back to Home Button */}
      <button
        onClick={handleBack}
        className="absolute top-6 left-6 z-30 flex items-center gap-2 bg-white/95 hover:bg-emerald-600 text-emerald-950 hover:text-white shadow-md border border-emerald-300/80 px-4.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Quay lại trang chủ</span>
      </button>

      {/* Main Glassmorphic Container */}
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
        <div className="lg:col-span-7 p-8 sm:p-10 lg:p-12 flex flex-col justify-center space-y-6 bg-white relative">
          {/* Header Mobile Logo (visible on small screens) */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-2">
            <img src={cuteMascotImg} alt="Friggy Logo" className="w-9 h-9 object-cover rounded-xl" />
            <div className="flex items-baseline">
              <span className="text-2xl font-black text-emerald-950">Fri</span>
              <span className="text-2xl font-black text-emerald-600">ggy</span>
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block ml-1"></span>
            </div>
          </div>

          {/* Extra Large Floating Mascot Decor flush at top-right corner */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3.0, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 z-10 pointer-events-none"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-300/30 rounded-full blur-2xl pointer-events-none" />
              <img
                src={mascotImg}
                alt="Friggy Mascot Decor"
                className="w-40 sm:w-48 h-40 sm:h-48 object-contain relative z-10 drop-shadow-2xl"
              />
            </div>
          </motion.div>

          {/* Header Section */}
          <div className="space-y-1.5 border-b border-emerald-100/80 pb-5 relative z-20">
            <h2 className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight whitespace-nowrap">
              Đăng Nhập Friggy
            </h2>
            <p className="text-xs sm:text-sm text-emerald-900/65 font-medium max-w-xs sm:max-w-sm">
              Nhập thông tin tài khoản của bạn để tiếp tục sử dụng ứng dụng.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Input Field */}
            <div className="space-y-1.5 relative">
              <label className="block text-xs font-bold text-emerald-950 uppercase tracking-wider">
                Tên Đăng Nhập
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Nhập tên đăng nhập hoặc số điện thoại"
                  className="w-full pl-10 pr-4 py-3.5 bg-white border-2 border-emerald-200 hover:border-emerald-400 rounded-2xl text-sm font-semibold text-emerald-950 placeholder-emerald-800/35 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Password Input Field */}
            <div className="space-y-1.5 relative">
              <label className="block text-xs font-bold text-emerald-950 uppercase tracking-wider">
                Mật Khẩu
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

            {/* Remember Me Checkbox & Forgot Password */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group select-none">
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

              <button
                type="button"
                onClick={() => alert('Vui lòng liên hệ hỗ trợ hoặc nhập lại mật khẩu!')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800 hover:underline transition-colors"
              >
                Quên mật khẩu?
              </button>
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

          {/* Bottom Footer Note for perfect proportion */}
          <div className="pt-2 text-center text-xs text-emerald-900/60 font-medium">
            Chưa có tài khoản?{' '}
            <button
              type="button"
              onClick={() => alert('Chức năng Đăng ký đang được phát triển!')}
              className="font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer ml-1"
            >
              Đăng ký tài khoản mới
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;

