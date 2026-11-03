/**
 * Recipe Service Interface
 *
 * Quản lý recipes, meal-planning slots, shopping reminders.
 *
 * ⚠️ SỬA Ở SPRINT B3 (báo DEV A trước — file này dùng bởi `useServiceHooks.js`):
 *   1. `RecipeSuggestion` thêm `mealType` / `servings` / `cooked` / `recipeId`.
 *      Vì `getSuggestions()` KHÔNG lấy từ `/recipes/suggestions` nữa mà lấy từ
 *      MEAL-PLANNING SLOTS (`GET /meal-planning/plans` -> `/plans/{id}` ->
 *      dailyPlans[] -> mealSlots[]). Slot có `mealType` nhưng KHÔNG có `cookTime`
 *      -> service gán theo bữa (giống Flutter hardcode 15/25/20).
 *   2. `WeeklyStats` đổi thành shape của `GET /fridge/stats`
 *      (`FridgeStatsResponseDto`) vì `getWeeklyStats()` đọc endpoint đó,
 *      KHÔNG phải `/fridge/stats/chart`.
 *   3. `Recipe` thêm `mealType` / `tags` / `description` + `ingredients` chi tiết.
 *
 * Quy ước đặc biệt:
 *   - `id` của một meal slot là ID bản ghi meal plan, KHÔNG phải ID công thức.
 *     Dùng `recipeId` để mở màn chi tiết công thức.
 */

/**
 * @typedef {Object} RecipeIngredient
 * @property {number} id - ingredientId trong danh mục BE
 * @property {string} name
 * @property {number|null} amount
 * @property {string|null} unit
 * @property {boolean} [isOptional]
 * @property {string|null} [note]
 * @property {boolean} [inFridge] - BE phân tích sẵn theo tủ lạnh của user
 */

/**
 * @typedef {Object} Recipe
 * @property {string} id
 * @property {string} name
 * @property {string|null} [image]
 * @property {number} cookTime
 * @property {'easy'|'medium'|'hard'} difficulty
 * @property {number} servings
 * @property {string} [mealType] - 'breakfast'|'lunch'|'dinner'|'snack'|'dessert'|'drink'
 * @property {number|null} [estimatedCost]
 * @property {boolean} [isAiGenerated]
 * @property {string[]} [tags]
 * @property {string|null} [description]
 * @property {RecipeIngredient[]} [ingredients]
 * @property {string[]} [steps]
 */

/**
 * @typedef {Object} RecipeSuggestion
 * @property {string} id - id của meal slot (KHÔNG phải id công thức)
 * @property {string} recipeId - id công thức, dùng để mở màn chi tiết
 * @property {string} name
 * @property {string|null} [image]
 * @property {number} cookTime
 * @property {'easy'|'medium'|'hard'} difficulty
 * @property {number} servings
 * @property {string} mealType - 'breakfast'|'lunch'|'dinner'|'snack'
 * @property {boolean} cooked - BE đánh dấu `completedAt != null`
 * @property {number} matchPercent - giữ cho màn khác dùng chung
 * @property {string[]} [tags]
 */

/**
 * @typedef {Object} WeeklyStats
 * @property {number} mealsCooked
 * @property {number} expiringSoonCount
 * @property {number} totalSpentThisMonth
 * @property {number} wastePercent
 * @property {number} totalItems
 */

/**
 * @typedef {Object} MealPlanSummary
 * @property {string} id
 * @property {string|null} weekStart - YYYY-MM-DD
 * @property {number} totalBudget
 * @property {number|null} actualCost
 * @property {string} status - 'draft'|'confirmed'|'active'|'completed'
 * @property {boolean} generatedByAi
 * @property {boolean} isSmartFiltered
 * @property {string|null} createdAt
 */

/**
 * @typedef {Object} MealPlanDay
 * @property {string} id
 * @property {number} dayOfWeek - 1=T2 ... 7=CN (quy ước BE)
 * @property {string|null} date - YYYY-MM-DD
 * @property {number|null} dailyBudget
 * @property {RecipeSuggestion[]} slots - đã có `mealType` để không đoán theo index
 */

