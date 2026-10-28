/**
 * RealRecipeService - nối công thức + meal-planning slots với BE thật (Sprint B3)
 *
 * Nguồn sự thật (đọc file BE, không đoán):
 *   be/src/modules-api/recipes/recipes.controller.ts
 *   be/src/modules-api/recipes/recipes.service.ts
 *   be/src/modules-api/recipes/dto/recipes-response.dto.ts
 *   be/src/modules-api/recipes/dto/recipes.dto.ts
 *   be/src/modules-api/meal-planning/meal-planning.controller.ts
 *   be/src/modules-api/meal-planning/dto/meal-planning-response.dto.ts
 *
 * ⚠️ BA SAI LẦM ĐÃ BIẾT (đừng phát hiện lại):
 *
 * 1. TÊN FIELD LỆCH HOÀN TOÀN giữa BE và UI:
 *      BE `title`             -> UI `name`
 *      BE `cookTimeMinutes`   -> UI `cookTime`
 *      BE `difficultyLevel`   -> UI `difficulty`
 *      BE `matchScore`        -> UI `matchPercent`
 *      BE `thumbnailPath`     -> UI `image`
 *    => toàn bộ qua `_toRecipe()` / `_toSuggestion()`, UI KHÔNG đổi 1 dòng.
 *
 * 2. `GET /recipes` trả PAGINATED, không phải array:
 *      BE: `{ data: RecipeSummaryDto[], total, page, limit, totalPages }`
 *      (khác với `GET /fridge` trả array thẳng)
 *    => service phải trả FLAT ARRAY cho UI, giữ `meta` riêng cho phân trang vô hạn.
 *
 * 3. `getSuggestions()` KHÔNG dùng `GET /recipes/suggestions`.
 *    Home cần "bữa ăn HÔM NAY" -> nguồn là MEAL-PLANNING SLOTS:
 *      GET /meal-planning/plans      -> plan đầu tiên (mới nhất)
 *      GET /meal-planning/plans/{id} -> dailyPlans[] -> lọc `dayOfWeek` hôm nay
 *                                       -> mealSlots[]
 *    ⚠️ `dayOfWeek` thực tế là 1=T2 ... 7=CN (xem `ai-service/src/ai-core/
 *    tools/meal-plan.tools.ts:62` và `chef.agent.ts:224`) — KHÁC với comment
 *    "0=CN, 1=T2" trong DTO của BE. Flutter dùng `DateTime.now().weekday`
 *    (1=T2..7=CN) nên ta dùng CÙNG quy ước để khớp app Flutter.
 *
 * Quy tắc tuân thủ:
 *   R1 - mapper có test (RealRecipeService.test.js)
 *   R2 - mọi ảnh đi qua appConfig.getImageUrl()
 *   R3 - lỗi mạng / lỗi server để ApiException tự phân loại, service không gộp message
 *   R4 - service này không import service khác, chỉ qua ApiClient
 *   R5 - token chỉ đọc qua TokenStorage (ApiClient lo, không cần ở đây)
 *   R6 - đăng ký bằng side-effect ở cuối file
 *   R7 - comment tiếng Việt
 */

import { ApiClient } from '../../api/ApiClient';
import { registerService } from '../../api/ServiceRegistry';
import { appConfig } from '../../../shared/config/appConfig';

/**
 * Thứ tự bữa ăn — giống Flutter (`cooking_suggestions_section.dart:194`).
 * KHÔNG được lấy bữa theo index của mảng: BE trả slot theo `dayOfWeek`,
 * thứ tự không đảm bảo là bữa nào.
 */
const MEAL_TYPE_ORDER = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  snack: 3,
};

/**
 * Thời gian nấu mặc định theo bữa — KHÔNG có trong slot của BE.
 * Flutter hardcode y hệt (`cooking_suggestions_section.dart:187`):
 *   breakfast 15, lunch 25, dinner 20.
 * `snack` không có trong Flutter -> lấy 20 cho hợp lý.
 */
const DEFAULT_COOK_TIME_BY_MEAL = {
  breakfast: 15,
  lunch: 25,
  dinner: 20,
  snack: 20,
};

/**
 * `dayOfWeek` của BE = 1=T2 ... 7=CN (không phải 0=CN như comment DTO).
 * `Date.getDay()` của JS trả 0=CN ... 6=T7 -> phải quy đổi.
 *
 * @returns {number} 1..7 theo quy ước BE
 */
const todayDayOfWeek = () => {
  const jsDay = new Date().getDay(); // 0=CN, 1=T2, ..., 6=T7
  return jsDay === 0 ? 7 : jsDay; // -> 1=T2, ..., 6=T7, 7=CN
};

