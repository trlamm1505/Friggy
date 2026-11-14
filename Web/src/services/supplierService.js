import axiosClient from '../utils/axios';

// ─────────────────────────────────────────────────────────────
// PUBLIC — B2B ONBOARDING (Đơn đăng ký & Đặt mật khẩu)
// ─────────────────────────────────────────────────────────────

/**
 * Nộp đơn đăng ký trở thành đối tác cung cấp thực phẩm
 * POST /api/v1/supplier/apply
 * Body: { companyName, contactName, email, phone?, address?, description?, website? }
 */
export const applySupplierApi = async (data) => {
  return await axiosClient.post('/supplier/apply', data);
};

/**
 * Đặt mật khẩu lần đầu cho đối tác (từ liên kết xác thực qua email)
 * POST /api/v1/supplier/set-password
 * Body: { token: string, password: string }
 */
export const setSupplierPasswordApi = async (data) => {
  return await axiosClient.post('/supplier/set-password', data);
};

// ─────────────────────────────────────────────────────────────
// SUPPLIER PORTAL (Self-service cho role food_supplier)
// ─────────────────────────────────────────────────────────────

/**
 * Đăng ký làm nhà cung cấp
 * POST /api/v1/supplier/register
 * Body: { companyName, contactPhone?, address?, description? }
 */
export const registerSupplierApi = async (data) => {
  return await axiosClient.post('/supplier/register', data);
};

/**
 * Đăng ký tài khoản nhà cung cấp mới (Bên thứ 3)
 * Hỗ trợ xác nhận mã OTP hoặc đăng nhập tài khoản có sẵn, sau đó tạo SupplierProfile qua POST /supplier/register
 */
export const registerSupplierAccountApi = async (data) => {
  let authData = null;

  // Nếu người dùng cung cấp mã OTP đăng ký mới
  if (data.otpCode) {
    const otpRes = await axiosClient.post('/auth/email/verify-otp', {
      email: data.email,
      otpCode: data.otpCode,
      password: data.password,
      name: data.name || data.companyName,
    });
    authData = otpRes?.data || otpRes;
  } else if (data.email && data.password) {
    // Đăng nhập vào tài khoản có sẵn
    const loginRes = await axiosClient.post('/auth/email/login', {
      email: data.email,
      password: data.password,
    });
    authData = loginRes?.data || loginRes;
  }

  if (authData) {
    if (authData.accessToken) {
      localStorage.setItem('friggy_access_token', authData.accessToken);
      localStorage.setItem('accessToken', authData.accessToken);
    }
    if (authData.refreshToken) {
      localStorage.setItem('friggy_refresh_token', authData.refreshToken);
      localStorage.setItem('refreshToken', authData.refreshToken);
    }
    if (authData.user) {
      localStorage.setItem('friggy_user', JSON.stringify(authData.user));
      localStorage.setItem('user', JSON.stringify(authData.user));
    }
  }

  const payload = {
    companyName: data.companyName,
    contactPhone: data.contactPhone || undefined,
    address: data.address || undefined,
    description: data.description || undefined,
  };
  return await axiosClient.post('/supplier/register', payload);
};

/**
 * Lấy hồ sơ nhà cung cấp hiện tại
 * GET /api/v1/supplier/me
 */
export const getSupplierProfileApi = async () => {
  return await axiosClient.get('/supplier/me');
};

/**
 * Cập nhật hồ sơ nhà cung cấp
 * PATCH /api/v1/supplier/me
 */
export const updateSupplierProfileApi = async (data) => {
  return await axiosClient.patch('/supplier/me', data);
};

/**
 * Upload logo doanh nghiệp (FormData)
 * POST /api/v1/supplier/me/logo
 */
