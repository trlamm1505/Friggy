import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Receipt,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { getSupplierPaymentHistoryApi } from '../../../services/supplierService';
import { showToast } from '../../../components/common/Toast';

export const SupplierPaymentHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadTransactions();
  }, [page]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res = await getSupplierPaymentHistoryApi({ page, limit });
      const data = res?.data || res;
      setTransactions(data.items || []);
      setTotal(data.meta?.total || 0);
    } catch (err) {
      showToast.error(err.message || 'Không thể tải lịch sử thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const formatVnd = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Title ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-emerald-600" />
            Lịch sử thanh toán & Hóa đơn
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tổng cộng: <span className="font-extrabold text-emerald-700 text-sm sm:text-base">{total}</span> giao dịch
          </p>
        </div>
      </div>

      {/* ── Table Container ─────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">
            <Receipt className="w-14 h-14 mx-auto text-slate-300 mb-3" />
            Chưa có giao dịch thanh toán nào được ghi nhận.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-50/50 border-b border-emerald-100 text-xs font-black text-slate-600 uppercase tracking-wider">
                  <th className="py-4 px-5">Mã giao dịch</th>
                  <th className="py-4 px-4">Gói dịch vụ</th>
                  <th className="py-4 px-4">Số tiền</th>
                  <th className="py-4 px-4">Phương thức</th>
                  <th className="py-4 px-4">Trạng thái</th>
                  <th className="py-4 px-5">Thời gian thanh toán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {transactions.map((tx) => {
                  const isSuccess = tx.status === 'paid' || tx.status === 'completed' || tx.status === 'active';
                  const isPending = tx.status === 'pending';
                  const isFailed = tx.status === 'cancelled' || tx.status === 'failed';

                  return (
                    <tr key={tx.id} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="py-4 px-5 font-mono font-bold text-slate-800">
                        <div className="text-sm sm:text-base font-extrabold text-slate-900">
                          {tx.paymentRef || (tx.id ? String(tx.id).slice(0, 16) : 'FRIGGY-TX')}
                        </div>
                        {tx.expireAt && (
                          <span className="text-xs text-slate-400 font-normal block mt-0.5">
                            Hạn gói: {new Date(tx.expireAt).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-extrabold text-slate-800 text-sm sm:text-base">
                          {tx.plan?.displayName || tx.planName || tx.description || 'Gói cước NCC'}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          {tx.type && (
                            <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md inline-block">
                              {tx.type === 'subscribe' ? 'Mua mới' : 'Gia hạn'}
                            </span>
                          )}
                          {tx.autoRenew !== undefined && (
                            <span className="text-xs text-slate-400 block">
                              Gia hạn: {tx.autoRenew ? 'Tự động' : 'Thủ công'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-black text-emerald-700 text-sm sm:text-base">
                        {formatVnd(tx.amount)}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider">
                          {tx.paymentMethod ? tx.paymentMethod.toUpperCase() : 'PAYOS VIETQR'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {isSuccess ? (
                          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Thành công
                          </span>
                        ) : isPending ? (
                          <div className="inline-flex items-center gap-2">
                            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Chờ thanh toán
                            </span>
                            {tx.checkoutUrl && (
                              <a
                                href={tx.checkoutUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => showToast.info('Đang mở trang thanh toán PayOS...')}
                                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline inline-flex items-center gap-1"
                                title="Mở trang thanh toán"
                              >
                                Thanh toán <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ) : isFailed ? (
                          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Đã hủy
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1.5">
                            {tx.status}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-slate-600 text-xs sm:text-sm font-medium">
                        {isPending
                          ? '— (Chưa thanh toán)'
                          : tx.paidAt
                          ? new Date(tx.paidAt).toLocaleString('vi-VN')
                          : tx.createdAt
                          ? new Date(tx.createdAt).toLocaleString('vi-VN')
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Trang {page} / {Math.ceil(total / limit)}
            </span>
            <div className="space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 bg-slate-100 rounded-xl hover:bg-slate-200 disabled:opacity-40 cursor-pointer"
              >
                Trước
              </button>
              <button
                disabled={page >= Math.ceil(total / limit)}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-slate-100 rounded-xl hover:bg-slate-200 disabled:opacity-40 cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierPaymentHistory;

