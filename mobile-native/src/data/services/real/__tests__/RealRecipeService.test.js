/**
 * RealRecipeService — test bắt buộc Sprint B3 (plan mục 9b.4)
 *
 * Quy tắc R1 — mỗi test so cùng input cho cả Real lẫn Mock để chứng minh
 * output khớp shape.
 *
 * Chỉ test logic KHÔNG NHÌN THẤY (mục 9b.5):
 *   1. Mapper BE response -> shape UI (title->name, cookTimeMinutes->cookTime,
 *      difficultyLevel->difficulty, matchScore->matchPercent)
 *   2. Phân trang: BE trả { data, total, ... } -> service trả flat array
 *   3. Suggestions đọc MEAL-PLANNING SLOTS, sort theo mealType, take 3
 *   4. Filter gửi lên server (maxCookTime) + sort client-side
 *   5. Bookmark POST/DELETE đúng endpoint
 *   6. Error mapping 404 -> ApiException đúng message
 */

import { ApiClient } from '../../../api/ApiClient';
import { RealRecipeService } from '../RealRecipeService';
import { MockRecipeService } from '../../mock/MockRecipeService';
import { ApiException } from '../../../api/ApiException';

jest.mock('../../../api/ApiClient', () => ({
  ApiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const api = ApiClient;
let svc;

beforeEach(() => {
  api.get.mockReset();
  api.post.mockReset();
  api.patch.mockReset();
  api.delete.mockReset();
  svc = new RealRecipeService();
});

/** Dùng `data` nguyên bản của BE (chưa qua interceptor unwrap) để test đúng contract. */
const beRecipe = (over = {}) => ({
  id: 'uuid-1',
  title: 'Trứng xào cà chua',
  thumbnailPath: '/public/recipes/trung-xao.jpg',
  mealType: 'breakfast',
  cookTimeMinutes: 15,
  servings: 2,
  difficultyLevel: 'easy',
  estimatedCost: 30000,
  isAiGenerated: false,
  tags: [{ id: 1, name: 'Nhanh', type: 'feature' }],
  ...over,
});

const bePaginated = (items, over = {}) => ({
  data: items,
  total: items.length,
  page: 1,
  limit: 20,
  totalPages: 1,
  ...over,
});

// ═══════════════ 1. MAPPER — R1: cùng input, cùng shape với Mock ═══════════════

describe('1. Mapper BE response -> shape UI', () => {
  it('map đúng tên field: title->name, cookTimeMinutes->cookTime, difficultyLevel->difficulty', async () => {
    api.get.mockResolvedValue(bePaginated([beRecipe()]));

    const recipes = await svc.getRecipes();
    const r = recipes[0];

    expect(r.name).toBe('Trứng xào cà chua');
    expect(r.cookTime).toBe(15);
    expect(r.difficulty).toBe('easy');
    expect(r.servings).toBe(2);
    expect(r.id).toBe('uuid-1');
  });

  it('difficultyLevel uppercase của DB -> lowercase cho UI', () => {
    expect(svc._toRecipe(beRecipe({ difficultyLevel: 'EASY' })).difficulty).toBe('easy');
    expect(svc._toRecipe(beRecipe({ difficultyLevel: 'MEDIUM' })).difficulty).toBe('medium');
    expect(svc._toRecipe(beRecipe({ difficultyLevel: 'HARD' })).difficulty).toBe('hard');
  });

  it('ảnh đi qua appConfig.getImageUrl (R2), không dùng path thô', () => {
    const r = svc._toRecipe(beRecipe({ thumbnailPath: '/public/recipes/trung-xao.jpg' }));
    expect(r.image).toBeTruthy();
    expect(r.image).toMatch(/^https?:\/\//);
    expect(r.image).toContain('/public/recipes/trung-xao.jpg');
  });

  it('matchScore -> matchPercent', () => {
    const s = svc._toSuggestion(beRecipe({ matchScore: 87 }));
    expect(s.matchPercent).toBe(87);
  });

  it('tags của BE là object { id, name, type } -> UI dùng mảng string', () => {
    const r = svc._toRecipe(beRecipe({ tags: [{ id: 1, name: 'Nhanh', type: 'f' }] }));
    expect(r.tags).toEqual(['Nhanh']);
  });
});

// ═══════════════ 2. PHÂN TRANG — BE trả object, service trả flat array ═══════════════

describe('2. Phân trang GET /recipes', () => {
  it('BE trả { data, total } -> service trả MẢNG phẳng cho UI', async () => {
    api.get.mockResolvedValue(bePaginated([beRecipe(), beRecipe({ id: 'uuid-2' })]));

    const recipes = await svc.getRecipes();

    expect(Array.isArray(recipes)).toBe(true);
    expect(recipes).toHaveLength(2);
    expect(recipes[1].id).toBe('uuid-2');
  });

  it('response không có `data` -> trả mảng rỗng thay vì crash', async () => {
    api.get.mockResolvedValue({});
    await expect(svc.getRecipes()).resolves.toEqual([]);
  });
});

// ═══════════════ 3. DETAIL — phải fetch theo id, có inFridge ═══════════════

describe('3. GET /recipes/:id — chi tiết', () => {
  it('trả ingredients + steps, giữ cờ inFridge của BE', async () => {
    api.get.mockResolvedValue({
      ...beRecipe(),
      description: 'Món ăn sáng đơn giản',
      ingredients: [
        {
          ingredientId: 9,
          ingredientName: 'Cà chua',
          quantity: 2,
          unit: 'quả',
          isOptional: false,
          note: null,
          inFridge: true,
        },
        {
          ingredientId: 10,
          ingredientName: 'Trứng gà',
          quantity: 3,
          unit: 'quả',
          isOptional: false,
          note: null,
          inFridge: false,
        },
      ],
      steps: [
        { stepNumber: 1, instruction: 'Rửa cà chua', imagePath: null, durationMinutes: 2 },
        { stepNumber: 2, instruction: 'Xào trứng', imagePath: null, durationMinutes: 5 },
      ],
    });

    const r = await svc.getRecipeById('uuid-1');

    expect(r.name).toBe('Trứng xào cà chua');
    expect(r.description).toBe('Món ăn sáng đơn giản');
    expect(r.ingredients).toHaveLength(2);
    expect(r.ingredients[0].name).toBe('Cà chua');
    expect(r.ingredients[0].inFridge).toBe(true);
    expect(r.ingredients[1].inFridge).toBe(false);
    // steps của BE là object -> UI dùng mảng string instruction
    expect(r.steps).toEqual(['Rửa cà chua', 'Xào trứng']);
  });

  it('id rỗng -> trả null, KHÔNG gọi API', async () => {
    await expect(svc.getRecipeById(null)).resolves.toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });
});

// ═══════════════ 4. SUGGESTIONS = meal-planning slots hôm nay ═══════════════

describe('4. getSuggestions() đọc MEAL-PLANNING SLOTS', () => {
  it('gọi đúng 2 endpoint: plans -> plans/{id}, KHÔNG gọi /recipes/suggestions', async () => {
    api.get
      .mockResolvedValueOnce([{ id: 'plan-1', weekStartDate: '2026-10-19' }])
      .mockResolvedValueOnce({ id: 'plan-1', dailyPlans: [] });

    await svc.getSuggestions();

    expect(api.get).toHaveBeenCalledTimes(2);
    expect(api.get).toHaveBeenNthCalledWith(1, '/meal-planning/plans');
    expect(api.get).toHaveBeenNthCalledWith(2, '/meal-planning/plans/plan-1');
    const calledUrls = api.get.mock.calls.map((c) => c[0]);
    expect(calledUrls).not.toContain('/recipes/suggestions');
  });

  it('lọc dailyPlan theo dayOfWeek hôm nay, sort theo bữa, take 3', async () => {
    const jsDay = new Date().getDay();
    const today = jsDay === 0 ? 7 : jsDay; // 1=T2..7=CN (quy ước BE)

    api.get.mockResolvedValueOnce([{ id: 'plan-1' }]).mockResolvedValueOnce({
      dailyPlans: [
        {
          id: 'daily-today',
          dayOfWeek: today,
          mealSlots: [
            {
              id: 'slot-dinner',
              dayOfWeek: today,
              mealType: 'dinner',
              recipeId: 'r3',
              recipeName: 'Thịt heo xào rau',
              servings: 4,
              estimatedCost: 90000,
              note: null,
              completedAt: null,
            },
            {
              id: 'slot-breakfast',
              dayOfWeek: today,
              mealType: 'breakfast',
              recipeId: 'r1',
              recipeName: 'Trứng xào cà chua',
              servings: 2,
              estimatedCost: 30000,
              note: null,
              completedAt: '2026-10-20T10:00:00.000Z',
            },
            {
              id: 'slot-lunch',
              dayOfWeek: today,
              mealType: 'lunch',
              recipeId: 'r2',
              recipeName: 'Canh rau củ',
              servings: 4,
              estimatedCost: 45000,
              note: null,
              completedAt: null,
            },
            {
              id: 'slot-snack',
              dayOfWeek: today,
              mealType: 'snack',
              recipeId: 'r4',
              recipeName: 'Salad cà chua',
              servings: 2,
              estimatedCost: 20000,
              note: null,
              completedAt: null,
            },
          ],
        },
        { id: 'daily-other', dayOfWeek: today === 1 ? 2 : 1, mealSlots: [] },
      ],
    });

    const slots = await svc.getSuggestions();

    // take(3) + sort theo thứ tự bữa
    expect(slots).toHaveLength(3);
    expect(slots.map((s) => s.mealType)).toEqual(['breakfast', 'lunch', 'dinner']);
    // `id` là ID SLOT, `recipeId` là ID công thức
    expect(slots[0].id).toBe('slot-breakfast');
    expect(slots[0].recipeId).toBe('r1');
    // cooked lấy từ completedAt
    expect(slots[0].cooked).toBe(true);
    expect(slots[1].cooked).toBe(false);
    // cookTime không có trong slot -> gán theo bữa (giống Flutter)
    expect(slots[0].cookTime).toBe(15); // breakfast
    expect(slots[1].cookTime).toBe(25); // lunch
    expect(slots[2].cookTime).toBe(20); // dinner
    expect(slots[0].servings).toBe(2);
  });

  it('không có plan nào -> trả mảng rỗng, không gọi endpoint thứ 2', async () => {
    api.get.mockResolvedValueOnce([]);
    await expect(svc.getSuggestions()).resolves.toEqual([]);
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════ 5. FILTER + SORT ═══════════════

describe('5. Filter gửi lên server, sort client-side', () => {
  it('cook-time filter -> gửi maxCookTime LÊN SERVER (không lọc client)', async () => {
    api.get.mockResolvedValue(bePaginated([beRecipe()]));

    await svc.getRecipesFiltered({ maxCookTime: 14 });

    expect(api.get).toHaveBeenCalledWith('/recipes', { params: { maxCookTime: 14 } });
  });

  it('difficulty + search + mealType -> đều gửi lên server', async () => {
    api.get.mockResolvedValue(bePaginated([]));

    await svc.getRecipesFiltered({
      search: 'trứng',
      difficulty: 'easy',
      mealType: 'breakfast',
    });

    const { params } = api.get.mock.calls[0][1];
    expect(params.search).toBe('trứng');
    expect(params.difficulty).toBe('easy');
    expect(params.mealType).toBe('breakfast');
  });

  it('sort theo cookTime tăng dần -> client-side, đúng thứ tự', async () => {
    api.get.mockResolvedValue(
      bePaginated([
        beRecipe({ id: 'a', cookTimeMinutes: 45 }),
        beRecipe({ id: 'b', cookTimeMinutes: 10 }),
        beRecipe({ id: 'c', cookTimeMinutes: 25 }),
      ])
    );

    const recipes = await svc.getRecipesFiltered({ sortBy: 'cookTime', sortDir: 'asc' });

    expect(recipes.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('sort theo difficulty -> client-side, đúng thứ tự easy -> hard', async () => {
    api.get.mockResolvedValue(
      bePaginated([
        beRecipe({ id: 'a', difficultyLevel: 'hard' }),
        beRecipe({ id: 'b', difficultyLevel: 'easy' }),
        beRecipe({ id: 'c', difficultyLevel: 'medium' }),
      ])
    );

    const recipes = await svc.getRecipesFiltered({ sortBy: 'difficulty', sortDir: 'asc' });

    expect(recipes.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });
});

// ═══════════════ 6. BOOKMARK ═══════════════

describe('6. Bookmark', () => {
  it('POST /recipes/{id}/bookmark khi lưu', async () => {
    api.post.mockResolvedValue(null);
    await svc.addBookmark('uuid-1');
    expect(api.post).toHaveBeenCalledWith('/recipes/uuid-1/bookmark');
  });

  it('DELETE /recipes/{id}/bookmark khi bỏ lưu', async () => {
    api.delete.mockResolvedValue(null);
    await svc.removeBookmark('uuid-1');
    expect(api.delete).toHaveBeenCalledWith('/recipes/uuid-1/bookmark');
  });

  it('GET /recipes/bookmarked trả về danh sách đã map sang shape UI', async () => {
    api.get.mockResolvedValue([beRecipe()]);
    const list = await svc.getBookmarked();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Trứng xào cà chua');
  });
});

// ═══════════════ 7. WEEKLY STATS ═══════════════

describe('7. getWeeklyStats() đọc GET /fridge/stats', () => {
  it('trả đúng shape WeeklyStats mới', async () => {
    api.get.mockResolvedValue({
      totalSpentThisMonth: 1200000,
      wastePercent: 8,
      mealsCooked: 12,
      expiringSoonCount: 3,
      totalItems: 47,
    });

    const stats = await svc.getWeeklyStats();

    expect(api.get).toHaveBeenCalledWith('/fridge/stats');
    expect(stats).toEqual({
      mealsCooked: 12,
      expiringSoonCount: 3,
      totalSpentThisMonth: 1200000,
      wastePercent: 8,
      totalItems: 47,
    });
  });

  it('BE thiếu field -> trả 0 thay vì undefined', async () => {
    api.get.mockResolvedValue({});
    const stats = await svc.getWeeklyStats();
    expect(stats.mealsCooked).toBe(0);
    expect(stats.expiringSoonCount).toBe(0);
    expect(stats.totalItems).toBe(0);
  });
});

// ═══════════════ 8. ERROR MAPPING ═══════════════

describe('8. Error mapping', () => {
  it('404 -> ApiException với message của BE, KHÔNG fallback', async () => {
    api.get.mockRejectedValue(
      new ApiException('Không tìm thấy công thức', { statusCode: 404, isNetworkError: false })
    );

    await expect(svc.getRecipeById('nope')).rejects.toThrow('Không tìm thấy công thức');
    expect(api.get).toHaveBeenCalledWith('/recipes/nope');
  });

  it('lỗi mạng -> ApiException isNetworkError=true (R3: UI hiển thị khác)', async () => {
    api.get.mockRejectedValue(
      new ApiException('Không thể kết nối máy chủ', { statusCode: null, isNetworkError: true })
    );

    await expect(svc.getRecipes()).rejects.toMatchObject({ isNetworkError: true });
  });
});

// ═══════════════ 9. R1 — cùng input, cùng output shape với Mock ═══════════════

describe('9. R1 — Mock và Real cùng shape', () => {
  it('getSuggestions(): Mock cũng trả slot có mealType/recipeId/cooked', async () => {
    const mock = new MockRecipeService();
    const mockSlots = await mock.getSuggestions();

    expect(mockSlots.length).toBeGreaterThan(0);
    expect(mockSlots[0]).toHaveProperty('mealType');
    expect(mockSlots[0]).toHaveProperty('recipeId');
    expect(mockSlots[0]).toHaveProperty('cooked');
    expect(mockSlots[0]).toHaveProperty('servings');
    // cùng bộ key với Real
    const realKeys = Object.keys(
      svc._toMealSlot({
        id: 's',
        dayOfWeek: 1,
        mealType: 'lunch',
        recipeId: 'r',
        recipeName: 'x',
        servings: 2,
        estimatedCost: null,
        note: null,
        completedAt: null,
      })
    ).sort();
    const mockKeys = Object.keys(mockSlots[0]).sort();
    expect(mockKeys).toEqual(realKeys);
  });

  it('getWeeklyStats(): Mock cũng trả đúng shape WeeklyStats mới', async () => {
    const mock = new MockRecipeService();
    const mockStats = await mock.getWeeklyStats();

    expect(Object.keys(mockStats).sort()).toEqual(
      [
        'expiringSoonCount',
        'mealsCooked',
        'totalItems',
        'totalSpentThisMonth',
        'wastePercent',
      ].sort()
    );
  });
});