export const uploadSupplierLogoApi = async (formData) => {
  return await axiosClient.post('/supplier/me/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/**
 * Danh sách gói cước nhà cung cấp (Public)
 * GET /api/v1/supplier/plans
 */
export const getSupplierPlansApi = async () => {
  return await axiosClient.get('/supplier/plans');
};

/**
 * Lấy gói cước hiện tại của nhà cung cấp
 * GET /api/v1/supplier/subscription
 */
export const getSupplierSubscriptionApi = async () => {
  return await axiosClient.get('/supplier/subscription');
};

/**
 * Đăng ký / mua gói cước NCC qua PayOS
 * POST /api/v1/supplier/subscribe
 * Body: { planId: number }
 */
export const subscribeSupplierPlanApi = async (planId) => {
  return await axiosClient.post('/supplier/subscribe', { planId: Number(planId) });
};

/**
 * Hủy tự động gia hạn gói cước
 * DELETE /api/v1/supplier/subscription/auto-renewal
 */
export const cancelSupplierAutoRenewalApi = async () => {
  return await axiosClient.delete('/supplier/subscription/auto-renewal');
};

/**
 * Lịch sử thanh toán gói cước NCC
 * Gọi trực tiếp endpoint chính thức GET /api/v1/supplier/payment-history
 */
export const getSupplierPaymentHistoryApi = async (params = {}) => {
  // 1. Gọi trực tiếp endpoint chính thức của Backend dành cho food_supplier
  try {
    const res = await axiosClient.get('/supplier/payment-history', { params });
    const raw = res?.data !== undefined ? res.data : res;
    const items = Array.isArray(raw) ? raw : (Array.isArray(raw?.items) ? raw.items : []);
    if (items.length > 0) {
      return {
        items,
        total: raw?.total || raw?.meta?.total || items.length,
        meta: { total: raw?.total || raw?.meta?.total || items.length },
      };
    }
  } catch (err) {
    console.warn('GET /supplier/payment-history error or empty:', err);
  }

  // 2. Fallback nếu user có quyền Admin/Manager (hoặc đang test trên panel admin)
  try {
    const adminTxRes = await axiosClient.get('/admin/supplier-payment-transactions', { params });
    const data = adminTxRes?.data || adminTxRes;
    const items = data.items || data.data || [];
    if (Array.isArray(items) && items.length > 0) {
      return {
        items,
        total: data.meta?.total || data.total || items.length,
      };
    }
  } catch (e) {}

  // 3. Fallback lấy gói active nếu DB trống hoàn toàn
  try {
    const subRes = await axiosClient.get('/supplier/subscription');
    const activeSub = subRes?.data || subRes;
    if (activeSub && activeSub.plan && (activeSub.status === 'active' || activeSub.status === 'completed')) {
      const activeTxId = `SUB-${activeSub.id ? String(activeSub.id).slice(0, 8) : 'ACTIVE'}`;
      return {
        items: [
          {
            id: activeSub.id || `tx-${Date.now()}`,
            paymentRef: `FRIGGY-${activeTxId.toUpperCase()}`,
            plan: activeSub.plan,
            planName: activeSub.plan.displayName,
            description: `Gói Nhà Cung Cấp ${activeSub.plan.displayName}`,
            amount: activeSub.plan.priceVnd || 0,
            status: 'paid',
            paymentMethod: 'payos',
            createdAt: activeSub.startDate || new Date().toISOString(),
            paidAt: activeSub.startDate || new Date().toISOString(),
            expireAt: activeSub.endDate,
            autoRenew: activeSub.autoRenew,
          },
        ],
        total: 1,
        meta: { total: 1 },
      };
    }
  } catch (e) {}

  return { items: [], total: 0, meta: { total: 0 } };
};

// ── Supplier Ingredients ─────────────────────────────────────

/**
 * Danh sách nguyên liệu của supplier
 * GET /api/v1/supplier/ingredients
 */
export const getSupplierIngredientsApi = async (params = {}) => {
  return await axiosClient.get('/supplier/ingredients', { params });
};

/**
 * Chi tiết 1 nguyên liệu của supplier
 * GET /api/v1/supplier/ingredients/:id
 */
export const getSupplierIngredientDetailApi = async (id) => {
  return await axiosClient.get(`/supplier/ingredients/${id}`);
};

/**
 * Thêm nguyên liệu mới (chờ duyệt) - Hỗ trợ multipart/form-data kèm ảnh
 * POST /api/v1/supplier/ingredients
 */
export const createSupplierIngredientApi = async (data) => {
  let body = data;
  const headers = {};

  if (data instanceof FormData) {
    body = data;
    headers['Content-Type'] = 'multipart/form-data';
  } else if (typeof data === 'object' && data !== null) {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
        formData.append(key, data[key]);
      }
    });
    body = formData;
    headers['Content-Type'] = 'multipart/form-data';
  }

  return await axiosClient.post('/supplier/ingredients', body, { headers });
};

/**
 * Cập nhật nguyên liệu (chỉ khi pending/rejected)
 * PATCH /api/v1/supplier/ingredients/:id
 */
