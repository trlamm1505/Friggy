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
 * ── CÁC THAO TÁC ĐÃ NỐI (BE đã có endpoint tương ứng) ─────────────────────
 *   - Thêm món lẻ:   `POST   /meal-planning/shopping-lists/{listId}/items`
 *   - Sửa số lượng:  `PATCH  /meal-planning/shopping-lists/{listId}/items/{itemId}`
 *   - Xoá món:       `DELETE /meal-planning/shopping-lists/{listId}/items/{itemId}`
 *   - Giỏ active:    `GET    /meal-planning/shopping-lists/active`
 *
 * ⚠️ Thêm món cần `ingredientId` (FK tới bảng `ingredients`) — KHÔNG nhận tên
 *   tự do, giống hệt luồng thêm vào tủ lạnh. Vì vậy modal thêm món dùng
 *   `CatalogPickerModal` (tra `GET /ingredients?search=`).
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, Modal, TextInput, Image } from 'react-native';
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
import { CatalogPickerModal } from '../../components/scan/CatalogPickerModal';
import { Check, Plus, Trash2, X, Minus, Store } from 'lucide-react-native';
import { showError, showSuccess, showMutationError } from '../../utils/helpers';
import { useServices } from '../../../data/ServiceProvider';

const FILTER_KEYS = {
  ALL: 'all',
  PENDING: 'pending',
  COMPLETED: 'completed',
};

