/**
 * ShoppingListShortcut — số "món chưa mua" ở Home.
 *
 * ⚠️ BUG USER BÁO:
 *   User tick N món trong danh sách mua khi OFFLINE -> bật mạng lại -> Home
 *   vẫn hiện N món CHƯA MUA (số cũ) thay vì số mới.
 *
 *   Nguyên nhân: (1) component chỉ load 1 lần lúc mount, không refresh khi
 *   quay lại Home / sau khi sync; (2) khi pull dữ liệu server, row 'pending'
 *   (tick offline) bị ghi đè.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

const mockGetShoppingList = jest.fn();

jest.mock('../../../../data/ServiceProvider', () => ({
  useServices: () => ({
    recipeService: {
      getShoppingList: (...args) => mockGetShoppingList(...args),
    },
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key),
    i18n: { language: 'vi' },
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('../../../../data/offline/OfflineCache', () => ({
  offlineCache: {
    getShoppingItems: jest.fn(async () => []),
  },
  SYNC_STATUS: { SYNCED: 'synced', PENDING: 'pending' },
}));

const { offlineCache } = require('../../../../data/offline/OfflineCache');
const { ShoppingListShortcut } = require('../ShoppingListShortcut');

jest.setTimeout(30000);

beforeEach(() => {
  mockGetShoppingList.mockReset();
  mockGetShoppingList.mockResolvedValue([]);
  offlineCache.getShoppingItems.mockReset();
  offlineCache.getShoppingItems.mockResolvedValue([]);
});

describe('ShoppingListShortcut - đếm món chưa mua', () => {
  it('đếm món chưa mua từ server', async () => {
    mockGetShoppingList.mockResolvedValue([
      { id: '1', name: 'A', done: false },
      { id: '2', name: 'B', done: true },
      { id: '3', name: 'C', done: false },
    ]);

    const view = await render(<ShoppingListShortcut onPress={() => {}} />);

    await waitFor(() => {
      expect(view.getByText('home.shoppingPendingCount:{"count":2}')).toBeTruthy();
    });
  });

  it('món tick offline (row pending) -> lấy trạng thái từ CACHE, không phải server', async () => {
    // Server chưa kịp nhận -> vẫn trả về "chưa mua".
    mockGetShoppingList.mockResolvedValue([
      { id: '1', name: 'A', done: false },
      { id: '2', name: 'B', done: false },
    ]);
    // Cache local: user đã tick món '1' offline.
    offlineCache.getShoppingItems.mockResolvedValue([
      { id: '1', name: 'A', done: true, _syncStatus: 'pending' },
      { id: '2', name: 'B', done: false, _syncStatus: 'synced' },
    ]);

    const view = await render(<ShoppingListShortcut onPress={() => {}} />);

    await waitFor(() => {
      // Chỉ còn 1 món chưa mua (món '1' đã tick offline).
      expect(view.getByText('home.shoppingPendingCount:{"count":1}')).toBeTruthy();
    });
  });

  it('món CHỈ có trong cache (thêm offline) -> vẫn được tính', async () => {
    mockGetShoppingList.mockResolvedValue([{ id: '1', name: 'A', done: false }]);
    offlineCache.getShoppingItems.mockResolvedValue([
      { id: '1', name: 'A', done: false, _syncStatus: 'synced' },
      { id: 'pending_missing_slot-1_0', name: 'Thịt bò', done: false, _syncStatus: 'pending' },
    ]);

    const view = await render(<ShoppingListShortcut onPress={() => {}} />);

    await waitFor(() => {
      expect(view.getByText('home.shoppingPendingCount:{"count":2}')).toBeTruthy();
    });
  });

  it('server lỗi (offline) -> dùng cache local', async () => {
    mockGetShoppingList.mockRejectedValue(new Error('offline'));
    offlineCache.getShoppingItems.mockResolvedValue([
      { id: '1', name: 'A', done: false, _syncStatus: 'pending' },
      { id: '2', name: 'B', done: true, _syncStatus: 'pending' },
    ]);

    const view = await render(<ShoppingListShortcut onPress={() => {}} />);

    await waitFor(() => {
      expect(view.getByText('home.shoppingPendingCount:{"count":1}')).toBeTruthy();
    });
  });

  it('danh sách rỗng -> hiện "empty"', async () => {
    const view = await render(<ShoppingListShortcut onPress={() => {}} />);

    await waitFor(() => {
      expect(view.getByText('home.shoppingEmpty')).toBeTruthy();
    });
  });

  it('đăng ký useFocusEffect -> load lại mỗi lần màn có focus', async () => {
    const { useFocusEffect } = require('@react-navigation/native');
    await render(<ShoppingListShortcut onPress={() => {}} />);
    expect(useFocusEffect).toHaveBeenCalled();
  });
});
