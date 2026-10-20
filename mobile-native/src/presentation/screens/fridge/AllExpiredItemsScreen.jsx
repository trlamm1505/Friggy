/**
 * AllExpiredItemsScreen
 *
 * Redesigned (Sprint 8):
 * - Dùng FridgeListScreen (config-driven) - giảm từ 230 dòng → 60 dòng
 * - Logic filter khác: chỉ lấy items có days <= 3 (sắp hết hạn + đã hết hạn)
 */

import React from 'react';
import { FridgeListScreen } from './FridgeListScreen';

const getDaysToExpiry = (expiryDate) => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
};

const SORT_OPTIONS = {
  URGENT_FIRST: 'urgent_first',
  EXPIRY_ASC: 'expiry_asc',
  NAME_ASC: 'name_asc',
};

const EXPIRED_CONFIG = {
  titleKey: 'home.expiredIngredients',
  baseFilter: (item) => {
    const days = getDaysToExpiry(item.expiryDate);
    return days <= 3;
  },
  statusChips: [
    { key: 'all', labelKey: 'home.all' },
    { key: 'expiring', labelKey: 'home.filterExpiring', color: '#FF9800' },
    { key: 'expired', labelKey: 'home.filterExpired', color: '#FF5252' },
  ],
  statusFilterDefault: 'all',
  statusFilterFn: (item, filterKey) => {
    const days = getDaysToExpiry(item.expiryDate);
    if (filterKey === 'all') return true;
    if (filterKey === 'expiring') return days >= 0 && item.status === 'expiring';
    if (filterKey === 'expired') return days < 0;
    return false;
  },
  categoryChips: null, // Expired screen không cần filter theo category
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
