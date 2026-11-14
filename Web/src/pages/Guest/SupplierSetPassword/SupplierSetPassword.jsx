import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Store,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { setSupplierPasswordApi } from '../../../services/supplierService';
import { showToast } from '../../../components/common/Toast';
import cuteMascotImg from '../../../assets/images/cute_mascot.png';

export const SupplierSetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Mã liên kết xác thực (token) không hợp lệ hoặc đã bị thiếu. Vui lòng mở đúng đường dẫn được gửi trong email của bạn.');
      return;
    }

    if (password.length < 8) {
      setError('Mật khẩu phải có tối thiểu 8 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      const res = await setSupplierPasswordApi({
        token: token.trim(),
        password: password.trim(),
      });

      setSuccess(true);
      showToast.success(res?.message || 'Mật khẩu đã được thiết lập thành công!');
    } catch (err) {
      const msg = err.message || 'Thiết lập mật khẩu thất bại. Đường link có thể đã hết hạn hoặc đã được sử dụng.';
      setError(msg);
      showToast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf7f0] via-[#fffdfa] to-[#fbf7ee] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center gap-1 mb-2">
            <span className="text-2xl font-black tracking-tight text-[#1b4332]">Fri</span>
            <span className="text-2xl font-black text-amber-600">ggy</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 text-[10px] font-black border border-amber-300 uppercase tracking-wider ml-1.5 flex items-center gap-1">
              <Store className="w-3 h-3" />
              ĐỐI TÁC CUNG ỨNG
            </span>
          </div>
          <h2 className="mt-2 text-xl font-black text-slate-800">
            Kích Hoạt & Đặt Mật Khẩu
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Đơn đăng ký của bạn đã được Admin phê duyệt. Vui lòng tạo mật khẩu để truy cập Cổng Đối Tác.
          </p>
        </div>

        {/* Card */}
        <div className="mt-6 bg-white py-8 px-6 sm:px-8 rounded-3xl shadow-xl border border-amber-200/70 relative">
          {!token && (
            <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Không tìm thấy mã xác thực (Token)!</p>
                <p className="mt-0.5 text-rose-700">
                  Vui lòng kiểm tra lại liên kết trong email gửi từ Friggy hoặc liên hệ Ban quản trị để được hỗ trợ.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate__animated animate__shakeX">
              {error}
            </div>
          )}

          {success ? (
            <div className="text-center py-4 space-y-4 animate__animated animate__fadeIn">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">
                  Đặt Mật Khẩu Thành Công!
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tài khoản của bạn đã được kích hoạt. Hãy đăng nhập bằng email đã đăng ký và mật khẩu mới để bắt đầu.
                </p>
              </div>

              <button
                onClick={() => navigate('/login?redirect=/supplier/dashboard', { replace: true })}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Đăng Nhập Cổng Đối Tác</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự"
                    required
                    minLength={8}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Xác nhận lại mật khẩu <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    required
                    minLength={8}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2">
                <KeyRound className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  Mật khẩu này sẽ dùng để đăng nhập vào Cổng Nhà Cung Cấp Friggy để quản lý nguyên liệu và gói dịch vụ.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Đang kích hoạt...' : 'Kích Hoạt Tài Khoản & Lưu Mật Khẩu'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-slate-400">
            <Link to="/login" className="text-amber-800 hover:text-amber-950 font-bold underline">
              Quay lại trang Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierSetPassword;

