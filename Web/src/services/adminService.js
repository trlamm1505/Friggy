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
