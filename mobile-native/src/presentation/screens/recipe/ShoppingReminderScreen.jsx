/**
 * ShoppingReminderScreen
 *
 * ⚠️ SPRINT B4 — ĐÃ NỐI BE THẬT (trước đây là `shoppingMock` hardcode).
 *
 * Nguồn dữ liệu: `GET /meal-planning/shopping-lists` -> mỗi list có `items[]`.
 * Tick đã mua: `PATCH /meal-planning/shopping-lists/{listId}/items/{itemId}`.
 *
 * ⚠️ BE trả item id là SỐ (`@ApiProperty({ example: 1 })`) và endpoint toggle
 * dùng `ParseIntPipe` -> PHẢI giữ nguyên kiểu số khi ghép `listId:itemId`.
 *
 * ⚠️ BE KHÔNG có endpoint xoá item hay thêm item lẻ -> các nút tương ứng
 *   vẫn hiển thị nhưng chỉ báo "chưa hỗ trợ" thay vì giả vờ thành công.
 *   (Thêm món chỉ khả dụng qua `createShoppingList` từ kế hoạch tuần.)
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { ErrorState } from '../../components/common/ErrorState';
import { Skeleton } from '../../components/common/Skeleton';
import { Check, Plus, Trash2 } from 'lucide-react-native';
import { showError, showInfo } from '../../utils/helpers';
import { useServices } from '../../../data/ServiceProvider';

const FILTER_KEYS = {
  ALL: 'all',
  PENDING: 'pending',
  COMPLETED: 'completed',
};

export const ShoppingReminderScreen = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const services = useServices();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(FILTER_KEYS.ALL);
  const [busyId, setBusyId] = useState(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await services.recipeService.getShoppingList();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    // `loadItems` là async -> setState chỉ chạy sau `await`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadItems();
  }, [loadItems]);

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
    {
      key: FILTER_KEYS.PENDING,
      label: t('home.shoppingPending'),
      count: counts.pending,
      color: '#FF9800',
    },
    {
      key: FILTER_KEYS.COMPLETED,
      label: t('home.shoppingCompleted'),
      count: counts.completed,
      color: AppColors.primary,
    },
  ];

  /**
   * Tick đã mua — optimistic update + rollback nếu API lỗi.
   *
   * @param {object} item - item có `listId` (do service gắn) và `id`
   */
  const toggle = useCallback(
    async (item) => {
      if (busyId !== null) return;

      const nextDone = !item.done;
      setBusyId(item.id);

      // Optimistic.
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, done: nextDone } : it)));

      try {
        await services.recipeService.toggleShoppingItemInList(item.listId, item.id);
      } catch (e) {
        // Rollback.
        setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, done: !nextDone } : it)));
        showError(e?.message ?? t('home.error'));
      } finally {
        setBusyId(null);
      }
    },
    [busyId, services, t]
  );

  /**
   * Xoá món — BE chưa có endpoint xoá item -> báo rõ cho user.
   */
  const remove = useCallback(() => {
    Alert.alert(t('home.shoppingDelete'), t('home.shoppingDeleteNotSupported'), [
      { text: t('home.cancel'), style: 'cancel' },
    ]);
  }, [t]);

  /**
   * Thêm món — BE chỉ cho tạo list từ kế hoạch tuần -> hướng user sang đó.
   */
  const add = useCallback(() => {
    showInfo(t('home.shoppingAddFromPlanHint'));
  }, [t]);

  const clearCompleted = useCallback(() => {
    const completedCount = items.filter((i) => i.done).length;
    if (completedCount === 0) return;
    Alert.alert(
      t('home.shoppingClearCompleted'),
      `${completedCount} ${t('home.shoppingCompleted')}`,
      [
        { text: t('home.cancel'), style: 'cancel' },
        {
          text: t('home.shoppingClearCompleted'),
          style: 'destructive',
          onPress: () => setItems((prev) => prev.filter((i) => !i.done)),
        },
      ]
    );
  }, [items, t]);

  const hasFilters = search || filter !== FILTER_KEYS.ALL;

  // ── Loading ──
  if (loading && items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
        <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />
        <View style={{ padding: sp(20), gap: sp(10) }}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[styles.skeletonRow, { backgroundColor: isDark ? '#19271E' : '#F4F7F4' }]}
            >
              <Skeleton width={sp(22)} height={sp(22)} borderRadius={sp(11)} />
              <View style={{ flex: 1, marginLeft: sp(12) }}>
                <Skeleton width="60%" height={sp(13)} borderRadius={sp(6)} />
                <Skeleton width="35%" height={sp(11)} borderRadius={sp(6)} style={{ marginTop: sp(6) }} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // ── Error ──
  if (error && items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
        <FriggyAppBar showBackButton onBackTap={() => navigation.goBack()} />
        <View style={{ padding: sp(20) }}>
          <ErrorState message={error?.message} onRetry={loadItems} />
        </View>
      </View>
    );
  }

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
              {
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                fontSize: sp(13),
              },
            ]}
          >
            {counts.pending} {t('home.shoppingPending')} • {counts.completed}{' '}
            {t('home.shoppingCompleted')}
          </Text>
        </View>
        {counts.completed > 0 ? (
          <Pressable
            onPress={clearCompleted}
            hitSlop={6}
            style={({ pressed }) => [styles.clearBtn, { opacity: pressed ? 0.6 : 1 }]}
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
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('home.shoppingSearch')} />
      </View>

      <FilterChips
        options={filterOptions}
        selectedKey={filter}
        onSelect={setFilter}
        style={{ marginBottom: sp(12) }}
      />

      <FlatList
        data={filteredItems}
        keyExtractor={(it) => `${it.listId ?? ''}-${it.id}`}
        contentContainerStyle={{ paddingHorizontal: sp(20), paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: sp(10) }} />}
        renderItem={({ item }) => (
          <ShoppingItem
            item={item}
            busy={busyId === item.id}
            onToggle={() => toggle(item)}
            onRemove={() => remove(item.id)}
          />
        )}
        ListEmptyComponent={
          items.length === 0 ? (
            <EmptyState
              emoji="🛒"
              title={t('home.shoppingEmpty')}
              hint={t('home.shoppingEmptyHint')}
              actionText={t('home.shoppingCreateFromPlan')}
              onAction={add}
            />
          ) : hasFilters ? (
            <EmptyState emoji="🔍" title={t('home.noResults')} hint={t('home.noResultsHint')} />
          ) : null
        }
      />
    </View>
  );
};

const ShoppingItem = ({ item, busy, onToggle, onRemove }) => {
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
        disabled={busy}
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
      <Pressable onPress={onToggle} disabled={busy} style={{ flex: 1, marginLeft: sp(10) }}>
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
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: sp(14),
    borderRadius: sp(12),
  },
});
