import React, { useEffect, useState } from 'react';
import {
  X,
  User,
  Mail,
  Calendar,
  Shield,
  Refrigerator,
  Sparkles,
  PackageCheck,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Clock,
  Heart,
  Utensils,
  Smartphone,
  LogOut,
  RefreshCw,
  Sliders,
  RotateCcw,
  Globe,
} from 'lucide-react';
import {
  getAdminUserDetailApi,
  getUserSessionsApi,
  revokeAllUserSessionsApi,
  revokeUserSessionApi,
  getUserAiQuotaApi,
  updateUserAiQuotaApi,
  resetUserAiQuotaApi,
} from '../../../services/adminService';
import { showToast } from '../../../components/common/Toast';

const resolveAvatarUrl = (rawUrl) => {
  if (!rawUrl) return null;
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

export const UserDetailModal = ({ user: initialUser, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'sessions' | 'ai-quota'
  const [userDetail, setUserDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);

  // AI Quota state
  const [aiQuota, setAiQuota] = useState(null);
  const [loadingQuota, setLoadingQuota] = useState(false);
  const [newWeeklyLimit, setNewWeeklyLimit] = useState('');
  const [savingQuota, setSavingQuota] = useState(false);
  const [resettingQuota, setResettingQuota] = useState(false);

  useEffect(() => {
    if (!initialUser?.id) return;
    let isMounted = true;
    setLoading(true);

    getAdminUserDetailApi(initialUser.id)
      .then((res) => {
        if (!isMounted) return;
        const data = res?.data || res;
        setUserDetail(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Lỗi lấy chi tiết user:', err);
        showToast.error(err.message || 'Không thể tải chi tiết người dùng');
        setUserDetail(initialUser);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialUser]);

  // Load Sessions
  const fetchSessions = async () => {
    if (!initialUser?.id) return;
    setLoadingSessions(true);
    try {
      const res = await getUserSessionsApi(initialUser.id);
      const data = res?.data || res;
      setSessions(Array.isArray(data) ? data : data.sessions || []);
    } catch (err) {
      console.warn('Lỗi lấy danh sách sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  // Load AI Quota
  const fetchAiQuota = async () => {
    if (!initialUser?.id) return;
    setLoadingQuota(true);
    try {
      const res = await getUserAiQuotaApi(initialUser.id);
      const data = res?.data || res;
      setAiQuota(data);
      if (data && data.weeklyLimit !== undefined) {
        setNewWeeklyLimit(String(data.weeklyLimit));
      }
    } catch (err) {
      console.warn('Lỗi lấy quota AI:', err);
    } finally {
      setLoadingQuota(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchSessions();
    } else if (activeTab === 'ai-quota') {
      fetchAiQuota();
    }
  }, [activeTab]);

  const handleRevokeSingleSession = async (sessionId) => {
    setRevokingSessionId(sessionId);
    try {
      await revokeUserSessionApi(initialUser.id, sessionId);
      showToast.success('Đã hủy phiên đăng nhập thành công!');
      fetchSessions();
    } catch (err) {
      showToast.error(err.message || 'Hủy phiên thất bại');
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    setRevokingAll(true);
    try {
      await revokeAllUserSessionsApi(initialUser.id);
      showToast.success('Đã đăng xuất người dùng khỏi tất cả các thiết bị!');
      fetchSessions();
    } catch (err) {
      showToast.error(err.message || 'Thao tác thất bại');
    } finally {
      setRevokingAll(false);
    }
  };

  const handleSaveAiQuota = async (e) => {
    e.preventDefault();
    setSavingQuota(true);
    try {
      const limit = Number(newWeeklyLimit);
      await updateUserAiQuotaApi(initialUser.id, { weeklyLimit: limit });
      showToast.success('Cập nhật hạn mức AI thành công!');
      fetchAiQuota();
    } catch (err) {
      showToast.error(err.message || 'Cập nhật quota thất bại');
    } finally {
      setSavingQuota(false);
    }
  };

  const handleResetAiQuota = async () => {
    setResettingQuota(true);
    try {
      await resetUserAiQuotaApi(initialUser.id);
      showToast.success('Đã reset số lượt dùng AI của user về 0!');
      fetchAiQuota();
    } catch (err) {
      showToast.error(err.message || 'Reset quota thất bại');
    } finally {
      setResettingQuota(false);
    }
  };

  if (!initialUser) return null;

  const displayUser = userDetail || initialUser;
  const isSuspended = displayUser.status === 'suspended' || displayUser.status === 'Banned';

  const formattedDate = displayUser.createdAt
    ? new Date(displayUser.createdAt).toLocaleDateString('vi-VN')
    : 'Chưa cập nhật';

  const lastLoginFormatted = displayUser.lastLoginAt
    ? new Date(displayUser.lastLoginAt).toLocaleString('vi-VN')
    : 'Chưa đăng nhập';

  const avatarUrl =
    resolveAvatarUrl(displayUser.profile?.avatarUrl) ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
      displayUser.name || displayUser.googleEmail || 'User'
    )}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate__animated animate__fadeIn animate__faster">
      <div className="w-full max-w-xl bg-white rounded-[36px] shadow-2xl border border-slate-100 overflow-hidden relative animate__animated animate__zoomIn animate__faster">
        {/* Top Header Graphic */}
        <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 p-6 sm:p-7 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={avatarUrl}
                alt="User Avatar"
                className="w-16 h-16 rounded-3xl object-cover border-2 border-white/40 shadow-md bg-white"
              />
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                  isSuspended ? 'bg-rose-500' : 'bg-emerald-400'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black">{displayUser.name || displayUser.googleEmail || 'Người dùng Friggy'}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white/20 text-white border border-white/30">
                  {displayUser.role || 'User'}
                </span>
              </div>
              <p className="text-xs text-white/80 font-mono mt-0.5">{displayUser.id}</p>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-2 mt-5 pt-3 border-t border-white/20">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Tổng quan
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'sessions'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Phiên Đăng Nhập</span>
            </button>
            <button
              onClick={() => setActiveTab('ai-quota')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ai-quota'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Hạn Mức AI</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            <p className="text-xs font-bold text-slate-400">Đang tải thông tin chi tiết...</p>
          </div>
        ) : (
          <div className="p-6 sm:p-7 space-y-5">
            {/* ── Tab: Overview ────────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-teal-600" />
                      Địa chỉ Email
                    </span>
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {displayUser.email || displayUser.googleEmail || 'Chưa cập nhật'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-teal-600" />
                      Phương Thức Đăng Nhập
                    </span>
                    <p className="text-xs font-bold text-slate-900 capitalize">
                      {displayUser.authProvider || 'Email / Google'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <PackageCheck className="w-3.5 h-3.5 text-teal-600" />
                      Gói Dịch Vụ
                    </span>
                    <p className="text-xs font-black text-teal-700">
                      {displayUser.subscription?.plan?.displayName ||
                        displayUser.subscription?.plan?.name ||
                        'Gói Miễn Phí (FREE)'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      Ngày Tham Gia
                    </span>
                    <p className="text-xs font-bold text-slate-900">{formattedDate}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Thông Tin Bổ Sung</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-teal-600 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold">Đăng nhập gần nhất</p>
                        <p className="font-bold text-slate-800">{lastLoginFormatted}</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold">Sử dụng AI trong tuần</p>
                        <p className="font-bold text-slate-800">{displayUser.aiUsageThisWeek ?? 0} lần</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Tab: Sessions ────────────────────────────────────────── */}
            {activeTab === 'sessions' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600">
                    Thiết bị đang đăng nhập: <strong className="text-slate-900">{sessions.length}</strong>
                  </span>
                  {sessions.length > 0 && (
                    <button
                      onClick={handleRevokeAllSessions}
                      disabled={revokingAll}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {revokingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                      <span>Đăng xuất tất cả thiết bị</span>
                    </button>
                  )}
                </div>

                {loadingSessions ? (
                  <div className="py-8 text-center">
                    <Loader2 className="w-6 h-6 text-teal-600 animate-spin mx-auto" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-50 text-center text-slate-400 text-xs">
                    Người dùng hiện không có phiên đăng nhập nào đang hoạt động.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {sessions.map((s, idx) => (
                      <div
                        key={s.id || idx}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-teal-600" />
                            <span>{s.device || s.userAgent || 'Thiết bị di động / Trình duyệt'}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            IP: {s.ipAddress || s.ip || '—'} • Đăng nhập:{' '}
                            {s.createdAt ? new Date(s.createdAt).toLocaleDateString('vi-VN') : 'Gần đây'}
                          </div>
                        </div>

                        <button
                          onClick={() => handleRevokeSingleSession(s.id || s.sessionId)}
                          disabled={Boolean(revokingSessionId)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-[11px] cursor-pointer"
                        >
                          {revokingSessionId === (s.id || s.sessionId) ? 'Đang hủy...' : 'Hủy phiên'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: AI Quota ────────────────────────────────────────── */}
            {activeTab === 'ai-quota' && (
              <div className="space-y-4 text-xs font-semibold">
                {loadingQuota ? (
                  <div className="py-8 text-center">
                    <Loader2 className="w-6 h-6 text-teal-600 animate-spin mx-auto" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Đã dùng trong tuần</span>
                        <p className="text-xl font-black text-slate-900 mt-1">
                          {aiQuota?.usedThisWeek ?? displayUser.aiUsageThisWeek ?? 0} <span className="text-xs text-slate-400">lượt</span>
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Hạn mức hàng tuần</span>
                        <p className="text-xl font-black text-teal-700 mt-1">
                          {aiQuota?.weeklyLimit === -1 ? 'Không giới hạn' : `${aiQuota?.weeklyLimit ?? 20} lượt`}
                        </p>
                      </div>
                    </div>

                    {/* Reset Quota Action */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200">
                      <div>
                        <div className="font-extrabold text-amber-900">Reset số lượt gọi AI về 0</div>
                        <div className="text-[10px] text-amber-700">Khôi phục quota ngay lập tức cho tuần hiện tại</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetAiQuota}
                        disabled={resettingQuota}
                        className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {resettingQuota ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                        <span>Reset Quota</span>
                      </button>
                    </div>

                    {/* Override Weekly Limit Form */}
                    <form onSubmit={handleSaveAiQuota} className="space-y-3 pt-2">
                      <label className="block text-slate-700 font-bold">
                        Điều chỉnh hạn mức AI tuần (Override)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={newWeeklyLimit}
                          onChange={(e) => setNewWeeklyLimit(e.target.value)}
                          placeholder="Ví dụ: 50 (-1 là không giới hạn)"
                          className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-xs text-slate-900 outline-hidden focus:border-teal-500"
                        />
                        <button
                          type="submit"
                          disabled={savingQuota}
                          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
                        >
                          {savingQuota ? 'Đang Lưu...' : 'Cập Nhật Quota'}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Nhập <code className="font-bold text-slate-700">-1</code> để cấp quyền gọi AI không giới hạn số lần cho tài khoản này.
                      </p>
                    </form>
                  </>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDetailModal;
