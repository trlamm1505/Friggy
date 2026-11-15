/**
 * OfflineRecipeList - cache danh sách công thức (bảng `local_recipe_list`).
 *
 * ⚠️ VÌ SAO CẦN:
 *   Màn "Gợi ý công thức" gọi `GET /recipes`. Khi offline, `SafeService`
 *   fallback sang MOCK -> user thấy công thức BỊA (tệ hơn Flutter, vì
 *   Flutter fallback về cache thật). Bảng này là nguồn thay thế.
 */

import { offlineCache } from '../OfflineCache';
import { __resetFakeDb } from './helpers/fakeSqlite';

const RECIPES = [
  {
    id: 'r1',
    name: 'Bò kho',
    image: 'http://a.png',
    cookTime: 45,
    difficulty: 'medium',
    servings: 4,
    mealType: 'main',
    estimatedCost: 120000,
    isAiGenerated: false,
    tags: ['món Việt'],
    isBookmarked: false,
  },
  {
    id: 'r2',
    name: 'Cá chiên xù',
    cookTime: 20,
    difficulty: 'easy',
    servings: 2,
    mealType: 'main',
    estimatedCost: 80000,
    isAiGenerated: true,
    tags: ['nhanh', 'ngon'],
    isBookmarked: true,
  },
  {
    id: 'r3',
    name: 'Canh rau',
    cookTime: 15,
    difficulty: 'easy',
    servings: 2,
    mealType: 'soup',
    estimatedCost: 30000,
    isAiGenerated: false,
    tags: [],
    isBookmarked: false,
  },
];

