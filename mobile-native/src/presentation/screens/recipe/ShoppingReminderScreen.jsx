/**
 * ShoppingReminderScreen
 *
 * Redesigned (Sprint 7):
 * - Filter chips: All / Pending / Completed
 * - Search bar cho shopping items
 * - Stats header (pending + completed count)
 * - Long-press to delete (instead of swipe - simpler)
 * - Dùng useAsyncData-style hook thông qua service
 * - Empty states khác nhau (no items vs no filter result)
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontWeights, FontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { FriggyAppBar } from '../../components/navigation/FriggyAppBar';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterChips } from '../../components/common/FilterChips';
import { EmptyState } from '../../components/common/EmptyState';
import { Check, Plus, ShoppingCart, Trash2 } from 'lucide-react-native';
import shoppingMock from '../../../shared/mocks/shopping-reminder.json';
import { showSuccess } from '../../utils/helpers';

const FILTER_KEYS = {
  ALL: 'all',
  PENDING: 'pending',
  COMPLETED: 'completed',
};

export const ShoppingReminderScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [items, setItems] = useState(shoppingMock.items);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(FILTER_KEYS.ALL);

  // Filter + search
  const filteredItems = useMemo(() => {
    let result = items;
    if (filter === FILTER_KEYS.PENDING) result = result.filter((i) => !i.done);
    else if (filter === FILTER_KEYS.COMPLETED) result = result.filter((i) => i.done);

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((i) => i.name.toLowerCase().includes(q));
    }
    return result;
  }, [items, filter, search]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: items.length,
      pending: items.filter((i) => !i.done).length,
      completed: items.filter((i) => i.done).length,
    };
  }, [items]);

  const filterOptions = [
    { key: FILTER_KEYS.ALL, label: t('home.shoppingAll'), count: counts.all },
    { key: FILTER_KEYS.PENDING, label: t('home.shoppingPending'), count: counts.pending, color: '#FF9800' },
    { key: FILTER_KEYS.COMPLETED, label: t('home.shoppingCompleted'), count: counts.completed, color: AppColors.primary },
  ];

  const toggle = useCallback(
    (id) => {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
    },
    [],
  );

  const remove = useCallback(
    (id) => {
      Alert.alert(t('home.shoppingDelete'), 'Xóa món này khỏi danh sách?', [
        { text: t('home.cancel'), style: 'cancel' },
        {
          text: t('home.shoppingDelete'),
          style: 'destructive',
          onPress: () => setItems((prev) => prev.filter((it) => it.id !== id)),
        },
      ]);
    },
    [t],
  );

  const add = useCallback(() => {
    const newItem = {
      id: String(Date.now()),
      name: `Món mới ${items.length + 1}`,
      quantity: 1,
      unit: 'cái',
      done: false,
    };
    setItems((prev) => [...prev, newItem]);
    showSuccess(t('home.shoppingAddItem'));
  }, [items.length, t]);

  const clearCompleted = useCallback(() => {
    const completedCount = items.filter((i) => i.done).length;
    if (completedCount === 0) return;
    Alert.alert(
      t('home.shoppingClearCompleted'),
      `Xóa ${completedCount} món đã hoàn thành?`,
      [
        { text: t('home.cancel'), style: 'cancel' },
        {
          text: t('home.shoppingClearCompleted'),
          style: 'destructive',
          onPress: () => setItems((prev) => prev.filter((it) => !it.done)),
        },
      ],
    );
  }, [items, t]);

  const hasFilters = search || filter !== FILTER_KEYS.ALL;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
      <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.title,
              { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(22) },
            ]}
          >
            {t('home.shoppingTitle')}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(13) },
            ]}
          >
            {counts.pending} {t('home.shoppingPending')} • {counts.completed} {t('home.shoppingCompleted')}
          </Text>
        </View>
        {counts.completed > 0 ? (
          <Pressable
            onPress={clearCompleted}
            hitSlop={6}
            style={({ pressed }) => [
              styles.clearBtn,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Trash2 color={isDark ? AppColors.primaryLight : AppColors.forestAccent} size={16} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={add}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: AppColors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Plus color="#FFFFFF" size={20} strokeWidth={2.5} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: sp(20), marginBottom: sp(10) }}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm món..."
        />
      </View>

      <FilterChips
        options={filterOptions}
        selectedKey={filter}
        onSelect={setFilter}
        style={{ marginBottom: sp(12) }}
      />

      <FlatList
        data={filteredItems}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ paddingHorizontal: sp(20), paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: sp(10) }} />}
        renderItem={({ item }) => (
          <ShoppingItem
            item={item}
            onToggle={() => toggle(item.id)}
            onRemove={() => remove(item.id)}
          />
        )}
        ListEmptyComponent={
          items.length === 0 ? (
            <EmptyState
              emoji="🛒"
              title={t('home.shoppingEmpty')}
              hint={t('home.shoppingEmptyHint')}
              actionText={t('home.shoppingAddItem')}
              onAction={add}
            />
          ) : hasFilters ? (
            <EmptyState
              emoji="🔍"
              title={t('home.noResults')}
              hint={t('home.noResultsHint')}
            />
          ) : null
        }
      />
    </View>
  );
};

const ShoppingItem = ({ item, onToggle, onRemove }) => {
  const { isDark } = useTheme();
  return (
    <View
      style={[
        styles.itemRow,
        {
          backgroundColor: isDark ? '#19271E' : '#F4F7F4',
          borderColor: item.done ? AppColors.primary : isDark ? '#2E4D36' : 'transparent',
          opacity: item.done ? 0.6 : 1,
        },
      ]}
    >
      <Pressable
        onPress={onToggle}
        hitSlop={4}
        style={({ pressed }) => [
          styles.checkBox,
          {
            backgroundColor: item.done ? AppColors.primary : 'transparent',
            borderColor: item.done ? AppColors.primary : isDark ? '#2E4D36' : '#C0C9C3',
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        {item.done ? <Check color="#FFFFFF" size={14} strokeWidth={3} /> : null}
      </Pressable>
      <Pressable onPress={onToggle} style={{ flex: 1, marginLeft: sp(10) }}>
        <Text
          style={[
            styles.itemName,
            {
              color: isDark ? '#FFFFFF' : AppColors.textPrimary,
              fontSize: sp(15),
              textDecorationLine: item.done ? 'line-through' : 'none',
            },
          ]}
        >
          {item.name}
        </Text>
        <Text
          style={[
            styles.itemQty,
            { color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary, fontSize: sp(12) },
          ]}
        >
          {item.quantity} {item.unit}
        </Text>
      </Pressable>
      <Pressable
        onPress={onRemove}
        hitSlop={6}
        style={({ pressed }) => [styles.removeBtn, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Trash2 color={isDark ? AppColors.darkTextSecondary : AppColors.hintText} size={16} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp(20),
    paddingTop: sp(8),
    paddingBottom: sp(12),
    gap: sp(8),
  },
  title: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontWeight: FontWeights.medium,
    marginTop: sp(4),
  },
  clearBtn: {
    width: sp(36),
    height: sp(36),
    borderRadius: sp(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: sp(40),
    height: sp(40),
    borderRadius: sp(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: sp(14),
    borderRadius: sp(12),
    borderWidth: 1,
  },
  checkBox: {
    width: sp(22),
    height: sp(22),
    borderRadius: sp(11),
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  itemQty: {
    fontFamily: FontFamily.regular,
    marginTop: sp(2),
  },
  removeBtn: {
    width: sp(32),
    height: sp(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: sp(8),
  },
});
