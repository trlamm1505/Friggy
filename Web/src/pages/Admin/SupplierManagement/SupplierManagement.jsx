import React, { useState, useEffect } from 'react';
import {
  Store,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Check,
  X,
  Building2,
  AlertCircle,
  Package,
  FileText,
  Globe,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Send,
  Loader2,
} from 'lucide-react';
import {
  // Applications
  getAdminSupplierApplicationsApi,
  getAdminSupplierApplicationDetailApi,
  approveAdminSupplierApplicationApi,
  rejectAdminSupplierApplicationApi,
  // Suppliers
  getAdminSuppliersApi,
  getAdminSuppliersStatsApi,
  getAdminSupplierDetailApi,
  approveAdminSupplierApi,
  rejectAdminSupplierApi,
} from '../../../services/supplierService';
import { showToast } from '../../../components/common/Toast';
import cuteMascotImg from '../../../assets/images/cute_mascot.png';
import { API_BASE_URL } from '../../../utils/constants';

export const SupplierManagement = () => {
  // Current logged in user info (to check role: admin vs manager)
  const [currentUser, setCurrentUser] = useState(null);
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    try {
      const raw = localStorage.getItem('friggy_user') || localStorage.getItem('user');
      if (raw) setCurrentUser(JSON.parse(raw));
    } catch (e) {
      console.warn('Lỗi đọc user:', e);
    }
  }, []);

  // Main navigation tab: 'applications' | 'suppliers'
  const [activeTab, setActiveTab] = useState('applications');

  // ─────────────────────────────────────────────────────────────
  // TAB 1: APPLICATIONS STATE & LOGIC
  // ─────────────────────────────────────────────────────────────
  const [applications, setApplications] = useState([]);
  const [appLoading, setAppLoading] = useState(false);
  const [appStatusFilter, setAppStatusFilter] = useState(''); // '' | 'pending' | 'approved' | 'rejected'
  const [appSearch, setAppSearch] = useState('');
  const [appPage, setAppPage] = useState(1);
  const [appLimit] = useState(15);
  const [appTotal, setAppTotal] = useState(0);

  // Application Modals
  const [appDetailModalOpen, setAppDetailModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [approveAppConfirm, setApproveAppConfirm] = useState(null);
  const [appRejectModalOpen, setAppRejectModalOpen] = useState(false);
  const [appRejectionReason, setAppRejectionReason] = useState('');
  const [appActionLoading, setAppActionLoading] = useState(false);

  // Supplier Modals
  const [verifyConfirmSupplier, setVerifyConfirmSupplier] = useState(null); // { supplier, nextState }

  const loadApplications = async () => {
    setAppLoading(true);
    try {
      const params = { page: appPage, limit: appLimit };
      if (appStatusFilter) params.status = appStatusFilter;
      if (appSearch) params.search = appSearch.trim();

      const res = await getAdminSupplierApplicationsApi(params);
      const data = res?.data || res;
      setApplications(data.items || []);
      setAppTotal(data.meta?.total || 0);
    } catch (err) {
      showToast.error(err.message || 'Không thể tải danh sách đơn đăng ký');
    } finally {
      setAppLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'applications') {
      loadApplications();
    }
  }, [activeTab, appPage, appStatusFilter]);

  const handleAppSearchSubmit = (e) => {
    e.preventDefault();
    setAppPage(1);
    loadApplications();
  };

  const handleOpenApproveApp = (app) => {
    if (!isAdmin) {
      showToast.error('Chỉ Quản trị viên (Admin) mới có quyền duyệt đơn đăng ký đối tác!');
      return;
    }
    setApproveAppConfirm(app);
  };

  const confirmApproveApp = async () => {
    if (!approveAppConfirm) return;
    setAppActionLoading(true);
    try {
      const res = await approveAdminSupplierApplicationApi(approveAppConfirm.id);
      showToast.success(res?.message || `Đã duyệt đơn và gửi email cho "${approveAppConfirm.companyName}" thành công!`);
      setApproveAppConfirm(null);
      setAppDetailModalOpen(false);
      loadApplications();
      loadStats();
    } catch (err) {
      showToast.error(err.message || 'Lỗi khi duyệt đơn đăng ký');
    } finally {
      setAppActionLoading(false);
    }
  };

  const handleOpenRejectApp = (app) => {
    setSelectedApp(app);
    setAppRejectionReason('');
    setAppRejectModalOpen(true);
  };

  const handleRejectAppSubmit = async (e) => {
    e.preventDefault();
    if (!appRejectionReason.trim()) {
      showToast.error('Vui lòng nhập lý do từ chối');
      return;
    }
    setAppActionLoading(true);
    try {
      await rejectAdminSupplierApplicationApi(selectedApp.id, appRejectionReason.trim());
      showToast.success(`Đã từ chối đơn của "${selectedApp.companyName}" và gửi email thông báo.`);
      setAppRejectModalOpen(false);
      setAppDetailModalOpen(false);
      loadApplications();
      loadStats();
    } catch (err) {
      showToast.error(err.message || 'Lỗi khi từ chối đơn đăng ký');
    } finally {
      setAppActionLoading(false);
    }
  };

  const handleViewAppDetail = async (app) => {
    setSelectedApp(app);
    setAppDetailModalOpen(true);
    try {
      const detail = await getAdminSupplierApplicationDetailApi(app.id);
      setSelectedApp(detail?.data || detail);
    } catch (e) {
      // fallback to row data
    }
  };

  // ─────────────────────────────────────────────────────────────
  // TAB 2: SUPPLIERS STATE & LOGIC
  // ─────────────────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState([]);
  const [stats, setStats] = useState(null);
  const [supLoading, setSupLoading] = useState(false);
  const [supSearch, setSupSearch] = useState('');
  const [supVerifiedFilter, setSupVerifiedFilter] = useState(''); // '' | 'true' | 'false'
  const [supPage, setSupPage] = useState(1);
  const [supLimit] = useState(15);
  const [supTotal, setSupTotal] = useState(0);

  // Supplier Modals
  const [supDetailModalOpen, setSupDetailModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supActionLoading, setSupActionLoading] = useState(false);

  const loadStats = async () => {
    try {
      const res = await getAdminSuppliersStatsApi();
      setStats(res?.data || res);
    } catch (e) {
      console.warn('Lỗi khi tải thống kê suppliers:', e);
    }
  };

  const loadSuppliers = async () => {
    setSupLoading(true);
    try {
      const params = { page: supPage, limit: supLimit };
      if (supSearch) params.search = supSearch.trim();
      if (supVerifiedFilter === 'true') params.isVerified = true;
      if (supVerifiedFilter === 'false') params.isVerified = false;

      const res = await getAdminSuppliersApi(params);
      const data = res?.data || res;
      setSuppliers(data.items || []);
      setSupTotal(data.meta?.total || 0);
    } catch (err) {
      showToast.error(err.message || 'Không thể tải danh sách nhà cung cấp');
    } finally {
      setSupLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'suppliers') {
      loadSuppliers();
    }
  }, [activeTab, supPage, supVerifiedFilter]);

  const handleSupSearchSubmit = (e) => {
    e.preventDefault();
    setSupPage(1);
    loadSuppliers();
  };

  const handleOpenToggleVerify = (supplier) => {
    setVerifyConfirmSupplier({
      supplier,
      nextState: !supplier.isVerified,
    });
  };

  const confirmToggleVerify = async () => {
    if (!verifyConfirmSupplier) return;
    const { supplier, nextState } = verifyConfirmSupplier;
    const actionText = nextState ? 'xác minh' : 'thu hồi xác minh';
    setSupActionLoading(true);
    try {
      if (nextState) {
        await approveAdminSupplierApi(supplier.id);
        showToast.success(`Đã xác minh nhà cung cấp "${supplier.companyName}"!`);
      } else {
        await rejectAdminSupplierApi(supplier.id);
        showToast.info(`Đã thu hồi xác minh của "${supplier.companyName}"!`);
      }
      setVerifyConfirmSupplier(null);
      setSupDetailModalOpen(false);
      loadSuppliers();
      loadStats();
    } catch (err) {
      showToast.error(err.message || `Lỗi khi ${actionText} nhà cung cấp`);
    } finally {
      setSupActionLoading(false);
    }
  };

  const handleViewSupplierDetail = async (supplier) => {
    setSelectedSupplier(supplier);
    setSupDetailModalOpen(true);
    try {
      const detail = await getAdminSupplierDetailApi(supplier.id);
      setSelectedSupplier(detail?.data || detail);
    } catch (e) {
      // fallback
    }
  };

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────
  const formatVnd = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  const resolveLogoUrl = (rawUrl) => {
    if (!rawUrl) return cuteMascotImg;
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:')) {
      return rawUrl;
    }
    const apiBase = API_BASE_URL || 'https://api.friggy.io.vn/api/v1';
    let fileBase = 'https://file.friggy.io.vn';
    if (!apiBase.includes('friggy.io.vn')) {
      fileBase = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
    }
    return `${fileBase}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header Toolbar ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3">
            <Store className="w-7 h-7 text-emerald-600" />
            <span>Quản Trị Đối Tác Cung Ứng Thực Phẩm</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Xét duyệt đơn đăng ký và quản lý đối tác nhà cung cấp thực phẩm trên hệ thống Friggy.
          </p>
        </div>
      </div>

      {/* ── Stats Summary Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng nhà cung cấp</span>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Store className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-800">
              {stats?.totalSuppliers || supTotal || 0}
            </span>
            <span className="text-xs sm:text-sm text-slate-400 font-semibold">doanh nghiệp</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đã xác minh</span>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-emerald-600">
              {stats?.approvedSuppliers || 0}
            </span>
            <span className="text-xs sm:text-sm text-emerald-600/70 font-semibold">đạt chuẩn</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gói đang kích hoạt</span>
            <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
              <Package className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-teal-600">
              {stats?.activeSubscriptions || 0}
            </span>
            <span className="text-xs sm:text-sm text-teal-600/70 font-semibold">subscription</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đơn đăng ký mới</span>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Send className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-blue-600">
              {appTotal || 0}
            </span>
            <span className="text-xs sm:text-sm text-blue-600/70 font-semibold">đơn nộp</span>
          </div>
        </div>
      </div>

      {/* ── Unified Controls Bar: Tab Switcher (Ảnh 1) + Search & Filter (Ảnh 2) on the same row ── */}
      <div className="bg-white rounded-3xl border border-emerald-100 p-4 sm:p-5 shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        {/* Tab Switcher (Ảnh 1) */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-5 py-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'applications'
                ? 'bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 scale-102'
                : 'text-slate-600 hover:text-emerald-950 hover:bg-white/80 font-bold'
            }`}
          >
            <Send className="w-4 h-4 shrink-0" />
            <span>Đơn Đăng Ký Đối Tác</span>
            {appTotal > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-black ${
                  activeTab === 'applications'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {appTotal}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-5 py-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'suppliers'
                ? 'bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 scale-102'
                : 'text-slate-600 hover:text-emerald-950 hover:bg-white/80 font-bold'
            }`}
          >
            <Store className="w-4 h-4 shrink-0" />
            <span>Danh Sách Nhà Cung Cấp</span>
          </button>
        </div>

        {/* Search & Filter (Ảnh 2) */}
        {activeTab === 'applications' ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 xl:justify-end">
            <form onSubmit={handleAppSearchSubmit} className="relative flex-1 sm:max-w-md">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                placeholder="Tìm tên công ty, MST, email, người đại diện..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
              />
            </form>

            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={appStatusFilter}
                onChange={(e) => {
                  setAppStatusFilter(e.target.value);
                  setAppPage(1);
                }}
                className="w-full sm:w-auto px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="pending">Chờ xét duyệt (Pending)</option>
                <option value="approved">Đã duyệt (Approved)</option>
                <option value="rejected">Bị từ chối (Rejected)</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 xl:justify-end">
            <form onSubmit={handleSupSearchSubmit} className="relative flex-1 sm:max-w-md">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={supSearch}
                onChange={(e) => setSupSearch(e.target.value)}
                placeholder="Tìm theo tên công ty..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </form>

            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={supVerifiedFilter}
                onChange={(e) => {
                  setSupVerifiedFilter(e.target.value);
                  setSupPage(1);
                }}
                className="w-full sm:w-auto px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
              >
                <option value="">Tất cả xác minh</option>
                <option value="true">Đã xác minh (Verified)</option>
                <option value="false">Chờ xác minh (Unverified)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CONTENT: TAB 1 — APPLICATIONS                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'applications' && (
        <div className="space-y-4 animate__animated animate__fadeIn">

          {/* Table */}
          <div className="bg-white rounded-3xl border border-emerald-100 shadow-xs overflow-hidden">
            {appLoading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-sm">
                <Send className="w-14 h-14 mx-auto text-slate-300 mb-3" />
                Chưa có đơn đăng ký đối tác nào phù hợp.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-emerald-50/50 border-b border-emerald-100 text-xs font-black text-slate-600 uppercase tracking-wider">
                      <th className="py-4 px-5">Doanh nghiệp nộp đơn</th>
                      <th className="py-4 px-4">Mã số thuế</th>
                      <th className="py-4 px-4">Người đại diện</th>
                      <th className="py-4 px-4">Email nhận tài khoản</th>
                      <th className="py-4 px-4">Ngày nộp</th>
                      <th className="py-4 px-4">Trạng thái</th>
                      <th className="py-4 px-5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-emerald-50/30 transition-colors">
                        <td className="py-4 px-5">
                          <p className="font-extrabold text-slate-900 text-sm sm:text-base">{app.companyName}</p>
                          {app.website && (
                            <a
                              href={app.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-emerald-700 hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <Globe className="w-3.5 h-3.5" />
                              {app.website.replace(/^https?:\/\//, '')}
                            </a>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-mono font-bold text-slate-700 text-xs bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                            {app.taxCode || '—'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-bold text-slate-800">{app.contactName}</p>
                          <p className="text-xs text-slate-400">{app.phone || 'Chưa có SĐT'}</p>
                        </td>
                        <td className="py-4 px-4 font-medium text-slate-600">{app.email}</td>
                        <td className="py-4 px-4 text-slate-400 text-xs">
                          {new Date(app.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-4 px-4">
                          {app.status === 'approved' ? (
                            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Đã duyệt
                            </span>
                          ) : app.status === 'rejected' ? (
                            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              Bị từ chối
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1 animate-pulse">
                              <Clock className="w-3.5 h-3.5" />
                              Chờ xét duyệt
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewAppDetail(app)}
                              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                              title="Xem chi tiết đơn"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {app.status === 'pending' && (
                              <>
                                {isAdmin && (
                                  <button
                                    onClick={() => handleOpenApproveApp(app)}
                                    disabled={appActionLoading}
                                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                                    title="Duyệt đơn và gửi email tạo mật khẩu"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Duyệt</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => handleOpenRejectApp(app)}
                                  disabled={appActionLoading}
                                  className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all cursor-pointer"
                                  title="Từ chối đơn"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CONTENT: TAB 2 — SUPPLIERS (EXISTING PROFILES)                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4 animate__animated animate__fadeIn">
          {/* Table */}
          <div className="bg-white rounded-3xl border border-emerald-100 shadow-xs overflow-hidden">
            {supLoading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : suppliers.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-sm">
                <Store className="w-14 h-14 mx-auto text-slate-300 mb-3" />
                Không tìm thấy nhà cung cấp nào.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-emerald-50/50 border-b border-emerald-100 text-xs font-black text-slate-600 uppercase tracking-wider">
                      <th className="py-4 px-5">Doanh nghiệp</th>
                      <th className="py-4 px-4">Tài khoản</th>
                      <th className="py-4 px-4">Liên hệ</th>
                      <th className="py-4 px-4">Trạng thái xác minh</th>
                      <th className="py-4 px-4">Gói cước</th>
                      <th className="py-4 px-4">Nguyên liệu</th>
                      <th className="py-4 px-5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {suppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-emerald-50/30 transition-colors">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white border border-emerald-200 flex items-center justify-center flex-shrink-0 shadow-2xs">
                              <img
                                src={resolveLogoUrl(s.logoPath)}
                                alt={s.companyName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-900 text-sm sm:text-base">{s.companyName}</p>
                              {s.taxCode && (
                                <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                                  MST: {s.taxCode}
                                </p>
                              )}
                              <p className="text-xs text-slate-400 truncate max-w-[200px]">
                                {s.address || 'Chưa cập nhật địa chỉ'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-medium text-slate-600">
                          {s.user?.email || 'N/A'}
                        </td>
                        <td className="py-4 px-4 text-slate-600 font-semibold">
                          {s.contactPhone || '—'}
                        </td>
                        <td className="py-4 px-4">
                          {s.isVerified ? (
                            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Đã xác minh
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1 animate-pulse">
                              <Clock className="w-3.5 h-3.5" />
                              Chờ xác minh
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {s.subscription?.status === 'active' ? (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                              {s.subscription?.plan?.displayName || 'Active'}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">Chưa mua</span>
                          )}
                        </td>
                        <td className="py-4 px-4 font-black text-slate-700">
                          {s._count?.ingredients || 0} món
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewSupplierDetail(s)}
                              className="px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-600 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Chi tiết</span>
                            </button>

                            <button
                              onClick={() => handleOpenToggleVerify(s)}
                              disabled={supActionLoading}
                              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                                s.isVerified
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              }`}
                            >
                              {s.isVerified ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                              <span>{s.isVerified ? 'Thu hồi' : 'Xác minh'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: APPLICATION DETAIL                                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {appDetailModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative animate__animated animate__fadeInUp animate__faster max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setAppDetailModalOpen(false)}
              className="absolute right-5 top-5 p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-lg">{selectedApp.companyName}</h3>
                <p className="text-xs text-slate-400">Chi tiết hồ sơ nộp đơn đăng ký đối tác</p>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã đơn:</span>
                <span className="font-mono font-bold text-slate-800">{selectedApp.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Người đại diện:</span>
                <span className="font-bold text-slate-800">{selectedApp.contactName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Mã số thuế:</span>
                <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                  {selectedApp.taxCode || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-bold text-slate-800">{selectedApp.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số điện thoại:</span>
                <span className="font-bold text-slate-800">{selectedApp.phone || 'Chưa cung cấp'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Địa chỉ:</span>
                <span className="font-bold text-slate-800 text-right max-w-[250px]">
                  {selectedApp.address || 'Chưa cung cấp'}
                </span>
              </div>
              {selectedApp.website && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Website:</span>
                  <a
                    href={selectedApp.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-emerald-700 underline"
                  >
                    {selectedApp.website}
                  </a>
                </div>
              )}
              {selectedApp.description && (
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-slate-500 block mb-1">Mô tả năng lực cung ứng:</span>
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedApp.description}</p>
                </div>
              )}
              {selectedApp.rejectionReason && (
                <div className="pt-2 border-t border-rose-200 text-rose-700">
                  <span className="font-bold block mb-0.5">Lý do từ chối:</span>
                  <p>{selectedApp.rejectionReason}</p>
                </div>
              )}
            </div>

            {selectedApp.status === 'pending' && (
              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleOpenRejectApp(selectedApp)}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all cursor-pointer"
                >
                  Từ chối đơn
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleOpenApproveApp(selectedApp)}
                    disabled={appActionLoading}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Duyệt & Gửi Email Tạo Mật Khẩu</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: APPLICATION REJECT                                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {appRejectModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate__animated animate__fadeInUp animate__faster">
            <h3 className="text-base font-black text-slate-800 mb-1">
              Từ Chối Đơn Đăng Ký
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Nhập lý do từ chối đơn của doanh nghiệp <span className="font-bold text-slate-800">{selectedApp.companyName}</span>. Lý do này sẽ được gửi vào email của họ.
            </p>

            <form onSubmit={handleRejectAppSubmit} className="space-y-4">
              <div>
                <textarea
                  rows={4}
                  value={appRejectionReason}
                  onChange={(e) => setAppRejectionReason(e.target.value)}
                  placeholder="Ví dụ: Giấy phép kinh doanh chưa rõ ràng, địa chỉ kho bãi chưa cụ thể..."
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAppRejectModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={appActionLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {appActionLoading ? 'Đang gửi...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: SUPPLIER DETAIL (EXISTING PROFILE)                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {supDetailModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative animate__animated animate__fadeInUp animate__faster max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSupDetailModalOpen(false)}
              className="absolute right-5 top-5 p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border border-emerald-200 flex-shrink-0 flex items-center justify-center shadow-2xs">
                <img
                  src={resolveLogoUrl(selectedSupplier.logoPath)}
                  alt={selectedSupplier.companyName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-lg">{selectedSupplier.companyName}</h3>
                <p className="text-xs text-slate-400">ID: {selectedSupplier.id}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">Email tài khoản:</span>
                <span className="font-bold text-slate-800">{selectedSupplier.user?.email || 'N/A'}</span>
              </div>
              {selectedSupplier.taxCode && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Mã số thuế:</span>
                  <span className="font-mono font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    {selectedSupplier.taxCode}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Số điện thoại:</span>
                <span className="font-bold text-slate-800">{selectedSupplier.contactPhone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Địa chỉ:</span>
                <span className="font-bold text-slate-800 text-right max-w-[250px]">
                  {selectedSupplier.address || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trạng thái xác minh:</span>
                <span className={`font-bold ${selectedSupplier.isVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {selectedSupplier.isVerified ? 'Đã xác minh (Verified)' : 'Chờ xác minh (Unverified)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gói cước:</span>
                <span className="font-extrabold text-emerald-950">
                  {selectedSupplier.subscription?.plan?.displayName || selectedSupplier.subscription?.status || 'Chưa mua gói'}
                </span>
              </div>
              {selectedSupplier.description && (
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-slate-500 block mb-1">Mô tả:</span>
                  <p className="text-slate-700 whitespace-pre-wrap">{selectedSupplier.description}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => handleOpenToggleVerify(selectedSupplier)}
                disabled={supActionLoading}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  selectedSupplier.isVerified
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                }`}
              >
                {selectedSupplier.isVerified ? 'Thu hồi xác minh' : 'Xác minh nhà cung cấp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Approve Application Confirmation Modal (Ở giữa màn hình chuẩn giống Ảnh 1 & 2) ── */}
      {approveAppConfirm && (
        <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-emerald-100 animate__animated animate__zoomIn animate__faster text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h4 className="text-xl font-black text-slate-900">Phê Duyệt Đơn Đăng Ký</h4>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                Bạn có chắc chắn muốn phê duyệt đơn của doanh nghiệp{' '}
                <strong className="text-emerald-700 font-bold">"{approveAppConfirm.companyName}"</strong>?
                <span className="block mt-2 text-xs font-semibold text-emerald-800 bg-emerald-50 py-1.5 px-3 rounded-xl border border-emerald-200">
                  Hệ thống sẽ tự động tạo tài khoản đối tác và gửi email hướng dẫn đặt mật khẩu cho họ.
                </span>
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={appActionLoading}
                onClick={() => setApproveAppConfirm(null)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={appActionLoading}
                onClick={confirmApproveApp}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {appActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{appActionLoading ? 'Đang Duyệt...' : 'Phê Duyệt Ngay'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Verify / Revoke Confirmation Modal (Ở giữa màn hình chuẩn giống Ảnh 1 & 2) ── */}
      {verifyConfirmSupplier && (
        <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div
            className={`bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border animate__animated animate__zoomIn animate__faster text-center ${
              verifyConfirmSupplier.nextState ? 'border-emerald-100' : 'border-rose-100'
            }`}
          >
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-xs border ${
                verifyConfirmSupplier.nextState
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  : 'bg-rose-50 text-rose-600 border-rose-100'
              }`}
            >
              {verifyConfirmSupplier.nextState ? (
                <ShieldCheck className="w-8 h-8" />
              ) : (
                <ShieldAlert className="w-8 h-8" />
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-xl font-black text-slate-900">
                {verifyConfirmSupplier.nextState ? 'Xác Minh Nhà Cung Cấp' : 'Thu Hồi Xác Minh'}
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                {verifyConfirmSupplier.nextState ? (
                  <>
                    Bạn có chắc chắn muốn xác minh đạt chuẩn cho nhà cung cấp{' '}
                    <strong className="text-emerald-700 font-bold">
                      "{verifyConfirmSupplier.supplier.companyName}"
                    </strong>?
                  </>
                ) : (
                  <>
                    Bạn có chắc chắn muốn thu hồi trạng thái xác minh của nhà cung cấp{' '}
                    <strong className="text-rose-600 font-bold">
                      "{verifyConfirmSupplier.supplier.companyName}"
                    </strong>?
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={supActionLoading}
                onClick={() => setVerifyConfirmSupplier(null)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={supActionLoading}
                onClick={confirmToggleVerify}
                className={`flex-1 py-3 rounded-2xl font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  verifyConfirmSupplier.nextState
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                }`}
              >
                {supActionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : verifyConfirmSupplier.nextState ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                <span>
                  {supActionLoading
                    ? 'Đang xử lý...'
                    : verifyConfirmSupplier.nextState
                    ? 'Xác Minh Ngay'
                    : 'Thu Hồi Xác Minh'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManagement;