describe('OfflineCache - danh sách công thức', () => {
  beforeEach(async () => {
    __resetFakeDb();
    await offlineCache.clearCache();
  });

  it('lưu và đọc lại danh sách công thức', async () => {
    await offlineCache.saveRecipeList(RECIPES);

    const list = await offlineCache.getRecipeList();
    expect(list).toHaveLength(3);

    const boKho = list.find((r) => r.id === 'r1');
    expect(boKho.name).toBe('Bò kho');
    expect(boKho.cookTime).toBe(45);
    expect(boKho.difficulty).toBe('medium');
    expect(boKho.servings).toBe(4);
    expect(boKho.mealType).toBe('main');
    expect(boKho.estimatedCost).toBe(120000);
    expect(boKho.isAiGenerated).toBe(false);
    expect(boKho.tags).toEqual(['món Việt']);
  });

  it('lọc theo search (không phân biệt hoa thường)', async () => {
    await offlineCache.saveRecipeList(RECIPES);

    const found = await offlineCache.getRecipeList({ search: 'bò' });
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe('r1');
  });

  it('lọc theo difficulty + maxCookTime', async () => {
    await offlineCache.saveRecipeList(RECIPES);

    const easy = await offlineCache.getRecipeList({ difficulty: 'easy' });
    expect(easy.map((r) => r.id).sort()).toEqual(['r2', 'r3']);

    const fast = await offlineCache.getRecipeList({ maxCookTime: 20 });
    expect(fast.map((r) => r.id).sort()).toEqual(['r2', 'r3']);
  });

  it('sort theo cookTime / name (client-side)', async () => {
    await offlineCache.saveRecipeList(RECIPES);

    const byTime = await offlineCache.getRecipeList({ sortBy: 'cookTime', sortDir: 'asc' });
    expect(byTime.map((r) => r.id)).toEqual(['r3', 'r2', 'r1']);

    const desc = await offlineCache.getRecipeList({ sortBy: 'cookTime', sortDir: 'desc' });
    expect(desc.map((r) => r.id)).toEqual(['r1', 'r2', 'r3']);
  });

  it('sort theo name (dùng bộ tên không dấu để không phụ thuộc collation)', async () => {
    await offlineCache.saveRecipeList([
      { id: 'n1', name: 'Alpha' },
      { id: 'n2', name: 'Gamma' },
      { id: 'n3', name: 'Beta' },
    ]);

    const byName = await offlineCache.getRecipeList({ sortBy: 'name' });
    expect(byName.map((r) => r.name)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('setRecipeBookmarked bật/tắt cờ bookmark', async () => {
    await offlineCache.saveRecipeList(RECIPES);

    await offlineCache.setRecipeBookmarked('r1', true);
    let list = await offlineCache.getRecipeList();
    expect(list.find((r) => r.id === 'r1').isBookmarked).toBe(true);

    await offlineCache.setRecipeBookmarked('r1', false);
    list = await offlineCache.getRecipeList();
    expect(list.find((r) => r.id === 'r1').isBookmarked).toBe(false);
  });

  it('getBookmarkedRecipes chỉ trả công thức đã bookmark', async () => {
    await offlineCache.saveRecipeList(RECIPES);

    const marked = await offlineCache.getBookmarkedRecipes();
    expect(marked).toHaveLength(1);
    expect(marked[0].id).toBe('r2');
  });

  // ⚠️ REGRESSION: `getBookmarked` trong service gọi `syncBookmarkedFlags(ids)`.
  // Nếu dùng nhầm `saveRecipeList` -> xoá sạch danh sách công thức đã cache.
  it('syncBookmarkedFlags KHÔNG xoá danh sách công thức đã cache', async () => {
    await offlineCache.saveRecipeList(RECIPES);

    await offlineCache.syncBookmarkedFlags(['r3']);

    const list = await offlineCache.getRecipeList();
    expect(list).toHaveLength(3);

    const marked = await offlineCache.getBookmarkedRecipes();
    expect(marked.map((r) => r.id)).toEqual(['r3']);
  });

  it('saveRecipeList thay thế snapshot cũ (xoá công thức không còn trên server)', async () => {
    await offlineCache.saveRecipeList(RECIPES);
    await offlineCache.saveRecipeList([RECIPES[0]]);

    const list = await offlineCache.getRecipeList();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('r1');
  });

  // ⚠️ REGRESSION: kết quả ĐÃ LỌC (search / difficulty / 1 trang) chỉ là
  //   tập con -> nếu dùng `saveRecipeList` sẽ XOÁ sạch phần còn lại trong
  //   cache -> user offline chỉ thấy đúng phần đang lọc.
  it('upsertRecipeList GỘP vào cache, KHÔNG xoá phần đã cache', async () => {
    await offlineCache.saveRecipeList(RECIPES);

    await offlineCache.upsertRecipeList([
      { id: 'r1', name: 'Bò kho (cập nhật)', cookTime: 50, difficulty: 'medium' },
    ]);

    const list = await offlineCache.getRecipeList();
    expect(list).toHaveLength(3);

    const boKho = list.find((r) => r.id === 'r1');
    expect(boKho.name).toBe('Bò kho (cập nhật)');
    expect(boKho.cookTime).toBe(50);
  });

  it('upsertRecipeList thêm mới công thức chưa có trong cache', async () => {
    await offlineCache.saveRecipeList([RECIPES[0]]);

    await offlineCache.upsertRecipeList([RECIPES[1]]);

    const list = await offlineCache.getRecipeList();
    expect(list).toHaveLength(2);
    expect(list.map((r) => r.id).sort()).toEqual(['r1', 'r2']);
  });

  it('upsertRecipeList KHÔNG ghi đè cờ bookmark đã set', async () => {
    await offlineCache.saveRecipeList(RECIPES);
    await offlineCache.setRecipeBookmarked('r1', true);

    await offlineCache.upsertRecipeList([{ id: 'r1', name: 'Bò kho' }]);

    const list = await offlineCache.getRecipeList();
    expect(list.find((r) => r.id === 'r1').isBookmarked).toBe(true);
  });

  it('clearCache xoá luôn danh sách công thức', async () => {
    await offlineCache.saveRecipeList(RECIPES);
    await offlineCache.clearCache();
    expect(await offlineCache.getRecipeList()).toHaveLength(0);
  });
});
