import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  Phone,
  Mail,
  Clock,
  Download,
  QrCode,
  Image as ImageIcon,
  Upload,
  RotateCcw,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Sparkles,
  Info,
} from 'lucide-react';
import { getSystemSettings, saveSystemSettings } from '../../../utils/systemSettings';
import {
  getAdminTokenConfigApi,
  updateAdminTokenConfigApi,
  getAdminOtpConfigApi,
  updateAdminOtpConfigApi,
} from '../../../services/adminService';
import { showToast } from '../../../components/common/Toast';
import defaultQrCode from '../../../assets/images/qr_code.png';

const TTL_REGEX = /^\d+[smhd]$/;

export const AdminSettings = () => {
  const [activeSubTab, setActiveSubTab] = useState('token');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [generalConfig, setGeneralConfig] = useState(() => getSystemSettings());

  // ─── Token TTL State ───────────────────────────────────────
  const [tokenConfig, setTokenConfig] = useState({
    accessTokenTtl: '15m',
    refreshTokenTtl: '7d',
  });
  const [loadingToken, setLoadingToken] = useState(false);
  const [savingToken, setSavingToken] = useState(false);

  // ─── OTP & Security State ──────────────────────────────────
  const [otpConfig, setOtpConfig] = useState({
    ttlSeconds: 300,
    maxAttempts: 5,
  });
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [savingOtp, setSavingOtp] = useState(false);

  // ─── Load configs on mount ─────────────────────────────────
  useEffect(() => {
    setGeneralConfig(getSystemSettings());
    fetchTokenConfig();
    fetchOtpConfig();
  }, []);

  const fetchTokenConfig = async () => {
    setLoadingToken(true);
    try {
      const res = await getAdminTokenConfigApi();
      const data = res?.data || res;
      if (data) {
        setTokenConfig({
          accessTokenTtl: data.accessTokenTtl || '15m',
          refreshTokenTtl: data.refreshTokenTtl || '7d',
        });
      }
    } catch (err) {
      console.warn('Lỗi lấy cấu hình Token TTL:', err);
    } finally {
      setLoadingToken(false);
    }
  };

  const fetchOtpConfig = async () => {
    setLoadingOtp(true);
    try {
      const res = await getAdminOtpConfigApi();
      const data = res?.data || res;
      if (data) {
        setOtpConfig({
          ttlSeconds: data.ttlSeconds ?? 300,
          maxAttempts: data.maxAttempts ?? 5,
        });
      }
    } catch (err) {
      console.warn('Lỗi lấy cấu hình OTP:', err);
    } finally {
      setLoadingOtp(false);
    }
  };

  // ─── General handlers ──────────────────────────────────────
  const handleChangeGeneral = (e) => {
    const { name, value } = e.target;
    setGeneralConfig((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleQrFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      showToast.error('Kích thước ảnh vượt quá 3MB! Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result;
      if (base64String) {
        setGeneralConfig((prev) => ({
          ...prev,
          qrImageUrl: base64String,
        }));
        showToast.success('Đã chọn ảnh mã QR! Bấm "Lưu Cấu Hình Hệ Thống" để áp dụng.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetQr = () => {
    setGeneralConfig((prev) => ({
      ...prev,
      qrImageUrl: '',
    }));
    showToast.info('Đã khôi phục mã QR Code về mặc định hệ thống.');
  };

  const handleSaveGeneral = (e) => {
    e.preventDefault();
    saveSystemSettings(generalConfig);
    showToast.success('Cập nhật cấu hình hệ thống thành công!');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  // ─── Token handlers ────────────────────────────────────────
  const handleSaveTokenConfig = async (e) => {
    e.preventDefault();
    const { accessTokenTtl, refreshTokenTtl } = tokenConfig;

    if (!TTL_REGEX.test(accessTokenTtl)) {
      showToast.error('Access Token TTL không hợp lệ! Vui lòng nhập số kèm đơn vị s, m, h, d (VD: 15m, 1h).');
      return;
    }
    if (!TTL_REGEX.test(refreshTokenTtl)) {
      showToast.error('Refresh Token TTL không hợp lệ! Vui lòng nhập số kèm đơn vị s, m, h, d (VD: 7d, 30d).');
      return;
    }

    setSavingToken(true);
    try {
      const res = await updateAdminTokenConfigApi({
        accessTokenTtl,
        refreshTokenTtl,
      });
      const data = res?.data || res;
      if (data) {
        setTokenConfig({
          accessTokenTtl: data.accessTokenTtl || accessTokenTtl,
          refreshTokenTtl: data.refreshTokenTtl || refreshTokenTtl,
        });
      }
      showToast.success('Đã cập nhật thời hạn Token (TTL) thành công!');
    } catch (err) {
      console.error('Lỗi lưu Token config:', err);
      showToast.error(err.message || 'Lỗi khi cập nhật Token config');
    } finally {
      setSavingToken(false);
    }
  };

  // ─── OTP handlers ──────────────────────────────────────────
  const handleSaveOtpConfig = async (e) => {
    e.preventDefault();
    const attempts = Number(otpConfig.maxAttempts);
    const ttl = Number(otpConfig.ttlSeconds);

    if (isNaN(attempts) || attempts < 3 || attempts > 10) {
      showToast.error('Số lần thử tối đa trước khi khóa phải từ 3 đến 10 lần!');
      return;
    }
    if (isNaN(ttl) || ttl < 60 || ttl > 900) {
      showToast.error('Thời gian sống OTP phải từ 60 giây (1 phút) đến 900 giây (15 phút)!');
      return;
    }

    setSavingOtp(true);
    try {
      const res = await updateAdminOtpConfigApi({
        maxAttempts: attempts,
        ttlSeconds: ttl,
      });
      const data = res?.data || res;
      if (data) {
        setOtpConfig({
          maxAttempts: data.maxAttempts ?? attempts,
          ttlSeconds: data.ttlSeconds ?? ttl,
        });
      }
      showToast.success('Đã cập nhật cấu hình bảo mật OTP và khóa tài khoản thành công!');
    } catch (err) {
      console.error('Lỗi lưu OTP config:', err);
      showToast.error(err.message || 'Lỗi khi cập nhật cấu hình OTP');
    } finally {
      setSavingOtp(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate__animated animate__fadeIn animate__faster">
      {/* Top Banner */}
      <div className="animate__animated animate__fadeInDown p-6 sm:p-8 rounded-[32px] bg-white border border-emerald-100 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight flex items-center gap-2">
            <span>Thiết Lập & Cấu Hình Hệ Thống</span>
            <Settings className="w-5 h-5 text-emerald-600" />
          </h3>
          <p className="text-xs sm:text-sm text-emerald-900/65 font-medium mt-1">
            Quản lý thời hạn Token, quy tắc khóa tài khoản khi nhập sai OTP, thông tin hỗ trợ và liên kết ứng dụng.
          </p>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-emerald-200/80 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('token')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'token'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-emerald-900 hover:bg-emerald-50'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Thời Hạn Token (JWT)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('otp')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'otp'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-emerald-900 hover:bg-emerald-50'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Bảo Mật OTP & Khóa Tài Khoản</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('contact')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'contact'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-emerald-900 hover:bg-emerald-50'
          }`}
        >
          <Phone className="w-4 h-4" />
          <span>Thông Tin Liên Hệ & Hỗ Trợ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('download')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'download'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-emerald-900 hover:bg-emerald-50'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Link Tải Ứng Dụng</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('qrcode')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'qrcode'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-emerald-900 hover:bg-emerald-50'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Mã QR Code</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB: TOKEN TTL (API: /api/v1/admin/system-config/token)
      ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'token' && (
        <form
          onSubmit={handleSaveTokenConfig}
          className="animate__animated animate__fadeInUp p-6 sm:p-8 rounded-[32px] bg-white border border-emerald-100 shadow-xs space-y-6"
        >
          <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
            <div>
              <h4 className="text-base font-black text-emerald-950 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-600" />
                <span>Tùy Chỉnh Thời Hạn Token Xác Thực (JWT TTL)</span>
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-1">
                API Endpoint: <code className="bg-slate-100 text-emerald-800 px-2 py-0.5 rounded font-mono text-[11px]">PATCH /api/v1/admin/system-config/token</code>. Thay đổi có hiệu lực ngay với các token mới sinh.
              </p>
            </div>
            {loadingToken && <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Access Token TTL */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Access Token TTL</span>
                </label>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Hiện tại: {tokenConfig.accessTokenTtl}
                </span>
              </div>

              <input
                type="text"
                value={tokenConfig.accessTokenTtl}
                onChange={(e) => setTokenConfig((prev) => ({ ...prev, accessTokenTtl: e.target.value.trim() }))}
                placeholder="VD: 15m, 30m, 1h, 24h"
                required
                className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 outline-hidden transition-all"
              />

              <div className="space-y-1.5 text-xs text-slate-500 font-medium">
                <p>Thời gian sống của mã phiên ngắn hạn. Người dùng dùng token này để gọi API.</p>
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-slate-400 font-bold">Gợi ý nhanh:</span>
                  {['15m', '30m', '1h', '2h', '24h'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTokenConfig((prev) => ({ ...prev, accessTokenTtl: preset }))}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                        tokenConfig.accessTokenTtl === preset
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Refresh Token TTL */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-teal-600" />
                  <span>Refresh Token TTL</span>
                </label>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  Hiện tại: {tokenConfig.refreshTokenTtl}
                </span>
              </div>

              <input
                type="text"
                value={tokenConfig.refreshTokenTtl}
                onChange={(e) => setTokenConfig((prev) => ({ ...prev, refreshTokenTtl: e.target.value.trim() }))}
                placeholder="VD: 7d, 14d, 30d, 60d"
                required
                className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 outline-hidden transition-all"
              />

              <div className="space-y-1.5 text-xs text-slate-500 font-medium">
                <p>Thời gian duy trì đăng nhập dài hạn. Hết thời gian này user buộc phải đăng nhập lại.</p>
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-slate-400 font-bold">Gợi ý nhanh:</span>
                  {['7d', '14d', '30d', '60d', '90d'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTokenConfig((prev) => ({ ...prev, refreshTokenTtl: preset }))}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                        tokenConfig.refreshTokenTtl === preset
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-950 font-medium flex items-start gap-3">
            <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Quy chuẩn định dạng TTL:</p>
              <p className="text-emerald-900/80 mt-0.5">
                Định dạng gồm chữ số + đơn vị: <code className="font-bold">s</code> (giây), <code className="font-bold">m</code> (phút), <code className="font-bold">h</code> (giờ), <code className="font-bold">d</code> (ngày). Ví dụ: <code className="bg-white px-1.5 py-0.5 rounded font-bold border border-emerald-200">15m</code>, <code className="bg-white px-1.5 py-0.5 rounded font-bold border border-emerald-200">1h</code>, <code className="bg-white px-1.5 py-0.5 rounded font-bold border border-emerald-200">7d</code>, <code className="bg-white px-1.5 py-0.5 rounded font-bold border border-emerald-200">30d</code>.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-emerald-100 flex justify-end">
            <button
              type="submit"
              disabled={savingToken}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-102 disabled:opacity-50"
            >
              {savingToken ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang Lưu Cấu Hình Token...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Lưu Cấu Hình Token TTL</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB: OTP CONFIG & ACC LOCK (API: /api/v1/admin/system-config/otp)
      ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'otp' && (
        <form
          onSubmit={handleSaveOtpConfig}
          className="animate__animated animate__fadeInUp p-6 sm:p-8 rounded-[32px] bg-white border border-emerald-100 shadow-xs space-y-6"
        >
          <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
            <div>
              <h4 className="text-base font-black text-emerald-950 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Cấu Hình Khóa Tài Khoản Khi Nhập Sai & Thời Hạn OTP</span>
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-1">
                API Endpoint: <code className="bg-slate-100 text-emerald-800 px-2 py-0.5 rounded font-mono text-[11px]">PATCH /api/v1/admin/system-config/otp</code>. Giới hạn số lần thử sai để phòng ngừa brute-force attack.
              </p>
            </div>
            {loadingOtp && <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Max Attempts Before Lock */}
            <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-emerald-600" />
                  <span>Số Lần Nhập Sai Tối Đa Trước Khi Khóa</span>
                </label>
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {otpConfig.maxAttempts} Lần
                </span>
              </div>

              <div className="space-y-2">
                <input
                  type="number"
                  min={3}
                  max={10}
                  value={otpConfig.maxAttempts}
                  onChange={(e) => setOtpConfig((prev) => ({ ...prev, maxAttempts: parseInt(e.target.value) || 3 }))}
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-2xl text-xs sm:text-sm font-black text-slate-900 outline-hidden transition-all"
                />
                <input
                  type="range"
                  min={3}
                  max={10}
                  value={otpConfig.maxAttempts}
                  onChange={(e) => setOtpConfig((prev) => ({ ...prev, maxAttempts: parseInt(e.target.value) || 3 }))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                <p>
                  Giới hạn hợp lệ từ <strong>3 đến 10 lần</strong>. Khi người dùng nhập sai vượt quá ngưỡng này, mã OTP sẽ bị hủy và khóa lượt xác thực để bảo vệ tài khoản.
                </p>
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-slate-400 font-bold">Chọn nhanh:</span>
                  {[3, 5, 8, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setOtpConfig((prev) => ({ ...prev, maxAttempts: num }))}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                        otpConfig.maxAttempts === num
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400'
                      }`}
                    >
                      {num} lần {num === 5 ? '(Khuyên dùng)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* OTP TTL Seconds */}
            <div className="p-5 rounded-2xl bg-teal-50/50 border border-teal-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <span>Thời Gian Hiệu Lực Của Mã OTP</span>
                </label>
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  {otpConfig.ttlSeconds}s (~{Math.floor(otpConfig.ttlSeconds / 60)} phút)
                </span>
              </div>

              <div className="space-y-2">
                <input
                  type="number"
                  min={60}
                  max={900}
                  step={30}
                  value={otpConfig.ttlSeconds}
                  onChange={(e) => setOtpConfig((prev) => ({ ...prev, ttlSeconds: parseInt(e.target.value) || 60 }))}
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 rounded-2xl text-xs sm:text-sm font-black text-slate-900 outline-hidden transition-all"
                />
                <input
                  type="range"
                  min={60}
                  max={900}
                  step={30}
                  value={otpConfig.ttlSeconds}
                  onChange={(e) => setOtpConfig((prev) => ({ ...prev, ttlSeconds: parseInt(e.target.value) || 60 }))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                <p>
                  Thời gian sống của mã OTP gửi qua email (từ <strong>60s đến 900s</strong>, tức 1 đến 15 phút).
                </p>
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-slate-400 font-bold">Chọn nhanh:</span>
                  {[
                    { label: '1 phút (60s)', val: 60 },
                    { label: '3 phút (180s)', val: 180 },
                    { label: '5 phút (300s)', val: 300 },
                    { label: '10 phút (600s)', val: 600 },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setOtpConfig((prev) => ({ ...prev, ttlSeconds: item.val }))}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                        otpConfig.ttlSeconds === item.val
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Security Summary Box */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 text-xs text-slate-700 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-slate-900">Chính sách bảo mật người dùng:</p>
              <p>
                Mã xác thực đăng ký hoặc đặt lại mật khẩu sẽ hết hạn sau <strong className="text-teal-700">{otpConfig.ttlSeconds} giây</strong>. Nếu kẻ xấu cố tình đoán mã liên tục quá <strong className="text-emerald-700">{otpConfig.maxAttempts} lần</strong>, hệ thống sẽ tự động hủy phiên OTP và bắt buộc tạo yêu cầu mới.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-emerald-100 flex justify-end">
            <button
              type="submit"
              disabled={savingOtp}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-102 disabled:opacity-50"
            >
              {savingOtp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang Lưu Cấu Hình OTP...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Lưu Cấu Hình Khóa & OTP</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB: GENERAL SETTINGS (Contact, Download, QR)
      ───────────────────────────────────────────────────────────── */}
      {(activeSubTab === 'contact' || activeSubTab === 'download' || activeSubTab === 'qrcode') && (
        <form
          onSubmit={handleSaveGeneral}
          className="animate__animated animate__fadeInUp p-6 sm:p-8 rounded-[32px] bg-white border border-emerald-100 shadow-xs space-y-6"
        >
          {/* Tab: Contact */}
          {activeSubTab === 'contact' && (
            <div className="space-y-4">
              <h4 className="text-sm font-black text-emerald-950 border-b border-emerald-100 pb-3 flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>Thông Tin Liên Hệ & Trợ Giúp</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Hotline / SĐT Hỗ Trợ</span>
                  </label>
                  <input
                    type="text"
                    name="supportHotline"
                    value={generalConfig.supportHotline || ''}
                    onChange={handleChangeGeneral}
                    placeholder="VD: 1900 8888 - 0988 123 456"
                    className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl text-xs font-semibold text-slate-900 outline-hidden transition-all"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Email Trợ Giúp</span>
                  </label>
                  <input
                    type="email"
                    name="supportEmail"
                    value={generalConfig.supportEmail || ''}
                    onChange={handleChangeGeneral}
                    placeholder="VD: support@friggy.app"
                    className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl text-xs font-semibold text-slate-900 outline-hidden transition-all"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Thời Gian Làm Việc</span>
                  </label>
                  <input
                    type="text"
                    name="workingHours"
                    value={generalConfig.workingHours || ''}
                    onChange={handleChangeGeneral}
                    placeholder="VD: Hỗ trợ 24/7 (Phản hồi trong 5 phút)"
                    className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl text-xs font-semibold text-slate-900 outline-hidden transition-all"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab: Download */}
          {activeSubTab === 'download' && (
            <div className="space-y-4">
              <h4 className="text-sm font-black text-emerald-950 border-b border-emerald-100 pb-3 flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Link Tải Ứng Dụng Di Động</span>
              </h4>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Link Tải Ứng Dụng (Download URL)</span>
                </label>
                <input
                  type="text"
                  name="downloadUrl"
                  value={generalConfig.downloadUrl || ''}
                  onChange={handleChangeGeneral}
                  placeholder="VD: https://friggy.ai/download"
                  className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl text-xs font-semibold text-slate-900 outline-hidden transition-all"
                />
              </div>
            </div>
          )}

          {/* Tab: QR Code */}
          {activeSubTab === 'qrcode' && (
            <div className="space-y-4">
              <h4 className="text-sm font-black text-emerald-950 border-b border-emerald-100 pb-3 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>Cấu Hình Mã QR Code Tải App</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-2 space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Dán Link URL Ảnh Mã QR</span>
                    </label>
                    <input
                      type="text"
                      name="qrImageUrl"
                      value={generalConfig.qrImageUrl || ''}
                      onChange={handleChangeGeneral}
                      placeholder="https://... hoặc data:image/png;base64,..."
                      className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl text-xs font-semibold text-slate-900 outline-hidden transition-all"
                    />
                  </div>

                  <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h5 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Hoặc Tải File Ảnh Từ Máy Tính</span>
                      </h5>
                    </div>

                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="qr-upload-input"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Chọn Ảnh File</span>
                      </label>
                      <input
                        id="qr-upload-input"
                        type="file"
                        accept="image/*"
                        onChange={handleQrFileUpload}
                        className="hidden"
                      />

                      {generalConfig.qrImageUrl && (
                        <button
                          type="button"
                          onClick={handleResetQr}
                          className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title="Khôi phục QR mặc định"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Mặc định</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                  <span className="text-xs font-bold text-slate-600 mb-2">Xem Trước Mã QR Phía User</span>
                  <img
                    src={generalConfig.qrImageUrl || defaultQrCode}
                    alt="QR Code Preview"
                    className="w-32 h-32 object-contain rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs"
                    onError={(e) => {
                      e.target.src = defaultQrCode;
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit General Settings */}
          <div className="pt-4 border-t border-emerald-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-102"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cấu Hình Hệ Thống</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AdminSettings;
