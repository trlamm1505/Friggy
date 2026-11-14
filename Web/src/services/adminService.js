import axiosClient from '../utils/axios';

// ─────────────────────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────────────────────

/**
 * Lấy danh sách users (có filter, tìm kiếm, phân trang)
 * GET /api/v1/admin/users
 */
export const getAdminUsersApi = async (params = {}) => {
  return await axiosClient.get('/admin/users', { params });
};

/**
 * Lấy chi tiết user kèm profile, subscription, AI usage
 * GET /api/v1/admin/users/:id
 */
export const getAdminUserDetailApi = async (id) => {
  return await axiosClient.get(`/admin/users/${id}`);
};

/**
 * Khóa tài khoản user
 * PATCH /api/v1/admin/users/:id/suspend
 */
export const suspendUserApi = async (id) => {
  return await axiosClient.patch(`/admin/users/${id}/suspend`);
};

/**
 * Mở khóa tài khoản user
 * PATCH /api/v1/admin/users/:id/activate
 */
export const activateUserApi = async (id) => {
  return await axiosClient.patch(`/admin/users/${id}/activate`);
};

// ─────────────────────────────────────────────────────────────
// ADMIN STATS & ANALYTICS
// ─────────────────────────────────────────────────────────────

/**
 * Lấy thống kê tổng quan Admin Dashboard (User, revenue, subscription)
 * GET /api/v1/admin/stats/overview
 */
export const getAdminStatsOverviewApi = async () => {
  return await axiosClient.get('/admin/stats/overview');
};

/**
 * Lấy thống kê lượt gọi AI phân theo featureType
 * GET /api/v1/admin/stats/ai-usage
 */
export const getAdminStatsAiUsageApi = async (days = 7) => {
  return await axiosClient.get('/admin/stats/ai-usage', { params: { days } });
};

/**
 * Lấy báo cáo phân bố các gói cước người dùng mua
 * GET /api/v1/admin/stats/subscriptions
 */
export const getAdminStatsSubscriptionsApi = async () => {
  return await axiosClient.get('/admin/stats/subscriptions');
};

// ─────────────────────────────────────────────────────────────
// AI MANAGEMENT (PROVIDERS & PROMPTS)
// ─────────────────────────────────────────────────────────────

/**
 * Danh sách AI Providers
 * GET /api/v1/admin/ai/providers
 */
export const getAiProvidersApi = async () => {
  return await axiosClient.get('/admin/ai/providers');
};

/**
 * Thêm AI Provider mới
 * POST /api/v1/admin/ai/providers
 */
export const createAiProviderApi = async (data) => {
  return await axiosClient.post('/admin/ai/providers', data);
};

/**
 * Kích hoạt AI Provider
 * PATCH /api/v1/admin/ai/providers/:id/activate
 */
export const activateAiProviderApi = async (id) => {
  return await axiosClient.patch(`/admin/ai/providers/${id}/activate`);
};

/**
 * Xóa AI Provider (Soft Delete)
 * DELETE /api/v1/admin/ai/providers/:id
 */
export const deleteAiProviderApi = async (id) => {
  return await axiosClient.delete(`/admin/ai/providers/${id}`);
};

/**
 * Danh sách System Prompts
 * GET /api/v1/admin/ai/prompts
 */
export const getAiPromptsApi = async () => {
  return await axiosClient.get('/admin/ai/prompts');
};

/**
 * Chi tiết System Prompt
 * GET /api/v1/admin/ai/prompts/:id
 */
export const getAiPromptDetailApi = async (id) => {
  return await axiosClient.get(`/admin/ai/prompts/${id}`);
};

/**
 * Thêm System Prompt mới
 * POST /api/v1/admin/ai/prompts
 */
export const createAiPromptApi = async (data) => {
  return await axiosClient.post('/admin/ai/prompts', data);
};

/**
 * Kích hoạt System Prompt cho agentType
 * PATCH /api/v1/admin/ai/prompts/:id/activate
 */
export const activateAiPromptApi = async (id) => {
  return await axiosClient.patch(`/admin/ai/prompts/${id}/activate`);
};

/**
 * Cập nhật System Prompt (chỉ cho phép khi chưa active)
 * PATCH /api/v1/admin/ai/prompts/:id
 */
export const updateAiPromptApi = async (id, data) => {
  return await axiosClient.patch(`/admin/ai/prompts/${id}`, data);
};

/**
 * Xóa System Prompt (chỉ cho phép khi chưa active)
 * DELETE /api/v1/admin/ai/prompts/:id
 */
export const deleteAiPromptApi = async (id) => {
  return await axiosClient.delete(`/admin/ai/prompts/${id}`);
};

// ─────────────────────────────────────────────────────────────
// CRON JOBS MANAGEMENT
// ─────────────────────────────────────────────────────────────

/**
 * Danh sách Cron Jobs
 * GET /api/v1/admin/cron-jobs
 */
export const getCronJobsApi = async () => {
  return await axiosClient.get('/admin/cron-jobs');
};

/**
 * Cập nhật schedule / bật tắt Cron Job
 * PATCH /api/v1/admin/cron-jobs/:name
 */
