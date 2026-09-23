import axiosClient from '../utils/axios';

/**
 * Lấy danh sách gói cước dịch vụ (Public - Không cần AccessToken)
 * GET /api/v1/subscriptions/plans
 */
export const getPublicPlansApi = async () => {
  return await axiosClient.get('/subscriptions/plans');
};

/**
 * Lấy thông tin gói dịch vụ hiện tại của user (Cần AccessToken)
 * GET /api/v1/subscriptions/me
 */
export const getMySubscriptionApi = async () => {
  return await axiosClient.get('/subscriptions/me');
};

/**
 * Đăng ký gói cước mới (Cần AccessToken)
 * POST /api/v1/subscriptions/subscribe
 */
export const subscribePlanApi = async (planId) => {
  return await axiosClient.post('/subscriptions/subscribe', { planId });
};

/**
 * Gia hạn gói cước (Cần AccessToken)
 * POST /api/v1/subscriptions/renew
 */
export const renewPlanApi = async () => {
  return await axiosClient.post('/subscriptions/renew');
};

/**
 * Hủy gia hạn tự động gói cước (Cần AccessToken)
 * DELETE /api/v1/subscriptions/me/auto-renewal
 */
export const cancelAutoRenewalApi = async () => {
  return await axiosClient.delete('/subscriptions/me/auto-renewal');
};
