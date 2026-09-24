import React, { useEffect, useState } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, XCircle, Loader2, Users, ArrowRight, Sparkles, Home, ShieldAlert } from 'lucide-react';
import { API_BASE_URL } from '../../utils/constants';
import cuteMascotImg from '../../assets/images/cute_mascot.png';

export default function FamilyInviteAction() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const isReject = location.pathname.includes('/reject');

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Mã Token lời mời không hợp lệ hoặc thiếu trong đường dẫn.');
      return;
    }

    let isMounted = true;
    const endpoint = isReject ? 'reject' : 'accept';

    axios
      .post(`${API_BASE_URL}/family/${endpoint}`, { token })
      .then((res) => {
        if (!isMounted) return;
        setStatus('success');
        const rawMsg = res.data?.message;
        const isGeneric = !rawMsg || rawMsg.toLowerCase() === 'success' || rawMsg.toLowerCase() === 'ok';
        setMessage(
          isGeneric
            ? (isReject
                ? 'Bạn đã từ chối lời mời gia đình thành công.'
                : 'Chúc mừng! Bạn đã tham gia nhóm Gia đình Friggy thành công.')
            : rawMsg
        );
      })
      .catch((err) => {
        if (!isMounted) return;
        setStatus('error');
        const rawMsg = err.response?.data?.message;
        const isGeneric = !rawMsg || rawMsg === 'Error' || rawMsg === 'Bad Request';
        const errorMsg = isGeneric
          ? 'Lời mời đã hết hạn (48 giờ) hoặc mã token không còn tồn tại.'
          : (Array.isArray(rawMsg) ? rawMsg[0] : rawMsg);
        setMessage(errorMsg);
      });

    return () => {
      isMounted = false;
    };
  }, [token, isReject]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EAF8F0] via-[#F4FBF7] to-[#E5F6EC] text-[#19221C] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-300/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-teal-300/30 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-xl border border-emerald-100 rounded-3xl p-8 shadow-2xl shadow-emerald-900/10 text-center overflow-hidden">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#008435] via-[#40916c] to-[#008435]" />

        {/* Brand Header Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gradient-to-tr from-emerald-500 to-green-400 p-0.5 shadow-md shadow-emerald-500/20">
            <img
              src={cuteMascotImg}
              alt="Friggy Mascot"
              className="w-full h-full object-cover rounded-xl bg-white"
            />
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-extrabold text-[#19221C]">Fri</span>
            <span className="text-2xl font-extrabold text-[#008435]">ggy</span>
            <span className="w-2 h-2 rounded-full bg-[#008435] ml-0.5" />
          </div>
          <span className="ml-2 bg-emerald-50 text-[#008435] border border-emerald-200/80 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
            Family
          </span>
        </div>

        {/* STATE: LOADING */}
        {status === 'loading' && (
          <div className="py-8 flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-[#008435] animate-spin mb-4" />
            <h2 className="text-xl font-bold text-[#19221C] mb-2">Đang xác thực lời mời...</h2>
            <p className="text-sm text-gray-500">Vui lòng chờ trong giây lát</p>
          </div>
        )}

        {/* STATE: SUCCESS */}
        {status === 'success' && (
          <div className="py-2 flex flex-col items-center animate__animated animate__fadeIn">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 shadow-xl ${
              isReject
                ? 'bg-amber-50 border-2 border-amber-400 text-amber-600 shadow-amber-500/20'
                : 'bg-emerald-50 border-2 border-[#008435] text-[#008435] shadow-emerald-600/20'
            }`}>
              {isReject ? (
                <Users className="w-10 h-10 text-amber-600" />
              ) : (
                <CheckCircle2 className="w-10 h-10 text-[#008435]" />
              )}
            </div>

            <h2 className="text-2xl font-black text-[#19221C] mb-4 tracking-tight">
              {isReject ? 'Đã Từ Chối Lời Mời' : 'Xác Nhận Thành Công!'}
            </h2>

            <p className="text-sm text-gray-600 leading-relaxed mb-6 px-1 font-medium">{message}</p>

            {!isReject && (
              <div className="w-full bg-[#F4FBF7] border border-emerald-200/80 rounded-2xl p-4 mb-6 text-left text-xs text-emerald-950 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-[#008435]">
                  <Sparkles className="w-4 h-4" />
                  <span>Đặc quyền nhóm Gia Đình của bạn:</span>
                </div>
                <p className="text-gray-700">• Sử dụng đầy đủ trợ lý AI của bếp & gợi ý thực đơn tuần.</p>
                <p className="text-gray-700">• Quản lý danh sách thực phẩm trong tủ lạnh chung.</p>
                <p className="text-gray-700">• Nhận cảnh báo thực phẩm sắp hết hạn theo thời gian thực.</p>
              </div>
            )}

            <div className="w-full">
              <button
                onClick={() => navigate('/')}
                className="w-full py-3.5 px-6 bg-[#008435] hover:bg-[#006428] text-white font-bold rounded-2xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Về Trang Chủ Friggy</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE: ERROR */}
        {status === 'error' && (
          <div className="py-2 flex flex-col items-center animate__animated animate__fadeIn">
            <div className="w-20 h-20 rounded-full bg-rose-50 border-2 border-rose-400 flex items-center justify-center mb-5 shadow-xl shadow-rose-500/20">
              <XCircle className="w-10 h-10 text-rose-500" />
            </div>

            <h2 className="text-2xl font-black text-[#19221C] mb-4 tracking-tight">
              Không Thể Xác Nhận
            </h2>

            <p className="text-sm text-gray-600 leading-relaxed mb-6 px-1 font-medium">{message}</p>

            <div className="w-full bg-rose-50/80 border border-rose-200 rounded-2xl p-4 mb-6 text-left text-xs text-rose-950">
              <div className="flex items-center gap-1.5 font-bold text-rose-700 mb-1">
                <ShieldAlert className="w-4 h-4" />
                <span>Hướng giải quyết:</span>
              </div>
              <p className="text-gray-700 leading-relaxed">
                Lời mời tham gia gia đình chỉ có hiệu lực trong <strong>48 giờ</strong>. Bạn có thể nhờ chủ gia đình gửi lại lời mời mới hoặc nhập mã Token trực tiếp trên App Mobile.
              </p>
            </div>

            <button
              onClick={() => navigate('/')}
              className="w-full py-3.5 px-6 bg-[#008435] hover:bg-[#006428] text-white font-bold rounded-2xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>Về Trang Chủ</span>
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-gray-100 text-[11.5px] text-gray-400 font-medium">
          Friggy 🥬 — Tủ lạnh thông minh & Gia đình
        </div>
      </div>
    </div>
  );
}
