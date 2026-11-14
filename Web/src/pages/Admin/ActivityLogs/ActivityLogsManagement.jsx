import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Eye,
  Calendar,
  User,
  Shield,
  Layers,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  X,
  FileText,
  AlertCircle,
} from 'lucide-react';
import {
  getAdminActivityLogsApi,
  getAdminActivityLogDetailApi,
} from '../../../services/adminService';
import { showToast } from '../../../components/common/Toast';

export const ActivityLogsManagement = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [logDetail, setLogDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityFilter, fromDate, toDate]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        action: actionFilter || undefined,
        targetEntity: entityFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      };
      // axiosClient interceptor unwrap response.data một lần
      // → res = { message, statusCode, data: { total, page, limit, totalPages, data: [...logs] } }
      const res = await getAdminActivityLogsApi(params);
      // pagination nằm trong res.data (nếu có wrapper message/statusCode) hoặc chính res
      const pagination = (res?.data && typeof res.data === 'object' && !Array.isArray(res.data))
        ? res.data
        : res;
      const items = Array.isArray(pagination?.data)
        ? pagination.data
        : Array.isArray(pagination?.items)
        ? pagination.items
        : Array.isArray(pagination?.logs)
        ? pagination.logs
        : Array.isArray(pagination)
        ? pagination
        : [];
      const totalCount =
        pagination?.total ?? pagination?.meta?.total ?? pagination?.totalCount ?? items.length;
      setLogs(items);
      setTotal(totalCount);
    } catch (err) {
      console.error('Lỗi khi tải activity logs:', err);
      showToast.error(err.message || 'Không thể tải nhật ký hoạt động');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (log) => {
    setSelectedLog(log);
    setLoadingDetail(true);
    try {
      const res = await getAdminActivityLogDetailApi(log.id);
      // axiosClient đã unwrap response.data, res là body trực tiếp
      setLogDetail(res?.data ?? res);
    } catch (err) {
      console.error('Lỗi khi tải chi tiết log:', err);
      setLogDetail(log);
    } finally {
      setLoadingDetail(false);
    }
  };

  const getActionBadge = (action = '') => {
    const act = action.toUpperCase();
    if (act.includes('DELETE') || act.includes('SUSPEND') || act.includes('REVOKE')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (act.includes('CREATE') || act.includes('ACTIVATE') || act.includes('APPROVE')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('OVERRIDE')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      {/* ── Top Header Toolbar ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-xs">
              <History className="w-6 h-6" />
            </span>
            Nhật Ký Hoạt Động (Activity Logs)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">
            Theo dõi, kiểm toán và đối soát toàn bộ thao tác của Admin & Quản lý trên hệ thống
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="self-start sm:self-auto px-4 py-2.5 rounded-2xl bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* ── Filters Bar ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-4 border border-emerald-100 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Action Filter */}
          <div className="flex-1 min-w-[160px]">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-hidden focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="">-- Tất cả hành động --</option>
              <option value="CREATE">CREATE (Tạo mới)</option>
              <option value="UPDATE">UPDATE (Cập nhật)</option>
              <option value="DELETE">DELETE (Xóa)</option>
              <option value="SUSPEND">SUSPEND (Khóa)</option>
              <option value="ACTIVATE">ACTIVATE (Mở khóa)</option>
              <option value="APPROVE">APPROVE (Duyệt)</option>
              <option value="REJECT">REJECT (Từ chối)</option>
            </select>
          </div>

          {/* Entity Filter */}
          <div className="flex-1 min-w-[160px]">
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-hidden focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="">-- Tất cả thực thể --</option>
              <option value="User">User (Người dùng)</option>
              <option value="Supplier">Supplier (Nhà cung cấp)</option>
              <option value="Ingredient">Ingredient (Nguyên liệu)</option>
              <option value="Recipe">Recipe (Công thức)</option>
              <option value="Plan">Plan (Gói cước)</option>
              <option value="AiProvider">AI Provider</option>
              <option value="AiPrompt">AI Prompt</option>
              <option value="CronJob">Cron Job</option>
              <option value="SystemConfig">System Config</option>
            </select>
          </div>

          {/* From Date */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-600">
            <span>Từ:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="bg-transparent outline-hidden font-bold text-slate-800 cursor-pointer"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-600">
            <span>Đến:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="bg-transparent outline-hidden font-bold text-slate-800 cursor-pointer"
            />
          </div>

          {(actionFilter || entityFilter || fromDate || toDate) && (
            <button
              onClick={() => {
                setActionFilter('');
                setEntityFilter('');
                setFromDate('');
                setToDate('');
                setPage(1);
              }}
              className="px-3.5 py-2.5 rounded-2xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs transition-colors cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pt-1 border-t border-slate-100">
          <span>
            Tổng cộng: <strong className="text-emerald-700 font-extrabold">{total}</strong> bản ghi nhật ký
          </span>
          <span>Trang {page} / {totalPages}</span>
        </div>
      </div>

      {/* ── Table Container ─────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs space-y-2">
            <History className="w-12 h-12 mx-auto text-slate-300" />
            <p className="font-bold">Chưa có nhật ký hoạt động nào phù hợp.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-emerald-50/50 border-b border-emerald-100 font-black text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Thời gian</th>
                  <th className="py-3.5 px-4">Quản trị viên</th>
                  <th className="py-3.5 px-4">Hành động</th>
                  <th className="py-3.5 px-4">Thực thể</th>
                  <th className="py-3.5 px-4">Target ID</th>
                  <th className="py-3.5 px-4">IP / Agent</th>
                  <th className="py-3.5 px-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {formatDateTime(log.createdAt || log.timestamp)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0">
                          {(log.admin?.name || log.admin?.fullName || log.actor?.name || log.actor?.fullName || 'A')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-800">
                            {log.admin?.name || log.admin?.fullName || log.actor?.name || log.actor?.fullName || 'Hệ thống'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {log.admin?.email || log.actor?.email || log.adminId || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full font-extrabold border text-[11px] inline-block ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700">
                      {log.targetEntity || log.entity || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 max-w-[120px] truncate" title={log.targetId || log.entityId}>
                      {log.targetId || log.entityId || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {log.ipAddress || log.ip || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(log)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-semibold">
              Hiển thị {logs.length} / {total} logs
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-700 px-2">
                Trang {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Audit Modal (Centered Dialog) ─────────────────────── */}
      {selectedLog && (
        <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl border border-emerald-100 animate__animated animate__zoomIn animate__faster">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900">Chi Tiết Thao Tác Kiểm Toán</h4>
                  <p className="text-xs text-slate-500 font-semibold">
                    Mã Log: <span className="font-mono text-slate-700">{selectedLog.id}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedLog(null);
                  setLogDetail(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-12 text-center">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Meta Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold uppercase">Hành động</span>
                    <div className="mt-1">
                      <span className={`px-2 py-0.5 rounded-full font-black border text-[11px] ${getActionBadge(selectedLog.action)}`}>
                        {selectedLog.action}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold uppercase">Thực thể</span>
                    <p className="font-extrabold text-slate-800 mt-1">{selectedLog.targetEntity || selectedLog.entity || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold uppercase">Thời gian</span>
                    <p className="font-extrabold text-slate-800 mt-1">{formatDateTime(selectedLog.createdAt || selectedLog.timestamp)}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold uppercase">Quản trị viên</span>
                    <p className="font-extrabold text-slate-800 mt-1">
                      {selectedLog.admin?.name || selectedLog.admin?.fullName || selectedLog.actor?.name || selectedLog.actor?.fullName || 'Hệ thống'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold uppercase">Target ID</span>
                    <p className="font-mono text-slate-800 mt-1 truncate">{selectedLog.targetId || selectedLog.entityId || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold uppercase">IP Address</span>
                    <p className="font-mono text-slate-800 mt-1">{selectedLog.ipAddress || selectedLog.ip || '—'}</p>
                  </div>
                </div>

                {/* Audit Diff: Old Value vs New Value */}
                <div className="space-y-3">
                  <h5 className="font-black text-slate-900 uppercase text-[11px] tracking-wider">
                    So Sánh Dữ Liệu Thay Đổi (Audit Diff)
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Old Value */}
                    <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200">
                      <div className="font-black text-rose-800 mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        Giá trị trước (oldValue)
                      </div>
                      <pre className="text-[11px] font-mono text-slate-800 bg-white p-3 rounded-xl border border-rose-100 overflow-x-auto max-h-56 leading-relaxed">
                        {logDetail?.oldValue
                          ? typeof logDetail.oldValue === 'string'
                            ? logDetail.oldValue
                            : JSON.stringify(logDetail.oldValue, null, 2)
                          : 'Không có (null)'}
                      </pre>
                    </div>

                    {/* New Value */}
                    <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                      <div className="font-black text-emerald-800 mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Giá trị sau (newValue)
                      </div>
                      <pre className="text-[11px] font-mono text-slate-800 bg-white p-3 rounded-xl border border-emerald-100 overflow-x-auto max-h-56 leading-relaxed">
                        {logDetail?.newValue
                          ? typeof logDetail.newValue === 'string'
                            ? logDetail.newValue
                            : JSON.stringify(logDetail.newValue, null, 2)
                          : 'Không có (null)'}
                      </pre>
                    </div>
                  </div>
                </div>

                {logDetail?.note && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
                    <span className="font-bold">Ghi chú:</span> {logDetail.note}
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  setSelectedLog(null);
                  setLogDetail(null);
                }}
                className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-extrabold text-xs hover:bg-slate-800 transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogsManagement;