/**
 * @typedef {Object} MealPlan
 * @property {string} id
 * @property {string|null} weekStart
 * @property {string} status
 * @property {number} totalBudget
 * @property {MealPlanDay[]} days
 */

/**
 * @typedef {Object} MealSlotMissingItem
 * @property {number|null} ingredientId
 * @property {string} name
 * @property {number} quantityNeeded
 * @property {string|null} unit
 * @property {boolean} isOptional
 * @property {'have'|'partial'|'missing'} fridgeStatus
 * @property {number} fridgeQuantity
 * @property {number} missingQuantity
 */

/**
 * @typedef {Object} MealSlotDetail
 * @property {string} id - id của meal slot
 * @property {string} mealType - 'breakfast'|'lunch'|'dinner'|'snack'|'dessert'
 * @property {number} servings
 * @property {string|null} completedAt
 * @property {boolean} cooked
 * @property {Recipe|null} recipe - công thức (ảnh đã qua getImageUrl)
 * @property {Object} summary
 * @property {number} summary.totalIngredients
 * @property {number} summary.haveCount
 * @property {number} summary.partialCount
 * @property {number} summary.missingCount
 * @property {number} summary.fridgeReadyPercent
 * @property {MealSlotMissingItem[]} summary.missingItems
 */

/**
 * @typedef {Object} ShoppingItem
 * @property {string|number} id - id item của BE (SỐ)
 * @property {string} name
 * @property {number} quantity
 * @property {string} unit
 * @property {boolean} done
 * @property {number|null} [estimatedPrice]
 * @property {string|null} [purchasedAt]
 * @property {string} [listId] - id danh sách chứa item (gắn khi gộp phẳng)
 */

/**
 * @typedef {Object} ShoppingList
 * @property {string} id
 * @property {string} title
 * @property {string} status
 * @property {number|null} totalEstimatedCost
 * @property {string|null} weeklyPlanId
 * @property {string|null} createdAt
 * @property {ShoppingItem[]} items
 */

export class IRecipeService {
  /**
   * Lấy danh sách recipes
   * @returns {Promise<Recipe[]>}
   */
  async getRecipes() {
    throw new Error('IRecipeService.getRecipes() must be implemented');
  }

  /**
   * Lấy recipe theo id
   * @param {string} id
   * @returns {Promise<Recipe|null>}
   */
  async getRecipeById(id) {
    throw new Error('IRecipeService.getRecipeById() must be implemented');
  }

  /**
   * Lấy recipes với filter + sort
   * @param {Object} [filters]
   * @param {string} [filters.search]
   * @param {number} [filters.maxCookTime]
   * @param {string|string[]} [filters.difficulty]
   * @param {string} [filters.mealType]
   * @param {string|string[]} [filters.tagIds]
   * @param {string} [filters.sortBy] - 'cookTime'|'name'|'difficulty' (client-side)
   * @param {string} [filters.sortDir] - 'asc'|'desc'
   * @returns {Promise<Recipe[]>}
   */
  async getRecipesFiltered(filters) {
    throw new Error('IRecipeService.getRecipesFiltered() must be implemented');
  }

  /**
   * Meta phân trang của `GET /recipes` — dùng cho phân trang vô hạn.
   * @returns {Promise<{total:number,page:number,limit:number,totalPages:number}>}
   */
  async getRecipesMeta(filters) {
    throw new Error('IRecipeService.getRecipesMeta() must be implemented');
  }

  /**
   * Gợi ý bữa ăn HÔM NAY.
   *
   * ⚠️ Nguồn = MEAL-PLANNING SLOTS (`GET /meal-planning/plans` -> `/plans/{id}`
   * -> dailyPlans[] -> mealSlots[]), KHÔNG phải `GET /recipes/suggestions`.
   * @returns {Promise<RecipeSuggestion[]>}
   */
  async getSuggestions() {
    throw new Error('IRecipeService.getSuggestions() must be implemented');
  }

