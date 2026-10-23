/**
 * ExpiryDatePicker
 *
 * Modal chọn ngày hết hạn — tự dựng, KHÔNG phụ thuộc
 * `@react-native-community/datetimepicker`.
 *
 * Lý do tự dựng: lib đó có native code. Chạy `npx expo start` (Expo Go) thì
 * Metro sẽ KHÔNG bundle được -> app crash lúc mở modal. Muốn dùng lib thì
 * phải `npx expo prebuild` + dev build, tức không còn test nhanh được nữa.
 *
 * Bám cấu trúc Flutter: `manual_add_ingredient_screen.dart` dùng field
 * bấm được (`_pickExpirationDate`) -> hiện nút X để xoá ngày đã chọn.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { AppColors } from '../../theme/colors';
import { sp } from '../../utils/responsive';
import { FontFamily, FontWeights } from '../../theme/typography';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';

const WEEKDAYS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MONTHS_VI = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

/** Định dạng ngày thành `YYYY-MM-DD` — khớp `@IsISO8601()` của BE. */
export const toIsoDate = (date) => {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Định dạng ngày hiển thị ra UI: `dd/MM/yyyy`. */
export const formatDisplayDate = (date) => {
  if (!date) return null;
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
};

/** Chuẩn hoá về 00:00:00 để so sánh ngày không bị lệch do giờ. */
const startOfDay = (d) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

/**
 * @param {Date|null} value - ngày đang chọn
 * @param {(date: Date|null) => void} onChange - nhận `null` khi xoá
 * @param {string} [placeholder]
 */
export const ExpiryDatePicker = ({ value, onChange, placeholder }) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Mở modal luôn nhìn tháng của ngày đang chọn; chưa chọn -> tháng hiện tại.
  const [visible, setVisible] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => value || new Date());

  const isEn = !placeholder || /tap|set date|bấm/i.test(placeholder);
  const weekdays = isEn ? WEEKDAYS_EN : WEEKDAYS_VI;

  const open = () => {
    setViewMonth(value || new Date());
    setVisible(true);
  };

  const close = () => setVisible(false);

  const confirm = (date) => {
    onChange(date);
    setVisible(false);
  };

  // Lưới ngày trong tháng đang xem. `getDay()` trả 0=CN..6=T7 -> cần dịch sang
  // thứ 2 = 0 để khớp hàng T2..CN.
  const daysGrid = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leading = (firstDay.getDay() + 6) % 7;

    const cells = [];
    for (let i = 0; i < leading; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
    // Luôn 7 hàng cho ổn định chiều cao modal.
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewMonth]);

  const shiftMonth = (delta) => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const today = startOfDay(new Date());
  const selected = value ? startOfDay(value) : null;

  return (
    <>
      <Pressable
        onPress={open}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: isDark ? '#19271E' : '#FFFFFF',
            borderColor: isDark ? '#2E4D36' : '#81C784',
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.fieldText,
            {
              color: selected
                ? isDark
                  ? '#FFFFFF'
                  : AppColors.textPrimary
                : isDark
                ? '#9DA8A0'
                : '#A5D6A7',
              fontSize: sp(14.5),
            },
          ]}
          numberOfLines={1}
        >
          {selected ? formatDisplayDate(selected) : placeholder}
        </Text>
        {selected ? (
          <Pressable
            onPress={() => onChange(null)}
            hitSlop={10}
            style={styles.clearBtn}
          >
            <X color={isDark ? '#FFFFFF54' : '#B0B8B2'} size={18} />
          </Pressable>
        ) : null}
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <TouchableWithoutFeedback onPress={close}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.sheet,
                  {
                    backgroundColor: isDark ? '#19271E' : '#FFFFFF',
                    borderColor: isDark ? '#2E4D36' : '#E3E8E4',
                    paddingBottom: Math.max(sp(20), insets.bottom + sp(8)),
                  },
                ]}
              >
                <View style={styles.sheetHeader}>
                  <Pressable onPress={() => shiftMonth(-1)} hitSlop={10} style={styles.navBtn}>
                    <ChevronLeft
                      color={isDark ? AppColors.primaryLight : AppColors.primaryDark}
                      size={22}
                    />
                  </Pressable>
                  <Text
                    style={[
                      styles.monthTitle,
                      { color: isDark ? '#FFFFFF' : AppColors.textPrimary },
                    ]}
                  >
                    {isEn
                      ? viewMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })
                      : `${MONTHS_VI[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`}
                  </Text>
                  <Pressable onPress={() => shiftMonth(1)} hitSlop={10} style={styles.navBtn}>
                    <ChevronRight
                      color={isDark ? AppColors.primaryLight : AppColors.primaryDark}
                      size={22}
                    />
                  </Pressable>
                </View>

                <View style={styles.weekRow}>
                  {weekdays.map((w) => (
                    <Text
                      key={w}
                      style={[
                        styles.weekText,
                        { color: isDark ? '#9DA8A0' : AppColors.textSecondary },
                      ]}
                    >
                      {w}
                    </Text>
                  ))}
                </View>

                <View style={styles.grid}>
                  {daysGrid.map((date, index) => {
                    if (!date) return <View key={`pad-${index}`} style={styles.dayCell} />;

                    const isSelected = selected && date.getTime() === selected.getTime();
                    const isToday = date.getTime() === today.getTime();
                    // Ngày trong quá khứ không chọn được: thực phẩm đã hết hạn
                    // thì không có ý nghĩa khi thêm mới.
                    const isPast = date.getTime() < today.getTime();

                    return (
                      <Pressable
                        key={date.toISOString()}
                        disabled={isPast}
                        onPress={() => confirm(date)}
                        style={({ pressed }) => [
                          styles.dayCell,
                          {
                            backgroundColor: isSelected
                              ? isDark
                                ? AppColors.primaryLight
                                : AppColors.primary
                              : 'transparent',
                            opacity: pressed ? 0.7 : isPast ? 0.3 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            {
                              color: isSelected
                                ? isDark
                                  ? '#0E1611'
                                  : '#FFFFFF'
                                : isToday
                                ? isDark
                                  ? AppColors.primaryLight
                                  : AppColors.primaryDark
                                : isDark
                                ? '#FFFFFF'
                                : AppColors.textPrimary,
                            },
                          ]}
                        >
                          {date.getDate()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.footer}>
                  <Pressable
                    onPress={() => confirm(null)}
                    style={({ pressed }) => [
                      styles.footerBtn,
                      {
                        backgroundColor: isDark ? '#233629' : AppColors.accentGreen,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.footerBtnText,
                        { color: isDark ? AppColors.primaryLight : AppColors.primaryDark },
                      ]}
                    >
                      {isEn ? 'Auto (let server decide)' : 'Tự động (để máy chủ tính)'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: sp(52),
    borderRadius: sp(16),
    borderWidth: 1.2,
    paddingHorizontal: sp(16),
  },
  fieldText: {
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
    flex: 1,
  },
  clearBtn: {
    padding: sp(2),
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: sp(20),
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    borderRadius: sp(24),
    borderWidth: 1,
    paddingHorizontal: sp(16),
    paddingTop: sp(16),
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp(12),
  },
  navBtn: {
    padding: sp(4),
  },
  monthTitle: {
    fontFamily: FontFamily.black,
    fontWeight: FontWeights.black,
    fontSize: sp(16),
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: sp(6),
  },
  weekText: {
    flex: 1,
    textAlign: 'center',
    fontSize: sp(11),
    fontFamily: FontFamily.bold,
    fontWeight: FontWeights.bold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: sp(20),
  },
  dayText: {
    fontSize: sp(13),
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
  footer: {
    marginTop: sp(12),
  },
  footerBtn: {
    paddingVertical: sp(11),
    borderRadius: sp(14),
    alignItems: 'center',
  },
  footerBtnText: {
    fontSize: sp(13),
    fontFamily: FontFamily.semibold,
    fontWeight: FontWeights.semibold,
  },
});