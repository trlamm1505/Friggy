/**
 * PARITY — Real vs Mock service methods (rà soát Dev B).
 *
 * ⚠️ VÌ SAO FILE NÀY TỒN TẠI:
 *   `SafeService.withFallback()` build proxy từ method của MOCK, rồi bổ sung
 *   method CHỈ có ở REAL (đã sửa trong rà soát Sprint B4).
 *
 *   Invariant quan trọng nhất: sau khi qua `withFallback`, proxy PHẢI expose
 *   đủ mọi method public mà UI có thể gọi -> không bao giờ
 *   "xxx is not a function" lúc runtime.
 *
 *   Test này chặn regression đó bằng cách:
 *     1. Proxy phải có đủ method public của Real.
 *     2. Proxy phải có đủ method public của Mock (fallback phải gọi được).
 *     3. Method B4 bắt buộc phải tồn tại ở CẢ Real và Mock.
 */

import { withFallback } from '../SafeService';
import { RealFridgeService } from '../../services/real/RealFridgeService';
import { MockFridgeService } from '../../services/mock/MockFridgeService';
import { RealRecipeService } from '../../services/real/RealRecipeService';
import { MockRecipeService } from '../../services/mock/MockRecipeService';
import { RealUserService } from '../../services/real/RealUserService';
import { MockUserService } from '../../services/mock/MockUserService';
import { RealAuthService } from '../../services/real/RealAuthService';
import { MockAuthService } from '../../services/mock/MockAuthService';

/** Gom tất cả method trong prototype chain (bỏ qua helper private `_`-prefixed). */
const methodNames = (Cls) => {
  const names = new Set();
  let current = Cls.prototype;
  while (current && current !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(current)) {
      if (name === 'constructor') continue;
      if (name.startsWith('_')) continue; // helper nội bộ -> không phải contract
      if (typeof current[name] === 'function') names.add(name);
    }
    current = Object.getPrototypeOf(current);
  }
  return [...names].sort();
};

const DOMAINS = [
  ['fridge', RealFridgeService, MockFridgeService],
  ['recipe', RealRecipeService, MockRecipeService],
  ['user', RealUserService, MockUserService],
  ['auth', RealAuthService, MockAuthService],
];

describe('PARITY — proxy sau withFallback phải expose đủ method', () => {
  it.each(DOMAINS)('%s: proxy có đủ method public của Real', (_label, Real, Mock) => {
    const proxy = withFallback(new Real(), new Mock(), { label: _label });

    const missing = methodNames(Real).filter((m) => typeof proxy[m] !== 'function');

    // ⚠️ Thiếu -> UI gọi sẽ ném "xxx is not a function" LÚC RUNTIME.
    expect(missing).toEqual([]);
  });

  it.each(DOMAINS)('%s: proxy có đủ method public của Mock (fallback gọi được)', (_label, Real, Mock) => {
    const proxy = withFallback(new Real(), new Mock(), { label: _label });

    const missing = methodNames(Mock).filter((m) => typeof proxy[m] !== 'function');

    expect(missing).toEqual([]);
  });

  it.each(DOMAINS)('%s: method public của Mock đều được Real implement hoặc cố ý bỏ', (_label, Real, Mock) => {
    const realMethods = methodNames(Real);
    const mockMethods = methodNames(Mock);

    const extraInMock = mockMethods.filter((m) => !realMethods.includes(m));

    // Mock thừa -> withFallback gọi thẳng mock -> lệch shape với Real.
    expect(extraInMock).toEqual([]);
  });
});

describe('PARITY — method B4 bắt buộc phải tồn tại ở CẢ Real và Mock', () => {
  const B4_RECIPE_METHODS = [
    'getNextWeekPlan',
    'markSlotCooked',
    'getShoppingList',
    'toggleShoppingItem',
    'updateSlot',
    'generatePlan',
    'generateFromExpiring',
    'regenerateSlot',
    'streamPlanProgress',
    'getShoppingLists',
    'createShoppingList',
    'toggleShoppingItemInList',
  ];

  it.each([
    ['RealRecipeService', RealRecipeService],
    ['MockRecipeService', MockRecipeService],
  ])('%s có đủ method B4', (_label, Cls) => {
    const methods = methodNames(Cls);
    B4_RECIPE_METHODS.forEach((m) => {
      expect(methods).toContain(m);
    });
  });

  it('RealRecipeService có đủ method B1 (fridge/ingredient) dùng bởi UI', () => {
    const methods = methodNames(RealRecipeService);
    ['getRecipes', 'getRecipeById', 'getSuggestions', 'addBookmark', 'getBookmarked'].forEach((m) => {
      expect(methods).toContain(m);
    });
  });
});