  /**
   * Danh sách công thức đã bookmark — `GET /recipes/bookmarked`.
   * @returns {Promise<Recipe[]>}
   */
  async getBookmarked() {
    throw new Error('IRecipeService.getBookmarked() must be implemented');
  }

  /**
   * Bookmark công thức — `POST /recipes/{id}/bookmark`.
   * @param {string} id
   * @returns {Promise<void>}
   */
  async addBookmark(id) {
    throw new Error('IRecipeService.addBookmark() must be implemented');
  }

  /**
   * Bỏ bookmark — `DELETE /recipes/{id}/bookmark`.
   * @param {string} id
   * @returns {Promise<void>}
   */
  async removeBookmark(id) {
    throw new Error('IRecipeService.removeBookmark() must be implemented');
  }

  /**
   * Lấy weekly stats — `GET /fridge/stats`.
   * @returns {Promise<WeeklyStats>}
   */
  async getWeeklyStats() {
    throw new Error('IRecipeService.getWeeklyStats() must be implemented');
  }

  /**
   * Lấy weekly plan (kế hoạch tuần tới).
   *
   * ⚠️ B4 đã đổi shape: giờ trả `{ id, weekStart, status, totalBudget, days[] }`
   * với `days[]` = 7 ngày, mỗi ngày có `slots[]` (mỗi slot có `mealType`).
   * Lý do: màn "Thực đơn tuần tới" cần đủ 7 ngày x 3 bữa, không phải 1 ngày.
   *
   * @returns {Promise<MealPlan|null>}
   */
  async getNextWeekPlan() {
    throw new Error('IRecipeService.getNextWeekPlan() must be implemented');
  }

  /**
   * Danh sách kế hoạch tuần — `GET /meal-planning/plans`.
   *
   * BE order `weekStartDate desc` -> phần tử đầu là kế hoạch MỚI NHẤT.
   *
   * @returns {Promise<MealPlanSummary[]>}
   */
  async getPlans() {
    throw new Error('IRecipeService.getPlans() must be implemented');
  }

  /**
   * Chi tiết kế hoạch tuần (7 ngày × N bữa) — `GET /meal-planning/plans/{id}`.
   *
   * @param {string} planId
   * @returns {Promise<MealPlan|null>}
   */
  async getPlanDetail(planId) {
    throw new Error('IRecipeService.getPlanDetail() must be implemented');
  }

  /**
   * Chi tiết 1 meal slot: công thức + phân tích tủ lạnh —
   * `GET /meal-planning/slots/{id}`.
   *
   * BE trả `summary.missingItems` = nguyên liệu thiếu / thiếu một phần, kèm
   * `fridgeStatus` ('have'|'partial'|'missing') và `missingQuantity`.
   *
   * @param {string} slotId
   * @returns {Promise<MealSlotDetail|null>}
   */
  async getSlotDetail(slotId) {
    throw new Error('IRecipeService.getSlotDetail() must be implemented');
  }

  /**
   * Cập nhật trạng thái kế hoạch — `PATCH /meal-planning/plans/{id}`.
   *
   * @param {string} planId
   * @param {{status?:'draft'|'confirmed'|'active'|'completed'}} payload
   * @returns {Promise<void>}
   */
  async updatePlan(planId, payload) {
    throw new Error('IRecipeService.updatePlan() must be implemented');
  }

  /**
   * Đánh dấu slot đã nấu.
   *
   * @param {string} planId - id kế hoạch
   * @param {string|{id:string, completed?:boolean}} slot - slot id hoặc object slot
   * @returns {Promise<void>}
   */
  async markSlotCooked(planId, slot) {
    throw new Error('IRecipeService.markSlotCooked() must be implemented');
  }

  /**
   * Lấy shopping reminder (danh sách mua phẳng).
   * @returns {Promise<ShoppingItem[]>}
   */
  async getShoppingList() {
    throw new Error('IRecipeService.getShoppingList() must be implemented');
  }