/**
 * Map `difficultyLevel` của BE sang chữ thường cho UI.
 * BE enum là `easy|medium|hard` nhưng DB có thể lưu `EASY|MEDIUM|HARD`.
 */
const normalizeDifficulty = (value) => {
  if (!value || typeof value !== 'string') return 'easy';
  const lower = value.toLowerCase();
  if (lower === 'medium') return 'medium';
  if (lower === 'hard') return 'hard';
  return 'easy';
};

/**
 * Map `mealType` của BE sang chữ thường.
 * BE enum: breakfast|lunch|dinner|snack|dessert|drink
 */
const normalizeMealType = (value) => {
  if (!value || typeof value !== 'string') return 'lunch';
  return value.toLowerCase();
};

export class RealRecipeService {
  constructor() {
    this.client = ApiClient;
  }

  // ═══════════════ Mapper ═══════════════

  /**
   * BE `RecipeSummaryDto` -> UI `Recipe` (IRecipeService.js).
   *
   * @param {object} dto - response của GET /recipes | GET /recipes/{id}
   * @returns {object|null} recipe đúng shape UI
   */
  _toRecipe(dto) {
    if (!dto) return null;

    return {
      id: dto.id,
      // BE `title` -> UI `name`
      name: dto.title,
      // R2: ảnh phải qua getImageUrl. `thumbnailPath` là đường dẫn tương đối.
      image: appConfig.getImageUrl(dto.thumbnailPath) ?? null,
      // BE `cookTimeMinutes` -> UI `cookTime`
      cookTime: dto.cookTimeMinutes,
      // BE `difficultyLevel` -> UI `difficulty` (lowercase)
      difficulty: normalizeDifficulty(dto.difficultyLevel),
      servings: dto.servings,
      mealType: normalizeMealType(dto.mealType),
      estimatedCost: dto.estimatedCost ?? null,
      isAiGenerated: dto.isAiGenerated ?? false,
      // BE trả tag là object `{ id, name, type }` -> UI dùng mảng string tên tag.
      tags: (dto.tags ?? [])
        .map((tag) => (typeof tag === 'string' ? tag : tag?.name))
        .filter(Boolean),
    };
  }

  /**
   * BE `RecipeSummaryDto` + `matchScore` -> UI `RecipeSuggestion`.
   * Giữ `matchPercent` cho màn khác dùng chung.
   */
  _toSuggestion(dto) {
    const recipe = this._toRecipe(dto);
    if (!recipe) return null;
    return {
      ...recipe,
      matchPercent: dto.matchScore ?? 0,
    };
  }

  /**
   * BE `RecipeDetailDto` -> UI `Recipe` + `ingredients`/`steps` chi tiết.
   *
   * BE `RecipeIngredientDto`: { ingredientId, ingredientName, quantity, unit,
   * isOptional, note, inFridge }.
   * UI cần: { name, amount, unit, inFridge }.
   * `inFridge` là phân tích của BE về tủ lạnh thật — ưu tiên hơn việc tự so
   * tên nguyên liệu (đó là cách P0.8 từng làm sai).
   */
  _toRecipeDetail(dto) {
    const recipe = this._toRecipe(dto);
    if (!recipe) return null;

    return {
      ...recipe,
      description: dto.description ?? null,
      ingredients: (dto.ingredients ?? []).map((ing) => ({
        id: ing.ingredientId,
        name: ing.ingredientName,
        amount: ing.quantity,
        unit: ing.unit,
        isOptional: ing.isOptional ?? false,
        note: ing.note ?? null,
        inFridge: ing.inFridge ?? false,
      })),
      // BE `RecipeStepDto.instruction` -> UI dùng mảng string instruction.
      steps: (dto.steps ?? []).map((step) => step.instruction),
    };
  }

  /**
   * BE `MealSlotResponseDto` -> UI `RecipeSuggestion` (shape meal-planning).
   *
   * Slot KHÔNG có `cookTime` -> lấy theo bữa (giống Flutter).
   * `cooked` lấy từ `completedAt` (BE dùng soft-delete + completedAt).
   */
  _toMealSlot(slot) {
    if (!slot) return null;

    const mealType = normalizeMealType(slot.mealType);

    return {
      // `id` của slot là định danh bản ghi meal plan, KHÔNG phải id recipe.
      id: slot.id,
      recipeId: slot.recipeId,
      name: slot.recipeName ?? '',
      image: null,
      cookTime: DEFAULT_COOK_TIME_BY_MEAL[mealType] ?? 20,
      difficulty: 'easy',
      servings: slot.servings ?? 1,
      mealType,
      cooked: slot.completedAt !== null && slot.completedAt !== undefined,
      estimatedCost: slot.estimatedCost ?? null,
      note: slot.note ?? null,
      matchPercent: 0,
      tags: [],
    };
  }

