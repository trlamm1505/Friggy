/**
 * Fridge item helpers — dùng chung cho màn + component trong nhóm "fridge" (B1).
 *
 * ⚠️ VÌ SAO `sortFridgeItems` phải nằm ở tầng UI chứ không gửi lên server:
 *   `ListFridgeQueryDto` của BE chỉ nhận `storageLocation` + `expiringSoon`
 *   (KHÔNG có `search`, `sortBy`, `sortDir`) — BE tự hardcode
 *   `expiresAt asc, createdAt desc`.
 *   Nếu đưa `search`/`sort` vào filters của `useFridgeItems()` thì deps của hook
 *   là `JSON.stringify(filters)` => MỖI KÝ TỰ GÕ là 1 request mới.
 *   Spec B1 (prompt mục 5.1) yêu cầu rõ: "list đã nằm trong RAM, không gọi API mới"
 *   và "Chỉ gọi lại API khi `storageLocation` / `expiringSoon` đổi".
 *   => UI tự lọc + tự sắp xếp trên list đã tải về.
 */

/**
 * 15 đơn vị — copy NGUYÊN VĂN từ Flutter (nguồn duy nhất, production đang chạy):
 *   Mobile/lib/screens/manual_add_ingredient_screen.dart:29
 *   Mobile/lib/screens/fridge_inventory_screen.dart:229  (giống hệt nhau)
 *
 * BE KHÔNG có endpoint danh mục đơn vị — `be/src/common/utils/unit.util.ts` chỉ là
 * bảng CONVERT (g→gram, lít→ml), không phải danh sách để chọn. Nên hardcode ở đây.
 */
export const UNITS = [
  'kg',
  'gram',
  'g',
  'ml',
  'lít',
  'quả',
  'củ',
  'bó',
  'miếng',
  'gói',
  'hộp',
  'chai',
  'con',
  'bắp',
  'pcs',
];

/**
 * Bước nhảy số lượng khi bấm +/- trong màn sửa số lượng.
 *
 * Flutter dùng bước 50 cho đơn vị nhỏ (g/gram/ml) và bước 1 cho các đơn vị đếm
 * được (kg/quả/hộp...): bấm "+1 gram" là vô nghĩa, bấm "+50 gram" mới hợp lý.
 *   Mobile/lib/screens/fridge_inventory_screen.dart:329
 *
 * @param {string} unit
 * @returns {number} 50 hoặc 1
 */
export const stepForUnit = (unit) => (unit === 'g' || unit === 'gram' || unit === 'ml' ? 50 : 1);

/**
 * Parse số lượng từ ô nhập.
 *
 * ⚠️ VÌ SAO trả `null` (không phải 0) khi sai định dạng:
 *   Bản cũ trong `FridgeItemActions` dùng `Number.isFinite(parsed) ? parsed : 0`
 *   -> gõ "abc" (hoặc xoá hết) rồi bấm "Lưu" sẽ PATCH số lượng = 0, tức là
 *   âm thầm xoá hết lượng còn lại của món. `null` cho UI biết "sai định dạng"
 *   và chặn gọi API.
 *
 * Chấp nhận cả dấu phẩy thập phân kiểu VN ("1,5") và số âm (để UI tự chặn).
 *
 * @param {string|number} raw
 * @returns {number|null} số đã parse, null nếu rỗng / sai định dạng
 */
export const parseQuantity = (raw) => {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim().replace(',', '.');
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
};

/** Timestamp của `expiryDate`, `null` nếu không có hoặc không parse được. */
const expiryTime = (item) => {
  const raw = item?.expiryDate;
  if (!raw) return null;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? null : time;
};

/**
 * So sánh theo hạn dùng. Item KHÔNG có hạn dùng luôn nằm CUỐI, kể cả khi sort
 * desc — nếu không, `new Date(null)` = NaN làm comparator trả NaN và thứ tự
 * trở nên ngẫu nhiên (bug khó thấy, hiện ngẫu nhiên trong list).
 */
const compareExpiry = (a, b, dir) => {
  const av = expiryTime(a);
  const bv = expiryTime(b);
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;
  return (av - bv) * dir;
};

/**
 * Sắp xếp danh sách nguyên liệu — client-side (BE không có sort param).
 *
 * Hỗ trợ đủ các key dùng ở 2 màn:
 *   FridgeInventoryScreen : expiry_asc | expiry_desc | name_asc | name_desc
 *                            | quantity_asc | quantity_desc
 *   FridgeListScreen      : + urgent_first (đã hết hạn lên đầu)
 *
 * @param {object[]} items
 * @param {string} sortKey
 * @returns {object[]} mảng MỚI đã sắp xếp (không mutate input)
 */
export const sortFridgeItems = (items, sortKey) => {
  const list = [...(items || [])];

  switch (sortKey) {
    case 'expiry_asc':
      return list.sort((a, b) => compareExpiry(a, b, 1));
    case 'expiry_desc':
      return list.sort((a, b) => compareExpiry(a, b, -1));
    case 'name_asc':
      return list.sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
    case 'name_desc':
      return list.sort((a, b) => (b?.name || '').localeCompare(a?.name || ''));
    case 'quantity_asc':
      return list.sort((a, b) => (Number(a?.quantity) || 0) - (Number(b?.quantity) || 0));
    case 'quantity_desc':
      return list.sort((a, b) => (Number(b?.quantity) || 0) - (Number(a?.quantity) || 0));
    case 'urgent_first': {
      // Đã quá hạn lên đầu, sau đó theo số ngày còn lại tăng dần.
      // Item không có hạn dùng đứng cuối (không phải "gấp nhất").
      const days = (item) => {
        const raw = item?.expiryDate;
        if (!raw) return null;
        const time = new Date(raw).getTime();
        if (Number.isNaN(time)) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(time);
        expiry.setHours(0, 0, 0, 0);
        return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      };
      return list.sort((a, b) => {
        const av = days(a);
        const bv = days(b);
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        if (av < 0 && bv >= 0) return -1;
        if (av >= 0 && bv < 0) return 1;
        return av - bv;
      });
    }
    default:
      return list;
  }
};