  /**
   * Toggle done cho shopping item.
   *
   * ⚠️ BE cần CẢ `listId` + `itemId` -> `id` nhận dạng `listId:itemId`.
   * @param {string} id
   * @returns {Promise<ShoppingItem|void>}
   */
  async toggleShoppingItem(id) {
    throw new Error('IRecipeService.toggleShoppingItem() must be implemented');
  }

  // ═══════════════ Meal planning (Sprint B4) ═══════════════

  /**
   * Cập nhật 1 meal slot — `PATCH /meal-planning/slots/{id}`.
   *
   * @param {string} slotId
   * @param {{completed?:boolean, recipeId?:string|null, servings?:number, note?:string}} payload
   * @returns {Promise<void>}
   */
  async updateSlot(slotId, payload) {
    throw new Error('IRecipeService.updateSlot() must be implemented');
  }

  /**
   * Nhờ AI lập thực đơn tuần — `POST /meal-planning/plans/generate`.
   *
   * BE trả 202 ngay + `jobId`; tiến độ đến qua `streamPlanProgress()`.
   *
   * @param {{weekStartDate?:string, budget?:number}} [params]
   * @returns {Promise<{jobId:string|null, status:string, streamUrl:string|null}>}
   */
  async generatePlan(params) {
    throw new Error('IRecipeService.generatePlan() must be implemented');
  }

  /**
   * Nhờ AI lập thực đơn từ nguyên liệu sắp hết hạn —
   * `POST /meal-planning/plans/generate-from-expiring`.
   *
   * @param {{withinDays?:number, days?:number}} [params]
   * @returns {Promise<{jobId:string|null, status:string, streamUrl:string|null}>}
   */
  async generateFromExpiring(params) {
    throw new Error('IRecipeService.generateFromExpiring() must be implemented');
  }

  /**
   * Nhờ AI gợi ý món thay thế cho 1 slot —
   * `POST /meal-planning/slots/{id}/regenerate`.
   *
   * @param {string} slotId
   * @param {string} [reason] - 'no_ingredients'|'dislike'|'want_different'|'too_expensive'
   * @returns {Promise<{jobId:string|null, status:string, streamUrl:string|null}>}
   */
  async regenerateSlot(slotId, reason) {
    throw new Error('IRecipeService.regenerateSlot() must be implemented');
  }

  /**
   * Mở luồng SSE tiến độ (tạo thực đơn / đổi món slot).
   *
   * @param {string} path - path stream (thường lấy từ `streamUrl` của BE)
   * @param {{signal?:AbortSignal}} [options]
   * @returns {AsyncGenerator<{event:string, data:any}>}
   */
  async *streamPlanProgress(path, options) {
    throw new Error('IRecipeService.streamPlanProgress() must be implemented');
  }

  // ═══════════════ Shopping list (Sprint B4) ═══════════════

  /**
   * Danh sách mua (dạng đầy đủ, mỗi list kèm `items`) —
   * `GET /meal-planning/shopping-lists`.
   *
   * @returns {Promise<ShoppingList[]>}
   */
  async getShoppingLists() {
    throw new Error('IRecipeService.getShoppingLists() must be implemented');
  }

  /**
   * Tạo danh sách mua từ kế hoạch tuần — `POST /meal-planning/shopping-lists`.
   *
   * @param {string} weeklyPlanId
   * @param {string} [title]
   * @returns {Promise<ShoppingList|null>}
   */
  async createShoppingList(weeklyPlanId, title) {
    throw new Error('IRecipeService.createShoppingList() must be implemented');
  }

  /**
   * Tick đã mua — `PATCH /meal-planning/shopping-lists/{listId}/items/{itemId}`.
   *
   * @param {string} listId
   * @param {string|number} itemId
   * @returns {Promise<void>}
   */
  async toggleShoppingItemInList(listId, itemId) {
    throw new Error('IRecipeService.toggleShoppingItemInList() must be implemented');
  }
}