export const updateCronJobApi = async (name, data) => {
  return await axiosClient.patch(`/admin/cron-jobs/${name}`, data);
};

/**
 * Trigger Cron Job thủ công
 * POST /api/v1/admin/cron-jobs/:name/trigger
 */
export const triggerCronJobApi = async (name) => {
  return await axiosClient.post(`/admin/cron-jobs/${name}/trigger`);
};

// ─────────────────────────────────────────────────────────────
// SPONSORS & CAMPAIGNS MANAGEMENT
// ─────────────────────────────────────────────────────────────

/**
 * Danh sách Sponsors
 * GET /api/v1/admin/sponsors
 */
export const getSponsorsApi = async () => {
  return await axiosClient.get('/admin/sponsors');
};

/**
 * Tạo Sponsor mới
 * POST /api/v1/admin/sponsors
 */
export const createSponsorApi = async (data) => {
  return await axiosClient.post('/admin/sponsors', data);
};

/**
 * Cập nhật Sponsor
 * PATCH /api/v1/admin/sponsors/:id
 */
export const updateSponsorApi = async (id, data) => {
  return await axiosClient.patch(`/admin/sponsors/${id}`, data);
};

/**
 * Danh sách Campaigns của 1 Sponsor
 * GET /api/v1/admin/sponsors/:id/campaigns
 */
export const getSponsorCampaignsApi = async (sponsorId) => {
  return await axiosClient.get(`/admin/sponsors/${sponsorId}/campaigns`);
};

/**
 * Tạo Campaign cho Sponsor
 * POST /api/v1/admin/sponsors/:id/campaigns
 */
export const createSponsorCampaignApi = async (sponsorId, data) => {
  return await axiosClient.post(`/admin/sponsors/${sponsorId}/campaigns`, data);
};

/**
 * Cập nhật Campaign
 * PATCH /api/v1/admin/sponsors/campaigns/:campaignId
 */
export const updateSponsorCampaignApi = async (campaignId, data) => {
  return await axiosClient.patch(`/admin/sponsors/campaigns/${campaignId}`, data);
};

// ─────────────────────────────────────────────────────────────
// SUBSCRIPTION PLANS MANAGEMENT
// ─────────────────────────────────────────────────────────────

/**
 * Lấy danh sách tất cả gói dịch vụ (Admin)
 * GET /api/v1/admin/plans
 */
export const getAdminPlansApi = async () => {
  return await axiosClient.get('/admin/plans');
};

/**
 * Cập nhật thông tin gói dịch vụ (Admin)
 * PATCH /api/v1/admin/plans/:id
 * Body: { priceVnd?, aiUsagePerWeek?, displayName?, features?, isActive? }
 */
export const updateAdminPlanApi = async (id, data) => {
  return await axiosClient.patch(`/admin/plans/${id}`, data);
};

// ─────────────────────────────────────────────────────────────
// PAYMENT TRANSACTIONS MANAGEMENT
// ─────────────────────────────────────────────────────────────

/**
 * Lấy lịch sử giao dịch thanh toán
 * GET /api/v1/admin/payment-transactions
 * Params: { page?, limit?, userId?, status? }
 */
export const getAdminPaymentTransactionsApi = async (params = {}) => {
  return await axiosClient.get('/admin/payment-transactions', { params });
};

// ─────────────────────────────────────────────────────────────
// SYSTEM CONFIGURATION (TOKEN & OTP SECURITY)
// ─────────────────────────────────────────────────────────────

/**
 * Lấy cấu hình Token TTL hiện tại
 * GET /api/v1/admin/system-config/token
 */
export const getAdminTokenConfigApi = async () => {
  return await axiosClient.get('/admin/system-config/token');
};

/**
 * Cập nhật cấu hình Token TTL (AccessToken & RefreshToken)
 * PATCH /api/v1/admin/system-config/token
 * Body: { accessTokenTtl?: string, refreshTokenTtl?: string } (vd: '15m', '7d')
 */
export const updateAdminTokenConfigApi = async (data) => {
  return await axiosClient.patch('/admin/system-config/token', data);
};

/**
 * Lấy cấu hình OTP và số lần thử sai tối đa trước khi khóa
 * GET /api/v1/admin/system-config/otp
 */
export const getAdminOtpConfigApi = async () => {
  return await axiosClient.get('/admin/system-config/otp');
};

/**
 * Cập nhật cấu hình OTP và số lần thử sai tối đa trước khi khóa
 * PATCH /api/v1/admin/system-config/otp
 * Body: { ttlSeconds?: number, maxAttempts?: number }
 */
export const updateAdminOtpConfigApi = async (data) => {
  return await axiosClient.patch('/admin/system-config/otp', data);
};

// ─────────────────────────────────────────────────────────────
// SYSTEM MAINTENANCE & HEALTH CHECK
// ─────────────────────────────────────────────────────────────

/**
 * Lấy trạng thái chế độ bảo trì hệ thống
 * GET /api/v1/admin/system-config/maintenance
 */
export const getMaintenanceModeApi = async () => {
  return await axiosClient.get('/admin/system-config/maintenance');
};

