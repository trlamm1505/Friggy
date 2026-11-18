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
 * Đọc cache danh sách công thức (offline màn "Gợi ý công thức").
 *
 * ⚠️ VÌ SAO CẦN (v4):
 *   `GET /recipes` không có cache -> offline fallback sang MOCK -> user thấy
 *   công thức BỊA (có thể nấu theo món không tồn tại). Cache là dữ liệu THẬT
 *   đã tải về trước đó.
 *
 * @param {object} [filters] - `{ search, difficulty, maxCookTime }`
 * @returns {Promise<Array|null>}
 */
const readRecipeList = async (filters = {}) => {
  const items = await offlineCache.getRecipeList(filters);
  return items.length > 0 ? items : null;
};

/**
 * Đọc cache công thức đã bookmark (offline).
 * @returns {Promise<Array|null>}
 */
const readBookmarkedRecipes = async () => {
  const items = await offlineCache.getBookmarkedRecipes();
  return items.length > 0 ? items : null;
};

/**
 * Đọc cache gợi ý món ăn HÔM NAY (thực đơn ngày).
 *
 * ⚠️ B2 - `recipeService.getSuggestions()`:
 *   Offline mà không có cache -> UI hiện `ErrorState` (đúng), nhưng nếu ĐÃ
 *   có dữ liệu thật thì nên dùng.
 *
 * ⚠️ ƯU TIÊN NGUỒN (theo thứ tự):
 *   1. Cache "thực đơn ngày" (`daily_meals:<YYYY-MM-DD>`) — chính xác nhất,
 *      vì đây là dữ liệu `getSuggestions()` đã ghi khi online (đúng ngày
 *      user đang xem, đúng tên/ảnh).
 *   2. Cache kế hoạch tuần -> lọc slot theo ngày -> dùng làm fallback.
 *
 * ⚠️ VÌ SAO FALLBACK CŨ SAI (đã sửa):
 *   - Đọc `slot.recipeName` / `slot.recipeImage` trong khi slot từ
 *     `_toPlanDay` -> `_toMealSlot` có field `name` / `image` -> tên & ảnh
 *     luôn `null` -> Home hiện món trống tên.
 *   - `getWeeklyPlanSlotsForDate` so `dayOfWeek` (BE 1=T2..7=CN) với
 *     `Date.getDay()` (JS 0=CN..6=T7) -> lệch 1 ngày.
 *
 * @returns {Promise<Array|null>}
 */
const readSuggestions = async () => {
  // 1) Cache thực đơn ngày (đã map qua `_toMealSlot` -> đúng shape UI).
  const daily = await offlineCache.getDailyMeals();
  if (daily && daily.length > 0) {
    return daily.map((slot) => ({
      id: slot.id,
      recipeId: slot.recipeId ?? null,
      name: slot.name ?? slot.recipe?.title ?? null,
      title: slot.name ?? slot.recipe?.title ?? null,
      image: slot.image ?? slot.recipe?.image ?? null,
      mealType: slot.mealType ?? null,
      cooked: Boolean(slot.completedAt ?? slot.cooked ?? false),
      servings: slot.servings ?? null,
      cookTime: slot.cookTime ?? null,
      difficulty: slot.difficulty ?? 'easy',
      estimatedCost: slot.estimatedCost ?? null,
      note: slot.note ?? null,
    }));
  }

  // 2) Fallback: cache kế hoạch tuần.
  const slots = await offlineCache.getWeeklyPlanSlotsForDate();
  if (!slots || slots.length === 0) return null;

  return slots.map((slot) => ({
    id: slot.id,
    recipeId: slot.recipeId ?? null,
    mealType: slot.mealType ?? null,
    cooked: Boolean(slot.completedAt ?? slot.cooked ?? false),
    servings: slot.servings ?? null,
    image: slot.image ?? slot.recipe?.image ?? null,
    title: slot.name ?? slot.recipeName ?? slot.recipe?.title ?? null,
    name: slot.name ?? slot.recipeName ?? slot.recipe?.title ?? null,
    cookTime: slot.cookTime ?? null,
    difficulty: slot.difficulty ?? 'easy',
    estimatedCost: slot.estimatedCost ?? null,
    note: slot.note ?? null,
  }));
};

/**
 * Đọc cache thông báo (B3).
 *
 * @param {object} [filters] - `{ type, unreadOnly }`
 * @returns {Promise<Array|null>}
 */
const readNotifications = async (filters = {}) => {
  const list = await offlineCache.getNotifications(filters);
  return list.length > 0 ? list : null;
};

/**
 * Đọc số thông báo chưa đọc từ cache (B3).
 * @returns {Promise<number|null>}
 */
const readUnreadCount = async () => {
  const count = await offlineCache.getUnreadNotificationCount();
  return count > 0 ? count : null;
};

/**
 * Đọc cache JSON theo key (B4).
 *
 * @param {string} key - 'current_plan' | 'family_info' | 'payment_history' | 'packages'
 * @returns {Promise<any|null>}
 */
const readJsonCache = async (key) => {
  const value = await offlineCache.getJsonCache(key);
  return value === undefined || value === null ? null : value;
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
      // ⚠️ BUG ĐÃ SỬA (user báo: "thêm nguyên liệu offline bị kẹt"):
      //   Trả `id = 'offline'` (giả) -> op `shopping_item_add` đã queue mang
      //   `listId = 'offline'` -> lúc sync server trả 404 -> món MẤT VĨNH VIỄN.
      //   => Dùng id list THẬT đã cache (lúc user còn online).
      //      Chưa từng online -> trả `null` -> UI báo "chưa có danh sách mua"
      //      (đúng thực tế) thay vì tạo op chắc chắn hỏng.
      const listId = await offlineCache.getActiveShoppingListId();
      if (!listId) return null;

      // ⚠️ KHÔNG dùng `readShoppingItems()`:
      //   Hàm đó trả `null` khi danh sách RỖNG -> UI báo "chưa có danh sách
      //   mua" dù list thật đã tồn tại -> user KHÔNG THỂ thêm món offline.
      const items = await offlineCache.getShoppingItems();

      return {
        id: listId,
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
    // ⚠️ v4: cache danh sách công thức + bookmark.
    getRecipes: async () => readRecipeList(),
    getRecipesFiltered: async (filters = {}) => readRecipeList(filters),
    getBookmarked: readBookmarkedRecipes,
    // ⚠️ B2: gợi ý món ăn hôm nay lấy từ cache kế hoạch tuần.
    getSuggestions: readSuggestions,
  },

  notificationService: {
    // ⚠️ B3: cache thông báo + số chưa đọc.
    getNotifications: readNotifications,
    getUnreadCount: readUnreadCount,
  },

  userService: {
    getProfile: readUserProfile,
    getPreferences: readUserPreferences,
    getAllergies: readAllergies,
    searchIngredients: readIngredientCatalog,
    // ⚠️ B4: nhóm tài chính / gia đình - CHỈ ĐỌC offline.
    getCurrentPlan: async () => readJsonCache('current_plan'),
    getFamily: async () => readJsonCache('family_info'),
    getFamilyInfo: async () => readJsonCache('family_info'),
    getAvailablePackages: async () => readJsonCache('packages'),
    getPaymentHistory: async (page = 1, limit = 20) => {
      const cached = await readJsonCache('payment_history');
      if (!cached) return null;
      // Cache chỉ giữ trang 1 -> trả về shape đúng cho UI.
      return {
        items: cached.items ?? [],
        total: cached.total ?? (cached.items ?? []).length,
        page: cached.page ?? 1,
        limit: cached.limit ?? limit,
      };
    },
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