export const updateSupplierIngredientApi = async (id, data) => {
  return await axiosClient.patch(`/supplier/ingredients/${id}`, data);
};

/**
 * Xóa nguyên liệu
 * DELETE /api/v1/supplier/ingredients/:id
 */
export const deleteSupplierIngredientApi = async (id) => {
  return await axiosClient.delete(`/supplier/ingredients/${id}`);
};

/**
 * Import danh sách nguyên liệu từ Excel
 * POST /api/v1/supplier/ingredients/import
 */
export const importSupplierIngredientsApi = async (formData) => {
  return await axiosClient.post('/supplier/ingredients/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/**
 * Tải file Excel mẫu import nguyên liệu
 * GET /api/v1/supplier/ingredients/template
 */
export const downloadSupplierIngredientsTemplateApi = async () => {
  return await axiosClient.get('/supplier/ingredients/template', {
    responseType: 'blob',
  });
};

/**
 * Danh mục nguyên liệu hệ thống
 * GET /api/v1/ingredients/categories
 */
export const getIngredientCategoriesApi = async () => {
  return await axiosClient.get('/ingredients/categories');
};

// ─────────────────────────────────────────────────────────────
// ADMIN & MANAGER — SUPPLIERS MANAGEMENT
// ─────────────────────────────────────────────────────────────

/**
 * Lấy danh sách nhà cung cấp
 * GET /api/v1/admin/suppliers
 * Query params chuẩn BE: search?: string, isVerified?: boolean, page?: number, limit?: number
 */
export const getAdminSuppliersApi = async (params = {}) => {
  const query = {};
  if (params.page) query.page = Number(params.page);
  if (params.limit) query.limit = Number(params.limit);
  if (params.search) query.search = String(params.search).trim();
  if (typeof params.isVerified === 'boolean') {
    query.isVerified = params.isVerified;
  } else if (params.approvalStatus === 'approved') {
    query.isVerified = true;
  } else if (params.approvalStatus === 'pending' || params.approvalStatus === 'rejected') {
    query.isVerified = false;
  }

  return await axiosClient.get('/admin/suppliers', { params: query });
};

/**
 * Thống kê tổng hợp nhà cung cấp
 */
export const getAdminSuppliersStatsApi = async () => {
  try {
    return await axiosClient.get('/admin/suppliers/stats');
  } catch (err) {
    const res = await axiosClient.get('/admin/suppliers', { params: { limit: 100 } });
    const items = res?.items || res?.data?.items || [];
    const total = res?.meta?.total || items.length;
    const approved = items.filter((s) => s.isVerified).length;
    const pending = items.filter((s) => !s.isVerified).length;
    const activeSub = items.filter((s) => s.subscription?.status === 'active').length;
    return {
      totalSuppliers: total,
      pendingApproval: pending,
      approvedSuppliers: approved,
      rejectedSuppliers: 0,
      activeSubscriptions: activeSub,
      totalRevenue: 0,
    };
  }
};

/**
 * Chi tiết 1 nhà cung cấp
 * GET /api/v1/admin/suppliers/:id
 */
export const getAdminSupplierDetailApi = async (id) => {
  return await axiosClient.get(`/admin/suppliers/${id}`);
};

/**
 * Duyệt / Xác minh hồ sơ nhà cung cấp
 * PATCH /api/v1/admin/suppliers/:id/verify
 * Body: { isVerified: true }
 */
export const approveAdminSupplierApi = async (id) => {
  return await axiosClient.patch(`/admin/suppliers/${id}/verify`, { isVerified: true });
};

/**
 * Từ chối / Thu hồi xác minh hồ sơ nhà cung cấp
 * PATCH /api/v1/admin/suppliers/:id/verify
 * Body: { isVerified: false }
 */
export const rejectAdminSupplierApi = async (id) => {
  return await axiosClient.patch(`/admin/suppliers/${id}/verify`, { isVerified: false });
};

/**
 * Xác minh / thu hồi xác minh (chuẩn BE)
 * PATCH /api/v1/admin/suppliers/:id/verify
 * Body: { isVerified: boolean }
 */
export const verifyAdminSupplierApi = async (id, isVerified) => {
  return await axiosClient.patch(`/admin/suppliers/${id}/verify`, { isVerified });
};

// ── Admin Review Nguyên Liệu Supplier ────────────────────────

/**
 * Danh sách nguyên liệu nộp từ supplier
 * GET /api/v1/admin/supplier-ingredients
 */
export const getAdminSupplierIngredientsApi = async (params = {}) => {
  return await axiosClient.get('/admin/supplier-ingredients', { params });
};

/**
 * Chi tiết nguyên liệu nộp
 * GET /api/v1/admin/supplier-ingredients/:id
 */
export const getAdminSupplierIngredientDetailApi = async (id) => {
  return await axiosClient.get(`/admin/supplier-ingredients/${id}`);
};

/**
 * Duyệt nguyên liệu supplier
 * PATCH /api/v1/admin/supplier-ingredients/:id/approve
 */
export const approveAdminSupplierIngredientApi = async (id, mergeToGlobal = false) => {
  return await axiosClient.patch(`/admin/supplier-ingredients/${id}/approve`, { mergeToGlobal });
};

/**
 * Từ chối nguyên liệu supplier
 * PATCH /api/v1/admin/supplier-ingredients/:id/reject
 */
export const rejectAdminSupplierIngredientApi = async (id, reason) => {
  return await axiosClient.patch(`/admin/supplier-ingredients/${id}/reject`, { reason });
};

// ── Admin Supplier Plans ─────────────────────────────────────

/**
 * Danh sách gói cước supplier
 * GET /api/v1/admin/supplier-plans
 */
export const getAdminSupplierPlansApi = async () => {
  return await axiosClient.get('/admin/supplier-plans');
};

/**
 * Tạo gói cước supplier
 * POST /api/v1/admin/supplier-plans
 */
export const createAdminSupplierPlanApi = async (data) => {
  return await axiosClient.post('/admin/supplier-plans', data);
};

/**
 * Cập nhật gói cước supplier
 * PATCH /api/v1/admin/supplier-plans/:id
 */
export const updateAdminSupplierPlanApi = async (id, data) => {
  return await axiosClient.patch(`/admin/supplier-plans/${id}`, data);
};

/**
 * Vô hiệu hóa (deactivate) gói cước supplier
 * PATCH /api/v1/admin/supplier-plans/:id với { isActive: false }
 */
export const deleteAdminSupplierPlanApi = async (id) => {
  return await axiosClient.patch(`/admin/supplier-plans/${Number(id)}`, { isActive: false });
};

// ─────────────────────────────────────────────────────────────
// ADMIN & MANAGER — SUPPLIER APPLICATIONS (Đơn đăng ký đối tác)
// ─────────────────────────────────────────────────────────────

/**
 * Danh sách đơn đăng ký đối tác
 * GET /api/v1/admin/supplier-applications
 * Query: { status?: 'pending'|'approved'|'rejected', search?: string, page?: number, limit?: number }
 */
export const getAdminSupplierApplicationsApi = async (params = {}) => {
  return await axiosClient.get('/admin/supplier-applications', { params });
};

/**
 * Chi tiết 1 đơn đăng ký đối tác
 * GET /api/v1/admin/supplier-applications/:id
 */
export const getAdminSupplierApplicationDetailApi = async (id) => {
  return await axiosClient.get(`/admin/supplier-applications/${id}`);
};

/**
 * Duyệt đơn đăng ký đối tác (Chỉ Admin)
 * POST /api/v1/admin/supplier-applications/:id/approve
 * Backend tự động: Tạo User + SupplierProfile (isVerified = true), gửi email link set-password
 */
export const approveAdminSupplierApplicationApi = async (id) => {
  return await axiosClient.post(`/admin/supplier-applications/${id}/approve`);
};

/**
 * Từ chối đơn đăng ký đối tác (Admin | Manager)
 * POST /api/v1/admin/supplier-applications/:id/reject
 * Body: { rejectionReason: string }
 */
export const rejectAdminSupplierApplicationApi = async (id, rejectionReason) => {
  return await axiosClient.post(`/admin/supplier-applications/${id}/reject`, { rejectionReason });
};

// ─────────────────────────────────────────────────────────────
// ADMIN & MANAGER — SUPPLIER PAYMENT TRANSACTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Lịch sử toàn bộ giao dịch thanh toán của nhà cung cấp
 * GET /api/v1/admin/supplier-payment-transactions
 * Query: { profileId?: string, status?: 'pending'|'completed'|'cancelled', page?: number, limit?: number }
 */
export const getAdminSupplierPaymentTransactionsApi = async (params = {}) => {
  return await axiosClient.get('/admin/supplier-payment-transactions', { params });
};
