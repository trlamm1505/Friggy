/**
 * AllExpiredItemsScreen
 *
 * Redesigned (Sprint 8):
 * - Dùng FridgeListScreen (config-driven) - giảm từ 230 dòng → 60 dòng
 * - Logic filter khác: chỉ lấy items có days <= 3 (sắp hết hạn + đã hết hạn)
 */

import React from 'react';
import { FridgeListScreen } from './FridgeListScreen';
import { getDaysToExpiry } from '../../utils/fridgeDates';

const SORT_OPTIONS = {
  URGENT_FIRST: 'urgent_first',
  EXPIRY_ASC: 'expiry_asc',
  NAME_ASC: 'name_asc',
};

const EXPIRED_CONFIG = {
  titleKey: 'home.expiredIngredients',
  // Màn này gom "sắp hết hạn" + "đã hết hạn" (days <= 3), khác hẳn màn
  // "Nguyên liệu sẵn có" (chỉ còn hạn). Item KHÔNG có hạn dùng không thuộc
  // nhóm này -> `days === null` loại.
  baseFilter: (item) => {
    const days = getDaysToExpiry(item.expiryDate);
    return days !== null && days <= 3;
  },
  statusChips: [
    { key: 'all', labelKey: 'home.all' },
    { key: 'expiring', labelKey: 'home.filterExpiring', color: '#FF9800' },
    { key: 'expired', labelKey: 'home.filterExpired', color: '#FF5252' },
  ],
  statusFilterDefault: 'all',
  statusFilterFn: (item, filterKey) => {
    if (filterKey === 'all') return true;
    const days = getDaysToExpiry(item.expiryDate);
    if (filterKey === 'expiring') return days !== null && days >= 0 && item.status === 'expiring';
    if (filterKey === 'expired') return days !== null && days < 0;
    return false;
  },
  // KHÔNG có `categoryChips` — BE không trả field `category` cho từng item nên
  // filter theo danh mục luôn ra list rỗng (mục 5.2, chốt 23/10).
  sortOptions: SORT_OPTIONS,
  sortOptionsArray: [
    { key: SORT_OPTIONS.URGENT_FIRST, labelKey: 'home.sortUrgent' },
    { key: SORT_OPTIONS.EXPIRY_ASC, labelKey: 'home.sortExpiryAsc' },
    { key: SORT_OPTIONS.NAME_ASC, labelKey: 'home.sortNameAsc' },
  ],
  defaultSort: SORT_OPTIONS.URGENT_FIRST,
  emptyEmoji: '🎉',
  emptyTitleKey: 'home.allGood',
  emptyHintKey: 'home.noExpiredHint',
};

export const AllExpiredItemsScreen = () => {
  return <FridgeListScreen config={EXPIRED_CONFIG} />;
};
