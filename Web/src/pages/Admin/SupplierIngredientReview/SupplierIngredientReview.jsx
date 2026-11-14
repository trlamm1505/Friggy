import React, { useState, useEffect } from 'react';
import {
  ShoppingBasket,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Check,
  X,
  AlertCircle,
  Utensils,
  Plus,
  Loader2,
} from 'lucide-react';
import {
  getAdminSupplierIngredientsApi,
  approveAdminSupplierIngredientApi,
  rejectAdminSupplierIngredientApi,
} from '../../../services/supplierService';
import { showToast } from '../../../components/common/Toast';
import { API_BASE_URL } from '../../../utils/constants';

const resolveImageUrl = (path) => {
  if (!path) return null;
  let url = String(path).trim();
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    const base = (API_BASE_URL || '').replace(/\/api\/v1\/?$/, '');
    url = `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  if (url.includes('ngrok') && !url.includes('ngrok-skip-browser-warning')) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}ngrok-skip-browser-warning=true`;
  }
  return url;
};

export const SupplierIngredientReview = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search, Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending'); // default to pending for review
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  // Actions
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [mergeToGlobal, setMergeToGlobal] = useState(false);
  const [approveConfirmItem, setApproveConfirmItem] = useState(null); // { item, merge }
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadIngredients();
  }, [page, statusFilter]);

  const loadIngredients = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (statusFilter) params.status = statusFilter;
      const res = await getAdminSupplierIngredientsApi(params);
      const data = res?.data || res;
      setItems(data.items || []);
      setTotal(data.meta?.total || 0);
    } catch (err) {
      showToast.error(err.message || 'Không thể tải danh sách nguyên liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenApprove = (item, merge = false) => {
    setApproveConfirmItem({ item, merge });
  };

  const confirmApprove = async () => {
    if (!approveConfirmItem?.item) return;
    setActionLoading(true);
    try {
      await approveAdminSupplierIngredientApi(approveConfirmItem.item.id, approveConfirmItem.merge);
      showToast.success(`Đã duyệt nguyên liệu "${approveConfirmItem.item.name}" thành công!`);
      setApproveConfirmItem(null);
      setDetailModalOpen(false);
      loadIngredients();
    } catch (err) {
      showToast.error(err.message || 'Lỗi khi duyệt nguyên liệu');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (item) => {
    setSelectedItem(item);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      showToast.error('Vui lòng nhập lý do từ chối');
      return;
    }
    setActionLoading(true);
    try {
      await rejectAdminSupplierIngredientApi(selectedItem.id, rejectionReason.trim());
      showToast.success(`Đã từ chối nguyên liệu "${selectedItem.name}"`);
      setRejectModalOpen(false);
      setDetailModalOpen(false);
      loadIngredients();
    } catch (err) {
      showToast.error(err.message || 'Lỗi khi từ chối nguyên liệu');
    } finally {
      setActionLoading(false);
    }
  };

  const formatVnd = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  // Filtered items by search term (tên nguyên liệu, nhà cung cấp, thương hiệu, danh mục, barcode, mô tả)
  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    const nameMatch = item.name?.toLowerCase().includes(term);
    const brandMatch = item.brand?.toLowerCase().includes(term);
    const companyMatch = item.profile?.companyName?.toLowerCase().includes(term);
    const categoryMatch = item.category?.name?.toLowerCase().includes(term);
    const barcodeMatch = item.barcode?.toLowerCase().includes(term);
    const descMatch = item.description?.toLowerCase().includes(term);
    return nameMatch || brandMatch || companyMatch || categoryMatch || barcodeMatch || descMatch;
  });

  return (
    <div className="space-y-6">
      {/* ── Top Header Toolbar ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3">
            <ShoppingBasket className="w-7 h-7 text-emerald-600" />
            <span>Kiểm duyệt Nguyên liệu Nhà Cung Cấp</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Duyệt sản phẩm mới, đối soát thông tin dinh dưỡng và đồng bộ vào kho nguyên liệu hệ thống
          </p>
        </div>
      </div>

      {/* ── Search & Filter Controls ─────────────────────────────────── */}
      <div className="bg-white rounded-[32px] border border-emerald-100 p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên nguyên liệu, nhà cung cấp, thương hiệu, danh mục..."
              className="w-full pl-12 sm:pl-14 pr-11 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl sm:rounded-3xl text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer hover:bg-slate-200/50 transition-colors"
                title="Xóa tìm kiếm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-2 p-2 bg-slate-100/90 rounded-2xl sm:rounded-3xl overflow-x-auto shrink-0 shadow-inner">
            <button
              onClick={() => {
                setStatusFilter('pending');
                setPage(1);
              }}
              className={`px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2.5 text-sm sm:text-base ${
                statusFilter === 'pending'
                  ? 'bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 font-black scale-102'
                  : 'text-slate-600 hover:text-emerald-950 hover:bg-white/80 font-bold'
              }`}
            >
              <Clock className="w-5 h-5 shrink-0" />
              <span>Chờ xét duyệt</span>
            </button>
            <button
              onClick={() => {
                setStatusFilter('approved');
                setPage(1);
              }}
              className={`px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2.5 text-sm sm:text-base ${
                statusFilter === 'approved'
                  ? 'bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 font-black scale-102'
                  : 'text-slate-600 hover:text-emerald-950 hover:bg-white/80 font-bold'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Đã duyệt</span>
            </button>
            <button
              onClick={() => {
                setStatusFilter('rejected');
                setPage(1);
              }}
              className={`px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2.5 text-sm sm:text-base ${
                statusFilter === 'rejected'
                  ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/25 font-black scale-102'
                  : 'text-slate-600 hover:text-rose-950 hover:bg-white/80 font-bold'
              }`}
            >
              <XCircle className="w-5 h-5 shrink-0" />
              <span>Đã từ chối</span>
            </button>
            <button
              onClick={() => {
                setStatusFilter('');
                setPage(1);
              }}
              className={`px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl transition-all cursor-pointer whitespace-nowrap text-sm sm:text-base ${
                statusFilter === ''
                  ? 'bg-white text-emerald-950 shadow-md font-black scale-102'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 font-bold'
              }`}
            >
              <span>Tất cả</span>
            </button>
          </div>
        </div>

        {/* Count Summary */}
        <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-500 pt-3 border-t border-slate-100">
          <span>
            {search.trim() ? (
              <>
                Kết quả tìm kiếm: <strong className="text-emerald-700 font-extrabold text-sm sm:text-base">{filteredItems.length}</strong> / {items.length} nguyên liệu
              </>
            ) : (
              <>
                Tổng số: <strong className="text-emerald-700 font-extrabold text-sm sm:text-base">{total}</strong> nguyên liệu
              </>
            )}
          </span>
          <span>Trang {page} / {Math.max(1, Math.ceil(total / limit))}</span>
        </div>
      </div>

      {/* ── Table Container ─────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm space-y-3">
            <Utensils className="w-14 h-14 mx-auto text-slate-300" />
            <p>
              {search.trim()
                ? `Không tìm thấy nguyên liệu nào khớp với từ khóa "${search}".`
                : 'Không có nguyên liệu nào ở trạng thái này.'}
            </p>
            {search.trim() && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Xóa tìm kiếm
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-50/50 border-b border-emerald-100 text-xs font-black text-slate-600 uppercase tracking-wider">
                  <th className="py-4 px-5">Tên nguyên liệu</th>
                  <th className="py-4 px-4">Nhà cung cấp</th>
                  <th className="py-4 px-4">Danh mục</th>
                  <th className="py-4 px-4">Đơn vị & Giá</th>
                  <th className="py-4 px-4">Trạng thái</th>
                  <th className="py-4 px-4">Ngày gửi</th>
                  <th className="py-4 px-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="py-4 px-5 font-bold text-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                          {item.imagePath ? (
                            <img
                              src={resolveImageUrl(item.imagePath)}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <Utensils className="w-5 h-5 text-emerald-500/70" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm sm:text-base font-extrabold text-slate-900">{item.name}</div>
                          {item.brand && (
                            <span className="text-xs text-slate-400 font-normal block">
                              Hiệu: {item.brand}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-semibold text-emerald-800">
                      {item.profile?.companyName || '—'}
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      {item.category?.name || '—'}
                    </td>
                    <td className="py-4 px-4 font-black text-emerald-700 text-sm sm:text-base">
                      {formatVnd(item.averagePricePerUnit)} <span className="text-xs font-semibold text-slate-500">/ {item.defaultUnit}</span>
                    </td>
                    <td className="py-4 px-4">
                      {item.status === 'approved' ? (
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                          Đã duyệt
                        </span>
                      ) : item.status === 'rejected' ? (
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                          Từ chối
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1 animate-pulse">
                          Chờ duyệt
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-400">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="py-4 px-5 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setMergeToGlobal(false);
                          setDetailModalOpen(true);
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Chi tiết
                      </button>

                      {item.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleOpenApprove(item, false)}
                            disabled={actionLoading}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Duyệt
                          </button>

                          <button
                            onClick={() => handleOpenReject(item)}
                            disabled={actionLoading}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" />
                            Từ chối
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
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

      {/* ── Detail Modal ────────────────────────────────────────────── */}
      {detailModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl relative animate__animated animate__fadeInUp animate__faster text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-black text-slate-800 text-base">{selectedItem.name}</h3>
                <span className="text-[11px] text-emerald-800 font-bold">
                  Nhà cung cấp: {selectedItem.profile?.companyName}
                </span>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedItem.imagePath && (
              <div className="w-full h-44 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden mb-4 relative shadow-2xs">
                <img
                  src={resolveImageUrl(selectedItem.imagePath)}
                  alt={selectedItem.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Danh mục:</span>
                <span className="font-bold text-slate-800">{selectedItem.category?.name || '—'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Đơn vị:</span>
                <span className="font-bold text-slate-800">{selectedItem.defaultUnit}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Đơn giá:</span>
                <span className="font-bold text-emerald-700">{formatVnd(selectedItem.averagePricePerUnit)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Lượng calo / 100g:</span>
                <span className="font-bold text-slate-800">{selectedItem.caloriesPer100g || '—'} kcal</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Thương hiệu:</span>
                <span className="font-bold text-slate-800">{selectedItem.brand || '—'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Barcode:</span>
                <span className="font-bold text-slate-800">{selectedItem.barcode || '—'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Trạng thái:</span>
                <span className="font-bold text-slate-800 uppercase">{selectedItem.status}</span>
              </div>

              {selectedItem.description && (
                <div className="pt-2">
                  <span className="text-slate-500 block mb-1">Mô tả sản phẩm:</span>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-xl">{selectedItem.description}</p>
                </div>
              )}

              {selectedItem.status === 'pending' && (
                <div className="pt-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <label className="flex items-center gap-2.5 font-bold text-emerald-950 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mergeToGlobal}
                      onChange={(e) => setMergeToGlobal(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Đồng bộ thêm nguyên liệu này vào từ điển nguyên liệu dùng chung (Global)</span>
                  </label>
                  <p className="text-[11px] text-emerald-800/80 mt-1 pl-6.5">
                    Nếu tích chọn, hệ thống sẽ tạo một bản ghi nguyên liệu chung để người dùng app có thể tìm thấy trong công thức và thực đơn gợi ý.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Đóng
              </button>

              {selectedItem.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleOpenReject(selectedItem)}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 cursor-pointer"
                  >
                    Từ chối
                  </button>
                  <button
                    onClick={() => handleOpenApprove(selectedItem, mergeToGlobal)}
                    disabled={actionLoading}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    Xác nhận duyệt
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Reason Prompt Modal ──────────────────────────────── */}
      {rejectModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl relative animate__animated animate__fadeInUp animate__faster text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-black text-rose-800 text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                Từ chối nguyên liệu
              </h3>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <p className="text-slate-600">
                Nhập lý do từ chối nguyên liệu <span className="font-bold text-slate-900">{selectedItem.name}</span>:
              </p>

              <div>
                <textarea
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ví dụ: Đơn vị tính không phù hợp, hình ảnh/mô tả không rõ ràng..."
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Đang gửi...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Custom Approve Confirmation Modal (Ở giữa màn hình chuẩn giống Ảnh 1 & 2) ── */}
      {approveConfirmItem && (
        <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-emerald-100 animate__animated animate__zoomIn animate__faster text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h4 className="text-xl font-black text-slate-900">Xác Nhận Duyệt Nguyên Liệu</h4>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                Bạn có chắc chắn muốn duyệt nguyên liệu{' '}
                <strong className="text-emerald-700 font-bold">"{approveConfirmItem.item.name}"</strong> từ NCC{' '}
                <strong className="text-slate-800 font-bold">"{approveConfirmItem.item.profile?.companyName || 'Đối tác'}"</strong> vào hệ thống?
                {approveConfirmItem.merge && (
                  <span className="block mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 py-1 px-2.5 rounded-xl border border-emerald-200">
                    Đồng thời tích hợp vào kho nguyên liệu chung của hệ thống
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setApproveConfirmItem(null)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={confirmApprove}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{actionLoading ? 'Đang Duyệt...' : 'Xác Nhận Duyệt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierIngredientReview;

