/**
 * ServiceRegistry — kiểm tra service ĐÃ RESOLVE (qua proxy) có đủ method.
 *
 * ⚠️ VÌ SAO FILE NÀY TỒN TẠI:
 *   `withFallback()` là lớp bọc cuối cùng giữa UI và service thật.
 *   UI gọi `services.userService.getFamilyInfo()` — nếu proxy KHÔNG expose
 *   method này -> `undefined is not a function` -> màn hình trắng / crash.
 *
 *   Đây là bài test "tích hợp" mô phỏng đúng đường đi của app thật:
 *     registerService -> resolveServices -> dùng như UI.
 */

import { resolveServices, registerService, clearRegistry } from '../ServiceRegistry';
import { RealUserService } from '../../services/real/RealUserService';
import { MockUserService } from '../../services/mock/MockUserService';
import { RealFridgeService } from '../../services/real/RealFridgeService';
import { MockFridgeService } from '../../services/mock/MockFridgeService';
import { RealRecipeService } from '../../services/real/RealRecipeService';
import { MockRecipeService } from '../../services/mock/MockRecipeService';

/** Method mà UI thực sự gọi (đối chiếu từ grep trong src/presentation). */
const USER_METHODS_USED_BY_UI = [
  'getProfile',
  'updateProfile',
  'uploadAvatar',
  'getPreferences',
  'updatePreferences',
  'getAllergies',
  'addAllergy',
  'removeAllergy',
  'searchIngredients',
  'submitOnboarding',
  'getNotificationSettings',
  'updateNotificationSettings',
  'getCurrentPlan',
  'getAvailablePackages',
  'getFamily',
  'getFamilyInfo',
  'addFamilyMember',
  'removeFamilyMember',
  'inviteFamilyMember',
  'acceptFamilyInvite',
  'rejectFamilyInvite',
  'dissolveFamilyGroup',
  'subscribe',
  'renewSubscription',
  'cancelAutoRenewal',
  'getPaymentStatus',
  'isSubscribedTo',
  'getMySubscription',
];

const FRIDGE_METHODS_USED_BY_UI = [
  'getItems',
  'getItemById',
  'getSummary',
  'addItem',
  'updateItem',
  'deleteItem',
  'markConsumed',
  'searchIngredients',
  'getExpiring',
  'getFridgeStats',
  'getStatsChart',
  'scanImage',
  'scanReceipt',
  'scanBarcode',
  'getScanStatus',
  'pollScanResult',
  'confirmScan',
  'getScanHistory',
];

const RECIPE_METHODS_USED_BY_UI = [
  'getRecipes',
  'getRecipesFiltered',
  'getRecipeById',
  'getBookmarked',
  'addBookmark',
  'removeBookmark',
  'getSuggestions',
  'getPlans',
  'getPlanDetail',
  'getNextWeekPlan',
  'getSlotDetail',
  'updateSlot',
  'markSlotCooked',
  'generatePlan',
  'generateFromExpiring',
  'regenerateSlot',
  'streamPlanProgress',
  'getShoppingLists',
  'getShoppingList',
  'createShoppingList',
  'toggleShoppingItemInList',
  'toggleShoppingItem',
  'getWeeklyStats',
];

describe('ServiceRegistry — service đã resolve phải expose mọi method UI gọi', () => {
  beforeEach(() => {
    clearRegistry();
  });

  afterEach(() => {
    clearRegistry();
  });

  const setup = () => {
    registerService('userService', new RealUserService());
    registerService('fridgeService', new RealFridgeService());
    registerService('recipeService', new RealRecipeService());

    return resolveServices({
      userService: new MockUserService(),
      fridgeService: new MockFridgeService(),
      recipeService: new MockRecipeService(),
    });
  };

  it('userService đã resolve có đủ method UI gọi', () => {
    const services = setup();

    const missing = USER_METHODS_USED_BY_UI.filter((m) => typeof services.userService[m] !== 'function');

    // ⚠️ Thiếu -> UI ném TypeError "xxx is not a function" -> crash màn hình.
    expect(missing).toEqual([]);
  });

  it('fridgeService đã resolve có đủ method UI gọi', () => {
    const services = setup();

    const missing = FRIDGE_METHODS_USED_BY_UI.filter((m) => typeof services.fridgeService[m] !== 'function');

    expect(missing).toEqual([]);
  });

  it('recipeService đã resolve có đủ method UI gọi', () => {
    const services = setup();

    const missing = RECIPE_METHODS_USED_BY_UI.filter((m) => typeof services.recipeService[m] !== 'function');

    expect(missing).toEqual([]);
  });

  it('streamPlanProgress qua proxy vẫn là async iterable (for await hoạt động)', () => {
    const services = setup();

    const stream = services.recipeService.streamPlanProgress('/x/stream');

    // Không được là Promise -> `for await` sẽ ném "not async iterable".
    expect(typeof stream[Symbol.asyncIterator]).toBe('function');
    expect(typeof stream.then).toBe('undefined');
  });
});
