/**
 * AllAvailableItemsScreen
 *
 * Redesigned (Sprint 8):
 * - Dùng FridgeListScreen (config-driven) - giảm từ 250 dòng → 50 dòng
 * - Tất cả logic filter/sort/search được config hóa
 */

import React from 'react';
import { FridgeListScreen } from './FridgeListScreen';

// KHÔNG còn CATEGORY_KEYS: chip category đã bị tắt (categoryChips: null) vì
// BE không trả field `category` cho từng item. Giữ lại hằng số chỉ là code chết
// -> ESLint no-unused-vars. Xem chú thích ở `categoryChips` bên dưới.

const getDaysToExpiry = (expiryDate) => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
};

const SORT_OPTIONS = {
  EXPIRY_ASC: 'expiry_asc',
  EXPIRY_DESC: 'expiry_desc',
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
};

const AVAILABLE_CONFIG = {
  titleKey: 'home.availableIngredients',
  baseFilter: (item) => {
    const days = getDaysToExpiry(item.expiryDate);
    return item.status !== 'expired' && days >= 0;
  },
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
  // TẮT chip category (B1 — mục 5.2 của DEV_B_ONBOARDING_PROMPT.md).
  // ✅ ĐÃ CHỐT 23/10 — không phải quyết định tại thời điểm code.
  // Lý do: `FridgeItemResponseDto` KHÔNG trả field `category`, nên mọi item đều có
  // `item.category === undefined`:
  //   - count của 3 chip luôn = 0 (giống "All" -> vô nghĩa),
  //   - bấm chip -> `it.category === 'vegetable'` false hết -> list RỖNG.
  // Nên đây không phải UI sửa cho đẹp mà là fix bug: filter này không bao giờ cho kết quả đúng.
  // Xem RealFridgeService.js mục "BA SAI LẦM ĐÃ BIẾT" số 2.
  // Muốn lọc theo danh mục thì cần BE trả `category` trước — thuộc ngoài phạm DEV B.
  categoryChips: null,
  categoryFilterDefault: 'all',
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
