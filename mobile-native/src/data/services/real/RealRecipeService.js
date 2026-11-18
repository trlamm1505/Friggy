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
 *
 * ⚠️ SPRINT B4 — bổ sung MEAL PLANNING + SHOPPING LIST vào CHÍNH service này.
 *   Q5 (plan mục 8) đã chốt: dùng CHUNG key `recipeService`, KHÔNG tạo
 *   `RealMealPlanningService` riêng, vì `useServiceHooks.js` là file immutable
 *   và hook đã gọi `recipeService.*`.
 *
 *   Endpoint mới dùng (đọc từ `meal-planning.controller.ts`):
 *     GET    /meal-planning/plans                     -> danh sách kế hoạch
 *     GET    /meal-planning/plans/{id}                -> chi tiết (dailyPlans + mealSlots)
 *     GET    /meal-planning/slots/{id}                -> công thức + phân tích tủ lạnh
 *     PATCH  /meal-planning/slots/{id}                -> tick đã nấu / đổi món
 *     POST   /meal-planning/plans/generate            -> 202 + jobId (AI)
 *     GET    /meal-planning/plans/generate/{jobId}/stream        -> SSE tiến độ
 *     POST   /meal-planning/plans/generate-from-expiring        -> 202 + jobId (AI)
 *     GET    /meal-planning/plans/generate-from-expiring/{jobId}/stream -> SSE
 *     POST   /meal-planning/slots/{id}/regenerate    -> 202 + jobId (AI đổi món)
 *     GET    /meal-planning/slots/{id}/regenerate/{jobId}/stream  -> SSE
 *     GET    /meal-planning/shopping-lists            -> danh sách mua + items
 *     POST   /meal-planning/shopping-lists            -> tạo list từ kế hoạch tuần
 *     PATCH  /meal-planning/shopping-lists/{listId}/items/{itemId} -> tick đã mua
 *
 * ⚠️ SHOPPING LIST — CHỈ 3 ENDPOINT (chuẩn hoá theo BE):
 *   BE KHÔNG có:
 *     - `POST   /meal-planning/shopping-lists/{listId}/items`   (thêm món lẻ)
 *     - `PATCH  /meal-planning/shopping-lists/{listId}/items/{itemId}` với body
 *             (sửa số lượng) — endpoint này KHÔNG có `@Body()`, nó TOGGLE
 *             `isPurchased` và khi tick `true` sẽ TỰ THÊM món vào tủ lạnh.
 *     - `DELETE /meal-planning/shopping-lists/{listId}/items/{itemId}`
 *     - `POST   /meal-planning/slots/{slotId}/missing-to-shopping-list`
 *     - `GET    /meal-planning/shopping-lists/active`
 *   => Thêm / sửa lượng / xoá món lẻ được làm ở CLIENT (SQLite), đúng như
 *      Flutter (`shopping_reminder_screen.dart` -> `_addNewItem` / `_deleteItem`
 *      chỉ cập nhật state local, KHÔNG gọi API).
 *   => "Thêm nguyên liệu thiếu vào giỏ" được tính ở CLIENT từ
 *      `GET /meal-planning/slots/{id}` (`summary.missingItems`).
 */

import { ApiClient } from '../../api/ApiClient';
import { registerService } from '../../api/ServiceRegistry';
import { streamSse } from '../../api/SseClient';
import { appConfig } from '../../../shared/config/appConfig';
import { offlineCache, toLocalDateStr, SYNC_STATUS } from '../../offline/OfflineCache';
import {
  computeMissingPurchaseQuantity,
  computeServingsScale,
} from '../../utils/shoppingMissing';

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
 * Enum status hợp lệ của `PATCH /meal-planning/plans/{id}`.
 * Nguồn: `be/src/modules-api/meal-planning/dto/meal-planning.dto.ts`
 * -> `UpdateMealPlanDto.status` (`@IsEnum`).
 */
