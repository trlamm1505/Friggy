import React, { useState } from 'react';
import {
  Megaphone,
  Send,
  Users,
  Sparkles,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Smartphone,
  ShieldAlert,
} from 'lucide-react';
import { sendBroadcastNotificationApi } from '../../../services/adminService';
import { showToast } from '../../../components/common/Toast';

export const BroadcastManagement = () => {
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    targetGroup: 'all', // 'all' | 'free_users' | 'paid_users'
    extraJson: '',
  });

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.body.trim()) {
      showToast.warning('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo');
      return;
    }
    setConfirmModalOpen(true);
  };

  const handleConfirmSend = async () => {
    setSending(true);
    try {
      let parsedData = undefined;
      if (formData.extraJson.trim()) {
        try {
          parsedData = JSON.parse(formData.extraJson);
        } catch {
          showToast.error('Dữ liệu bổ sung (JSON) không hợp lệ!');
          setSending(false);
          return;
        }
      }

      const payload = {
        title: formData.title.trim(),
        body: formData.body.trim(),
        targetGroup: formData.targetGroup,
        data: parsedData,
      };

      const res = await sendBroadcastNotificationApi(payload);
      const data = res?.data || res;
      setLastResult(data);
      showToast.success('Đã gửi thông báo broadcast thành công!');
      setConfirmModalOpen(false);
      // Reset form
      setFormData({
        title: '',
        body: '',
        targetGroup: 'all',
        extraJson: '',
      });
    } catch (err) {
      console.error('Lỗi khi gửi broadcast:', err);
      showToast.error(err.message || 'Không thể gửi broadcast push notification');
    } finally {
      setSending(false);
    }
  };

  const getTargetGroupLabel = (group) => {
    switch (group) {
      case 'all':
        return 'Tất cả người dùng (All Users)';
      case 'free_users':
        return 'Chỉ người dùng gói Miễn phí (Free Users)';
      case 'paid_users':
        return 'Chỉ người dùng gói trả phí (Pro / Family / Khách hàng VIP)';
      default:
        return group;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header Toolbar ──────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-xs">
            <Megaphone className="w-6 h-6" />
          </span>
          Thông Báo Đẩy Broadcast (FCM Push)
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">
          Gửi thông báo đẩy tức thời qua Firebase Cloud Messaging (FCM) tới các nhóm người dùng ứng dụng
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Left Form Column ───────────────────────────────────────── */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Soạn Thông Báo Mới</h3>
              <p className="text-xs text-slate-400 font-medium">Hệ thống xử lý phát sóng theo batch 100 users/lần</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
            {/* Target Group */}
            <div>
              <label className="block text-slate-700 font-black mb-1.5 uppercase text-[11px] tracking-wider">
                Nhóm đối tượng nhận thông báo <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.targetGroup}
                onChange={(e) => setFormData({ ...formData, targetGroup: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-hidden focus:border-emerald-500 transition-colors cursor-pointer"
              >
                <option value="all">🌐 Tất cả người dùng (All Users)</option>
                <option value="free_users">🌱 Người dùng gói Miễn phí (Free Users)</option>
                <option value="paid_users">⭐ Người dùng gói trả phí (Pro / Family VIP)</option>
              </select>
            </div>

            {/* Notification Title */}
            <div>
              <label className="block text-slate-700 font-black mb-1.5 uppercase text-[11px] tracking-wider">
                Tiêu đề thông báo <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ví dụ: Ưu đãi đặc biệt hôm nay từ Friggy 🥦"
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-hidden focus:border-emerald-500 transition-colors"
              />
              <div className="text-right text-[10px] text-slate-400 mt-1">
                {formData.title.length}/100 ký tự
              </div>
            </div>

            {/* Notification Body */}
            <div>
              <label className="block text-slate-700 font-black mb-1.5 uppercase text-[11px] tracking-wider">
                Nội dung chi tiết <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                maxLength={300}
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Ví dụ: Đã có thêm 20 công thức món chay mới cho tuần này. Mở app để khám phá ngay!"
                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 outline-hidden focus:border-emerald-500 leading-relaxed transition-colors"
              />
              <div className="text-right text-[10px] text-slate-400 mt-1">
                {formData.body.length}/300 ký tự
              </div>
            </div>

            {/* Extra Data JSON (Optional) */}
            <div>
              <label className="block text-slate-700 font-black mb-1.5 uppercase text-[11px] tracking-wider flex items-center justify-between">
                <span>Dữ liệu mở rộng (Data JSON - Tùy chọn)</span>
                <span className="text-[10px] font-normal text-slate-400">Deep link / Route payload</span>
              </label>
              <textarea
                rows={2}
                value={formData.extraJson}
                onChange={(e) => setFormData({ ...formData, extraJson: e.target.value })}
                placeholder='Ví dụ: { "screen": "recipes", "recipeId": 12 }'
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-800 outline-hidden focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Xem Lại & Gửi Thông Báo</span>
              </button>
            </div>
          </form>

          {lastResult && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1 text-xs">
              <div className="flex items-center gap-2 text-emerald-800 font-black">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Kết quả phát sóng gần nhất:</span>
              </div>
              <p className="text-slate-600 font-medium">
                Số người nhận thành công:{' '}
                <strong className="text-emerald-700 font-bold">{lastResult.recipientCount || lastResult.totalSent || '—'}</strong>
              </p>
              {lastResult.batchCount && (
                <p className="text-slate-500 text-[11px]">
                  Số đợt gửi (batches): {lastResult.batchCount}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Right Preview Column (Phone Mockup) ────────────────────── */}
        <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white space-y-6 flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                Mô Phỏng Thông Báo Màn Hình Khóa
              </span>
              <span className="text-[10px] text-slate-400">Xem trước</span>
            </div>

            {/* Mockup Notification Banner */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-lg space-y-2 text-white">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center text-white text-[10px] font-black">
                    F
                  </div>
                  <span className="font-bold text-white">FRIGGY APP</span>
                </div>
                <span>Bây giờ</span>
              </div>

              <div className="pt-1">
                <h5 className="font-extrabold text-sm text-white">
                  {formData.title || 'Tiêu đề thông báo hiển thị ở đây'}
                </h5>
                <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                  {formData.body || 'Nội dung thông báo đẩy đến điện thoại người dùng sẽ hiển thị trực quan tại vị trí này...'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <ShieldAlert className="w-4 h-4" />
              <span>Lưu ý phát sóng</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Thông báo gửi broadcast không thể thu hồi sau khi gửi. Hãy kiểm tra kỹ nội dung và nhóm đối tượng nhận trước khi xác nhận.
            </p>
          </div>
        </div>
      </div>

      {/* ── Custom Centered Confirmation Modal ──────────────────────── */}
      {confirmModalOpen && (
        <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-emerald-100 animate__animated animate__zoomIn animate__faster text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
              <Send className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h4 className="text-xl font-black text-slate-900">Xác Nhận Phát Sóng Thông Báo</h4>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                Bạn có chắc chắn muốn gửi thông báo này tới{' '}
                <strong className="text-emerald-700 font-bold">"{getTargetGroupLabel(formData.targetGroup)}"</strong>?
              </p>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1">
                <div className="font-bold text-slate-800">Tiêu đề: {formData.title}</div>
                <div className="text-slate-600 truncate">Nội dung: {formData.body}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={sending}
                onClick={() => setConfirmModalOpen(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={handleConfirmSend}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{sending ? 'Đang Gửi...' : 'Phát Sóng Ngay'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BroadcastManagement;

