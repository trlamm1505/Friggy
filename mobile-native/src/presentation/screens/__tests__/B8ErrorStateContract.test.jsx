/**
 * B8 — UI phải hiện `ErrorState` khi BE lỗi và cache rỗng.
 *
 * Quy tắc (Option C): sau khi bỏ mock fallback, đọc lỗi sẽ ném lỗi thật lên UI.
 * Nếu màn hình nuốt lỗi và hiện `EmptyState`, user tưởng dữ liệu rỗng ->
 * dữ liệu BỊA. Đây là hành vi sai.
 *
 * ⚠️ BUG ĐÃ TÌM RA KHI LÀM B8:
 *   `useFridgeItems` / `useNotifications` / `useRecipesFiltered` dùng
 *   `initialValue = []` -> `!items` LUÔN false (mảng rỗng là truthy) ->
 *   nhánh `if (error && !items)` KHÔNG BAO GIỜ chạy -> `ErrorState` chưa
 *   bao giờ hiện dù đã import. Điều kiện đúng là `!items?.length`.
 *
 * Các màn được cover ở đây:
 *   1. `FridgeListScreen`      (dùng chung AllAvailableItems/AllExpiredItems)
 *   2. `FridgeInventoryScreen`
 *   3. `NotificationsScreen`
 *   4. `UserAllergiesScreen`   (trước đây nuốt lỗi -> EmptyState "chưa có dị ứng")
 *   5. `ManualAddIngredientScreen` (search lỗi -> báo lỗi thật, không báo
 *      "không có trong danh mục")
 */

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { FridgeListScreen } from '../fridge/FridgeListScreen';
import { FridgeInventoryScreen } from '../fridge/FridgeInventoryScreen';
import { NotificationsScreen } from '../notification/NotificationsScreen';
import { UserAllergiesScreen } from '../profile/UserAllergiesScreen';

const mockGetItems = jest.fn();
const mockGetNotifications = jest.fn();
const mockGetAllergies = jest.fn();

const mockServices = {
  fridgeService: {
    getItems: (...args) => mockGetItems(...args),
    getSummary: jest.fn().mockResolvedValue({ expiredCount: 0, availableCount: 0 }),
    getFridgeStats: jest.fn().mockResolvedValue(null),
    getExpiring: jest.fn().mockResolvedValue([]),
  },
  notificationService: {
    getNotifications: (...args) => mockGetNotifications(...args),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    getUnreadCount: jest.fn().mockResolvedValue(0),
  },
  userService: {
    getAllergies: (...args) => mockGetAllergies(...args),
    searchIngredients: jest.fn().mockResolvedValue([]),
    addAllergy: jest.fn(),
    removeAllergy: jest.fn(),
  },
  recipeService: {
    getRecipes: jest.fn().mockResolvedValue([]),
  },
};

jest.mock('../../../data/ServiceProvider', () => ({
  useServices: () => mockServices,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'vi' },
  }),
}));

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
    // Chạy 1 lần như focus thật — `fn` là closure mới mỗi render nên
    // cố tình bỏ qua exhaustive-deps (giống ScanHistoryScreen.test.jsx).
    useFocusEffect: (fn) =>
      React.useEffect(() => {
        fn();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));

jest.mock('../../theme/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

jest.mock('../../utils/helpers', () => ({
  showError: jest.fn(),
  showSuccess: jest.fn(),
  showInfo: jest.fn(),
  showMutationError: jest.fn(() => false),
}));

// Config tối giản cho `FridgeListScreen` (màn dùng chung).
const listConfig = {
  titleKey: 'home.availableIngredients',
  baseFilter: () => true,
  statusChips: [{ key: 'all', labelKey: 'home.all' }],
  statusFilterDefault: 'all',
  statusFilterFn: () => true,
  sortOptions: {},
  sortOptionsArray: [],
  defaultSort: null,
  emptyEmoji: '🥬',
  emptyTitleKey: 'home.noResults',
  emptyHintKey: 'home.noResultsHint',
};

describe('B8 — màn hình đọc dữ liệu phải hiện ErrorState khi lỗi + cache rỗng', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('FridgeListScreen: lỗi + danh sách rỗng -> hiện ErrorState (không phải EmptyState)', async () => {
    mockGetItems.mockRejectedValue(new Error('Mất mạng'));

    const view = await render(<FridgeListScreen config={listConfig} />);

    await waitFor(() => {
      expect(view.getByText('offline.readFailed')).toBeTruthy();
    });
    // KHÔNG được hiện "không có kết quả" (dữ liệu bịa).
    expect(view.queryByText('home.noResults')).toBeNull();
  });

  it('FridgeListScreen: bấm "thử lại" -> gọi lại service', async () => {
    mockGetItems.mockRejectedValueOnce(new Error('Mất mạng')).mockResolvedValueOnce([]);

    const view = await render(<FridgeListScreen config={listConfig} />);

    await waitFor(() => {
      expect(view.getByText('offline.readFailed')).toBeTruthy();
    });

    fireEvent.press(view.getByText('home.retry'));

    await waitFor(() => {
      expect(mockGetItems).toHaveBeenCalledTimes(2);
    });
  });

  it('FridgeInventoryScreen: lỗi + danh sách rỗng -> hiện ErrorState', async () => {
    mockGetItems.mockRejectedValue(new Error('Mất mạng'));

    const view = await render(<FridgeInventoryScreen />);

    await waitFor(() => {
      expect(view.getByText('offline.readFailed')).toBeTruthy();
    });
  });

  it('NotificationsScreen: lỗi + danh sách rỗng -> hiện ErrorState', async () => {
    mockGetNotifications.mockRejectedValue(new Error('Mất mạng'));

    const view = await render(<NotificationsScreen />);

    await waitFor(() => {
      expect(view.getByText('offline.readFailed')).toBeTruthy();
    });
  });

  it('UserAllergiesScreen: lỗi -> KHÔNG hiện EmptyState "chưa có dị ứng", hiện ErrorState', async () => {
    mockGetAllergies.mockRejectedValue(new Error('Mất mạng'));

    const view = await render(<UserAllergiesScreen />);

    await waitFor(() => {
      expect(view.getByText('offline.readFailed')).toBeTruthy();
    });
    // Rất quan trọng: user KHÔNG được tưởng mình không bị dị ứng.
    expect(view.queryByText('home.noAllergies')).toBeNull();
  });

  it('UserAllergiesScreen: bấm "thử lại" -> gọi lại getAllergies', async () => {
    mockGetAllergies.mockRejectedValueOnce(new Error('Mất mạng')).mockResolvedValueOnce([]);

    const view = await render(<UserAllergiesScreen />);

    await waitFor(() => {
      expect(view.getByText('offline.readFailed')).toBeTruthy();
    });

    fireEvent.press(view.getByText('home.retry'));

    await waitFor(() => {
      expect(mockGetAllergies).toHaveBeenCalledTimes(2);
    });
  });

  it('UserAllergiesScreen: load OK rỗng -> vẫn hiện EmptyState (không phải ErrorState)', async () => {
    mockGetAllergies.mockResolvedValue([]);

    const view = await render(<UserAllergiesScreen />);

    await waitFor(() => {
      expect(view.getByText('home.noAllergies')).toBeTruthy();
    });
    expect(view.queryByText('offline.readFailed')).toBeNull();
  });
});
