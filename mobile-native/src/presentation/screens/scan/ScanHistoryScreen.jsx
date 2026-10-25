/**
 * ScanHistoryScreen
 *
 * B2 — màn lịch sử các lần scan AI (`GET /fridge/scan/history`).
 * BE trả `ScanHistoryItemDto[]`: { id, scanType, status, detectedCount,
 * confirmedCount, createdAt } — giữ nguyên shape, không mapper.
 *
 * Thiết kế theo pattern NotificationsScreen: FriggyAppBar + pull-to-refresh,
 * Skeleton khi tải, ErrorState + retry khi lỗi, EmptyState khi chưa scan.
 * Mỗi dòng hiện icon theo scanType, số món AI nhận diện / đã xác nhận,
 * badge trạng thái (success xanh / failed đỏ / pending cam) và thời gian.
 *
 * Không có nút bấm vào chi tiết: BE không có endpoint lấy lại items của 1
 * scan cũ sau khi đã confirm (confirm là thao tác 1 lần), nên dòng chỉ đọc.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { useTranslation } from 'react-i18next';
import { Camera, Receipt, Barcode, ChevronLeft, History } from 'lucide-react-native';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Skeleton } from '../../components/common/Skeleton';
import { useServices } from '../../../data/ServiceProvider';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

const SCAN_TYPE_META = {
  image: { icon: Camera, color: '#4CAF50' },
  receipt: { icon: Receipt, color: '#2196F3' },
  barcode: { icon: Barcode, color: '#9C27B0' },
};

const STATUS_COLOR = {
  success: '#4CAF50',
  failed: '#FF5252',
  pending: '#FF9800',
};

const formatTime = (iso, isEn) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const hhmm = d.toLocaleTimeString(isEn ? 'en-US' : 'vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (sameDay) return isEn ? `Today ${hhmm}` : `Hôm nay ${hhmm}`;
  if (isYesterday) return isEn ? `Yesterday ${hhmm}` : `Hôm qua ${hhmm}`;
  return d.toLocaleDateString(isEn ? 'en-US' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const ScanHistoryScreen = () => {
  const { isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const services = useServices();
  const isEn = i18n.language === 'en';

  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await services.fridgeService.getScanHistory();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [services]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const typeLabel = (scanType) => {
    if (scanType === 'receipt') return t('scan.scanReceipt');
    if (scanType === 'barcode') return t('scan.scanBarcode');
    return t('scan.scanFood');
  };

  const statusLabel = (status) => {
    if (status === 'success') return isEn ? 'Success' : 'Thành công';
    if (status === 'failed') return isEn ? 'Failed' : 'Thất bại';
    return isEn ? 'Processing' : 'Đang xử lý';
  };

  const renderItem = ({ item }) => {
    const meta = SCAN_TYPE_META[item.scanType] || SCAN_TYPE_META.image;
    const Icon = meta.icon;
    const statusColor = STATUS_COLOR[item.status] || STATUS_COLOR.pending;
    const counts =
      item.confirmedCount !== null && item.confirmedCount !== undefined
        ? `${item.confirmedCount}/${item.detectedCount}`
        : `${item.detectedCount}`;

    return (
      <View
        style={[
          styles.row,
          {
            backgroundColor: isDark ? '#19271E' : '#F4F7F4',
            borderColor: isDark ? '#2E4D36' : 'transparent',
          },
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: `${meta.color}22` }]}>
          <Icon color={meta.color} size={22} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1, marginLeft: sp(12) }}>
          <Text
            style={[
              styles.rowTitle,
              { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(14) },
            ]}
            numberOfLines={1}
          >
            {typeLabel(item.scanType)}
          </Text>
          <Text
            style={[
              styles.rowSub,
              {
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                fontSize: sp(12),
              },
            ]}
          >
            {isEn ? `${counts} items` : `${counts} món`} · {formatTime(item.createdAt, isEn)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}1A` }]}>
          <Text style={[styles.statusText, { color: statusColor, fontSize: sp(11) }]}>
            {statusLabel(item.status)}
          </Text>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.list}>
          {[0, 1, 2, 3].map((k) => (
            <Skeleton key={k} height={sp(64)} borderRadius={sp(12)} style={{ marginBottom: sp(10) }} />
          ))}
        </View>
      );
    }
    if (error) {
      return <ErrorState message={error?.message} onRetry={load} />;
    }
    if (!items || items.length === 0) {
      return (
        <EmptyState
          emoji="📷"
          title={isEn ? 'No scans yet' : 'Chưa có lần quét nào'}
          hint={isEn ? 'Scan food, receipts or barcodes to see history here' : 'Quét thực phẩm, hóa đơn hoặc mã vạch để xem lịch sử tại đây'}
        />
      );
    }
    return (
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[AppColors.primary]}
          />
        }
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0E1611' : '#FFFFFF' }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.backButton}>
          <ChevronLeft color={isDark ? '#FFFFFF' : AppColors.textPrimary} size={28} />
        </Pressable>
        <History color={isDark ? AppColors.primaryLight : AppColors.primary} size={20} />
        <Text
          style={[
            styles.headerTitle,
            { color: isDark ? '#FFFFFF' : AppColors.textPrimary, fontSize: sp(18) },
          ]}
        >
          {isEn ? 'Scan history' : 'Lịch sử quét'}
        </Text>
      </View>
      {renderContent()}
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
    paddingHorizontal: sp(12),
    paddingVertical: sp(12),
    gap: sp(6),
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  list: {
    padding: sp(16),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: sp(12),
    borderRadius: sp(12),
    borderWidth: 1,
    marginBottom: sp(10),
  },
  iconBox: {
    width: sp(44),
    height: sp(44),
    borderRadius: sp(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  rowSub: {
    fontFamily: FontFamily.regular,
    marginTop: sp(2),
  },
  statusBadge: {
    paddingHorizontal: sp(10),
    paddingVertical: sp(5),
    borderRadius: sp(10),
    marginLeft: sp(8),
  },
  statusText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
});
