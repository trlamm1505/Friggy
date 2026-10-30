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
 * ⚠️ SỬA Ở SPRINT B4:
 *   4. `getNextWeekPlan()` đổi shape từ `{ id, weekStart, slots: {breakfast,...} }`
 *      sang `{ id, weekStart, status, totalBudget, days[] }` — mỗi ngày có
 *      `slots[]` kèm `mealType` (khớp `RealRecipeService.getNextWeekPlan()`).
 *   5. `markSlotCooked()` nhận slot id thật và CẬP NHẬT state mock
 *      (trước đây là no-op) để UI phản ánh ngay.
 *   6. `toggleShoppingItem()` nhận `listId:itemId` (BE cần cả 2 id).
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

/**
 * Mock weekly plan — shape MỚI của B4: `{ id, weekStart, status, totalBudget, days[] }`.
 *
 * Mỗi ngày có `slots[]` (mỗi slot có `mealType`) -> UI KHÔNG đoán bữa theo index.
 */
const mockNextWeekPlan = {
  id: 'plan-current',
  weekStart: '2026-10-19',
  status: 'active',
  totalBudget: 700000,
  days: [
    {
      id: 'daily-1',
      dayOfWeek: 1,
      date: '2026-10-19',
      dailyBudget: 100000,
      slots: [
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
      ],
    },
  ],
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

  /**
   * Kế hoạch tuần — shape MỚI của B4 (`{ id, weekStart, status, totalBudget, days[] }`).
   * Khớp `RealRecipeService.getNextWeekPlan()`.
   */
  async getNextWeekPlan() {
    await sleep(MOCK_DELAY);
    return JSON.parse(JSON.stringify(mockNextWeekPlan));
  }

  /**
   * `GET /meal-planning/plans` — mock: 1 plan duy nhất (kế hoạch tuần hiện tại).
   * Khớp `RealRecipeService.getPlans()` (trả array summary).
   */
  async getPlans() {
    await sleep(MOCK_DELAY / 2);
    return [
      {
        id: mockNextWeekPlan.id,
        weekStart: mockNextWeekPlan.weekStart,
        totalBudget: mockNextWeekPlan.totalBudget,
        actualCost: null,
        status: mockNextWeekPlan.status,
        generatedByAi: true,
        isSmartFiltered: false,
        createdAt: mockNextWeekPlan.weekStart,
      },
    ];
  }

  /**
   * `GET /meal-planning/plans/{id}` — mock: chi tiết plan + `days[]`.
   * Khớp `RealRecipeService.getPlanDetail()`.
   *
   * @param {string} planId
   * @returns {Promise<object|null>}
   */
  async getPlanDetail(planId) {
    await sleep(MOCK_DELAY / 2);
    if (!planId) return null;

    const summary = {
      id: mockNextWeekPlan.id,
      weekStart: mockNextWeekPlan.weekStart,
      totalBudget: mockNextWeekPlan.totalBudget,
      actualCost: null,
      status: mockNextWeekPlan.status,
      generatedByAi: true,
      isSmartFiltered: false,
      createdAt: mockNextWeekPlan.weekStart,
    };

    // Plan khác (id lạ) -> trả null như BE (404 -> null).
    if (planId !== mockNextWeekPlan.id) return null;

    return { ...summary, days: JSON.parse(JSON.stringify(mockNextWeekPlan.days)) };
  }

  /**
   * `GET /meal-planning/slots/{id}` — mock: chi tiết slot (công thức + phân tích tủ lạnh).
   * Khớp `RealRecipeService.getSlotDetail()`.
   *
   * @param {string} slotId
   * @returns {Promise<object|null>}
   */
  async getSlotDetail(slotId) {
    await sleep(MOCK_DELAY / 2);
    if (!slotId) return null;

    for (const day of mockNextWeekPlan.days) {
      const slot = day.slots.find((s) => s.id === slotId);
      if (!slot) continue;

      const recipe = recipesMock.recipes.find((r) => r.id === slot.recipeId) ?? null;

      return {
        id: slot.id,
        mealType: slot.mealType,
        servings: slot.servings ?? 1,
        completedAt: slot.cooked ? `${slot.id}-cooked` : null,
        cooked: Boolean(slot.cooked),
        recipe: recipe
          ? {
              id: recipe.id,
              name: recipe.name,
              description: recipe.description ?? null,
              image: recipe.image ?? null,
              cookTime: recipe.cookTime ?? slot.cookTime,
              difficulty: recipe.difficulty ?? slot.difficulty,
              estimatedCost: recipe.estimatedCost ?? slot.estimatedCost ?? null,
              steps: recipe.steps ?? [],
            }
          : null,
        summary: {
          totalIngredients: 0,
          haveCount: 0,
          partialCount: 0,
          missingCount: 0,
          fridgeReadyPercent: slot.matchPercent ?? 0,
          missingItems: [],
        },
      };
    }

    return null;
  }

  /**
   * Tick "đã nấu" — mock cập nhật state in-memory để UI phản ánh ngay.
   *
   * @param {string} planId
   * @param {string|{id:string, completed?:boolean}} slot
   */
  async markSlotCooked(planId, slot) {
    await sleep(MOCK_DELAY);
    const slotId = typeof slot === 'string' ? slot : slot?.id;
    const completed = typeof slot === 'object' ? slot.completed !== false : true;
    if (!slotId) return;

    for (const day of mockNextWeekPlan.days) {
      const found = day.slots.find((s) => s.id === slotId);
      if (found) {
        found.cooked = completed;
        return;
      }
    }
  }

  /**
   * Danh sách mua phẳng — khớp `RealRecipeService.getShoppingList()`.
   */
  async getShoppingList() {
    await sleep(MOCK_DELAY / 2);
    // Gắn `listId` giả để khớp shape của `RealRecipeService.getShoppingList()`.
    return shoppingList.map((i) => ({ ...i, listId: 'shopping-list-mock' }));
  }

  /**
   * Tick đã mua.
   *
   * ⚠️ BE cần CẢ `listId` + `itemId` -> `id` nhận dạng `listId:itemId`.
   */
  async toggleShoppingItem(id) {
    await sleep(MOCK_DELAY);
    const [listId, itemId] = String(id).split(':');
    if (!listId || itemId === undefined) {
      throw new Error('Thiếu listId hoặc itemId để tick món mua');
    }

    const idx = shoppingList.findIndex((i) => String(i.id) === String(itemId));
    if (idx === -1) throw new Error('Item không tồn tại');
    shoppingList[idx] = { ...shoppingList[idx], done: !shoppingList[idx].done };
    return { ...shoppingList[idx] };
  }

  // ═══════════════ Meal planning — Sprint B4 ═══════════════

  /**
   * `PATCH /meal-planning/slots/{id}` — tick "đã nấu" hoặc đổi công thức.
   *
   * Khớp `RealRecipeService.updateSlot()`: cập nhật state in-memory để UI
   * phản ánh ngay (optimistic update của UI vẫn hoạt động đúng).
   *
   * @param {string} slotId
   * @param {{completed?:boolean, recipeId?:string|null, servings?:number, note?:string}} payload
   * @returns {Promise<void>}
   */
  async updateSlot(slotId, payload = {}) {
    await sleep(MOCK_DELAY / 2);
    if (!slotId) return;

    for (const day of mockNextWeekPlan.days) {
      const found = day.slots.find((s) => s.id === slotId);
      if (!found) continue;

      if (payload.completed !== undefined) {
        found.cooked = Boolean(payload.completed);
      }
      if (payload.recipeId !== undefined) {
        const recipe = recipesMock.recipes.find((r) => r.id === payload.recipeId);
        found.recipeId = payload.recipeId;
        if (recipe) {
          found.name = recipe.name;
          found.cookTime = recipe.cookTime;
          found.difficulty = recipe.difficulty;
          found.servings = recipe.servings;
        }
      }
      if (payload.servings !== undefined) {
        found.servings = Number(payload.servings);
      }
      if (payload.note !== undefined) {
        found.note = payload.note;
      }
      return;
    }
  }

  /**
   * `POST /meal-planning/plans/generate` — mock: trả jobId giả, không có SSE.
   */
  async generatePlan(params = {}) {
    await sleep(MOCK_DELAY);
    return { jobId: 'mock-plan-job', status: 'completed', streamUrl: null };
  }

  /**
   * `POST /meal-planning/plans/generate-from-expiring` — mock: trả jobId giả.
   */
  async generateFromExpiring(params = {}) {
    await sleep(MOCK_DELAY);
    return { jobId: 'mock-expiring-job', status: 'completed', streamUrl: null };
  }

  /**
   * `POST /meal-planning/slots/{id}/regenerate` — mock: trả jobId giả.
   */
  async regenerateSlot(slotId, reason = 'want_different') {
    await sleep(MOCK_DELAY);
    return { jobId: 'mock-regenerate-job', status: 'completed', streamUrl: null };
  }

  /**
   * Mở luồng SSE tiến độ (mock) — yield các event giả để UI chạy được.
   *
   * ⚠️ Mock KHÔNG có SSE thật -> yield 1 event `done`/`completed` để UI thoát
   * vòng lặp `for await` và không bị treo.
   *
   * @param {string} path
   * @param {{signal?:AbortSignal}} [options]
   * @returns {AsyncGenerator<{event:string, data:any}>}
   */
  async* streamPlanProgress(path, options = {}) {
    await sleep(MOCK_DELAY);
    if (options?.signal?.aborted) return;

    // Đổi món slot -> event `done` với 3 gợi ý.
    if (path && path.includes('/regenerate/')) {
      yield {
        event: 'done',
        data: {
          slotId: path.split('/slots/')[1]?.split('/')[0] ?? null,
          suggestions: '1. Trứng xào cà chua\n2. Canh rau củ\n3. Thịt heo xào rau',
          message: 'Đã gợi ý 3 món thay thế',
        },
      };
      return;
    }

    // Lập thực đơn -> event `completed`.
    yield {
      event: 'completed',
      data: { message: 'Đã lập xong thực đơn', summary: '' },
    };
  }

  /**
   * `GET /meal-planning/shopping-lists` — mock: 1 list gồm toàn bộ items.
   */
  async getShoppingLists() {
    await sleep(MOCK_DELAY / 2);
    return [
      {
        id: 'shopping-list-mock',
        title: 'Danh sách mua tuần này',
        status: 'active',
        totalEstimatedCost: shoppingList.reduce((sum, i) => sum + (i.estimatedPrice ?? 0), 0),
        weeklyPlanId: mockNextWeekPlan.id,
        createdAt: mockNextWeekPlan.weekStart,
        items: shoppingList.map((i) => ({ ...i })),
      },
    ];
  }

  /**
   * `POST /meal-planning/shopping-lists` — mock: tạo list từ kế hoạch tuần.
   */
  async createShoppingList(weeklyPlanId, title) {
    await sleep(MOCK_DELAY);
    return {
      id: 'shopping-list-mock',
      title: (title ?? '').trim() || 'Danh sách mua tuần này',
      status: 'active',
      totalEstimatedCost: shoppingList.reduce((sum, i) => sum + (i.estimatedPrice ?? 0), 0),
      weeklyPlanId: weeklyPlanId ?? mockNextWeekPlan.id,
      createdAt: mockNextWeekPlan.weekStart,
      items: shoppingList.map((i) => ({ ...i })),
    };
  }

  /**
   * `PATCH /meal-planning/shopping-lists/{listId}/items/{itemId}` — mock: toggle.
   */
  async toggleShoppingItemInList(listId, itemId) {
    await sleep(MOCK_DELAY / 2);
    if (!listId || itemId === null || itemId === undefined) {
      throw new Error('Thiếu listId hoặc itemId để tick món mua');
    }

    const idx = shoppingList.findIndex((i) => String(i.id) === String(itemId));
    if (idx === -1) throw new Error('Item không tồn tại');
    shoppingList[idx] = { ...shoppingList[idx], done: !shoppingList[idx].done };
    return { ...shoppingList[idx] };
  }
}
