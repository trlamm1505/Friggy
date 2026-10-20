/**
 * AllAvailableItemsScreen
 *
 * Redesigned (Sprint 8):
 * - Dùng FridgeListScreen (config-driven) - giảm từ 250 dòng → 50 dòng
 * - Tất cả logic filter/sort/search được config hóa
 */

import React from 'react';
import { FridgeListScreen } from './FridgeListScreen';

const CATEGORY_KEYS = {
  ALL: 'all',
  VEGETABLE: 'vegetable',
  MEAT: 'meat',
  DAIRY: 'dairy',
  FRUIT: 'fruit',
  OTHER: 'other',
};

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
  categoryChips: [
    { key: 'all', labelKey: 'home.categoryAll' },
    { key: 'vegetable', labelKey: 'home.categoryVegetable', color: '#4CAF50' },
    { key: 'meat', labelKey: 'home.categoryMeat', color: '#E57373' },
    { key: 'dairy', labelKey: 'home.categoryDairy', color: '#FFB300' },
  ],
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
