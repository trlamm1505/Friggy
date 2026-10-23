/**
 * AllAvailableItemsScreen
 *
 * Redesigned (Sprint 8):
 * - Dùng FridgeListScreen (config-driven) - giảm từ 250 dòng → 50 dòng
 * - Tất cả logic filter/sort/search được config hóa
 */

import React from 'react';
import { FridgeListScreen } from './FridgeListScreen';
import { isItemAvailable } from '../../utils/fridgeDates';

// KHÔNG còn CATEGORY_KEYS: chip category đã bị tắt (categoryChips: null) vì
// BE không trả field `category` cho từng item. Giữ lại hằng số chỉ là code chết
// -> ESLint no-unused-vars. Xem chú thích ở `categoryChips` bên dưới.

const SORT_OPTIONS = {
  EXPIRY_ASC: 'expiry_asc',
  EXPIRY_DESC: 'expiry_desc',
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
};

const AVAILABLE_CONFIG = {
  titleKey: 'home.availableIngredients',
  // Chỉ hiện nguyên liệu CÒN hạn (kể cả hết hạn HÔM NAY).
  // `isItemAvailable` xử lý cả case không có hạn dùng (`expiresAt: null`) —
  // xem `fridgeDateUtils.js` vì sao KHÔNG được dùng `days >= 0` trực tiếp.
  baseFilter: isItemAvailable,
  statusChips: [
    { key: 'all', labelKey: 'home.all', color: undefined },
    { key: 'fresh', labelKey: 'home.filterFresh', color: '#4CAF50' },
    { key: 'expiring', labelKey: 'home.filterExpiring', color: '#FF9800' },
  ],
  statusFilterDefault: 'all',
  statusFilterFn: (item, filterKey) => {
    if (filterKey === 'all') return true;
    return item.status === filterKey;
  },
  // KHÔNG còn hàng chip category: `FridgeItemResponseDto` của BE không trả field
  // `category` cho từng item, nên mọi item đều có `category === undefined`:
  //   - count của 3 chip luôn = 0 (giống "All" -> vô nghĩa),
  //   - bấm chip -> `it.category === 'vegetable'` false hết -> list RỖNG.
  // Nên đây không phải sửa UI cho đẹp mà là fix bug: filter này không bao giờ cho
  // kết quả đúng. `FridgeListScreen` đã bỏ hẳn nhánh xử lý category.
  // Quyết định: DEV_B_ONBOARDING_PROMPT.md mục 5.2 (chốt 23/10).
  // Muốn lọc theo danh mục thì cần BE trả `category` — thuộc ngoài phạm DEV B.
  sortOptions: SORT_OPTIONS,
  sortOptionsArray: [
    { key: SORT_OPTIONS.EXPIRY_ASC, labelKey: 'home.sortExpiryAsc' },
    { key: SORT_OPTIONS.EXPIRY_DESC, labelKey: 'home.sortExpiryDesc' },
    { key: SORT_OPTIONS.NAME_ASC, labelKey: 'home.sortNameAsc' },
    { key: SORT_OPTIONS.NAME_DESC, labelKey: 'home.sortNameDesc' },
  ],
  defaultSort: SORT_OPTIONS.EXPIRY_ASC,
  emptyEmoji: '🥬',
  emptyTitleKey: 'home.noResults',
  emptyHintKey: 'home.noResultsHint',
};

export const AllAvailableItemsScreen = () => {
  return <FridgeListScreen config={AVAILABLE_CONFIG} />;
};