  // ═══════════════ Recipes ═══════════════

  /**
   * `GET /recipes` — danh sách công thức (phân trang).
   *
   * BE trả `{ data, total, page, limit, totalPages }`.
   * UI cần MẢNG phẳng -> trả array, giữ `meta` riêng cho phân trang vô hạn.
   *
   * @param {object} [filters]
   * @param {string} [filters.search]
   * @param {string} [filters.mealType]
   * @param {string} [filters.difficulty]
   * @param {string} [filters.tagIds]
   * @param {number} [filters.maxCookTime]
   * @param {number} [filters.page]
   * @param {number} [filters.limit]
   * @returns {Promise<Array>}
   */
  async getRecipes(filters = {}) {
    const params = this._buildListParams(filters);
    const payload = await this.client.get('/recipes', { params });
    return this._extractRecipeList(payload).map((dto) => this._toRecipe(dto));
  }

  /**
   * `GET /recipes` với filter + sort.
   *
   * ⚠️ BE `ListRecipesQueryDto` KHÔNG có `sortBy`/`sortDir` — BE luôn sort
   * `createdAt desc`. Sort theo tên/cook time/difficulty phải làm CLIENT-SIDE
   * trên tập kết quả đã nằm trong RAM (giống B1 làm với fridge search/sort).
   *
   * Cook-time filter (`<15` / `15-30` / `>30`) -> gửi `maxCookTime` LÊN SERVER
   * (BE có param này), không lọc client.
   */
  async getRecipesFiltered(filters = {}) {
    const params = this._buildListParams(filters);
    const payload = await this.client.get('/recipes', { params });
    const recipes = this._extractRecipeList(payload).map((dto) => this._toRecipe(dto));

    const { sortBy, sortDir } = filters;
    if (!sortBy) return recipes;

    const dir = sortDir === 'desc' ? -1 : 1;
    return [...recipes].sort((a, b) => {
      switch (sortBy) {
        case 'cookTime':
          return (a.cookTime - b.cookTime) * dir;
        case 'name':
          return String(a.name ?? '').localeCompare(String(b.name ?? '')) * dir;
        case 'difficulty': {
          const order = { easy: 0, medium: 1, hard: 2 };
          return ((order[a.difficulty] ?? 1) - (order[b.difficulty] ?? 1)) * dir;
        }
        default:
          return 0;
      }
    });
  }

  /**
   * `GET /recipes/{id}` — chi tiết công thức.
   *
   * ⚠️ BẮT BUỘC (plan mục 5.3): màn detail PHẢI fetch theo `id` vì object
   * truyền qua route param (suggestion từ Home) KHÔNG có ingredients/steps.
   *
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async getRecipeById(id) {
    if (!id) return null;
    const dto = await this.client.get(`/recipes/${id}`);
    return this._toRecipeDetail(dto);
  }

  /**
   * `GET /recipes/bookmarked` — công thức đã lưu.
   */
  async getBookmarked() {
    const payload = await this.client.get('/recipes/bookmarked');
    const list = Array.isArray(payload) ? payload : [];
    return list.map((dto) => this._toRecipe(dto));
  }

  /**
   * `POST /recipes/{id}/bookmark` — lưu công thức.
   * BE trả 204 No Content -> không có body để map.
   */
  async addBookmark(id) {
    await this.client.post(`/recipes/${id}/bookmark`);
  }

  /**
   * `DELETE /recipes/{id}/bookmark` — bỏ lưu công thức.
   */
  async removeBookmark(id) {
    await this.client.delete(`/recipes/${id}/bookmark`);
  }

  // ═══════════════ Suggestions (meal-planning slots) ═══════════════

