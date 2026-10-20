/**
 * Recipe Service Interface
 *
 * Quản lý recipes, weekly plans, shopping reminders.
 */

/**
 * @typedef {Object} Recipe
 * @property {string} id
 * @property {string} name
 * @property {string|null} [image]
 * @property {number} cookTime
 * @property {'easy'|'medium'|'hard'} difficulty
 * @property {number} servings
 * @property {string[]} ingredients
 * @property {string[]} [steps]
 */

/**
 * @typedef {Object} RecipeSuggestion
 * @property {string} id
 * @property {string} name
 * @property {string|null} [image]
 * @property {number} cookTime
 * @property {'easy'|'medium'|'hard'} difficulty
 * @property {number} matchPercent
 * @property {string[]} [tags]
 */

/**
 * @typedef {Object} WeeklyPlan
 * @property {string} id
 * @property {string} weekStart
 * @property {Object} slots - { breakfast: Recipe, lunch: Recipe, dinner: Recipe }
 */

/**
 * @typedef {Object} WeeklyStats
 * @property {string[]} week
 * @property {Array<{day: string, count: number}>} data
 * @property {number} total
 * @property {number} previousWeek
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
   * @param {string} [filters.sortBy] - 'cookTime'|'name'|'difficulty'
   * @param {string} [filters.sortDir] - 'asc'|'desc'
   * @returns {Promise<Recipe[]>}
   */
  async getRecipesFiltered(filters) {
    throw new Error('IRecipeService.getRecipesFiltered() must be implemented');
  }

  /**
   * Gợi ý recipes từ nguyên liệu trong tủ
   * @returns {Promise<RecipeSuggestion[]>}
   */
  async getSuggestions() {
    throw new Error('IRecipeService.getSuggestions() must be implemented');
  }

  /**
   * Lấy weekly stats (số bữa nấu theo ngày)
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
