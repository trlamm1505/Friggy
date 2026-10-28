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
 * @typedef {Object} WeeklyPlan
 * @property {string} id
 * @property {string} weekStart
 * @property {Object} slots - { breakfast: Recipe, lunch: Recipe, dinner: Recipe }
 */

/**
 * @typedef {Object} ShoppingItem
 * @property {string} id
 * @property {string} name
 * @property {number} quantity
 * @property {string} unit
 * @property {boolean} done
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
   * Lấy weekly plan (kế hoạch tuần tới)
   * @returns {Promise<WeeklyPlan>}
   */
  async getNextWeekPlan() {
    throw new Error('IRecipeService.getNextWeekPlan() must be implemented');
  }

  /**
   * Đánh dấu slot đã nấu
   * @param {string} planId
   * @param {'breakfast'|'lunch'|'dinner'} slot
   * @returns {Promise<void>}
   */
  async markSlotCooked(planId, slot) {
    throw new Error('IRecipeService.markSlotCooked() must be implemented');
  }

  /**
   * Lấy shopping reminder
   * @returns {Promise<ShoppingItem[]>}
   */
  async getShoppingList() {
    throw new Error('IRecipeService.getShoppingList() must be implemented');
  }

  /**
   * Toggle done cho shopping item
   * @param {string} id
   * @returns {Promise<ShoppingItem>}
   */
  async toggleShoppingItem(id) {
    throw new Error('IRecipeService.toggleShoppingItem() must be implemented');
  }
}