/**
 * Cập nhật chế độ bảo trì hệ thống
 * PATCH /api/v1/admin/system-config/maintenance
 * Body: { isEnabled: boolean, message?: string }
 */
export const updateMaintenanceModeApi = async (data) => {
  return await axiosClient.patch('/admin/system-config/maintenance', data);
};

/**
 * Kiểm tra sức khỏe toàn hệ thống (DB, Redis, AI Provider, Uptime)
 * GET /api/v1/health
 */
export const getSystemHealthApi = async () => {
  return await axiosClient.get('/admin/system-config/health');
};

// ─────────────────────────────────────────────────────────────
// USER MANAGEMENT ENHANCEMENTS (CREATE, SESSIONS, AI QUOTA)
// ─────────────────────────────────────────────────────────────

/**
 * Tạo tài khoản người dùng mới (Role: user, manager, admin, supplier)
 * POST /api/v1/admin/users
 * Body: { email, password, fullName, role, phoneNumber? }
 */
export const createAdminUserApi = async (data) => {
  return await axiosClient.post('/admin/users', data);
};

/**
 * Xem các phiên đăng nhập đang hoạt động của user
 * GET /api/v1/admin/users/:userId/sessions
 */
export const getUserSessionsApi = async (userId) => {
  return await axiosClient.get(`/admin/users/${userId}/sessions`);
};

/**
 * Đăng xuất user khỏi tất cả các thiết bị
 * DELETE /api/v1/admin/users/:userId/sessions
 */
export const revokeAllUserSessionsApi = async (userId) => {
  return await axiosClient.delete(`/admin/users/${userId}/sessions`);
};

/**
 * Hủy một phiên đăng nhập cụ thể của user
 * DELETE /api/v1/admin/users/:userId/sessions/:sessionId
 */
export const revokeUserSessionApi = async (userId, sessionId) => {
  return await axiosClient.delete(`/admin/users/${userId}/sessions/${sessionId}`);
};

/**
 * Dọn dẹp thủ công các sessions đã hết hạn trong Redis/DB
 * POST /api/v1/admin/users/sessions/cleanup
 */
export const cleanupExpiredSessionsApi = async () => {
  return await axiosClient.post('/admin/users/sessions/cleanup');
};

/**
 * Xem hạn mức và số lượt gọi AI đã dùng trong tuần của user
 * GET /api/v1/admin/users/:userId/ai-quota
 */
export const getUserAiQuotaApi = async (userId) => {
  return await axiosClient.get(`/admin/users/${userId}/ai-quota`);
};

/**
 * Điều chỉnh / override hạn mức AI cho user
 * PATCH /api/v1/admin/users/:userId/ai-quota
 * Body: { weeklyLimit: number } (-1 = không giới hạn)
 */
export const updateUserAiQuotaApi = async (userId, data) => {
  return await axiosClient.patch(`/admin/users/${userId}/ai-quota`, data);
};

/**
 * Reset số lượt gọi AI đã dùng trong tuần về 0 cho user
 * POST /api/v1/admin/users/:userId/ai-quota/reset
 */
export const resetUserAiQuotaApi = async (userId) => {
  return await axiosClient.post(`/admin/users/${userId}/ai-quota/reset`);
};

// ─────────────────────────────────────────────────────────────
// ROLES MANAGEMENT
// ─────────────────────────────────────────────────────────────

/**
 * Danh sách vai trò trong hệ thống
 * GET /api/v1/admin/roles
 */
export const getAdminRolesApi = async () => {
  return await axiosClient.get('/admin/roles');
};

/**
 * Cập nhật tên hiển thị / mô tả của vai trò
 * PATCH /api/v1/admin/roles/:roleName
 * Body: { name?: string, description?: string }
 */
export const updateAdminRoleApi = async (roleName, data) => {
  return await axiosClient.patch(`/admin/roles/${roleName}`, data);
};

// ─────────────────────────────────────────────────────────────
// BROADCAST PUSH NOTIFICATIONS
// ─────────────────────────────────────────────────────────────

/**
 * Gửi thông báo đẩy broadcast tới users qua FCM
 * POST /api/v1/admin/notifications/broadcast
 * Body: { title: string, body: string, targetGroup: 'all' | 'free_users' | 'paid_users', data?: object }
 */
export const sendBroadcastNotificationApi = async (data) => {
  return await axiosClient.post('/admin/notifications/broadcast', data);
};

// ─────────────────────────────────────────────────────────────
// ACTIVITY LOGS (AUDIT TRAIL)
// ─────────────────────────────────────────────────────────────

/**
 * Lấy danh sách audit trail của Admin/Manager
 * GET /api/v1/admin/activity-logs
 * Params: { page?, limit?, action?, actorId?, startDate?, endDate? }
 */
export const getAdminActivityLogsApi = async (params = {}) => {
  return await axiosClient.get('/admin/activity-logs', { params });
};

/**
 * Lấy chi tiết 1 log kèm oldValue & newValue
 * GET /api/v1/admin/activity-logs/:id
 */
export const getAdminActivityLogDetailApi = async (id) => {
  return await axiosClient.get(`/admin/activity-logs/${id}`);
};