/** Định dạng giá VND (giống `formatVnd` ở SubscriptionPlansSheet). */
const formatVnd = (n) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0);

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

  // ── Modal thêm món ──
  const [pickerVisible, setPickerVisible] = useState(false);
  const [addingItem, setAddingItem] = useState(false);

  // ── Modal sửa số lượng ──
  const [editingItem, setEditingItem] = useState(null);
  const [editQty, setEditQty] = useState('1');
  const [savingQty, setSavingQty] = useState(false);

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
      result = result.filter((i) => (i.name ?? '').toLowerCase().includes(q));
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
        // P2 (offline): đã lưu vào hàng đợi -> GIỮ optimistic update
        // (thao tác đã ghi nhớ), chỉ hiện thông báo "đã lưu, sẽ đồng bộ".
        const queued = e?.isOfflineQueued === true;
        if (!queued) {
          // Rollback.
          setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, done: !nextDone } : it)));
        }
        showMutationError(e, t('home.error'), {
          offlineMessage: t('offline.savedQueued'),
        });
      } finally {
        setBusyId(null);
      }
    },
    [busyId, services, t]
  );

  /**
   * Xoá món — `DELETE /meal-planning/shopping-lists/{listId}/items/{itemId}`.
   *
   * ⚠️ BE soft-delete -> item biến mất khỏi `GET /shopping-lists` sau reload.
   */
  const remove = useCallback(
    (item) => {
      if (busyId !== null) return;

      Alert.alert(t('home.shoppingDelete'), item.name, [
        { text: t('home.cancel'), style: 'cancel' },
        {
          text: t('home.shoppingDelete'),
          style: 'destructive',
          onPress: async () => {
            setBusyId(item.id);
            try {
              await services.recipeService.removeShoppingListItem(item.listId, item.id);
              setItems((prev) => prev.filter((it) => it.id !== item.id));
              showSuccess(t('home.shoppingItemRemoved'));
            } catch (e) {
              showError(e?.message ?? t('home.error'));
            } finally {
              setBusyId(null);
            }
          },
        },
      ]);
    },
    [busyId, services, t]
  );

  /**
   * Thêm món — mở picker catalog (`GET /ingredients?search=`).
   *
   * ⚠️ BE bắt buộc `ingredientId` (FK) -> KHÔNG gửi tên tự do, sẽ bị 400.
   */
  const add = useCallback(() => {
    setPickerVisible(true);
  }, []);

  /**
   * Đã chọn 1 nguyên liệu trong catalog -> thêm vào giỏ active.
   *
   * @param {{id:number,name:string,defaultUnit?:string|null}} option
   */
  const handlePickIngredient = useCallback(
    async (option) => {
      setAddingItem(true);
      try {
        // Ưu tiên giỏ active; BE tự tạo list rỗng nếu chưa có.
        const list = await services.recipeService.getActiveShoppingList();
        const listId = list?.id ?? null;
        if (!listId) {
          showError(t('home.shoppingNoList'));
          return;
        }

        await services.recipeService.addShoppingListItem(listId, {
          ingredientId: option.id,
          quantity: 1,
          unit: option.defaultUnit ?? '',
        });

        showSuccess(t('home.shoppingAddedCount', { count: 1 }));
        await loadItems();
      } catch (e) {
        showError(e?.message ?? t('home.error'));
      } finally {
        setAddingItem(false);
      }
    },
    [services, t, loadItems]
  );

  /** Mở modal sửa số lượng. */
  const openEditQuantity = useCallback((item) => {
    setEditingItem(item);
    setEditQty(String(item.quantity ?? 1));
  }, []);

  /** Lưu số lượng mới — `PATCH .../items/{itemId}`. */
  const saveQuantity = useCallback(async () => {
    if (!editingItem) return;

    const qty = Number(editQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      showError(t('home.error'));
      return;
    }

    setSavingQty(true);
    try {
      const updated = await services.recipeService.updateShoppingListItem(
        editingItem.listId,
        editingItem.id,
        { quantity: qty }
      );
      setItems((prev) =>
        prev.map((it) =>
          it.id === editingItem.id ? { ...it, quantity: updated?.quantity ?? qty } : it
        )
      );
      setEditingItem(null);
      showSuccess(t('home.shoppingQuantityUpdated'));
    } catch (e) {
      showError(e?.message ?? t('home.error'));
    } finally {
      setSavingQty(false);
    }
  }, [editingItem, editQty, services, t]);

  const clearCompleted = useCallback(() => {
    const completed = items.filter((i) => i.done);
    if (completed.length === 0) return;

    Alert.alert(
      t('home.shoppingClearCompleted'),
      `${completed.length} ${t('home.shoppingCompleted')}`,
      [
        { text: t('home.cancel'), style: 'cancel' },
        {
          text: t('home.shoppingClearCompleted'),
          style: 'destructive',
          onPress: async () => {
            // Xoá từng item đã mua (BE chưa có endpoint xoá hàng loạt).
            const targets = completed;
            setBusyId('__batch__');
            try {
              await Promise.all(
                targets.map((it) =>
                  services.recipeService.removeShoppingListItem(it.listId, it.id)
                )
              );
              setItems((prev) => prev.filter((i) => !i.done));
              showSuccess(t('home.shoppingItemRemoved'));
            } catch (e) {
              showError(e?.message ?? t('home.error'));
              await loadItems();
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  }, [items, services, t, loadItems]);

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
                <Skeleton
                  width="35%"
                  height={sp(11)}
                  borderRadius={sp(6)}
                  style={{ marginTop: sp(6) }}
                />
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
            accessibilityLabel={t('home.shoppingClearCompleted')}
          >
            <Trash2 color={isDark ? AppColors.primaryLight : AppColors.forestAccent} size={16} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={add}
          disabled={addingItem}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: AppColors.primary, opacity: addingItem ? 0.6 : pressed ? 0.85 : 1 },
          ]}
          testID="shopping-add-item"
          accessibilityLabel={t('home.shoppingAddItemTitle')}
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
            onRemove={() => remove(item)}
            onEditQuantity={() => openEditQuantity(item)}
          />
        )}
        ListEmptyComponent={
          items.length === 0 ? (
            <EmptyState
              emoji="🛒"
              title={t('home.shoppingEmpty')}
              hint={t('home.shoppingEmptyHint')}
              actionText={t('home.shoppingAddItemTitle')}
              onAction={add}
            />
          ) : hasFilters ? (
            <EmptyState emoji="🔍" title={t('home.noResults')} hint={t('home.noResultsHint')} />
          ) : null
        }
      />

      {/* ── Modal chọn nguyên liệu trong catalog ── */}
      <CatalogPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handlePickIngredient}
      />

      {/* ── Modal sửa số lượng ── */}
      <QuantityModal
        visible={editingItem !== null}
        item={editingItem}
        value={editQty}
        saving={savingQty}
        onChange={setEditQty}
        onSave={saveQuantity}
        onClose={() => setEditingItem(null)}
      />
    </View>
  );
};

