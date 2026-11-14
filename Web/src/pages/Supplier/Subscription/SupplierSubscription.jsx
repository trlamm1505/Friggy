import React, { useState, useEffect } from 'react';
import {
  Package,
  Check,
  CreditCard,
  QrCode,
  ExternalLink,
  Clock,
  AlertCircle,
  X,
  Sparkles,
  Lock,
} from 'lucide-react';
import {
  getSupplierPlansApi,
  getSupplierSubscriptionApi,
  getSupplierProfileApi,
  subscribeSupplierPlanApi,
  cancelSupplierAutoRenewalApi,
} from '../../../services/supplierService';
import { showToast } from '../../../components/common/Toast';

export const SupplierSubscription = () => {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // PayOS Payment Modal State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [subscribing, setSubscribing] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load Profile
      try {
        const pRes = await getSupplierProfileApi();
        setProfile(pRes?.data || pRes);
      } catch (e) {
        setProfile(null);
      }

      // 2. Load Subscription
      try {
        const subRes = await getSupplierSubscriptionApi();
        setSubscription(subRes?.data || subRes);
      } catch (e) {
        setSubscription(null);
      }

      // 3. Load Plans
      const planRes = await getSupplierPlansApi();
      const planList = planRes?.data || planRes || [];
      setPlans(Array.isArray(planList) ? planList : []);
    } catch (err) {
      showToast.error('Lỗi khi tải thông tin gói cước: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const isVerified = Boolean(profile?.isVerified);

  const handleOpenCancelConfirm = () => {
    setCancelConfirmOpen(true);
  };

  const confirmCancelAutoRenewal = async () => {
    setCancelling(true);
    showToast.info('Đang xử lý hủy tự động gia hạn...');
    try {
      await cancelSupplierAutoRenewalApi();
      showToast.success('Đã hủy tự động gia hạn thành công! Gói sẽ duy trì đến hết ngày hiệu lực.');
      setCancelConfirmOpen(false);
      loadData();
    } catch (err) {
      showToast.error(err.message || 'Không thể hủy gia hạn');
    } finally {
      setCancelling(false);
    }
  };

  const handleSelectPlan = async (plan) => {
    if (!isVerified) {
      showToast.warning('Hồ sơ doanh nghiệp đang chờ Admin xét duyệt. Bạn chưa thể thanh toán mua gói cước.');
      return;
    }
    setSubscribing(true);
    showToast.info(`Đang khởi tạo liên kết thanh toán gói "${plan.displayName}"...`);
    try {
      const res = await subscribeSupplierPlanApi(plan.id);
      const data = res?.data || res;
      setPaymentData(data);
      setPayModalOpen(true);
      showToast.success('Tạo liên kết thanh toán PayOS thành công!');

      // Lưu thông tin giao dịch vào lịch sử thanh toán
      try {
        const prev = JSON.parse(localStorage.getItem('friggy_supplier_transactions') || '[]');
        const newTx = {
          id: data.paymentRef || `tx-${Date.now()}`,
          paymentRef: data.paymentRef,
          plan: { id: plan.id, displayName: plan.displayName },
          planName: plan.displayName,
          description: `Gói Nhà Cung Cấp ${plan.displayName}`,
          amount: data.amount || plan.priceVnd,
          status: 'pending',
          checkoutUrl: data.checkoutUrl,
          createdAt: new Date().toISOString(),
        };
        const updated = [newTx, ...prev.filter((t) => t.paymentRef !== data.paymentRef)].slice(0, 50);
        localStorage.setItem('friggy_supplier_transactions', JSON.stringify(updated));
      } catch (e) {}
    } catch (err) {
      showToast.error(err.message || 'Lỗi khi tạo liên kết thanh toán');
    } finally {
      setSubscribing(false);
    }
  };

  const handlePaymentCompleted = async () => {
    setPayModalOpen(false);
    await loadData();
    showToast.success('Cảm ơn bạn! Nếu bạn đã chuyển khoản, hệ thống PayOS sẽ tự động kích hoạt gói trong giây lát.');
  };

  const formatVnd = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  const resolveQrCodeUrl = (rawQr) => {
    if (!rawQr) return '';
    const clean = String(rawQr).trim();
    if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:image')) {
      return clean;
    }
    // PayOS trả về chuỗi EMVCo VietQR thô (ví dụ: 00020101021238610010A0000007...)
    // Dùng generator để chuyển chuỗi thành ảnh QR VietQR để app ngân hàng quét được ngay
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(clean)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Current Active Subscription ────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-emerald-100 p-6 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">Gói cước của bạn</h2>
              <p className="text-xs text-slate-400">Tình trạng duy trì dịch vụ nhà cung cấp</p>
            </div>
          </div>

          {subscription ? (
            <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
              Trạng thái: {subscription.status}
            </span>
          ) : (
            <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
              Chưa kích hoạt
            </span>
          )}
        </div>

        {subscription ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Tên gói</span>
              <p className="text-base font-black text-emerald-950 mt-1">
                {subscription.plan?.displayName || 'Gói đối tác'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Hạn sử dụng</span>
              <p className="text-base font-black text-slate-800 mt-1">
                {subscription.endDate}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Giới hạn sản phẩm</span>
              <p className="text-base font-black text-slate-800 mt-1">
                Tối đa {subscription.plan?.maxIngredients || 50} món
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Tự động gia hạn</span>
                <p className="text-sm font-bold text-slate-800 mt-1">
                  {subscription.autoRenew ? 'Đang bật' : 'Đã tắt'}
                </p>
              </div>
              {subscription.autoRenew && (
                <button
                  onClick={handleOpenCancelConfirm}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold rounded-xl border border-rose-200 transition-all cursor-pointer"
                >
                  Tắt
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-sm">Doanh nghiệp chưa đăng ký gói cước nào</p>
              <p className="text-xs text-emerald-800/80 mt-0.5">
                Hãy lựa chọn 1 trong các gói dưới đây để kích hoạt tính năng nộp nguyên liệu và xuất hiện trên app Friggy.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Plans Pricing Grid ──────────────────────────────────────── */}
      <div>
        {!isVerified && (
          <div className="p-5 rounded-3xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm mb-8 animate__animated animate__fadeIn">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="p-3 bg-amber-200 text-amber-900 rounded-2xl flex-shrink-0">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base">Tính năng mua gói cước đang tạm khóa</h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase">
                    Chờ Admin duyệt
                  </span>
                </div>
                <p className="text-xs text-amber-900/80 mt-1 max-w-2xl leading-relaxed">
                  Hồ sơ doanh nghiệp <span className="font-bold">{profile?.companyName || 'của bạn'}</span> đang được Ban quản trị Friggy thẩm định. Để bảo vệ an toàn tài chính và quyền lợi đối tác, hệ thống sẽ <b>mở khóa tính năng thanh toán</b> ngay sau khi Admin bấm <b>Xác minh</b> hồ sơ của bạn.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="text-center max-w-xl mx-auto mb-8">
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider inline-block mb-2">
            BẢNG GIÁ DỊCH VỤ
          </span>
          <h2 className="text-2xl font-black text-slate-800">
            Lựa chọn gói cước phù hợp với quy mô cung ứng
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Mở rộng phạm vi phân phối nông sản, thực phẩm sạch đến hàng ngàn gia đình.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = subscription?.plan?.id === plan.id;
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-3xl border p-6 flex flex-col justify-between transition-all hover:shadow-lg relative ${
                  isCurrent
                    ? 'border-2 border-emerald-500 shadow-md ring-4 ring-emerald-500/10'
                    : 'border-slate-200 shadow-xs'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 text-white font-extrabold text-[10px] uppercase shadow-sm">
                    Gói đang dùng
                  </span>
                )}

                <div>
                  <h3 className="text-lg font-black text-slate-800">{plan.displayName}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-emerald-600">
                      {formatVnd(plan.priceVnd)}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      / {plan.billingCycle === 'yearly' ? 'năm' : 'tháng'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-2">
                    Đăng tải tối đa: <span className="font-bold text-slate-800">{plan.maxIngredients}</span> nguyên liệu
                  </p>

                  <div className="mt-6 pt-6 border-t border-slate-100 space-y-2.5">
                    {Array.isArray(plan.features) &&
                      plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-600">
                          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={subscribing || isCurrent || !isVerified}
                    className={`w-full py-3 rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                      !isVerified
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                        : isCurrent
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white cursor-pointer shadow-md shadow-emerald-500/20'
                    }`}
                  >
                    {!isVerified ? (
                      <>
                        <Lock className="w-4 h-4 text-slate-400" />
                        <span>Chờ duyệt hồ sơ</span>
                      </>
                    ) : isCurrent ? (
                      'Đang kích hoạt'
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>Chọn gói này</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Payment QR Modal (PayOS) ─────────────────────────────────── */}
      {payModalOpen && paymentData && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl relative animate__animated animate__fadeInUp animate__faster text-center">
            <button
              onClick={() => {
                setPayModalOpen(false);
                loadData();
              }}
              className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-6 h-6" />
            </div>

            <h3 className="font-black text-slate-800 text-base">Thanh toán PayOS</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Mở app ngân hàng quét mã VietQR bên dưới
            </p>

            <div className="my-5 p-3 bg-white border border-slate-200 rounded-2xl inline-block shadow-xs">
              {paymentData.qrCode ? (
                <img
                  src={resolveQrCodeUrl(paymentData.qrCode)}
                  onError={(e) => {
                    if (!e.target.dataset.triedFallback) {
                      e.target.dataset.triedFallback = 'true';
                      e.target.src = `https://quickchart.io/qr?size=300&text=${encodeURIComponent(paymentData.qrCode)}`;
                    }
                  }}
                  alt="PayOS QR Code"
                  className="w-52 h-52 object-contain rounded-xl mx-auto"
                />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center text-slate-400 text-xs">
                  Không có QR
                </div>
              )}
            </div>

            <div className="space-y-1 text-xs">
              <p className="text-slate-500">
                Số tiền: <span className="font-black text-emerald-700 text-sm">{formatVnd(paymentData.amount)}</span>
              </p>
              <p className="text-slate-400 text-[11px]">
                Mã tham chiếu: <span className="font-mono font-bold text-slate-700">{paymentData.paymentRef}</span>
              </p>
            </div>

            <div className="mt-5 space-y-2">
              {paymentData.checkoutUrl && (
                <a
                  href={paymentData.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all block"
                >
                  Mở trang thanh toán PayOS
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                onClick={handlePaymentCompleted}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Tôi đã hoàn tất thanh toán
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Auto-Renewal Confirmation Modal ───────────────────── */}
      {cancelConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl relative animate__animated animate__fadeInUp animate__faster text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-black text-slate-800 text-base">Hủy tự động gia hạn?</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Bạn có chắc chắn muốn hủy tự động gia hạn gói cước này không? Gói cước của bạn sẽ tiếp tục hoạt động cho đến hết ngày hiệu lực.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setCancelConfirmOpen(false)}
                disabled={cancelling}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Giữ gia hạn
              </button>
              <button
                type="button"
                onClick={confirmCancelAutoRenewal}
                disabled={cancelling}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {cancelling ? 'Đang xử lý...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierSubscription;