  /**
   * `getSuggestions()` — bữa ăn HÔM NAY từ meal-planning slots.
   *
   * ⚠️ KHÔNG dùng `GET /recipes/suggestions` (đó là gợi ý theo tủ lạnh, không
   * phải kế hoạch bữa hôm nay). Plan mục 9b chốt: nguồn là meal-planning slots.
   *
   * Luồng: GET /meal-planning/plans -> plan đầu -> GET /meal-planning/plans/{id}
   *        -> dailyPlans[] -> lọc `dayOfWeek` hôm nay -> mealSlots[]
   *
   * @returns {Promise<Array>} tối đa 3 slot, đã sort theo thứ tự bữa
   */
  async getSuggestions() {
    const plans = await this.client.get('/meal-planning/plans');
    const planList = Array.isArray(plans) ? plans : [];
    if (planList.length === 0) return [];

    // Plan đầu tiên là plan MỚI NHẤT (BE order `weekStartDate desc`).
    const firstPlan = planList[0];
    if (!firstPlan?.id) return [];

    const detail = await this.client.get(`/meal-planning/plans/${firstPlan.id}`);
    const dailyPlans = Array.isArray(detail?.dailyPlans) ? detail.dailyPlans : [];
    if (dailyPlans.length === 0) return [];

    const today = todayDayOfWeek();

    // Tìm daily plan của hôm nay; fallback sang ngày đầu tiên (giống Flutter).
    const todayPlan = dailyPlans.find((d) => d?.dayOfWeek === today) ?? dailyPlans[0];

    const slots = Array.isArray(todayPlan?.mealSlots) ? todayPlan.mealSlots : [];

    return slots
      .map((slot) => this._toMealSlot(slot))
      .filter(Boolean)
      .sort((a, b) => {
        const orderA = MEAL_TYPE_ORDER[a.mealType] ?? 99;
        const orderB = MEAL_TYPE_ORDER[b.mealType] ?? 99;
        return orderA - orderB;
      })
      .slice(0, 3);
  }

  // ═══════════════ Weekly stats ═══════════════

  /**
   * `getWeeklyStats()` — thống kê tuần từ `GET /fridge/stats`.
   *
   * ⚠️ Endpoint là `/fridge/stats`, KHÔNG phải `/fridge/stats/chart`.
   * BE trả `FridgeStatsResponseDto`:
   *   { totalSpentThisMonth, wastePercent, mealsCooked, expiringSoonCount, totalItems }
   * Đây đúng là shape `WeeklyStats` mới -> không cần mapper phức tạp.
   *
   * Endpoint thuộc module fridge nhưng contract `WeeklyStats` nằm ở
   * IRecipeService (hook `useWeeklyStats` gọi `recipeService.getWeeklyStats()`).
   */
  async getWeeklyStats() {
    const dto = await this.client.get('/fridge/stats');
    return {
      mealsCooked: dto?.mealsCooked ?? 0,
      expiringSoonCount: dto?.expiringSoonCount ?? 0,
      totalSpentThisMonth: dto?.totalSpentThisMonth ?? 0,
      wastePercent: dto?.wastePercent ?? 0,
      totalItems: dto?.totalItems ?? 0,
    };
  }

  // ═══════════════ Helpers ═══════════════

  /**
   * Build query params cho `GET /recipes`.
   * Chỉ gửi param có giá trị — BE validate bằng class-validator, param rỗng sẽ lỗi.
   */
  _buildListParams(filters = {}) {
    const params = {};

    const search = (filters.search ?? '').trim();
    if (search) params.search = search;

    if (filters.mealType && filters.mealType !== 'all') {
      params.mealType = normalizeMealType(filters.mealType);
    }

    if (filters.difficulty && filters.difficulty !== 'all') {
      params.difficulty = normalizeDifficulty(filters.difficulty);
    }

    if (filters.tagIds) {
      const ids = Array.isArray(filters.tagIds) ? filters.tagIds.join(',') : filters.tagIds;
      if (ids) params.tagIds = ids;
    }

    // Cook-time filter -> gửi lên server (BE có `maxCookTime`).
    if (filters.maxCookTime) params.maxCookTime = filters.maxCookTime;

    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;

    return params;
  }

  /**
   * BE trả `{ data, total, page, limit, totalPages }` -> lấy mảng `data`.
   * ApiClient đã unwrap envelope `{ success, data }` nên đây chính là object pagination.
   */
  _extractRecipeList(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  }

  /**
   * Meta phân trang (cho phân trang vô hạn).
   * @returns {{total:number,page:number,limit:number,totalPages:number}}
   */
  getRecipesMeta(filters = {}) {
    const params = this._buildListParams(filters);
    return this.client
      .get('/recipes', { params })
      .then((payload) => ({
        total: payload?.total ?? 0,
        page: payload?.page ?? 1,
        limit: payload?.limit ?? 20,
        totalPages: payload?.totalPages ?? 0,
      }))
      .catch(() => ({ total: 0, page: 1, limit: 20, totalPages: 0 }));
  }
}

// R6: đăng ký bằng side-effect. Key `recipe` khớp `ServiceProvider.defaultServices`
// (`recipeService`) — Q5 đã chốt: dùng chung key, KHÔNG tách `mealPlanning`.
registerService('recipeService', new RealRecipeService());

export default RealRecipeService;
