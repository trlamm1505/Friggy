/**
 * Mock mode — service mock phải expose mọi method UI gọi.
 *
 * ⚠️ VÌ SAO CẦN:
 *   Khi `USE_MOCKS=true` (UI design / demo / BE down), `resolveServices()`
 *   trả về mock THUẦN (không qua proxy) -> mock phải có ĐÚNG các method
 *   mà UI gọi, nếu không UI ném "xxx is not a function".
 *
 *   Trước đây `MockUserService` thiếu `getFamilyInfo`, `subscribe`,
 *   `getPaymentStatus`, `isSubscribedTo`, `inviteFamilyMember`,
 *   `acceptFamilyInvite`, `dissolveFamilyGroup`... -> các màn Family /
 *   Subscription crash ngay khi bật mock mode.
 */

import { resolveServices } from '../ServiceRegistry';
import { MockUserService } from '../../services/mock/MockUserService';
import { MockFridgeService } from '../../services/mock/MockFridgeService';
import { MockRecipeService } from '../../services/mock/MockRecipeService';

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

describe('Mock mode — mock service phải expose mọi method UI gọi', () => {
  const mockServices = {
    userService: new MockUserService(),
    fridgeService: new MockFridgeService(),
    recipeService: new MockRecipeService(),
  };

  it('mock userService có đủ method UI gọi', () => {
    const missing = USER_METHODS_USED_BY_UI.filter((m) => typeof mockServices.userService[m] !== 'function');

    expect(missing).toEqual([]);
  });

  it('mock fridgeService có đủ method UI gọi', () => {
    const missing = FRIDGE_METHODS_USED_BY_UI.filter(
      (m) => typeof mockServices.fridgeService[m] !== 'function'
    );

    expect(missing).toEqual([]);
  });

  it('mock recipeService có đủ method UI gọi', () => {
    const missing = RECIPE_METHODS_USED_BY_UI.filter(
      (m) => typeof mockServices.recipeService[m] !== 'function'
    );

    expect(missing).toEqual([]);
  });

  it('streamPlanProgress của mock là async iterable', () => {
    const stream = mockServices.recipeService.streamPlanProgress('/x/stream');

    expect(typeof stream[Symbol.asyncIterator]).toBe('function');
  });
});

describe('Mock mode — resolveServices trả mock nguyên vẹn', () => {
  it('khi bật mock, service vẫn có đủ method', () => {
    // `resolveServices` ép mock khi `getMode()` true. Test này chỉ kiểm tra
    // shape của mock, không phụ thuộc mode.
    const resolved = resolveServices({
      userService: new MockUserService(),
      fridgeService: new MockFridgeService(),
      recipeService: new MockRecipeService(),
    });

    // Dù chế độ nào, service phải gọi được các method ở trên.
    const missing = USER_METHODS_USED_BY_UI.filter(
      (m) => typeof resolved.userService[m] !== 'function'
    );

    expect(missing).toEqual([]);
  });
});