const PLAN_STATUS_VALUES = ['draft', 'confirmed', 'active', 'completed'];

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
   *
   * ⚠️ TÊN MÓN: đọc theo thứ tự `recipeName` -> `recipe.title` -> `dishName`.
   *    Lý do: bảng `meal_slots` của BE KHÔNG có cột `recipeName` (chỉ có
   *    `recipeId`), nên `recipeName` chỉ tồn tại sau khi BE join `recipe`.
   *    Nếu BE chưa được deploy bản vá, `recipe.title` vẫn cứu được UI khỏi
   *    hiển thị "Chưa có món" cho MỌI slot (bug đã gặp ở B4).
   */
  _toMealSlot(slot) {
    if (!slot) return null;

    const mealType = normalizeMealType(slot.mealType);

    const recipeTitle =
      slot.recipeName ?? slot.recipe?.title ?? slot.dishName ?? slot.recipeNameLegacy ?? '';

    // ⚠️ ẢNH — PHẢI đọc `recipeThumbnail` (field BE FLATTEN trong
    //   `MealSlotResponseDto`), KHÔNG phải `slot.recipe.thumbnailPath`
    //   (BE không join `recipe` trong response -> luôn undefined -> mọi
    //   slot hiện ảnh trống).
    //   Vẫn giữ fallback `slot.recipe?.thumbnailPath` cho BE cũ.
    const thumbnail =
      slot.recipeThumbnail ?? slot.recipe?.thumbnailPath ?? slot.thumbnailPath ?? null;

    return {
      // `id` của slot là định danh bản ghi meal plan, KHÔNG phải id recipe.
      id: slot.id,
      recipeId: slot.recipeId,
      name: recipeTitle ?? '',
      image: thumbnail ? appConfig.getImageUrl(thumbnail) : null,
      // Ưu tiên thời gian nấu thật của công thức, không có thì lấy theo bữa.
      cookTime: slot.recipe?.cookTimeMinutes ?? DEFAULT_COOK_TIME_BY_MEAL[mealType] ?? 20,
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
   * ⚠️ OFFLINE — cache:
   *   - KHÔNG có filter server-side (`search`/`mealType`/`difficulty`/`tagIds`)
   *     và KHÔNG phân trang -> kết quả là snapshot ĐẦY ĐỦ -> dùng
   *     `saveRecipeList` (xoá sạch rồi insert) để cache luôn đúng bản mới nhất.
   *   - Có filter / có `page` -> kết quả chỉ là TẬP CON -> dùng
   *     `upsertRecipeList` (gộp, KHÔNG xoá) -> nếu xoá, cache bị cắt cụt và
   *     user offline chỉ thấy đúng phần đang lọc.
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
    const recipes = this._extractRecipeList(payload).map((dto) => this._toRecipe(dto));

    // P1 (offline) — cache danh sách công thức để màn "Gợi ý công thức"
    // không rơi xuống MOCK khi offline (user không được thấy món bịa).
    if (recipes.length > 0) {
      const isFullSnapshot = !this._hasServerFilter(filters) && !filters.page;
      const write = isFullSnapshot
        ? offlineCache.saveRecipeList(recipes)
        : offlineCache.upsertRecipeList(recipes);
      write.catch(() => {});
    }

    return recipes;
  }

  /**
   * Có filter server-side trong `filters` hay không.
   * @param {object} filters
   * @returns {boolean}
   */
  _hasServerFilter(filters = {}) {
    return Boolean(
      (filters.search ?? '').trim() ||
        (filters.mealType && filters.mealType !== 'all') ||
        (filters.difficulty && filters.difficulty !== 'all') ||
        filters.tagIds
    );
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

    // P1 (offline) — cache danh sách công thức (bộ chưa lọc) để offline
    // lọc client-side trong `OfflineCache.getRecipeList`.
    //
    // ⚠️ Kết quả ĐÃ LỌC (hoặc 1 trang) chỉ là tập con -> phải GỘP vào cache,
    //    KHÔNG dùng `saveRecipeList` (xoá sạch) -> nếu không, cache bị cắt cụt
    //    còn đúng phần đang lọc và user offline mất phần còn lại.
    if (recipes.length > 0) {
      offlineCache.upsertRecipeList(recipes).catch(() => {});
    }

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
    const detail = this._toRecipeDetail(dto);

    // P1 (offline) — cache chi tiết công thức để đọc được khi offline.
    if (detail) {
      offlineCache.saveRecipeDetail(id, 'recipe', detail).catch(() => {});
    }

    return detail;
  }

  /**
   * `GET /recipes/bookmarked` — công thức đã lưu.
   */
  async getBookmarked() {
    const payload = await this.client.get('/recipes/bookmarked');
    const list = Array.isArray(payload) ? payload : [];
    const recipes = list.map((dto) => this._toRecipe(dto));

    // P1 (offline) — cache danh sách bookmark để offline vẫn thấy món đã lưu.
    // ⚠️ Dùng `syncBookmarkedFlags` (KHÔNG dùng `saveRecipeList`) — hàm đó xoá
    //    sạch bảng, sẽ mất danh sách công thức chính đã cache.
    if (recipes.length > 0) {
      offlineCache
        .syncBookmarkedFlags(recipes.map((r) => r.id))
        .catch(() => {});
    }

    return recipes;
  }

  /**
   * `POST /recipes/{id}/bookmark` — lưu công thức.
   * BE trả 204 No Content -> không có body để map.
   */
  async addBookmark(id) {
    await this.client.post(`/recipes/${id}/bookmark`);
    // P1 (offline) — cập nhật cache để offline vẫn hiện icon đã lưu.
    offlineCache.setRecipeBookmarked(id, true).catch(() => {});
  }

  /**
   * `DELETE /recipes/{id}/bookmark` — bỏ lưu công thức.
   */
  async removeBookmark(id) {
    await this.client.delete(`/recipes/${id}/bookmark`);
    // P1 (offline) — cập nhật cache.
    offlineCache.setRecipeBookmarked(id, false).catch(() => {});
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

    const suggestions = slots
      .map((slot) => this._toMealSlot(slot))
      .filter(Boolean)
      .sort((a, b) => {
        const orderA = MEAL_TYPE_ORDER[a.mealType] ?? 99;
        const orderB = MEAL_TYPE_ORDER[b.mealType] ?? 99;
        return orderA - orderB;
      })
      .slice(0, 3);

    // ⚠️ OFFLINE — cache "thực đơn ngày".
    //   Trước đây `getSuggestions()` KHÔNG ghi cache -> offline màn "Bữa ăn
    //   hôm nay" ở Home rơi xuống cache kế hoạch tuần, mà cache đó có thể
    //   là tuần KHÁC -> không có slot của hôm nay -> Home hiện "Chưa có món".
    //   => Ghi cache theo NGÀY (giờ địa phương) để offline vẫn xem được
    //      đúng thực đơn hôm nay.
    if (suggestions.length > 0) {
      offlineCache.saveDailyMeals(toLocalDateStr(), suggestions).catch(() => {});

      // ⚠️ OFFLINE — cache CHI TIẾT công thức của các món hôm nay.
      //   Danh sách rút gọn (`name`, `image`) không đủ để mở màn chi tiết
      //   công thức offline (nguyên liệu + cách nấu).
      //   => Tải `GET /meal-planning/slots/{id}` cho từng slot (nền, không
      //      chặn trả về).
      this._prefetchSlotDetails(suggestions.map((s) => s.id)).catch(() => {});
    }

    return suggestions;
  }

  /**
   * Tải nền chi tiết các slot (meal plan) để cache offline.
   *
   * ⚠️ VÌ SAO CẦN:
   *   Offline user phải MỞ được chi tiết công thức của các món trong thực
   *   đơn ngày / tuần (nguyên liệu + cách nấu). Ngoài ra, khi tick "đã nấu"
   *   offline, client cần biết chính xác cần nguyên liệu gì để tự trừ tủ
   *   lạnh (xem `OfflineCache.consumeIngredientsForSlot`).
   *
   * ⚠️ Chạy nền, không chặn UI. Lỗi 1 slot -> bỏ qua.
   *
   * @param {Array<string>} slotIds
   * @returns {Promise<void>}
   */
  async _prefetchSlotDetails(slotIds = []) {
    const ids = (slotIds ?? []).filter(Boolean).map(String);
    if (ids.length === 0) return;

    // Giới hạn 4 request song song -> không spam server.
    const batchSize = 4;
    const recipeIds = new Set();

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (slotId) => {
          try {
            const detail = await this.getSlotDetail(slotId);
            if (detail) {
              await offlineCache.saveRecipeDetail(slotId, 'slot', detail);
              if (detail.recipe?.id) recipeIds.add(String(detail.recipe.id));
            }
          } catch (_e) {
            // Bỏ qua lỗi 1 slot.
          }
        })
      );
    }

    // ⚠️ Cache CHI TIẾT CÔNG THỨC theo `recipeId` — màn "Chi tiết công thức"
    //   fetch theo `recipeId` (không phải slot id) -> offline cần cache này
    //   để mở được món từ thực đơn ngày / tuần.
    const recipeIdList = Array.from(recipeIds);
    for (let i = 0; i < recipeIdList.length; i += batchSize) {
      const batch = recipeIdList.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (recipeId) => {
          try {
            await this.getRecipeById(recipeId);
          } catch (_e) {
            // Bỏ qua lỗi 1 công thức.
          }
        })
      );
    }
  }

  // ═══════════════ Meal planning (Sprint B4) ═══════════════

  /**
   * BE `WeeklyPlanSummaryResponseDto` -> UI `MealPlanSummary`.
   *
   * @param {object} dto
   * @returns {object|null}
   */
  _toPlanSummary(dto) {
    if (!dto) return null;
    return {
      id: dto.id,
      weekStart: dto.weekStartDate ?? null,
      totalBudget: dto.totalBudget ?? 0,
      actualCost: dto.actualCost ?? null,
      status: dto.status ?? 'draft',
      generatedByAi: dto.generatedByAi ?? false,
      isSmartFiltered: dto.isSmartFiltered ?? false,
      createdAt: dto.createdAt ?? null,
    };
  }

  /**
   * BE `DailyPlanResponseDto` -> UI `MealPlanDay`.
   *
   * `dayOfWeek` của BE thực tế là 1=T2 ... 7=CN (xem `meal-plan.tools.ts:62`),
   * KHÁC với comment trong DTO ("0=CN, 1=T2"). Ta giữ nguyên số BE trả về
   * và chuẩn hoá khi hiển thị (xem `nextWeekSuggestions`).
   *
   * @param {object} dto
   * @returns {object|null}
   */
  _toPlanDay(dto) {
    if (!dto) return null;
    const slots = Array.isArray(dto.mealSlots) ? dto.mealSlots : [];
    return {
      id: dto.id,
      dayOfWeek: dto.dayOfWeek,
      date: dto.date ?? null,
      dailyBudget: dto.dailyBudget ?? null,
      slots: slots.map((slot) => this._toMealSlot(slot)).filter(Boolean),
    };
  }

  /**
   * BE `SlotDetailResponseDto` -> UI `MealSlotDetail`.
   *
   * BE trả `summary.missingItems` = nguyên liệu thiếu / thiếu một phần, kèm
   * `fridgeStatus` ('have'|'partial'|'missing') và `missingQuantity`.
   *
   * @param {object} dto
   * @returns {object|null}
   */
  _toSlotDetail(dto) {
    if (!dto) return null;

    const recipe = dto.recipe ?? null;
    const summary = dto.summary ?? null;

    return {
      id: dto.id,
      mealType: normalizeMealType(dto.mealType),
      servings: dto.servings ?? 1,
      completedAt: dto.completedAt ?? null,
      cooked: dto.completedAt !== null && dto.completedAt !== undefined,
      recipe: recipe
        ? {
            id: recipe.id,
            name: recipe.title,
            description: recipe.description ?? null,
            // R2: ảnh phải qua getImageUrl.
            image: appConfig.getImageUrl(recipe.thumbnailPath) ?? null,
            cookTime: recipe.cookTimeMinutes,
            difficulty: normalizeDifficulty(recipe.difficultyLevel),
            estimatedCost: recipe.estimatedCost ?? null,
            steps: (recipe.steps ?? []).map((s) => s.instruction),
            // ⚠️ Khẩu phần GỐC của công thức — cần để scale lại `ingredients`
            //   khi user đổi khẩu phần (offline client tự trừ tủ lạnh).
            //   BE cũ chưa trả field này -> fallback về `servings` của slot.
            servings: recipe.servings ?? dto.servings ?? 1,
            // ⚠️ OFFLINE — PHẢI giữ DANH SÁCH NGUYÊN LIỆU của công thức.
            //   BE trả `recipe.ingredients[]` (IngredientAvailabilityDto) với
            //   `quantityNeeded` (đã scale theo servings) + `baseUnit` +
            //   `originalUnit` + `ingredientId`.
            //   Trước đây mapper BỎ field này -> cache slot không biết cần
            //   nguyên liệu gì -> offline không thể tự trừ tủ lạnh khi user
            //   tick "đã nấu" (xem `OfflineCache.consumeIngredientsForSlot`).
            ingredients: (recipe.ingredients ?? []).map((item) => ({
              ingredientId: item.ingredientId ?? null,
              name: item.name ?? '',
              // Lượng cần dùng đã quy về base unit (g / ml / đơn vị đếm).
              quantityNeeded: item.quantityNeeded ?? 0,
              baseUnit: item.baseUnit ?? item.originalUnit ?? null,
              // Lượng gốc theo đơn vị gốc của công thức (vd 200 'g').
              originalQuantity: item.originalQuantity ?? 0,
              originalUnit: item.originalUnit ?? null,
              isOptional: item.isOptional ?? false,
              fridgeStatus: item.fridgeStatus ?? 'missing',
              fridgeQuantity: item.fridgeQuantity ?? 0,
              missingQuantity: item.missingQuantity ?? 0,
            })),
          }
        : null,
      summary: {
        totalIngredients: summary?.totalIngredients ?? 0,
        haveCount: summary?.haveCount ?? 0,
        partialCount: summary?.partialCount ?? 0,
        missingCount: summary?.missingCount ?? 0,
        fridgeReadyPercent: summary?.fridgeReadyPercent ?? 0,
        missingItems: (summary?.missingItems ?? []).map((item) => ({
          ingredientId: item.ingredientId,
          name: item.name,
          // ⚠️ PHẢI giữ `undefined` khi BE không trả (KHÔNG ép 0):
          //   `computeMissingPurchaseQuantity` dùng `Number(quantityNeeded)`,
          //   nếu là 0 -> `needed` hữu hạn -> kết quả luôn = 0 -> MẤT món.
          //   Giữ `undefined` -> fallback về `missingQuantity` (đúng công thức).
          quantityNeeded: item.quantityNeeded,
          // ⚠️ Giữ cả `baseUnit` (đơn vị quy chuẩn) + `originalUnit`.
          baseUnit: item.baseUnit ?? null,
          originalUnit: item.originalUnit ?? null,
          unit: item.baseUnit ?? item.originalUnit ?? item.unit ?? null,
          isOptional: item.isOptional ?? false,
          fridgeStatus: item.fridgeStatus ?? 'missing',
          // ⚠️ PHẢI giữ `fridgeQuantity` — offline tính lại lượng thiếu theo
          //   khẩu phần: `max(0, quantityNeeded * scale - fridgeQuantity)`.
          fridgeQuantity: item.fridgeQuantity ?? 0,
          missingQuantity: item.missingQuantity ?? 0,
        })),
      },
    };
  }

  /**
   * `GET /meal-planning/plans` — danh sách kế hoạch tuần.
   *
   * @returns {Promise<object[]>}
   */
  async getPlans() {
    const payload = await this.client.get('/meal-planning/plans');
    const list = Array.isArray(payload) ? payload : (payload?.data ?? []);
    return list.map((dto) => this._toPlanSummary(dto)).filter(Boolean);
  }

  /**
   * `GET /meal-planning/plans/{id}` — chi tiết kế hoạch (7 ngày x N bữa).
   *
   * @param {string} planId
   * @returns {Promise<object|null>}
   */
  async getPlanDetail(planId) {
    if (!planId) return null;
    const payload = await this.client.get(`/meal-planning/plans/${planId}`);
    if (!payload) return null;

    const dailyPlans = Array.isArray(payload.dailyPlans) ? payload.dailyPlans : [];
    const days = dailyPlans.map((dto) => this._toPlanDay(dto)).filter(Boolean);

    const result = {
      ...this._toPlanSummary(payload),
      days,
    };

    // P1 (offline) — cache kế hoạch tuần để đọc được khi offline.
    offlineCache
      .saveWeeklyPlan({
        id: result.id,
        weekStart: result.weekStart,
        days,
      })
      .catch(() => {});

    return result;
  }

  /**
   * `getNextWeekPlan()` — kế hoạch tuần gần nhất, đã chuẩn hoá theo ngày.
   *
   * ⚠️ Contract cũ (`IRecipeService.getNextWeekPlan`) trả `{ id, weekStart, slots }`
   * với `slots` = { breakfast, lunch, dinner }. Nhưng B4 cần đủ 7 ngày x 3 bữa
   * cho màn "Thực đơn tuần tới" -> trả shape MỚI, giàu thông tin hơn:
   *   { id, weekStart, days: [{ dayOfWeek, date, slots: [...] }] }
   *
   * UI đọc `days[]` để vẽ lịch 7 ngày; `slots` bên trong giữ đủ
   * `mealType` để KHÔNG phải đoán bữa theo index (xét giải thích đầu file).
   *
   * @returns {Promise<object|null>}
   */
  async getNextWeekPlan() {
    const plans = await this.getPlans();
    if (!plans.length) return null;

    const detail = await this.getPlanDetail(plans[0].id);
    if (!detail) return null;

    return {
      id: detail.id,
      weekStart: detail.weekStart,
      status: detail.status,
      totalBudget: detail.totalBudget,
      days: detail.days,
    };
  }

  /**
   * `GET /meal-planning/slots/{id}` — chi tiết slot: công thức + phân tích tủ lạnh.
   *
   * @param {string} slotId
   * @returns {Promise<object|null>}
   */
  async getSlotDetail(slotId) {
    if (!slotId) return null;
    const payload = await this.client.get(`/meal-planning/slots/${slotId}`);
    const detail = this._toSlotDetail(payload);

    // P1 (offline) — pre-cache chi tiết slot để mở được khi offline.
    if (detail) {
      offlineCache.saveRecipeDetail(slotId, 'slot', detail).catch(() => {});
    }

    return detail;
  }

  /**
   * `PATCH /meal-planning/plans/{id}` — đổi trạng thái kế hoạch.
   *
   * BE `UpdateMealPlanDto` chỉ nhận `status`:
   * 'draft' | 'confirmed' | 'active' | 'completed'.
   *
   * ⚠️ Gửi status ngoài enum -> BE trả 400 (`@IsEnum`). Ta chặn ở client để
   *   không bắn request chắc chắn lỗi.
   *
   * @param {string} planId
   * @param {{status?:string}} payload
   * @returns {Promise<void>}
   */
  async updatePlan(planId, payload = {}) {
    if (!planId) return;
    const body = {};
    if (payload.status !== undefined) {
      if (!PLAN_STATUS_VALUES.includes(payload.status)) return;
      body.status = payload.status;
    }
    if (!Object.keys(body).length) return;

    await this.client.patch(`/meal-planning/plans/${planId}`, body);
  }

  /**
   * `PATCH /meal-planning/slots/{id}` — tick "đã nấu" hoặc đổi công thức.
   *
   * ⚠️ BE dùng `completed` (boolean) để set `completedAt` (xem
   * `meal-planning.service.ts:208`). Gửi `completed: false` để bỏ tick.
   *
   * ⚠️ BE trả kèm `consumedIngredients` = danh sách nguyên liệu ĐÃ TRỪ khỏi
   *    tủ lạnh (chỉ có lần tick đầu tiên) -> FE hiển thị cho user biết đã
   *    dùng bao nhiêu nguyên liệu. Trả về object để UI dùng.
   *
   * ⚠️ `servings` — PHẢI gửi khi user đã chỉnh khẩu phần ở màn chi tiết.
   *    BE scale nguyên liệu theo `servings / recipe.servings`; nếu không gửi,
   *    BE dùng `slot.servings` (lúc sinh kế hoạch) -> TRỪ SAI LƯỢNG.
   *    Xem `useCookSlot` / `RecipeDetailScreen.startCooking`.
   *
   * ⚠️ `missingIngredients` = nguyên liệu CÒN THIẾU trong tủ lạnh (đã quy
   *    về base unit) -> FE cảnh báo user trước/sau khi nấu.
   *
   * @param {string} slotId
   * @param {{completed?:boolean, recipeId?:string|null, servings?:number, note?:string}} payload
   * @returns {Promise<{id:string,completedAt:string|null,consumedIngredients:Array,missingIngredients:Array}>}
   */
  async updateSlot(slotId, payload = {}) {
    if (!slotId) {
      return {
        id: slotId,
        completedAt: null,
        consumedIngredients: [],
        missingIngredients: [],
      };
    }
    const body = {};
    if (payload.completed !== undefined) body.completed = Boolean(payload.completed);
    if (payload.recipeId !== undefined) body.recipeId = payload.recipeId;
    if (payload.servings !== undefined) body.servings = payload.servings;
    if (payload.note !== undefined) body.note = payload.note;

    const result = await this.client.patch(`/meal-planning/slots/${slotId}`, body);

    return {
      id: result?.id ?? slotId,
      completedAt: result?.completedAt ?? null,
      consumedIngredients: Array.isArray(result?.consumedIngredients)
        ? result.consumedIngredients
        : [],
      // ⚠️ BE cũ (chưa deploy) không trả field này -> default [] để không vỡ.
      missingIngredients: Array.isArray(result?.missingIngredients)
        ? result.missingIngredients
        : [],
      // ⚠️ BE `PATCH /meal-planning/slots/:id` chỉ trả
      //   `{ id, mealType, recipeId, servings, note, completedAt }`
      //   -> KHÔNG có `consumedIngredients` / `missingIngredients`.
      //   CỜ này = true khi cả 2 mảng rỗng -> UI biết dữ liệu CHƯA có
      //   (fallback sang `getSlotDetail` để tự suy ra) thay vì hiện toast
      //   "đã dùng 0 nguyên liệu".
      missingDetailFields:
        (Array.isArray(result?.consumedIngredients) ? result.consumedIngredients : []).length ===
          0 &&
        (Array.isArray(result?.missingIngredients) ? result.missingIngredients : []).length === 0,
    };
  }

  /**
   * `markSlotCooked(planId, slot)` — tick "đã nấu" cho 1 slot.
   *
   * ⚠️ Contract cũ dùng `(planId, slot)` với `slot` = 'breakfast'|'lunch'|'dinner'.
   * B4 cần id slot thật (vì 1 ngày có nhiều slot) -> ưu tiên `slot.slotId`.
   *
   * @param {string} planId - id kế hoạch (giữ cho tương thích contract)
   * @param {string|object} slot - slot id HOẶC object `{ id, completed }`
   * @returns {Promise<void>}
   */
  async markSlotCooked(planId, slot) {
    const slotId = typeof slot === 'string' ? slot : slot?.id;
    if (!slotId) return;

    const completed = typeof slot === 'object' ? slot.completed !== false : true;
    await this.updateSlot(slotId, { completed });
  }

  // ═══════════════ AI meal planning (SSE) ═══════════════

  /**
   * `POST /meal-planning/plans/generate` — nhờ AI lập thực đơn tuần.
   *
   * BE trả 202 ngay + `jobId`. Tiến độ đến qua SSE.
   *
   * @param {{weekStartDate:string, budget:number}} params
   * @returns {Promise<{jobId:string, status:string, streamUrl:string}>}
   */
  async generatePlan(params = {}) {
    const payload = await this.client.post('/meal-planning/plans/generate', {
      weekStartDate: params.weekStartDate,
      budget: Number(params.budget ?? 0),
    });
    return {
      jobId: payload?.jobId ?? null,
      status: payload?.status ?? 'queued',
      streamUrl: payload?.streamUrl ?? null,
    };
  }

  /**
   * `POST /meal-planning/plans/generate-from-expiring` — lập thực đơn ưu tiên
   * nguyên liệu sắp hết hạn.
   *
   * @param {{withinDays?:number, days?:number}} [params]
   * @returns {Promise<{jobId:string, status:string, streamUrl:string}>}
   */
  async generateFromExpiring(params = {}) {
    const body = {};
    if (params.withinDays !== undefined) body.withinDays = Number(params.withinDays);
    if (params.days !== undefined) body.days = Number(params.days);

    const payload = await this.client.post('/meal-planning/plans/generate-from-expiring', body);
    return {
      jobId: payload?.jobId ?? null,
      status: payload?.status ?? 'queued',
      streamUrl: payload?.streamUrl ?? null,
    };
  }

  /**
   * `POST /meal-planning/slots/{id}/regenerate` — nhờ AI gợi ý 3 món thay thế.
   *
   * @param {string} slotId
   * @param {string} [reason] - 'no_ingredients'|'dislike'|'want_different'|'too_expensive'
   * @returns {Promise<{jobId:string, status:string, streamUrl:string}>}
   */
  async regenerateSlot(slotId, reason = 'want_different') {
    const payload = await this.client.post(`/meal-planning/slots/${slotId}/regenerate`, { reason });
    return {
      jobId: payload?.jobId ?? null,
      status: payload?.status ?? 'queued',
      streamUrl: payload?.streamUrl ?? null,
    };
  }

  /**
   * Mở luồng SSE tiến độ tạo thực đơn / đổi món slot.
   *
   * ⚠️ BE dùng 2 định dạng event khác nhau:
   *   1. Tạo thực đơn: event = tên bước (`supervisor_start`, `chef_start`,
   *     `completed`, `failed`, ...), data = payload.
   *   2. Đổi món slot: BE gửi `sendEvent(payload.event ?? 'result', payload)` ->
   *     tên event nằm ở DÒNG `event:` của SSE, còn `data` là payload phẳng
   *     `{ event: 'done', slotId, suggestions, message }`.
   *   => `SseClient` đã chuẩn hoá: `event` = tên event, `data` = payload đầy đủ.
   *
   * @param {string} path - path stream (có thể lấy từ `streamUrl` của BE)
   * @param {{signal?:AbortSignal}} [options]
   * @returns {AsyncGenerator<{event:string, data:any}>}
   */
  async *streamPlanProgress(path, options = {}) {
    if (!path) return;

    // BE trả `streamUrl` có thể kèm prefix `/api/v1` (đã nằm trong base URL của
    // ApiClient) -> bỏ prefix để không gọi `/api/v1/api/v1/...`.
    const normalizedPath = path.replace(/^\/api\/v1/, '');

    for await (const raw of streamSse(normalizedPath, { signal: options.signal })) {
      // `data` có thể là payload phẳng (kiểu đổi món slot) -> giữ nguyên.
      // Nếu là object có `event` bên trong -> lấy `data.event` làm tên event
      // (phòng khi BE đổi format).
      const data = raw.data;
      const innerEvent =
        data && typeof data === 'object' && typeof data.event === 'string' ? data.event : null;

      yield {
        event: innerEvent ?? raw.event,
        data: innerEvent ? data : (data ?? raw),
      };
    }
  }

  // ═══════════════ Shopping list (Sprint B4) ═══════════════

  /**
   * BE `ShoppingListItemResponseDto` -> UI `ShoppingItem`.
   *
   * ⚠️ Tên field lệch:
   *   BE `ingredientName` -> UI `name`
   *   BE `isPurchased`     -> UI `done`
   *   BE `id` là SỐ (`@ApiProperty({ example: 1 })`) -> giữ nguyên kiểu,
   *      vì endpoint toggle dùng `ParseIntPipe`.
   *
   * @param {object} dto
   * @returns {object|null}
   */
  _toShoppingItem(dto) {
    if (!dto) return null;
    return {
      id: dto.id,
      // BE `ingredientId` — cần để gọi endpoint thêm/xoá món lẻ.
      ingredientId: dto.ingredientId ?? null,
      name: dto.ingredientName ?? '',
      quantity: dto.quantity ?? 0,
      unit: dto.unit ?? '',
      done: dto.isPurchased ?? false,
      estimatedPrice: dto.estimatedPrice ?? null,
      purchasedAt: dto.purchasedAt ?? null,
      // Nhà cung cấp đã đăng ký bán nguyên liệu này (BE tự enrich).
      // ⚠️ Rỗng / undefined -> mảng rỗng => UI KHÔNG hiển thị gì (đúng yêu cầu).
      supplierSuggestions: this._toSupplierSuggestions(dto.supplierSuggestions),
    };
  }

  /**
   * BE `supplierSuggestions[]` -> shape UI dùng để hiển thị.
   *
   * ⚠️ BE CHƯA khai báo field này trong `ShoppingListItemResponseDto` nhưng
   *   `meal-planning.service.ts` đã trả kèm (đọc file BE). Vì vậy mapper phải
   *   phòng thủ: thiếu field, null, hay sai kiểu -> trả `[]` (UI bỏ qua).
   *
   * Ảnh (`imagePath`) là đường dẫn tương đối -> phải qua `appConfig.getImageUrl()`
   *   (R2) nếu không sẽ KHÔNG hiển thị mà không có lỗi nào.
   *
   * @param {Array<object>|null|undefined} raw
   * @returns {Array<{supplierIngredientId:string,name:string,companyName:string,price:number|null,image:string|null}>}
   */
  _toSupplierSuggestions(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((s) => s && (s.name || s.companyName))
      .map((s) => ({
        supplierIngredientId: s.supplierIngredientId ?? s.id ?? null,
        name: s.name ?? '',
        companyName: s.companyName ?? '',
        price: typeof s.price === 'number' ? s.price : null,
        image: s.imagePath ? appConfig.getImageUrl(s.imagePath) : null,
      }));
  }

  /**
   * `GET /meal-planning/shopping-lists` — danh sách mua của user.
   *
   * @returns {Promise<object[]>} danh sách shopping list (mỗi list kèm `items`)
   */
  async getShoppingLists() {
    const payload = await this.client.get('/meal-planning/shopping-lists');
    const list = Array.isArray(payload) ? payload : (payload?.data ?? []);

    // ⚠️ MÓN ĐÃ XOÁ Ở MÁY (tombstone `local_deleted`):
    //   BE KHÔNG có endpoint xoá món lẻ -> server VẪN trả món đó. Nếu không
    //   lọc, món đã xoá sẽ "hồi sinh" mỗi lần user mở màn danh sách mua.
    let deletedIds = [];
    try {
      deletedIds = await offlineCache.getLocallyDeletedShoppingItemIds();
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[RealRecipeService] Không đọc được tombstone món mua:', e?.message);
      }
    }
    const deletedSet = new Set((deletedIds ?? []).map(String));

    const mapped = list.filter(Boolean).map((dto) => ({
      id: dto.id,
      title: dto.title ?? '',
      // ⚠️ BE tạo list với `status = 'draft'` -> default phải khớp.
      status: dto.status ?? 'draft',
      totalEstimatedCost: dto.totalEstimatedCost ?? null,
      weeklyPlanId: dto.weeklyPlanId ?? null,
      createdAt: dto.createdAt ?? null,
      items: (dto.items ?? [])
        .map((item) => this._toShoppingItem(item))
        .filter(Boolean)
        .filter((item) => !deletedSet.has(String(item.id))),
    }));

    // P1 (offline) — cache danh sách mua (gộp phẳng) để đọc được khi offline.
    const flat = mapped.flatMap((l) => l.items.map((item) => ({ ...item, listId: l.id })));
    if (flat.length > 0) {
      offlineCache.saveShoppingItems(flat).catch(() => {});
    }

    // ⚠️ BUG ĐÃ SỬA (user báo: "món thêm offline bị kẹt"):
    //   Đường đọc ONLINE trả CHỈ list server -> món user vừa thêm offline
    //   (op `shopping_item_add` còn trong hàng đợi) KHÔNG có trong server ->
    //   BIẾN MẤT khỏi UI, và chỉ hiện lại khi tắt mạng.
    //   => GỘP các món đang chờ đồng bộ vào kết quả (giống `RealFridgeService`
    //      đã làm cho tủ lạnh) -> 2 đường đọc cho ra CÙNG kết quả.
    const withPending = await this._mergePendingShoppingItems(mapped);

    // ⚠️ Cache id giỏ mua đang dùng (list THẬT) -> khi offline, nút "+ Thêm"
    //   cần list id để queue op (id giả `'offline'` sẽ khiến server trả 404).
    const activeList = withPending.find((l) => l.status === 'active') ?? withPending[0];
    if (activeList?.id) {
      offlineCache.saveActiveShoppingListId(activeList.id).catch(() => {});
    }

    return withPending;
  }

  /**
   * Gộp các món mua CHỈ có ở máy vào list server.
   *
   * ⚠️ VÌ SAO 2 NGUỒN DỮ LIỆU PHẢI HỘI TỤ:
   *   - Server: nguồn sự thật cho những món BE quản lý (tạo list từ kế hoạch).
   *   - SQLite (`local_shopping_items`): có món 'pending' (tick offline chờ
   *     upload) và món 'local_only' (user tự thêm / tự sửa lượng — BE KHÔNG
   *     có endpoint cho các thao tác này -> món đó KHÔNG BAO GIỜ có trên server).
   *   => Gộp cả 2 loại vào kết quả để 2 đường đọc (online/offline) khớp nhau.
   *
   * ⚠️ Món đã bị XOÁ ở máy ('local_deleted') -> KHÔNG xuất hiện nữa, kể cả khi
   *   server vẫn còn món đó (BE không có endpoint xoá món lẻ).
   *
   * ⚠️ Món pending KHÔNG có `listId` thật (offline không biết list id) ->
   *   gán vào list đầu tiên của server (thường là list active) để UI hiển thị
   *   và để `toggleShoppingItemInList` gọi đúng endpoint khi user tick.
   *
   * @private
   * @param {Array<object>} serverLists - list đã map từ BE
   * @returns {Promise<Array<object>>}
   */
  async _mergePendingShoppingItems(serverLists) {
    let pending = [];
    let localOnly = [];

    try {
      pending = await offlineCache.getPendingShoppingItems();
      localOnly = await offlineCache.getLocalOnlyShoppingItems();
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[RealRecipeService] Không đọc được món mua pending:', e?.message);
      }
      return serverLists;
    }

    const localItems = [...(pending ?? []), ...(localOnly ?? [])];
    if (!Array.isArray(localItems) || localItems.length === 0) return serverLists;

    const lists = serverLists.map((l) => ({ ...l, items: [...(l.items ?? [])] }));
    const fallbackListId = lists[0]?.id ?? null;

    for (const p of localItems) {
      // ⚠️ Món server đã bị user SỬA LƯỢNG ở máy:
      //   BE không có endpoint sửa lượng -> bản local là mới nhất -> PHẢI ghi đè
      //   lượng của server (nếu không -> user thấy lượng cũ sau mỗi lần bật mạng).
      const serverItem = lists
        .flatMap((l) => l.items ?? [])
        .find((i) => String(i.id) === String(p.id));
      if (serverItem) {
        if (p._syncStatus === SYNC_STATUS.PENDING) {
          // Tick offline đang chờ upload -> giữ trạng thái tick của user.
          serverItem.done = p.done;
        } else {
          serverItem.quantity = p.quantity;
          serverItem.unit = p.unit ?? serverItem.unit;
        }
        continue;
      }

      const listId = p.listId ?? fallbackListId;
      if (!listId) continue;

      const target = lists.find((l) => String(l.id) === String(listId));
      if (!target) continue;

      target.items.push({ ...p, listId: target.id });
    }

    return lists;
  }

  /**
   * `getShoppingList()` — danh sách mua phẳng (contract `IRecipeService`).
   *
   * UI (ShoppingReminderScreen) làm việc với mảng item phẳng, nên gộp items
   * của TẤT CẢ list lại. Nếu chưa có list nào -> trả mảng rỗng (EmptyState).
   *
   * @returns {Promise<object[]>}
   */
  async getShoppingList() {
    const lists = await this.getShoppingLists();
    // Gắn `listId` vào từng item để UI biết gọi endpoint toggle với đúng list
    // (BE cần CẢ listId + itemId).
    return lists.flatMap((list) => list.items.map((item) => ({ ...item, listId: list.id })));
  }

  /**
   * `POST /meal-planning/shopping-lists` — tạo danh sách mua từ kế hoạch tuần.
   *
   * ⚠️ BE tự lọc nguyên liệu thiếu so với tủ lạnh và tạo list với
   *   `status = 'draft'` (xem `meal-planning.service.ts` -> `createShoppingList`).
   *   Vì vậy default status khi map phải là `'draft'`, KHÔNG phải `'active'`.
   *
   * @param {string} weeklyPlanId
   * @param {string} [title]
   * @returns {Promise<object>} shopping list đã tạo
   */
  async createShoppingList(weeklyPlanId, title) {
    if (!weeklyPlanId) return null;

    const body = { weeklyPlanId };
    const trimmed = (title ?? '').trim();
    if (trimmed) body.title = trimmed;

    const payload = await this.client.post('/meal-planning/shopping-lists', body);
    if (!payload) return null;

    return {
      id: payload.id,
      title: payload.title ?? '',
      status: payload.status ?? 'draft',
      totalEstimatedCost: payload.totalEstimatedCost ?? null,
      weeklyPlanId: payload.weeklyPlanId ?? null,
      createdAt: payload.createdAt ?? null,
      items: (payload.items ?? []).map((item) => this._toShoppingItem(item)).filter(Boolean),
    };
  }

  /**
   * `PATCH /meal-planning/shopping-lists/{listId}/items/{itemId}` — tick đã mua.
   *
   * ⚠️ BE tự TOGGLE (không nhận `isPurchased` trong body) -> chỉ cần gọi.
   *
   * ⚠️ MÓN CHỈ CÓ Ở MÁY (`local_*`):
   *   BE dùng `ParseIntPipe` cho `itemId` -> id local sẽ bị 400.
   *   Vì vậy món user tự thêm được tick 100% ở client (giống Flutter).
   *
   * @param {string} listId
   * @param {string|number} itemId
   * @returns {Promise<void>}
   */
  async toggleShoppingItemInList(listId, itemId) {
    if (!listId || itemId === null || itemId === undefined) return;

    // Món chỉ có ở máy -> KHÔNG gọi API (BE không có id cho nó).
    const isLocalOnly = await this._isLocalOnlyShoppingItem(itemId);
    if (isLocalOnly) {
      await offlineCache.toggleLocalShoppingItem(itemId);
      return;
    }

    await this.client.patch(`/meal-planning/shopping-lists/${listId}/items/${itemId}`);
  }

  /**
   * 1 món mua có CHỈ tồn tại ở máy (không có id server) hay không?
   *
   * ⚠️ Món CÓ id server -> vẫn tick qua API được (BE có endpoint toggle),
   *   kể cả khi user đã sửa lượng ở máy (row bị đánh dấu `local_only`).
   *
   * @private
   * @param {string|number} itemId
   * @returns {Promise<boolean>}
   */
  async _isLocalOnlyShoppingItem(itemId) {
    try {
      // Trường hợp rõ ràng: trong cache và KHÔNG có id server.
      const localOnly = await offlineCache.isShoppingItemLocalOnly(itemId);
      if (localOnly) return true;

      // Không có trong cache -> mặc định coi như món của server (id số).
      const backendId = await offlineCache.getShoppingItemBackendId(itemId);
      return backendId === null && typeof itemId === 'string' && itemId.startsWith('local_');
    } catch (_e) {
      return false;
    }
  }

  /**
   * `toggleShoppingItem(id)` — tick đã mua (contract `IRecipeService`).
   *
   * ⚠️ Endpoint BE cần CẢ `listId` và `itemId`. Contract cũ chỉ có `id`.
   *   => `id` được hiểu là `listId:itemId` (nối bằng dấu `:`) để vẫn gọi được
   *   từ UI cũ, hoặc UI mới gọi thẳng `toggleShoppingItemInList(listId, itemId)`.
   *
   * @param {string} id - `listId` hoặc `listId:itemId`
   * @returns {Promise<void>}
   */
  async toggleShoppingItem(id) {
    if (!id) return;

    const [listId, itemId] = String(id).split(':');
    if (!listId || itemId === undefined) {
      throw new Error('Thiếu listId hoặc itemId để tick món mua');
    }
    await this.toggleShoppingItemInList(listId, itemId);
  }

  /**
   * Giỏ mua đang dùng.
   *
   * ⚠️ BE KHÔNG có route `GET /meal-planning/shopping-lists/active` -> 404.
   *   Route thật duy nhất là `GET /meal-planning/shopping-lists` (trả MẢNG list).
   *   => Chọn list "đang dùng" ở CLIENT theo thứ tự ưu tiên:
   *      1. `status === 'active'`
   *      2. `status === 'draft'`  (list mới tạo, chưa kích hoạt)
   *      3. list đầu tiên (BE sắp xếp `createdAt desc` -> list mới nhất)
   *
   * ⚠️ Status hợp lệ của BE (`ShoppingListStatus`): 'draft' | 'active' | 'completed'.
   *   List 'completed' KHÔNG dùng làm giỏ hiện tại.
   *
   * @returns {Promise<object|null>}
   */
  async getActiveShoppingList() {
    const lists = await this.getShoppingLists();
    if (!Array.isArray(lists) || lists.length === 0) return null;

    const active =
      lists.find((l) => l.status === 'active') ??
      lists.find((l) => l.status === 'draft') ??
      lists[0];

    if (!active) return null;

    // ⚠️ BUG ĐÃ SỬA (user báo: "thêm nguyên liệu offline bị kẹt"):
    //   Ghi id list THẬT vào cache -> khi offline, `CacheFallback` dùng id này
    //   (thay vì id giả `'offline'`) -> op đã queue gọi đúng list khi sync
    //   -> server KHÔNG trả 404 -> món không bị mất.
    offlineCache.saveActiveShoppingListId(active.id).catch(() => {});

    return active;
  }

  /**
   * Thêm 1 mặt hàng vào danh sách mua — LÀM Ở CLIENT (không gọi API).
   *
   * ⚠️ VÌ SAO KHÔNG GỌI API:
   *   BE KHÔNG có `POST /meal-planning/shopping-lists/{listId}/items` -> gọi
   *   sẽ trả 404. Flutter cũng chỉ thêm ở state local
   *   (`Mobile/lib/screens/shopping_reminder_screen.dart` -> `_addNewItem`).
   *   => Món được lưu vào SQLite (`local_shopping_items`, `sync_status =
   *      'local_only'`) và được gộp lại vào kết quả đọc server.
   *
   * @param {string} listId
   * @param {{ingredientId?:number, name?:string, quantity?:number, unit?:string}} item
   * @returns {Promise<object|null>} item vừa thêm (shape UI)
   */
  async addShoppingListItem(listId, item) {
    if (!listId || (!item?.ingredientId && !item?.name)) return null;

    const localId = `local_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    await offlineCache.addLocalShoppingItem({
      id: localId,
      ingredientId: item.ingredientId ?? null,
      name: item.name ?? item.ingredientName ?? '',
      quantity: Number(item.quantity) || 0,
      unit: item.unit ?? '',
      listId,
      done: false,
    });

    return {
      id: localId,
      ingredientId: item.ingredientId ?? null,
      name: item.name ?? item.ingredientName ?? '',
      quantity: Number(item.quantity) || 0,
      unit: item.unit ?? '',
      done: false,
      estimatedPrice: null,
      purchasedAt: null,
      supplierSuggestions: [],
      listId,
      _syncStatus: SYNC_STATUS.LOCAL_ONLY,
    };
  }

  /**
   * Thêm mọi nguyên liệu CÒN THIẾU của 1 slot vào giỏ mua — LÀM Ở CLIENT.
   *
   * ⚠️ VÌ SAO KHÔNG GỌI API:
   *   BE KHÔNG có `POST /meal-planning/slots/{slotId}/missing-to-shopping-list`
   *   -> gọi sẽ trả 404. Thay vào đó ta ĐỌC `GET /meal-planning/slots/{id}`
   *   (endpoint CÓ THẬT) -> `summary.missingItems` (BE đã tính sẵn phần thiếu
   *   so với tủ lạnh) -> tự tính lượng theo khẩu phần user chọn -> lưu local.
   *
   * ⚠️ `servings` (KHẨU PHẦN):
   *   BE scale lượng theo `slot.servings` (khẩu phần trong kế hoạch). Ta tự
   *   tính: `computeMissingPurchaseQuantity(item, scale)` với
   *   `scale = servingsUserChon / slotServings` (giống hệt công thức BE —
   *   xem `src/data/utils/shoppingMissing.js`).
   *
   * @param {string} slotId
   * @param {object} [options]
   * @param {number} [options.servings] - khẩu phần user chọn
   * @returns {Promise<{listId:string|null, addedCount:number, addedItems:object[], servings:number|null}>}
   */
  async addSlotMissingToShoppingList(slotId, options = {}) {
    if (!slotId) return { listId: null, addedCount: 0, addedItems: [], servings: null };

    // 1) Lấy chi tiết slot (BE có endpoint này). Nếu offline -> đọc cache.
    let detail = null;
    try {
      detail = await this.getSlotDetail(slotId);
    } catch (_e) {
      detail = null;
    }
    if (!detail) {
      try {
        detail = await offlineCache.getRecipeDetail(String(slotId), 'slot');
      } catch (_e) {
        detail = null;
      }
    }

    const missingItems = detail?.summary?.missingItems ?? [];
    if (!Array.isArray(missingItems) || missingItems.length === 0) {
      return { listId: null, addedCount: 0, addedItems: [], servings: options.servings ?? null };
    }

    // 2) Giỏ mua đang dùng (id list THẬT trên server).
    const list = await this.getActiveShoppingList();
    const listId = list?.id ?? null;
    if (!listId) {
      return { listId: null, addedCount: 0, addedItems: [], servings: options.servings ?? null };
    }

    // 3) Tính lượng mua theo khẩu phần user chọn.
    const targetServings = Number(options.servings) || null;
    const slotServings = Math.max(1, detail?.servings ?? 1);
    const scale = computeServingsScale(targetServings, slotServings);

    const addedItems = [];
    for (const missing of missingItems) {
      const name = missing?.name ?? '';
      if (!name) continue;

      const quantity = Math.max(0.01, Math.round(computeMissingPurchaseQuantity(missing, scale) * 100) / 100);
      if (quantity <= 0) continue;

      const ingredientId = missing?.ingredientId ?? null;
      // ⚠️ `baseUnit` là đơn vị QUY CHUẨN (vd "g") -> dùng để hiển thị
      //   (nếu dùng `originalUnit` (vd "kg") -> "0.5 kg" trong khi thực tế
      //   là 500g -> user mua sai lượng).
      const unit = missing?.baseUnit ?? missing?.unit ?? missing?.originalUnit ?? '';

      // Gộp theo nguyên liệu: nếu list đã có cùng nguyên liệu thì CỘNG lượng
      // (BE cũng tự gộp lượng khi tạo list từ kế hoạch).
      const existing = addedItems.find((i) => i.ingredientId === ingredientId && i.name === name);
      if (existing) {
        existing.quantity = Math.round((existing.quantity + quantity) * 100) / 100;
        continue;
      }

      const localId = `local_missing_${slotId}_${addedItems.length}`;
      await offlineCache.addLocalShoppingItem({
        id: localId,
        ingredientId,
        name,
        quantity,
        unit,
        listId,
        done: false,
      });

      addedItems.push({ id: localId, ingredientId, name, quantity, unit });
    }

    return {
      listId,
      addedCount: addedItems.length,
      addedItems,
      servings: targetServings ?? slotServings,
    };
  }

  /**
   * Sửa số lượng của 1 mặt hàng — LÀM Ở CLIENT (không gọi API).
   *
   * ⚠️ VÌ SAO KHÔNG GỌI API:
   *   `PATCH /meal-planning/shopping-lists/{listId}/items/{itemId}` KHÔNG có
   *   `@Body()` -> nó TOGGLE `isPurchased`, và khi toggle sang `true` sẽ TỰ THÊM
   *   1 món vào tủ lạnh. Gửi `{ quantity }` đi sẽ vô tình đánh dấu "đã mua"
   *   và thêm món vào tủ -> sai hoàn toàn.
   *   => Sửa lượng chỉ lưu ở SQLite.
   *
   * @param {string} listId
   * @param {string|number} itemId
   * @param {{quantity?:number}} payload
   * @returns {Promise<object|null>} item sau khi sửa (shape UI)
   */
  async updateShoppingListItem(listId, itemId, payload = {}) {
    if (!listId || itemId === null || itemId === undefined) return null;

    const quantity = Number(payload.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return null;

    await offlineCache.updateShoppingItemQuantityLocal(itemId, quantity);

    const items = await offlineCache.getShoppingItems();
    const current = items.find((i) => String(i.id) === String(itemId));

    return {
      id: current?.id ?? itemId,
      ingredientId: current?.ingredientId ?? null,
      name: current?.name ?? '',
      quantity,
      unit: current?.unit ?? '',
      done: current?.done ?? false,
      estimatedPrice: current?.estimatedPrice ?? null,
      purchasedAt: current?.purchasedAt ?? null,
      supplierSuggestions: current?.supplierSuggestions ?? [],
      listId,
      _syncStatus: current?._syncStatus ?? SYNC_STATUS.LOCAL_ONLY,
    };
  }

  /**
   * Xoá 1 mặt hàng khỏi danh sách mua — LÀM Ở CLIENT (không gọi API).
   *
   * ⚠️ VÌ SAO KHÔNG GỌI API:
   *   BE KHÔNG có `DELETE /meal-planning/shopping-lists/{listId}/items/{itemId}`
   *   -> gọi sẽ trả 404. Flutter cũng chỉ xoá ở state local
   *   (`shopping_reminder_screen.dart` -> `_deleteItem`).
   *   => Đánh dấu tombstone trong SQLite (`sync_status = 'local_deleted'`) để
   *      món KHÔNG bị "hồi sinh" khi pull danh sách từ server.
   *
   * @param {string} listId
   * @param {string|number} itemId
   * @returns {Promise<void>}
   */
  async removeShoppingListItem(listId, itemId) {
    if (!listId || itemId === null || itemId === undefined) return;
    await offlineCache.markShoppingItemLocallyDeleted(itemId);
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
    // P1 (offline) — cache thống kê tuần để đọc được khi offline.
    offlineCache.saveFridgeStats(dto).catch(() => {});

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