/**
 * Modal sửa số lượng của 1 mặt hàng.
 */
const QuantityModal = ({ visible, item, value, saving, onChange, onSave, onClose }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const step = (delta) => {
    const current = Number(value) || 0;
    const next = Math.max(1, current + delta);
    onChange(String(next));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalBackdropPress} onPress={onClose} />
        <View
          style={[
            styles.qtyCard,
            { backgroundColor: isDark ? '#19271E' : '#FFFFFF' },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text
              style={[
                styles.modalTitle,
                { color: isDark ? '#FFFFFF' : AppColors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {item?.name}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X color={isDark ? AppColors.darkTextSecondary : AppColors.textSecondary} size={20} />
            </Pressable>
          </View>

          <View style={styles.qtyRow}>
            <Pressable
              onPress={() => step(-1)}
              style={[
                styles.qtyBtn,
                { backgroundColor: isDark ? '#233629' : '#F2F5F3' },
              ]}
              accessibilityLabel="-1"
            >
              <Minus color={isDark ? '#FFFFFF' : AppColors.textPrimary} size={18} />
            </Pressable>

            <TextInput
              value={value}
              onChangeText={onChange}
              keyboardType="numeric"
              style={[
                styles.qtyInput,
                {
                  color: isDark ? '#FFFFFF' : AppColors.textPrimary,
                  backgroundColor: isDark ? '#0E1611' : '#FFFFFF',
                  borderColor: isDark ? '#2E4D36' : '#E3E8E4',
                },
              ]}
            />

            <Pressable
              onPress={() => step(1)}
              style={[
                styles.qtyBtn,
                { backgroundColor: isDark ? '#233629' : '#F2F5F3' },
              ]}
              accessibilityLabel="+1"
            >
              <Plus color={isDark ? '#FFFFFF' : AppColors.textPrimary} size={18} />
            </Pressable>
          </View>

          <Pressable
            onPress={onSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveQtyBtn,
              { backgroundColor: AppColors.primary, opacity: saving ? 0.6 : pressed ? 0.85 : 1 },
            ]}
            testID="shopping-save-quantity"
          >
            <Text style={styles.saveQtyText}>
              {saving ? t('common.loading') : t('home.shoppingEditQuantity')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const ShoppingItem = ({ item, busy, onToggle, onRemove, onEditQuantity }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  // ⚠️ Chỉ hiện khối "nơi cung cấp" khi BE trả về ít nhất 1 nhà cung cấp đã
  //   đăng ký cho nguyên liệu này. Không có -> KHÔNG hiển thị gì (đúng yêu cầu).
  const suppliers = Array.isArray(item.supplierSuggestions) ? item.supplierSuggestions : [];

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
        accessibilityLabel={item.name}
      >
        {item.done ? <Check color="#FFFFFF" size={14} strokeWidth={3} /> : null}
      </Pressable>
      <View style={{ flex: 1, marginLeft: sp(10) }}>
        <Pressable
          onPress={onEditQuantity}
          disabled={busy}
          testID={`shopping-item-${item.id}`}
        >
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
              {
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                fontSize: sp(12),
              },
            ]}
          >
            {item.quantity} {item.unit}
          </Text>
        </Pressable>

        {/* ── Nơi cung cấp (chỉ hiện khi có supplier đã đăng ký) ── */}
        {suppliers.length > 0 ? (
          <View
            style={[
              styles.supplierBox,
              {
                backgroundColor: isDark ? '#0E1611' : '#FFFFFF',
                borderColor: isDark ? '#2E4D36' : '#E3E8E4',
              },
            ]}
            testID={`shopping-suppliers-${item.id}`}
          >
            <View style={styles.supplierHeader}>
              <Store
                color={isDark ? AppColors.primaryLight : AppColors.forestAccent}
                size={13}
                strokeWidth={2.5}
              />
              <Text
                style={[
                  styles.supplierHeaderText,
                  {
                    color: isDark ? AppColors.primaryLight : AppColors.forestAccent,
                    fontSize: sp(11),
                  },
                ]}
              >
                {t('home.shoppingSupplierAvailable', { count: suppliers.length })}
              </Text>
            </View>

            {suppliers.map((s, idx) => (
              <View
                key={s.supplierIngredientId ?? `${s.companyName}-${idx}`}
                style={[styles.supplierRow, idx > 0 && styles.supplierRowDivider]}
              >
                {s.image ? (
                  <Image source={{ uri: s.image }} style={styles.supplierAvatar} />
                ) : (
                  <View
                    style={[
                      styles.supplierAvatarFallback,
                      {
                        backgroundColor: isDark ? '#233629' : AppColors.primary,
                      },
                    ]}
                  >
                    <Text style={styles.supplierAvatarInitial}>
                      {(s.companyName || s.name || '?').trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: sp(8) }}>
                  <Text
                    style={[
                      styles.supplierName,
                      { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(12) },
                    ]}
                    numberOfLines={1}
                  >
                    {s.companyName || s.name}
                  </Text>
                  {s.name && s.companyName ? (
                    <Text
                      style={[
                        styles.supplierProduct,
                        {
                          color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                          fontSize: sp(11),
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {s.name}
                    </Text>
                  ) : null}
                </View>
                {typeof s.price === 'number' ? (
                  <Text
                    style={[
                      styles.supplierPrice,
                      { color: isDark ? AppColors.primaryLight : AppColors.forestAccent, fontSize: sp(12) },
                    ]}
                  >
                    {t('home.shoppingSupplierPrice', { price: formatVnd(s.price) })}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <Pressable
        onPress={onRemove}
        hitSlop={6}
        disabled={busy}
        style={({ pressed }) => [styles.removeBtn, { opacity: pressed ? 0.6 : 1 }]}
        accessibilityLabel={t('home.shoppingDelete')}
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
  supplierBox: {
    marginTop: sp(10),
    paddingVertical: sp(8),
    paddingHorizontal: sp(10),
    borderRadius: sp(10),
    borderWidth: 1,
  },
  supplierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(6),
    marginBottom: sp(6),
  },
  supplierHeaderText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sp(6),
  },
  supplierRowDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  supplierAvatar: {
    width: sp(28),
    height: sp(28),
    borderRadius: sp(14),
    backgroundColor: '#F4F7F4',
  },
  supplierAvatarFallback: {
    width: sp(28),
    height: sp(28),
    borderRadius: sp(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplierAvatarInitial: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    fontSize: sp(12),
  },
  supplierName: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  supplierProduct: {
    fontFamily: FontFamily.regular,
    marginTop: sp(1),
  },
  supplierPrice: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    marginLeft: sp(8),
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: sp(24),
  },
  modalBackdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  qtyCard: {
    width: '100%',
    borderRadius: sp(16),
    padding: sp(18),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp(16),
  },
  modalTitle: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
    fontSize: sp(16),
    marginRight: sp(8),
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp(16),
    marginBottom: sp(16),
  },
  qtyBtn: {
    width: sp(40),
    height: sp(40),
    borderRadius: sp(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    minWidth: sp(72),
    textAlign: 'center',
    borderWidth: 1,
    borderRadius: sp(10),
    paddingVertical: sp(8),
    paddingHorizontal: sp(10),
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    fontSize: sp(16),
  },
  saveQtyBtn: {
    paddingVertical: sp(12),
    borderRadius: sp(12),
    alignItems: 'center',
  },
  saveQtyText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    fontSize: sp(14),
  },
});
