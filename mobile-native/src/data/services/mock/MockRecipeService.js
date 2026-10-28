/**
 * Mock Recipe Service
 *
 * ⚠️ SỬA Ở SPRINT B3 — phải khớp typedef mới của `IRecipeService.js`:
 *   1. `getSuggestions()` trả shape meal-planning slot: có `mealType`,
 *      `recipeId`, `cooked`, `servings`. `id` là id slot (không phải id recipe).
 *   2. `getWeeklyStats()` trả shape `GET /fridge/stats`:
 *      `{ mealsCooked, expiringSoonCount, totalSpentThisMonth, wastePercent, totalItems }`
 *      (bỏ `week` / `data` / `total` / `previousWeek`).
 *   3. Thêm `getBookmarked()` / `addBookmark()` / `removeBookmark()`.
 *
 * Khớp với `RealRecipeService` (R1): cùng input -> cùng output shape.
 */

import { IRecipeService } from '../../interfaces/IRecipeService';
import recipesMock from '../../../shared/mocks/recipes.json';
import inventoryMock from '../../../shared/mocks/inventory.json';
import shoppingMock from '../../../shared/mocks/shopping-reminder.json';

const MOCK_DELAY = 200;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let shoppingList = JSON.parse(JSON.stringify(shoppingMock.items));

// Mock weekly plan
const mockNextWeekPlan = {
  id: 'plan-current',
  weekStart: '2026-10-19',
  slots: {
    breakfast: { id: 'r1', name: 'Trứng xào cà chua', image: 'recipe_tomato_egg', cookTime: 15 },
    lunch: { id: 'r2', name: 'Canh rau củ', image: 'recipe_veggie_soup', cookTime: 25 },
    dinner: { id: 'r3', name: 'Thịt heo kho trứng', image: null, cookTime: 45 },
  },
};

/**
 * Mock meal-planning slots — shape giống hệt output của
 * `RealRecipeService.getSuggestions()`.
 *
 * `id` = id slot, `recipeId` = id công thức (mở màn detail bằng cái này).
 * `mealType` quyết định thứ tự hiển thị (breakfast -> lunch -> dinner -> snack).
 */
const mockMealSlots = [
  {
    id: 'slot-1',
    recipeId: 'r1',
    name: 'Trứng xào cà chua',
    image: 'recipe_tomato_egg',
    cookTime: 15,
    difficulty: 'easy',
    servings: 2,
    mealType: 'breakfast',
    cooked: false,
    matchPercent: 95,
    tags: ['Nhanh', 'Dễ'],
    estimatedCost: 30000,
    note: null,
  },
  {
    id: 'slot-2',
    recipeId: 'r2',
    name: 'Canh rau củ',
    image: 'recipe_veggie_soup',
    cookTime: 25,
    difficulty: 'easy',
    servings: 4,
    mealType: 'lunch',
    cooked: false,
    matchPercent: 88,
    tags: ['Healthy'],
    estimatedCost: 45000,
    note: null,
  },
  {
    id: 'slot-3',
    recipeId: 'r3',
    name: 'Thịt heo xào rau',
    image: null,
    cookTime: 30,
    difficulty: 'medium',
    servings: 4,
    mealType: 'dinner',
    cooked: false,
    matchPercent: 80,
    tags: ['Đậm đà'],
    estimatedCost: 90000,
    note: null,
  },
];

// Bookmark đã lưu (id công thức).
let bookmarkedIds = [];

export class MockRecipeService extends IRecipeService {
  async getRecipes() {
    await sleep(MOCK_DELAY);
    return [...recipesMock.recipes];
  }

  async getRecipeById(id) {
    await sleep(MOCK_DELAY / 2);
    return recipesMock.recipes.find((r) => r.id === id) || null;
  }

  /**
   * Bữa ăn hôm nay — shape meal-planning slot.
   * Khớp `RealRecipeService.getSuggestions()` (đã sort + take 3).
   */
  async getSuggestions() {
    await sleep(MOCK_DELAY);
    return mockMealSlots.slice(0, 3).map((s) => ({ ...s }));
  }

  async getRecipesFiltered(filters = {}) {
    await sleep(MOCK_DELAY);
    let result = [...recipesMock.recipes];
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      if (q) {
        result = result.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            (r.ingredients || []).some((ing) => ing.toLowerCase().includes(q))
        );
      }
    }
    if (filters.maxCookTime) {
      result = result.filter((r) => r.cookTime <= filters.maxCookTime);
    }
    if (filters.difficulty) {
      const diffs = Array.isArray(filters.difficulty) ? filters.difficulty : [filters.difficulty];
      result = result.filter((r) => diffs.includes(r.difficulty));
    }
    if (filters.mealType && filters.mealType !== 'all') {
      result = result.filter((r) => r.mealType === filters.mealType);
    }
    if (filters.sortBy) {
      const dir = filters.sortDir === 'desc' ? -1 : 1;
      result = [...result].sort((a, b) => {
        switch (filters.sortBy) {
          case 'cookTime':
            return (a.cookTime - b.cookTime) * dir;
          case 'name':
            return a.name.localeCompare(b.name) * dir;
          case 'difficulty': {
            const order = { easy: 0, medium: 1, hard: 2 };
            return ((order[a.difficulty] ?? 1) - (order[b.difficulty] ?? 1)) * dir;
          }
          default:
            return 0;
        }
      });
    }
    return result;
  }

  /**
   * Meta phân trang — mock trả số liệu tĩnh.
   */
  async getRecipesMeta() {
    await sleep(MOCK_DELAY / 2);
    const total = recipesMock.recipes.length;
    return { total, page: 1, limit: 20, totalPages: 1 };
  }

  /**
   * Công thức đã bookmark.
   */
  async getBookmarked() {
    await sleep(MOCK_DELAY / 2);
    return recipesMock.recipes.filter((r) => bookmarkedIds.includes(r.id)).map((r) => ({ ...r }));
  }

  /**
   * Lưu bookmark — idempotent, giống BE (upsert).
   */
  async addBookmark(id) {
    await sleep(MOCK_DELAY);
    if (!bookmarkedIds.includes(id)) bookmarkedIds.push(id);
  }

  /**
   * Bỏ bookmark.
   */
  async removeBookmark(id) {
    await sleep(MOCK_DELAY);
    bookmarkedIds = bookmarkedIds.filter((b) => b !== id);
  }

  /**
   * Shape `GET /fridge/stats` — khớp `RealRecipeService.getWeeklyStats()`.
   */
  async getWeeklyStats() {
    await sleep(MOCK_DELAY / 2);
    const expiringSoonCount = inventoryMock.items.filter((i) => i.status === 'expiring').length;
    return {
      mealsCooked: 0,
      expiringSoonCount,
      totalSpentThisMonth: 0,
      wastePercent: 0,
      totalItems: inventoryMock.items.length,
    };
  }

  async getNextWeekPlan() {
    await sleep(MOCK_DELAY);
    return { ...mockNextWeekPlan };
  }

  async markSlotCooked(planId, slot) {
    await sleep(MOCK_DELAY);
    // mock - no-op, chỉ return thành công
  }

  async getShoppingList() {
    await sleep(MOCK_DELAY / 2);
    return [...shoppingList];
  }

  async toggleShoppingItem(id) {
    await sleep(MOCK_DELAY);
    const idx = shoppingList.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Item không tồn tại');
    shoppingList[idx] = { ...shoppingList[idx], done: !shoppingList[idx].done };
    return shoppingList[idx];
  }
}
