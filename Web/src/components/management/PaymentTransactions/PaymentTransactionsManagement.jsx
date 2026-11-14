import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  User,
  Store,
  Building2,
  Calendar,
  DollarSign,
  Package,
  X,
} from 'lucide-react';
import { getAdminPaymentTransactionsApi, getAdminUserDetailApi } from '../../../services/adminService';
import { getAdminSupplierPaymentTransactionsApi } from '../../../services/supplierService';
import { showToast } from '../../../components/common/Toast';

export const PaymentTransactionsManagement = () => {
  // Tab Switcher: 'user' | 'supplier'
  const [transactionType, setTransactionType] = useState('user');

  // ─────────────────────────────────────────────────────────────
  // 1. USER TRANSACTIONS STATE & LOGIC
  // ─────────────────────────────────────────────────────────────
  const [userTransactions, setUserTransactions] = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userLimit] = useState(10);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userLoading, setUserLoading] = useState(true);

  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [userIdSearch, setUserIdSearch] = useState('');

  const [selectedUserTx, setSelectedUserTx] = useState(null);
  const [openUserDetailModal, setOpenUserDetailModal] = useState(false);

  const fetchUserTransactions = async () => {
    setUserLoading(true);
    try {
      const params = {
        page: userPage,
        limit: userLimit,
        status: userStatusFilter || undefined,
        userId: userIdSearch.trim() || undefined,
      };

      const res = await getAdminPaymentTransactionsApi(params);
      const resData = res?.data || res;

      if (resData) {
        const txList = resData.data || [];
        setUserTotal(resData.total || 0);
        setUserTotalPages(resData.totalPages || 1);

        const uniqueUserIds = [...new Set(txList.map((t) => t.userId).filter(Boolean))];
        const userMap = {};

        await Promise.all(
          uniqueUserIds.map(async (uid) => {
            try {
              const uRes = await getAdminUserDetailApi(uid);
              const uData = uRes?.data || uRes;
              if (uData) {
                const name =
                  uData.name ||
                  uData.profile?.displayName ||
                  uData.profile?.name ||
                  (uData.googleEmail ? uData.googleEmail.split('@')[0] : null) ||
                  (uData.email ? uData.email.split('@')[0] : null) ||
                  'N/A';
                const email = uData.email || uData.googleEmail || 'N/A';
                userMap[uid] = { name, email };
              }
            } catch (e) {
              console.log(`Could not fetch detail for user ${uid}`, e);
            }
          })
        );

        const enrichedList = txList.map((tx) => ({
          ...tx,
          user: tx.user || userMap[tx.userId] || null,
        }));

        setUserTransactions(enrichedList);
      }
    } catch (err) {
      console.error('Lỗi khi tải lịch sử giao dịch user:', err);
      showToast.error('Không thể tải lịch sử giao dịch người dùng');
    } finally {
      setUserLoading(false);
    }
  };

  useEffect(() => {
    if (transactionType === 'user') {
      fetchUserTransactions();
    }
  }, [userPage, userLimit, userStatusFilter, transactionType]);

  const handleUserSearchSubmit = (e) => {
    e.preventDefault();
    setUserPage(1);
    fetchUserTransactions();
  };

  // ─────────────────────────────────────────────────────────────
  // 2. SUPPLIER TRANSACTIONS STATE & LOGIC
  // ─────────────────────────────────────────────────────────────
  const [supplierTransactions, setSupplierTransactions] = useState([]);
  const [supplierTotal, setSupplierTotal] = useState(0);
  const [supplierPage, setSupplierPage] = useState(1);
  const [supplierLimit] = useState(10);
  const [supplierTotalPages, setSupplierTotalPages] = useState(1);
  const [supplierLoading, setSupplierLoading] = useState(false);

  const [supplierStatusFilter, setSupplierStatusFilter] = useState(''); // '' | 'completed' | 'pending' | 'cancelled'
  const [selectedSupplierTx, setSelectedSupplierTx] = useState(null);
  const [openSupplierDetailModal, setOpenSupplierDetailModal] = useState(false);

  const fetchSupplierTransactions = async () => {
    setSupplierLoading(true);
    try {
      const params = {
        page: supplierPage,
        limit: supplierLimit,
      };
      if (supplierStatusFilter) params.status = supplierStatusFilter;

      const res = await getAdminSupplierPaymentTransactionsApi(params);
      const data = res?.data || res;
      const items = data.items || data.data || [];
      const totalCount = data.meta?.total ?? data.total ?? items.length;
      const totalP = data.meta?.totalPages ?? Math.max(1, Math.ceil(totalCount / supplierLimit));

      setSupplierTransactions(items);
      setSupplierTotal(totalCount);
      setSupplierTotalPages(totalP);
    } catch (err) {
      console.error('Lỗi khi tải lịch sử giao dịch NCC:', err);
      showToast.error('Không thể tải lịch sử giao dịch nhà cung cấp');
    } finally {
      setSupplierLoading(false);
    }
  };

  useEffect(() => {
    if (transactionType === 'supplier') {
      fetchSupplierTransactions();
    }
  }, [supplierPage, supplierLimit, supplierStatusFilter, transactionType]);

  // Load count of supplier transactions on initial render so badge displays total
  useEffect(() => {
    getAdminSupplierPaymentTransactionsApi({ page: 1, limit: 1 })
      .then((res) => {
        const data = res?.data || res;
        setSupplierTotal(data.meta?.total ?? data.total ?? 0);
      })
      .catch(() => {});
  }, []);

  const handleRefresh = () => {
    if (transactionType === 'user') {
      fetchUserTransactions();
    } else {
      fetchSupplierTransactions();
    }
  };

  // ─────────────────────────────────────────────────────────────
  // FORMATTERS & BADGES
  // ─────────────────────────────────────────────────────────────
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    try {
      return new Date(dateStr).toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const renderUserStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 inline-flex items-center gap-1.5 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Đã thanh toán
          </span>
        );
      case 'pending':
        return (
          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 inline-flex items-center gap-1.5 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            Chờ thanh toán
          </span>
        );
      case 'expired':
        return (
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200 inline-flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
            Hết hạn
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 inline-flex items-center gap-1.5 shadow-2xs">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
            {status || 'Không rõ'}
          </span>
        );
    }
  };

  const renderSupplierStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 inline-flex items-center gap-1.5 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Thành công
          </span>
        );
      case 'pending':
        return (
          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 inline-flex items-center gap-1.5 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            Đang chờ
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 inline-flex items-center gap-1.5 shadow-2xs">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
            {status || 'Không rõ'}
          </span>
        );
    }
  };

  const isCurrentLoading = transactionType === 'user' ? userLoading : supplierLoading;

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 animate__animated animate__fadeIn animate__faster">
      {/* ── Top Header Toolbar ─────────────────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-[32px] bg-white border border-emerald-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-emerald-600" />
            <span>Quản Lý Lịch Sử Giao Dịch Thanh Toán</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Theo dõi, tra cứu và đối soát toàn bộ dòng tiền thanh toán gói dịch vụ từ Người Dùng và Nhà Cung Cấp qua cổng PayOS.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isCurrentLoading ? 'animate-spin' : ''}`} />
          <span>Làm Mới</span>
        </button>
      </div>

      {/* ── High-Level Segmented Option Switcher ──────────────────────── */}
      <div className="bg-white p-2 sm:p-2.5 rounded-3xl border border-emerald-100 shadow-xs flex items-center gap-2">
        <button
          onClick={() => setTransactionType('user')}
          className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
            transactionType === 'user'
              ? 'bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
              : 'text-slate-600 hover:bg-emerald-50/70 hover:text-emerald-950'
          }`}
        >
          <User className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Giao Dịch Người Dùng (User)</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
              transactionType === 'user'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {userTotal}
          </span>
        </button>

        <button
          onClick={() => setTransactionType('supplier')}
          className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
            transactionType === 'supplier'
              ? 'bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
              : 'text-slate-600 hover:bg-emerald-50/70 hover:text-emerald-950'
          }`}
        >
          <Store className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Giao Dịch Nhà Cung Cấp (Supplier)</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
              transactionType === 'supplier'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {supplierTotal}
          </span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 1: USER TRANSACTIONS                                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {transactionType === 'user' && (
        <div className="space-y-6 animate__animated animate__fadeIn">
          {/* Search & Filter Bar */}
          <div className="p-6 rounded-[32px] bg-white border border-emerald-100 shadow-xs space-y-4">
            <form onSubmit={handleUserSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userIdSearch}
                  onChange={(e) => setUserIdSearch(e.target.value)}
                  placeholder="Tìm theo Mã Người Dùng (User ID)..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold outline-hidden focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>

              <div className="sm:col-span-4 relative">
                <select
                  value={userStatusFilter}
                  onChange={(e) => {
                    setUserStatusFilter(e.target.value);
                    setUserPage(1);
                  }}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 outline-hidden focus:border-emerald-500 transition-all cursor-pointer"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="paid">Đã thanh toán (paid)</option>
                  <option value="pending">Đang chờ (pending)</option>
                  <option value="expired">Đã hết hạn (expired)</option>
                  <option value="cancelled">Đã hủy (cancelled)</option>
                </select>
              </div>
            </form>

            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-2 border-t border-slate-100">
              <span>
                Tổng số giao dịch User:{' '}
                <strong className="text-emerald-700 font-extrabold">{userTotal}</strong>
              </span>
              <span>Trang {userPage} / {userTotalPages}</span>
            </div>
          </div>

          {/* User Table */}
          <div className="p-6 rounded-[32px] bg-white border border-emerald-100 shadow-xs space-y-4 overflow-hidden">
            {userLoading ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-500">Đang tải lịch sử giao dịch người dùng...</p>
              </div>
            ) : userTransactions.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-medium text-sm space-y-2">
                <CreditCard className="w-10 h-10 text-slate-300 mx-auto" />
                <p>Không có lịch sử giao dịch nào phù hợp với điều kiện tìm kiếm.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[950px]">
                  <thead>
                    <tr className="border-b border-emerald-100 bg-emerald-50/60 text-[11px] font-black text-emerald-950 uppercase tracking-wider">
                      <th className="py-3.5 px-4 rounded-l-2xl">Mã Đơn (Order Code)</th>
                      <th className="py-3.5 px-4">Người Dùng</th>
                      <th className="py-3.5 px-4">Số Tiền</th>
                      <th className="py-3.5 px-4">Kênh Thanh Toán</th>
                      <th className="py-3.5 px-4">Trạng Thái</th>
                      <th className="py-3.5 px-4">Thời Gian Tạo</th>
                      <th className="py-3.5 px-4 rounded-r-2xl text-right">Chi Tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {userTransactions.map((tx) => (
                      <tr
                        key={tx.id || tx.orderCode}
                        className="hover:bg-slate-50/80 transition-colors font-semibold text-slate-800"
                      >
                        <td className="py-4 px-4 font-mono font-black text-emerald-700">
                          #{tx.orderCode || tx.id?.substring(0, 8)}
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-800">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-900">
                              {tx.user?.name || tx.user?.displayName || 'N/A'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-normal">
                              {tx.user?.email || tx.userId}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-black text-emerald-700 text-sm">
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-600">
                          <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                            {tx.paymentChannel || 'PayOS'}
                          </span>
                        </td>
                        <td className="py-4 px-4">{renderUserStatusBadge(tx.status)}</td>
                        <td className="py-4 px-4 font-medium text-slate-500">
                          {formatDate(tx.createdAt)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedUserTx(tx);
                              setOpenUserDetailModal(true);
                            }}
                            className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                            title="Xem chi tiết giao dịch"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {userTotalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-500">
                  Hiển thị {userTransactions.length} / {userTotal} giao dịch
                </span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={userPage <= 1}
                    onClick={() => setUserPage((prev) => Math.max(prev - 1, 1))}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-700 px-2">
                    Trang {userPage} / {userTotalPages}
                  </span>
                  <button
                    disabled={userPage >= userTotalPages}
                    onClick={() => setUserPage((prev) => Math.min(prev + 1, userTotalPages))}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 2: SUPPLIER TRANSACTIONS                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {transactionType === 'supplier' && (
        <div className="space-y-6 animate__animated animate__fadeIn">
          {/* Filter Bar */}
          <div className="p-6 rounded-[32px] bg-white border border-emerald-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-xs sm:text-sm font-bold text-slate-700">
              Tổng cộng:{' '}
              <span className="text-emerald-700 font-extrabold text-sm sm:text-base">
                {supplierTotal}
              </span>{' '}
              giao dịch thanh toán gói đối tác
            </p>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={supplierStatusFilter}
                onChange={(e) => {
                  setSupplierStatusFilter(e.target.value);
                  setSupplierPage(1);
                }}
                className="w-full sm:w-auto px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="completed">Thành công (Completed)</option>
                <option value="pending">Đang chờ (Pending)</option>
                <option value="cancelled">Đã hủy (Cancelled)</option>
              </select>
            </div>
          </div>

          {/* Supplier Table */}
          <div className="p-6 rounded-[32px] bg-white border border-emerald-100 shadow-xs space-y-4 overflow-hidden">
            {supplierLoading ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-500">Đang tải lịch sử giao dịch NCC...</p>
              </div>
            ) : supplierTransactions.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-medium text-sm space-y-2">
                <Store className="w-10 h-10 text-slate-300 mx-auto" />
                <p>Chưa có giao dịch thanh toán nào từ nhà cung cấp phù hợp.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[950px]">
                  <thead>
                    <tr className="border-b border-emerald-100 bg-emerald-50/60 text-[11px] font-black text-emerald-950 uppercase tracking-wider">
                      <th className="py-3.5 px-4 rounded-l-2xl">Mã Giao Dịch</th>
                      <th className="py-3.5 px-4">Doanh Nghiệp NCC</th>
                      <th className="py-3.5 px-4">Gói Cước</th>
                      <th className="py-3.5 px-4">Số Tiền</th>
                      <th className="py-3.5 px-4">Phương Thức</th>
                      <th className="py-3.5 px-4">Trạng Thái</th>
                      <th className="py-3.5 px-4">Thời Gian</th>
                      <th className="py-3.5 px-4 rounded-r-2xl text-right">Chi Tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {supplierTransactions.map((tx) => (
                      <tr
                        key={tx.id || tx.paymentRef}
                        className="hover:bg-slate-50/80 transition-colors font-semibold text-slate-800"
                      >
                        <td className="py-4 px-4 font-mono font-bold text-slate-800">
                          <p className="text-xs sm:text-sm font-black text-emerald-700">
                            {tx.paymentRef || `#${tx.orderCode || tx.id?.substring(0, 8)}`}
                          </p>
                          {tx.id && <p className="text-[11px] text-slate-400 font-normal">{tx.id}</p>}
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-extrabold text-slate-900 text-sm">
                            {tx.companyName || 'Nhà Cung Cấp'}
                          </p>
                          <p className="text-[11px] text-slate-400 font-normal">{tx.supplierEmail}</p>
                        </td>
                        <td className="py-4 px-4 font-extrabold text-emerald-950">
                          {tx.planName || 'Gói Dịch Vụ'}
                        </td>
                        <td className="py-4 px-4 font-black text-emerald-700 text-sm">
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="py-4 px-4 uppercase text-xs font-extrabold text-slate-600">
                          <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                            {tx.paymentMethod || 'PayOS'}
                          </span>
                        </td>
                        <td className="py-4 px-4">{renderSupplierStatusBadge(tx.status)}</td>
                        <td className="py-4 px-4 font-medium text-slate-500">
                          {formatDate(tx.paidAt || tx.createdAt)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedSupplierTx(tx);
                              setOpenSupplierDetailModal(true);
                            }}
                            className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                            title="Xem chi tiết giao dịch NCC"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {supplierTotalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-500">
                  Hiển thị {supplierTransactions.length} / {supplierTotal} giao dịch NCC
                </span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={supplierPage <= 1}
                    onClick={() => setSupplierPage((prev) => Math.max(prev - 1, 1))}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-700 px-2">
                    Trang {supplierPage} / {supplierTotalPages}
                  </span>
                  <button
                    disabled={supplierPage >= supplierTotalPages}
                    onClick={() => setSupplierPage((prev) => Math.min(prev + 1, supplierTotalPages))}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 1: USER TRANSACTION DETAIL                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {openUserDetailModal && selectedUserTx && (
        <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-emerald-100 animate__animated animate__zoomIn animate__faster">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900">Chi Tiết Giao Dịch User</h4>
                  <p className="text-xs text-slate-500 font-semibold">
                    Mã đơn #{selectedUserTx.orderCode || selectedUserTx.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpenUserDetailModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Trạng thái:</span>
                  <div>{renderUserStatusBadge(selectedUserTx.status)}</div>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số tiền:</span>
                  <span className="font-black text-emerald-700 text-sm">
                    {formatCurrency(selectedUserTx.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã đơn hàng PayOS:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedUserTx.orderCode}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase text-slate-400">Thông tin người mua</p>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <p>
                    <strong className="text-slate-900">Họ tên:</strong>{' '}
                    {selectedUserTx.user?.name || selectedUserTx.user?.displayName || 'N/A'}
                  </p>
                  <p>
                    <strong className="text-slate-900">Email:</strong> {selectedUserTx.user?.email || 'N/A'}
                  </p>
                  <p>
                    <strong className="text-slate-900">User ID:</strong>{' '}
                    <span className="font-mono text-[11px]">{selectedUserTx.userId}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase text-slate-400">Thời gian & Tham chiếu</p>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <p>
                    <strong className="text-slate-900">Thời gian khởi tạo:</strong>{' '}
                    {formatDate(selectedUserTx.createdAt)}
                  </p>
                  <p>
                    <strong className="text-slate-900">Cập nhật lần cuối:</strong>{' '}
                    {formatDate(selectedUserTx.updatedAt)}
                  </p>
                  {selectedUserTx.paymentLinkId && (
                    <p>
                      <strong className="text-slate-900">Payment Link ID:</strong>{' '}
                      <span className="font-mono text-[11px]">{selectedUserTx.paymentLinkId}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setOpenUserDetailModal(false)}
              className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm transition-all cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 2: SUPPLIER TRANSACTION DETAIL                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {openSupplierDetailModal && selectedSupplierTx && (
        <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-emerald-100 animate__animated animate__zoomIn animate__faster">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900">Chi Tiết Giao Dịch NCC</h4>
                  <p className="text-xs text-slate-500 font-semibold">
                    {selectedSupplierTx.companyName || 'Đối tác cung ứng'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpenSupplierDetailModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Trạng thái:</span>
                  <div>{renderSupplierStatusBadge(selectedSupplierTx.status)}</div>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gói dịch vụ đăng ký:</span>
                  <span className="font-extrabold text-emerald-950">
                    {selectedSupplierTx.planName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số tiền thanh toán:</span>
                  <span className="font-black text-emerald-700 text-sm">
                    {formatCurrency(selectedSupplierTx.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kênh thanh toán:</span>
                  <span className="font-extrabold text-slate-800 uppercase">
                    {selectedSupplierTx.paymentMethod || 'PayOS'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase text-slate-400">Thông tin nhà cung cấp</p>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <p>
                    <strong className="text-slate-900">Doanh nghiệp:</strong>{' '}
                    {selectedSupplierTx.companyName || 'N/A'}
                  </p>
                  <p>
                    <strong className="text-slate-900">Email đối tác:</strong>{' '}
                    {selectedSupplierTx.supplierEmail || 'N/A'}
                  </p>
                  {selectedSupplierTx.profileId && (
                    <p>
                      <strong className="text-slate-900">Profile ID:</strong>{' '}
                      <span className="font-mono text-[11px]">{selectedSupplierTx.profileId}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase text-slate-400">Mã đơn & Thời gian</p>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <p>
                    <strong className="text-slate-900">Mã tham chiếu:</strong>{' '}
                    <span className="font-mono text-[11px] text-emerald-800 font-bold">
                      {selectedSupplierTx.paymentRef}
                    </span>
                  </p>
                  {selectedSupplierTx.orderCode && (
                    <p>
                      <strong className="text-slate-900">Mã đơn PayOS:</strong>{' '}
                      <span className="font-mono text-[11px]">{selectedSupplierTx.orderCode}</span>
                    </p>
                  )}
                  <p>
                    <strong className="text-slate-900">Thời gian tạo:</strong>{' '}
                    {formatDate(selectedSupplierTx.createdAt)}
                  </p>
                  <p>
                    <strong className="text-slate-900">Thời gian hoàn tất:</strong>{' '}
                    {formatDate(selectedSupplierTx.paidAt)}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setOpenSupplierDetailModal(false)}
              className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm transition-all cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentTransactionsManagement;
