/**
 * CacheFallback - ánh xạ method của service -> hàm đọc cache local.
 *
 * Dùng bởi `SafeService.withFallback({ cacheFallback })`:
 *   real -> (lỗi network) -> CACHE LOCAL -> (cache rỗng) -> MOCK.
 *
 * ⚠️ VÌ SAO TÁCH RIÊNG FILE NÀY:
 *   `ServiceRegistry.jsx` là file lõi, mỗi sprint chỉ thêm 1 dòng.
 *   Bảng ánh xạ method -> cache để ở đây giữ cho registry gọn và dễ review.
 *
 * ⚠️ NGUYÊN TẮC:
 *   1. CHỈ trả về dữ liệu khi cache CÓ dữ liệu. Cache rỗng -> `null` ->
 *      `SafeService` tiếp tục fallback sang mock (không hiện "0 món" giả).
 *   2. Method KHÔNG có bản cache -> `null` (giữ hành vi cũ).
 *   3. KHÔNG ném lỗi - lỗi cache được `SafeService` bắt và bỏ qua.
 *
 * R7: comment tiếng Việt.
 */

import { offlineCache } from './OfflineCache';

/**
 * Đọc cache tủ lạnh.
 * @returns {Promise<Array|null>}
 */
const readFridgeItems = async () => {
  const items = await offlineCache.getFridgeItems();
  return items.length > 0 ? items : null;
};

/**
 * Đọc cache thống kê tủ lạnh (dùng cho `getSummary`).
 * @returns {Promise<{expiredCount:number,availableCount:number}|null>}
 */
const readFridgeSummary = async () => {
  const items = await offlineCache.getFridgeItems();
  const stats = await offlineCache.getFridgeStats();

  if (items.length === 0 && !stats) return null;

  const expiredCount = items.filter((i) => i.status === 'expired').length;
  const availableCount = items.filter((i) => i.status !== 'expired').length;

  // Nếu không có item nào nhưng có stats -> suy ra từ stats.
  if (items.length === 0 && stats) {
    const total = stats.totalItems ?? 0;
    const expiring = stats.expiringSoonCount ?? 0;
    return { expiredCount: Math.max(0, total - expiring), availableCount: expiring };
  }

  return { expiredCount, availableCount };
};

/**
 * Đọc cache thống kê tuần (`getWeeklyStats`).
 * @returns {Promise<object|null>}
 */
const readWeeklyStats = async () => {
  const stats = await offlineCache.getFridgeStats();
  if (!stats) return null;

  return {
    mealsCooked: stats.mealsCooked ?? 0,
    expiringSoonCount: stats.expiringSoonCount ?? 0,
    totalSpentThisMonth: stats.totalSpentThisMonth ?? 0,
    wastePercent: stats.wastePercent ?? 0,
    totalItems: stats.totalItems ?? 0,
  };
};

/**
 * Đọc cache danh sách mua.
 * @returns {Promise<Array|null>}
 */
const readShoppingItems = async () => {
  const items = await offlineCache.getShoppingItems();
  return items.length > 0 ? items : null;
};

/**
 * Đọc cache chi tiết công thức theo id.
 * @param {string} recipeId
 * @returns {Promise<object|null>}
 */
const readRecipeDetail = async (recipeId) => {
  if (!recipeId) return null;
  return offlineCache.getRecipeDetail(recipeId, 'recipe');
};

/**
 * Đọc cache chi tiết slot (meal plan).
 * @param {string} slotId
 * @returns {Promise<object|null>}
 */
const readSlotDetail = async (slotId) => {
  if (!slotId) return null;
  return offlineCache.getRecipeDetail(slotId, 'slot');
};

/**
 * Đọc cache kế hoạch tuần.
 * @returns {Promise<object|null>}
 */
const readWeeklyPlan = async () => {
  const plan = await offlineCache.getWeeklyPlan();
  if (!plan) return null;

  return {
    id: plan.id,
    weekStart: plan.weekStart,
    status: null,
    totalBudget: 0,
    days: plan.days ?? [],
  };
};

/**
 * Đọc cache profile.
 * @returns {Promise<object|null>}
 */
const readUserProfile = async () => offlineCache.getUserProfile();

/**
 * Đọc cache preferences.
 * @returns {Promise<object|null>}
 */
const readUserPreferences = async () => offlineCache.getUserPreferences();

/**
 * Đọc cache dị ứng.
 * @returns {Promise<Array|null>}
 */
const readAllergies = async () => {
  const allergies = await offlineCache.getAllergies();
  return allergies.length > 0 ? allergies : null;
};

/**
 * Đọc cache danh mục nguyên liệu (picker offline).
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<Array|null>}
 */
const readIngredientCatalog = async (query = '', limit = 20) => {
  const items = await offlineCache.searchIngredientCatalog(query, limit);
  return items.length > 0 ? items : null;
};

/**
 * Bảng ánh xạ: key service -> { methodName: hàm đọc cache }.
 *
 * ⚠️ Tên method phải KHỚP CHÍNH XÁC tên method trong `Real*Service`,
 *    vì `SafeService` gọi `cacheFallback(name, args)` với `name` là tên
 *    method thật.
 */
export const CACHE_FALLBACKS = {
  fridgeService: {
    getItems: readFridgeItems,
    getItemById: async (id) => {
      const items = await readFridgeItems();
      return items ? (items.find((i) => i.id === id) ?? null) : null;
    },
    getSummary: readFridgeSummary,
    getFridgeStats: async () => offlineCache.getFridgeStats(),
    getExpiring: async () => {
      const items = await readFridgeItems();
      if (!items) return null;
      return items.filter((i) => i.status === 'expiring');
    },
    searchIngredients: readIngredientCatalog,
  },

  recipeService: {
    getWeeklyStats: readWeeklyStats,
    getRecipeById: readRecipeDetail,
    getSlotDetail: readSlotDetail,
    getShoppingList: readShoppingItems,
    getShoppingLists: async () => {
      const items = await readShoppingItems();
      if (!items) return null;
      return [
        {
          id: 'offline',
          title: '',
          status: 'active',
          totalEstimatedCost: null,
          weeklyPlanId: null,
          createdAt: null,
          items,
        },
      ];
    },
    getActiveShoppingList: async () => {
      const items = await readShoppingItems();
      if (!items) return null;
      return {
        id: 'offline',
        title: '',
        status: 'active',
        totalEstimatedCost: null,
        weeklyPlanId: null,
        createdAt: null,
        items,
      };
    },
    getNextWeekPlan: readWeeklyPlan,
    getPlanDetail: readWeeklyPlan,
  },

  userService: {
    getProfile: readUserProfile,
    getPreferences: readUserPreferences,
    getAllergies: readAllergies,
    searchIngredients: readIngredientCatalog,
  },
};

/**
 * Lấy hàm cache fallback cho 1 service + method.
 *
 * @param {string} serviceKey
 * @param {string} methodName
 * @returns {((args:Array) => Promise<any>)|null}
 */
export const getCacheFallbackFor = (serviceKey, methodName) => {
  const map = CACHE_FALLBACKS[serviceKey];
  if (!map) return null;

  const fn = map[methodName];
  if (typeof fn !== 'function') return null;

  return (args = []) => fn(...args);
};

export default CACHE_FALLBACKS;
